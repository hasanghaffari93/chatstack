from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
import requests
from typing import Optional, Dict
from dotenv import load_dotenv
import secrets
import time
from jose import jwt, JWTError
import json
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import asyncio
from collections import defaultdict
import pathlib
from app.core.database import (
    get_user_by_id,
    get_user_by_email, 
    create_or_update_user,
    save_user_refresh_token,
    get_user_refresh_token,
    save_oauth_state,
    get_oauth_state,
    delete_oauth_state,
    clean_expired_oauth_states
)

# Load environment variables
load_dotenv()

router = APIRouter()

# Get OAuth credentials from environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
REDIRECT_URI = f"{FRONTEND_URL}/login"
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# Simple rate limiting implementation (should be replaced with Redis in production)
rate_limit_store = defaultdict(list)
RATE_LIMIT_MAX_REQUESTS = 5  # Max requests per window
RATE_LIMIT_WINDOW = 60  # Window size in seconds

class TokenRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None
    state: str

class TokenData(BaseModel):
    access_token: str
    token_type: str

class UserInfo(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = time.time() + ACCESS_TOKEN_EXPIRE_MINUTES * 60
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user_from_cookie(session_token: str = Cookie(None)):
    if not session_token:
        return None
    
    payload = verify_access_token(session_token)
    if not payload:
        return None
        
    return payload

# Rate limiting dependency
async def check_rate_limit(request: Request):
    client_ip = request.client.host
    now = time.time()
    
    # Clean up old requests
    rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
    
    # Check if rate limit exceeded
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Add current request timestamp
    rate_limit_store[client_ip].append(now)
    
    # Clean up old entries from other IPs periodically
    if len(rate_limit_store) > 1000:  # Arbitrary limit to prevent memory issues
        cleanup_old_entries()
    
    return True

async def cleanup_old_entries():
    now = time.time()
    to_delete = []
    
    for ip, timestamps in rate_limit_store.items():
        if not timestamps or now - max(timestamps) > RATE_LIMIT_WINDOW:
            to_delete.append(ip)
    
    for ip in to_delete:
        del rate_limit_store[ip]

@router.get("/google-login")
async def google_login(response: Response, request: Request, _: bool = Depends(check_rate_limit)):
    """Generate state and redirect to Google OAuth login page"""
    # Generate a random state token
    state = secrets.token_urlsafe(32)
    
    # Store state with creation time (for expiration)
    state_data = {"created_at": time.time()}
    save_oauth_state(state, state_data)
    
    # Periodically clean up expired states
    clean_expired_oauth_states()
    
    # Use the frontend URL from environment variables
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    redirect_uri = f"{frontend_url}/login"
    
    # Create auth URL with state parameter
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?response_type=code"
        f"&client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=email%20profile"
        f"&access_type=offline"
        f"&state={state}"
    )
    
    print(f"Redirecting to Google OAuth with state: {state}")
    return RedirectResponse(url=auth_url)

@router.post("/google-callback", response_model=UserInfo)
async def google_callback(token_request: TokenRequest, response: Response, request: Request, _: bool = Depends(check_rate_limit)):
    """Exchange authorization code for tokens and get user info"""
    try:
        # Validate state to prevent CSRF
        state = token_request.state
        print(f"Received state: {state}")
        
        # Get state from database
        state_data = get_oauth_state(state)
        if not state_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired state parameter",
            )
        
        # Delete used state from database
        delete_oauth_state(state)
        
        # Exchange code for tokens
        redirect_uri = token_request.redirect_uri or REDIRECT_URI
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": token_request.code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        print(f"Exchanging code for token with data: {token_data}")
        token_response = requests.post(token_url, data=token_data)
        
        if token_response.status_code != 200:
            error_detail = f"Failed to exchange code for token: {token_response.text}"
            print(error_detail)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_detail,
            )
            
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        id_token_jwt = tokens.get("id_token")
        refresh_token = tokens.get("refresh_token")
        
        # Skip ID token verification in development mode
        if os.getenv("ENVIRONMENT") == "development":
            # In development, just decode the JWT without verification
            try:
                # Simple JWT decoding without verification
                import base64
                import json
                
                # Parse the JWT
                parts = id_token_jwt.split('.')
                if len(parts) != 3:
                    raise ValueError("Invalid JWT format")
                
                # Decode the payload
                payload = parts[1]
                # Add padding if needed
                payload += '=' * (4 - len(payload) % 4) if len(payload) % 4 != 0 else ''
                decoded = base64.b64decode(payload)
                idinfo = json.loads(decoded)
                
                # Get user ID from decoded token
                user_id = idinfo['sub']
                print(f"Development mode: Decoded ID token without verification. User ID: {user_id}")
            except Exception as e:
                error_detail = f"Error decoding ID token: {str(e)}"
                print(error_detail)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=error_detail,
                )
        else:
            # In production, properly verify the ID token
            try:
                print("Verifying ID token with Google...")
                idinfo = id_token.verify_oauth2_token(
                    id_token_jwt, google_requests.Request(), GOOGLE_CLIENT_ID
                )
                
                # Verify issuer
                if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                    raise ValueError('Wrong issuer.')
                    
                # Get user ID from ID token
                user_id = idinfo['sub']
            except Exception as e:
                error_detail = f"Invalid ID token: {str(e)}"
                print(error_detail)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=error_detail,
                )
            
        # Get user info with the access token (as additional verification)
        print("Getting user info with access token...")
        user_info_response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if user_info_response.status_code != 200:
            error_detail = f"Failed to get user info: {user_info_response.text}"
            print(error_detail)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_detail,
            )
            
        user_data = user_info_response.json()
        print(f"User data retrieved successfully: {user_data.get('email')}")
        
        # Verify that the user ID from ID token matches the one from userinfo
        if user_id != user_data.get("sub"):
            error_detail = f"User ID mismatch: {user_id} vs {user_data.get('sub')}"
            print(error_detail)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_detail,
            )
            
        # Create user info object
        user_info = UserInfo(
            id=user_data.get("sub"),
            email=user_data.get("email"),
            name=user_data.get("name"),
            picture=user_data.get("picture")
        )
        
        # Save user to database
        user_data_dict = {
            "id": user_info.id,
            "email": user_info.email,
            "name": user_info.name,
            "picture": user_info.picture,
        }
        
        # Create or update user in the database
        create_or_update_user(user_data_dict)
        
        # If we have a refresh token, store it in the database
        if refresh_token:
            save_user_refresh_token(user_info.id, refresh_token)
        
        # Create a session token (without the refresh token)
        session_data = {
            "sub": user_info.id,
            "email": user_info.email,
            "name": user_info.name,
            "picture": user_info.picture,
        }
        
        session_token = create_access_token(session_data)
        
        # Set the session token as an HttpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=os.getenv("ENVIRONMENT", "development") == "production",  # Secure in production
            samesite="lax",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        print(f"Authentication successful for user: {user_info.email}")
        # Return user information
        return user_info
        
    except HTTPException as e:
        print(f"HTTP Exception during authentication: {e.detail}")
        raise e
    except Exception as e:
        error_detail = f"Authentication error: {str(e)}"
        print(f"Unexpected error during authentication: {error_detail}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail,
        )

@router.post("/verify-google-token", response_model=UserInfo)
async def verify_google_token(token: TokenData, request: Request, _: bool = Depends(check_rate_limit)):
    """Verify Google OAuth token and return user information"""
    try:
        # Verify the token with Google
        google_response = requests.get(
            "https://www.googleapis.com/oauth2/v3/tokeninfo",
            params={"access_token": token.access_token}
        )
        
        if google_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        
        token_info = google_response.json()
        
        # Verify that the token was issued to our client
        if token_info.get("aud") != GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token not issued for this application",
            )
            
        # Get user info with the access token
        user_info_response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token.access_token}"}
        )
        
        if user_info_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to get user info",
            )
            
        user_data = user_info_response.json()
        
        # Return user information
        return UserInfo(
            id=user_data.get("sub"),
            email=user_data.get("email"),
            name=user_data.get("name"),
            picture=user_data.get("picture")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}",
        )

@router.post("/logout")
async def logout(response: Response):
    """Log out the user by clearing the session cookie"""
    response.delete_cookie(
        key="session_token",
        httponly=True,
        secure=os.getenv("ENVIRONMENT", "development") == "production",
        samesite="lax"
    )
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserInfo)
async def get_current_user(user: dict = Depends(get_current_user_from_cookie)):
    """Get the current authenticated user"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    return UserInfo(
        id=user.get("sub"),
        email=user.get("email"),
        name=user.get("name"),
        picture=user.get("picture")
    )

@router.post("/refresh-token")
async def refresh_token(request: Request, response: Response, user: dict = Depends(get_current_user_from_cookie), _: bool = Depends(check_rate_limit)):
    """Refresh the access token using the refresh token"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Get user ID from the session
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user session"
        )
    
    # Get refresh token from database
    refresh_token = get_user_refresh_token(user_id)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token available"
        )
    
    try:
        # Exchange refresh token for a new access token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        
        token_response = requests.post(token_url, data=token_data)
        
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to refresh token"
            )
            
        tokens = token_response.json()
        new_access_token = tokens.get("access_token")
        
        # Update user session with new access token
        new_user_data = user.copy()
        
        # Create a new session token
        session_token = create_access_token(new_user_data)
        
        # Set the new session token as an HttpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=os.getenv("ENVIRONMENT", "development") == "production",
            samesite="lax",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        return {"message": "Token refreshed successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh error: {str(e)}"
        ) 