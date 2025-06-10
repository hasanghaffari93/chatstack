from fastapi import APIRouter, HTTPException, Depends
from app.schemas.system_prompt import SystemPromptRequest, SystemPromptResponse
from app.services import SystemPromptService
from app.api.v1.endpoints.auth import get_current_user_required

router = APIRouter()

# Initialize service
system_prompt_service = SystemPromptService()

@router.get("/system-prompt", response_model=SystemPromptResponse)
async def get_system_prompt(user: dict = Depends(get_current_user_required)):
    """Get the current user's system prompt"""
    user_id = user.get("sub")
    system_prompt = system_prompt_service.get_user_system_prompt(user_id)
    
    return SystemPromptResponse(system_prompt=system_prompt, user_id=user_id)

@router.post("/system-prompt")
async def save_system_prompt(request: SystemPromptRequest, user: dict = Depends(get_current_user_required)):
    """Save the current user's system prompt"""
    user_id = user.get("sub")
    system_prompt_service.save_user_system_prompt(user_id, request.system_prompt)
    
    return {"message": "System prompt saved successfully"} 