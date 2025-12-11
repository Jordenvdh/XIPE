"""
XIPE Backend API
FastAPI application for XIPE emission calculations
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

