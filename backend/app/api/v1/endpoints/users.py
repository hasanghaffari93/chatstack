# Endpoints for user management
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from app.api.v1.endpoints.auth import get_current_user_from_cookie

router = APIRouter()

class UserInfo(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None

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