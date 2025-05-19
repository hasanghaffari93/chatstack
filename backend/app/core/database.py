import os
from pymongo import MongoClient
from pymongo.database import Database
import json
from dotenv import load_dotenv
from typing import Optional
import time

# Load environment variables
load_dotenv()

# MongoDB connection settings
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "chatstack")

# MongoDB client instance
_client = None


def get_database() -> Database:
    """
    Get MongoDB database instance.
    For development, this uses a local MongoDB instance.
    For production, this should use MongoDB Atlas or another production MongoDB service.
    """
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    
    return _client[MONGO_DB_NAME]


# User database operations
def get_user_collection():
    """Get the users collection from the database"""
    db = get_database()
    return db.users


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get a user by their ID"""
    users = get_user_collection()
    return users.find_one({"id": user_id})


def get_user_by_email(email: str) -> Optional[dict]:
    """Get a user by their email"""
    users = get_user_collection()
    return users.find_one({"email": email})


def create_or_update_user(user_data: dict) -> dict:
    """Create a new user or update an existing one"""
    users = get_user_collection()
    
    # Check if user already exists
    existing_user = users.find_one({"id": user_data["id"]})
    
    if existing_user:
        # Update existing user
        users.update_one(
            {"id": user_data["id"]},
            {"$set": user_data}
        )
    else:
        # Create new user
        users.insert_one(user_data)
    
    return users.find_one({"id": user_data["id"]})


def save_user_refresh_token(user_id: str, refresh_token: str) -> bool:
    """Save a user's refresh token"""
    users = get_user_collection()
    result = users.update_one(
        {"id": user_id},
        {"$set": {"refresh_token": refresh_token}}
    )
    return result.modified_count > 0


def get_user_refresh_token(user_id: str) -> Optional[str]:
    """Get a user's refresh token"""
    user = get_user_by_id(user_id)
    if user and "refresh_token" in user:
        return user["refresh_token"]
    return None


# OAuth state management
def get_oauth_states_collection():
    """Get the oauth_states collection from the database"""
    db = get_database()
    return db.oauth_states


def save_oauth_state(state: str, data: dict) -> bool:
    """Save an OAuth state to the database"""
    states = get_oauth_states_collection()
    
    # Add expiration time (10 minutes)
    expires_at = time.time() + 600
    
    state_data = {
        "state": state,
        "created_at": data.get("created_at", time.time()),
        "expires_at": expires_at
    }
    
    # Use upsert to either insert new or update existing
    result = states.update_one(
        {"state": state},
        {"$set": state_data},
        upsert=True
    )
    
    return result.modified_count > 0 or result.upserted_id is not None


def get_oauth_state(state: str) -> Optional[dict]:
    """Get an OAuth state from the database"""
    states = get_oauth_states_collection()
    state_data = states.find_one({"state": state})
    
    # If state exists but is expired, delete it and return None
    if state_data and time.time() > state_data.get("expires_at", 0):
        states.delete_one({"state": state})
        return None
        
    return state_data


def delete_oauth_state(state: str) -> bool:
    """Delete an OAuth state from the database"""
    states = get_oauth_states_collection()
    result = states.delete_one({"state": state})
    return result.deleted_count > 0


def clean_expired_oauth_states() -> int:
    """Clean up expired OAuth states"""
    states = get_oauth_states_collection()
    result = states.delete_many({"expires_at": {"$lt": time.time()}})
    return result.deleted_count 