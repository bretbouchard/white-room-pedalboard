"""
DAID Core Integration Helpers

This package provides pre-built integrations for common frameworks and use cases,
making it easy to add DAID provenance tracking to existing applications.
"""

from .base import BaseIntegration, IntegrationConfig
from .decorators import track_async_provenance, track_provenance

__all__ = [
    "BaseIntegration",
    "IntegrationConfig",
    "track_provenance",
    "track_async_provenance",
]
