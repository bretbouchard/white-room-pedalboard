"""
Database session utilities for FastAPI dependency injection.

Provides async session generator for use in FastAPI route handlers.
"""

from collections.abc import AsyncGenerator
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from schillinger.db.config import async_session_maker, get_async_session_maker


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Get async database session for FastAPI dependency injection.

    Usage in FastAPI routes:
    ```python
    from fastapi import Depends
    from schillinger.db.session import get_async_session

    @app.get("/sessions/")
    async def list_sessions(session: AsyncSession = Depends(get_async_session)):
        result = await session.execute(select(UISession))
        return result.scalars().all()
    ```

    Yields:
        Async database session

    Commits on success, rolls back on error.
    """
    if async_session_maker is None:
        get_async_session_maker()

    assert async_session_maker is not None, "Session maker not initialized"

    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
