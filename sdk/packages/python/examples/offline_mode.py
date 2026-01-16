"""
Offline mode example with caching.

This example demonstrates how to use the SDK's caching capabilities
to work effectively with rate limits and improve performance.
"""

import asyncio
from schillinger_sdk import SchillingerSDK


async def main():
    """Run offline mode examples."""

    # Initialize SDK with caching enabled
    async with SchillingerSDK(
        base_url="https://api.schillinger.io",
        api_key="your-api-key-here",
        enable_cache=True,
        cache_ttl=3600,  # Cache for 1 hour
        cache_dir="~/.schillinger_sdk/cache"  # Persistent cache
    ) as sdk:

        print("=== Schillinger SDK - Caching Example ===\n")

        # First request - goes to API
        print("1. Making first API request (not cached)...")
        pattern = {"strikes": [0, 3, 6], "period": 8}
        analysis1 = await sdk.rhythm.analyze_pattern(pattern)
        print(f"   Complexity: {analysis1.complexity:.2f}")
        print(f"   Classification: {analysis1.classification}\n")

        # Check cache stats
        stats = sdk.get_cache_stats()
        print("2. Cache statistics after first request:")
        print(f"   Memory cache size: {stats['memory_cache']['size']}")
        print(f"   Memory cache hits: {stats['memory_cache']['hits']}")
        print(f"   Memory cache misses: {stats['memory_cache']['misses']}")
        print(f"   Hit rate: {stats['memory_cache']['hit_rate']:.2%}\n")

        # Second request - served from cache
        print("3. Making identical request (cached)...")
        analysis2 = await sdk.rhythm.analyze_pattern(pattern)
        print(f"   Complexity: {analysis2.complexity:.2f}")
        print(f"   Classification: {analysis2.classification}\n")

        # Check updated cache stats
        stats = sdk.get_cache_stats()
        print("4. Cache statistics after second request:")
        print(f"   Memory cache size: {stats['memory_cache']['size']}")
        print(f"   Memory cache hits: {stats['memory_cache']['hits']}")
        print(f"   Memory cache misses: {stats['memory_cache']['misses']}")
        print(f"   Hit rate: {stats['memory_cache']['hit_rate']:.2%}\n")

        # Multiple different requests
        print("5. Making multiple different requests...")
        patterns = [
            {"strikes": [0, 2, 4], "period": 8},
            {"strikes": [0, 4], "period": 8},
            {"strikes": [0, 3, 6], "period": 8}  # Repeat first pattern
        ]

        for i, pattern in enumerate(patterns, 1):
            analysis = await sdk.rhythm.analyze_pattern(pattern)
            print(f"   Pattern {i}: {analysis.classification}")

        print()

        # Final cache stats
        stats = sdk.get_cache_stats()
        print("6. Final cache statistics:")
        print(f"   Memory cache size: {stats['memory_cache']['size']}")
        print(f"   Memory cache hits: {stats['memory_cache']['hits']}")
        print(f"   Memory cache misses: {stats['memory_cache']['misses']}")
        print(f"   Hit rate: {stats['memory_cache']['hit_rate']:.2%}\n")

        # Clear cache if needed
        print("7. Clearing cache...")
        await sdk.clear_cache()
        stats = sdk.get_cache_stats()
        print(f"   Cache size after clear: {stats['memory_cache']['size']}\n")

        print("=== Caching example completed ===")


if __name__ == "__main__":
    asyncio.run(main())
