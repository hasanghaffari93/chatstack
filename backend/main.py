from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI
import os
from dotenv import load_dotenv
from typing import List, Dict
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # More permissive for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for conversations
conversations: Dict[str, List[Dict]] = {}
conversation_timestamps: Dict[str, datetime] = {}
MAX_HISTORY_AGE = timedelta(hours=1)  # Conversations expire after 1 hour

class ChatMessage(BaseModel):
    content: str
    conversation_id: str | None = None

def cleanup_old_conversations():
    current_time = datetime.now()
    expired_ids = [
        conv_id for conv_id, timestamp in conversation_timestamps.items()
        if current_time - timestamp > MAX_HISTORY_AGE
    ]
    for conv_id in expired_ids:
        conversations.pop(conv_id, None)
        conversation_timestamps.pop(conv_id, None)

@app.post("/api/chat")
async def chat(message: ChatMessage):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not found. Please set OPENAI_API_KEY in .env file"
        )
    
    try:
        # Clean up old conversations
        cleanup_old_conversations()

        # Get or create conversation history
        conv_id = message.conversation_id or "default"
        if conv_id not in conversations:
            conversations[conv_id] = []
        
        # Update conversation timestamp
        conversation_timestamps[conv_id] = datetime.now()
        
        # Add user message to history
        conversations[conv_id].append({"role": "user", "content": message.content})
        
        # Keep only last 10 messages for context
        conversation_history = conversations[conv_id][-10:]
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=conversation_history
        )
        
        if not response.choices:
            raise HTTPException(
                status_code=500,
                detail="No response received from OpenAI API"
            )
        
        # Add assistant's response to history
        assistant_message = response.choices[0].message.content
        conversations[conv_id].append({"role": "assistant", "content": assistant_message})
        
        return {
            "response": assistant_message,
            "conversation_id": conv_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
