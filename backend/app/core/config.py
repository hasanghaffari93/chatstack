import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

def get_openai_client(model: str = "gpt-3.5-turbo"):
    """Get OpenAI client with specified model"""
    return ChatOpenAI(api_key=os.getenv("OPENAI_API_KEY"), model=model)

# Available OpenAI models for selection
AVAILABLE_MODELS = [
    {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "description": "Fast and efficient"},
    {"id": "gpt-4", "name": "GPT-4", "description": "Most capable model"},
    {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "description": "Latest GPT-4 with improved performance"},
    {"id": "gpt-4o", "name": "GPT-4o", "description": "Optimized GPT-4 model"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "description": "Smaller, faster GPT-4o variant"}
]

# config file
