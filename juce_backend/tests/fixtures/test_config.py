"""Test configuration for Clerk authentication."""

import os
from unittest.mock import patch

from src.audio_agent.auth.clerk_auth import ClerkConfig

from .mock_clerk import MockClerkAuthenticator


class TestClerkConfig:
    """Test configuration for Clerk authentication."""

    @staticmethod
    def get_test_config():
        """Get a test Clerk configuration."""
        return ClerkConfig(
            publishable_key="pk_test_key",
            secret_key="sk_test_key",
            api_url="https://api.test.clerk.com/v1",
            jwt_algorithm="RS256",
            jwt_audience=None,
            jwt_issuer=None,
            session_timeout_minutes=60,
            schillinger_backend_url="https://test-schillinger.fly.dev",
        )

    @staticmethod
    def patch_env():
        """Patch environment variables for testing."""
        test_env = {
            "CLERK_PUBLISHABLE_KEY": "pk_test_key",
            "CLERK_SECRET_KEY": "sk_test_key",
            "SCHILLINGER_API_URL": "https://test-schillinger.fly.dev",
        }

        with patch.dict(os.environ, test_env):
            yield

    @staticmethod
    def get_mock_authenticator():
        """Get a mock Clerk authenticator."""
        config = TestClerkConfig.get_test_config()
        return MockClerkAuthenticator(config)
