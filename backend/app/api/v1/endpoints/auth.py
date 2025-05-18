from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
import requests
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter()

# Get OAuth credentials from environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:3000/login"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

class TokenRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None

class TokenData(BaseModel):
    access_token: str
    token_type: str

class UserInfo(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None

@router.get("/google-login")
async def google_login():
    """Redirect to Google OAuth login page"""
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={GOOGLE_CLIENT_ID}&redirect_uri={REDIRECT_URI}&scope=email%20profile&access_type=offline"
    return RedirectResponse(url=auth_url)

@router.post("/google-callback", response_model=UserInfo)
async def google_callback(token_request: TokenRequest):
    """Exchange authorization code for tokens and get user info"""
    try:
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
        
        token_response = requests.post(token_url, data=token_data)
        
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Failed to exchange code for token: {token_response.text}",
            )
            
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        
        # Get user info with the access token
        user_info_response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
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

@router.post("/verify-google-token", response_model=UserInfo)
async def verify_google_token(token: TokenData):
    """Verify Google OAuth token and return user information"""
    try:
        # Verify the token with Google
        google_response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token.access_token}"}
        )
        
        if google_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
            
        user_data = google_response.json()
        
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