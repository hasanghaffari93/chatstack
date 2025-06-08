# Endpoints for chat and conversation management
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from app.schemas.chat import ChatMessage, ConversationId, MessageResponse
from app.core.config import get_openai_client, AVAILABLE_MODELS
from app.repositories.conversation_repository import ConversationRepository
from typing import Dict, List, Optional
from datetime import datetime
import uuid, os, json
from app.api.v1.endpoints.auth import get_current_user_from_cookie
from langchain.prompts import ChatPromptTemplate
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser

router = APIRouter()
conversation_repo = ConversationRepository()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

@router.get("/models")
async def get_available_models():
    """Returns available OpenAI models for selection"""
    return {"models": AVAILABLE_MODELS}

@router.get("/conversations/metadata")
async def get_conversation_metadata(user = Depends(get_current_user_from_cookie)):
    """Returns only metadata about conversations, not the messages"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    conversations = conversation_repo.get_conversations_by_user(user_id)
    
    # Always return an array, even if empty
    if not conversations:
        return {"conversations": []}
    
    # Sort by last update time
    sorted_conversations = sorted(
        conversations,
        key=lambda x: x.get("updated_at", datetime.min),
        reverse=True
    )
    
    return {
        "conversations": [
            {
                "id": conv.get("id"),
                "title": conv.get("title", "New Chat"),
                "created_at": conv.get("created_at").isoformat() if isinstance(conv.get("created_at"), datetime) else conv.get("created_at"),
                "updated_at": conv.get("updated_at").isoformat() if isinstance(conv.get("updated_at"), datetime) else conv.get("updated_at"),
                "user_id": conv.get("user_id")
            }
            for conv in sorted_conversations
        ]
    }

@router.get("/conversations/{conversation_id}")
async def get_conversation_by_id(conversation_id: str, user = Depends(get_current_user_from_cookie)):
    """Returns a specific conversation by ID including its messages"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    conversation = conversation_repo.get_conversation_by_id(conversation_id, user_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "conversation": {
            "id": conversation.get("id"),
            "title": conversation.get("title", "New Chat"),
            "created_at": conversation.get("created_at").isoformat() if isinstance(conversation.get("created_at"), datetime) else conversation.get("created_at"),
            "updated_at": conversation.get("updated_at").isoformat() if isinstance(conversation.get("updated_at"), datetime) else conversation.get("updated_at"),
            "messages": conversation.get("messages", []),
            "user_id": conversation.get("user_id")
        }
    }


@router.delete("/chat")
async def clear_conversation(conv: ConversationId, user = Depends(get_current_user_from_cookie)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    if not conv.conversation_id:
        raise HTTPException(status_code=400, detail="Conversation ID is required")
    
    success = conversation_repo.delete_conversation(conv.conversation_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"status": "success"}


@router.post("/chat")
async def chat(message: ChatMessage, user = Depends(get_current_user_from_cookie)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    
    # Debug: Print the received message to see what model is sent
    print(f"DEBUG: Received message: content='{message.content}', model='{message.model}', conversation_id='{message.conversation_id}'")
    
    # Use the model specified in the message, or default to gpt-3.5-turbo
    selected_model = message.model or "gpt-3.5-turbo"
    print(f"DEBUG: Using model: {selected_model}")
    
    llm = get_openai_client(selected_model)
    
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not found. Please set OPENAI_API_KEY in .env file"
        )
    try:
        conv_id = message.conversation_id
        conversation = None
        
        if conv_id:
            # Check if conversation exists for this user
            conversation = conversation_repo.get_conversation_by_id(conv_id, user_id)
        
        if not conversation:
            # Create a new conversation
            conversation = conversation_repo.create_conversation(user_id)
            conv_id = conversation["id"]
        
        # Add user message to conversation
        user_message = {"role": "user", "content": message.content}
        conversation_repo.add_message(conv_id, user_id, user_message)
        
        # Get the last 10 messages for context
        updated_conversation = conversation_repo.get_conversation_by_id(conv_id, user_id)
        conversation_history = updated_conversation.get("messages", [])[-10:]
        
        # Convert the messages to LangChain format
        langchain_messages = []
        for msg in conversation_history:
            if msg["role"] == "system":
                langchain_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                langchain_messages.append(AIMessage(content=msg["content"]))
        
        # Get response from LangChain
        output_parser = StrOutputParser()
        chain = llm | output_parser
        assistant_message = chain.invoke(langchain_messages)
        
        # Add assistant message to conversation
        assistant_message_obj = {"role": "assistant", "content": assistant_message}
        conversation_repo.add_message(conv_id, user_id, assistant_message_obj)
        
        # Generate a title if this is a new conversation (only 2 messages)
        conversation = conversation_repo.get_conversation_by_id(conv_id, user_id)
        if len(conversation.get("messages", [])) == 2:
            try:
                # Create a title generation prompt
                title_prompt = ChatPromptTemplate.from_messages([
                    ("system", "Generate a very short title (3-5 words) for a conversation that starts with this message. The title should capture the main topic or intent."),
                    ("user", message.content)
                ])
                title_chain = title_prompt | llm | output_parser
                new_title = title_chain.invoke({})
                conversation_repo.update_conversation_title(conv_id, user_id, new_title)
            except Exception as e:
                print(f"Error generating title: {e}")
        
        return {
            "response": assistant_message,
            "conversation_id": conv_id,
            "model_used": selected_model  # Include the model used in the response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@router.post("/chat/stream")
async def chat_stream(message: ChatMessage, user = Depends(get_current_user_from_cookie)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get("sub")
    
    # Use the model specified in the message, or default to gpt-3.5-turbo
    selected_model = message.model or "gpt-3.5-turbo"
    
    llm = get_openai_client(selected_model)
    
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not found. Please set OPENAI_API_KEY in .env file"
        )
    
    async def generate_response():
        try:
            conv_id = message.conversation_id
            conversation = None
            
            if conv_id:
                # Check if conversation exists for this user
                conversation = conversation_repo.get_conversation_by_id(conv_id, user_id)
            
            if not conversation:
                # Create a new conversation
                conversation = conversation_repo.create_conversation(user_id)
                conv_id = conversation["id"]
                
                # Send conversation ID first
                yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conv_id})}\n\n"
            
            # Add user message to conversation
            user_message = {"role": "user", "content": message.content}
            conversation_repo.add_message(conv_id, user_id, user_message)
            
            # Get the last 10 messages for context
            updated_conversation = conversation_repo.get_conversation_by_id(conv_id, user_id)
            conversation_history = updated_conversation.get("messages", [])[-10:]
            
            # Convert the messages to LangChain format
            langchain_messages = []
            for msg in conversation_history:
                if msg["role"] == "system":
                    langchain_messages.append(SystemMessage(content=msg["content"]))
                elif msg["role"] == "user":
                    langchain_messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    langchain_messages.append(AIMessage(content=msg["content"]))
            
            # Stream response from LangChain
            full_response = ""
            for chunk in llm.stream(langchain_messages):
                if chunk.content:
                    full_response += chunk.content
                    # Send each chunk as Server-Sent Events
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk.content})}\n\n"
            
            # Add assistant message to conversation
            assistant_message_obj = {"role": "assistant", "content": full_response}
            conversation_repo.add_message(conv_id, user_id, assistant_message_obj)
            
            # Generate a title if this is a new conversation (only 2 messages)
            conversation = conversation_repo.get_conversation_by_id(conv_id, user_id)
            if len(conversation.get("messages", [])) == 2:
                try:
                    # Create a title generation prompt
                    title_prompt = ChatPromptTemplate.from_messages([
                        ("system", "Generate a very short title (3-5 words) for a conversation that starts with this message. The title should capture the main topic or intent."),
                        ("user", message.content)
                    ])
                    title_chain = title_prompt | llm | StrOutputParser()
                    new_title = title_chain.invoke({})
                    conversation_repo.update_conversation_title(conv_id, user_id, new_title)
                    
                    # Send title update
                    yield f"data: {json.dumps({'type': 'title', 'title': new_title})}\n\n"
                except Exception as e:
                    print(f"Error generating title: {e}")
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'done', 'model_used': selected_model})}\n\n"
            
        except Exception as e:
            # Send error message
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )
