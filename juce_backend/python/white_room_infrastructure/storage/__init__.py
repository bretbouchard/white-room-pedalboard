#
# __init__.py
# White Room Infrastructure - Firebase Storage
#
# Copyright © 2025 White Room. All rights reserved.
#
# This file is part of the White Room infrastructure layer.
# Defined once, used across all platforms.
#

"""
Firebase storage wrapper for Python platforms (Raspberry Pi).

This package provides Firebase storage functionality for Raspberry Pi and other
Python-based platforms in the White Room ecosystem.
"""

from .firebase_storage import (
    FirebaseSyncStatus,
    FirebaseErrorCode,
    FirebaseError,
    FirebaseSongMetadata,
    FirebaseSongData,
    FirebaseConfiguration,
    FirebaseManager,
)

__all__ = [
    "FirebaseSyncStatus",
    "FirebaseErrorCode",
    "FirebaseError",
    "FirebaseSongMetadata",
    "FirebaseSongData",
    "FirebaseConfiguration",
    "FirebaseManager",
]
