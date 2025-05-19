from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid
from pymongo.collection import Collection
from app.core.database import get_database
from app.models.conversation import Conversation

class ConversationRepository:
    def __init__(self):
        db = get_database()
        self.collection: Collection = db.conversations
        
        # Create indexes for better query performance
        self.collection.create_index([("user_id", 1)])
        self.collection.create_index([("id", 1), ("user_id", 1)], unique=True)

    def get_conversation_by_id(self, conversation_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a conversation by ID and user_id"""
        return self.collection.find_one({"id": conversation_id, "user_id": user_id})

    def get_conversations_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a user"""
        cursor = self.collection.find({"user_id": user_id})
        return list(cursor)

    def create_conversation(self, user_id: str, title: str = "New Chat") -> Dict[str, Any]:
        """Create a new conversation"""
        conversation = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "messages": [],
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        self.collection.insert_one(conversation)
        return conversation

    def add_message(self, conversation_id: str, user_id: str, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Add a message to a conversation"""
        # First check if the conversation exists and belongs to this user
        conversation = self.get_conversation_by_id(conversation_id, user_id)
        if not conversation:
            return None
            
        # Then add the message
        self.collection.update_one(
            {"id": conversation_id, "user_id": user_id},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        # Return the updated conversation
        return self.get_conversation_by_id(conversation_id, user_id)

    def update_conversation_title(self, conversation_id: str, user_id: str, title: str) -> bool:
        """Update a conversation's title"""
        result = self.collection.update_one(
            {"id": conversation_id, "user_id": user_id},
            {"$set": {"title": title, "updated_at": datetime.now()}}
        )
        return result.modified_count > 0

    def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Delete a conversation"""
        result = self.collection.delete_one({"id": conversation_id, "user_id": user_id})
        return result.deleted_count > 0
    
    def delete_all_user_conversations(self, user_id: str) -> int:
        """Delete all conversations for a user"""
        result = self.collection.delete_many({"user_id": user_id})
        return result.deleted_count
        
    def get_conversation_messages(self, conversation_id: str, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get messages from a conversation with optional limit"""
        conversation = self.get_conversation_by_id(conversation_id, user_id)
        if not conversation:
            return []
            
        messages = conversation.get("messages", [])
        # Return the most recent messages up to the limit
        return messages[-limit:] 