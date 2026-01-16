"""Tests for user models with Clerk integration."""

from datetime import datetime, timedelta

import pytest
from pydantic import ValidationError

from src.audio_agent.models.user import (
    AudioQualityPreference,
    ExperienceLevel,
    LearningPreferences,
    MixingPreferences,
    PluginPreferences,
    PreferredWorkflow,
    UserPreferences,
    UserProfile,
    UserSession,
)


class TestPluginPreferences:
    """Test PluginPreferences model validation."""

    def test_valid_plugin_preferences(self):
        """Test creation of valid plugin preferences."""
        prefs = PluginPreferences(
            preferred_brands=["FabFilter", "Waves", "Universal Audio"],
            avoided_brands=["BadPlugin Co"],
            cpu_efficiency_priority=0.7,
            vintage_vs_modern=0.3,
            complexity_preference=0.6,
        )
        assert len(prefs.preferred_brands) == 3
        assert prefs.cpu_efficiency_priority == 0.7

    def test_brand_name_validation(self):
        """Test brand name validation removes empty strings."""
        prefs = PluginPreferences(
            preferred_brands=["FabFilter", "", "  ", "Waves"],
            avoided_brands=["", "BadPlugin"],
        )
        assert "FabFilter" in prefs.preferred_brands
        assert "Waves" in prefs.preferred_brands
        assert "" not in prefs.preferred_brands
        assert "  " not in prefs.preferred_brands
        assert "BadPlugin" in prefs.avoided_brands
        assert "" not in prefs.avoided_brands


class TestMixingPreferences:
    """Test MixingPreferences model validation."""

    def test_valid_mixing_preferences(self):
        """Test creation of valid mixing preferences."""
        prefs = MixingPreferences(
            target_loudness=-14.0,
            dynamic_range_preference=0.7,
            stereo_width_preference=0.6,
            reverb_preference=0.4,
        )
        assert prefs.target_loudness == -14.0
        assert prefs.dynamic_range_preference == 0.7

    def test_frequency_balance_defaults(self):
        """Test frequency balance default values."""
        prefs = MixingPreferences()
        balance = prefs.frequency_balance_preference

        assert balance["bass"] == 0.5
        assert balance["mid"] == 0.5
        assert balance["treble"] == 0.5
        assert len(balance) == 5  # All frequency bands

    def test_frequency_balance_validation(self):
        """Test frequency balance validation."""
        with pytest.raises(ValidationError, match="must be between 0 and 1"):
            MixingPreferences(
                frequency_balance_preference={
                    "bass": 1.5,  # Invalid value
                    "mid": 0.5,
                    "treble": 0.5,
                }
            )

    def test_target_loudness_range(self):
        """Test target loudness validation."""
        # Valid LUFS value
        prefs = MixingPreferences(target_loudness=-23.0)
        assert prefs.target_loudness == -23.0

        # Invalid LUFS value (too high)
        with pytest.raises(ValidationError, match="less than or equal to 0"):
            MixingPreferences(target_loudness=5.0)


class TestLearningPreferences:
    """Test LearningPreferences model validation."""

    def test_valid_learning_preferences(self):
        """Test creation of valid learning preferences."""
        prefs = LearningPreferences(
            feedback_frequency=0.7,
            explanation_detail=0.8,
            learning_rate=0.5,
            remember_corrections=True,
            share_learning_data=False,
        )
        assert prefs.feedback_frequency == 0.7
        assert prefs.remember_corrections is True
        assert prefs.share_learning_data is False


class TestUserProfile:
    """Test UserProfile model validation."""

    def test_valid_user_profile(self):
        """Test creation of valid user profile."""
        profile = UserProfile(
            clerk_user_id="user_2abc123def456",
            email="test@example.com",
            username="testuser",
            display_name="Test User",
            experience_level=ExperienceLevel.INTERMEDIATE,
            preferred_workflow=PreferredWorkflow.GUIDED,
            primary_genres=["rock", "pop", "jazz"],
        )
        assert profile.clerk_user_id == "user_2abc123def456"
        assert profile.email == "test@example.com"
        assert not profile.is_premium_user  # Default subscription is "free"

    def test_clerk_user_id_validation(self):
        """Test Clerk user ID validation."""
        # Valid Clerk user ID
        profile = UserProfile(clerk_user_id="user_2abc123def456")
        assert profile.clerk_user_id == "user_2abc123def456"

        # Invalid Clerk user ID (wrong prefix)
        with pytest.raises(ValidationError, match="must start with 'user_'"):
            UserProfile(clerk_user_id="invalid_123")

        # Invalid Clerk user ID (too short)
        with pytest.raises(ValidationError, match="too short"):
            UserProfile(clerk_user_id="user_123")

    def test_email_validation(self):
        """Test email validation."""
        # Valid email
        profile = UserProfile(
            clerk_user_id="user_2abc123def456", email="test@example.com"
        )
        assert profile.email == "test@example.com"

        # Invalid email format
        with pytest.raises(ValidationError, match="Invalid email format"):
            UserProfile(clerk_user_id="user_2abc123def456", email="invalid-email")

        # Email case normalization
        profile = UserProfile(
            clerk_user_id="user_2abc123def456", email="TEST@EXAMPLE.COM"
        )
        assert profile.email == "test@example.com"

    def test_premium_user_detection(self):
        """Test premium user detection."""
        profile = UserProfile(
            clerk_user_id="user_2abc123def456", subscription_tier="premium"
        )
        assert profile.is_premium_user

        profile.subscription_tier = "professional"
        assert profile.is_premium_user

        profile.subscription_tier = "free"
        assert not profile.is_premium_user

    def test_days_since_creation(self):
        """Test days since creation calculation."""
        past_date = datetime.utcnow() - timedelta(days=30)
        profile = UserProfile(clerk_user_id="user_2abc123def456", created_at=past_date)
        assert profile.days_since_creation >= 29  # Allow for small timing differences


class TestUserPreferences:
    """Test UserPreferences model validation."""

    def test_valid_user_preferences(self):
        """Test creation of valid user preferences."""
        prefs = UserPreferences(
            clerk_user_id="user_2abc123def456",
            plugin_preferences=PluginPreferences(),
            mixing_preferences=MixingPreferences(),
            learning_preferences=LearningPreferences(),
            audio_quality_preference=AudioQualityPreference.STREAMING,
        )
        assert prefs.clerk_user_id == "user_2abc123def456"
        assert prefs.audio_quality_preference == AudioQualityPreference.STREAMING

    def test_notification_types_validation(self):
        """Test notification types validation."""
        # Valid notification types
        prefs = UserPreferences(
            clerk_user_id="user_2abc123def456",
            notification_types=["analysis_complete", "errors"],
        )
        assert len(prefs.notification_types) == 2

        # Invalid notification type
        with pytest.raises(ValidationError, match="Invalid notification type"):
            UserPreferences(
                clerk_user_id="user_2abc123def456", notification_types=["invalid_type"]
            )

    def test_target_loudness_calculation(self):
        """Test target loudness calculation based on quality preference."""
        prefs = UserPreferences(
            clerk_user_id="user_2abc123def456",
            audio_quality_preference=AudioQualityPreference.BROADCAST,
        )
        assert prefs.get_target_loudness_lufs() == -23.0

        prefs.audio_quality_preference = AudioQualityPreference.STREAMING
        assert prefs.get_target_loudness_lufs() == -14.0

        prefs.audio_quality_preference = AudioQualityPreference.CUSTOM
        assert (
            prefs.get_target_loudness_lufs() == prefs.mixing_preferences.target_loudness
        )

    def test_explanation_decision(self):
        """Test explanation showing decision logic."""
        prefs = UserPreferences(clerk_user_id="user_2abc123def456")
        prefs.learning_preferences.explanation_detail = 0.8

        # Should show explanation for lower complexity
        assert prefs.should_show_explanation(0.5)

        # Should not show explanation for higher complexity
        assert not prefs.should_show_explanation(0.9)

    def test_feedback_request_decision(self):
        """Test feedback request decision logic."""
        prefs = UserPreferences(clerk_user_id="user_2abc123def456")
        prefs.learning_preferences.feedback_frequency = 1.0  # Always ask

        # With frequency 1.0, should always return True
        # Note: This test might be flaky due to randomness, but with frequency 1.0 it should be reliable
        results = [prefs.should_ask_for_feedback() for _ in range(10)]
        assert all(results)  # All should be True

        prefs.learning_preferences.feedback_frequency = 0.0  # Never ask
        results = [prefs.should_ask_for_feedback() for _ in range(10)]
        assert not any(results)  # All should be False

    def test_update_last_modified(self):
        """Test last modified timestamp update."""
        prefs = UserPreferences(clerk_user_id="user_2abc123def456")
        original_time = prefs.last_updated

        # Small delay to ensure timestamp difference
        import time

        time.sleep(0.01)

        prefs.update_last_modified()
        assert prefs.last_updated > original_time


class TestUserSession:
    """Test UserSession model validation."""

    def test_valid_user_session(self):
        """Test creation of valid user session."""
        session = UserSession(
            session_id="sess_abc123",
            clerk_user_id="user_2abc123def456",
            clerk_session_id="sess_clerk_123",
            user_agent="Mozilla/5.0...",
            ip_address="192.168.1.1",
        )
        assert session.session_id == "sess_abc123"
        assert session.clerk_user_id == "user_2abc123def456"
        assert session.is_active
        assert not session.is_expired

    def test_session_expiration(self):
        """Test session expiration logic."""
        past_time = datetime.utcnow() - timedelta(hours=1)
        session = UserSession(
            session_id="sess_abc123",
            clerk_user_id="user_2abc123def456",
            expires_at=past_time,
        )
        assert session.is_expired
        assert not session.is_valid()

    def test_session_duration(self):
        """Test session duration calculation."""
        start_time = datetime.utcnow() - timedelta(minutes=30)
        session = UserSession(
            session_id="sess_abc123",
            clerk_user_id="user_2abc123def456",
            created_at=start_time,
        )
        assert session.duration_minutes >= 29  # Allow for small timing differences

    def test_activity_update(self):
        """Test activity timestamp update."""
        session = UserSession(
            session_id="sess_abc123", clerk_user_id="user_2abc123def456"
        )
        original_activity = session.last_activity

        # Small delay to ensure timestamp difference
        import time

        time.sleep(0.01)

        session.update_activity()
        assert session.last_activity > original_activity

    def test_session_validity(self):
        """Test session validity checking."""
        # Valid active session
        session = UserSession(
            session_id="sess_abc123", clerk_user_id="user_2abc123def456"
        )
        assert session.is_valid()

        # Inactive session
        session.is_active = False
        assert not session.is_valid()

        # Expired session
        session.is_active = True
        session.expires_at = datetime.utcnow() - timedelta(hours=1)
        assert not session.is_valid()

    def test_strict_validation(self):
        """Test that strict validation is enforced."""
        with pytest.raises(ValidationError):
            UserSession.model_validate(
                {
                    "session_id": "sess_abc123",
                    "clerk_user_id": "user_2abc123def456",
                    "extra_field": "should_fail",  # Extra field not allowed
                }
            )
