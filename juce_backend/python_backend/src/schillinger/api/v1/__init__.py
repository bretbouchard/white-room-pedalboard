"""
API v1 router.

Aggregates all v1 API endpoints including telemetry.
"""

from fastapi import APIRouter

from schillinger.api.v1.telemetry import router as telemetry_router

# Create main v1 router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(telemetry_router)

# Add more routers here as needed
# api_router.include_router(sessions_router)
# api_router.include_router(compositions_router)
# etc.

__all__ = ["api_router"]
