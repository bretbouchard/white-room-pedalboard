#
# clerk_auth.py
# White Room Infrastructure
#
# Copyright © 2025 White Room. All rights reserved.
#
# This file is part of the White Room infrastructure layer.
# Defined once, used across all platforms.
#

"""
Clerk authentication wrapper for Python platforms.

This module provides authentication functionality for Raspberry Pi and other
Python-based platforms in the White Room ecosystem.
"""

import os
import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Dict, Any, Callable
from functools import wraps
import requests

# MARK: - Enums


class AuthenticationState(Enum):
    """Represents the current authentication state"""
    UNAUTHENTICATED = "unauthenticated"
    AUTHENTICATING = "authenticating"
    AUTHENTICATED = "authenticated"
    ERROR = "error"


class OAuthProvider(Enum):
    """Supported OAuth providers"""
    APPLE = "apple"
    GOOGLE = "google"
    FACEBOOK = "facebook"
    GITHUB = "github"

    @property
    def display_name(self) -> str:
        """Get human-readable provider name"""
        return {
            OAuthProvider.APPLE: "Apple",
            OAuthProvider.GOOGLE: "Google",
            OAuthProvider.FACEBOOK: "Facebook",
            OAuthProvider.GITHUB: "GitHub",
        }[self]

    @property
    def is_native(self) -> bool:
        """Check if provider uses native flow"""
        # Apple uses native AuthenticationServices framework
        return self == OAuthProvider.APPLE


class AuthErrorCode(Enum):
    """Authentication error codes"""
    NOT_AUTHENTICATED = "not_authenticated"
    INVALID_CREDENTIALS = "invalid_credentials"
    TOKEN_EXPIRED = "token_expired"
    NETWORK_ERROR = "network_error"
    CANCELLED = "cancelled"
    PROVIDER_UNAVAILABLE = "provider_unavailable"
    UNKNOWN = "unknown"


# MARK: - Exceptions


class AuthError(Exception):
    """Base authentication error"""

    def __init__(
        self,
        code: AuthErrorCode,
        message: Optional[str] = None,
        provider: Optional[OAuthProvider] = None,
    ):
        self.code = code
        self.provider = provider
        self.message = message or code.value
        super().__init__(self.message)

    @classmethod
    def not_authenticated(cls) -> "AuthError":
        return cls(AuthErrorCode.NOT_AUTHENTICATED, "User is not authenticated")

    @classmethod
    def invalid_credentials(cls) -> "AuthError":
        return cls(AuthErrorCode.INVALID_CREDENTIALS, "Invalid credentials provided")

    @classmethod
    def token_expired(cls) -> "AuthError":
        return cls(AuthErrorCode.TOKEN_EXPIRED, "Authentication token has expired")

    @classmethod
    def network_error(cls, error: Exception) -> "AuthError":
        return cls(AuthErrorCode.NETWORK_ERROR, f"Network error: {str(error)}")

    @classmethod
    def cancelled(cls) -> "AuthError":
        return cls(AuthErrorCode.CANCELLED, "Authentication was cancelled")

    @classmethod
    def provider_unavailable(cls, provider: OAuthProvider) -> "AuthError":
        return cls(
            AuthErrorCode.PROVIDER_UNAVAILABLE,
            f"{provider.display_name} authentication is unavailable",
            provider,
        )

    @classmethod
    def unknown(cls, message: str) -> "AuthError":
        return cls(AuthErrorCode.UNKNOWN, message)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, AuthError):
            return False
        return self.code == other.code


# MARK: - Data Models


@dataclass
class User:
    """Represents an authenticated user"""

    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def display_name(self) -> str:
        """Get user's display name"""
        if self.full_name:
            return self.full_name
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.email or "Unknown User"

    def to_json(self) -> Dict[str, Any]:
        """Convert to JSON dictionary"""
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "profile_picture_url": self.profile_picture_url,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> "User":
        """Create from JSON dictionary"""
        return cls(
            id=data["id"],
            email=data.get("email"),
            full_name=data.get("full_name"),
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            profile_picture_url=data.get("profile_picture_url"),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.utcnow(),
            updated_at=datetime.fromisoformat(data["updated_at"]) if data.get("updated_at") else datetime.utcnow(),
        )


@dataclass
class TokenResponse:
    """Response containing authentication tokens"""

    token: str
    expires_at: datetime
    refresh_token: Optional[str] = None

    @property
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow() > self.expires_at

    @property
    def is_valid(self) -> bool:
        """Check if token is valid"""
        return not self.is_expired and len(self.token) > 0

    def to_json(self) -> Dict[str, Any]:
        """Convert to JSON dictionary"""
        return {
            "token": self.token,
            "expires_at": self.expires_at.isoformat(),
            "refresh_token": self.refresh_token,
        }

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> "TokenResponse":
        """Create from JSON dictionary"""
        return cls(
            token=data["token"],
            expires_at=datetime.fromisoformat(data["expires_at"]),
            refresh_token=data.get("refresh_token"),
        )


@dataclass
class EmailSignInRequest:
    """Request to sign in with email and password"""

    email: str
    password: str


@dataclass
class EmailSignUpRequest:
    """Request to create a new account"""

    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


@dataclass
class OAuthResponse:
    """Response from OAuth authentication flow"""

    user: User
    token: str
    expires_at: datetime


# MARK: - Configuration


@dataclass
class ClerkConfiguration:
    """Clerk configuration"""

    publishable_key: str
    api_url: str = "https://api.clerk.com"
    frontend_url: str = "https://your-app.clerk.accounts.dev"
    redirect_url: str = "http://localhost:5000/auth/callback"


# MARK: - Clerk Manager


class ClerkManager:
    """
    Main authentication manager using Clerk backend

    This class provides a unified interface for authentication across all White Room platforms.
    It handles sign in, sign up, sign out, token management, and session persistence.

    ## Usage Example
    ```python
    config = ClerkConfiguration(
        publishable_key="pk_test_..."
    )
    manager = ClerkManager(configuration=config)

    # Sign in with Google
    user = await manager.sign_in_with(OAuthProvider.GOOGLE)

    # Get current authentication state
    state = manager.get_authentication_state()

    # Get token for API calls
    token = await manager.get_token()
    ```
    """

    def __init__(
        self,
        configuration: ClerkConfiguration,
        storage_path: Optional[str] = None,
    ):
        """
        Initialize Clerk manager

        Args:
            configuration: Clerk configuration
            storage_path: Path to storage file for session persistence
        """
        self.configuration = configuration
        self.storage_path = storage_path or os.path.expanduser("~/.whiteroom_clerk_session.json")
        self._current_user: Optional[User] = None
        self._current_token: Optional[TokenResponse] = None
        self._state_change_callbacks: list[Callable] = []

        # Restore existing session on initialization
        try:
            self.restore_session()
        except Exception as e:
            print(f"Failed to restore session: {e}")

    # MARK: - Public Methods - Sign In

    def sign_in_with(self, provider: OAuthProvider) -> User:
        """
        Sign in with OAuth provider

        Args:
            provider: The OAuth provider to use

        Returns:
            The authenticated user

        Raises:
            AuthError: If authentication fails
        """
        self._set_state(AuthenticationState.AUTHENTICATING)

        try:
            response = self._perform_oauth_sign_in(provider)
            self._handle_sign_in_success(
                response.user,
                response.token,
                response.expires_at,
            )
            return response.user
        except Exception as e:
            self._handle_sign_in_failure(e)
            raise

    def sign_in_with_email(self, email: str, password: str) -> User:
        """
        Sign in with email and password

        Args:
            email: User's email address
            password: User's password

        Returns:
            The authenticated user

        Raises:
            AuthError: If authentication fails
        """
        self._set_state(AuthenticationState.AUTHENTICATING)

        request = EmailSignInRequest(email=email, password=password)

        try:
            response = self._perform_email_sign_in(request)
            self._handle_sign_in_success(
                response.user,
                response.token,
                response.expires_at,
            )
            return response.user
        except Exception as e:
            self._handle_sign_in_failure(e)
            raise

    # MARK: - Public Methods - Sign Up

    def sign_up_with_email(
        self,
        email: str,
        password: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
    ) -> User:
        """
        Create a new account with email and password

        Args:
            email: User's email address
            password: User's password
            first_name: Optional first name
            last_name: Optional last name

        Returns:
            The newly created user

        Raises:
            AuthError: If registration fails
        """
        self._set_state(AuthenticationState.AUTHENTICATING)

        request = EmailSignUpRequest(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        try:
            response = self._perform_email_sign_up(request)
            self._handle_sign_in_success(
                response.user,
                response.token,
                response.expires_at,
            )
            return response.user
        except Exception as e:
            self._handle_sign_in_failure(e)
            raise

    # MARK: - Public Methods - Sign Out

    def sign_out(self) -> None:
        """
        Sign out the current user

        This clears the local session and removes tokens from storage.

        Raises:
            AuthError: If sign out fails
        """
        if not self._current_user:
            raise AuthError.not_authenticated()

        # Call Clerk backend to revoke session
        url = f"{self.configuration.api_url}/v1/client/sign_out"
        headers = {}
        if self._current_token:
            headers["Authorization"] = f"Bearer {self._current_token.token}"

        response = requests.post(url, headers=headers)

        if not response.ok:
            raise AuthError.unknown("Sign out failed")

        # Clear local state
        self._clear_session()

    # MARK: - Public Methods - Token Management

    def get_token(self) -> str:
        """
        Get the current authentication token

        This will refresh the token if it's expired.

        Returns:
            A valid authentication token

        Raises:
            AuthError: If user is not authenticated or token refresh fails
        """
        if not self._current_token:
            raise AuthError.not_authenticated()

        # Check if token is expired
        if self._current_token.is_expired:
            return self.refresh_token()

        return self._current_token.token

    def refresh_token(self) -> str:
        """
        Refresh the authentication token

        Returns:
            A new valid token

        Raises:
            AuthError: If refresh fails
        """
        if not self._current_token or not self._current_token.refresh_token:
            raise AuthError.token_expired()

        url = f"{self.configuration.api_url}/v1/client/tokens/refresh"
        data = {"refresh_token": self._current_token.refresh_token}

        response = requests.post(url, json=data)

        if not response.ok:
            raise AuthError.token_expired()

        token_data = response.json()
        new_token = TokenResponse.from_json(token_data)

        self._update_token(new_token)

        return new_token.token

    # MARK: - Public Methods - State Management

    def get_authentication_state(self) -> Dict[str, Any]:
        """
        Get the current authentication state

        Returns:
            Dictionary containing state information
        """
        if not self._current_user:
            return {"state": AuthenticationState.UNAUTHENTICATED.value}

        return {
            "state": AuthenticationState.AUTHENTICATED.value,
            "user": self._current_user.to_json(),
        }

    def on_state_change(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """
        Subscribe to authentication state changes

        Args:
            callback: Function to call when state changes
        """
        self._state_change_callbacks.append(callback)

    # MARK: - Private Methods - Session Management

    def _handle_sign_in_success(
        self,
        user: User,
        token: str,
        expires_at: datetime,
    ) -> None:
        """Handle successful sign in"""
        token_response = TokenResponse(
            token=token,
            expires_at=expires_at,
            refresh_token=None,  # TODO: Implement refresh tokens
        )

        self._current_user = user
        self._current_token = token_response

        self._set_state(AuthenticationState.AUTHENTICATED)

        # Save to storage
        self._save_session(user, token_response)

    def _handle_sign_in_failure(self, error: Exception) -> None:
        """Handle failed sign in"""
        if isinstance(error, AuthError):
            auth_error = error
        else:
            auth_error = AuthError.unknown(str(error))

        self._set_state(AuthenticationState.ERROR, auth_error)

    def _clear_session(self) -> None:
        """Clear current session"""
        self._current_user = None
        self._current_token = None

        self._set_state(AuthenticationState.UNAUTHENTICATED)

        # Remove from storage
        try:
            if os.path.exists(self.storage_path):
                os.remove(self.storage_path)
        except Exception as e:
            print(f"Failed to remove session file: {e}")

    def restore_session(self) -> None:
        """Restore session from storage"""
        try:
            if not os.path.exists(self.storage_path):
                self._clear_session()
                return

            with open(self.storage_path, "r") as f:
                data = json.load(f)

            user = User.from_json(data["user"])
            token = TokenResponse.from_json(data["token"])

            # Verify token is still valid
            if token.is_valid:
                self._current_user = user
                self._current_token = token
                self._set_state(AuthenticationState.AUTHENTICATED)
            else:
                # Token expired
                self._clear_session()
        except Exception as e:
            print(f"Failed to restore session: {e}")
            self._clear_session()

    def _save_session(self, user: User, token: TokenResponse) -> None:
        """Save session to storage"""
        try:
            data = {
                "user": user.to_json(),
                "token": token.to_json(),
            }

            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)

            with open(self.storage_path, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Failed to save session: {e}")

    def _update_token(self, token: TokenResponse) -> None:
        """Update current token"""
        if not self._current_user:
            raise AuthError.not_authenticated()

        self._current_token = token
        self._save_session(self._current_user, token)

    def _set_state(self, state: AuthenticationState, error: Optional[AuthError] = None) -> None:
        """Set authentication state and notify listeners"""
        state_data = {"state": state.value}
        if state == AuthenticationState.AUTHENTICATED and self._current_user:
            state_data["user"] = self._current_user.to_json()
        elif state == AuthenticationState.ERROR and error:
            state_data["error"] = error.message

        for callback in self._state_change_callbacks:
            try:
                callback(state_data)
            except Exception as e:
                print(f"State change callback error: {e}")

    # MARK: - Private Methods - API Calls

    def _perform_email_sign_in(self, request: EmailSignInRequest) -> OAuthResponse:
        """Perform email sign in"""
        url = f"{self.configuration.api_url}/v1/client/sign_ins/email"
        data = {
            "email": request.email,
            "password": request.password,
        }

        response = requests.post(url, json=data)

        if not response.ok:
            raise AuthError.invalid_credentials()

        response_data = response.json()

        user = User.from_json(response_data["user"])
        expires_at = datetime.fromisoformat(response_data["expires_at"])

        return OAuthResponse(
            user=user,
            token=response_data["token"],
            expires_at=expires_at,
        )

    def _perform_email_sign_up(self, request: EmailSignUpRequest) -> OAuthResponse:
        """Perform email sign up"""
        url = f"{self.configuration.api_url}/v1/client/sign_ups/email"
        data = {
            "email": request.email,
            "password": request.password,
        }
        if request.first_name:
            data["first_name"] = request.first_name
        if request.last_name:
            data["last_name"] = request.last_name

        response = requests.post(url, json=data)

        if not response.ok:
            raise AuthError.invalid_credentials()

        response_data = response.json()

        user = User.from_json(response_data["user"])
        expires_at = datetime.fromisoformat(response_data["expires_at"])

        return OAuthResponse(
            user=user,
            token=response_data["token"],
            expires_at=expires_at,
        )

    def _perform_oauth_sign_in(self, provider: OAuthProvider) -> OAuthResponse:
        """
        Perform OAuth sign in

        For OAuth, we need to redirect to Clerk's OAuth flow.
        This is typically handled by a web server or UI layer.

        On Raspberry Pi, this typically means:
        1. Generate authentication URL
        2. Display QR code or provide companion device flow
        3. Wait for user to complete authentication
        4. Receive callback with token
        """
        auth_url = f"{self.configuration.frontend_url}/v1/client/sign_ins/{provider.value}"
        auth_url += f"?redirect_url={self.configuration.redirect_url}"

        # In a real implementation, this would trigger the OAuth flow
        # For now, we'll raise an error indicating this needs to be handled
        raise AuthError.unknown(
            f"OAuth flow requires UI handling. Redirect to: {auth_url}"
        )
