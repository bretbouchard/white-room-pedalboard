"""
Database engine and session factory configuration.

Supports:
- PostgreSQL (production)
- SQLite (development/testing)
"""

import os
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

from schillinger.config.settings import get_settings

settings = get_settings()


def get_database_url(
    driver: Optional[str] = None,
    user: Optional[str] = None,
    password: Optional[str] = None,
    host: Optional[str] = None,
    port: Optional[int] = None,
    database: Optional[str] = None,
) -> str:
    """
    Build database connection URL from settings or environment variables.

    Args:
        driver: Database driver prefix (e.g., "postgresql+asyncpg")
                If None, extracts from settings.DATABASE_URL
        user: Database user (extracted from settings.DATABASE_URL if None)
        password: Database password (extracted from settings.DATABASE_URL if None)
        host: Database host (extracted from settings.DATABASE_URL if None)
        port: Database port (extracted from settings.DATABASE_URL if None)
        database: Database name (extracted from settings.DATABASE_URL if None)

    Returns:
        Database connection URL

    Note:
        Uses settings.DATABASE_URL by default, which is configured via:
        - Environment variable: DATABASE_URL
        - .env file
        - Default: "postgresql+asyncpg://schillinger:password@localhost:5432/schillinger"
    """
    # Use the configured DATABASE_URL from settings
    if all(v is None for v in [driver, user, password, host, port, database]):
        return settings.DATABASE_URL

    # Build URL from components if provided
    # (Useful for testing with different databases)
    driver = driver or "postgresql+asyncpg"
    user = user or "schillinger"
    password = password or "password"
    host = host or "localhost"
    port = port or 5432
    database = database or "white_room"

    return f"{driver}://{user}:{password}@{host}:{port}/{database}"


def get_sqlite_url(path: Optional[str] = None) -> str:
    """
    Get SQLite database URL for development/testing.

    Args:
        path: Path to SQLite database file
               (defaults to ./data/telemetry.db)

    Returns:
        SQLite database URL
    """
    if path is None:
        # Create data directory if it doesn't exist
        data_dir = Path.cwd() / "data"
        data_dir.mkdir(exist_ok=True)
        path = str(data_dir / "telemetry.db")

    return f"sqlite:///{path}"


# Async engine for PostgreSQL (production)
async_engine: Optional[create_async_engine] = None


def get_engine(
    database_url: Optional[str] = None,
    echo: bool = False,
    pool_size: int = 5,
    max_overflow: int = 10,
) -> create_engine:
    """
    Get synchronous database engine.

    Args:
        database_url: Database connection URL
                      (defaults to PostgreSQL from settings)
        echo: Log SQL statements (for debugging)
        pool_size: Connection pool size
        max_overflow: Max overflow connections

    Returns:
        SQLAlchemy engine
    """
    if database_url is None:
        database_url = get_database_url()

    engine = create_engine(
        database_url,
        echo=echo,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_pre_ping=True,  # Verify connections before using
    )

    return engine


def get_async_engine(
    database_url: Optional[str] = None,
    echo: bool = False,
    pool_size: int = 5,
    max_overflow: int = 10,
) -> create_async_engine:
    """
    Get async database engine.

    Args:
        database_url: Database connection URL
                      (defaults to PostgreSQL+asyncpg from settings)
        echo: Log SQL statements (for debugging)
        pool_size: Connection pool size
        max_overflow: Max overflow connections

    Returns:
        SQLAlchemy async engine
    """
    global async_engine

    if async_engine is not None:
        return async_engine

    if database_url is None:
        database_url = get_database_url()

    async_engine = create_async_engine(
        database_url,
        echo=echo,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_pre_ping=True,
    )

    return async_engine


def get_session_factory(engine: Optional[create_engine] = None) -> sessionmaker:
    """
    Get synchronous session factory.

    Args:
        engine: Database engine (uses get_engine() if not provided)

    Returns:
        Session factory
    """
    if engine is None:
        engine = get_engine()

    return sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )


# Async session factory for dependency injection
async_session_maker: Optional[async_sessionmaker[AsyncSession]] = None


def get_async_session_maker(
    engine: Optional[create_async_engine] = None,
) -> async_sessionmaker[AsyncSession]:
    """
    Get async session factory.

    Args:
        engine: Async database engine (uses get_async_engine() if not provided)

    Returns:
        Async session factory
    """
    global async_session_maker

    if async_session_maker is not None:
        return async_session_maker

    if engine is None:
        engine = get_async_engine()

    async_session_maker = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )

    return async_session_maker
