# Endpoints for chat and conversation management
from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatMessage, ConversationId
from app.core.config import get_openai_client
from typing import Dict, List
from datetime import datetime, timedelta
import uuid, os

router = APIRouter()

# In-memory storage (should be replaced with persistent storage in production)
conversations: Dict[str, List[Dict]] = {}
conversation_metadata: Dict[str, Dict] = {}
conversation_timestamps: Dict[str, datetime] = {}
conversation_created_at: Dict[str, datetime] = {}
MAX_HISTORY_AGE = timedelta(days=30)
MAX_CONVERSATIONS = 100


def cleanup_old_conversations():
    current_time = datetime.now()
    expired_ids = [
        conv_id for conv_id, timestamp in conversation_timestamps.items()
        if current_time - timestamp > MAX_HISTORY_AGE
    ]
    for conv_id in expired_ids:
        conversations.pop(conv_id, None)
        conversation_timestamps.pop(conv_id, None)
        conversation_metadata.pop(conv_id, None)
        conversation_created_at.pop(conv_id, None)
    if len(conversations) > MAX_CONVERSATIONS:
        sorted_convs = sorted(
            [(conv_id, created_at) for conv_id, created_at in conversation_created_at.items()],
            key=lambda x: x[1]
        )
        to_remove = sorted_convs[:-MAX_CONVERSATIONS]
        for conv_id, _ in to_remove:
            conversations.pop(conv_id, None)
            conversation_timestamps.pop(conv_id, None)
            conversation_metadata.pop(conv_id, None)
            conversation_created_at.pop(conv_id, None)


@router.get("/conversations/metadata")
async def get_conversation_metadata():
    """Returns only metadata about conversations, not the messages"""
    cleanup_old_conversations()
    sorted_conversations = sorted(
        [
            (conv_id, conversation_created_at[conv_id], conversation_timestamps[conv_id])
            for conv_id in conversations.keys()
        ],
        key=lambda x: x[2],  # Sort by last update timestamp
        reverse=True
    )
    return {
        "conversations": [
            {
                "id": conv_id,
                "title": conversation_metadata.get(conv_id, {}).get("title", "New Chat"),
                "created_at": created_at.isoformat(),
                "timestamp": last_update.isoformat(),
            }
            for conv_id, created_at, last_update in sorted_conversations
        ]
    }

@router.get("/conversations/{conversation_id}")
async def get_conversation_by_id(conversation_id: str):
    """Returns a specific conversation by ID including its messages"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "conversation": {
            "id": conversation_id,
            "title": conversation_metadata.get(conversation_id, {}).get("title", "New Chat"),
            "created_at": conversation_created_at[conversation_id].isoformat(),
            "timestamp": conversation_timestamps[conversation_id].isoformat(),
            "messages": conversations[conversation_id]
        }
    }

@router.get("/conversations")
async def get_conversations():
    cleanup_old_conversations()
    sorted_conversations = sorted(
        [
            (conv_id, conversation_created_at[conv_id], conversation_timestamps[conv_id])
            for conv_id in conversations.keys()
        ],
        key=lambda x: x[1],
        reverse=True
    )
    return {
        "conversations": [
            {
                "id": conv_id,
                "title": conversation_metadata.get(conv_id, {}).get("title", "New Chat"),
                "created_at": created_at.isoformat(),
                "timestamp": last_update.isoformat(),
                "messages": conversations[conv_id]
            }
            for conv_id, created_at, last_update in sorted_conversations
        ]
    }


@router.delete("/chat")
async def clear_conversation(conv: ConversationId):
    conv_id = conv.conversation_id or "default"
    if conv_id in conversations:
        conversations.pop(conv_id)
        conversation_timestamps.pop(conv_id, None)
    return {"status": "success"}


@router.post("/chat")
async def chat(message: ChatMessage):
    client = get_openai_client()
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not found. Please set OPENAI_API_KEY in .env file"
        )
    try:
        cleanup_old_conversations()
        conv_id = message.conversation_id or str(uuid.uuid4())
        if conv_id not in conversations:
            conversations[conv_id] = []
            conversation_metadata[conv_id] = {"title": "New Chat"}
            conversation_created_at[conv_id] = datetime.now()
        conversation_timestamps[conv_id] = datetime.now()
        conversations[conv_id].append({"role": "user", "content": message.content})
        conversation_history = conversations[conv_id][-10:]
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=conversation_history
        )
        if not response.choices:
            raise HTTPException(
                status_code=500,
                detail="No response received from OpenAI API"
            )
        assistant_message = response.choices[0].message.content
        conversations[conv_id].append({"role": "assistant", "content": assistant_message})
        if len(conversations[conv_id]) == 2:
            try:
                title_response = await client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Generate a very short title (3-5 words) for a conversation that starts with this message. The title should capture the main topic or intent."},
                        {"role": "user", "content": message.content}
                    ]
                )
                if title_response.choices:
                    conversation_metadata[conv_id]["title"] = title_response.choices[0].message.content
            except Exception as e:
                print(f"Error generating title: {e}")
        return {
            "response": assistant_message,
            "conversation_id": conv_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
