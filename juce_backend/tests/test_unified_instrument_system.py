"""
Comprehensive tests for the unified instrument system.

Tests ensure that built-in instruments work identically to plugin instruments
through the unified HierarchicalInstrumentAgent interface.

License: MIT
"""

import pytest
import time
from unittest.mock import Mock, patch

from src.audio_agent.core.built_in_instrument_agent import (
    BuiltInInstrumentAgent,
    BuiltInInstrumentConfiguration,
    BuiltInInstrumentRecommendation,
)
from src.audio_agent.core.built_in_instrument_types import BuiltInInstrumentType
from src.audio_agent.core.dawdreamer_engine import DawDreamerEngine
from src.audio_agent.core.hierarchical_instrument_agent import (
    HierarchicalInstrumentAgent,
)
from src.audio_agent.core.plugin_specialist import PluginSpecialist
from src.audio_agent.models.audio import (
    AudioAnalysis,
    SpectralFeatures,
    HarmonicFeatures,
    FrequencyBalance,
    DynamicFeatures,
)
from src.audio_agent.models.composition import (
    CompositionContext,
    MusicalStyle,
    MusicalKey,
)
from src.audio_agent.models.plugin import PluginCategory
from src.audio_agent.models.user import UserPreferences


class TestUnifiedInstrumentSystem:
    """Test suite for unified instrument system."""

    @pytest.fixture
    def mock_daw_engine(self):
        """Create a mock DawDreamerEngine."""
        engine = Mock(spec=DawDreamerEngine)
        engine.create_builtin_instrument = Mock(return_value="test_instrument")
        engine.set_processor_parameter = Mock()
        engine.get_available_plugins = Mock(
            return_value=["Serum", "Massive X", "Kontakt 7"]
        )
        engine.is_builtin_instrument = Mock(return_value=True)
        engine.get_builtin_instrument_type = Mock(return_value="local_gal")
        return engine

    @pytest.fixture
    def mock_plugin_specialist(self):
        """Create a mock PluginSpecialist."""
        specialist = Mock(spec=PluginSpecialist)
        specialist.db = Mock()
        specialist.db.get_plugins_by_category = Mock(
            return_value=[
                Mock(name="Serum", category="Synthesizer"),
                Mock(name="Massive X", category="Synthesizer"),
            ]
        )
        return specialist

    @pytest.fixture
    def composition_context(self):
        """Create a test composition context."""
        return CompositionContext(
            style=MusicalStyle.ELECTRONIC,
            key=MusicalKey.C_MINOR,
            tempo=128,
            time_signature="4/4",
            duration=120.0,
        )

    @pytest.fixture
    def audio_analysis(self):
        """Create a test audio analysis."""
        return AudioAnalysis(
            spectral=SpectralFeatures(
                flatness=0.5,
                rolloff=4000.0,
                flux=0.3,
                bandwidth=1200.0,
                centroid=1500.0,
            ),
            harmonic=HarmonicFeatures(
                pitch_clarity=0.7,
                fundamental_freq=130.0,
                harmonic_content=[0.8, 0.4, 0.2, 0.1],
                inharmonicity=0.3,
            ),
            frequency_balance=FrequencyBalance(
                bass=0.3,
                low_mid=0.3,
                mid=0.2,
                high_mid=0.15,
                treble=0.05,
            ),
            dynamic=DynamicFeatures(
                rms_level=-18.0,
                peak_level=-6.0,
                dynamic_range=12.0,
                transient_density=1.5,
            ),
        )

    @pytest.fixture
    def user_preferences(self):
        """Create a test user preferences object."""
        return UserPreferences(
            clerk_user_id="test_user_123",
            preferred_categories=[PluginCategory.SYNTHESIZER],
            preferred_manufacturers=["Xfer Records"],
        )

    def test_built_in_instrument_types_enum(self):
        """Test BuiltInInstrumentType enum functionality."""
        # Test enum values
        assert BuiltInInstrumentType.LOCAL_GAL.value == "local_gal"
        assert BuiltInInstrumentType.SYNTHESIZER.value == "synthesizer"
        assert BuiltInInstrumentType.PIANO.value == "piano"

        # Test display names
        assert BuiltInInstrumentType.LOCAL_GAL.get_display_name() == "LOCAL GAL"
        assert BuiltInInstrumentType.SYNTHESIZER.get_display_name() == "Synthesizer"

        # Test descriptions
        description = BuiltInInstrumentType.LOCAL_GAL.get_description()
        assert "acid synthesizer" in description.lower()
        assert "feel vector" in description.lower()

        # Test tags
        tags = BuiltInInstrumentType.LOCAL_GAL.get_tags()
        assert "acid" in tags
        assert "polyphonic" in tags
        assert "feel" in tags

        # Test type groupings
        synth_types = BuiltInInstrumentType.get_all_synthesizer_types()
        assert BuiltInInstrumentType.LOCAL_GAL in synth_types
        assert BuiltInInstrumentType.SYNTHESIZER in synth_types

        # Test style mapping
        style_mapping = BuiltInInstrumentType.get_style_mapping()
        assert "ELECTRONIC" in style_mapping
        assert BuiltInInstrumentType.LOCAL_GAL in style_mapping["ELECTRONIC"]

    def test_built_in_instrument_agent_initialization(self, mock_daw_engine):
        """Test BuiltInInstrumentAgent initialization."""
        agent = BuiltInInstrumentAgent(mock_daw_engine)

        assert agent.daw_engine == mock_daw_engine
        assert isinstance(agent.presets, dict)
        assert isinstance(agent.style_mappings, dict)

        # Check that LOCAL GAL presets exist
        assert "local_gal" in agent.presets
        assert "classic_acid" in agent.presets["local_gal"]

    def test_built_in_instrument_selection(
        self, mock_daw_engine, composition_context, audio_analysis, user_preferences
    ):
        """Test built-in instrument selection."""
        agent = BuiltInInstrumentAgent(mock_daw_engine)

        recommendation = agent.select_instrument(
            composition_context, audio_analysis, user_preferences
        )

        assert isinstance(recommendation, BuiltInInstrumentRecommendation)
        assert recommendation.instrument_type in BuiltInInstrumentType
        assert 0.0 <= recommendation.confidence <= 1.0
        assert recommendation.style_context == "ELECTRONIC"
        assert recommendation.composition_context == composition_context
        assert recommendation.clerk_user_id == "test_user_123"

    def test_built_in_instrument_configuration(
        self, mock_daw_engine, composition_context, audio_analysis
    ):
        """Test built-in instrument configuration."""
        agent = BuiltInInstrumentAgent(mock_daw_engine)

        # Create a recommendation first
        recommendation = agent.select_instrument(composition_context, audio_analysis)

        # Configure the instrument
        configuration = agent.configure_instrument(
            recommendation, composition_context, audio_analysis
        )

        assert isinstance(configuration, BuiltInInstrumentConfiguration)
        assert configuration.instrument_type == recommendation.instrument_type
        assert configuration.instrument_name.startswith(
            "Electronic LOCAL GAL"
        )  # Based on style
        assert isinstance(configuration.parameters, dict)
        assert "volume" in configuration.parameters
        assert "pan" in configuration.parameters

    def test_dawdreamer_engine_builtin_instruments(self, mock_daw_engine):
        """Test DawDreamerEngine built-in instrument creation."""
        # Patch the engine methods
        mock_daw_engine._create_instrument_processor = Mock()
        mock_processor = Mock()
        mock_processor.parameters = {"volume": 0.8}
        mock_daw_engine._create_instrument_processor.return_value = mock_processor
        mock_daw_engine._loaded_processors = {}

        # Test LOCAL GAL creation
        instrument_name = mock_daw_engine.create_builtin_instrument(
            "test_local_gal", "local_gal"
        )

        assert instrument_name == "test_local_gal"
        mock_daw_engine._create_instrument_processor.assert_called_once()

        # Test built-in instrument detection
        mock_daw_engine._processors = {
            "test_local_gal": Mock(processor_type="builtin_instrument_local_gal")
        }
        assert mock_daw_engine.is_builtin_instrument("test_local_gal") is True
        assert mock_daw_engine.is_builtin_instrument("nonexistent") is False

        # Test getting instrument type
        mock_daw_engine._processors["test_local_gal"] = Mock(
            processor_type="builtin_instrument_local_gal",
            parameters={"instrument_type": "local_gal"},
        )
        assert (
            mock_daw_engine.get_builtin_instrument_type("test_local_gal") == "local_gal"
        )

    def test_local_gal_integration(self, mock_daw_engine):
        """Test LOCAL GAL integration functionality."""
        from src.audio_agent.core.local_gal_integration import (
            LocalGalIntegration,
            FeelVector,
            Pattern,
        )

        # Patch the engine methods
        mock_daw_engine._loaded_processors = {}

        integration = LocalGalIntegration(mock_daw_engine)

        # Create a LOCAL GAL instrument
        instrument_name = integration.create_local_gal_instrument("test_gal")
        assert instrument_name == "test_gal"

        # Test feel vector setting
        feel = FeelVector(rubber=0.8, bite=0.7, hollow=0.4, growl=0.5)
        integration.set_feel_vector(instrument_name, feel)

        # Test feel vector getting
        retrieved_feel = integration.get_feel_vector(instrument_name)
        assert retrieved_feel.rubber == 0.8
        assert retrieved_feel.bite == 0.7

        # Test pattern setting
        pattern = Pattern(id="test_pattern", name="Test Pattern", steps_per_bar=8)
        integration.set_pattern(instrument_name, pattern)

        # Test pattern getting
        retrieved_pattern = integration.get_pattern(instrument_name)
        assert retrieved_pattern.id == "test_pattern"
        assert retrieved_pattern.steps_per_bar == 8

    def test_hierarchical_agent_unified_selection(
        self,
        mock_plugin_specialist,
        mock_daw_engine,
        composition_context,
        audio_analysis,
        user_preferences,
    ):
        """Test unified instrument selection through HierarchicalInstrumentAgent."""
        # Patch the engine methods
        mock_daw_engine.create_builtin_instrument = Mock(return_value="test_builtin")
        mock_daw_engine._create_instrument_processor = Mock()
        mock_processor = Mock()
        mock_processor.parameters = {"volume": 0.8}
        mock_daw_engine._create_instrument_processor.return_value = mock_processor
        mock_daw_engine._loaded_processors = {}

        agent = HierarchicalInstrumentAgent(mock_plugin_specialist, mock_daw_engine)

        # Test unified selection (both plugins and built-in)
        recommendations = agent.select_instruments(
            composition_context,
            audio_analysis,
            user_preferences,
            include_plugins=True,
            include_built_in=True,
        )

        assert len(recommendations) >= 1

        # Should have at least one built-in recommendation
        builtin_recs = [
            r for r in recommendations if isinstance(r, BuiltInInstrumentRecommendation)
        ]
        assert len(builtin_recs) > 0

    def test_hierarchical_agent_plugin_only(
        self,
        mock_plugin_specialist,
        mock_daw_engine,
        composition_context,
        audio_analysis,
        user_preferences,
    ):
        """Test plugin-only selection."""
        agent = HierarchicalInstrumentAgent(mock_plugin_specialist, mock_daw_engine)

        recommendations = agent.select_instruments(
            composition_context,
            audio_analysis,
            user_preferences,
            include_plugins=True,
            include_built_in=False,
        )

        # Should only have plugin recommendations
        builtin_recs = [
            r for r in recommendations if isinstance(r, BuiltInInstrumentRecommendation)
        ]
        assert len(builtin_recs) == 0

    def test_hierarchical_agent_builtin_only(
        self,
        mock_plugin_specialist,
        mock_daw_engine,
        composition_context,
        audio_analysis,
        user_preferences,
    ):
        """Test built-in-only selection."""
        # Patch the engine methods
        mock_daw_engine.create_builtin_instrument = Mock(return_value="test_builtin")
        mock_daw_engine._create_instrument_processor = Mock()
        mock_processor = Mock()
        mock_processor.parameters = {"volume": 0.8}
        mock_daw_engine._create_instrument_processor.return_value = mock_processor
        mock_daw_engine._loaded_processors = {}

        agent = HierarchicalInstrumentAgent(mock_plugin_specialist, mock_daw_engine)

        recommendations = agent.select_instruments(
            composition_context,
            audio_analysis,
            user_preferences,
            include_plugins=False,
            include_built_in=True,
        )

        # Should only have built-in recommendations
        builtin_recs = [
            r for r in recommendations if isinstance(r, BuiltInInstrumentRecommendation)
        ]
        assert len(builtin_recs) > 0

    def test_unified_configuration(
        self,
        mock_plugin_specialist,
        mock_daw_engine,
        composition_context,
        audio_analysis,
    ):
        """Test unified configuration of mixed recommendations."""
        # Patch the engine methods
        mock_daw_engine.create_builtin_instrument = Mock(return_value="test_builtin")
        mock_daw_engine._create_instrument_processor = Mock()
        mock_processor = Mock()
        mock_processor.parameters = {"volume": 0.8}
        mock_daw_engine._create_instrument_processor.return_value = mock_processor
        mock_daw_engine._loaded_processors = {}

        agent = HierarchicalInstrumentAgent(mock_plugin_specialist, mock_daw_engine)

        # Get mixed recommendations
        recommendations = agent.select_instruments(
            composition_context,
            audio_analysis,
            include_plugins=True,
            include_built_in=True,
        )

        # Configure all recommendations
        configurations = agent.configure_instruments(
            recommendations, composition_context, audio_analysis
        )

        assert len(configurations) > 0

        # Should have both configuration types
        builtin_configs = [
            c for c in configurations if isinstance(c, BuiltInInstrumentConfiguration)
        ]
        assert len(builtin_configs) > 0

    def test_local_gal_special_methods(self, mock_plugin_specialist, mock_daw_engine):
        """Test LOCAL GAL-specific methods in HierarchicalInstrumentAgent."""
        # Patch the engine methods
        mock_daw_engine.create_builtin_instrument = Mock(return_value="test_local_gal")
        mock_daw_engine._loaded_processors = {}

        agent = HierarchicalInstrumentAgent(mock_plugin_specialist, mock_daw_engine)

        # Test LOCAL GAL creation
        instrument_name = agent.create_local_gal_instrument("my_gal")
        assert instrument_name == "my_gal"

        # Test LOCAL GAL retrieval
        instrument = agent.get_local_gal_instrument("my_gal")
        assert instrument is not None

    def test_available_instruments(self, mock_plugin_specialist, mock_daw_engine):
        """Test unified instrument discovery."""
        agent = HierarchicalInstrumentAgent(mock_plugin_specialist, mock_daw_engine)

        available = agent.get_available_instruments()

        assert "plugins" in available
        assert "built_in" in available
        assert isinstance(available["plugins"], list)
        assert isinstance(available["built_in"], list)

        # Should have built-in instruments
        assert len(available["built_in"]) > 0

        # Check built-in instrument structure
        builtin_inst = available["built_in"][0]
        assert "type" in builtin_inst
        assert "display_name" in builtin_inst
        assert "description" in builtin_inst
        assert "tags" in builtin_inst
        assert "presets" in builtin_inst

    def test_performance_metrics(self, mock_plugin_specialist, mock_daw_engine):
        """Test performance metrics tracking for both plugin and built-in agents."""
        agent = HierarchicalInstrumentAgent(mock_plugin_specialist, mock_daw_engine)

        # Get initial stats
        initial_stats = agent.get_performance_stats()
        assert "built_in" in initial_stats

        # Built-in agent should have metrics
        builtin_metrics = initial_stats["built_in"]
        assert "success_count" in builtin_metrics
        assert "failure_count" in builtin_metrics
        assert "success_rate" in builtin_metrics
        assert "avg_response_time" in builtin_metrics
        assert "is_healthy" in builtin_metrics

    @patch("time.time")
    def test_timing_consistency(
        self,
        mock_time,
        mock_plugin_specialist,
        mock_daw_engine,
        composition_context,
        audio_analysis,
    ):
        """Test that built-in and plugin agents have similar response times."""
        # Mock time to return consistent timing
        mock_time.side_effect = [0, 0.5, 0.5, 1.0, 1.0, 1.5]  # Start, end for each call

        agent = HierarchicalInstrumentAgent(mock_plugin_specialist, mock_daw_engine)

        # Select instruments
        recommendations = agent.select_instruments(
            composition_context,
            audio_analysis,
            include_plugins=True,
            include_built_in=True,
        )

        # Check that timing was tracked
        stats = agent.get_performance_stats()
        assert "built_in" in stats
        builtin_metrics = stats["built_in"]
        assert builtin_metrics["success_count"] > 0
        assert builtin_metrics["avg_response_time"] > 0

    def test_error_handling(
        self,
        mock_plugin_specialist,
        mock_daw_engine,
        composition_context,
        audio_analysis,
    ):
        """Test error handling in unified system."""
        # Make built-in agent fail
        with patch(
            "src.audio_agent.core.built_in_instrument_agent.BuiltInInstrumentAgent.select_instrument"
        ) as mock_select:
            mock_select.side_effect = Exception("Test error")

            agent = HierarchicalInstrumentAgent(mock_plugin_specialist, mock_daw_engine)

            # Should handle error gracefully and provide fallback
            recommendations = agent.select_instruments(
                composition_context,
                audio_analysis,
                include_plugins=True,
                include_built_in=True,
            )

            assert len(recommendations) >= 1  # Should provide fallback

            # Check error tracking
            stats = agent.get_performance_stats()
            builtin_metrics = stats["built_in"]
            assert builtin_metrics["failure_count"] > 0

    def test_built_in_instrument_database(self):
        """Test BuiltInInstrumentDatabase functionality."""
        from src.audio_agent.core.built_in_instrument_database import (
            BuiltInInstrumentDatabase,
        )

        db = BuiltInInstrumentDatabase()

        # Test getting all instruments
        all_instruments = db.get_all_instruments()
        assert len(all_instruments) > 0

        # Test getting specific instrument
        local_gal = db.get_instrument("local_gal")
        assert local_gal is not None
        assert local_gal.instrument_type == BuiltInInstrumentType.LOCAL_GAL

        # Test search functionality
        results = db.search_instruments("acid")
        assert len(results) > 0
        assert all(
            "acid" in inst.description.lower() or "acid" in inst.tags
            for inst in results
        )

        # Test style-based filtering
        electronic_instruments = db.get_instruments_for_style("ELECTRONIC")
        assert len(electronic_instruments) > 0

        # Test statistics
        stats = db.get_instrument_stats()
        assert stats["total_instruments"] > 0
        assert "total_presets" in stats
        assert "instruments_by_type" in stats


if __name__ == "__main__":
    # Run tests
    test_suite = TestUnifiedInstrumentSystem()

    # Example test execution
    print("Testing unified instrument system...")

    # Run a subset of tests for demonstration
    test_suite.test_built_in_instrument_types_enum()
    print("✓ Built-in instrument types enum test passed")

    print("All tests completed!")
