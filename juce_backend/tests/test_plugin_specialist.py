"""Tests for the plugin specialist and context-aware plugin selection."""

import os
import tempfile
import unittest

from audio_agent.models.audio import (
    AudioAnalysis,
    AudioFeatures,
    AudioFormat,
    ChromaFeatures,
    DynamicFeatures,
    FrequencyBalance,
    HarmonicFeatures,
    MusicalContextFeatures,
    PerceptualFeatures,
    QualityFeatures,
    RhythmFeatures,
    SpatialFeatures,
    SpectralFeatures,
    TimbreFeatures,
)
from audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)
from audio_agent.models.user import (
    LearningPreferences,
    MixingPreferences,
    PluginPreferences,
    UserPreferences,
)
from src.audio_agent.core.plugin_database import PluginDatabaseConfig
from src.audio_agent.core.plugin_specialist import (
    PluginSpecialist,
    PluginSpecialistConfig,
    StylePluginPreferences,
)
from src.audio_agent.models.plugin import (
    PluginCategory,
    PluginFormat,
    PluginMetadata,
    PluginRecommendation,
)


class TestPluginSpecialist(unittest.TestCase):
    """Test the plugin specialist functionality."""

    def setUp(self):
        """Set up test environment."""
        # Create temporary database file
        self.temp_db_file = tempfile.NamedTemporaryFile(delete=False).name

        # Create test configuration
        db_config = PluginDatabaseConfig(
            database_path=self.temp_db_file,
            scan_paths=[],  # No real paths for testing
            auto_scan_on_startup=False,
        )

        self.config = PluginSpecialistConfig(database_config=db_config)

        # Create plugin specialist
        self.specialist = PluginSpecialist(self.config)

        # Add test plugins to database
        self._add_test_plugins()

        # Create test composition context
        self.composition_context = CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ROCK,
        )

        # Create test audio analysis
        self.audio_analysis = self._create_test_audio_analysis()

        # Create test user preferences
        self.user_preferences = self._create_test_user_preferences()

    def tearDown(self):
        """Clean up after tests."""
        self.specialist.close()
        if os.path.exists(self.temp_db_file):
            os.unlink(self.temp_db_file)

    def _add_test_plugins(self):
        """Add test plugins to the database."""
        # EQ plugins
        eq1 = PluginMetadata(
            name="FabFilter Pro-Q 3",
            manufacturer="FabFilter",
            version="3.0.0",
            unique_id="fabfilter_pro_q_3",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=0,
            cpu_usage_estimate=0.2,
            memory_usage_mb=50.0,
            quality_rating=0.9,
            user_rating=0.9,
            tags=["eq", "fabfilter", "precision"],
            supported_sample_rates=[44100, 48000, 88200, 96000],
            supports_64bit=True,
        )

        eq2 = PluginMetadata(
            name="Waves SSL E-Channel",
            manufacturer="Waves",
            version="14.0.0",
            unique_id="waves_ssl_e_channel",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=0,
            cpu_usage_estimate=0.15,
            memory_usage_mb=30.0,
            quality_rating=0.85,
            user_rating=0.8,
            tags=["eq", "waves", "analog", "vintage"],
            supported_sample_rates=[44100, 48000, 88200, 96000],
            supports_64bit=True,
        )

        # Compressor plugins
        comp1 = PluginMetadata(
            name="FabFilter Pro-C 2",
            manufacturer="FabFilter",
            version="2.0.0",
            unique_id="fabfilter_pro_c_2",
            category=PluginCategory.COMPRESSOR,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=0,
            cpu_usage_estimate=0.2,
            memory_usage_mb=40.0,
            quality_rating=0.9,
            user_rating=0.85,
            tags=["compressor", "fabfilter", "precision"],
            supported_sample_rates=[44100, 48000, 88200, 96000],
            supports_64bit=True,
        )

        comp2 = PluginMetadata(
            name="Waves CLA-76",
            manufacturer="Waves",
            version="14.0.0",
            unique_id="waves_cla_76",
            category=PluginCategory.COMPRESSOR,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=0,
            cpu_usage_estimate=0.15,
            memory_usage_mb=30.0,
            quality_rating=0.85,
            user_rating=0.8,
            tags=["compressor", "waves", "analog", "vintage", "1176"],
            supported_sample_rates=[44100, 48000, 88200, 96000],
            supports_64bit=True,
        )

        # Reverb plugins
        reverb1 = PluginMetadata(
            name="FabFilter Pro-R",
            manufacturer="FabFilter",
            version="1.0.0",
            unique_id="fabfilter_pro_r",
            category=PluginCategory.REVERB,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=1024,
            cpu_usage_estimate=0.3,
            memory_usage_mb=60.0,
            quality_rating=0.9,
            user_rating=0.85,
            tags=["reverb", "fabfilter", "precision"],
            supported_sample_rates=[44100, 48000, 88200, 96000],
            supports_64bit=True,
        )

        reverb2 = PluginMetadata(
            name="Valhalla VintageVerb",
            manufacturer="Valhalla DSP",
            version="2.0.0",
            unique_id="valhalla_vintage_verb",
            category=PluginCategory.REVERB,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=512,
            cpu_usage_estimate=0.2,
            memory_usage_mb=40.0,
            quality_rating=0.85,
            user_rating=0.9,
            tags=["reverb", "valhalla", "vintage"],
            supported_sample_rates=[44100, 48000, 88200, 96000],
            supports_64bit=True,
        )

        # Add plugins to database
        self.specialist.db.add_or_update_plugin(eq1)
        self.specialist.db.add_or_update_plugin(eq2)
        self.specialist.db.add_or_update_plugin(comp1)
        self.specialist.db.add_or_update_plugin(comp2)
        self.specialist.db.add_or_update_plugin(reverb1)
        self.specialist.db.add_or_update_plugin(reverb2)

        # Add user ratings
        self.specialist.db.add_user_plugin_rating(
            "user_test123", "fabfilter_pro_q_3", 0.9
        )
        self.specialist.db.add_user_plugin_rating("user_test123", "waves_cla_76", 0.8)

    def _create_test_audio_analysis(self) -> AudioAnalysis:
        """Create test audio analysis data."""
        return AudioAnalysis(
            timestamp=1000.0,
            sample_rate=44100,
            duration=60.0,
            channels=2,
            format=AudioFormat.WAV,
            features=AudioFeatures(
                spectral=SpectralFeatures(
                    centroid=3500.0,
                    rolloff=8000.0,
                    flux=0.3,
                    bandwidth=4000.0,
                    flatness=0.2,
                    mfcc=[
                        0.1,
                        0.2,
                        0.3,
                        0.4,
                        0.5,
                        0.6,
                        0.7,
                        0.8,
                        0.9,
                        1.0,
                        1.1,
                        1.2,
                        1.3,
                    ],
                ),
                dynamic=DynamicFeatures(
                    rms_level=0.3,
                    peak_level=0.8,
                    dynamic_range=12.0,
                    transient_density=1.5,
                    zero_crossing_rate=0.4,
                ),
                harmonic=HarmonicFeatures(
                    fundamental_freq=440.0,
                    harmonic_content=[0.8, 0.6, 0.4, 0.2, 0.1],
                    inharmonicity=0.2,
                    pitch_clarity=0.7,
                ),
                perceptual=PerceptualFeatures(
                    loudness_lufs=-14.0,
                    perceived_brightness=0.6,
                    perceived_warmth=0.4,
                    roughness=0.3,
                    sharpness=1.2,
                ),
                spatial=SpatialFeatures(
                    stereo_width=0.7, phase_correlation=0.8, balance=0.0
                ),
                frequency_balance=FrequencyBalance(
                    bass=0.4, low_mid=0.5, mid=0.6, high_mid=0.5, treble=0.3
                ),
                chroma=ChromaFeatures(
                    chroma=[0.1] * 12,
                    chroma_normalized=[0.1] * 12,
                    root_note_likelihood=[0.1] * 12,
                    key="C major",
                ),
                musical_context=MusicalContextFeatures(
                    key="C major",
                    current_chord={"root": "C", "type": "major"},
                    mode="major",
                    time_signature="4/4",
                ),
                rhythm=RhythmFeatures(
                    tempo=120.0,
                    beats=[0.0, 0.5, 1.0],
                    beat_strength=[0.9, 0.8, 0.7],
                    meter="4/4",
                    time_signature="4/4",
                    tempo_confidence=0.9,
                ),
                timbre=TimbreFeatures(
                    instruments=[{"name": "piano", "confidence": 0.8}],
                    harmonic_percussive_ratio=0.6,
                    attack_strength=0.7,
                    sustain_length=0.5,
                    vibrato_rate=None,
                    vibrato_extent=None,
                ),
                quality=QualityFeatures(
                    issues=[],
                    overall_quality=0.9,
                    noise_floor=-70.0,
                    has_clipping=False,
                    dc_offset=0.0,
                    hum_frequency=None,
                ),
            ),
        )

    def _create_test_user_preferences(self) -> UserPreferences:
        """Create test user preferences."""
        return UserPreferences(
            clerk_user_id="user_test123",
            plugin_preferences=PluginPreferences(
                preferred_brands=["FabFilter", "Valhalla DSP"],
                avoided_brands=["Acme Audio"],
                cpu_efficiency_priority=0.7,
                vintage_vs_modern=0.6,
                complexity_preference=0.5,
            ),
            mixing_preferences=MixingPreferences(),
            learning_preferences=LearningPreferences(),
        )

    def test_style_preferences_initialization(self):
        """Test that style preferences are properly initialized."""
        # Check that all musical styles have preferences
        for style in MusicalStyle:
            prefs = self.specialist.get_style_preferences(style)
            self.assertEqual(prefs.style, style)
            self.assertIsInstance(prefs.preferred_plugins, dict)
            self.assertIsInstance(prefs.preferred_manufacturers, list)

        # Check specific style preferences
        rock_prefs = self.specialist.get_style_preferences(MusicalStyle.ROCK)
        self.assertEqual(rock_prefs.style, MusicalStyle.ROCK)
        self.assertIn(PluginCategory.REVERB.value, rock_prefs.preferred_plugins)
        self.assertIn("FabFilter", rock_prefs.preferred_manufacturers)

    def test_plugin_selection_by_category(self):
        """Test plugin selection by category."""
        # Test EQ selection
        eq_recommendation = self.specialist.select_plugin(
            PluginCategory.EQ,
            self.composition_context,
            self.audio_analysis,
            self.user_preferences,
        )

        self.assertIsInstance(eq_recommendation, PluginRecommendation)
        self.assertEqual(eq_recommendation.plugin_category, PluginCategory.EQ)
        self.assertIn(
            eq_recommendation.plugin_name, ["FabFilter Pro-Q 3", "Waves SSL E-Channel"]
        )
        self.assertGreater(eq_recommendation.confidence, 0.5)
        self.assertIsNotNone(eq_recommendation.reasoning)

        # Test compressor selection
        comp_recommendation = self.specialist.select_plugin(
            PluginCategory.COMPRESSOR,
            self.composition_context,
            self.audio_analysis,
            self.user_preferences,
        )

        self.assertIsInstance(comp_recommendation, PluginRecommendation)
        self.assertEqual(comp_recommendation.plugin_category, PluginCategory.COMPRESSOR)
        self.assertIn(
            comp_recommendation.plugin_name, ["FabFilter Pro-C 2", "Waves CLA-76"]
        )
        self.assertGreater(comp_recommendation.confidence, 0.5)
        self.assertIsNotNone(comp_recommendation.reasoning)

    def test_plugin_selection_with_format_filter(self):
        """Test plugin selection with format filter."""
        # Test selection with VST3 format filter
        recommendation = self.specialist.select_plugin(
            PluginCategory.REVERB,
            self.composition_context,
            self.audio_analysis,
            self.user_preferences,
            format_filter=PluginFormat.VST3,
        )

        self.assertIsInstance(recommendation, PluginRecommendation)
        self.assertEqual(recommendation.plugin_format, PluginFormat.VST3)

    def test_plugin_selection_with_different_styles(self):
        """Test plugin selection with different musical styles."""
        # Test with classical style
        classical_context = CompositionContext(
            tempo=80.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.CLASSICAL,
        )

        classical_recommendation = self.specialist.select_plugin(
            PluginCategory.REVERB,
            classical_context,
            self.audio_analysis,
            self.user_preferences,
        )

        self.assertIsInstance(classical_recommendation, PluginRecommendation)
        self.assertEqual(
            classical_recommendation.plugin_category, PluginCategory.REVERB
        )
        self.assertIn("classical", classical_recommendation.reasoning.lower())

        # Test with electronic style
        electronic_context = CompositionContext(
            tempo=128.0,
            key_signature=MusicalKey.A_MINOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,
        )

        electronic_recommendation = self.specialist.select_plugin(
            PluginCategory.COMPRESSOR,
            electronic_context,
            self.audio_analysis,
            self.user_preferences,
        )

        self.assertIsInstance(electronic_recommendation, PluginRecommendation)
        self.assertEqual(
            electronic_recommendation.plugin_category, PluginCategory.COMPRESSOR
        )
        self.assertIn("electronic", electronic_recommendation.reasoning.lower())

    def test_plugin_selection_with_user_preferences(self):
        """Test plugin selection with user preferences."""
        # Create user preferences with strong brand preference
        user_prefs = UserPreferences(
            clerk_user_id="user_test123",
            plugin_preferences=PluginPreferences(
                preferred_brands=["FabFilter"],
                avoided_brands=["Waves"],
                cpu_efficiency_priority=0.5,
                vintage_vs_modern=0.5,
                complexity_preference=0.5,
            ),
            mixing_preferences=MixingPreferences(),
            learning_preferences=LearningPreferences(),
        )

        # Test selection with user preferences
        recommendation = self.specialist.select_plugin(
            PluginCategory.EQ, self.composition_context, self.audio_analysis, user_prefs
        )

        self.assertIsInstance(recommendation, PluginRecommendation)
        self.assertEqual(recommendation.plugin_name, "FabFilter Pro-Q 3")
        self.assertEqual(recommendation.clerk_user_id, "user_test123")

    def test_plugin_selection_with_audio_analysis(self):
        """Test plugin selection with different audio analysis data."""
        # Create audio analysis with low bass
        low_bass_analysis = self.audio_analysis.model_copy(deep=True)
        low_bass_analysis.features.frequency_balance.bass = 0.1

        # Test selection with low bass
        eq_recommendation = self.specialist.select_plugin(
            PluginCategory.EQ,
            self.composition_context,
            low_bass_analysis,
            self.user_preferences,
        )

        self.assertIsInstance(eq_recommendation, PluginRecommendation)
        self.assertEqual(eq_recommendation.plugin_category, PluginCategory.EQ)
        self.assertIn("bass", eq_recommendation.reasoning.lower())

        # Create audio analysis with high dynamic range
        high_dynamic_analysis = self.audio_analysis.model_copy(deep=True)
        high_dynamic_analysis.features.dynamic.dynamic_range = 20.0

        # Test selection with high dynamic range
        comp_recommendation = self.specialist.select_plugin(
            PluginCategory.COMPRESSOR,
            self.composition_context,
            high_dynamic_analysis,
            self.user_preferences,
        )

        self.assertIsInstance(comp_recommendation, PluginRecommendation)
        self.assertEqual(comp_recommendation.plugin_category, PluginCategory.COMPRESSOR)
        self.assertIn("dynamic", comp_recommendation.reasoning.lower())

    def test_update_style_preferences(self):
        """Test updating style preferences."""
        # Create new style preferences
        new_prefs = StylePluginPreferences(
            style=MusicalStyle.ROCK,
            preferred_plugins={
                PluginCategory.EQ.value: ["API 550", "Neve 1073"],
                PluginCategory.COMPRESSOR.value: ["API 2500", "SSL G-Master"],
            },
            preferred_manufacturers=["API", "Neve", "SSL"],
            vintage_vs_modern=0.2,  # Strong vintage preference
        )

        # Update preferences
        self.specialist.update_style_preferences(new_prefs)

        # Get updated preferences
        updated_prefs = self.specialist.get_style_preferences(MusicalStyle.ROCK)

        # Check that preferences were updated
        self.assertEqual(updated_prefs.style, MusicalStyle.ROCK)
        self.assertEqual(
            updated_prefs.preferred_plugins[PluginCategory.EQ.value],
            ["API 550", "Neve 1073"],
        )
        self.assertEqual(updated_prefs.preferred_manufacturers, ["API", "Neve", "SSL"])
        self.assertEqual(updated_prefs.vintage_vs_modern, 0.2)

        # Test selection with updated preferences
        recommendation = self.specialist.select_plugin(
            PluginCategory.EQ,
            self.composition_context,
            self.audio_analysis,
            self.user_preferences,
        )

        self.assertIsInstance(recommendation, PluginRecommendation)
        self.assertEqual(recommendation.plugin_category, PluginCategory.EQ)


if __name__ == "__main__":
    unittest.main()
