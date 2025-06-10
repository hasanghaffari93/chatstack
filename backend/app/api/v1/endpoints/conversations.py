# Endpoints for conversation management
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.chat import ConversationId
from app.services import ConversationService
from typing import Dict, List, Optional
from datetime import datetime
from app.api.v1.endpoints.auth import get_current_user_from_cookie

router = APIRouter()
conversation_service = ConversationService()

@router.get("/conversations/metadata")
async def get_conversation_metadata(user = Depends(get_current_user_from_cookie)):
    """Returns only metadata about conversations, not the messages"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    return conversation_service.get_conversations_metadata(user_id)

@router.get("/conversations/{conversation_id}")
async def get_conversation_by_id(conversation_id: str, user = Depends(get_current_user_from_cookie)):
    """Returns a specific conversation by ID including its messages"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    return conversation_service.get_conversation_by_id_with_messages(conversation_id, user_id)
