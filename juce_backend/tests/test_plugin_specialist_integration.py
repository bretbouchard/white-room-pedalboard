"""Tests for the integration between plugin specialist and user preference learner."""

import os
import tempfile
import unittest

from src.audio_agent.core.plugin_database import PluginDatabaseConfig
from src.audio_agent.core.plugin_specialist import (
    PluginSpecialist,
    PluginSpecialistConfig,
)
from src.audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)
from src.audio_agent.models.plugin import PluginCategory, PluginFormat, PluginMetadata


class TestPluginSpecialistIntegration(unittest.TestCase):
    """Test the integration between plugin specialist and user preference learner."""

    def setUp(self):
        """Set up test environment."""
        # Create temporary database file
        self.temp_db_file = tempfile.NamedTemporaryFile(delete=False).name

        # Create temporary preferences directory
        self.temp_prefs_dir = tempfile.mkdtemp()

        # Create test configuration
        db_config = PluginDatabaseConfig(
            database_path=self.temp_db_file,
            scan_paths=[],  # No real paths for testing
            auto_scan_on_startup=False,
        )

        self.config = PluginSpecialistConfig(database_config=db_config)

        # Create plugin specialist
        self.specialist = PluginSpecialist(self.config)

        # Initialize preference learner
        self.specialist.initialize_preference_learner(self.temp_prefs_dir)

        # Add test plugins to database
        self._add_test_plugins()

        # Test user ID
        self.test_user_id = "user_test123"

        # Create test composition context
        self.composition_context = CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ROCK,
        )

    def tearDown(self):
        """Clean up after tests."""
        self.specialist.close()

        # Remove temporary files
        if os.path.exists(self.temp_db_file):
            os.unlink(self.temp_db_file)

        # Remove temporary preferences directory
        for file in os.listdir(self.temp_prefs_dir):
            os.unlink(os.path.join(self.temp_prefs_dir, file))
        os.rmdir(self.temp_prefs_dir)

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

        # Add plugins to database
        self.specialist.db.add_or_update_plugin(eq1)
        self.specialist.db.add_or_update_plugin(eq2)
        self.specialist.db.add_or_update_plugin(comp1)
        self.specialist.db.add_or_update_plugin(comp2)

    def test_preference_learner_initialization(self):
        """Test preference learner initialization."""
        # Check that preference learner was initialized
        self.assertIsNotNone(self.specialist.preference_learner)

    def test_record_plugin_feedback(self):
        """Test recording plugin feedback."""
        # Record feedback
        success = self.specialist.record_plugin_feedback(
            self.test_user_id,
            "fabfilter_pro_q_3",
            accepted=True,
            rating=0.9,
            feedback_text="Great EQ!",
            context_style="ROCK",
        )

        self.assertTrue(success)

        # Check that feedback was recorded
        user_prefs = self.specialist.get_enhanced_user_preferences(self.test_user_id)
        self.assertIn("fabfilter", user_prefs.plugin_preferences.preferred_brands)

    def test_plugin_selection_with_preferences(self):
        """Test plugin selection with learned preferences."""
        # Record positive feedback for FabFilter
        self.specialist.record_plugin_feedback(
            self.test_user_id,
            "fabfilter_pro_q_3",
            accepted=True,
            rating=0.9,
            context_style="ROCK",
        )

        # Record negative feedback for Waves
        self.specialist.record_plugin_feedback(
            self.test_user_id,
            "waves_ssl_e_channel",
            accepted=False,
            context_style="ROCK",
        )

        # Get enhanced user preferences
        user_prefs = self.specialist.get_enhanced_user_preferences(self.test_user_id)

        # Select EQ plugin
        recommendation = self.specialist.select_plugin(
            PluginCategory.EQ, self.composition_context, user_preferences=user_prefs
        )

        # Check that FabFilter was recommended
        self.assertEqual(recommendation.plugin_name, "FabFilter Pro-Q 3")

    def test_export_import_preferences(self):
        """Test exporting and importing user preferences."""
        # Record feedback
        self.specialist.record_plugin_feedback(
            self.test_user_id, "fabfilter_pro_q_3", accepted=True, rating=0.9
        )

        # Export preferences
        export_data = self.specialist.export_user_preferences(self.test_user_id)

        # Create new user ID
        new_user_id = "user_test456"

        # Import preferences to new user
        success = self.specialist.import_user_preferences(new_user_id, export_data)
        self.assertTrue(success)

        # Get new user preferences
        new_user_prefs = self.specialist.get_enhanced_user_preferences(new_user_id)

        # Check that preferences were imported
        self.assertEqual(new_user_prefs.clerk_user_id, new_user_id)
        self.assertIn("fabfilter", new_user_prefs.plugin_preferences.preferred_brands)

    def test_synchronize_preferences(self):
        """Test synchronizing preferences."""
        # Add ratings directly to database
        self.specialist.db.add_user_plugin_rating(
            self.test_user_id, "fabfilter_pro_q_3", 0.9
        )
        self.specialist.db.add_user_plugin_rating(
            self.test_user_id, "waves_cla_76", 0.8
        )

        # Synchronize preferences
        success = self.specialist.synchronize_user_preferences(self.test_user_id)
        self.assertTrue(success)

        # Get user preferences
        user_prefs = self.specialist.get_enhanced_user_preferences(self.test_user_id)

        # Check that preferences were synchronized
        self.assertIn("fabfilter", user_prefs.plugin_preferences.preferred_brands)

    def test_preference_influence_on_recommendations(self):
        """Test how preferences influence plugin recommendations."""
        # Record strong preference for FabFilter
        for _ in range(3):  # Multiple positive feedbacks to strengthen preference
            self.specialist.record_plugin_feedback(
                self.test_user_id,
                "fabfilter_pro_q_3",
                accepted=True,
                rating=0.95,
                context_style="ROCK",
            )

        # Record strong aversion to Waves
        for _ in range(3):  # Multiple negative feedbacks to strengthen aversion
            self.specialist.record_plugin_feedback(
                self.test_user_id,
                "waves_ssl_e_channel",
                accepted=False,
                rating=0.2,
                context_style="ROCK",
            )

        # Get enhanced user preferences
        user_prefs = self.specialist.get_enhanced_user_preferences(self.test_user_id)

        # Select EQ plugin
        recommendation = self.specialist.select_plugin(
            PluginCategory.EQ, self.composition_context, user_preferences=user_prefs
        )

        # Check that FabFilter was recommended with high confidence
        self.assertEqual(recommendation.plugin_name, "FabFilter Pro-Q 3")
        self.assertGreater(recommendation.confidence, 0.65)

        # Check that reasoning mentions user preference or ratings
        reasoning_lower = recommendation.reasoning.lower()
        self.assertTrue(
            "preferred" in reasoning_lower
            or "previous high ratings" in reasoning_lower
            or "matches your" in reasoning_lower,
            f"Expected preference-related reasoning, got: {recommendation.reasoning}",
        )


if __name__ == "__main__":
    unittest.main()
