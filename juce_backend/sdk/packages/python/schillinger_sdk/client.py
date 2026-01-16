"""
Main client class for the Schillinger SDK.

This module provides the SchillingerSDK client that integrates
all API modules and manages authentication, caching, and networking.
"""

import logging
from typing import Any, Dict, Optional
import httpx

from .auth import AuthManager
from .cache import CacheManager
from .network import NetworkManager
from .rhythm import RhythmAPI
from .harmony import HarmonyAPI
from .melody import MelodyAPI
from .composition import CompositionAPI
from .errors import (
    ConfigurationError,
    AuthenticationError,
    NetworkError,
    OfflineError
)

logger = logging.getLogger(__name__)


class SchillingerSDK:
    """Main client for the Schillinger SDK.

    This client provides access to all Schillinger System APIs including
    rhythm, harmony, melody, and composition generation and analysis.

    Examples:
        >>> # Basic usage with API key
        >>> sdk = SchillingerSDK(
        ...     base_url="https://api.schillinger.io",
        ...     api_key="your-api-key"
        ... )
        >>>
        >>> # Using async context manager
        >>> async with SchillingerSDK(...) as sdk:
        ...     resultant = await sdk.rhythm.generate_resultant(generators)
        >>>
        >>> # With caching enabled
        >>> sdk = SchillingerSDK(
        ...     base_url="https://api.schillinger.io",
        ...     api_key="your-api-key",
        ...     enable_cache=True,
        ...     cache_ttl=3600
        ... )
    """

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        token_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        enable_cache: bool = False,
        cache_ttl: int = 3600,
        cache_dir: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        verify_ssl: bool = True,
        log_level: str = "INFO"
    ):
        """Initialize the Schillinger SDK client.

        Args:
            base_url: Base URL for the API
            api_key: Static API key (simpler authentication)
            token_url: OAuth token endpoint URL
            client_id: OAuth client ID
            client_secret: OAuth client secret
            enable_cache: Enable response caching
            cache_ttl: Default cache TTL in seconds
            cache_dir: Directory for persistent cache
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            verify_ssl: Verify SSL certificates
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR)

        Raises:
            ConfigurationError: If configuration is invalid
        """
        # Validate configuration
        if not base_url:
            raise ConfigurationError("base_url is required")

        # Authentication: Either API key or OAuth
        if not api_key and not (token_url and client_id and client_secret):
            raise ConfigurationError(
                "Either api_key or OAuth credentials (token_url, client_id, client_secret) required"
            )

        # Configure logging
        self._configure_logging(log_level)

        # Initialize components
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.enable_cache = enable_cache

        # Authentication manager
        self.auth = AuthManager(
            api_key=api_key,
            token_url=token_url,
            client_id=client_id,
            client_secret=client_secret
        )

        # Network manager
        self.network = NetworkManager(
            base_url=self.base_url,
            timeout=timeout,
            max_retries=max_retries,
            verify_ssl=verify_ssl
        )

        # Cache manager
        self.cache = None
        if enable_cache:
            self.cache = CacheManager(
                enable_memory_cache=True,
                enable_persistent_cache=bool(cache_dir),
                default_ttl=cache_ttl,
                persistent_cache_dir=cache_dir
            )

        # API modules
        self.rhythm = RhythmAPI(self)
        self.harmony = HarmonyAPI(self)
        self.melody = MelodyAPI(self)
        self.composition = CompositionAPI(self)

        # State tracking
        self._initialized = False

        logger.info(f"Schillinger SDK initialized for {self.base_url}")

    def _configure_logging(self, log_level: str):
        """Configure logging for the SDK.

        Args:
            log_level: Logging level
        """
        level = getattr(logging, log_level.upper(), logging.INFO)
        logger.setLevel(level)

        # Only add handler if none exists
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)

    async def __aenter__(self):
        """Async context manager entry.

        Returns:
            The initialized SDK instance

        Examples:
            >>> async with SchillingerSDK(...) as sdk:
            ...     # Use SDK
            ...     pass
        """
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit.

        Examples:
            >>> async with SchillingerSDK(...) as sdk:
            ...     # Use SDK
            ...     pass  # Automatic cleanup on exit
        """
        await self.stop()

    async def start(self):
        """Start the SDK client.

        This initializes the network manager and performs initial authentication.

        Raises:
            NetworkError: If network initialization fails
            AuthenticationError: If authentication fails

        Examples:
            >>> sdk = SchillingerSDK(...)
            >>> await sdk.start()
            >>> # Use SDK
            >>> await sdk.stop()
        """
        if self._initialized:
            logger.warning("SDK already initialized")
            return

        try:
            # Start network manager
            await self.network.start()

            # Ensure we have valid authentication
            await self.auth.ensure_valid_token(self.network)

            self._initialized = True
            logger.info("SDK started successfully")

        except Exception as e:
            logger.error(f"Failed to start SDK: {str(e)}")
            await self.network.stop()
            raise

    async def stop(self):
        """Stop the SDK client.

        This shuts down the network manager and cleans up resources.

        Examples:
            >>> await sdk.stop()
        """
        if not self._initialized:
            return

        try:
            await self.network.stop()
            self._initialized = False
            logger.info("SDK stopped")
        except Exception as e:
            logger.error(f"Error stopping SDK: {str(e)}")

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Make an authenticated API request.

        Args:
            method: HTTP method
            endpoint: API endpoint
            params: Query parameters
            data: Form data
            json: JSON data
            headers: Additional headers
            use_cache: Whether to use cache (for GET requests)

        Returns:
            Response data as dictionary

        Raises:
            NetworkError: If request fails
            AuthenticationError: If authentication fails
            OfflineError: If offline and operation requires network
        """
        # Ensure SDK is initialized
        if not self._initialized:
            raise ConfigurationError("SDK not initialized. Call start() first")

        # Ensure valid authentication
        await self.auth.ensure_valid_token(self.network)

        # Get authentication headers
        auth_headers = self.auth.get_auth_headers()
        request_headers = {**(headers or {}), **auth_headers}

        # Check cache for GET requests
        if use_cache and self.cache and method == "GET":
            cache_key = self._build_cache_key(method, endpoint, params)
            cached_response = await self.cache.get(cache_key)
            if cached_response is not None:
                logger.debug(f"Cache hit for {endpoint}")
                return cached_response

        try:
            # Make request
            if method == "GET":
                response = await self.network.get(endpoint, params, request_headers)
            elif method == "POST":
                response = await self.network.post(endpoint, data, json, request_headers)
            elif method == "PUT":
                response = await self.network.put(endpoint, data, json, request_headers)
            elif method == "DELETE":
                response = await self.network.delete(endpoint, params, request_headers)
            else:
                raise NetworkError(f"Unsupported HTTP method: {method}")

            # Cache GET responses
            if use_cache and self.cache and method == "GET":
                cache_key = self._build_cache_key(method, endpoint, params)
                await self.cache.set(cache_key, response)

            return response

        except NetworkError as e:
            logger.error(f"Network error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Request failed: {str(e)}")
            raise NetworkError(f"Request failed: {str(e)}")

    def _build_cache_key(self, method: str, endpoint: str, params: Optional[Dict]) -> str:
        """Build a cache key for a request.

        Args:
            method: HTTP method
            endpoint: API endpoint
            params: Query parameters

        Returns:
            Cache key string
        """
        import hashlib
        import json

        key_data = {
            'method': method,
            'endpoint': endpoint,
            'params': params or {}
        }
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()

    async def clear_cache(self):
        """Clear all cached responses.

        Examples:
            >>> await sdk.clear_cache()
        """
        if self.cache:
            await self.cache.clear()
            logger.info("Cache cleared")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dictionary with cache stats

        Examples:
            >>> stats = sdk.get_cache_stats()
            >>> print(f"Memory cache hits: {stats['memory_cache']['hits']}")
        """
        if self.cache:
            return self.cache.get_stats()
        return {"message": "Caching not enabled"}

    def is_initialized(self) -> bool:
        """Check if SDK is initialized.

        Returns:
            True if initialized

        Examples:
            >>> if sdk.is_initialized():
            ...     print("SDK ready")
        """
        return self._initialized

    def is_authenticated(self) -> bool:
        """Check if SDK has valid authentication.

        Returns:
            True if authenticated

        Examples:
            >>> if sdk.is_authenticated():
            ...     print("Ready to make requests")
        """
        return self.auth.is_authenticated()

    async def health_check(self) -> Dict[str, Any]:
        """Check API health status.

        Returns:
            Dictionary with health status

        Raises:
            NetworkError: If health check fails

        Examples:
            >>> health = await sdk.health_check()
            >>> print(f"Status: {health['status']}")
        """
        try:
            response = await self.network.get("/health")
            return {
                "status": "healthy",
                "api_version": response.get("version"),
                "timestamp": response.get("timestamp")
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }

    def __repr__(self) -> str:
        """String representation of SDK client.

        Returns:
            String representation
        """
        return (
            f"SchillingerSDK(base_url={self.base_url!r}, "
            f"initialized={self._initialized}, "
            f"authenticated={self.is_authenticated()})"
        )
