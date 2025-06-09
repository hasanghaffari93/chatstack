from typing import Optional
import time
from pymongo.collection import Collection
from app.core.database import get_database


class OAuthRepository:
    def __init__(self):
        db = get_database()
        self.oauth_states_collection: Collection = db.oauth_states
        self.code_verifiers_collection: Collection = db.code_verifiers
        
        # Create indexes for better query performance
        self.oauth_states_collection.create_index([("state", 1)], unique=True)
        self.oauth_states_collection.create_index([("expires_at", 1)], expireAfterSeconds=0)
        self.code_verifiers_collection.create_index([("state", 1)], unique=True)
        self.code_verifiers_collection.create_index([("expires_at", 1)], expireAfterSeconds=0)

    # OAuth state management
    def save_oauth_state(self, state: str, data: dict) -> bool:
        """Save an OAuth state to the database"""
        # Add expiration time (10 minutes)
        expires_at = time.time() + 600
        
        state_data = {
            "state": state,
            "created_at": data.get("created_at", time.time()),
            "expires_at": expires_at
        }
        
        # Use upsert to either insert new or update existing
        result = self.oauth_states_collection.update_one(
            {"state": state},
            {"$set": state_data},
            upsert=True
        )
        
        return result.modified_count > 0 or result.upserted_id is not None

    def get_oauth_state(self, state: str) -> Optional[dict]:
        """Get an OAuth state from the database"""
        state_data = self.oauth_states_collection.find_one({"state": state})
        
        # If state exists but is expired, delete it and return None
        if state_data and time.time() > state_data.get("expires_at", 0):
            self.oauth_states_collection.delete_one({"state": state})
            return None
            
        return state_data

    def delete_oauth_state(self, state: str) -> bool:
        """Delete an OAuth state from the database"""
        result = self.oauth_states_collection.delete_one({"state": state})
        return result.deleted_count > 0

    def clean_expired_oauth_states(self) -> int:
        """Clean up expired OAuth states"""
        result = self.oauth_states_collection.delete_many({"expires_at": {"$lt": time.time()}})
        return result.deleted_count

    # PKCE code verifier management
    def save_code_verifier(self, state: str, code_verifier: str) -> bool:
        """Save a PKCE code verifier associated with a state"""
        # Add expiration time (10 minutes, same as state)
        expires_at = time.time() + 600
        
        verifier_data = {
            "state": state,
            "code_verifier": code_verifier,
            "created_at": time.time(),
            "expires_at": expires_at
        }
        
        # Use upsert to either insert new or update existing
        result = self.code_verifiers_collection.update_one(
            {"state": state},
            {"$set": verifier_data},
            upsert=True
        )
        
        return result.modified_count > 0 or result.upserted_id is not None

    def get_code_verifier(self, state: str) -> Optional[str]:
        """Get a PKCE code verifier by state"""
        verifier_data = self.code_verifiers_collection.find_one({"state": state})
        
        # If verifier exists but is expired, delete it and return None
        if verifier_data and time.time() > verifier_data.get("expires_at", 0):
            self.code_verifiers_collection.delete_one({"state": state})
            return None
        
        return verifier_data.get("code_verifier") if verifier_data else None

    def delete_code_verifier(self, state: str) -> bool:
        """Delete a PKCE code verifier from the database"""
        result = self.code_verifiers_collection.delete_one({"state": state})
        return result.deleted_count > 0

    def clean_expired_code_verifiers(self) -> int:
        """Clean up expired PKCE code verifiers"""
        result = self.code_verifiers_collection.delete_many({"expires_at": {"$lt": time.time()}})
        return result.deleted_count 