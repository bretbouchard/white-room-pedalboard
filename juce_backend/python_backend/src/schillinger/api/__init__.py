"""
API module.

Exports the main API router for inclusion in the FastAPI application.
"""

from schillinger.api.v1 import api_router

__all__ = ["api_router"]
