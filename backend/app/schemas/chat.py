from pydantic import BaseModel
from typing import Optional

class ChatMessage(BaseModel):
    content: str
    conversation_id: Optional[str] = None

class ConversationId(BaseModel):
    conversation_id: Optional[str] = None
