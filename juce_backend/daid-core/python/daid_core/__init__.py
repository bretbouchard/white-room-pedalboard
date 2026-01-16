"""
DAID Core Python Package

This package provides Python bindings for the DAID (Distributed Agent Identifier)
provenance system, enabling cross-language DAID usage between Python and TypeScript/JavaScript.
"""

from .daid_core import (
    DAIDGenerator,
    DAIDClient,
    DAIDValidator,
    DAIDComponents,
    ProvenanceRecord,
    DAIDValidationResult,
    CacheManager,
    DAIDHealthMonitor,
    DAIDRecoveryManager,
    DAIDSynchronizationManager,
    create_daid_health_monitor,
    create_daid_recovery_manager,
    create_daid_sync_manager,
    perform_daid_health_check,
    recover_corrupted_daid,
)

__version__ = "1.0.0"
__all__ = [
    "DAIDGenerator",
    "DAIDClient",
    "DAIDValidator",
    "DAIDComponents",
    "ProvenanceRecord",
    "DAIDValidationResult",
    "CacheManager",
    "DAIDHealthMonitor",
    "DAIDRecoveryManager",
    "DAIDSynchronizationManager",
    "create_daid_health_monitor",
    "create_daid_recovery_manager",
    "create_daid_sync_manager",
    "perform_daid_health_check",
    "recover_corrupted_daid",
]
