"""
Cache manager for API responses.

This module provides multi-level caching with TTL support
and memory/disk persistence options.
"""

import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Optional, Set
from collections import OrderedDict
import hashlib

from .errors import CacheError
from .utils import serialize_for_cache, deserialize_from_cache

logger = logging.getLogger(__name__)


class CacheEntry:
    """A single cache entry with TTL."""

    def __init__(self, key: str, value: Any, ttl: int):
        """Initialize cache entry.

        Args:
            key: Cache key
            value: Cached value
            ttl: Time-to-live in seconds
        """
        self.key = key
        self.value = value
        self.created_at = time.time()
        self.ttl = ttl
        self.hits = 0
        self.last_accessed = self.created_at

    def is_expired(self) -> bool:
        """Check if entry has expired.

        Returns:
            True if entry is expired
        """
        return time.time() > (self.created_at + self.ttl)

    def touch(self):
        """Update last accessed time and increment hit counter."""
        self.last_accessed = time.time()
        self.hits += 1

    def age_seconds(self) -> float:
        """Get age of entry in seconds.

        Returns:
            Age in seconds
        """
        return time.time() - self.created_at


class MemoryCache:
    """In-memory LRU cache with TTL support."""

    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        """Initialize memory cache.

        Args:
            max_size: Maximum number of entries
            default_ttl: Default TTL in seconds
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = None
        self._hits = 0
        self._misses = 0

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        entry = self._cache.get(key)

        if entry is None:
            self._misses += 1
            return None

        if entry.is_expired():
            # Remove expired entry
            del self._cache[key]
            self._misses += 1
            logger.debug(f"Cache entry expired: {key}")
            return None

        # Move to end (most recently used)
        entry.touch()
        self._cache.move_to_end(key)
        self._hits += 1

        logger.debug(f"Cache hit: {key}")
        return entry.value

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Custom TTL in seconds (uses default if not specified)

        Returns:
            True if value was cached
        """
        ttl = ttl if ttl is not None else self.default_ttl

        # Check if key already exists
        if key in self._cache:
            del self._cache[key]

        # Evict oldest entry if at capacity
        elif len(self._cache) >= self.max_size:
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]
            logger.debug(f"Evicted from cache: {oldest_key}")

        # Add new entry
        entry = CacheEntry(key, value, ttl)
        self._cache[key] = entry
        logger.debug(f"Cached: {key} (TTL: {ttl}s)")
        return True

    async def delete(self, key: str) -> bool:
        """Delete value from cache.

        Args:
            key: Cache key

        Returns:
            True if value was deleted
        """
        if key in self._cache:
            del self._cache[key]
            logger.debug(f"Deleted from cache: {key}")
            return True
        return False

    async def clear(self):
        """Clear all cache entries."""
        self._cache.clear()
        self._hits = 0
        self._misses = 0
        logger.debug("Cache cleared")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dictionary with cache stats
        """
        total_requests = self._hits + self._misses
        hit_rate = self._hits / total_requests if total_requests > 0 else 0

        return {
            'size': len(self._cache),
            'max_size': self.max_size,
            'hits': self._hits,
            'misses': self._misses,
            'hit_rate': hit_rate,
            'default_ttl': self.default_ttl
        }


class PersistentCache:
    """Disk-based cache with TTL support."""

    def __init__(
        self,
        cache_dir: str,
        default_ttl: int = 86400,  # 24 hours
        max_size_bytes: int = 100 * 1024 * 1024  # 100MB
    ):
        """Initialize persistent cache.

        Args:
            cache_dir: Directory for cache files
            default_ttl: Default TTL in seconds
            max_size_bytes: Maximum cache size in bytes
        """
        self.cache_dir = Path(cache_dir)
        self.default_ttl = default_ttl
        self.max_size_bytes = max_size_bytes

        # Create cache directory
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Index file for metadata
        self.index_file = self.cache_dir / "cache_index.json"
        self._index: Dict[str, Dict[str, Any]] = {}
        self._load_index()

    def _get_cache_path(self, key: str) -> Path:
        """Get file path for cache key.

        Args:
            key: Cache key

        Returns:
            Path to cache file
        """
        # Use hash of key as filename
        key_hash = hashlib.md5(key.encode()).hexdigest()
        return self.cache_dir / f"{key_hash}.json"

    def _load_index(self):
        """Load cache index from disk."""
        if self.index_file.exists():
            try:
                with open(self.index_file, 'r') as f:
                    self._index = json.load(f)
                logger.debug(f"Loaded cache index with {len(self._index)} entries")
            except Exception as e:
                logger.warning(f"Failed to load cache index: {str(e)}")
                self._index = {}
        else:
            self._index = {}

    def _save_index(self):
        """Save cache index to disk."""
        try:
            with open(self.index_file, 'w') as f:
                json.dump(self._index, f)
        except Exception as e:
            logger.warning(f"Failed to save cache index: {str(e)}")

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        if key not in self._index:
            return None

        entry = self._index[key]
        created_at = entry.get('created_at', 0)
        ttl = entry.get('ttl', self.default_ttl)

        # Check if expired
        if time.time() > (created_at + ttl):
            await self.delete(key)
            return None

        # Load value from file
        cache_path = self._get_cache_path(key)
        if not cache_path.exists():
            # File missing, remove from index
            del self._index[key]
            self._save_index()
            return None

        try:
            with open(cache_path, 'r') as f:
                value = deserialize_from_cache(f.read())

            # Update access time
            entry['last_accessed'] = time.time()
            entry['hits'] = entry.get('hits', 0) + 1
            self._save_index()

            logger.debug(f"Persistent cache hit: {key}")
            return value

        except Exception as e:
            logger.error(f"Failed to read cache file: {str(e)}")
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Custom TTL in seconds (uses default if not specified)

        Returns:
            True if value was cached
        """
        ttl = ttl if ttl is not None else self.default_ttl

        try:
            # Serialize value
            serialized = serialize_for_cache(value)

            # Write to file
            cache_path = self._get_cache_path(key)
            with open(cache_path, 'w') as f:
                f.write(serialized)

            # Update index
            now = time.time()
            self._index[key] = {
                'created_at': now,
                'ttl': ttl,
                'last_accessed': now,
                'hits': 0,
                'size': len(serialized)
            }

            self._save_index()
            self._check_size_limit()

            logger.debug(f"Persisted to cache: {key} (TTL: {ttl}s)")
            return True

        except Exception as e:
            logger.error(f"Failed to write cache file: {str(e)}")
            raise CacheError(f"Failed to persist cache entry: {str(e)}")

    async def delete(self, key: str) -> bool:
        """Delete value from cache.

        Args:
            key: Cache key

        Returns:
            True if value was deleted
        """
        if key not in self._index:
            return False

        try:
            # Delete file
            cache_path = self._get_cache_path(key)
            if cache_path.exists():
                cache_path.unlink()

            # Remove from index
            del self._index[key]
            self._save_index()

            logger.debug(f"Deleted from persistent cache: {key}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete cache file: {str(e)}")
            return False

    async def clear(self):
        """Clear all cache entries."""
        # Delete all cache files
        for key in list(self._index.keys()):
            cache_path = self._get_cache_path(key)
            try:
                if cache_path.exists():
                    cache_path.unlink()
            except Exception as e:
                logger.warning(f"Failed to delete cache file {cache_path}: {str(e)}")

        # Clear index
        self._index = {}
        self._save_index()

        logger.debug("Persistent cache cleared")

    def _check_size_limit(self):
        """Check cache size and evict if necessary."""
        total_size = sum(entry.get('size', 0) for entry in self._index.values())

        if total_size > self.max_size_bytes:
            # Sort by last accessed time
            sorted_keys = sorted(
                self._index.keys(),
                key=lambda k: self._index[k].get('last_accessed', 0)
            )

            # Evict oldest entries until under limit
            for key in sorted_keys:
                if total_size <= self.max_size_bytes * 0.8:  # Target 80% of max
                    break

                entry = self._index[key]
                total_size -= entry.get('size', 0)

                cache_path = self._get_cache_path(key)
                try:
                    if cache_path.exists():
                        cache_path.unlink()
                except Exception:
                    pass

                del self._index[key]

            self._save_index()
            logger.debug(f"Evicted entries to meet size limit")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dictionary with cache stats
        """
        total_size = sum(entry.get('size', 0) for entry in self._index.values())

        return {
            'size': len(self._index),
            'total_size_bytes': total_size,
            'max_size_bytes': self.max_size_bytes,
            'usage_percent': (total_size / self.max_size_bytes * 100) if self.max_size_bytes > 0 else 0,
            'default_ttl': self.default_ttl,
            'cache_dir': str(self.cache_dir)
        }


class CacheManager:
    """Multi-level cache manager combining memory and persistent caches."""

    def __init__(
        self,
        enable_memory_cache: bool = True,
        enable_persistent_cache: bool = False,
        memory_cache_size: int = 1000,
        persistent_cache_dir: Optional[str] = None,
        default_ttl: int = 3600
    ):
        """Initialize cache manager.

        Args:
            enable_memory_cache: Enable in-memory L1 cache
            enable_persistent_cache: Enable disk-based L2 cache
            memory_cache_size: Max entries in memory cache
            persistent_cache_dir: Directory for persistent cache
            default_ttl: Default TTL in seconds
        """
        self.enable_memory_cache = enable_memory_cache
        self.enable_persistent_cache = enable_persistent_cache

        self.memory_cache = MemoryCache(
            max_size=memory_cache_size,
            default_ttl=default_ttl
        ) if enable_memory_cache else None

        self.persistent_cache = PersistentCache(
            cache_dir=persistent_cache_dir or "~/.schillinger_sdk/cache",
            default_ttl=default_ttl * 24  # Longer TTL for disk cache
        ) if enable_persistent_cache else None

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache (checks L1 then L2).

        Args:
            key: Cache key

        Returns:
            Cached value or None
        """
        # Try L1 (memory) cache first
        if self.memory_cache:
            value = await self.memory_cache.get(key)
            if value is not None:
                return value

        # Try L2 (persistent) cache
        if self.persistent_cache:
            value = await self.persistent_cache.get(key)
            if value is not None:
                # Populate L1 cache for faster next access
                if self.memory_cache:
                    await self.memory_cache.set(key, value)
                return value

        return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache (stores in both L1 and L2).

        Args:
            key: Cache key
            value: Value to cache
            ttl: Custom TTL in seconds

        Returns:
            True if value was cached
        """
        success = True

        # Store in L1
        if self.memory_cache:
            success &= await self.memory_cache.set(key, value, ttl)

        # Store in L2
        if self.persistent_cache:
            success &= await self.persistent_cache.set(key, value, ttl)

        return success

    async def delete(self, key: str) -> bool:
        """Delete value from all cache levels.

        Args:
            key: Cache key

        Returns:
            True if value was deleted from any level
        """
        success = False

        if self.memory_cache:
            success |= await self.memory_cache.delete(key)

        if self.persistent_cache:
            success |= await self.persistent_cache.delete(key)

        return success

    async def clear(self):
        """Clear all cache levels."""
        if self.memory_cache:
            await self.memory_cache.clear()

        if self.persistent_cache:
            await self.persistent_cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Get statistics from all cache levels.

        Returns:
            Dictionary with cache stats
        """
        stats = {
            'memory_cache_enabled': self.enable_memory_cache,
            'persistent_cache_enabled': self.enable_persistent_cache
        }

        if self.memory_cache:
            stats['memory_cache'] = self.memory_cache.get_stats()

        if self.persistent_cache:
            stats['persistent_cache'] = self.persistent_cache.get_stats()

        return stats
