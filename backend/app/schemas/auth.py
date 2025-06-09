from pydantic import BaseModel
from typing import Optional

class TokenRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None
    state: str

class TokenData(BaseModel):
    access_token: str
    token_type: str 