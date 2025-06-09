from fastapi import APIRouter, HTTPException, Depends
from app.schemas.system_prompt import SystemPromptRequest, SystemPromptResponse
from app.repositories import UserRepository
from app.api.v1.endpoints.auth import get_current_user_from_cookie

router = APIRouter()

# Initialize repository
user_repo = UserRepository()

@router.get("/system-prompt", response_model=SystemPromptResponse)
async def get_system_prompt(user = Depends(get_current_user_from_cookie)):
    """Get the current user's system prompt"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    system_prompt = user_repo.get_user_system_prompt(user_id)
    
    if system_prompt is None:
        raise HTTPException(status_code=404, detail="System prompt not found")
    
    return SystemPromptResponse(system_prompt=system_prompt, user_id=user_id)

@router.post("/system-prompt")
async def save_system_prompt(request: SystemPromptRequest, user = Depends(get_current_user_from_cookie)):
    """Save the current user's system prompt"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    success = user_repo.save_user_system_prompt(user_id, request.system_prompt)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save system prompt")
    
    return {"message": "System prompt saved successfully"} 