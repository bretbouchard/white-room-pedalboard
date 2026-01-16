"""
Test configuration for the audio agent test suite.
"""

import os

from src.audio_agent.auth.clerk_auth import ClerkConfig


def get_test_clerk_config() -> ClerkConfig:
    """
    Get test Clerk configuration for tests.

    This uses test keys that should work with test Clerk instances.
    If you have real Clerk keys, set them in environment variables.
    """
    # Check if real Clerk keys are set
    publishable_key = os.environ.get("CLERK_PUBLISHABLE_KEY")
    secret_key = os.environ.get("CLERK_SECRET_KEY")

    if publishable_key and secret_key:
        # Use real keys if available
        return ClerkConfig(
            publishable_key=publishable_key,
            secret_key=secret_key,
        )

    # Fallback to test keys that should work with Clerk's test instances
    return ClerkConfig(
        publishable_key="pk_test_YOUR_TEST_PUBLISHABLE_KEY",
        secret_key="sk_test_YOUR_TEST_SECRET_KEY",
        api_url="https://api.clerk.dev",  # Use test endpoint
    )


def get_test_env_vars() -> dict[str, str]:
    """
    Get test environment variables for tests.
    """
    return {
        "CLERK_PUBLISHABLE_KEY": os.environ.get(
            "CLERK_PUBLISHABLE_KEY", "pk_test_YOUR_TEST_PUBLISHABLE_KEY"
        ),
        "CLERK_SECRET_KEY": os.environ.get(
            "CLERK_SECRET_KEY", "sk_test_YOUR_TEST_SECRET_KEY"
        ),
        "SCHILLINGER_API_URL": os.environ.get(
            "SCHILLINGER_API_URL", "https://schillinger-backend.fly.dev"
        ),
        "AUDIO_AGENT_MODE": "test",
    }
