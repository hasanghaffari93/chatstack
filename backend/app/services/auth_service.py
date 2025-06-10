from typing import Optional, Dict
import os
import requests
import secrets
import time
import hashlib
import base64
import json
from collections import defaultdict
from fastapi import HTTPException, status, Response
from jose import jwt, JWTError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from dotenv import load_dotenv

from app.repositories import UserRepository, OAuthRepository
from app.schemas.user import UserInfo

# Load environment variables
load_dotenv()


class AuthService:
    def __init__(self):
        self.user_repo = UserRepository()
        self.oauth_repo = OAuthRepository()
        
        # OAuth configuration
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.base_url = os.getenv("BASE_URL", "http://localhost:8000")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        self.redirect_uri = f"{self.base_url}/api/auth/google-callback"
        self.jwt_secret = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
        self.jwt_algorithm = "HS256"
        self.access_token_expire_minutes = 60
        
        # Rate limiting
        self.rate_limit_store = defaultdict(list)
        self.rate_limit_max_requests = 20
        self.rate_limit_window = 60
    
    # PKCE Helper Methods
    def generate_code_verifier(self, length=128) -> str:
        """Generate a code_verifier for PKCE"""
        return secrets.token_urlsafe(length)

    def generate_code_challenge(self, code_verifier: str) -> str:
        """Generate a code_challenge from the code_verifier using SHA-256"""
        code_challenge_digest = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = base64.urlsafe_b64encode(code_challenge_digest).decode().rstrip('=')
        return code_challenge
    
    # JWT Token Methods
    def create_access_token(self, data: dict) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        expire = time.time() + self.access_token_expire_minutes * 60
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.jwt_secret, algorithm=self.jwt_algorithm)
        return encoded_jwt

    def verify_access_token(self, token: str) -> Optional[dict]:
        """Verify and decode a JWT access token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except JWTError:
            return None
    
    def get_current_user_from_cookie(self, session_token: Optional[str]) -> Optional[dict]:
        """Get the current user from the session cookie"""
        if not session_token:
            print("No session_token cookie found")
            return None
        
        try:
            payload = self.verify_access_token(session_token)
            if not payload:
                print("Invalid or expired session token")
                return None
            
            print(f"Valid session for user: {payload.get('email')}")
            return payload
        except Exception as e:
            print(f"Error parsing session token: {str(e)}")
            return None
    
    # Cookie Management
    def set_auth_cookie(self, response: Response, session_token: str):
        """Helper function to set authentication cookie with environment-appropriate settings"""
        is_production = os.getenv("ENVIRONMENT", "development") == "production"
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=is_production,
            samesite="none" if is_production else "lax",
            domain=None,
            path="/",
            max_age=self.access_token_expire_minutes * 60
        )
    
    def clear_auth_cookie(self, response: Response):
        """Clear the authentication cookie"""
        is_production = os.getenv("ENVIRONMENT", "development") == "production"
        
        response.delete_cookie(
            key="session_token",
            httponly=True,
            secure=is_production,
            samesite="none" if is_production else "lax",
            domain=None,
            path="/"
        )
    
    # Rate Limiting
    def check_rate_limit(self, client_ip: str) -> bool:
        """Check if client has exceeded rate limit"""
        now = time.time()
        
        # Clean up old requests
        self.rate_limit_store[client_ip] = [
            t for t in self.rate_limit_store[client_ip] 
            if now - t < self.rate_limit_window
        ]
        
        # Check if rate limit exceeded
        if len(self.rate_limit_store[client_ip]) >= self.rate_limit_max_requests:
            return False
        
        # Add current request timestamp
        self.rate_limit_store[client_ip].append(now)
        
        # Clean up old entries from other IPs periodically
        if len(self.rate_limit_store) > 1000:
            self._cleanup_old_rate_limit_entries()
        
        return True
    
    def _cleanup_old_rate_limit_entries(self):
        """Clean up old rate limit entries"""
        now = time.time()
        to_delete = []
        
        for ip, timestamps in self.rate_limit_store.items():
            if not timestamps or now - max(timestamps) > self.rate_limit_window:
                to_delete.append(ip)
        
        for ip in to_delete:
            del self.rate_limit_store[ip]
    
    # OAuth Flow
    def initiate_google_login(self) -> str:
        """Generate state, code_verifier, code_challenge and return Google OAuth URL"""
        # Generate a random state token
        state = secrets.token_urlsafe(32)
        
        # Generate PKCE code_verifier and code_challenge
        code_verifier = self.generate_code_verifier()
        code_challenge = self.generate_code_challenge(code_verifier)
        
        # Store state with creation time (for expiration)
        state_data = {"created_at": time.time()}
        self.oauth_repo.save_oauth_state(state, state_data)
        
        # Store code_verifier associated with state
        self.oauth_repo.save_code_verifier(state, code_verifier)
        
        # Periodically clean up expired states
        self.oauth_repo.clean_expired_oauth_states()
        
        # Create auth URL with state parameter and PKCE code_challenge
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth"
            f"?response_type=code"
            f"&client_id={self.google_client_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&scope=email%20profile"
            f"&access_type=offline"
            f"&state={state}"
            f"&code_challenge={code_challenge}"
            f"&code_challenge_method=S256"
        )
        
        print(f"Generated Google OAuth URL with state: {state}")
        return auth_url
    
    def process_google_callback(self, code: str, state: str) -> dict:
        """Process the Google OAuth callback and return user data and session token"""
        try:
            # Validate state to prevent CSRF
            print(f"Processing callback with state: {state}")
            
            # Get state from database
            state_data = self.oauth_repo.get_oauth_state(state)
            if not state_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired state parameter",
                )
            
            # Get code_verifier for this state
            code_verifier = self.oauth_repo.get_code_verifier(state)
            if not code_verifier:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired code verifier",
                )
            
            # Exchange code for tokens
            tokens = self._exchange_code_for_tokens(code, code_verifier)
            
            # Verify and get user info
            user_info = self._verify_and_get_user_info(tokens)
            
            # Save user to database
            user_data_dict = {
                "id": user_info.id,
                "email": user_info.email,
                "name": user_info.name,
                "picture": user_info.picture,
            }
            
            # Create or update user in the database
            self.user_repo.create_or_update_user(user_data_dict)
            
            # If we have a refresh token, store it in the database
            if tokens.get("refresh_token"):
                self.user_repo.save_user_refresh_token(user_info.id, tokens["refresh_token"])
            
            # Create a session token
            session_data = {
                "sub": user_info.id,
                "email": user_info.email,
                "name": user_info.name,
                "picture": user_info.picture,
            }
            
            session_token = self.create_access_token(session_data)
            
            # Clean up used state and code_verifier
            self.oauth_repo.delete_oauth_state(state)
            self.oauth_repo.delete_code_verifier(state)
            
            print(f"Authentication successful for user: {user_info.email}")
            
            return {
                "user_info": user_info,
                "session_token": session_token
            }
            
        except HTTPException:
            # Clean up on error
            self.oauth_repo.delete_oauth_state(state)
            self.oauth_repo.delete_code_verifier(state)
            raise
        except Exception as e:
            # Clean up on error
            self.oauth_repo.delete_oauth_state(state)
            self.oauth_repo.delete_code_verifier(state)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Authentication error: {str(e)}"
            )
    
    def _exchange_code_for_tokens(self, code: str, code_verifier: str) -> dict:
        """Exchange authorization code for tokens"""
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": self.google_client_id,
            "client_secret": self.google_client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
            "code_verifier": code_verifier
        }
        
        print(f"Exchanging code for token")
        token_response = requests.post(token_url, data=token_data)
        
        if token_response.status_code != 200:
            error_detail = f"Failed to exchange code for token: {token_response.text}"
            print(error_detail)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_detail
            )
            
        return token_response.json()
    
    def _verify_and_get_user_info(self, tokens: dict) -> UserInfo:
        """Verify tokens and get user information"""
        access_token = tokens.get("access_token")
        id_token_jwt = tokens.get("id_token")
        
        # Verify ID token
        user_id = self._verify_id_token(id_token_jwt)
        
        # Get user info with the access token
        user_data = self._get_user_info_from_google(access_token)
        
        # Verify that the user ID from ID token matches the one from userinfo
        if user_id != user_data.get("sub"):
            error_detail = f"User ID mismatch: {user_id} vs {user_data.get('sub')}"
            print(error_detail)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_detail
            )
        
        return UserInfo(
            id=user_data.get("sub"),
            email=user_data.get("email"),
            name=user_data.get("name"),
            picture=user_data.get("picture")
        )
    
    def _verify_id_token(self, id_token_jwt: str) -> str:
        """Verify ID token and return user ID"""
        if os.getenv("ENVIRONMENT") == "development":
            # In development, just decode the JWT without verification
            try:
                parts = id_token_jwt.split('.')
                if len(parts) != 3:
                    raise ValueError("Invalid JWT format")
                
                payload = parts[1]
                payload += '=' * (4 - len(payload) % 4) if len(payload) % 4 != 0 else ''
                decoded = base64.b64decode(payload)
                idinfo = json.loads(decoded)
                
                user_id = idinfo['sub']
                print(f"Development mode: Decoded ID token without verification. User ID: {user_id}")
                return user_id
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error decoding ID token: {str(e)}"
                )
        else:
            # In production, properly verify the ID token
            try:
                print("Verifying ID token with Google...")
                idinfo = id_token.verify_oauth2_token(
                    id_token_jwt, google_requests.Request(), self.google_client_id
                )
                
                if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                    raise ValueError('Wrong issuer.')
                    
                return idinfo['sub']
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid ID token: {str(e)}"
                )
    
    def _get_user_info_from_google(self, access_token: str) -> dict:
        """Get user info from Google using access token"""
        print("Getting user info with access token...")
        user_info_response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if user_info_response.status_code != 200:
            error_detail = f"Failed to get user info: {user_info_response.text}"
            print(error_detail)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_detail
            )
            
        user_data = user_info_response.json()
        print(f"User data retrieved successfully: {user_data.get('email')}")
        return user_data
    
    def verify_google_token_direct(self, access_token: str) -> UserInfo:
        """Verify Google OAuth token directly and return user information"""
        try:
            # Verify the token with Google
            google_response = requests.get(
                "https://www.googleapis.com/oauth2/v3/tokeninfo",
                params={"access_token": access_token}
            )
            
            if google_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                )
            
            token_info = google_response.json()
            
            # Verify that the token was issued to our client
            if token_info.get("aud") != self.google_client_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token not issued for this application",
                )
            
            # Get user info with the access token
            user_data = self._get_user_info_from_google(access_token)
            
            return UserInfo(
                id=user_data.get("sub"),
                email=user_data.get("email"),
                name=user_data.get("name"),
                picture=user_data.get("picture")
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Authentication error: {str(e)}",
            )
    
    def refresh_user_token(self, user: dict) -> str:
        """Refresh the access token using the refresh token"""
        user_id = user.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user session"
            )
        
        # Get refresh token from database
        refresh_token = self.user_repo.get_user_refresh_token(user_id)
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No refresh token available"
            )
        
        try:
            # Exchange refresh token for a new access token
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "client_id": self.google_client_id,
                "client_secret": self.google_client_secret,
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
            
            # Create a new session token
            new_user_data = user.copy()
            session_token = self.create_access_token(new_user_data)
            
            return session_token
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Token refresh error: {str(e)}"
            ) 