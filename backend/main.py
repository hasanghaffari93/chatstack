from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI
import os
from dotenv import load_dotenv
from typing import List, Dict
from datetime import datetime, timedelta
import uuid

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
conversation_metadata: Dict[str, Dict] = {}
conversation_timestamps: Dict[str, datetime] = {}  # Last update time
conversation_created_at: Dict[str, datetime] = {}  # Creation time
MAX_HISTORY_AGE = timedelta(days=30)  # Keep conversations for 30 days
MAX_CONVERSATIONS = 100  # Maximum number of conversations to keep

class ChatMessage(BaseModel):
    content: str
    conversation_id: str | None = None

class ConversationId(BaseModel):
    conversation_id: str | None = None

def cleanup_old_conversations():
    current_time = datetime.now()
    
    # Remove conversations older than MAX_HISTORY_AGE
    expired_ids = [
        conv_id for conv_id, timestamp in conversation_timestamps.items()
        if current_time - timestamp > MAX_HISTORY_AGE
    ]
    for conv_id in expired_ids:
        conversations.pop(conv_id, None)
        conversation_timestamps.pop(conv_id, None)
        conversation_metadata.pop(conv_id, None)
        conversation_created_at.pop(conv_id, None)
    
    # If we still have too many conversations, remove the oldest ones based on creation time
    if len(conversations) > MAX_CONVERSATIONS:
        sorted_convs = sorted(
            [(conv_id, created_at) for conv_id, created_at in conversation_created_at.items()],
            key=lambda x: x[1]
        )
        # Keep only the MAX_CONVERSATIONS most recent ones
        to_remove = sorted_convs[:-MAX_CONVERSATIONS]
        for conv_id, _ in to_remove:
            conversations.pop(conv_id, None)
            conversation_timestamps.pop(conv_id, None)
            conversation_metadata.pop(conv_id, None)
            conversation_created_at.pop(conv_id, None)

@app.get("/api/conversations")
async def get_conversations():
    cleanup_old_conversations()
    
    # Sort conversations by creation time, most recent first
    sorted_conversations = sorted(
        [
            (conv_id, conversation_created_at[conv_id], conversation_timestamps[conv_id])
            for conv_id in conversations.keys()
        ],
        key=lambda x: x[1],  # Sort by created_at
        reverse=True
    )
    
    return {
        "conversations": [
            {
                "id": conv_id,
                "title": conversation_metadata.get(conv_id, {}).get("title", "New Chat"),
                "created_at": created_at.isoformat(),
                "timestamp": last_update.isoformat(),
                "messages": conversations[conv_id]
            }
            for conv_id, created_at, last_update in sorted_conversations
        ]
    }

@app.delete("/api/chat")
async def clear_conversation(conv: ConversationId):
    conv_id = conv.conversation_id or "default"
    if conv_id in conversations:
        conversations.pop(conv_id)
        conversation_timestamps.pop(conv_id, None)
    return {"status": "success"}

@app.post("/api/chat")
async def chat(message: ChatMessage):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not found. Please set OPENAI_API_KEY in .env file"
        )
    
    try:
        # Clean up old conversations
        cleanup_old_conversations()        # Get or create conversation history
        conv_id = message.conversation_id or str(uuid.uuid4())
        if conv_id not in conversations:
            conversations[conv_id] = []
            conversation_metadata[conv_id] = {"title": "New Chat"}
            conversation_created_at[conv_id] = datetime.now()  # Set creation time for new conversations
        
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
        
        # Generate a title for new conversations based on the first message
        if len(conversations[conv_id]) == 2:  # First exchange (user message + assistant response)
            try:
                title_response = await client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "Generate a very short title (3-5 words) for a conversation that starts with this message. The title should capture the main topic or intent."},
                        {"role": "user", "content": message.content}
                    ]
                )
                if title_response.choices:
                    conversation_metadata[conv_id]["title"] = title_response.choices[0].message.content
            except Exception as e:
                print(f"Error generating title: {e}")
        
        return {
            "response": assistant_message,
            "conversation_id": conv_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
