#
# __init__.py
# White Room Infrastructure
#
# Copyright © 2025 White Room. All rights reserved.
#
# This file is part of the White Room infrastructure layer.
# Defined once, used across all platforms.
#

"""
Clerk authentication wrapper for Python platforms.

This package provides authentication functionality for Raspberry Pi and other
Python-based platforms in the White Room ecosystem.
"""

from .clerk_auth import (
    AuthenticationState,
    OAuthProvider,
    AuthErrorCode,
    AuthError,
    User,
    TokenResponse,
    EmailSignInRequest,
    EmailSignUpRequest,
    OAuthResponse,
    ClerkConfiguration,
    ClerkManager,
)

__all__ = [
    "AuthenticationState",
    "OAuthProvider",
    "AuthErrorCode",
    "AuthError",
    "User",
    "TokenResponse",
    "EmailSignInRequest",
    "EmailSignUpRequest",
    "OAuthResponse",
    "ClerkConfiguration",
    "ClerkManager",
]
