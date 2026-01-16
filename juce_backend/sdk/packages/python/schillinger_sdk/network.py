"""
Network manager for HTTP operations.

This module handles all HTTP communication with retry logic,
rate limiting, and error handling.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union
import httpx

from .errors import NetworkError, RateLimitError, ConfigurationError
from .utils import generate_request_id, retry_with_backoff

logger = logging.getLogger(__name__)


class NetworkManager:
    """Manages HTTP communication with retry logic and rate limiting."""

    def __init__(
        self,
        base_url: str,
        timeout: float = 30.0,
        max_retries: int = 3,
        retry_backoff_multiplier: float = 2.0,
        max_retry_backoff: float = 32.0,
        verify_ssl: bool = True
    ):
        """Initialize network manager.

        Args:
            base_url: Base URL for API requests
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            retry_backoff_multiplier: Multiplier for exponential backoff
            max_retry_backoff: Maximum backoff time between retries
            verify_ssl: Whether to verify SSL certificates
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_backoff_multiplier = retry_backoff_multiplier
        self.max_retry_backoff = max_retry_backoff

        # Rate limiting state
        self.rate_limit_reset: Optional[datetime] = None
        self.remaining_requests: Optional[int] = None

        # Configure HTTP client
        self._client: Optional[httpx.AsyncClient] = None
        self.verify_ssl = verify_ssl

    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.stop()

    async def start(self):
        """Start the HTTP client."""
        if self._client is None or self._client.is_closed:
            limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout),
                limits=limits,
                verify=self.verify_ssl
            )
            logger.info(f"Network manager started for {self.base_url}")

    async def stop(self):
        """Stop the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            logger.info("Network manager stopped")

    @property
    def client(self) -> httpx.AsyncClient:
        """Get the HTTP client, initializing if necessary.

        Returns:
            Active HTTP client instance

        Raises:
            ConfigurationError: If client is not initialized
        """
        if self._client is None or self._client.is_closed:
            raise ConfigurationError("HTTP client not initialized. Call start() first.")
        return self._client

    async def get(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Perform GET request.

        Args:
            endpoint: API endpoint path
            params: Query parameters
            headers: Additional headers

        Returns:
            Response data as dictionary

        Raises:
            NetworkError: If request fails after retries
            RateLimitError: If rate limit is exceeded
        """
        return await self._request("GET", endpoint, params=params, headers=headers)

    async def post(
        self,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Perform POST request.

        Args:
            endpoint: API endpoint path
            data: Form data
            json: JSON data
            headers: Additional headers

        Returns:
            Response data as dictionary

        Raises:
            NetworkError: If request fails after retries
            RateLimitError: If rate limit is exceeded
        """
        return await self._request("POST", endpoint, data=data, json=json, headers=headers)

    async def put(
        self,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Perform PUT request.

        Args:
            endpoint: API endpoint path
            data: Form data
            json: JSON data
            headers: Additional headers

        Returns:
            Response data as dictionary

        Raises:
            NetworkError: If request fails after retries
            RateLimitError: If rate limit is exceeded
        """
        return await self._request("PUT", endpoint, data=data, json=json, headers=headers)

    async def delete(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Perform DELETE request.

        Args:
            endpoint: API endpoint path
            params: Query parameters
            headers: Additional headers

        Returns:
            Response data as dictionary

        Raises:
            NetworkError: If request fails after retries
            RateLimitError: If rate limit is exceeded
        """
        return await self._request("DELETE", endpoint, params=params, headers=headers)

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Perform HTTP request with retry logic.

        Args:
            method: HTTP method
            endpoint: API endpoint path
            params: Query parameters
            data: Form data
            json: JSON data
            headers: Additional headers

        Returns:
            Response data as dictionary

        Raises:
            NetworkError: If request fails after retries
            RateLimitError: If rate limit is exceeded
        """
        # Check rate limiting
        await self._check_rate_limit()

        url = endpoint if endpoint.startswith('http') else endpoint
        request_headers = self._build_headers(headers)

        last_error = None
        backoff = 1.0

        for attempt in range(self.max_retries + 1):
            try:
                logger.debug(f"{method} {url} - Attempt {attempt + 1}/{self.max_retries + 1}")

                response = await self.client.request(
                    method=method,
                    url=url,
                    params=params,
                    data=data,
                    json=json,
                    headers=request_headers
                )

                # Update rate limit info from headers
                self._update_rate_limit_info(response.headers)

                # Handle response
                await self._handle_errors(response)

                return response.json()

            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code in (429, 503, 504):
                    # Retryable status codes
                    if attempt < self.max_retries:
                        wait_time = min(backoff, self.max_retry_backoff)
                        logger.warning(f"Retryable error {e.response.status_code}, "
                                     f"waiting {wait_time}s before retry")
                        await asyncio.sleep(wait_time)
                        backoff *= self.retry_backoff_multiplier
                        continue
                raise NetworkError(
                    f"HTTP {e.response.status_code}: {str(e)}",
                    status_code=e.response.status_code,
                    response_body=e.response.text
                )

            except httpx.TimeoutException as e:
                last_error = e
                if attempt < self.max_retries:
                    wait_time = min(backoff, self.max_retry_backoff)
                    logger.warning(f"Timeout, waiting {wait_time}s before retry")
                    await asyncio.sleep(wait_time)
                    backoff *= self.retry_backoff_multiplier
                    continue
                raise NetworkError(f"Request timeout: {str(e)}")

            except httpx.NetworkError as e:
                last_error = e
                if attempt < self.max_retries:
                    wait_time = min(backoff, self.max_retry_backoff)
                    logger.warning(f"Network error, waiting {wait_time}s before retry")
                    await asyncio.sleep(wait_time)
                    backoff *= self.retry_backoff_multiplier
                    continue
                raise NetworkError(f"Network error: {str(e)}")

            except httpx.HTTPError as e:
                raise NetworkError(f"HTTP error: {str(e)}")

        raise NetworkError(f"Request failed after {self.max_retries} retries")

    def _build_headers(self, additional_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """Build request headers.

        Args:
            additional_headers: Additional headers to include

        Returns:
            Complete headers dictionary
        """
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "schillinger-sdk-python/1.0.0",
            "X-Request-ID": generate_request_id()
        }
        if additional_headers:
            headers.update(additional_headers)
        return headers

    async def _handle_errors(self, response: httpx.Response):
        """Handle HTTP error responses.

        Args:
            response: HTTP response object

        Raises:
            NetworkError: For 4xx/5xx responses
            RateLimitError: For 429 responses
        """
        if response.status_code == 429:
            # Rate limit exceeded
            retry_after = response.headers.get('Retry-After')
            retry_after_seconds = int(retry_after) if retry_after else None

            # Update rate limit reset time
            if retry_after_seconds:
                self.rate_limit_reset = datetime.now() + timedelta(seconds=retry_after_seconds)

            raise RateLimitError(
                "Rate limit exceeded",
                retry_after=retry_after_seconds
            )

        if response.status_code >= 400:
            error_body = response.text
            try:
                error_json = response.json()
                message = error_json.get('message', error_json.get('error', error_body))
            except Exception:
                message = error_body

            raise NetworkError(
                f"HTTP {response.status_code}: {message}",
                status_code=response.status_code,
                response_body=error_body
            )

    def _update_rate_limit_info(self, headers: Dict[str, str]):
        """Update rate limit information from response headers.

        Args:
            headers: Response headers
        """
        # Check for common rate limit headers
        remaining = headers.get('X-RateLimit-Remaining') or headers.get('RateLimit-Remaining')
        reset = headers.get('X-RateLimit-Reset') or headers.get('RateLimit-Reset')

        if remaining:
            try:
                self.remaining_requests = int(remaining)
            except ValueError:
                pass

        if reset:
            try:
                # Reset could be Unix timestamp or seconds until reset
                try:
                    reset_timestamp = int(reset)
                    if reset_timestamp > 1000000000:  # Unix timestamp
                        self.rate_limit_reset = datetime.fromtimestamp(reset_timestamp)
                    else:  # Seconds until reset
                        self.rate_limit_reset = datetime.now() + timedelta(seconds=reset_timestamp)
                except ValueError:
                    pass
            except Exception:
                pass

    async def _check_rate_limit(self):
        """Check if we're rate limited and wait if necessary.

        Raises:
            RateLimitError: If rate limit is exceeded and reset time is too far
        """
        if self.rate_limit_reset and self.rate_limit_reset > datetime.now():
            wait_seconds = (self.rate_limit_reset - datetime.now()).total_seconds()

            if wait_seconds > 60:  # More than a minute
                raise RateLimitError(
                    "Rate limit exceeded",
                    retry_after=int(wait_seconds)
                )

            logger.info(f"Rate limited, waiting {wait_seconds:.1f}s")
            await asyncio.sleep(wait_seconds)
            self.rate_limit_reset = None

        elif self.remaining_requests is not None and self.remaining_requests <= 1:
            logger.warning("Approaching rate limit")
