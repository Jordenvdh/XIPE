"""
XIPE Backend API
FastAPI application for XIPE emission calculations

Security considerations:
- CORS: Configured to allow only specified origins
- Error handling: Generic error messages to prevent information disclosure
- Logging: Security events are logged
- Production: Consider adding rate limiting, authentication, and HTTPS enforcement
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging for security events
# OWASP #10 - Logging: Set up comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Support both local backend execution (cwd=backend) and Vercel serverless (cwd=repo root)
try:
    from app.api.routes import data, variables, calculations
    from app.core.config import settings
except ModuleNotFoundError:
    import os
    import sys

    CURRENT_DIR = os.path.dirname(__file__)
    BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
    if BACKEND_ROOT not in sys.path:
        sys.path.append(BACKEND_ROOT)
    from app.api.routes import data, variables, calculations
    from app.core.config import settings

# Initialize FastAPI app
app = FastAPI(
    title="XIPE API",
    description="API for Cross Impact Performance Emissions (XIPE) model calculations",
    version="1.0.0"
)

# CORS configuration - allow Next.js frontend
# OWASP #6 - Security Misconfiguration: Restrict CORS to known origins
# OWASP #5 - Broken Access Control: CORS prevents unauthorized cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Only allow configured origins
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Restrict to needed methods only
    allow_headers=["Content-Type", "Authorization"],  # Restrict headers
)

# Include API routes
app.include_router(data.router, prefix="/api", tags=["data"])
app.include_router(variables.router, prefix="/api/variables", tags=["variables"])
app.include_router(calculations.router, prefix="/api/calculations", tags=["calculations"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "XIPE API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/api/health")
async def api_health_check():
    """Health check endpoint under /api for serverless rewrite"""
    return {"status": "healthy"}






