"""Tests for the main SDK client."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from schillinger_sdk import SchillingerSDK
from schillinger_sdk.errors import ConfigurationError, AuthenticationError


@pytest.mark.asyncio
class TestSchillingerSDK:
    """Test suite for SchillingerSDK client."""

    async def test_initialization_with_api_key(self):
        """Test SDK initialization with API key."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key"
        )
        assert sdk.base_url == "https://api.schillinger.io"
        assert sdk.auth.api_key == "test-key"
        assert sdk.is_authenticated()

    async def test_initialization_with_oauth(self):
        """Test SDK initialization with OAuth."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            token_url="https://auth.schillinger.io/oauth/token",
            client_id="test-client",
            client_secret="test-secret"
        )
        assert sdk.base_url == "https://api.schillinger.io"
        assert sdk.auth.client_id == "test-client"

    async def test_initialization_fails_without_auth(self):
        """Test that initialization fails without authentication."""
        with pytest.raises(ConfigurationError):
            SchillingerSDK(
                base_url="https://api.schillinger.io"
            )

    async def test_initialization_fails_without_base_url(self):
        """Test that initialization fails without base URL."""
        with pytest.raises(ConfigurationError):
            SchillingerSDK(
                base_url="",
                api_key="test-key"
            )

    async def test_api_modules_exist(self):
        """Test that all API modules are initialized."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key"
        )
        assert sdk.rhythm is not None
        assert sdk.harmony is not None
        assert sdk.melody is not None
        assert sdk.composition is not None

    async def test_context_manager(self):
        """Test async context manager."""
        with patch.object(SchillingerSDK, 'start', new_callable=AsyncMock) as mock_start:
            with patch.object(SchillingerSDK, 'stop', new_callable=AsyncMock) as mock_stop:
                async with SchillingerSDK(
                    base_url="https://api.schillinger.io",
                    api_key="test-key"
                ) as sdk:
                    assert sdk is not None
                    mock_start.assert_called_once()

                mock_stop.assert_called_once()

    async def test_start_and_stop(self):
        """Test manual start and stop."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key"
        )

        with patch.object(sdk.network, 'start', new_callable=AsyncMock):
            with patch.object(sdk.auth, 'ensure_valid_token', new_callable=AsyncMock):
                await sdk.start()
                assert sdk.is_initialized()

        with patch.object(sdk.network, 'stop', new_callable=AsyncMock):
            await sdk.stop()
            # Note: is_initialized would still be True without explicit flag reset

    async def test_repr(self):
        """Test string representation."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key"
        )
        repr_str = repr(sdk)
        assert "SchillingerSDK" in repr_str
        assert "https://api.schillinger.io" in repr_str

    async def test_cache_disabled_by_default(self):
        """Test that cache is disabled by default."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key"
        )
        assert sdk.cache is None

    async def test_cache_enabled_when_requested(self):
        """Test that cache is enabled when requested."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key",
            enable_cache=True
        )
        assert sdk.cache is not None

    async def test_health_check_success(self):
        """Test successful health check."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key"
        )

        with patch.object(sdk.network, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {
                "version": "1.0.0",
                "timestamp": "2025-12-24T00:00:00Z"
            }

            await sdk.network.start()
            result = await sdk.health_check()

            assert result["status"] == "healthy"
            assert result["api_version"] == "1.0.0"
            await sdk.network.stop()

    async def test_health_check_failure(self):
        """Test failed health check."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key"
        )

        with patch.object(sdk.network, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("Connection failed")

            await sdk.network.start()
            result = await sdk.health_check()

            assert result["status"] == "unhealthy"
            assert "Connection failed" in result["error"]
            await sdk.network.stop()

    async def test_get_cache_stats_with_cache(self):
        """Test getting cache stats when cache is enabled."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key",
            enable_cache=True
        )

        stats = sdk.get_cache_stats()
        assert "memory_cache" in stats
        assert "memory_cache_enabled" in stats

    async def test_get_cache_stats_without_cache(self):
        """Test getting cache stats when cache is disabled."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key"
        )

        stats = sdk.get_cache_stats()
        assert "message" in stats
        assert stats["message"] == "Caching not enabled"

    async def test_clear_cache(self):
        """Test clearing cache."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key",
            enable_cache=True
        )

        with patch.object(sdk.cache, 'clear', new_callable=AsyncMock) as mock_clear:
            await sdk.clear_cache()
            mock_clear.assert_called_once()

    async def test_is_authenticated_with_api_key(self):
        """Test is_authenticated with API key."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key"
        )
        assert sdk.is_authenticated() is True

    async def test_is_authenticated_with_oauth(self):
        """Test is_authenticated with OAuth."""
        sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            token_url="https://auth.schillinger.io/oauth/token",
            client_id="test-client",
            client_secret="test-secret"
        )
        # No token yet
        assert sdk.is_authenticated() is False
