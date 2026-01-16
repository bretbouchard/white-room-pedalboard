"""
Utility functions for the Schillinger SDK.

This module provides helper functions for data validation, transformation,
and common operations.
"""

import base64
import hashlib
import json
import time
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
from functools import wraps


def generate_request_id() -> str:
    """Generate a unique request identifier.

    Returns:
        Unique ID string based on timestamp and random data
    """
    timestamp = str(time.time()).encode()
    random_data = str(hash(timestamp)).encode()
    return base64.urlsafe_b64encode(hashlib.sha256(timestamp + random_data).digest()).decode()[:16]


def sanitize_input(data: Any) -> Any:
    """Sanitize user input to prevent injection attacks.

    Args:
        data: Input data to sanitize

    Returns:
        Sanitized data
    """
    if isinstance(data, str):
        # Remove null bytes and control characters
        return ''.join(char for char in data if ord(char) >= 32 or char in '\t\n\r')
    elif isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    return data


def validate_pitch_class(value: int) -> bool:
    """Validate that a value is a valid pitch class (0-11).

    Args:
        value: Pitch class value to validate

    Returns:
        True if valid pitch class
    """
    return 0 <= value <= 11


def validate_interval(interval: int) -> bool:
    """Validate that a value is a valid interval.

    Args:
        interval: Interval value to validate (in semitones)

    Returns:
        True if valid interval
    """
    return -24 <= interval <= 24  # Allow two octaves in either direction


def normalize_contour(contour: List[int]) -> List[int]:
    """Normalize a melodic contour to -1, 0, 1 values.

    Args:
        contour: List of interval values

    Returns:
        Normalized contour with -1 (down), 0 (unison), 1 (up)
    """
    normalized = []
    for interval in contour:
        if interval > 0:
            normalized.append(1)
        elif interval < 0:
            normalized.append(-1)
        else:
            normalized.append(0)
    return normalized


def calculate_density(strikes: List[int], period: int) -> float:
    """Calculate the density of a rhythmic pattern.

    Args:
        strikes: List of strike positions
        period: Period length in beats

    Returns:
        Density value between 0 and 1
    """
    if period == 0:
        return 0.0
    return len(strikes) / period


def calculate_symmetry(strikes: List[int], period: int) -> float:
    """Calculate the symmetry of a rhythmic pattern.

    Args:
        strikes: List of strike positions
        period: Period length in beats

    Returns:
        Symmetry score between 0 and 1
    """
    if period == 0 or len(strikes) == 0:
        return 0.0

    reflected = [(period - pos) % period for pos in strikes]
    matches = sum(1 for s in strikes if s in reflected)
    return matches / len(strikes)


def intervals_to_contour(pitches: List[int]) -> List[int]:
    """Convert a sequence of pitches to interval contour.

    Args:
        pitches: List of pitch values

    Returns:
        List of intervals between consecutive pitches
    """
    if len(pitches) < 2:
        return []
    return [pitches[i+1] - pitches[i] for i in range(len(pitches) - 1)]


def contour_to_pitches(start_pitch: int, contour: List[int]) -> List[int]:
    """Convert an interval contour to a sequence of pitches.

    Args:
        start_pitch: Starting pitch
        contour: List of intervals

    Returns:
        List of pitches
    """
    pitches = [start_pitch]
    for interval in contour:
        pitches.append(pitches[-1] + interval)
    return pitches


def serialize_for_cache(data: Any) -> str:
    """Serialize data for cache storage.

    Args:
        data: Data to serialize

    Returns:
        JSON string
    """
    def datetime_handler(obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    return json.dumps(data, default=datetime_handler)


def deserialize_from_cache(data: str) -> Any:
    """Deserialize data from cache storage.

    Args:
        data: JSON string to deserialize

    Returns:
        Deserialized data
    """
    return json.loads(data)


def calculate_hash(data: Any) -> str:
    """Calculate a hash of data for cache keys.

    Args:
        data: Data to hash

    Returns:
        Hex digest of hash
    """
    json_str = json.dumps(data, sort_keys=True)
    return hashlib.md5(json_str.encode()).hexdigest()


def retry_with_backoff(
    max_retries: int = 3,
    initial_backoff: float = 1.0,
    max_backoff: float = 32.0,
    backoff_multiplier: float = 2.0
):
    """Decorator for retrying operations with exponential backoff.

    Args:
        max_retries: Maximum number of retry attempts
        initial_backoff: Initial backoff time in seconds
        max_backoff: Maximum backoff time in seconds
        backoff_multiplier: Multiplier for backoff time

    Returns:
        Decorated function
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            from .errors import NetworkError
            import asyncio

            last_error = None
            current_backoff = initial_backoff

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except NetworkError as e:
                    last_error = e
                    if attempt < max_retries:
                        await asyncio.sleep(min(current_backoff, max_backoff))
                        current_backoff *= backoff_multiplier
                    else:
                        raise
                except Exception as e:
                    # Don't retry on non-network errors
                    raise e

            raise last_error
        return wrapper
    return decorator


def parse_time_signature(time_sig: str) -> tuple[int, int]:
    """Parse a time signature string.

    Args:
        time_sig: Time signature string (e.g., "4/4", "3/4", "6/8")

    Returns:
        Tuple of (numerator, denominator)

    Raises:
        ValueError: If time signature is invalid
    """
    parts = time_sig.split('/')
    if len(parts) != 2:
        raise ValueError(f"Invalid time signature: {time_sig}")

    try:
        numerator = int(parts[0])
        denominator = int(parts[1])
        if numerator <= 0 or denominator <= 0:
            raise ValueError("Time signature parts must be positive")
        return numerator, denominator
    except ValueError:
        raise ValueError(f"Invalid time signature: {time_sig}")


def format_timestamp(dt: Optional[datetime]) -> Optional[str]:
    """Format a datetime object to ISO format.

    Args:
        dt: Datetime object or None

    Returns:
        ISO formatted string or None
    """
    return dt.isoformat() if dt else None


def parse_timestamp(timestamp_str: Optional[str]) -> Optional[datetime]:
    """Parse an ISO formatted timestamp string.

    Args:
        timestamp_str: ISO formatted string or None

    Returns:
        Datetime object or None
    """
    if not timestamp_str:
        return None
    return datetime.fromisoformat(timestamp_str)


def deep_merge_dicts(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Deep merge two dictionaries.

    Args:
        base: Base dictionary
        override: Dictionary to override base values

    Returns:
        Merged dictionary
    """
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge_dicts(result[key], value)
        else:
            result[key] = value
    return result


def chunk_list(items: List[Any], chunk_size: int) -> List[List[Any]]:
    """Split a list into chunks.

    Args:
        items: List to chunk
        chunk_size: Size of each chunk

    Returns:
        List of chunks
    """
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


def flatten_list(nested_list: List[List[Any]]) -> List[Any]:
    """Flatten a nested list.

    Args:
        nested_list: List of lists to flatten

    Returns:
        Flattened list
    """
    return [item for sublist in nested_list for item in sublist]


def clamp(value: float, min_value: float, max_value: float) -> float:
    """Clamp a value between min and max.

    Args:
        value: Value to clamp
        min_value: Minimum value
        max_value: Maximum value

    Returns:
        Clamped value
    """
    return max(min_value, min(value, max_value))


def lerp(a: float, b: float, t: float) -> float:
    """Linear interpolation between two values.

    Args:
        a: Start value
        b: End value
        t: Interpolation factor (0-1)

    Returns:
        Interpolated value
    """
    return a + (b - a) * t


def map_range(
    value: float,
    in_min: float,
    in_max: float,
    out_min: float,
    out_max: float
) -> float:
    """Map a value from one range to another.

    Args:
        value: Value to map
        in_min: Input range minimum
        in_max: Input range maximum
        out_min: Output range minimum
        out_max: Output range maximum

    Returns:
        Mapped value
    """
    return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
