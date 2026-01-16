"""Tests for User Feedback Collection and Learning System."""

import json
import os
import tempfile
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest

from src.audio_agent.auth.clerk_auth import ClerkConfig, ClerkSession
from src.audio_agent.core.user_preference_learner import (
    FeedbackCategory,
    FeedbackType,
    UserFeedback,
    UserFeedbackCollector,
    UserPreference,
    UserProfile,
)


@pytest.fixture
def temp_storage_dir():
    """Create a temporary directory for storage."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


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
        expire_at=int((datetime.now() + timedelta(hours=1)).timestamp()),
        abandon_at=int((datetime.now() + timedelta(days=1)).timestamp()),
        created_at=int((datetime.now() - timedelta(hours=1)).timestamp()),
        updated_at=int((datetime.now() - timedelta(minutes=30)).timestamp()),
    )


@pytest.fixture
def feedback_collector(temp_storage_dir, clerk_config):
    """Create a feedback collector for testing."""
    return UserFeedbackCollector(
        clerk_config=clerk_config, storage_dir=temp_storage_dir
    )


@pytest.fixture
def sample_feedback():
    """Create a sample feedback for testing."""
    return UserFeedback(
        feedback_id=str(uuid.uuid4()),
        clerk_user_id="user_123456789",
        feedback_type=FeedbackType.RATING,
        category=FeedbackCategory.PLUGIN_SELECTION,
        target_id="plugin_123",
        target_type="plugin",
        rating=4.5,
        composition_id="comp_123",
    )


@pytest.fixture
def sample_adjustment_feedback():
    """Create a sample adjustment feedback for testing."""
    return UserFeedback(
        feedback_id=str(uuid.uuid4()),
        clerk_user_id="user_123456789",
        feedback_type=FeedbackType.ADJUSTMENT,
        category=FeedbackCategory.EQ,
        target_id="eq_plugin_123",
        target_type="plugin",
        original_parameters={
            "low_gain": 2.0,
            "mid_gain": 0.0,
            "high_gain": -1.0,
            "low_freq": 100.0,
            "high_freq": 10000.0,
        },
        adjusted_parameters={
            "low_gain": 3.0,
            "mid_gain": 1.0,
            "high_gain": -2.0,
            "low_freq": 80.0,
            "high_freq": 12000.0,
        },
        composition_id="comp_123",
    )


class TestUserFeedbackCollector:
    """Tests for UserFeedbackCollector."""

    @pytest.mark.asyncio
    async def test_verify_user_session(self, feedback_collector, mock_clerk_session):
        """Test verifying user session."""
        with patch(
            "src.audio_agent.auth.clerk_auth.ClerkAuthenticator.verify_session_token"
        ) as mock_verify:
            mock_verify.return_value = mock_clerk_session

            user_id = await feedback_collector.verify_user_session("test_token")

            assert user_id == "user_123456789"
            mock_verify.assert_called_once_with("test_token")

    @pytest.mark.asyncio
    async def test_add_feedback(
        self, feedback_collector, sample_feedback, mock_clerk_session
    ):
        """Test adding feedback."""
        with patch(
            "src.audio_agent.auth.clerk_auth.ClerkAuthenticator.verify_session_token"
        ) as mock_verify:
            mock_verify.return_value = mock_clerk_session

            # Add feedback with session token
            result = await feedback_collector.add_feedback(
                feedback=sample_feedback, session_token="test_token"
            )

            assert result is True
            mock_verify.assert_called_once_with("test_token")

            # Check feedback was stored
            feedback = feedback_collector.get_user_feedback("user_123456789")
            assert len(feedback) == 1
            assert feedback[0].feedback_id == sample_feedback.feedback_id

            # Check preferences were updated
            preferences = feedback_collector.get_user_preferences("user_123456789")
            assert len(preferences) == 1
            assert preferences[0].target_id == "plugin_123"

            # Check profile was updated
            profile = feedback_collector.get_user_profile("user_123456789")
            assert profile is not None
            assert profile.feedback_count == 1

    @pytest.mark.asyncio
    async def test_add_feedback_without_token(
        self, feedback_collector, sample_feedback
    ):
        """Test adding feedback without session token."""
        # Add feedback without session token
        result = await feedback_collector.add_feedback(
            feedback=sample_feedback, session_token=None
        )

        assert result is True

        # Check feedback was stored
        feedback = feedback_collector.get_user_feedback("user_123456789")
        assert len(feedback) == 1
        assert feedback[0].feedback_id == sample_feedback.feedback_id

    @pytest.mark.asyncio
    async def test_add_feedback_with_invalid_token(
        self, feedback_collector, sample_feedback
    ):
        """Test adding feedback with invalid session token."""
        with patch(
            "src.audio_agent.auth.clerk_auth.ClerkAuthenticator.verify_session_token"
        ) as mock_verify:
            mock_verify.side_effect = Exception("Invalid token")

            # Add feedback with invalid session token
            result = await feedback_collector.add_feedback(
                feedback=sample_feedback, session_token="invalid_token"
            )

            assert result is False
            mock_verify.assert_called_once_with("invalid_token")

            # Check feedback was not stored
            feedback = feedback_collector.get_user_feedback("user_123456789")
            assert len(feedback) == 0

    def test_get_user_feedback_with_filters(self, feedback_collector):
        """Test getting user feedback with filters."""
        # Create multiple feedback items
        feedback1 = UserFeedback(
            feedback_id="feedback_1",
            clerk_user_id="user_123456789",
            feedback_type=FeedbackType.RATING,
            category=FeedbackCategory.PLUGIN_SELECTION,
            target_id="plugin_123",
            target_type="plugin",
            rating=4.5,
        )

        feedback2 = UserFeedback(
            feedback_id="feedback_2",
            clerk_user_id="user_123456789",
            feedback_type=FeedbackType.ACCEPTANCE,
            category=FeedbackCategory.EQ,
            target_id="eq_plugin_123",
            target_type="plugin",
            accepted=True,
        )

        feedback3 = UserFeedback(
            feedback_id="feedback_3",
            clerk_user_id="user_123456789",
            feedback_type=FeedbackType.COMMENT,
            category=FeedbackCategory.DYNAMICS,
            target_id="comp_plugin_123",
            target_type="plugin",
            comment="Good compression",
        )

        # Store feedback
        feedback_collector._feedback_cache["user_123456789"] = [
            feedback1,
            feedback2,
            feedback3,
        ]

        # Get all feedback
        all_feedback = feedback_collector.get_user_feedback("user_123456789")
        assert len(all_feedback) == 3

        # Filter by category
        eq_feedback = feedback_collector.get_user_feedback(
            "user_123456789", category=FeedbackCategory.EQ
        )
        assert len(eq_feedback) == 1
        assert eq_feedback[0].feedback_id == "feedback_2"

        # Filter by target type
        plugin_feedback = feedback_collector.get_user_feedback(
            "user_123456789", target_type="plugin"
        )
        assert len(plugin_feedback) == 3

        # Filter by target ID
        specific_feedback = feedback_collector.get_user_feedback(
            "user_123456789", target_id="plugin_123"
        )
        assert len(specific_feedback) == 1
        assert specific_feedback[0].feedback_id == "feedback_1"

    def test_get_user_preferences(self, feedback_collector):
        """Test getting user preferences."""
        # Create preferences
        pref1 = UserPreference(
            preference_id="plugin_selection:plugin:plugin_123",
            clerk_user_id="user_123456789",
            category=FeedbackCategory.PLUGIN_SELECTION,
            target_type="plugin",
            target_id="plugin_123",
            preference_value=0.8,
            confidence=0.7,
        )

        pref2 = UserPreference(
            preference_id="eq:plugin:eq_plugin_123",
            clerk_user_id="user_123456789",
            category=FeedbackCategory.EQ,
            target_type="plugin",
            target_id="eq_plugin_123",
            preference_value=0.5,
            confidence=0.5,
        )

        # Store preferences
        feedback_collector._preference_cache["user_123456789"] = {
            pref1.preference_id: pref1,
            pref2.preference_id: pref2,
        }

        # Get all preferences
        all_prefs = feedback_collector.get_user_preferences("user_123456789")
        assert len(all_prefs) == 2

        # Filter by category
        eq_prefs = feedback_collector.get_user_preferences(
            "user_123456789", category=FeedbackCategory.EQ
        )
        assert len(eq_prefs) == 1
        assert eq_prefs[0].target_id == "eq_plugin_123"

    def test_create_user_profile(self, feedback_collector):
        """Test creating user profile."""
        # Create profile
        profile = feedback_collector.create_user_profile(
            clerk_user_id="user_123456789",
            display_name="Test User",
            email="test@example.com",
            experience_level="advanced",
        )

        assert profile.clerk_user_id == "user_123456789"
        assert profile.display_name == "Test User"
        assert profile.email == "test@example.com"
        assert profile.experience_level == "advanced"

        # Check profile was stored
        stored_profile = feedback_collector.get_user_profile("user_123456789")
        assert stored_profile is not None
        assert stored_profile.clerk_user_id == "user_123456789"
        assert stored_profile.display_name == "Test User"

    def test_update_user_profile(self, feedback_collector):
        """Test updating user profile."""
        # Create profile
        feedback_collector.create_user_profile(
            clerk_user_id="user_123456789",
            display_name="Test User",
            email="test@example.com",
        )

        # Update profile
        updated_profile = feedback_collector.update_user_profile(
            clerk_user_id="user_123456789",
            updates={
                "display_name": "Updated User",
                "experience_level": "professional",
            },
        )

        assert updated_profile is not None
        assert updated_profile.display_name == "Updated User"
        assert updated_profile.experience_level == "professional"
        assert updated_profile.email == "test@example.com"  # Unchanged

        # Check profile was stored
        stored_profile = feedback_collector.get_user_profile("user_123456789")
        assert stored_profile is not None
        assert stored_profile.display_name == "Updated User"
        assert stored_profile.experience_level == "professional"

    def test_clear_cache(self, feedback_collector, sample_feedback):
        """Test clearing cache."""
        # Store some data
        feedback_collector._feedback_cache["user_123456789"] = [sample_feedback]
        feedback_collector._preference_cache["user_123456789"] = {}
        feedback_collector._profile_cache["user_123456789"] = UserProfile(
            clerk_user_id="user_123456789"
        )

        # Clear cache for specific user
        feedback_collector.clear_cache("user_123456789")

        assert "user_123456789" not in feedback_collector._feedback_cache
        assert "user_123456789" not in feedback_collector._preference_cache
        assert "user_123456789" not in feedback_collector._profile_cache

        # Store some data again
        feedback_collector._feedback_cache["user_123456789"] = [sample_feedback]
        feedback_collector._feedback_cache["user_987654321"] = []

        # Clear all cache
        feedback_collector.clear_cache()

        assert len(feedback_collector._feedback_cache) == 0
        assert len(feedback_collector._preference_cache) == 0
        assert len(feedback_collector._profile_cache) == 0

    def test_export_import_user_data(self, feedback_collector, sample_feedback):
        """Test exporting and importing user data."""
        # Store some data
        feedback_collector._feedback_cache["user_123456789"] = [sample_feedback]
        feedback_collector._preference_cache["user_123456789"] = {
            "test_pref": UserPreference(
                preference_id="test_pref",
                clerk_user_id="user_123456789",
                category=FeedbackCategory.PLUGIN_SELECTION,
                target_type="plugin",
                target_id="plugin_123",
                preference_value=0.8,
            )
        }
        feedback_collector._profile_cache["user_123456789"] = UserProfile(
            clerk_user_id="user_123456789", display_name="Test User"
        )

        # Export data
        export_data = feedback_collector.export_user_data("user_123456789")

        assert "profile" in export_data
        assert "preferences" in export_data
        assert "feedback" in export_data
        assert len(export_data["feedback"]) == 1
        assert len(export_data["preferences"]) == 1

        # Clear cache
        feedback_collector.clear_cache()

        # Import data
        result = feedback_collector.import_user_data(export_data)

        assert result is True

        # Check data was imported
        assert "user_123456789" in feedback_collector._feedback_cache
        assert "user_123456789" in feedback_collector._preference_cache
        assert "user_123456789" in feedback_collector._profile_cache
        assert len(feedback_collector._feedback_cache["user_123456789"]) == 1
        assert len(feedback_collector._preference_cache["user_123456789"]) == 1

    def test_file_storage(self, feedback_collector, sample_feedback, temp_storage_dir):
        """Test file storage."""
        # Store feedback
        feedback_collector._store_feedback(sample_feedback)

        # Check file was created
        feedback_path = os.path.join(
            temp_storage_dir, f"feedback_{sample_feedback.clerk_user_id}.json"
        )
        assert os.path.exists(feedback_path)

        # Check file content
        with open(feedback_path) as f:
            data = json.load(f)
            assert len(data) == 1
            assert data[0]["feedback_id"] == sample_feedback.feedback_id

        # Create and store profile
        profile = UserProfile(clerk_user_id="user_123456789", display_name="Test User")
        feedback_collector._save_user_profile(profile)

        # Check file was created
        profile_path = os.path.join(
            temp_storage_dir, f"profile_{profile.clerk_user_id}.json"
        )
        assert os.path.exists(profile_path)

        # Check file content
        with open(profile_path) as f:
            data = json.load(f)
            assert data["clerk_user_id"] == profile.clerk_user_id
            assert data["display_name"] == profile.display_name

    def test_update_preferences(
        self, feedback_collector, sample_feedback, sample_adjustment_feedback
    ):
        """Test updating preferences based on feedback."""
        # Process rating feedback
        feedback_collector._update_preferences(sample_feedback)

        # Check preference was created
        preferences = feedback_collector.get_user_preferences("user_123456789")
        assert len(preferences) == 1
        assert preferences[0].target_id == "plugin_123"
        assert preferences[0].preference_value > 0  # Positive rating

        # Process adjustment feedback
        feedback_collector._update_preferences(sample_adjustment_feedback)

        # Check preference was created
        preferences = feedback_collector.get_user_preferences("user_123456789")
        assert len(preferences) == 2

        # Find EQ preference
        eq_pref = next((p for p in preferences if p.target_id == "eq_plugin_123"), None)
        assert eq_pref is not None
        assert eq_pref.category == FeedbackCategory.EQ

    def test_update_user_profile(
        self, feedback_collector, sample_feedback, sample_adjustment_feedback
    ):
        """Test updating user profile based on feedback."""
        # Create profile
        profile = feedback_collector.create_user_profile(clerk_user_id="user_123456789")

        # Process rating feedback
        feedback_collector._update_user_profile(sample_feedback)

        # Check profile was updated
        profile = feedback_collector.get_user_profile("user_123456789")
        assert profile.feedback_count == 1
        assert "plugin_123" in profile.plugin_preferences
        assert profile.plugin_preferences["plugin_123"] > 0  # Positive rating

        # Process adjustment feedback
        feedback_collector._update_user_profile(sample_adjustment_feedback)

        # Check profile was updated
        profile = feedback_collector.get_user_profile("user_123456789")
        assert profile.feedback_count == 2
        assert "eq_plugin_123" in profile.eq_preferences

    def test_calculate_adjustment_magnitude(self, feedback_collector):
        """Test calculating adjustment magnitude."""
        # Test with empty parameters
        assert feedback_collector._calculate_adjustment_magnitude({}, {}) == 0.0

        # Test with non-numeric parameters
        assert (
            feedback_collector._calculate_adjustment_magnitude(
                {"name": "test"}, {"name": "test2"}
            )
            == 0.0
        )

        # Test with numeric parameters
        magnitude = feedback_collector._calculate_adjustment_magnitude(
            {"gain": 0.5, "freq": 1000.0}, {"gain": 0.7, "freq": 1200.0}
        )
        assert magnitude > 0.0  # Positive adjustment

        # Test with negative adjustment
        magnitude = feedback_collector._calculate_adjustment_magnitude(
            {"gain": 0.5, "freq": 1000.0}, {"gain": 0.3, "freq": 800.0}
        )
        assert magnitude < 0.0  # Negative adjustment

    def test_calculate_eq_adjustment(self, feedback_collector):
        """Test calculating EQ adjustment."""
        # Test with empty parameters
        assert feedback_collector._calculate_eq_adjustment(None, None) == 0.0

        # Test with EQ parameters
        adjustment = feedback_collector._calculate_eq_adjustment(
            {"low_gain": 2.0, "mid_gain": 0.0, "high_gain": -1.0},
            {"low_gain": 3.0, "mid_gain": 1.0, "high_gain": -2.0},
        )
        # Low and mid gain increased, high gain decreased
        assert adjustment != 0.0

        # Test with frequency parameters
        adjustment = feedback_collector._calculate_eq_adjustment(
            {"low_freq": 100.0, "high_freq": 10000.0},
            {"low_freq": 80.0, "high_freq": 12000.0},
        )
        # Low freq decreased, high freq increased
        assert adjustment != 0.0


class TestUserFeedback:
    """Tests for UserFeedback model."""

    def test_validation(self):
        """Test UserFeedback validation."""
        # Valid feedback
        feedback = UserFeedback(
            feedback_id="test_id",
            clerk_user_id="user_123",
            feedback_type=FeedbackType.RATING,
            category=FeedbackCategory.PLUGIN_SELECTION,
            target_id="plugin_123",
            target_type="plugin",
            rating=4.5,
        )
        assert feedback.feedback_id == "test_id"
        assert feedback.rating == 4.5

        # Invalid rating
        with pytest.raises(ValueError):
            UserFeedback(
                feedback_id="test_id",
                clerk_user_id="user_123",
                feedback_type=FeedbackType.RATING,
                category=FeedbackCategory.PLUGIN_SELECTION,
                target_id="plugin_123",
                target_type="plugin",
                rating=6.0,  # Invalid rating (> 5.0)
            )

        # Invalid feedback type
        with pytest.raises(ValueError):
            UserFeedback(
                feedback_id="test_id",
                clerk_user_id="user_123",
                feedback_type="invalid_type",  # Invalid type
                category=FeedbackCategory.PLUGIN_SELECTION,
                target_id="plugin_123",
                target_type="plugin",
            )

        # Invalid category
        with pytest.raises(ValueError):
            UserFeedback(
                feedback_id="test_id",
                clerk_user_id="user_123",
                feedback_type=FeedbackType.RATING,
                category="invalid_category",  # Invalid category
                target_id="plugin_123",
                target_type="plugin",
            )


class TestUserPreference:
    """Tests for UserPreference model."""

    def test_validation(self):
        """Test UserPreference validation."""
        # Valid preference
        preference = UserPreference(
            preference_id="test_id",
            clerk_user_id="user_123",
            category=FeedbackCategory.PLUGIN_SELECTION,
            target_type="plugin",
            target_id="plugin_123",
            preference_value=0.8,
            confidence=0.7,
        )
        assert preference.preference_id == "test_id"
        assert preference.preference_value == 0.8
        assert preference.confidence == 0.7

        # Invalid preference value
        with pytest.raises(ValueError):
            UserPreference(
                preference_id="test_id",
                clerk_user_id="user_123",
                category=FeedbackCategory.PLUGIN_SELECTION,
                target_type="plugin",
                target_id="plugin_123",
                preference_value=1.5,  # Invalid value (> 1.0)
            )

        # Invalid confidence
        with pytest.raises(ValueError):
            UserPreference(
                preference_id="test_id",
                clerk_user_id="user_123",
                category=FeedbackCategory.PLUGIN_SELECTION,
                target_type="plugin",
                target_id="plugin_123",
                preference_value=0.8,
                confidence=1.5,  # Invalid confidence (> 1.0)
            )


class TestUserProfile:
    """Tests for UserProfile model."""

    def test_validation(self):
        """Test UserProfile validation."""
        # Valid profile
        profile = UserProfile(
            clerk_user_id="user_123",
            display_name="Test User",
            email="test@example.com",
            experience_level="advanced",
            plugin_preferences={"plugin_123": 0.8},
            style_preferences={"rock": 0.9},
            feedback_count=10,
        )
        assert profile.clerk_user_id == "user_123"
        assert profile.display_name == "Test User"
        assert profile.experience_level == "advanced"
        assert profile.plugin_preferences["plugin_123"] == 0.8
        assert profile.style_preferences["rock"] == 0.9
        assert profile.feedback_count == 10
