"""Tests for plugin models."""

import pytest
from audio_agent.models.plugin import (
    PluginCategory,
    PluginChain,
    PluginFeatureVector,
    PluginFormat,
    PluginInstance,
    PluginMetadata,
    PluginParameter,
    PluginPreset,
    PluginRecommendation,
    PluginState,
)
from pydantic import ValidationError


class TestPluginParameter:
    """Test PluginParameter model validation."""

    def test_valid_plugin_parameter(self):
        """Test creation of valid plugin parameter."""
        param = PluginParameter(
            name="cutoff_freq",
            display_name="Cutoff Frequency",
            value=1000.0,
            min_value=20.0,
            max_value=20000.0,
            default_value=1000.0,
            unit="Hz",
            is_automatable=True,
            parameter_type="continuous",
        )
        assert param.name == "cutoff_freq"
        assert param.value == 1000.0
        assert param.normalized_value == pytest.approx(
            0.049, rel=1e-2
        )  # (1000-20)/(20000-20)

    def test_parameter_value_range_validation(self):
        """Test parameter value range validation."""
        with pytest.raises(ValidationError, match=r"outside range.*-12\.0.*12\.0"):
            PluginParameter(
                name="gain",
                display_name="Gain",
                value=15.0,  # Outside range
                min_value=-12.0,
                max_value=12.0,
                default_value=0.0,
            )

    def test_max_min_relationship(self):
        """Test max value > min value validation."""
        with pytest.raises(
            ValidationError, match="Max value 12.0 must be greater than min value 12.0"
        ):
            PluginParameter(
                name="gain",
                display_name="Gain",
                value=0.0,
                min_value=12.0,
                max_value=12.0,  # Equal to min
                default_value=0.0,
            )

    def test_normalized_value_calculation(self):
        """Test normalized value calculation."""
        param = PluginParameter(
            name="gain",
            display_name="Gain",
            value=6.0,
            min_value=-12.0,
            max_value=12.0,
            default_value=0.0,
        )
        assert param.normalized_value == 0.75  # (6-(-12))/(12-(-12)) = 18/24 = 0.75

    def test_set_normalized_value(self):
        """Test setting normalized value."""
        param = PluginParameter(
            name="gain",
            display_name="Gain",
            value=0.0,
            min_value=-12.0,
            max_value=12.0,
            default_value=0.0,
        )

        param.set_normalized_value(0.5)
        assert param.value == 0.0  # Middle of range

        param.set_normalized_value(1.0)
        assert param.value == 12.0  # Max value

        with pytest.raises(ValueError, match="must be between 0 and 1"):
            param.set_normalized_value(1.5)


class TestPluginPreset:
    """Test PluginPreset model validation."""

    def test_valid_plugin_preset(self):
        """Test creation of valid plugin preset."""
        preset = PluginPreset(
            name="Warm Lead",
            description="Warm analog-style lead sound",
            parameters={"cutoff": 2000.0, "resonance": 0.3, "attack": 0.1},
            tags=["lead", "warm", "analog"],
            author="Test User",
        )
        assert preset.name == "Warm Lead"
        assert len(preset.parameters) == 3
        assert "lead" in preset.tags

    def test_empty_parameters_validation(self):
        """Test empty parameters validation."""
        with pytest.raises(ValidationError, match="at least one parameter"):
            PluginPreset(
                name="Empty Preset",
                parameters={},  # Empty parameters not allowed
            )


class TestPluginMetadata:
    """Test PluginMetadata model validation."""

    def test_valid_plugin_metadata(self):
        """Test creation of valid plugin metadata."""
        metadata = PluginMetadata(
            name="Pro-Q 3",
            manufacturer="FabFilter",
            version="3.19",
            unique_id="fabfilter_proq3",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=64,
            cpu_usage_estimate=0.15,
            quality_rating=0.95,
        )
        assert metadata.name == "Pro-Q 3"
        assert metadata.category == PluginCategory.EQ
        assert metadata.format == PluginFormat.VST3

    def test_sample_rates_validation(self):
        """Test sample rates validation and normalization."""
        metadata = PluginMetadata(
            name="Test Plugin",
            manufacturer="Test Co",
            version="1.0",
            unique_id="test_plugin",
            category=PluginCategory.COMPRESSOR,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            supported_sample_rates=[48000, 44100, 48000, 96000],  # Duplicate 48000
        )
        # Should remove duplicates and sort
        assert metadata.supported_sample_rates == [44100, 48000, 96000]

    def test_invalid_sample_rate(self):
        """Test invalid sample rate validation."""
        with pytest.raises(ValidationError, match="outside reasonable range"):
            PluginMetadata(
                name="Test Plugin",
                manufacturer="Test Co",
                version="1.0",
                unique_id="test_plugin",
                category=PluginCategory.COMPRESSOR,
                format=PluginFormat.VST3,
                input_channels=2,
                output_channels=2,
                supported_sample_rates=[1000000],  # Too high
            )


class TestPluginInstance:
    """Test PluginInstance model validation."""

    def create_test_metadata(self):
        """Create test plugin metadata."""
        return PluginMetadata(
            name="Test EQ",
            manufacturer="Test Co",
            version="1.0",
            unique_id="test_eq",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=128,
        )

    def test_valid_plugin_instance(self):
        """Test creation of valid plugin instance."""
        metadata = self.create_test_metadata()
        instance = PluginInstance(
            instance_id="eq_instance_1",
            plugin_metadata=metadata,
            state=PluginState.ACTIVE,
            parameters={
                "gain": PluginParameter(
                    name="gain",
                    display_name="Gain",
                    value=0.0,
                    min_value=-12.0,
                    max_value=12.0,
                    default_value=0.0,
                )
            },
        )
        assert instance.instance_id == "eq_instance_1"
        assert instance.is_active
        assert instance.latency_ms == pytest.approx(2.67, rel=1e-2)  # 128/48000*1000

    def test_parameter_operations(self):
        """Test parameter get/set operations."""
        metadata = self.create_test_metadata()
        instance = PluginInstance(
            instance_id="eq_instance_1",
            plugin_metadata=metadata,
            parameters={
                "gain": PluginParameter(
                    name="gain",
                    display_name="Gain",
                    value=0.0,
                    min_value=-12.0,
                    max_value=12.0,
                    default_value=0.0,
                )
            },
        )

        # Get parameter value
        assert instance.get_parameter_value("gain") == 0.0
        assert instance.get_parameter_value("nonexistent") is None

        # Set parameter value
        assert instance.set_parameter_value("gain", 6.0)
        assert instance.get_parameter_value("gain") == 6.0

        # Set invalid parameter value
        assert not instance.set_parameter_value("gain", 20.0)  # Outside range
        assert not instance.set_parameter_value("nonexistent", 5.0)  # Doesn't exist

    def test_preset_loading(self):
        """Test preset loading functionality."""
        metadata = self.create_test_metadata()
        preset = PluginPreset(
            name="Test Preset", parameters={"gain": 3.0, "freq": 1000.0}
        )

        instance = PluginInstance(
            instance_id="eq_instance_1",
            plugin_metadata=metadata,
            parameters={
                "gain": PluginParameter(
                    name="gain",
                    display_name="Gain",
                    value=0.0,
                    min_value=-12.0,
                    max_value=12.0,
                    default_value=0.0,
                ),
                "freq": PluginParameter(
                    name="freq",
                    display_name="Frequency",
                    value=500.0,
                    min_value=20.0,
                    max_value=20000.0,
                    default_value=1000.0,
                ),
            },
            available_presets=[preset],
        )

        # Load preset
        assert instance.load_preset("Test Preset")
        assert instance.get_parameter_value("gain") == 3.0
        assert instance.get_parameter_value("freq") == 1000.0
        assert instance.current_preset == "Test Preset"

        # Try to load non-existent preset
        assert not instance.load_preset("Nonexistent Preset")


class TestPluginRecommendation:
    """Test PluginRecommendation model validation."""

    def test_valid_plugin_recommendation(self):
        """Test creation of valid plugin recommendation."""
        recommendation = PluginRecommendation(
            recommendation_id="rec_001",
            clerk_user_id="user_123",
            plugin_name="Pro-Q 3",
            plugin_category="eq",
            reason="Excellent EQ for surgical frequency adjustments",
            confidence=0.85,
            relevance_score=0.9,
            reasoning="Excellent EQ for surgical frequency adjustments with transparent sound quality",
            style_context="electronic",
            audio_context="Bright mix needing high-frequency control",
            alternative_plugins=["Neutron EQ", "Waves Q10"],
            recommender_agent="eq_specialist",
        )
        assert recommendation.plugin_name == "Pro-Q 3"
        assert recommendation.overall_score == pytest.approx(
            0.87, rel=1e-2
        )  # 0.85*0.6 + 0.9*0.4

    def test_reasoning_validation(self):
        """Test reasoning quality validation."""
        # Valid reasoning
        recommendation = PluginRecommendation(
            recommendation_id="rec_002",
            clerk_user_id="user_123",
            plugin_name="Test Plugin",
            plugin_category="eq",
            reason="Excellent frequency control for current mix",
            confidence=0.8,
            relevance_score=0.8,
            reasoning="This plugin provides excellent frequency control for the current mix",
            style_context="rock",
            recommender_agent="test_agent",
        )
        assert len(recommendation.reasoning) > 10

        # Too short reasoning
        with pytest.raises(ValidationError, match="at least 10 characters"):
            PluginRecommendation(
                recommendation_id="rec_003",
                clerk_user_id="user_123",
                plugin_name="Test Plugin",
                plugin_category=PluginCategory.EQ,
                plugin_format=PluginFormat.VST3,
                confidence=0.8,
                relevance_score=0.8,
                reasoning="Too short",  # Too short
                style_context="rock",
                recommender_agent="test_agent",
            )

        # Placeholder text
        with pytest.raises(ValidationError, match="placeholder text"):
            PluginRecommendation(
                recommendation_id="rec_004",
                clerk_user_id="user_123",
                plugin_name="Test Plugin",
                plugin_category=PluginCategory.EQ,
                plugin_format=PluginFormat.VST3,
                confidence=0.8,
                relevance_score=0.8,
                reasoning="This is a placeholder text for testing",
                style_context="rock",
                recommender_agent="test_agent",
            )


class TestPluginFeatureVector:
    """Test PluginFeatureVector model validation."""

    def test_valid_plugin_feature_vector(self):
        """Test creation of valid plugin feature vector."""
        metadata = PluginMetadata(
            name="Test EQ",
            manufacturer="Test Co",
            version="1.0",
            unique_id="test_eq",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
        )

        vector = PluginFeatureVector(
            plugin_id="test_eq_001",
            plugin_metadata=metadata,
            frequency_response=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
            harmonic_character=[0.1, 0.2, 0.3, 0.4, 0.5],
            dynamic_behavior=[0.2, 0.4, 0.6, 0.8, 1.0],
            spatial_properties=[0.3, 0.6, 0.9],
            ease_of_use=0.8,
            preset_quality=0.7,
            feature_vector=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        )
        assert vector.plugin_id == "test_eq_001"
        assert vector.vector_dimension == 10

    def test_affinity_scores_validation(self):
        """Test affinity scores validation."""
        metadata = PluginMetadata(
            name="Test EQ",
            manufacturer="Test Co",
            version="1.0",
            unique_id="test_eq",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
        )

        with pytest.raises(ValidationError, match="must be between 0 and 1"):
            PluginFeatureVector(
                plugin_id="test_eq_001",
                plugin_metadata=metadata,
                frequency_response=[0.1] * 10,
                harmonic_character=[0.1] * 5,
                dynamic_behavior=[0.1] * 5,
                spatial_properties=[0.1] * 3,
                ease_of_use=0.8,
                preset_quality=0.7,
                genre_affinity={"rock": 1.5},  # Invalid score > 1.0
                feature_vector=[0.1] * 10,
            )

    def test_embedding_vector_validation(self):
        """Test embedding vector validation."""
        metadata = PluginMetadata(
            name="Test EQ",
            manufacturer="Test Co",
            version="1.0",
            unique_id="test_eq",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
        )

        with pytest.raises(ValidationError, match="List should have at least 10 items"):
            PluginFeatureVector(
                plugin_id="test_eq_001",
                plugin_metadata=metadata,
                frequency_response=[0.1, 0.2, 15.0],  # Value outside [-10, 10] range
                harmonic_character=[0.1] * 5,
                dynamic_behavior=[0.1] * 5,
                spatial_properties=[0.1] * 3,
                ease_of_use=0.8,
                preset_quality=0.7,
                feature_vector=[0.1] * 10,
            )


class TestPluginChain:
    """Test PluginChain model validation."""

    def create_test_plugin_instance(self, instance_id: str):
        """Create test plugin instance."""
        metadata = PluginMetadata(
            name=f"Test Plugin {instance_id}",
            manufacturer="Test Co",
            version="1.0",
            unique_id=f"test_plugin_{instance_id}",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=64,
        )

        return PluginInstance(
            instance_id=instance_id,
            plugin_metadata=metadata,
            state=PluginState.ACTIVE,
            cpu_usage=0.1,
        )

    def test_valid_plugin_chain(self):
        """Test creation of valid plugin chain."""
        plugin1 = self.create_test_plugin_instance("eq1")
        plugin2 = self.create_test_plugin_instance("comp1")

        chain = PluginChain(
            chain_id="master_chain",
            name="Master Chain",
            plugins=[plugin1, plugin2],
            input_gain=1.0,
            output_gain=0.8,
        )
        assert chain.chain_id == "master_chain"
        assert len(chain.plugins) == 2
        assert chain.total_latency_samples == 128  # 64 + 64
        assert chain.estimated_cpu_usage == 0.2  # 0.1 + 0.1

    def test_active_plugins_filtering(self):
        """Test active plugins filtering."""
        plugin1 = self.create_test_plugin_instance("eq1")
        plugin2 = self.create_test_plugin_instance("comp1")
        plugin2.is_bypassed = True  # Bypass second plugin

        chain = PluginChain(
            chain_id="test_chain", name="Test Chain", plugins=[plugin1, plugin2]
        )

        active_plugins = chain.get_active_plugins()
        assert len(active_plugins) == 1
        assert active_plugins[0].instance_id == "eq1"

    def test_chain_bypass_operations(self):
        """Test chain bypass operations."""
        plugin1 = self.create_test_plugin_instance("eq1")
        plugin2 = self.create_test_plugin_instance("comp1")

        chain = PluginChain(
            chain_id="test_chain", name="Test Chain", plugins=[plugin1, plugin2]
        )

        # Initially both plugins should be active
        assert all(not p.is_bypassed for p in chain.plugins)

        # Bypass all plugins
        chain.bypass_all()
        assert all(p.is_bypassed for p in chain.plugins)

        # Activate all plugins
        chain.activate_all()
        assert all(not p.is_bypassed for p in chain.plugins)
        assert all(p.state == PluginState.ACTIVE for p in chain.plugins)

    def test_gain_validation(self):
        """Test input/output gain validation."""
        plugin1 = self.create_test_plugin_instance("eq1")

        # Valid gain values
        chain = PluginChain(
            chain_id="test_chain",
            name="Test Chain",
            plugins=[plugin1],
            input_gain=2.0,
            output_gain=0.5,
        )
        assert chain.input_gain == 2.0
        assert chain.output_gain == 0.5

        # Invalid gain values
        with pytest.raises(ValidationError, match="should be less than or equal to 4"):
            PluginChain(
                chain_id="test_chain",
                name="Test Chain",
                plugins=[plugin1],
                input_gain=5.0,  # Too high
            )
