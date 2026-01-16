"""Tests for Clerk authentication integration."""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import jwt
import pytest

from src.audio_agent.auth.clerk_auth import (
    ClerkAuthenticator,
    ClerkConfig,
    ClerkSession,
    ClerkUser,
)
from src.audio_agent.auth.exceptions import (
    ClerkAPIError,
    InvalidTokenError,
    TokenExpiredError,
    UserNotFoundError,
)
from tests.fixtures.test_config import TestClerkConfig


class TestClerkConfig:
    """Test ClerkConfig model validation."""

    def test_valid_clerk_config(self):
        """Test creation of valid Clerk configuration."""
        config = ClerkConfig(
            publishable_key="pk_test_123456789",
            secret_key="sk_test_987654321",
            api_url="https://api.clerk.com/v1",
            session_timeout_minutes=60,
        )
        assert config.publishable_key == "pk_test_123456789"
        assert config.secret_key == "sk_test_987654321"
        assert config.session_timeout_minutes == 60

    def test_invalid_api_keys(self):
        """Test validation of Clerk API keys."""
        with pytest.raises(ValueError, match="Invalid Clerk API key format"):
            ClerkConfig(publishable_key="invalid_key", secret_key="sk_test_987654321")

        with pytest.raises(ValueError, match="Invalid Clerk API key format"):
            ClerkConfig(publishable_key="pk_test_123456789", secret_key="invalid_key")

    def test_session_timeout_validation(self):
        """Test session timeout validation."""
        # Valid timeout
        config = ClerkConfig(
            publishable_key="pk_test_123456789",
            secret_key="sk_test_987654321",
            session_timeout_minutes=30,
        )
        assert config.session_timeout_minutes == 30

        # Invalid timeout (too short)
        with pytest.raises(ValueError):
            ClerkConfig(
                publishable_key="pk_test_123456789",
                secret_key="sk_test_987654321",
                session_timeout_minutes=1,
            )


class TestClerkUser:
    """Test ClerkUser model."""

    def create_test_user_data(self):
        """Create test user data."""
        return {
            "id": "user_2abc123def456",
            "email_addresses": [
                {
                    "id": "email_123",
                    "email_address": "test@example.com",
                    "primary_email_address_id": "email_123",
                }
            ],
            "username": "testuser",
            "first_name": "Test",
            "last_name": "User",
            "image_url": "https://example.com/avatar.jpg",
            "created_at": 1640995200000,
            "updated_at": 1640995200000,
        }

    def test_valid_clerk_user(self):
        """Test creation of valid Clerk user."""
        user_data = self.create_test_user_data()
        user = ClerkUser(**user_data)

        assert user.id == "user_2abc123def456"
        assert user.username == "testuser"
        assert user.first_name == "Test"
        assert user.last_name == "User"

    def test_primary_email_property(self):
        """Test primary email extraction."""
        user_data = self.create_test_user_data()
        user = ClerkUser(**user_data)

        assert user.primary_email == "test@example.com"

    def test_display_name_property(self):
        """Test display name generation."""
        user_data = self.create_test_user_data()

        # Full name
        user = ClerkUser(**user_data)
        assert user.display_name == "Test User"

        # First name only
        user_data["last_name"] = None
        user = ClerkUser(**user_data)
        assert user.display_name == "Test"

        # Username only
        user_data["first_name"] = None
        user = ClerkUser(**user_data)
        assert user.display_name == "testuser"

        # Email only
        user_data["username"] = None
        user = ClerkUser(**user_data)
        assert user.display_name == "test"

        # ID fallback
        user_data["email_addresses"] = []
        user = ClerkUser(**user_data)
        assert user.display_name == "User user_2ab"


class TestClerkSession:
    """Test ClerkSession model."""

    def create_test_session_data(self):
        """Create test session data."""
        future_timestamp = int((datetime.utcnow() + timedelta(hours=1)).timestamp())
        return {
            "id": "sess_abc123",
            "user_id": "user_2abc123def456",
            "status": "active",
            "expire_at": future_timestamp,
            "abandon_at": future_timestamp + 3600,
            "created_at": int(datetime.utcnow().timestamp()),
            "updated_at": int(datetime.utcnow().timestamp()),
        }

    def test_valid_clerk_session(self):
        """Test creation of valid Clerk session."""
        session_data = self.create_test_session_data()
        session = ClerkSession(**session_data)

        assert session.id == "sess_abc123"
        assert session.user_id == "user_2abc123def456"
        assert session.status == "active"
        assert session.is_active
        assert not session.is_expired

    def test_expired_session(self):
        """Test expired session detection."""
        session_data = self.create_test_session_data()
        # Set expiration in the past
        session_data["expire_at"] = int(
            (datetime.utcnow() - timedelta(hours=1)).timestamp()
        )

        session = ClerkSession(**session_data)
        assert session.is_expired

    def test_inactive_session(self):
        """Test inactive session detection."""
        session_data = self.create_test_session_data()
        session_data["status"] = "ended"

        session = ClerkSession(**session_data)
        assert not session.is_active


@pytest.mark.asyncio
class TestClerkAuthenticator:
    """Test ClerkAuthenticator functionality."""

    def create_test_config(self):
        """Create test Clerk configuration."""
        return ClerkConfig(
            publishable_key="pk_test_123456789", secret_key="sk_test_987654321"
        )

    def create_test_jwt_payload(self):
        """Create test JWT payload."""
        return {
            "sid": "sess_abc123",
            "sub": "user_2abc123def456",
            "iat": int(datetime.utcnow().timestamp()),
            "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
        }

    @patch("src.audio_agent.auth.clerk_auth.httpx.AsyncClient")
    async def test_authenticator_initialization(self, mock_client):
        """Test authenticator initialization."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        assert authenticator.config == config
        assert authenticator._jwks_cache is None

    @patch("src.audio_agent.auth.clerk_auth.httpx.AsyncClient")
    async def test_context_manager(self, mock_client_class):
        """Test async context manager."""
        config = self.create_test_config()

        # Mock the AsyncClient instance
        mock_client_instance = AsyncMock()
        mock_client_class.return_value = mock_client_instance

        async with ClerkAuthenticator(config) as authenticator:
            assert isinstance(authenticator, ClerkAuthenticator)

        # Should call close on exit
        mock_client_instance.aclose.assert_called_once()

    @patch("src.audio_agent.auth.clerk_auth.httpx.AsyncClient")
    async def test_get_user_success(self, mock_client):
        """Test successful user retrieval."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Mock successful API response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "user_2abc123def456",
            "email_addresses": [],
            "created_at": 1640995200000,
            "updated_at": 1640995200000,
        }
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        user = await authenticator.get_user("user_2abc123def456")

        assert user.id == "user_2abc123def456"
        mock_client.return_value.get.assert_called_once_with(
            "/users/user_2abc123def456"
        )

    @patch("src.audio_agent.auth.clerk_auth.httpx.AsyncClient")
    async def test_get_user_not_found(self, mock_client):
        """Test user not found error."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Mock 404 response
        mock_response = AsyncMock()
        mock_response.status_code = 404
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        with pytest.raises(UserNotFoundError):
            await authenticator.get_user("nonexistent_user")

    @patch("src.audio_agent.auth.clerk_auth.httpx.AsyncClient")
    async def test_get_user_api_error(self, mock_client):
        """Test API error handling."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Mock API error response
        mock_response = AsyncMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        with pytest.raises(ClerkAPIError, match="Failed to get user"):
            await authenticator.get_user("user_123")

    @patch("src.audio_agent.auth.clerk_auth.httpx.AsyncClient")
    @patch("src.audio_agent.auth.clerk_auth.jwt.decode")
    async def test_verify_session_token_success(self, mock_jwt_decode, mock_client):
        """Test successful session token verification."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Mock JWT decoding
        jwt_payload = self.create_test_jwt_payload()
        mock_jwt_decode.return_value = jwt_payload

        # Mock JWKS response
        jwks_response = AsyncMock()
        jwks_response.status_code = 200
        jwks_response.json.return_value = {
            "keys": [
                {
                    "kid": "test_key_id",
                    "kty": "RSA",
                    "use": "sig",
                    "n": "test_n",
                    "e": "AQAB",
                }
            ]
        }

        # Mock session response
        session_response = AsyncMock()
        session_response.status_code = 200
        session_response.json.return_value = {
            "id": "sess_abc123",
            "user_id": "user_2abc123def456",
            "status": "active",
            "expire_at": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
            "abandon_at": int((datetime.utcnow() + timedelta(hours=2)).timestamp()),
            "created_at": int(datetime.utcnow().timestamp()),
            "updated_at": int(datetime.utcnow().timestamp()),
        }

        mock_client.return_value.get = AsyncMock(
            side_effect=[jwks_response, session_response]
        )

        # Mock JWT header
        with patch(
            "src.audio_agent.auth.clerk_auth.jwt.get_unverified_header"
        ) as mock_header:
            mock_header.return_value = {"kid": "test_key_id"}

            with patch(
                "src.audio_agent.auth.clerk_auth.jwt.algorithms.RSAAlgorithm.from_jwk"
            ) as mock_from_jwk:
                mock_from_jwk.return_value = "mock_key"

                session = await authenticator.verify_session_token("test_token")

                assert session.id == "sess_abc123"
                assert session.user_id == "user_2abc123def456"
                assert session.is_active

    @patch("src.audio_agent.auth.clerk_auth.jwt.decode")
    async def test_verify_session_token_expired(self, mock_jwt_decode):
        """Test expired token handling."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Mock JWT expiration error
        mock_jwt_decode.side_effect = jwt.ExpiredSignatureError("Token expired")

        with pytest.raises(TokenExpiredError, match="JWT token has expired"):
            await authenticator.verify_session_token("expired_token")

    @patch("src.audio_agent.auth.clerk_auth.jwt.decode")
    async def test_verify_session_token_invalid(self, mock_jwt_decode):
        """Test invalid token handling."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Mock JWT invalid token error
        mock_jwt_decode.side_effect = jwt.InvalidTokenError("Invalid token")

        with pytest.raises(InvalidTokenError, match="Invalid JWT token"):
            await authenticator.verify_session_token("invalid_token")

    @patch("src.audio_agent.auth.clerk_auth.httpx.AsyncClient")
    async def test_validate_user_permissions(self, mock_client):
        """Test user permission validation."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Mock organization memberships response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{"role": "admin"}, {"role": "premium"}]
        mock_client.return_value.get = AsyncMock(return_value=mock_response)

        # Test with admin permissions
        has_permissions = await authenticator.validate_user_permissions(
            "user_123", ["audio:analyze", "users:manage"]
        )
        assert has_permissions

        # Test with missing permissions
        has_permissions = await authenticator.validate_user_permissions(
            "user_123", ["nonexistent:permission"]
        )
        assert not has_permissions

    @patch("src.audio_agent.auth.clerk_auth.httpx.AsyncClient")
    async def test_create_user_session(self, mock_client):
        """Test user session creation."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Mock successful session creation
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "sess_new123"}
        mock_client.return_value.post = AsyncMock(return_value=mock_response)

        session_id = await authenticator.create_user_session("user_123")

        assert session_id == "sess_new123"
        mock_client.return_value.post.assert_called_once_with(
            "/users/user_123/sessions", json={}
        )

    @patch("src.audio_agent.auth.clerk_auth.httpx.AsyncClient")
    async def test_revoke_session(self, mock_client):
        """Test session revocation."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Mock successful revocation
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_client.return_value.post = AsyncMock(return_value=mock_response)

        result = await authenticator.revoke_session("sess_123")

        assert result is True
        mock_client.return_value.post.assert_called_once_with(
            "/sessions/sess_123/revoke"
        )

    @patch("src.audio_agent.auth.clerk_auth.httpx.AsyncClient")
    async def test_schillinger_backend_integration(self, mock_client):
        """Test Schillinger backend integration."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Mock session verification
        with patch.object(authenticator, "verify_session_token") as mock_verify:
            mock_session = AsyncMock()
            mock_session.user_id = "user_123"
            mock_verify.return_value = mock_session

            with patch.object(authenticator, "get_user") as mock_get_user:
                mock_user = AsyncMock()
                mock_user.id = "user_123"
                mock_get_user.return_value = mock_user

                # Mock Schillinger backend response
                mock_backend_response = AsyncMock()
                mock_backend_response.status_code = 200
                mock_backend_response.json.return_value = {"profile": "test_data"}

                with patch("httpx.AsyncClient") as mock_backend_client:
                    mock_backend_client.return_value.__aenter__.return_value.get = (
                        AsyncMock(return_value=mock_backend_response)
                    )

                    result = await authenticator.integrate_with_schillinger_backend(
                        "test_token"
                    )

                    assert result == {"profile": "test_data"}

    async def test_role_permissions_mapping(self):
        """Test role-based permissions mapping."""
        config = self.create_test_config()
        authenticator = ClerkAuthenticator(config)

        # Test admin permissions
        admin_perms = authenticator._get_role_permissions("admin")
        assert "users:manage" in admin_perms
        assert "system:configure" in admin_perms

        # Test premium permissions
        premium_perms = authenticator._get_role_permissions("premium")
        assert "plugins:use_premium" in premium_perms
        assert "users:manage" not in premium_perms

        # Test basic permissions
        basic_perms = authenticator._get_role_permissions("basic")
        assert "audio:analyze" in basic_perms
        assert "plugins:use_premium" not in basic_perms

        # Test unknown role (should get default permissions)
        unknown_perms = authenticator._get_role_permissions("unknown")
        assert unknown_perms == ["audio:analyze"]
