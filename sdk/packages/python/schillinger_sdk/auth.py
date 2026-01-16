"""
Authentication and token management.

This module handles authentication tokens, refresh logic,
and authorization headers.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional

from .errors import AuthenticationError, ConfigurationError
from .network import NetworkManager

logger = logging.getLogger(__name__)


class AuthManager:
    """Manages authentication tokens and refresh logic."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        token_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        token_cache_path: Optional[str] = None
    ):
        """Initialize authentication manager.

        Args:
            api_key: Static API key (simpler auth method)
            token_url: OAuth token endpoint URL
            client_id: OAuth client ID
            client_secret: OAuth client secret
            token_cache_path: Path to cache token data on disk
        """
        self.api_key = api_key
        self.token_url = token_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_cache_path = Path(token_cache_path) if token_cache_path else None

        # Token state
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None

        # Refresh lock to prevent concurrent refreshes
        self._refresh_lock = asyncio.Lock()

        # Load cached token if available
        if self.token_cache_path and self.token_cache_path.exists():
            self._load_token_from_cache()

    def get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers for API requests.

        Returns:
            Dictionary with Authorization header

        Raises:
            AuthenticationError: If no authentication method is configured
        """
        if self.api_key:
            return {"Authorization": f"Bearer {self.api_key}"}

        if self.access_token:
            return {"Authorization": f"Bearer {self.access_token}"}

        raise AuthenticationError("No authentication credentials available")

    async def ensure_valid_token(self, network_manager: Optional[NetworkManager] = None):
        """Ensure we have a valid access token, refreshing if necessary.

        Args:
            network_manager: Network manager for making refresh requests

        Raises:
            AuthenticationError: If token refresh fails
            ConfigurationError: If auth is not properly configured
        """
        if self.api_key:
            # Static API key doesn't need refresh
            return

        # Check if token is still valid
        if self.access_token and self.token_expires_at:
            # Add 5 minute buffer before expiration
            if datetime.now() + timedelta(minutes=5) < self.token_expires_at:
                return

        # Token needs refresh
        await self._refresh_token(network_manager)

    async def _refresh_token(self, network_manager: Optional[NetworkManager] = None):
        """Refresh the access token.

        Args:
            network_manager: Network manager for making refresh requests

        Raises:
            AuthenticationError: If token refresh fails
        """
        async with self._refresh_lock:
            # Double-check after acquiring lock
            if self.access_token and self.token_expires_at:
                if datetime.now() + timedelta(minutes=5) < self.token_expires_at:
                    return

            if not self.token_url or not self.client_id or not self.client_secret:
                raise ConfigurationError("OAuth credentials not configured")

            logger.info("Refreshing access token")

            try:
                if network_manager:
                    await self._refresh_with_client_credentials(network_manager)
                else:
                    # Fallback to built-in HTTP client
                    await self._refresh_with_http_client()

                self._save_token_to_cache()
                logger.info("Token refreshed successfully")

            except Exception as e:
                logger.error(f"Token refresh failed: {str(e)}")
                raise AuthenticationError(f"Failed to refresh token: {str(e)}")

    async def _refresh_with_client_credentials(self, network_manager: NetworkManager):
        """Refresh token using OAuth client credentials flow.

        Args:
            network_manager: Network manager for making requests

        Raises:
            AuthenticationError: If refresh fails
        """
        response = await network_manager.post(
            self.token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        self._parse_token_response(response)

    async def _refresh_with_http_client(self):
        """Refresh token using built-in HTTP client.

        Raises:
            AuthenticationError: If refresh fails
        """
        import httpx

        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()
            self._parse_token_response(response.json())

    def _parse_token_response(self, response: Dict):
        """Parse token response from OAuth server.

        Args:
            response: Token response data

        Raises:
            AuthenticationError: If response is invalid
        """
        self.access_token = response.get('access_token')
        if not self.access_token:
            raise AuthenticationError("No access token in response")

        # Parse expiration time
        expires_in = response.get('expires_in')
        if expires_in:
            try:
                expires_seconds = int(expires_in)
                self.token_expires_at = datetime.now() + timedelta(seconds=expires_seconds)
            except ValueError:
                self.token_expires_at = None
        else:
            self.token_expires_at = None

        # Store refresh token if provided
        self.refresh_token = response.get('refresh_token')

    def _load_token_from_cache(self):
        """Load token from cache file.

        Returns:
            True if token was loaded successfully
        """
        if not self.token_cache_path or not self.token_cache_path.exists():
            return False

        try:
            with open(self.token_cache_path, 'r') as f:
                data = json.load(f)

            self.access_token = data.get('access_token')
            self.refresh_token = data.get('refresh_token')

            # Parse expiration time
            expires_at_str = data.get('token_expires_at')
            if expires_at_str:
                try:
                    self.token_expires_at = datetime.fromisoformat(expires_at_str)
                except ValueError:
                    self.token_expires_at = None
            else:
                self.token_expires_at = None

            logger.debug("Token loaded from cache")
            return True

        except Exception as e:
            logger.warning(f"Failed to load token from cache: {str(e)}")
            return False

    def _save_token_to_cache(self):
        """Save token to cache file.

        Returns:
            True if token was saved successfully
        """
        if not self.token_cache_path:
            return False

        try:
            # Create parent directories if needed
            self.token_cache_path.parent.mkdir(parents=True, exist_ok=True)

            data = {
                'access_token': self.access_token,
                'refresh_token': self.refresh_token,
                'token_expires_at': self.token_expires_at.isoformat() if self.token_expires_at else None
            }

            with open(self.token_cache_path, 'w') as f:
                json.dump(data, f)

            logger.debug("Token saved to cache")
            return True

        except Exception as e:
            logger.warning(f"Failed to save token to cache: {str(e)}")
            return False

    def clear_cached_token(self):
        """Clear cached token data."""
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None

        if self.token_cache_path and self.token_cache_path.exists():
            try:
                self.token_cache_path.unlink()
                logger.debug("Cached token cleared")
            except Exception as e:
                logger.warning(f"Failed to clear cached token: {str(e)}")

    def is_authenticated(self) -> bool:
        """Check if valid authentication credentials are available.

        Returns:
            True if authenticated
        """
        if self.api_key:
            return True

        if self.access_token:
            if self.token_expires_at:
                return datetime.now() + timedelta(minutes=5) < self.token_expires_at
            return True

        return False
