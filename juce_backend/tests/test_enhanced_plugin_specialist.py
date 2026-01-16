"""Tests for the enhanced plugin specialist and context-aware plugin selection."""

import os
import tempfile
import unittest

from src.audio_agent.core.plugin_database import PluginDatabaseConfig
from src.audio_agent.core.plugin_specialist import (
    PluginChainRecommendation,
    PluginContextAnalyzer,
    PluginSpecialist,
    PluginSpecialistConfig,
)
from src.audio_agent.models.audio import (
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
from src.audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)
from src.audio_agent.models.plugin import (
    PluginCategory,
    PluginFeatureVector,
    PluginFormat,
    PluginMetadata,
)
from src.audio_agent.models.user import (
    LearningPreferences,
    MixingPreferences,
    PluginPreferences,
    UserPreferences,
)


class TestEnhancedPluginSpecialist(unittest.TestCase):
    """Test the enhanced plugin specialist functionality."""

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

        # Saturation plugins
        sat1 = PluginMetadata(
            name="FabFilter Saturn 2",
            manufacturer="FabFilter",
            version="2.0.0",
            unique_id="fabfilter_saturn_2",
            category=PluginCategory.SATURATION,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=256,
            cpu_usage_estimate=0.25,
            memory_usage_mb=45.0,
            quality_rating=0.9,
            user_rating=0.85,
            tags=["saturation", "fabfilter", "tape", "tube"],
            supported_sample_rates=[44100, 48000, 88200, 96000],
            supports_64bit=True,
        )

        # Limiter plugins
        limiter1 = PluginMetadata(
            name="FabFilter Pro-L 2",
            manufacturer="FabFilter",
            version="2.0.0",
            unique_id="fabfilter_pro_l_2",
            category=PluginCategory.LIMITER,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            latency_samples=128,
            cpu_usage_estimate=0.2,
            memory_usage_mb=35.0,
            quality_rating=0.9,
            user_rating=0.9,
            tags=["limiter", "fabfilter", "precision"],
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
        self.specialist.db.add_or_update_plugin(sat1)
        self.specialist.db.add_or_update_plugin(limiter1)

        # Add user ratings
        self.specialist.db.add_user_plugin_rating(
            "user_test123", "fabfilter_pro_q_3", 0.9
        )
        self.specialist.db.add_user_plugin_rating("user_test123", "waves_cla_76", 0.8)

        # Add feature vectors
        self._add_test_feature_vectors()

    def _add_test_feature_vectors(self):
        """Add test feature vectors to the database."""
        # FabFilter Pro-Q 3 feature vector
        eq_vector = PluginFeatureVector(
            plugin_id="fabfilter_pro_q_3",
            plugin_metadata=self.specialist.db.get_plugin_by_id("fabfilter_pro_q_3"),
            frequency_response=[0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
            harmonic_character=[0.1, 0.1, 0.1, 0.1, 0.1],
            dynamic_behavior=[0.5, 0.5, 0.5, 0.5, 0.5],
            spatial_properties=[0.5, 0.5, 0.5],
            genre_affinity={
                "rock": 0.8,
                "jazz": 0.7,
                "electronic": 0.9,
                "classical": 0.8,
            },
            tempo_suitability={"slow": 0.8, "medium": 0.8, "fast": 0.8},
            instrument_compatibility={"guitar": 0.8, "vocals": 0.9, "drums": 0.8},
            ease_of_use=0.7,
            preset_quality=0.9,
            vintage_character=0.3,
            modern_character=0.9,
            feature_vector=[0.9, 0.1, 0.5, 0.5, 0.8, 0.8, 0.8, 0.7, 0.9, 0.3],
        )

        # Waves CLA-76 feature vector
        comp_vector = PluginFeatureVector(
            plugin_id="waves_cla_76",
            plugin_metadata=self.specialist.db.get_plugin_by_id("waves_cla_76"),
            frequency_response=[0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
            harmonic_character=[0.7, 0.6, 0.5, 0.4, 0.3],
            dynamic_behavior=[0.9, 0.8, 0.7, 0.6, 0.5],
            spatial_properties=[0.3, 0.3, 0.3],
            genre_affinity={
                "rock": 0.9,
                "jazz": 0.6,
                "electronic": 0.7,
                "classical": 0.4,
            },
            tempo_suitability={"slow": 0.6, "medium": 0.8, "fast": 0.9},
            instrument_compatibility={"guitar": 0.9, "vocals": 0.8, "drums": 0.9},
            ease_of_use=0.6,
            preset_quality=0.8,
            vintage_character=0.9,
            modern_character=0.4,
            feature_vector=[0.5, 0.7, 0.9, 0.3, 0.9, 0.8, 0.9, 0.6, 0.8, 0.9],
        )

        # Add feature vectors to database
        self.specialist.db.add_plugin_feature_vector("fabfilter_pro_q_3", eq_vector)
        self.specialist.db.add_plugin_feature_vector("waves_cla_76", comp_vector)

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

    def test_plugin_context_analyzer(self):
        """Test the plugin context analyzer."""
        # Test frequency needs analysis
        freq_needs = PluginContextAnalyzer.analyze_frequency_needs(self.audio_analysis)
        self.assertIsInstance(freq_needs, dict)
        self.assertIn("bass", freq_needs)
        self.assertIn("treble", freq_needs)

        # Test dynamic needs analysis
        dynamic_needs = PluginContextAnalyzer.analyze_dynamic_needs(self.audio_analysis)
        self.assertIsInstance(dynamic_needs, dict)
        self.assertIn("dynamic_range", dynamic_needs)
        self.assertIn("peak_control", dynamic_needs)

        # Test spatial needs analysis
        spatial_needs = PluginContextAnalyzer.analyze_spatial_needs(self.audio_analysis)
        self.assertIsInstance(spatial_needs, dict)
        self.assertIn("stereo_width", spatial_needs)
        self.assertIn("phase_correlation", spatial_needs)

        # Test style needs analysis
        style_needs = PluginContextAnalyzer.analyze_style_needs(
            self.composition_context
        )
        self.assertIsInstance(style_needs, dict)
        self.assertIn("eq_importance", style_needs)
        self.assertIn("compression_importance", style_needs)
        self.assertIn("reverb_importance", style_needs)

        # Check that rock style has appropriate values
        self.assertGreater(style_needs["compression_importance"], 0.6)
        self.assertGreater(style_needs["vintage_character"], 0.6)

    def test_recommend_plugin_chain(self):
        """Test plugin chain recommendation."""
        # Test chain recommendation
        chain = self.specialist.recommend_plugin_chain(
            self.composition_context, self.audio_analysis, self.user_preferences
        )

        # Check chain properties
        self.assertIsInstance(chain, PluginChainRecommendation)
        self.assertEqual(chain.style_context, "ROCK")
        self.assertIsNotNone(chain.reasoning)
        self.assertGreater(len(chain.plugins), 0)

        # Check that chain includes at least EQ and compressor for rock style
        plugin_categories = [p.plugin_category for p in chain.plugins]
        self.assertIn(PluginCategory.EQ, plugin_categories)
        self.assertIn(PluginCategory.COMPRESSOR, plugin_categories)

        # Check that chain reasoning mentions the style
        self.assertIn("ROCK", chain.reasoning)

    def test_recommend_alternative_plugins(self):
        """Test alternative plugin recommendations."""
        # Test alternative recommendations for FabFilter Pro-Q 3
        alternatives = self.specialist.recommend_alternative_plugins(
            "fabfilter_pro_q_3", count=1, user_preferences=self.user_preferences
        )

        # Check alternatives
        self.assertEqual(len(alternatives), 1)
        self.assertEqual(alternatives[0].category, PluginCategory.EQ)
        self.assertEqual(alternatives[0].name, "Waves SSL E-Channel")

    def test_plugin_similarity(self):
        """Test plugin similarity calculation."""
        # Get test plugins
        eq1 = self.specialist.db.get_plugin_by_id("fabfilter_pro_q_3")
        eq2 = self.specialist.db.get_plugin_by_id("waves_ssl_e_channel")
        comp1 = self.specialist.db.get_plugin_by_id("fabfilter_pro_c_2")

        # Test similarity between same category plugins
        eq_similarity = self.specialist._calculate_plugin_similarity(eq1, eq2)
        self.assertGreater(eq_similarity, 0.5)

        # Test similarity between different category plugins
        diff_similarity = self.specialist._calculate_plugin_similarity(eq1, comp1)
        self.assertLess(diff_similarity, eq_similarity)

    def test_detect_plugin_format(self):
        """Test plugin format detection."""
        # Test VST3 format detection
        vst3_format = self.specialist.detect_plugin_format("/path/to/plugin.vst3")
        self.assertEqual(vst3_format, PluginFormat.VST3)

        # Test AU format detection
        au_format = self.specialist.detect_plugin_format("/path/to/plugin.component")
        self.assertEqual(au_format, PluginFormat.AU)

        # Test unknown format
        unknown_format = self.specialist.detect_plugin_format("/path/to/plugin.xyz")
        self.assertIsNone(unknown_format)

    def test_different_musical_styles(self):
        """Test plugin recommendations for different musical styles."""
        # Test classical style
        classical_context = CompositionContext(
            tempo=80.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.CLASSICAL,
        )

        classical_chain = self.specialist.recommend_plugin_chain(
            classical_context, self.audio_analysis, self.user_preferences
        )

        # Check that classical style has appropriate plugins
        self.assertEqual(classical_chain.style_context, "CLASSICAL")

        # Test electronic style
        electronic_context = CompositionContext(
            tempo=128.0,
            key_signature=MusicalKey.A_MINOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,
        )

        electronic_chain = self.specialist.recommend_plugin_chain(
            electronic_context, self.audio_analysis, self.user_preferences
        )

        # Check that electronic style has appropriate plugins
        self.assertEqual(electronic_chain.style_context, "ELECTRONIC")

    def test_audio_analysis_influence(self):
        """Test how audio analysis influences plugin recommendations."""
        # Create audio analysis with low bass
        low_bass_analysis = self.audio_analysis.model_copy(deep=True)
        low_bass_analysis.features.frequency_balance.bass = 0.1

        # Get chain recommendation with low bass
        low_bass_chain = self.specialist.recommend_plugin_chain(
            self.composition_context, low_bass_analysis, self.user_preferences
        )

        # Check that reasoning mentions bass
        self.assertIn("bass", low_bass_chain.reasoning.lower())

        # Create audio analysis with high dynamic range
        high_dynamic_analysis = self.audio_analysis.model_copy(deep=True)
        high_dynamic_analysis.features.dynamic.dynamic_range = 20.0

        # Get chain recommendation with high dynamic range
        high_dynamic_chain = self.specialist.recommend_plugin_chain(
            self.composition_context, high_dynamic_analysis, self.user_preferences
        )

        # Check that reasoning mentions dynamic range
        self.assertIn("dynamic range", high_dynamic_chain.reasoning.lower())


if __name__ == "__main__":
    unittest.main()
