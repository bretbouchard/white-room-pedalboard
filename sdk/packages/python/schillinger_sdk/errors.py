"""
Error types for the Schillinger SDK.

This module defines all custom exception types used throughout the SDK.
"""

from typing import Any, Dict, Optional
from typing import Any, Dict, Optional


class SchillingerError(Exception):
    """Base exception class for all Schillinger SDK errors."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        original_error: Optional[Exception] = None
    ):
        """Initialize the error.

        Args:
            message: Human-readable error message
            details: Additional error details
            original_error: The original exception that caused this error
        """
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.original_error = original_error

    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary representation."""
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "details": self.details
        }


class ValidationError(SchillingerError):
    """Raised when input validation fails."""

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Optional[Any] = None,
        **kwargs
    ):
        """Initialize validation error.

        Args:
            message: Description of validation failure
            field: Name of the field that failed validation
            value: The invalid value
            **kwargs: Additional details
        """
        details = {"field": field, "value": value, **kwargs}
        super().__init__(message, details=details)


class NetworkError(SchillingerError):
    """Raised when network operations fail."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        response_body: Optional[str] = None,
        **kwargs
    ):
        """Initialize network error.

        Args:
            message: Description of network failure
            status_code: HTTP status code
            response_body: Response body text
            **kwargs: Additional details
        """
        details = {
            "status_code": status_code,
            "response_body": response_body,
            **kwargs
        }
        super().__init__(message, details=details)


class AuthenticationError(SchillingerError):
    """Raised when authentication or authorization fails."""

    def __init__(
        self,
        message: str,
        auth_type: Optional[str] = None,
        **kwargs
    ):
        """Initialize authentication error.

        Args:
            message: Description of authentication failure
            auth_type: Type of authentication (e.g., "Bearer", "API Key")
            **kwargs: Additional details
        """
        details = {"auth_type": auth_type, **kwargs}
        super().__init__(message, details=details)


class ProcessingError(SchillingerError):
    """Raised when server-side processing fails."""

    def __init__(
        self,
        message: str,
        processing_stage: Optional[str] = None,
        **kwargs
    ):
        """Initialize processing error.

        Args:
            message: Description of processing failure
            processing_stage: Stage at which processing failed
            **kwargs: Additional details
        """
        details = {"processing_stage": processing_stage, **kwargs}
        super().__init__(message, details=details)


class ConfigurationError(SchillingerError):
    """Raised when SDK configuration is invalid."""

    def __init__(
        self,
        message: str,
        config_key: Optional[str] = None,
        **kwargs
    ):
        """Initialize configuration error.

        Args:
            message: Description of configuration issue
            config_key: Configuration key that is invalid
            **kwargs: Additional details
        """
        details = {"config_key": config_key, **kwargs}
        super().__init__(message, details=details)


class RateLimitError(SchillingerError):
    """Raised when API rate limit is exceeded."""

    def __init__(
        self,
        message: str,
        retry_after: Optional[int] = None,
        limit: Optional[int] = None,
        **kwargs
    ):
        """Initialize rate limit error.

        Args:
            message: Description of rate limit issue
            retry_after: Seconds until retry is allowed
            limit: Rate limit that was exceeded
            **kwargs: Additional details
        """
        details = {"retry_after": retry_after, "limit": limit, **kwargs}
        super().__init__(message, details=details)


class CacheError(SchillingerError):
    """Raised when cache operations fail."""

    def __init__(
        self,
        message: str,
        cache_key: Optional[str] = None,
        operation: Optional[str] = None,
        **kwargs
    ):
        """Initialize cache error.

        Args:
            message: Description of cache failure
            cache_key: Cache key involved in the error
            operation: Cache operation (get, set, delete, etc.)
            **kwargs: Additional details
        """
        details = {"cache_key": cache_key, "operation": operation, **kwargs}
        super().__init__(message, details=details)


class OfflineError(SchillingerError):
    """Raised when offline operation is requested but unavailable."""

    def __init__(
        self,
        message: str,
        operation: Optional[str] = None,
        **kwargs
    ):
        """Initialize offline error.

        Args:
            message: Description of offline mode issue
            operation: Operation that failed in offline mode
            **kwargs: Additional details
        """
        details = {"operation": operation, **kwargs}
        super().__init__(message, details=details)
