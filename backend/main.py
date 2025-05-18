from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import router as api_v1_router
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Get allowed origins from environment or use defaults
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Only add CSP in production to avoid development issues
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            f"connect-src 'self' {' '.join(ALLOWED_ORIGINS)}; "
            "img-src 'self' data: https://accounts.google.com https://*.googleusercontent.com; "
            "script-src 'self' https://accounts.google.com; "
            "style-src 'self' 'unsafe-inline'; "
            "frame-src 'self' https://accounts.google.com; "
            "font-src 'self';"
        )
    
    # Add Referrer-Policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    return response

app.include_router(api_v1_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
