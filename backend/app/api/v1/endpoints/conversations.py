# Endpoints for conversation management
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.chat import ConversationId
from app.repositories.conversation_repository import ConversationRepository
from typing import Dict, List, Optional
from datetime import datetime
from app.api.v1.endpoints.auth import get_current_user_from_cookie

router = APIRouter()
conversation_repo = ConversationRepository()

@router.get("/conversations/metadata")
async def get_conversation_metadata(user = Depends(get_current_user_from_cookie)):
    """Returns only metadata about conversations, not the messages"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    conversations = conversation_repo.get_conversations_by_user(user_id)
    
    # Always return an array, even if empty
    if not conversations:
        return {"conversations": []}
    
    # Sort by last update time
    sorted_conversations = sorted(
        conversations,
        key=lambda x: x.get("updated_at", datetime.min),
        reverse=True
    )
    
    return {
        "conversations": [
            {
                "id": conv.get("id"),
                "title": conv.get("title", "New Chat"),
                "created_at": conv.get("created_at").isoformat() if isinstance(conv.get("created_at"), datetime) else conv.get("created_at"),
                "updated_at": conv.get("updated_at").isoformat() if isinstance(conv.get("updated_at"), datetime) else conv.get("updated_at"),
                "user_id": conv.get("user_id")
            }
            for conv in sorted_conversations
        ]
    }

@router.get("/conversations/{conversation_id}")
async def get_conversation_by_id(conversation_id: str, user = Depends(get_current_user_from_cookie)):
    """Returns a specific conversation by ID including its messages"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    conversation = conversation_repo.get_conversation_by_id(conversation_id, user_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "conversation": {
            "id": conversation.get("id"),
            "title": conversation.get("title", "New Chat"),
            "created_at": conversation.get("created_at").isoformat() if isinstance(conversation.get("created_at"), datetime) else conversation.get("created_at"),
            "updated_at": conversation.get("updated_at").isoformat() if isinstance(conversation.get("updated_at"), datetime) else conversation.get("updated_at"),
            "messages": conversation.get("messages", []),
            "user_id": conversation.get("user_id")
        }
    }

@router.delete("/chat")
async def clear_conversation(conv: ConversationId, user = Depends(get_current_user_from_cookie)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    if not conv.conversation_id:
        raise HTTPException(status_code=400, detail="Conversation ID is required")
    
    success = conversation_repo.delete_conversation(conv.conversation_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"status": "success"} 