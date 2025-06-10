# Endpoints for chat functionality
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatMessage, MessageResponse
from app.services.chat_service import ChatService
from app.api.v1.endpoints.auth import get_current_user_required

router = APIRouter()
chat_service = ChatService()

@router.get("/models")
async def get_available_models():
    """Returns available OpenAI models for selection"""
    return chat_service.get_available_models()

@router.post("/chat")
async def chat(message: ChatMessage, user: dict = Depends(get_current_user_required)):
    user_id = user.get("sub")
    
    return await chat_service.process_chat_message(message, user_id)

@router.post("/chat/stream")
async def chat_stream(message: ChatMessage, user: dict = Depends(get_current_user_required)):
    user_id = user.get("sub")
    
    return StreamingResponse(
        chat_service.process_chat_stream(message, user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )
