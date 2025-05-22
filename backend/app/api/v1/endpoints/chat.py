# Endpoints for chat and conversation management
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from app.schemas.chat import ChatMessage, ConversationId, MessageResponse
from app.core.config import get_openai_client
from app.repositories.conversation_repository import ConversationRepository
from typing import Dict, List, Optional
from datetime import datetime
import uuid, os
from app.api.v1.endpoints.auth import get_current_user_from_cookie

router = APIRouter()
conversation_repo = ConversationRepository()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

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


@router.post("/chat")
async def chat(message: ChatMessage, user = Depends(get_current_user_from_cookie)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    
    client = get_openai_client()
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not found. Please set OPENAI_API_KEY in .env file"
        )
    try:
        conv_id = message.conversation_id
        conversation = None
        
        if conv_id:
            # Check if conversation exists for this user
            conversation = conversation_repo.get_conversation_by_id(conv_id, user_id)
        
        if not conversation:
            # Create a new conversation
            conversation = conversation_repo.create_conversation(user_id)
            conv_id = conversation["id"]
        
        # Add user message to conversation
        user_message = {"role": "user", "content": message.content}
        conversation_repo.add_message(conv_id, user_id, user_message)
        
        # Get the last 10 messages for context
        updated_conversation = conversation_repo.get_conversation_by_id(conv_id, user_id)
        conversation_history = updated_conversation.get("messages", [])[-10:]
        
        # Get response from OpenAI
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=conversation_history
        )
        
        if not response.choices:
            raise HTTPException(
                status_code=500,
                detail="No response received from OpenAI API"
            )
        
        # Extract the response content
        assistant_message = response.choices[0].message.content
        
        # Add assistant message to conversation
        assistant_message_obj = {"role": "assistant", "content": assistant_message}
        conversation_repo.add_message(conv_id, user_id, assistant_message_obj)
        
        # Generate a title if this is a new conversation (only 2 messages)
        conversation = conversation_repo.get_conversation_by_id(conv_id, user_id)
        if len(conversation.get("messages", [])) == 2:
            try:
                title_response = await client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Generate a very short title (3-5 words) for a conversation that starts with this message. The title should capture the main topic or intent."},
                        {"role": "user", "content": message.content}
                    ]
                )
                if title_response.choices:
                    new_title = title_response.choices[0].message.content
                    conversation_repo.update_conversation_title(conv_id, user_id, new_title)
            except Exception as e:
                print(f"Error generating title: {e}")
        
        return {
            "response": assistant_message,
            "conversation_id": conv_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
