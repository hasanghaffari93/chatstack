from typing import Optional
from fastapi import HTTPException
from app.repositories import UserRepository


class SystemPromptService:
    def __init__(self):
        self.user_repo = UserRepository()

    def get_user_system_prompt(self, user_id: str) -> str:
        """Get the current user's system prompt"""
        system_prompt = self.user_repo.get_user_system_prompt(user_id)
        
        if system_prompt is None:
            raise HTTPException(status_code=404, detail="System prompt not found")
        
        return system_prompt

    def save_user_system_prompt(self, user_id: str, system_prompt: str) -> bool:
        """Save the current user's system prompt"""
        success = self.user_repo.save_user_system_prompt(user_id, system_prompt)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save system prompt")
        
        return success 