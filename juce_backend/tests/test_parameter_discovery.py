"""
Comprehensive tests for the enhanced parameter discovery and mapping system.

Tests parameter pattern matching, validation, discovery results,
and integration with the advanced plugin manager.
"""

from unittest.mock import Mock

import pytest
from audio_agent.core.advanced_plugin_management import AdvancedPluginManager
from audio_agent.core.parameter_discovery import (
    ParameterDiscoverySystem,
    ParameterMetadata,
    ParameterPatternMatcher,
    ParameterType,
    ParameterUnit,
)
from audio_agent.core.parameter_validation import (
    ParameterValidator,
)
from audio_agent.engine.client import EngineClient
from audio_agent.models.plugin import PluginCategory, PluginFormat, PluginMetadata


class TestParameterPatternMatcher:
    """Test the parameter pattern matching system."""

    def test_volume_parameter_matching(self):
        """Test volume/gain parameter pattern matching."""
        matcher = ParameterPatternMatcher()

        # Test various volume parameter names
        volume_params = ["volume", "gain", "gain1", "output", "level", "loudness"]

        for param_name in volume_params:
            metadata = matcher.match_parameter_pattern(param_name)
            assert metadata is not None, f"Should match volume parameter: {param_name}"
            assert metadata["display_name"] == "Volume"
            assert metadata["unit"] == ParameterUnit.DECIBELS
            assert metadata["category"] == "gain"

    def test_frequency_parameter_matching(self):
        """Test frequency parameter pattern matching."""
        matcher = ParameterPatternMatcher()

        # Test frequency parameter names
        freq_params = ["frequency", "freq", "cutoff", "fc", "center_freq"]

        for param_name in freq_params:
            metadata = matcher.match_parameter_pattern(param_name)
            assert (
                metadata is not None
            ), f"Should match frequency parameter: {param_name}"
            assert "Frequency" in metadata["display_name"]
            assert metadata["unit"] == ParameterUnit.HERZ
            assert metadata["category"] == "frequency"

    def test_envelope_parameter_matching(self):
        """Test envelope parameter pattern matching."""
        matcher = ParameterPatternMatcher()

        # Test envelope parameters
        attack_metadata = matcher.match_parameter_pattern("attack")
        assert attack_metadata is not None
        assert attack_metadata["display_name"] == "Attack"
        assert attack_metadata["unit"] == ParameterUnit.MILLISECONDS
        assert attack_metadata["category"] == "envelope"

        release_metadata = matcher.match_parameter_pattern("release")
        assert release_metadata is not None
        assert release_metadata["display_name"] == "Release"
        assert release_metadata["unit"] == ParameterUnit.MILLISECONDS

    def test_boolean_parameter_matching(self):
        """Test boolean parameter pattern matching."""
        matcher = ParameterPatternMatcher()

        # Test boolean parameters
        boolean_params = ["bypass", "enable", "on", "off", "mute", "solo"]

        for param_name in boolean_params:
            metadata = matcher.match_parameter_pattern(param_name)
            assert metadata is not None, f"Should match boolean parameter: {param_name}"
            assert metadata["parameter_type"] == ParameterType.BOOLEAN
            assert metadata["min_value"] == 0.0
            assert metadata["max_value"] == 1.0

    def test_unit_inference(self):
        """Test unit inference from parameter names and ranges."""
        matcher = ParameterPatternMatcher()

        # Test frequency unit inference
        unit = matcher.infer_unit_from_name("cutoff_freq", (20.0, 20000.0))
        assert unit == ParameterUnit.HERZ

        # Test percentage unit inference
        unit = matcher.infer_unit_from_name("mix_percent", (0.0, 100.0))
        assert unit == ParameterUnit.PERCENT

        # Test dB unit inference
        unit = matcher.infer_unit_from_name("threshold_db", (-60.0, 0.0))
        assert unit == ParameterUnit.DECIBELS

        # Test time unit inference
        unit = matcher.infer_unit_from_name("delay_time", (0.1, 5000.0))
        assert unit == ParameterUnit.MILLISECONDS

    def test_no_pattern_match(self):
        """Test behavior when no pattern matches."""
        matcher = ParameterPatternMatcher()

        # Test parameter that doesn't match any pattern
        metadata = matcher.match_parameter_pattern("unknown_param_xyz")
        assert metadata is None

        # Test unit inference fallback
        unit = matcher.infer_unit_from_name("unknown_param", (0.0, 1.0))
        assert unit == ParameterUnit.NONE


class TestParameterDiscoverySystem:
    """Test the parameter discovery system."""

    @pytest.fixture
    def mock_engine(self):
        """Create a mock engine client."""
        engine = Mock(spec=EngineClient)
        return engine

    @pytest.fixture
    def discovery_system(self, mock_engine):
        """Create a parameter discovery system with mock engine."""
        return ParameterDiscoverySystem(mock_engine)

    @pytest.fixture
    def sample_plugin_metadata(self):
        """Create sample plugin metadata."""
        return PluginMetadata(
            name="Test Plugin",
            manufacturer="Test Manufacturer",
            version="1.0.0",
            unique_id="test_plugin_123",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
        )

    def test_vst3_parameter_discovery_success(
        self, discovery_system, mock_engine, sample_plugin_metadata
    ):
        """Test successful VST3 parameter discovery."""
        # Mock processor config
        mock_processor_config = Mock()
        mock_processor_config.parameters = {
            "plugin_path": "/path/to/test.vst3",
            "frequency": 1000.0,
            "gain": 0.0,
            "q": 1.0,
            "bypass": 0.0,
        }
        mock_engine.get_processor_config.return_value = mock_processor_config
        mock_engine.get_processor_parameter.return_value = 1000.0

        # Perform discovery
        result = discovery_system.discover_plugin_parameters(
            plugin_path="/path/to/test.vst3",
            instance_id="test_instance",
            plugin_metadata=sample_plugin_metadata,
        )

        # Verify result
        assert result.success
        assert result.parameter_count > 0
        assert result.plugin_format == PluginFormat.VST3
        assert "frequency" in result.parameters
        assert "gain" in result.parameters

        # Check frequency parameter metadata
        freq_param = result.parameters["frequency"]
        assert freq_param.display_name == "Frequency"
        assert freq_param.unit == ParameterUnit.HERZ
        assert freq_param.category == "frequency"

        # Check gain parameter metadata
        gain_param = result.parameters["gain"]
        assert gain_param.display_name == "Volume"
        assert gain_param.unit == ParameterUnit.DECIBELS
        assert gain_param.category == "gain"

    def test_parameter_discovery_with_no_processor_config(
        self, discovery_system, mock_engine, sample_plugin_metadata
    ):
        """Test parameter discovery when processor config is unavailable."""
        mock_engine.get_processor_config.return_value = None

        result = discovery_system.discover_plugin_parameters(
            plugin_path="/path/to/test.vst3",
            instance_id="test_instance",
            plugin_metadata=sample_plugin_metadata,
        )

        assert not result.success
        assert result.error_message is not None
        assert result.parameter_count == 0

    def test_parameter_discovery_with_no_plugin_path(
        self, discovery_system, mock_engine, sample_plugin_metadata
    ):
        """Test parameter discovery when plugin path is missing."""
        mock_processor_config = Mock()
        mock_processor_config.parameters = {}  # No plugin_path
        mock_engine.get_processor_config.return_value = mock_processor_config

        result = discovery_system.discover_plugin_parameters(
            plugin_path="/path/to/test.vst3",
            instance_id="test_instance",
            plugin_metadata=sample_plugin_metadata,
        )

        assert not result.success
        assert "plugin path" in result.error_message.lower()

    def test_parameter_group_creation(self, discovery_system):
        """Test parameter group creation."""
        # Create sample parameters with different categories
        parameters = {
            "frequency": ParameterMetadata(
                parameter_id="frequency",
                name="frequency",
                display_name="Frequency",
                value=1000.0,
                default_value=1000.0,
                min_value=20.0,
                max_value=20000.0,
                normalized_value=0.05,
                normalized_default=0.05,
                category="frequency",
            ),
            "gain": ParameterMetadata(
                parameter_id="gain",
                name="gain",
                display_name="Gain",
                value=0.0,
                default_value=0.0,
                min_value=-20.0,
                max_value=20.0,
                normalized_value=0.5,
                normalized_default=0.5,
                category="gain",
            ),
            "attack": ParameterMetadata(
                parameter_id="attack",
                name="attack",
                display_name="Attack",
                value=10.0,
                default_value=10.0,
                min_value=0.1,
                max_value=1000.0,
                normalized_value=0.01,
                normalized_default=0.01,
                category="envelope",
            ),
            "release": ParameterMetadata(
                parameter_id="release",
                name="release",
                display_name="Release",
                value=100.0,
                default_value=100.0,
                min_value=10.0,
                max_value=5000.0,
                normalized_value=0.018,
                normalized_default=0.018,
                category="envelope",
            ),
        }

        groups = discovery_system._create_parameter_groups(parameters)

        # Should create groups for categories with multiple parameters
        assert "envelope_group" in groups
        assert len(groups["envelope_group"].parameters) == 2
        assert "attack" in groups["envelope_group"].parameters
        assert "release" in groups["envelope_group"].parameters

        # Should not create groups for single parameters
        assert "frequency_group" not in groups
        assert "gain_group" not in groups

    def test_value_normalization(self, discovery_system):
        """Test value normalization and denormalization."""
        # Test normalizing values
        normalized = discovery_system._normalize_value(50.0, 0.0, 100.0)
        assert normalized == 0.5

        normalized = discovery_system._normalize_value(-10.0, -20.0, 20.0)
        assert normalized == 0.25

        # Test denormalizing values
        denormalized = discovery_system.denormalize_value(0.5, 0.0, 100.0)
        assert denormalized == 50.0

        denormalized = discovery_system.denormalize_value(0.25, -20.0, 20.0)
        assert denormalized == -10.0

    def test_automation_curve_suggestions(self, discovery_system):
        """Test automation curve suggestions."""
        # Boolean parameter
        bool_param = ParameterMetadata(
            parameter_id="bypass",
            name="bypass",
            display_name="Bypass",
            value=0.0,
            default_value=0.0,
            min_value=0.0,
            max_value=1.0,
            parameter_type=ParameterType.BOOLEAN,
            normalized_value=0.0,
            normalized_default=0.0,
        )
        curves = discovery_system.suggest_automation_curves(bool_param)
        assert "step" in curves

        # Frequency parameter
        freq_param = ParameterMetadata(
            parameter_id="frequency",
            name="frequency",
            display_name="Frequency",
            value=1000.0,
            default_value=1000.0,
            min_value=20.0,
            max_value=20000.0,
            unit=ParameterUnit.HERZ,
            normalized_value=0.05,
            normalized_default=0.05,
        )
        curves = discovery_system.suggest_automation_curves(freq_param)
        assert "logarithmic" in curves

        # dB parameter
        db_param = ParameterMetadata(
            parameter_id="gain",
            name="gain",
            display_name="Gain",
            value=0.0,
            default_value=0.0,
            min_value=-20.0,
            max_value=20.0,
            unit=ParameterUnit.DECIBELS,
            normalized_value=0.5,
            normalized_default=0.5,
        )
        curves = discovery_system.suggest_automation_curves(db_param)
        assert "linear" in curves


class TestParameterValidator:
    """Test the parameter validation system."""

    @pytest.fixture
    def validator(self):
        """Create a parameter validator."""
        return ParameterValidator()

    def test_valid_parameter_validation(self, validator):
        """Test validation of valid parameters."""
        # Create valid parameters
        parameters = {
            "frequency": ParameterMetadata(
                parameter_id="frequency",
                name="frequency",
                display_name="Frequency",
                value=1000.0,
                default_value=1000.0,
                min_value=20.0,
                max_value=20000.0,
                normalized_value=0.05,
                normalized_default=0.05,
            ),
            "gain": ParameterMetadata(
                parameter_id="gain",
                name="gain",
                display_name="Gain",
                value=0.0,
                default_value=0.0,
                min_value=-20.0,
                max_value=20.0,
                normalized_value=0.5,
                normalized_default=0.5,
            ),
        }

        result = validator.validate_parameters(parameters)

        assert result.is_valid
        assert len(result.issues) == 0
        assert result.errors_count == 0
        assert result.warnings_count == 0

    def test_invalid_range_validation(self, validator):
        """Test validation of parameters with invalid ranges."""
        # Create parameters with invalid ranges
        parameters = {
            "bad_param": ParameterMetadata(
                parameter_id="bad_param",
                name="bad_param",
                display_name="Bad Parameter",
                value=5.0,
                default_value=10.0,
                min_value=10.0,  # Min > Max
                max_value=5.0,
                normalized_value=1.5,  # Outside 0-1 range
                normalized_default=0.5,
            )
        }

        result = validator.validate_parameters(parameters)

        assert not result.is_valid
        assert result.errors_count > 0

        # Check for specific issues
        issue_types = [issue.issue_type for issue in result.issues]
        assert "invalid_range" in issue_types
        assert "default_out_of_range" in issue_types
        assert "invalid_normalized_value" in issue_types

    def test_boolean_parameter_validation(self, validator):
        """Test validation of boolean parameters."""
        # Create boolean parameter with invalid range
        parameters = {
            "bad_bypass": ParameterMetadata(
                parameter_id="bad_bypass",
                name="bad_bypass",
                display_name="Bypass",
                value=0.5,
                default_value=0.0,
                min_value=0.0,
                max_value=2.0,  # Should be 0-1 for boolean
                parameter_type=ParameterType.BOOLEAN,
                normalized_value=0.25,
                normalized_default=0.0,
            )
        }

        result = validator.validate_parameters(parameters)

        assert not result.is_valid

        # Check for boolean-specific issue
        issue_types = [issue.issue_type for issue in result.issues]
        assert "boolean_invalid_range" in issue_types

    def test_suspicious_range_detection(self, validator):
        """Test detection of suspicious parameter ranges."""
        # Create parameters with suspicious ranges
        parameters = {
            "huge_range": ParameterMetadata(
                parameter_id="huge_range",
                name="huge_range",
                display_name="Huge Range",
                value=500000.0,
                default_value=0.0,
                min_value=-1000000.0,
                max_value=1000000.0,
                normalized_value=0.75,
                normalized_default=0.5,
            ),
            "tiny_range": ParameterMetadata(
                parameter_id="tiny_range",
                name="tiny_range",
                display_name="Tiny Range",
                value=0.0005,
                default_value=0.001,
                min_value=0.001,
                max_value=0.002,
                normalized_value=0.5,
                normalized_default=1.0,
            ),
        }

        # Use strict mode to catch suspicious ranges
        result = validator.validate_parameters(parameters, strict_mode=True)

        # Should have warnings for suspicious ranges
        assert result.warnings_count > 0

        issue_types = [issue.issue_type for issue in result.issues]
        assert "suspicious_large_range" in issue_types
        assert "suspicious_small_range" in issue_types

    def test_parameter_constraints(self, validator):
        """Test parameter constraint validation."""
        # Create parameters that might violate constraints
        parameters = {
            "gain1": ParameterMetadata(
                parameter_id="gain1",
                name="gain1",
                display_name="Gain 1",
                value=5.0,
                default_value=0.0,
                min_value=-20.0,
                max_value=20.0,
                unit=ParameterUnit.DECIBELS,
                normalized_value=0.625,
                normalized_default=0.5,
            ),
            "gain2": ParameterMetadata(
                parameter_id="gain2",
                name="gain2",
                display_name="Gain 2",
                value=3.0,
                default_value=0.0,
                min_value=-20.0,
                max_value=20.0,
                unit=ParameterUnit.DECIBELS,
                normalized_value=0.575,
                normalized_default=0.5,
            ),
            "gain3": ParameterMetadata(
                parameter_id="gain3",
                name="gain3",
                display_name="Gain 3",
                value=2.0,
                default_value=0.0,
                min_value=-20.0,
                max_value=20.0,
                unit=ParameterUnit.DECIBELS,
                normalized_value=0.55,
                normalized_default=0.5,
            ),
            "gain4": ParameterMetadata(
                parameter_id="gain4",
                name="gain4",
                display_name="Gain 4",
                value=1.0,
                default_value=0.0,
                min_value=-20.0,
                max_value=20.0,
                unit=ParameterUnit.DECIBELS,
                normalized_value=0.525,
                normalized_default=0.5,
            ),
        }

        result = validator.validate_parameters(parameters, strict_mode=True)

        # Should detect too many gain stages
        issue_types = [issue.issue_type for issue in result.issues]
        assert "too_many_gain_stages" in issue_types

    def test_auto_correction(self, validator):
        """Test automatic parameter correction."""
        # Create parameters that need correction
        parameters = {
            "out_of_range": ParameterMetadata(
                parameter_id="out_of_range",
                name="out_of_range",
                display_name="Out of Range",
                value=150.0,  # Outside range
                default_value=50.0,
                min_value=0.0,
                max_value=100.0,
                normalized_value=1.5,
                normalized_default=0.5,
            )
        }

        result = validator.validate_parameters(parameters, auto_correct=True)

        # Should have corrections
        assert len(result.corrected_parameters) > 0
        assert "out_of_range" in result.corrected_parameters

        # Corrected value should be clamped to valid range
        corrected_value = result.corrected_parameters["out_of_range"]
        assert 0.0 <= corrected_value <= 100.0


class TestAdvancedPluginManagerIntegration:
    """Test integration with AdvancedPluginManager."""

    @pytest.fixture
    def mock_engine(self):
        """Create a mock engine client."""
        engine = Mock(spec=EngineClient)
        return engine

    @pytest.fixture
    def plugin_manager(self, mock_engine):
        """Create an AdvancedPluginManager with mock engine."""
        return AdvancedPluginManager(mock_engine)

    def test_enhanced_parameter_metadata_retrieval(self, plugin_manager, mock_engine):
        """Test retrieval of enhanced parameter metadata."""
        # Mock processor config
        mock_processor_config = Mock()
        mock_processor_config.parameters = {
            "plugin_path": "/path/to/test.vst3",
            "frequency": 1000.0,
            "gain": 0.0,
        }
        mock_engine.get_processor_config.return_value = mock_processor_config
        mock_engine.get_processor_parameter.return_value = 1000.0

        # Create mock plugin instance
        from audio_agent.models.plugin import PluginInstance, PluginState

        plugin_metadata = PluginMetadata(
            name="Test Plugin",
            manufacturer="Test",
            version="1.0.0",
            unique_id="test_123",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
        )
        plugin_instance = PluginInstance(
            instance_id="test_instance",
            plugin_metadata=plugin_metadata,
            state=PluginState.LOADED,
            parameters={},
        )

        # Add to manager
        plugin_manager._plugin_instances["test_instance"] = plugin_instance

        # Get enhanced metadata
        metadata = plugin_manager.get_enhanced_parameter_metadata("test_instance")

        assert metadata is not None
        assert "parameters" in metadata
        assert "groups" in metadata
        assert "discovery_info" in metadata

        # Check parameter structure
        assert "frequency" in metadata["parameters"]
        freq_param = metadata["parameters"]["frequency"]
        assert "display_name" in freq_param
        assert "unit" in freq_param
        assert "category" in freq_param

    def test_parameter_validation_integration(self, plugin_manager, mock_engine):
        """Test parameter validation integration."""
        # Mock processor config
        mock_processor_config = Mock()
        mock_processor_config.parameters = {
            "plugin_path": "/path/to/test.vst3",
            "frequency": 1000.0,
            "gain": 0.0,
        }
        mock_engine.get_processor_config.return_value = mock_processor_config
        mock_engine.get_processor_parameter.return_value = 1000.0

        # Create mock plugin instance
        from audio_agent.models.plugin import PluginInstance, PluginState

        plugin_metadata = PluginMetadata(
            name="Test Plugin",
            manufacturer="Test",
            version="1.0.0",
            unique_id="test_123",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
        )
        plugin_instance = PluginInstance(
            instance_id="test_instance",
            plugin_metadata=plugin_metadata,
            state=PluginState.LOADED,
            parameters={},
        )

        # Add to manager
        plugin_manager._plugin_instances["test_instance"] = plugin_instance

        # Validate parameters
        validation_result = plugin_manager.validate_plugin_parameters("test_instance")

        assert validation_result is not None
        assert "is_valid" in validation_result
        assert "issues" in validation_result
        assert "summary" in validation_result

    def test_enhanced_parameter_discovery_integration(
        self, plugin_manager, mock_engine
    ):
        """Test that enhanced parameter discovery is used during plugin loading."""
        # Mock engine methods
        mock_engine.create_plugin_processor.return_value = None
        mock_processor_config = Mock()
        mock_processor_config.parameters = {
            "plugin_path": "/path/to/test.vst3",
            "frequency": 1000.0,
            "gain": 0.0,
            "bypass": 0.0,
        }
        mock_engine.get_processor_config.return_value = mock_processor_config
        mock_engine.get_processor_parameter.return_value = 1000.0

        # Load plugin (this should trigger enhanced parameter discovery)
        plugin_metadata = PluginMetadata(
            name="Test Plugin",
            manufacturer="Test",
            version="1.0.0",
            unique_id="test_123",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
        )

        plugin_instance = plugin_manager.load_plugin(
            plugin_path="/path/to/test.vst3",
            instance_id="test_instance",
            plugin_metadata=plugin_metadata,
        )

        # Verify plugin was loaded with discovered parameters
        assert plugin_instance is not None
        assert len(plugin_instance.parameters) > 0

        # Check that pattern matching worked
        param_names = list(plugin_instance.parameters.keys())
        assert any("frequency" in name for name in param_names)
        assert any("gain" in name for name in param_names)


if __name__ == "__main__":
    pytest.main([__file__])
