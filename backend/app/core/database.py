import os
from pymongo import MongoClient
from pymongo.database import Database
from dotenv import load_dotenv

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


def close_database_connection():
    """Close the database connection"""
    global _client
    if _client is not None:
        _client.close()
        _client = None 