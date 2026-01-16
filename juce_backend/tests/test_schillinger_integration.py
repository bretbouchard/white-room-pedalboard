"""Tests for Schillinger System Integration with Clerk Authentication."""

import os

os.environ.setdefault("AUDIO_AGENT_ENABLE_DAID_CORE", "false")

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, call, patch

import pytest
from audio_agent.auth.clerk_auth import ClerkConfig, ClerkSession, ClerkUser
from audio_agent.auth.exceptions import (
    AuthenticationError,
    ClerkAPIError,
    TokenExpiredError,
)
from audio_agent.core.schillinger_integration import (
    SchillingerAPIClient,
    SchillingerCompositionDetail,
    SchillingerCompositionSummary,
    SchillingerIntegration,
    SchillingerUserProfile,
)
from audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
)


@pytest.fixture
def clerk_config():
    """Create a test Clerk configuration."""
    return ClerkConfig(
        publishable_key="pk_test_123456789",
        secret_key="sk_test_987654321",
        schillinger_backend_url="https://test-schillinger-backend.fly.io",
    )


@pytest.fixture
def mock_clerk_session():
    """Create a mock Clerk session."""
    return ClerkSession(
        id="sess_123456789",
        user_id="user_123456789",
        status="active",
        expire_at=int(datetime.now().timestamp()) + 3600,  # 1 hour from now
        abandon_at=int(datetime.now().timestamp()) + 86400,  # 1 day from now
        created_at=int(datetime.now().timestamp()) - 3600,  # 1 hour ago
        updated_at=int(datetime.now().timestamp()) - 1800,  # 30 minutes ago
    )


@pytest.fixture
def mock_clerk_user():
    """Create a mock Clerk user."""
    return ClerkUser(
        id="user_123456789",
        email_addresses=[
            {
                "id": "email_123456789",
                "email_address": "test@example.com",
                "primary_email_address_id": "email_123456789",
            }
        ],
        username="testuser",
        first_name="Test",
        last_name="User",
        created_at=int(datetime.now().timestamp()) - 86400,  # 1 day ago
        updated_at=int(datetime.now().timestamp()) - 43200,  # 12 hours ago
    )


@pytest.fixture
def mock_composition_summary():
    """Create a mock composition summary."""
    return {
        "id": "comp_123456789",
        "title": "Test Composition",
        "created_at": "2023-01-01T12:00:00Z",
        "updated_at": "2023-01-02T12:00:00Z",
        "tempo": 120.0,
        "key_signature": "C",
        "time_signature": "4/4",
        "style": "classical",
        "duration_seconds": 180.0,
    }


@pytest.fixture
def mock_composition_detail():
    """Create a mock composition detail."""
    return {
        "id": "comp_123456789",
        "title": "Test Composition",
        "created_at": "2023-01-01T12:00:00Z",
        "updated_at": "2023-01-02T12:00:00Z",
        "tempo": 120.0,
        "key_signature": "C",
        "time_signature": "4/4",
        "style": "classical",
        "duration_seconds": 180.0,
        "sections": [
            {"name": "Intro", "length_measures": 4},
            {"name": "Verse", "length_measures": 8},
            {"name": "Chorus", "length_measures": 8},
            {"name": "Verse", "length_measures": 8},
            {"name": "Chorus", "length_measures": 8},
            {"name": "Outro", "length_measures": 4},
        ],
        "tracks": [
            {"name": "Piano", "instrument": "piano"},
            {"name": "Strings", "instrument": "strings"},
            {"name": "Drums", "instrument": "drums"},
        ],
        "schillinger_techniques": [
            "rhythm_interference",
            "pitch_resultant",
            "corr_symmetrical",
        ],
        "harmonic_progression": ["I", "IV", "V", "I"],
        "instrumentation": ["piano", "strings", "drums"],
    }


@pytest.fixture
def mock_user_profile():
    """Create a mock user profile."""
    return {
        "id": "profile_123456789",
        "clerk_id": "user_123456789",
        "email": "test@example.com",
        "display_name": "Test User",
        "created_at": "2023-01-01T12:00:00Z",
        "preferences": {"theme": "dark", "favorite_styles": ["classical", "jazz"]},
        "subscription_tier": "premium",
    }


class TestSchillingerAPIClient:
    """Tests for SchillingerAPIClient."""

    @pytest.fixture
    def api_client(self):
        """Create a test API client."""
        return SchillingerAPIClient(base_url="https://test-schillinger-backend.fly.io")

    @pytest.mark.asyncio
    async def test_get_user_profile(self, api_client, mock_user_profile):
        """Test getting user profile."""
        with patch("httpx.AsyncClient.request") as mock_request:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_user_profile
            mock_request.return_value = mock_response

            result = await api_client.get_user_profile(
                session_token="test_token", user_id="user_123456789"
            )

            assert isinstance(result, SchillingerUserProfile)
            assert result.clerk_id == "user_123456789"
            assert result.email == "test@example.com"
            assert result.subscription_tier == "premium"

            mock_request.assert_called_once_with(
                method="GET",
                url=f"{api_client.base_url}/api/user/profile",
                headers={
                    "Authorization": "Bearer test_token",
                    "X-Clerk-User-Id": "user_123456789",
                    "Content-Type": "application/json",
                },
                params=None,
                json=None,
            )

    @pytest.mark.asyncio
    async def test_get_compositions(self, api_client, mock_composition_summary):
        """Test getting compositions."""
        with patch("httpx.AsyncClient.request") as mock_request:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "compositions": [mock_composition_summary]
            }
            mock_request.return_value = mock_response

            result = await api_client.get_compositions(
                session_token="test_token", user_id="user_123456789", limit=10, offset=0
            )

            assert len(result) == 1
            assert isinstance(result[0], SchillingerCompositionSummary)
            assert result[0].id == "comp_123456789"
            assert result[0].title == "Test Composition"

            mock_request.assert_called_once_with(
                method="GET",
                url=f"{api_client.base_url}/api/compositions",
                headers={
                    "Authorization": "Bearer test_token",
                    "X-Clerk-User-Id": "user_123456789",
                    "Content-Type": "application/json",
                },
                params={"limit": 10, "offset": 0},
                json=None,
            )

    @pytest.mark.asyncio
    async def test_get_composition(self, api_client, mock_composition_detail):
        """Test getting composition details."""
        with patch("httpx.AsyncClient.request") as mock_request:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_composition_detail
            mock_request.return_value = mock_response

            result = await api_client.get_composition(
                composition_id="comp_123456789",
                session_token="test_token",
                user_id="user_123456789",
            )

            assert isinstance(result, SchillingerCompositionDetail)
            assert result.id == "comp_123456789"
            assert result.title == "Test Composition"
            assert len(result.sections) == 6
            assert len(result.schillinger_techniques) == 3

            mock_request.assert_called_once_with(
                method="GET",
                url=f"{api_client.base_url}/api/compositions/comp_123456789",
                headers={
                    "Authorization": "Bearer test_token",
                    "X-Clerk-User-Id": "user_123456789",
                    "Content-Type": "application/json",
                },
                params=None,
                json=None,
            )

    @pytest.mark.asyncio
    async def test_send_mixing_feedback(self, api_client):
        """Test sending mixing feedback."""
        with patch("httpx.AsyncClient.request") as mock_request:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"success": True}
            mock_request.return_value = mock_response

            feedback = {
                "eq_feedback": "Boost the highs",
                "dynamics_feedback": "More compression needed",
                "spatial_feedback": "Add more reverb",
            }

            result = await api_client.send_mixing_feedback(
                composition_id="comp_123456789",
                feedback=feedback,
                session_token="test_token",
                user_id="user_123456789",
            )

            assert result == {"success": True}

            mock_request.assert_called_once_with(
                method="POST",
                url=f"{api_client.base_url}/api/compositions/comp_123456789/mixing-feedback",
                headers={
                    "Authorization": "Bearer test_token",
                    "X-Clerk-User-Id": "user_123456789",
                    "Content-Type": "application/json",
                },
                params=None,
                json=feedback,
            )

    @pytest.mark.asyncio
    async def test_api_error_handling(self, api_client):
        """Test API error handling."""
        with patch("httpx.AsyncClient.request") as mock_request:
            mock_response = AsyncMock()
            mock_response.status_code = 401
            mock_response.text = "Unauthorized"
            mock_request.return_value = mock_response

            with pytest.raises(AuthenticationError):
                await api_client.get_user_profile(
                    session_token="invalid_token", user_id="user_123456789"
                )

    @pytest.mark.asyncio
    async def test_request_timeout(self, api_client):
        """Test request timeout handling."""
        with patch("httpx.AsyncClient.request") as mock_request:
            mock_request.side_effect = asyncio.TimeoutError()

            with pytest.raises(ClerkAPIError) as exc_info:
                await api_client.get_user_profile(
                    session_token="test_token", user_id="user_123456789"
                )

            assert exc_info.value.status_code == 408


class TestSchillingerIntegration:
    """Tests for SchillingerIntegration."""

    @pytest.fixture
    def integration(self, clerk_config):
        """Create a test integration instance."""
        return SchillingerIntegration(clerk_config=clerk_config)

    @pytest.mark.asyncio
    async def test_verify_user_session(self, integration, mock_clerk_session):
        """Test verifying user session."""
        with patch(
            "audio_agent.auth.clerk_auth.ClerkAuthenticator.verify_session_token"
        ) as mock_verify:
            mock_verify.return_value = mock_clerk_session

            user_id = await integration.verify_user_session("test_token")

            assert user_id == "user_123456789"
            mock_verify.assert_called_once_with("test_token")

    @pytest.mark.asyncio
    async def test_get_user_profile(
        self, integration, mock_clerk_session, mock_user_profile
    ):
        """Test getting user profile."""
        with (
            patch(
                "audio_agent.auth.clerk_auth.ClerkAuthenticator.verify_session_token"
            ) as mock_verify,
            patch(
                "audio_agent.core.schillinger_integration.SchillingerAPIClient.get_user_profile"
            ) as mock_get_profile,
        ):
            mock_verify.return_value = mock_clerk_session
            mock_get_profile.return_value = SchillingerUserProfile(**mock_user_profile)

            profile = await integration.get_user_profile("test_token")

            assert profile.clerk_id == "user_123456789"
            assert profile.email == "test@example.com"
            mock_verify.assert_called_once_with("test_token")
            mock_get_profile.assert_called_once_with(
                session_token="test_token", user_id="user_123456789"
            )

    @pytest.mark.asyncio
    async def test_get_composition_context(
        self, integration, mock_clerk_session, mock_composition_detail
    ):
        """Test getting composition context."""
        with (
            patch(
                "audio_agent.auth.clerk_auth.ClerkAuthenticator.verify_session_token"
            ) as mock_verify,
            patch(
                "audio_agent.core.schillinger_integration.SchillingerAPIClient.get_composition"
            ) as mock_get_composition,
        ):
            mock_verify.return_value = mock_clerk_session
            mock_get_composition.return_value = SchillingerCompositionDetail(
                **mock_composition_detail
            )

            context = await integration.get_composition_context(
                composition_id="comp_123456789", session_token="test_token"
            )

            assert isinstance(context, CompositionContext)
            assert context.tempo == 120.0
            assert context.key_signature == MusicalKey.C_MAJOR
            assert context.time_signature.numerator == 4
            assert context.time_signature.denominator == 4
            assert context.style == MusicalStyle.CLASSICAL
            assert context.clerk_user_id == "user_123456789"
            assert len(context.instrumentation) == 3
            assert context.schillinger_context is not None
            assert len(context.schillinger_context.rhythmic_patterns) == 1

            # verify_session_token is called twice: once in get_composition_detail and once in verify_user_session
            assert mock_verify.call_count == 2
            mock_verify.assert_has_calls([call("test_token"), call("test_token")])
            mock_get_composition.assert_called_once_with(
                composition_id="comp_123456789",
                session_token="test_token",
                user_id="user_123456789",
            )

    @pytest.mark.asyncio
    async def test_composition_caching(
        self, integration, mock_clerk_session, mock_composition_detail
    ):
        """Test composition caching."""
        with (
            patch(
                "audio_agent.auth.clerk_auth.ClerkAuthenticator.verify_session_token"
            ) as mock_verify,
            patch(
                "audio_agent.core.schillinger_integration.SchillingerAPIClient.get_composition"
            ) as mock_get_composition,
        ):
            mock_verify.return_value = mock_clerk_session
            mock_get_composition.return_value = SchillingerCompositionDetail(
                **mock_composition_detail
            )

            # First call should hit the API
            await integration.get_composition_detail(
                composition_id="comp_123456789", session_token="test_token"
            )

            # Second call should use cache
            await integration.get_composition_detail(
                composition_id="comp_123456789", session_token="test_token"
            )

            # API should only be called once
            assert mock_get_composition.call_count == 1

            # Clear cache and call again
            integration.clear_cache("comp_123456789")
            await integration.get_composition_detail(
                composition_id="comp_123456789", session_token="test_token"
            )

            # API should be called again
            assert mock_get_composition.call_count == 2

    @pytest.mark.asyncio
    async def test_send_mixing_feedback(self, integration, mock_clerk_session):
        """Test sending mixing feedback."""
        with (
            patch(
                "audio_agent.auth.clerk_auth.ClerkAuthenticator.verify_session_token"
            ) as mock_verify,
            patch(
                "audio_agent.core.schillinger_integration.SchillingerAPIClient.send_mixing_feedback"
            ) as mock_send_feedback,
        ):
            mock_verify.return_value = mock_clerk_session
            mock_send_feedback.return_value = {"success": True}

            feedback = {
                "eq_feedback": "Boost the highs",
                "dynamics_feedback": "More compression needed",
            }

            result = await integration.send_mixing_feedback(
                composition_id="comp_123456789",
                session_token="test_token",
                feedback=feedback,
            )

            assert result == {"success": True}
            mock_verify.assert_called_once_with("test_token")
            mock_send_feedback.assert_called_once_with(
                composition_id="comp_123456789",
                feedback=feedback,
                session_token="test_token",
                user_id="user_123456789",
            )

    @pytest.mark.asyncio
    async def test_authentication_error_handling(self, integration):
        """Test authentication error handling."""
        # Create a mock authenticator that raises TokenExpiredError
        mock_authenticator = AsyncMock()
        mock_authenticator.verify_session_token.side_effect = TokenExpiredError()

        with patch.object(
            integration, "get_authenticator", return_value=mock_authenticator
        ):
            with pytest.raises(TokenExpiredError):
                await integration.get_user_profile("expired_token")


class TestSchillingerCompositionDetail:
    """Tests for SchillingerCompositionDetail."""

    def test_to_composition_context(self, mock_composition_detail):
        """Test converting to CompositionContext."""
        composition = SchillingerCompositionDetail(**mock_composition_detail)
        context = composition.to_composition_context()

        assert isinstance(context, CompositionContext)
        assert context.tempo == 120.0
        assert context.key_signature == MusicalKey.C_MAJOR
        assert context.time_signature.numerator == 4
        assert context.time_signature.denominator == 4
        assert context.style == MusicalStyle.CLASSICAL
        assert context.title == "Test Composition"

        # Check structure
        assert context.structure is not None
        assert len(context.structure.sections) == 6
        assert context.structure.form == "Verse-Chorus"
        assert context.structure.total_measures == 40

        # Check harmonic progression
        assert context.harmonic_progression is not None
        assert context.harmonic_progression.chords == ["I", "IV", "V", "I"]
        assert context.harmonic_progression.progression_type == "I-IV-V"

        # Check Schillinger context
        assert context.schillinger_context is not None
        assert context.schillinger_context.composition_id == "comp_123456789"
        assert len(context.schillinger_context.rhythmic_patterns) == 1
        assert len(context.schillinger_context.pitch_scales) == 1
        assert len(context.schillinger_context.correlation_techniques) == 1

    def test_detect_progression_type(self, mock_composition_detail):
        """Test detecting progression type."""
        composition = SchillingerCompositionDetail(**mock_composition_detail)

        assert composition._detect_progression_type(["I", "IV", "V", "I"]) == "I-IV-V"
        assert composition._detect_progression_type(["ii", "V", "I"]) == "ii-V-I"
        assert (
            composition._detect_progression_type(["I", "vi", "IV", "V"]) == "I-vi-IV-V"
        )
        assert (
            composition._detect_progression_type(["I", "V", "vi", "IV"]) == "I-V-vi-IV"
        )
        assert (
            composition._detect_progression_type(["I", "III", "vi", "ii"])
            == "Custom progression"
        )

    def test_detect_form(self, mock_composition_detail):
        """Test detecting musical form."""
        composition = SchillingerCompositionDetail(**mock_composition_detail)

        assert (
            composition._detect_form(["Verse", "Chorus", "Verse", "Chorus"])
            == "Verse-Chorus"
        )
        assert composition._detect_form(["A", "A", "B", "A"]) == "AABA"
        assert composition._detect_form(["A", "B", "A"]) == "ABA"
        assert composition._detect_form(["A", "B", "C"]) == "ABC"
        assert composition._detect_form(["Intro", "Main", "Outro"]) == "Custom form"
