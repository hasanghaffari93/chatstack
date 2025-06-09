from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatMessage(BaseModel):
    content: str
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    model: Optional[str] = "gpt-3.5-turbo"  # Default to gpt-3.5-turbo

class ConversationId(BaseModel):
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None

class MessageResponse(BaseModel):
    response: str
    conversation_id: str
