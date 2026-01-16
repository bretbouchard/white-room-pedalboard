"""
Main application entry point for the Schillinger Python Backend.
"""

import logging
import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schillinger.config.settings import get_settings
from schillinger.api import api_router
# from schillinger.api.websocket.websocket_manager import websocket_manager
# from schillinger.core.session.session_manager import session_manager
# from schillinger.utils.logging import setup_logging


settings = get_settings()
# logger = setup_logging(__name__)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("Starting Schillinger Python Backend...")

    # Initialize core components
    # await session_manager.initialize()
    # await websocket_manager.initialize()

    logger.info("Application startup complete")

    try:
        yield
    finally:
        logger.info("Shutting down Schillinger Python Backend...")

        # Cleanup
        # await websocket_manager.cleanup()
        # await session_manager.cleanup()

        logger.info("Application shutdown complete")


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI-powered music composition and generation system",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Add health check endpoint
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": settings.APP_VERSION}

    return app


app = create_application()


def main() -> None:
    """Main entry point for the application."""
    uvicorn.run(
        "schillinger.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        workers=settings.WORKERS,
        log_level=settings.LOG_LEVEL.lower(),
    )


if __name__ == "__main__":
    main()