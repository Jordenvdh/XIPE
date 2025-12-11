"""
Configuration settings for the backend application
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    # CORS origins - default to localhost for development
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:3001",
    ]
    
    # Data directory path
    DATA_DIR: str = "app/data"
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }


settings = Settings()

