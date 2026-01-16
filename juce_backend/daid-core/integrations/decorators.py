"""Decorators for automatic DAID provenance tracking."""

import functools
import inspect
import time
from collections.abc import Callable
from datetime import datetime
from typing import Any

from ..python.daid_core import DAIDClient, ProvenanceRecord

# Global client instance for decorators
_global_client: DAIDClient | None = None


def initialize_global_client(
    agent_id: str, base_url: str | None = None, api_key: str | None = None, **kwargs
) -> DAIDClient:
    """Initialize the global DAID client for decorators."""
    global _global_client
    _global_client = DAIDClient(
        agent_id=agent_id, base_url=base_url, api_key=api_key, **kwargs
    )
    return _global_client


def get_global_client() -> DAIDClient | None:
    """Get the global DAID client."""
    return _global_client


def track_provenance(
    entity_type: str,
    operation: str = "execute",
    entity_id_extractor: Callable[..., str] | None = None,
    metadata_extractor: Callable[..., dict[str, Any]] | None = None,
    parent_daids_extractor: Callable[..., list[str]] | None = None,
    user_id_extractor: Callable[..., str] | None = None,
    tags: list[str] | None = None,
    batch: bool = True,
    track_errors: bool = True,
    client: DAIDClient | None = None,
):
    """
    Decorator to automatically track provenance for function calls.

    Args:
        entity_type: Type of entity being operated on
        operation: Operation being performed
        entity_id_extractor: Function to extract entity ID from args/kwargs
        metadata_extractor: Function to extract metadata from args/kwargs/result
        parent_daids_extractor: Function to extract parent DAIDs from args/kwargs
        user_id_extractor: Function to extract user ID from args/kwargs
        tags: Static tags to add to the record
        batch: Whether to batch the record
        track_errors: Whether to track failed operations
        client: DAID client to use (defaults to global client)
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # For sync functions, we can't do async tracking
            # Just execute the function normally
            return func(*args, **kwargs)

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            daid_client = client or _global_client
            if not daid_client:
                # No client available, just execute function
                return await func(*args, **kwargs)

            start_time = time.time()
            error = None
            result = None

            try:
                # Execute the function
                result = await func(*args, **kwargs)
                return result

            except Exception as e:
                error = e
                if not track_errors:
                    raise
                result = None
                raise

            finally:
                # Track the operation
                try:
                    await _track_function_call(
                        func=func,
                        args=args,
                        kwargs=kwargs,
                        result=result,
                        error=error,
                        start_time=start_time,
                        entity_type=entity_type,
                        operation=operation,
                        entity_id_extractor=entity_id_extractor,
                        metadata_extractor=metadata_extractor,
                        parent_daids_extractor=parent_daids_extractor,
                        user_id_extractor=user_id_extractor,
                        tags=tags or [],
                        batch=batch,
                        client=daid_client,
                    )
                except Exception as tracking_error:
                    # Don't let tracking errors break the main function
                    print(f"DAID tracking failed for {func.__name__}: {tracking_error}")

        # Return appropriate wrapper based on function type
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


def track_async_provenance(entity_type: str, operation: str = "execute", **kwargs):
    """
    Decorator specifically for async functions with DAID tracking.
    Same as track_provenance but only works with async functions.
    """

    def decorator(func: Callable) -> Callable:
        if not inspect.iscoroutinefunction(func):
            raise ValueError(
                "track_async_provenance can only be used with async functions"
            )

        return track_provenance(entity_type=entity_type, operation=operation, **kwargs)(
            func
        )

    return decorator


async def _track_function_call(
    func: Callable,
    args: tuple,
    kwargs: dict,
    result: Any,
    error: Exception | None,
    start_time: float,
    entity_type: str,
    operation: str,
    entity_id_extractor: Callable | None,
    metadata_extractor: Callable | None,
    parent_daids_extractor: Callable | None,
    user_id_extractor: Callable | None,
    tags: list[str],
    batch: bool,
    client: DAIDClient,
):
    """Track a function call with DAID provenance."""

    # Extract entity ID
    entity_id = func.__name__  # Default to function name
    if entity_id_extractor:
        try:
            extracted_id = entity_id_extractor(*args, **kwargs)
            if extracted_id:
                entity_id = str(extracted_id)
        except Exception as e:
            print(f"Entity ID extraction failed: {e}")

    # Extract metadata
    execution_time = time.time() - start_time
    metadata = {
        "function_name": func.__name__,
        "module": func.__module__,
        "execution_time_ms": execution_time * 1000,
        "success": error is None,
        "timestamp": datetime.utcnow().isoformat(),
    }

    if error:
        metadata.update(
            {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "operation_status": "failed",
            }
        )
    else:
        metadata["operation_status"] = "success"

    # Add custom metadata
    if metadata_extractor:
        try:
            custom_metadata = metadata_extractor(
                *args, result=result, error=error, **kwargs
            )
            if custom_metadata:
                metadata.update(custom_metadata)
        except Exception as e:
            print(f"Metadata extraction failed: {e}")

    # Extract parent DAIDs
    parent_daids = []
    if parent_daids_extractor:
        try:
            extracted_parents = parent_daids_extractor(*args, **kwargs)
            if extracted_parents:
                parent_daids = extracted_parents
        except Exception as e:
            print(f"Parent DAIDs extraction failed: {e}")

    # Extract user ID
    if user_id_extractor:
        try:
            user_id_extractor(*args, **kwargs)
        except Exception as e:
            print(f"User ID extraction failed: {e}")

    # Add function-specific tags
    function_tags = tags + [
        "function_call",
        f"module_{func.__module__.replace('.', '_')}",
        f"function_{func.__name__}",
    ]

    if error:
        function_tags.append("error")
        function_tags.append(f"error_{type(error).__name__.lower()}")
    else:
        function_tags.append("success")

    # Create and track the record
    record = ProvenanceRecord(
        entity_type=entity_type,
        entity_id=entity_id,
        operation=operation,
        metadata=metadata,
        parent_daids=parent_daids,
        agent_id=client.agent_id,
    )

    await client.create_provenance_record(record)


# Convenience decorators for common patterns
def track_api_endpoint(entity_type: str = "api_call", operation: str = "request"):
    """Decorator for tracking API endpoints."""
    return track_provenance(
        entity_type=entity_type,
        operation=operation,
        entity_id_extractor=lambda *args, **kwargs: f"{operation}_{entity_type}",
        metadata_extractor=lambda *args, **kwargs: {
            "endpoint": kwargs.get("request", {}).get("url", {}).get("path", "unknown"),
            "method": kwargs.get("request", {}).get("method", "unknown"),
        },
        tags=["api_endpoint"],
    )


def track_data_processing(entity_type: str = "data", operation: str = "process"):
    """Decorator for tracking data processing operations."""
    return track_provenance(
        entity_type=entity_type,
        operation=operation,
        entity_id_extractor=lambda data, *args, **kwargs: getattr(
            data, "id", str(hash(str(data)))
        ),
        metadata_extractor=lambda data, *args, result=None, **kwargs: {
            "input_size": len(str(data)) if data else 0,
            "output_size": len(str(result)) if result else 0,
            "processing_type": operation,
        },
        tags=["data_processing"],
    )


def track_ai_operation(entity_type: str = "ai_operation", operation: str = "inference"):
    """Decorator for tracking AI/ML operations."""
    return track_provenance(
        entity_type=entity_type,
        operation=operation,
        metadata_extractor=lambda *args, result=None, **kwargs: {
            "model_name": kwargs.get("model_name", "unknown"),
            "confidence": getattr(result, "confidence", None) if result else None,
            "ai_operation": True,
        },
        tags=["ai_operation", "ml_inference"],
    )
