"""
Configuration settings for the backend application

Purpose:
- Centralized configuration management using Pydantic Settings
- Loads settings from environment variables
- Provides defaults for development

Security considerations:
- OWASP #6 - Security Misconfiguration: Environment-based configuration
- Sensitive settings should be loaded from environment variables, not hardcoded
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings
    
    Purpose:
    - Manages all application configuration
    - Loads from environment variables via .env file
    - Provides sensible defaults for development
    
    Security:
    - Never hardcode sensitive values (API keys, secrets)
    - Use environment variables for production configuration
    """
    # CORS origins - default to localhost for development
    # OWASP #6 - Security Misconfiguration: Restrict CORS origins
    # In production, override via environment variable: CORS_ORIGINS=https://yourdomain.com
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:3001",  # Alternative dev port
    ]
    
    # Data directory path
    # Relative path to CSV data files from backend/ directory
    DATA_DIR: str = "app/data"
    
    # Pydantic configuration
    # Loads from .env file in backend/ directory
    # Case sensitive: Environment variable names must match exactly
    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }


# Global settings instance
# Import this in other modules: from app.core.config import settings
settings = Settings()

