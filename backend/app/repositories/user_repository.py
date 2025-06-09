from typing import Optional
from pymongo.collection import Collection
from app.core.database import get_database


class UserRepository:
    def __init__(self):
        db = get_database()
        self.collection: Collection = db.users
        
        # Create indexes for better query performance
        self.collection.create_index([("id", 1)], unique=True)
        self.collection.create_index([("email", 1)], unique=True)

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get a user by their ID"""
        return self.collection.find_one({"id": user_id})

    def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get a user by their email"""
        return self.collection.find_one({"email": email})

    def create_or_update_user(self, user_data: dict) -> dict:
        """Create a new user or update an existing one"""
        # Check if user already exists
        existing_user = self.collection.find_one({"id": user_data["id"]})
        
        if existing_user:
            # Update existing user
            self.collection.update_one(
                {"id": user_data["id"]},
                {"$set": user_data}
            )
        else:
            # Create new user
            self.collection.insert_one(user_data)
        
        return self.collection.find_one({"id": user_data["id"]})

    def save_user_refresh_token(self, user_id: str, refresh_token: str) -> bool:
        """Save a user's refresh token"""
        result = self.collection.update_one(
            {"id": user_id},
            {"$set": {"refresh_token": refresh_token}}
        )
        return result.modified_count > 0

    def get_user_refresh_token(self, user_id: str) -> Optional[str]:
        """Get a user's refresh token"""
        user = self.get_user_by_id(user_id)
        if user and "refresh_token" in user:
            return user["refresh_token"]
        return None

    def save_user_system_prompt(self, user_id: str, system_prompt: str) -> bool:
        """Save a user's system prompt"""
        result = self.collection.update_one(
            {"id": user_id},
            {"$set": {"system_prompt": system_prompt}}
        )
        return result.modified_count > 0

    def get_user_system_prompt(self, user_id: str) -> Optional[str]:
        """Get a user's system prompt"""
        user = self.get_user_by_id(user_id)
        if user and "system_prompt" in user:
            return user["system_prompt"]
        return None 