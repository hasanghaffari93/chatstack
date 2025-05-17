from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    content: str
    role: str  # "user" or "assistant"
    timestamp: datetime

class Conversation(BaseModel):
    id: str
    title: Optional[str] = None
    messages: List[Message]
    created_at: datetime
    updated_at: datetime

class ChatMessage(BaseModel):
    content: str
    conversation_id: Optional[str] = None

class ConversationId(BaseModel):
    conversation_id: str
