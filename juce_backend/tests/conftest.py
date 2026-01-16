import warnings

# Silence deprecation warnings from third-party audioread on CPython 3.11+ where
# stdlib modules like aifc/audioop/sunau are flagged as deprecated.
warnings.filterwarnings(
    "ignore",
    category=DeprecationWarning,
    message=r".*aifc|audioop|sunau.*",
    module=r"audioread.rawread",
)
"""
Shared test fixtures and configuration for the audio agent test suite.
"""
import os
import sys

# Ensure the project's `src/` directory is on sys.path so imports like
# `audio_agent.*` resolve when tests are run from the repository root without
# installing the package into the virtualenv.
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_PATH = os.path.join(ROOT, "src")
if SRC_PATH not in sys.path:
    sys.path.insert(0, SRC_PATH)

from unittest.mock import AsyncMock, Mock, patch

import pytest
from audio_agent.ai.unified_orchestrator import UnifiedAIOrchestrator
from audio_agent.auth.clerk_auth import ClerkAuthenticator, ClerkConfig

# Backwards-compatibility test alias:
# Many tests import or patch DawDreamerEngine (the legacy in-process engine).
# During the migration to EngineClient/EngineClientStub we provide a test-time
# alias so existing tests continue to work without immediate edits.
try:
    from src.audio_agent.engine.client import EngineClientStub  # type: ignore

    # Expose the legacy name used across the test-suite so patch.object and
    # direct construction continue to work during migration.
    DawDreamerEngine = EngineClientStub  # type: ignore
except ImportError:
    # If the engine client isn't importable in a constrained test bootstrap,
    # leave the legacy name undefined so tests that need it will import
    # the real implementation explicitly and fail fast.
    pass


@pytest.fixture
async def orchestrator():
    """
    Create a UnifiedAIOrchestrator instance with proper cleanup.

    This fixture ensures that the orchestrator is properly stopped
    after each test to prevent async task leakage.
    """
    orchestrator = UnifiedAIOrchestrator()
    yield orchestrator

    # Ensure proper cleanup
    if orchestrator._is_running:
        await orchestrator.stop()


@pytest.fixture
async def started_orchestrator():
    """
    Create and start a UnifiedAIOrchestrator instance with proper cleanup.

    This fixture starts the orchestrator and ensures it's properly stopped
    after each test to prevent async task leakage.
    """
    orchestrator = UnifiedAIOrchestrator()
    await orchestrator.start()
    yield orchestrator

    # Ensure proper cleanup
    if orchestrator._is_running:
        await orchestrator.stop()


# Async test configuration


@pytest.fixture(autouse=True)
def mock_clerk_api_calls():
    """
    Mock all Clerk API calls to avoid hitting real endpoints during tests.

    This fixture automatically applies to all tests to prevent real API calls
    to Clerk's servers using invalid test keys.
    """
    # Mock the HTTP client used by ClerkAuthenticator
    with patch("httpx.AsyncClient") as mock_http_client:
        # Create a mock response that mimics successful JWKS response
        mock_jwks_response = AsyncMock()
        mock_jwks_response.status_code = 200
        mock_jwks_response.json.return_value = {
            "keys": [
                {
                    "kid": "test_key_id",
                    "kty": "RSA",
                    "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64TZ_2W-5JsGY4Hc5n9yBXArwl93lqt_RRsDYr6pu1WaH5-kbnDD9iYV7BdgT-PWeU0aGKRjHYd-kpI8W8JcInNyj-blYWClnJDZR1g3bK-YE1_7qnbZ6IysrqYcrU2jx4nyoung0dLmK-o7AGqoBwA5rHbAEKdA7d5DPM8Rx-qg46HdVqYZiZ5sLnuq-fsB0QzXA5oT5bQ_n4j1oJlruqeL-jkBYnbaQXKsJ78lWJW38aOHy0VdZKds2a8k63YdUd-c0Qcb-0BZD1Zdf9u7bNrA-t1337w5FcA7sLbXZ_3oERd8zXdrB7T45lFW-A5cgVawOxWlcfRjolx9c00",
                }
            ]
        }

        # Mock the session response
        mock_session_response = AsyncMock()
        mock_session_response.status_code = 200
        mock_session_response.json.return_value = {
            "id": "sess_test123",
            "user_id": "user_test123",
            "status": "active",
            "expire_at": 9999999999,  # Far future timestamp
            "abandon_at": 9999999999,
            "created_at": 1234567890,
            "updated_at": 1234567890,
        }

        # Mock user response
        mock_user_response = AsyncMock()
        mock_user_response.status_code = 200
        mock_user_response.json.return_value = {
            "id": "user_test123",
            "email_addresses": [
                {
                    "id": "email_test123",
                    "email_address": "test@example.com",
                    "primary_email_address_id": "email_test123",
                }
            ],
            "username": "testuser",
            "first_name": "Test",
            "last_name": "User",
            "image_url": "https://example.com/avatar.jpg",
            "created_at": 1234567890,
            "updated_at": 1234567890,
        }

        # Set up the mock client to return appropriate responses
        mock_client_instance = AsyncMock()
        mock_client_instance.get.side_effect = [
            mock_jwks_response,  # First call for JWKS
            mock_session_response,  # Second call for session
            mock_user_response,  # Third call for user
        ]
        mock_http_client.return_value = mock_client_instance

        # Mock JWT decoding to return test payload
        with patch("jwt.decode") as mock_jwt_decode:
            mock_jwt_decode.return_value = {
                "sid": "sess_test123",
                "sub": "user_test123",
                "iat": 1234567890,
                "exp": 9999999999,
            }

            # Mock JWT header extraction
            with patch("jwt.get_unverified_header") as mock_get_header:
                mock_get_header.return_value = {"kid": "test_key_id"}

                # Mock RSA key creation
                with patch("jwt.algorithms.RSAAlgorithm.from_jwk") as mock_from_jwk:
                    mock_key = AsyncMock()
                    mock_key.decode.return_value = {"payload": "test"}
                    mock_from_jwk.return_value = mock_key

                    yield


@pytest.fixture
async def mock_clerk_authenticator():
    """
    Create a mock ClerkAuthenticator for testing.
    """
    config = ClerkConfig(
        publishable_key="pk_test_123456789", secret_key="sk_test_987654321"
    )

    # Create a mock authenticator
    authenticator = Mock(spec=ClerkAuthenticator)
    authenticator.config = config
    authenticator.verify_session_token = AsyncMock(
        return_value=Mock(
            id="sess_test123", user_id="user_test123", status="active", is_active=True
        )
    )
    authenticator.get_user = AsyncMock(
        return_value=Mock(
            id="user_test123",
            email_addresses=[{"email_address": "test@example.com"}],
            display_name="Test User",
        )
    )

    return authenticator
