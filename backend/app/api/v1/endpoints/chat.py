# Endpoints for chat functionality
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from app.schemas.chat import ChatMessage, MessageResponse
from app.services.chat_service import ChatService
from app.api.v1.endpoints.auth import get_current_user_from_cookie

router = APIRouter()
chat_service = ChatService()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

@router.get("/models")
async def get_available_models():
    """Returns available OpenAI models for selection"""
    return chat_service.get_available_models()

@router.post("/chat")
async def chat(message: ChatMessage, user = Depends(get_current_user_from_cookie)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    
    # Debug: Print the received message to see what model is sent
    print(f"DEBUG: Received message: content='{message.content}', model='{message.model}', conversation_id='{message.conversation_id}'")
    
    return await chat_service.process_chat_message(message, user_id)

@router.post("/chat/stream")
async def chat_stream(message: ChatMessage, user = Depends(get_current_user_from_cookie)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
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
