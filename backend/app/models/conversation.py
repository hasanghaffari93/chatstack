from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel, Field

class Conversation(BaseModel):
    """MongoDB model for a conversation"""
    id: str
    user_id: str  # Added user_id field to associate conversations with users
    title: str = "New Chat"
    messages: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
        
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "messages": self.messages,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        } 