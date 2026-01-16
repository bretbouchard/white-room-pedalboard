"""Tests for project management models."""

import json
import tempfile
from pathlib import Path

import pytest
from audio_agent.models.composition import CompositionContext
from audio_agent.models.project import AudioAgentProject
from audio_agent.models.user import UserPreferences
from pydantic import ValidationError


class TestAudioAgentProject:
    """Test AudioAgentProject model validation."""

    def test_valid_project(self):
        """Test creation of valid project."""
        composition = CompositionContext(
            tempo=120.0,
            key_signature="C",
            time_signature={"numerator": 4, "denominator": 4},
            style="classical",
        )

        project = AudioAgentProject(
            version="1.0.0",
            composition_context=composition,
            mixing_console_state={"master_volume": 0.0},
            user_preferences=None,
        )

        assert project.version == "1.0.0"
        assert project.composition_context.tempo == 120.0
        assert project.mixing_console_state == {"master_volume": 0.0}
        assert project.user_preferences is None

    def test_project_with_user_preferences(self):
        """Test project with user preferences."""
        composition = CompositionContext(
            tempo=120.0,
            key_signature="C",
            time_signature={"numerator": 4, "denominator": 4},
            style="classical",
        )

        user_prefs = UserPreferences(
            clerk_user_id="user_123",
            plugin_preferences=None,
            mixing_preferences=None,
            learning_preferences=None,
            audio_quality_preference=None,
        )

        project = AudioAgentProject(
            version="1.0.0",
            composition_context=composition,
            mixing_console_state={"master_volume": -6.0},
            user_preferences=user_prefs,
        )

        assert project.user_preferences is not None
        assert project.user_preferences.clerk_user_id == "user_123"

    def test_project_serialization(self):
        """Test project JSON serialization."""
        composition = CompositionContext(
            tempo=120.0,
            key_signature="C",
            time_signature={"numerator": 4, "denominator": 4},
            style="classical",
        )

        project = AudioAgentProject(
            version="1.0.0",
            composition_context=composition,
            mixing_console_state={
                "master_volume": -6.0,
                "channels": [
                    {"name": "Piano", "volume": -6.0, "pan": 0.0, "plugins": []}
                ],
            },
            user_preferences=None,
        )

        # Test JSON serialization
        json_str = project.model_dump_json(indent=2)
        assert json_str is not None

        # Test JSON deserialization
        parsed_project = AudioAgentProject.model_validate_json(json_str)
        assert parsed_project.version == "1.0.0"
        assert parsed_project.composition_context.tempo == 120.0

    def test_project_file_roundtrip(self):
        """Test saving and loading project from file."""
        composition = CompositionContext(
            tempo=120.0,
            key_signature="C",
            time_signature={"numerator": 4, "denominator": 4},
            style="classical",
        )

        original_project = AudioAgentProject(
            version="1.0.0",
            composition_context=composition,
            mixing_console_state={"master_volume": -6.0},
            user_preferences=None,
        )

        # Save to temporary file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".schill", delete=False) as f:
            json.dump(original_project.model_dump(), f, indent=2)
            temp_path = Path(f.name)

        try:
            # Load from file
            with open(temp_path) as f:
                data = json.load(f)

            loaded_project = AudioAgentProject.model_validate(data)

            # Verify roundtrip
            assert loaded_project.version == original_project.version
            assert (
                loaded_project.composition_context.tempo
                == original_project.composition_context.tempo
            )
            assert (
                loaded_project.mixing_console_state
                == original_project.mixing_console_state
            )

        finally:
            # Clean up
            temp_path.unlink()

    def test_invalid_project_missing_composition(self):
        """Test validation error for missing composition context."""
        with pytest.raises(ValidationError) as exc_info:
            AudioAgentProject(
                version="1.0.0",
                # Missing composition_context
                mixing_console_state={},
                user_preferences=None,
            )

        assert "composition_context" in str(exc_info.value)

    def test_project_extra_fields_forbidden(self):
        """Test that extra fields are forbidden."""
        composition = CompositionContext(
            tempo=120.0,
            key_signature="C",
            time_signature={"numerator": 4, "denominator": 4},
            style="classical",
        )

        with pytest.raises(ValidationError) as exc_info:
            AudioAgentProject(
                version="1.0.0",
                composition_context=composition,
                mixing_console_state={},
                user_preferences=None,
                extra_field="not_allowed",  # Extra field should cause error
            )

        assert "extra" in str(exc_info.value)

    def test_project_default_version(self):
        """Test default version field."""
        composition = CompositionContext(
            tempo=120.0,
            key_signature="C",
            time_signature={"numerator": 4, "denominator": 4},
            style="classical",
        )

        project = AudioAgentProject(
            # No version specified - should use default
            composition_context=composition,
            mixing_console_state={},
            user_preferences=None,
        )

        assert project.version == "1.0.0"

    def test_project_empty_mixing_console(self):
        """Test project with empty mixing console state."""
        composition = CompositionContext(
            tempo=120.0,
            key_signature="C",
            time_signature={"numerator": 4, "denominator": 4},
            style="classical",
        )

        project = AudioAgentProject(
            composition_context=composition,
            # No mixing_console_state specified - should default to empty dict
            user_preferences=None,
        )

        assert project.mixing_console_state == {}
