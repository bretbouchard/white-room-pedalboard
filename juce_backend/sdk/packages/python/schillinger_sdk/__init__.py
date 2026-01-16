"""
Schillinger SDK - Python implementation of the Schillinger System of Musical Composition.

This SDK provides comprehensive access to rhythm, harmony, melody, and composition
generation and analysis using the Schillinger System.

Basic Usage:
    >>> from schillinger_sdk import SchillingerSDK
    >>>
    >>> # Initialize with API key
    >>> sdk = SchillingerSDK(
    ...     base_url="https://api.schillinger.io",
    ...     api_key="your-api-key"
    ... )
    >>>
    >>> # Or use async context manager
    >>> async with SchillingerSDK(...) as sdk:
    ...     # Generate rhythmic resultant
    ...     generators = [
    ...         {"strikes": [0, 3, 6], "period": 8},
    ...         {"strikes": [0, 2, 4, 6], "period": 8}
    ...     ]
    ...     resultant = await sdk.rhythm.generate_resultant(generators)
    ...     print(f"Resultant: {resultant.resultant.strikes}")
"""

from .client import SchillingerSDK
from .errors import (
    SchillingerError,
    ValidationError,
    NetworkError,
    AuthenticationError,
    ProcessingError,
    ConfigurationError,
    RateLimitError,
    CacheError,
    OfflineError
)
from .models import (
    # Rhythm models
    GeneratorProfile,
    ResultantPattern,
    RhythmicVariation,
    PatternAnalysis,

    # Harmony models
    Chord,
    HarmonicProgression,
    AxisPattern,
    HarmonicResolution,

    # Melody models
    MelodicContour,
    MelodicFragment,
    MelodicVariation,
    MelodicAnalysis,

    # Composition models
    Composition,
    CompositionSection,
    CompositionMetadata,
    UserEncoding,
    CompositionAnalysis,

    # API models
    APIRequest,
    APIResponse,
    BatchRequest,
    BatchResponse
)

__version__ = "1.0.0"
__author__ = "Schillinger SDK Team"
__all__ = [
    # Main client
    "SchillingerSDK",

    # Errors
    "SchillingerError",
    "ValidationError",
    "NetworkError",
    "AuthenticationError",
    "ProcessingError",
    "ConfigurationError",
    "RateLimitError",
    "CacheError",
    "OfflineError",

    # Rhythm models
    "GeneratorProfile",
    "ResultantPattern",
    "RhythmicVariation",
    "PatternAnalysis",

    # Harmony models
    "Chord",
    "HarmonicProgression",
    "AxisPattern",
    "HarmonicResolution",

    # Melody models
    "MelodicContour",
    "MelodicFragment",
    "MelodicVariation",
    "MelodicAnalysis",

    # Composition models
    "Composition",
    "CompositionSection",
    "CompositionMetadata",
    "UserEncoding",
    "CompositionAnalysis",

    # API models
    "APIRequest",
    "APIResponse",
    "BatchRequest",
    "BatchResponse"
]
