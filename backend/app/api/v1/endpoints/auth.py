from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import RedirectResponse
from typing import Optional
from app.services import AuthService
from app.schemas.auth import TokenData
from app.schemas.user import UserInfo

router = APIRouter()

# Initialize the auth service
auth_service = AuthService()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# Rate limiting dependency
async def check_rate_limit(request: Request):
    """Check rate limit using the auth service"""
    client_ip = request.client.host
    
    if not auth_service.check_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    return True

def get_current_user_from_cookie(session_token: str = Cookie(None)):
    """Get the current user from the session cookie"""
    return auth_service.get_current_user_from_cookie(session_token)

@router.get("/google-login")
async def google_login(response: Response, request: Request, _: bool = Depends(check_rate_limit)):
    """Initiate Google OAuth login"""
    auth_url = auth_service.initiate_google_login()
    return RedirectResponse(url=auth_url)

@router.get("/google-callback")
async def google_callback_endpoint(code: str, state: str, request: Request, response: Response, _: bool = Depends(check_rate_limit)):
    """Handle the callback from Google OAuth"""
    try:
        # Process the OAuth callback
        result = auth_service.process_google_callback(code, state)
        
        # Create a response with redirect and cookie setting
        redirect_response = RedirectResponse(url=auth_service.frontend_url)
        
        # Set cookie in the redirect response
        auth_service.set_auth_cookie(redirect_response, result["session_token"])
        
        return redirect_response
        
    except HTTPException as e:
        print(f"HTTP Exception during authentication: {e.detail}")
        # Redirect to frontend with error
        redirect_response = RedirectResponse(url=f"{auth_service.frontend_url}/login?error={e.detail}")
        return redirect_response
    except Exception as e:
        error_detail = f"Authentication error: {str(e)}"
        print(f"Unexpected error during authentication: {error_detail}")
        # Redirect to frontend with error
        redirect_response = RedirectResponse(url=f"{auth_service.frontend_url}/login?error={error_detail}")
        return redirect_response

@router.post("/verify-google-token", response_model=UserInfo)
async def verify_google_token(token: TokenData, request: Request, _: bool = Depends(check_rate_limit)):
    """Verify Google OAuth token and return user information"""
    return auth_service.verify_google_token_direct(token.access_token)

@router.post("/logout")
async def logout(response: Response):
    """Log out the user by clearing the session cookie"""
    auth_service.clear_auth_cookie(response)
    print("Logout: Cleared session cookie")
    return {"message": "Logged out successfully"}

@router.post("/refresh-token")
async def refresh_token(request: Request, response: Response, user: dict = Depends(get_current_user_from_cookie), _: bool = Depends(check_rate_limit)):
    """Refresh the access token using the refresh token"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Refresh the token using the service
    session_token = auth_service.refresh_user_token(user)
    
    # Set the new session token as an HttpOnly cookie
    auth_service.set_auth_cookie(response, session_token)
    
    return {"message": "Token refreshed successfully"} 