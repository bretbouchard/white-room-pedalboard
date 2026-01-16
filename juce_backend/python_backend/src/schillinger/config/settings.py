"""
Application settings and configuration management.
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Application
    APP_NAME: str = "Schillinger Python Backend"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # API
    API_V1_STR: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    WORKERS: int = 1

    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"]
    )
    CORS_ALLOW_CREDENTIALS: bool = True

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://schillinger:password@localhost:5432/schillinger"
    )
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 30

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: Optional[str] = None

    # Security
    SECRET_KEY: str = Field(default="change-this-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_MAX_TOKENS: int = 4096

    # JUCE Integration
    JUCE_WS_URL: str = "ws://localhost:8081"
    JUCE_RECONNECT_INTERVAL: int = 5
    JUCE_TIMEOUT: int = 30

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30
    WS_MAX_CONNECTIONS: int = 1000

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60

    # File Storage
    UPLOAD_DIR: str = "uploads/"
    MAX_FILE_SIZE: str = "100MB"

    # Agent Configuration
    AGENT_TIMEOUT: int = 30
    AGENT_MAX_RETRIES: int = 3
    AGENT_CONCURRENT_LIMIT: int = 10

    # Audio Processing
    AUDIO_SAMPLE_RATE: int = 44100
    AUDIO_BIT_DEPTH: int = 16
    AUDIO_CHANNELS: int = 2
    AUDIO_BUFFER_SIZE: int = 512

    # Caching
    CACHE_TTL: int = 3600
    CACHE_MAX_SIZE: int = 1000

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()