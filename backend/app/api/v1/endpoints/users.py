# Endpoints for user management
from fastapi import APIRouter, HTTPException, Depends, status
from app.api.v1.endpoints.auth import get_current_user_required
from app.schemas.user import UserInfo

router = APIRouter()

@router.get("/me", response_model=UserInfo)
async def get_current_user(user: dict = Depends(get_current_user_required)):
    """Get the current authenticated user"""
    return UserInfo(
        id=user.get("sub"),
        email=user.get("email"),
        name=user.get("name"),
        picture=user.get("picture")
    ) 