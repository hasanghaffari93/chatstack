from pydantic import BaseModel
from typing import Optional

class UserInfo(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None 