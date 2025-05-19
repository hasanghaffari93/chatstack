from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatMessage(BaseModel):
    content: str
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None

class ConversationId(BaseModel):
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None

class MessageResponse(BaseModel):
    response: str
    conversation_id: str

class ConversationMetadata(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    user_id: str

class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[Dict[str, Any]]
    user_id: str
