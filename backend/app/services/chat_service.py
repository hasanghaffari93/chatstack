from typing import Dict, List, Optional, AsyncGenerator
from datetime import datetime
import uuid, os, json
from fastapi import HTTPException

from app.schemas.chat import ChatMessage, MessageResponse
from app.core.config import get_openai_client, AVAILABLE_MODELS
from app.repositories.conversation_repository import ConversationRepository
from app.repositories import UserRepository
from langchain.prompts import ChatPromptTemplate
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser


class ChatService:
    def __init__(self):
        self.conversation_repo = ConversationRepository()
        self.user_repo = UserRepository()
        self.output_parser = StrOutputParser()

    def get_available_models(self) -> Dict[str, List[str]]:
        """Returns available OpenAI models for selection"""
        return {"models": AVAILABLE_MODELS}

    def _validate_openai_key(self):
        """Validates that OpenAI API key is available"""
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not found. Please set OPENAI_API_KEY in .env file"
            )

    def _get_or_create_conversation(self, conv_id: Optional[str], user_id: str) -> tuple[str, bool]:
        """
        Gets existing conversation or creates a new one
        Returns: (conversation_id, is_new_conversation)
        """
        conversation = None
        is_new = False
        
        if conv_id:
            conversation = self.conversation_repo.get_conversation_by_id(conv_id, user_id)
        
        if not conversation:
            conversation = self.conversation_repo.create_conversation(user_id)
            conv_id = conversation["id"]
            is_new = True
        
        return conv_id, is_new

    def _build_langchain_messages(self, conversation_history: List[Dict], user_system_prompt: Optional[str]) -> List:
        """Converts conversation history to LangChain message format"""
        langchain_messages = []
        
        # Add system prompt if it exists
        if user_system_prompt:
            langchain_messages.append(SystemMessage(content=user_system_prompt))
        
        for msg in conversation_history:
            if msg["role"] == "system":
                langchain_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                langchain_messages.append(AIMessage(content=msg["content"]))
        
        return langchain_messages

    def _generate_conversation_title(self, llm, user_message: str, conv_id: str, user_id: str):
        """Generates a title for a new conversation"""
        try:
            title_prompt = ChatPromptTemplate.from_messages([
                ("system", "Generate a very short title (3-5 words) for a conversation that starts with this message. The title should capture the main topic or intent."),
                ("user", user_message)
            ])
            title_chain = title_prompt | llm | self.output_parser
            new_title = title_chain.invoke({})
            self.conversation_repo.update_conversation_title(conv_id, user_id, new_title)
            return new_title
        except Exception as e:
            print(f"Error generating title: {e}")
            return None

    async def process_chat_message(self, message: ChatMessage, user_id: str) -> Dict:
        """
        Processes a chat message and returns the response
        """
        self._validate_openai_key()
        
        # Use the model specified in the message, or default to gpt-3.5-turbo
        selected_model = message.model or "gpt-3.5-turbo"
        print(f"DEBUG: Using model: {selected_model}")
        
        llm = get_openai_client(selected_model)
        
        try:
            # Get or create conversation
            conv_id, is_new = self._get_or_create_conversation(message.conversation_id, user_id)
            
            # Add user message to conversation
            user_message = {"role": "user", "content": message.content}
            self.conversation_repo.add_message(conv_id, user_id, user_message)
            
            # Get conversation context (last 10 messages)
            updated_conversation = self.conversation_repo.get_conversation_by_id(conv_id, user_id)
            conversation_history = updated_conversation.get("messages", [])[-10:]
            
            # Get user's system prompt
            user_system_prompt = self.user_repo.get_user_system_prompt(user_id)
            
            # Build LangChain messages
            langchain_messages = self._build_langchain_messages(conversation_history, user_system_prompt)
            
            # Get response from LangChain
            chain = llm | self.output_parser
            assistant_message = chain.invoke(langchain_messages)
            
            # Add assistant message to conversation
            assistant_message_obj = {"role": "assistant", "content": assistant_message}
            self.conversation_repo.add_message(conv_id, user_id, assistant_message_obj)
            
            # Generate title for new conversations
            conversation = self.conversation_repo.get_conversation_by_id(conv_id, user_id)
            if len(conversation.get("messages", [])) == 2:
                self._generate_conversation_title(llm, message.content, conv_id, user_id)
            
            return {
                "response": assistant_message,
                "conversation_id": conv_id,
                "model_used": selected_model
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

    async def process_chat_stream(self, message: ChatMessage, user_id: str) -> AsyncGenerator[str, None]:
        """
        Processes a chat message and yields streaming response
        """
        self._validate_openai_key()
        
        # Use the model specified in the message, or default to gpt-3.5-turbo
        selected_model = message.model or "gpt-3.5-turbo"
        llm = get_openai_client(selected_model)
        
        try:
            # Get or create conversation
            conv_id, is_new = self._get_or_create_conversation(message.conversation_id, user_id)
            
            # Send conversation ID if it's a new conversation
            if is_new:
                yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conv_id})}\n\n"
            
            # Add user message to conversation
            user_message = {"role": "user", "content": message.content}
            self.conversation_repo.add_message(conv_id, user_id, user_message)
            
            # Get conversation context (last 10 messages)
            updated_conversation = self.conversation_repo.get_conversation_by_id(conv_id, user_id)
            conversation_history = updated_conversation.get("messages", [])[-10:]
            
            # Get user's system prompt
            user_system_prompt = self.user_repo.get_user_system_prompt(user_id)
            
            # Build LangChain messages (excluding system messages from history for streaming)
            langchain_messages = []
            if user_system_prompt:
                langchain_messages.append(SystemMessage(content=user_system_prompt))
            
            for msg in conversation_history:
                if msg["role"] == "user":
                    langchain_messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    langchain_messages.append(AIMessage(content=msg["content"]))
            
            # Stream response from LangChain
            full_response = ""
            for chunk in llm.stream(langchain_messages):
                if chunk.content:
                    full_response += chunk.content
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk.content})}\n\n"
            
            # Add assistant message to conversation
            assistant_message_obj = {"role": "assistant", "content": full_response}
            self.conversation_repo.add_message(conv_id, user_id, assistant_message_obj)
            
            # Generate title for new conversations
            conversation = self.conversation_repo.get_conversation_by_id(conv_id, user_id)
            if len(conversation.get("messages", [])) == 2:
                new_title = self._generate_conversation_title(llm, message.content, conv_id, user_id)
                if new_title:
                    yield f"data: {json.dumps({'type': 'title', 'title': new_title})}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'done', 'model_used': selected_model})}\n\n"
            
        except Exception as e:
            # Send error message
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n" 