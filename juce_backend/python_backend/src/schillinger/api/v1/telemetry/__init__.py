"""
Telemetry API v1 module.

Provides endpoints for uploading and querying UI and parameter telemetry data.
"""

from schillinger.api.v1.telemetry.routes import router

__all__ = ["router"]
