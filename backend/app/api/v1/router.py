from fastapi import APIRouter
from app.api.v1.endpoints import chat, auth

router = APIRouter()
router.include_router(chat.router)
router.include_router(auth.router, prefix="/auth", tags=["authentication"])