# Endpoints for conversation management
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.chat import ConversationId
from app.services import ConversationService
from typing import Dict, List, Optional
from datetime import datetime
from app.api.v1.endpoints.auth import get_current_user_required

router = APIRouter()
conversation_service = ConversationService()

@router.get("/conversations/metadata")
async def get_conversation_metadata(user: dict = Depends(get_current_user_required)):
    """Returns only metadata about conversations, not the messages"""
    user_id = user.get("sub")
    return conversation_service.get_conversations_metadata(user_id)

@router.get("/conversations/{conversation_id}")
async def get_conversation_by_id(conversation_id: str, user: dict = Depends(get_current_user_required)):
    """Returns a specific conversation by ID including its messages"""
    user_id = user.get("sub")
    return conversation_service.get_conversation_by_id_with_messages(conversation_id, user_id)
