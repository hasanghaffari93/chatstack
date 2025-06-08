from pydantic import BaseModel
from typing import Optional

class SystemPromptRequest(BaseModel):
    system_prompt: str

class SystemPromptResponse(BaseModel):
    system_prompt: str
    user_id: str 