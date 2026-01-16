"""Tests for the enhanced plugin database and categorization system."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from src.audio_agent.core.plugin_database import PluginDatabase, PluginDatabaseConfig
from src.audio_agent.models.plugin import (
    PluginCategory,
    PluginFeatureVector,
    PluginFormat,
    PluginMetadata,
)


class TestEnhancedPluginDatabase(unittest.TestCase):
    """Test the enhanced plugin database functionality."""

    def setUp(self):
        """Set up test environment."""
        # Create temporary database file
        self.temp_db_file = tempfile.NamedTemporaryFile(delete=False).name

        # Create test configuration
        self.config = PluginDatabaseConfig(
            database_path=self.temp_db_file,
            scan_paths=[],  # No real paths for testing
            auto_scan_on_startup=False,
            quality_score_weights={
                "manufacturer_reputation": 0.4,
                "user_ratings": 0.3,
                "feature_completeness": 0.2,
                "stability": 0.1,
            },
        )

        # Create database instance
        self.db = PluginDatabase(self.config)

        # Sample plugin metadata for testing
        self.test_plugins = [
            PluginMetadata(
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
            ),
            PluginMetadata(
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
            ),
            PluginMetadata(
                name="Valhalla VintageVerb",
                manufacturer="Valhalla DSP",
                version="2.0.0",
                unique_id="valhalla_vintage_verb",
                category=PluginCategory.REVERB,
                format=PluginFormat.AU,
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
            ),
            PluginMetadata(
                name="Serum",
                manufacturer="Xfer Records",
                version="1.3.3",
                unique_id="xfer_serum",
                category=PluginCategory.SYNTHESIZER,
                format=PluginFormat.VST3,
                input_channels=0,
                output_channels=2,
                latency_samples=0,
                cpu_usage_estimate=0.5,
                memory_usage_mb=200.0,
                quality_rating=0.95,
                user_rating=0.95,
                tags=["synth", "wavetable", "xfer"],
                supported_sample_rates=[44100, 48000, 88200, 96000],
                supports_64bit=True,
            ),
        ]

        # Add test plugins to database
        for plugin in self.test_plugins:
            self.db.add_or_update_plugin(plugin)

    def tearDown(self):
        """Clean up after tests."""
        self.db.close()
        if os.path.exists(self.temp_db_file):
            os.unlink(self.temp_db_file)

    def test_plugin_category_detection(self):
        """Test enhanced plugin category detection."""
        # Test with known plugin names
        self.assertEqual(
            self.db._guess_plugin_category("Pro-Q 3", "FabFilter"), PluginCategory.EQ
        )
        self.assertEqual(
            self.db._guess_plugin_category("CLA-76 Compressor", "Waves"),
            PluginCategory.COMPRESSOR,
        )
        self.assertEqual(
            self.db._guess_plugin_category("VintageVerb", "Valhalla"),
            PluginCategory.REVERB,
        )
        self.assertEqual(
            self.db._guess_plugin_category("Serum", "Xfer"), PluginCategory.SYNTHESIZER
        )

        # Test with generic names
        self.assertEqual(
            self.db._guess_plugin_category("Parametric Equalizer"), PluginCategory.EQ
        )
        self.assertEqual(
            self.db._guess_plugin_category("Dynamics Processor"),
            PluginCategory.COMPRESSOR,
        )
        self.assertEqual(
            self.db._guess_plugin_category("Hall Reverb"), PluginCategory.REVERB
        )
        self.assertEqual(
            self.db._guess_plugin_category("Wavetable Synth"),
            PluginCategory.SYNTHESIZER,
        )

        # Test with ambiguous names
        self.assertEqual(
            self.db._guess_plugin_category("Audio Processor"), PluginCategory.UTILITY
        )
        self.assertEqual(
            self.db._guess_plugin_category("Sound Designer"), PluginCategory.UTILITY
        )

    def test_manufacturer_reputation_scoring(self):
        """Test manufacturer reputation scoring."""
        # Test with known manufacturers
        self.assertGreater(self.db._calculate_manufacturer_reputation("FabFilter"), 0.9)
        self.assertGreater(self.db._calculate_manufacturer_reputation("Waves"), 0.8)
        self.assertGreater(
            self.db._calculate_manufacturer_reputation("Valhalla DSP"), 0.8
        )

        # Test with unknown manufacturers
        self.assertEqual(
            self.db._calculate_manufacturer_reputation("Unknown Audio"), 0.5
        )

        # Test with partial matches
        self.assertGreater(
            self.db._calculate_manufacturer_reputation("FabFilter Audio"), 0.8
        )

    def test_plugin_quality_scoring(self):
        """Test plugin quality scoring."""
        # Add user ratings
        self.db.add_user_plugin_rating("user_test123", "fabfilter_pro_q_3", 0.9)
        self.db.add_user_plugin_rating("user_test456", "fabfilter_pro_q_3", 0.8)
        self.db.add_user_plugin_rating("user_test123", "waves_cla_76", 0.7)

        # Update quality scores
        fabfilter_score = self.db.update_plugin_quality_score("fabfilter_pro_q_3")
        waves_score = self.db.update_plugin_quality_score("waves_cla_76")
        valhalla_score = self.db.update_plugin_quality_score("valhalla_vintage_verb")

        # Check scores - based on actual algorithm behavior
        # FabFilter should have highest score due to high reputation + user ratings
        self.assertGreater(fabfilter_score, 0.7)
        # Waves should have good score due to reputation + user rating
        self.assertGreater(waves_score, 0.6)
        # Valhalla should have decent score based on reputation alone
        self.assertGreater(valhalla_score, 0.55)

        # Check that scores were saved to database
        plugin = self.db.get_plugin_by_id("fabfilter_pro_q_3")
        self.assertEqual(plugin.quality_rating, fabfilter_score)

    def test_plugin_compatibility_checking(self):
        """Test plugin compatibility checking."""
        # Test same format (should be 100% compatible)
        is_compatible, score, notes = self.db.check_plugin_compatibility(
            "fabfilter_pro_q_3", PluginFormat.VST3
        )
        self.assertTrue(is_compatible)
        self.assertEqual(score, 1.0)

        # Test VST3 to AU conversion
        is_compatible, score, notes = self.db.check_plugin_compatibility(
            "fabfilter_pro_q_3", PluginFormat.AU
        )
        self.assertTrue(is_compatible)
        self.assertGreater(score, 0.5)
        self.assertIsNotNone(notes)

        # Test AU to VST3 conversion
        is_compatible, score, notes = self.db.check_plugin_compatibility(
            "valhalla_vintage_verb", PluginFormat.VST3
        )
        self.assertTrue(is_compatible)
        self.assertGreater(score, 0.5)
        self.assertIsNotNone(notes)

        # Test incompatible formats
        is_compatible, score, notes = self.db.check_plugin_compatibility(
            "fabfilter_pro_q_3", PluginFormat.WAM
        )
        self.assertFalse(is_compatible)
        self.assertLess(score, 0.5)
        self.assertIsNotNone(notes)

    def test_user_plugin_ratings(self):
        """Test user plugin ratings functionality."""
        # Add ratings
        self.db.add_user_plugin_rating(
            "user_test123", "fabfilter_pro_q_3", 0.9, "Great EQ!"
        )
        self.db.add_user_plugin_rating(
            "user_test123", "waves_cla_76", 0.7, "Good compressor"
        )
        self.db.add_user_plugin_rating(
            "user_test456", "fabfilter_pro_q_3", 0.8, "Very precise"
        )

        # Get ratings for user
        user1_ratings = self.db.get_user_plugin_ratings("user_test123")
        user2_ratings = self.db.get_user_plugin_ratings("user_test456")

        # Check ratings
        self.assertEqual(len(user1_ratings), 2)
        self.assertEqual(len(user2_ratings), 1)
        self.assertEqual(user1_ratings["fabfilter_pro_q_3"], 0.9)
        self.assertEqual(user1_ratings["waves_cla_76"], 0.7)
        self.assertEqual(user2_ratings["fabfilter_pro_q_3"], 0.8)

        # Update rating
        self.db.add_user_plugin_rating(
            "user_test123", "fabfilter_pro_q_3", 0.95, "Even better now!"
        )

        # Check updated rating
        updated_ratings = self.db.get_user_plugin_ratings("user_test123")
        self.assertEqual(updated_ratings["fabfilter_pro_q_3"], 0.95)

        # Check that plugin's average user rating was updated
        plugin = self.db.get_plugin_by_id("fabfilter_pro_q_3")
        self.assertAlmostEqual(plugin.user_rating, (0.95 + 0.8) / 2, places=2)

    def test_plugin_feature_vector(self):
        """Test plugin feature vector storage and retrieval."""
        # Create feature vector
        feature_vector = PluginFeatureVector(
            plugin_id="fabfilter_pro_q_3",
            plugin_metadata=self.test_plugins[0],
            frequency_response=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
            harmonic_character=[0.2, 0.4, 0.6, 0.8, 1.0],
            dynamic_behavior=[0.3, 0.6, 0.9, 0.6, 0.3],
            spatial_properties=[0.5, 0.5, 0.5],
            genre_affinity={"rock": 0.8, "jazz": 0.4, "electronic": 0.6},
            tempo_suitability={"slow": 0.7, "medium": 0.8, "fast": 0.5},
            instrument_compatibility={"guitar": 0.9, "vocals": 0.7, "drums": 0.5},
            ease_of_use=0.8,
            preset_quality=0.7,
            vintage_character=0.3,
            modern_character=0.7,
            feature_vector=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        )

        # Add feature vector
        success = self.db.add_plugin_feature_vector("fabfilter_pro_q_3", feature_vector)
        self.assertTrue(success)

        # Retrieve feature vector
        retrieved_vector = self.db.get_plugin_feature_vector("fabfilter_pro_q_3")

        # Check vector
        self.assertIsNotNone(retrieved_vector)
        self.assertEqual(retrieved_vector.plugin_id, "fabfilter_pro_q_3")
        self.assertEqual(retrieved_vector.ease_of_use, 0.8)
        self.assertEqual(retrieved_vector.vintage_character, 0.3)
        self.assertEqual(retrieved_vector.modern_character, 0.7)
        self.assertEqual(len(retrieved_vector.frequency_response), 10)
        self.assertEqual(retrieved_vector.genre_affinity["rock"], 0.8)

        # Update feature vector
        feature_vector.ease_of_use = 0.9
        feature_vector.genre_affinity["metal"] = 0.7

        success = self.db.add_plugin_feature_vector("fabfilter_pro_q_3", feature_vector)
        self.assertTrue(success)

        # Check updated vector
        updated_vector = self.db.get_plugin_feature_vector("fabfilter_pro_q_3")
        self.assertEqual(updated_vector.ease_of_use, 0.9)
        self.assertEqual(updated_vector.genre_affinity["metal"], 0.7)

    @patch("os.walk")
    @patch("os.path.exists")
    def test_enhanced_plugin_scanning(self, mock_exists, mock_walk):
        """Test enhanced plugin scanning with directory structure awareness."""
        # Mock os.walk to return test plugin paths
        mock_walk.return_value = [
            ("/test/path", ["plugin1.vst3", "plugin2.component"], []),
            ("/test/path/plugin1.vst3", ["Contents"], []),
            ("/test/path/plugin1.vst3/Contents", ["Resources"], []),
            ("/test/path/plugin2.component", ["Contents"], []),
            ("/test/path/plugin2.component/Contents", ["MacOS"], []),
            ("/test/path", [], ["plugin3.clap", "plugin4.wasm", "not_a_plugin.txt"]),
        ]

        # Mock os.path.exists to validate directory structure
        def mock_path_exists(path):
            if "plugin1.vst3/Contents/Resources" in path:
                return True
            if "plugin2.component/Contents/MacOS" in path:
                return True
            return True

        mock_exists.side_effect = mock_path_exists

        # Mock _extract_plugin_metadata to return test metadata
        def mock_extract_metadata(path, format):
            if "plugin1.vst3" in path:
                return PluginMetadata(
                    name="Test VST3",
                    manufacturer="Test Audio",
                    version="1.0.0",
                    unique_id="test_audio_vst3",
                    category=PluginCategory.EQ,
                    format=PluginFormat.VST3,
                    input_channels=2,
                    output_channels=2,
                    latency_samples=0,
                    cpu_usage_estimate=0.1,
                    memory_usage_mb=50.0,
                    quality_rating=0.8,
                    user_rating=0.7,
                    tags=["eq", "test"],
                    supported_sample_rates=[44100, 48000],
                    supports_64bit=True,
                )
            elif "plugin2.component" in path:
                return PluginMetadata(
                    name="Test AU",
                    manufacturer="Test Audio",
                    version="1.0.0",
                    unique_id="test_audio_au",
                    category=PluginCategory.COMPRESSOR,
                    format=PluginFormat.AU,
                    input_channels=2,
                    output_channels=2,
                    latency_samples=0,
                    cpu_usage_estimate=0.1,
                    memory_usage_mb=50.0,
                    quality_rating=0.8,
                    user_rating=0.7,
                    tags=["compressor", "test"],
                    supported_sample_rates=[44100, 48000],
                    supports_64bit=True,
                )
            elif "plugin3.clap" in path:
                return PluginMetadata(
                    name="Test CLAP",
                    manufacturer="Test Audio",
                    version="1.0.0",
                    unique_id="test_audio_clap",
                    category=PluginCategory.SYNTHESIZER,
                    format=PluginFormat.CLAP,
                    input_channels=0,
                    output_channels=2,
                    latency_samples=0,
                    cpu_usage_estimate=0.1,
                    memory_usage_mb=50.0,
                    quality_rating=0.8,
                    user_rating=0.7,
                    tags=["synth", "test"],
                    supported_sample_rates=[44100, 48000],
                    supports_64bit=True,
                )
            elif "plugin4.wasm" in path:
                return PluginMetadata(
                    name="Test WAM",
                    manufacturer="Test Audio",
                    version="1.0.0",
                    unique_id="test_audio_wam",
                    category=PluginCategory.DELAY,
                    format=PluginFormat.WAM,
                    input_channels=2,
                    output_channels=2,
                    latency_samples=0,
                    cpu_usage_estimate=0.1,
                    memory_usage_mb=50.0,
                    quality_rating=0.8,
                    user_rating=0.7,
                    tags=["delay", "test"],
                    supported_sample_rates=[44100, 48000],
                    supports_64bit=True,
                )
            return None

        self.db._extract_plugin_metadata = mock_extract_metadata

        # Set up scan paths
        self.db.config.scan_paths = ["/test/path"]

        # Scan plugins
        num_plugins = self.db.scan_plugins()

        # Check results
        self.assertEqual(num_plugins, 4)

        # Verify plugins were added
        plugin1 = self.db.get_plugin_by_id("test_audio_vst3")
        plugin2 = self.db.get_plugin_by_id("test_audio_au")
        plugin3 = self.db.get_plugin_by_id("test_audio_clap")
        plugin4 = self.db.get_plugin_by_id("test_audio_wam")

        self.assertIsNotNone(plugin1)
        self.assertIsNotNone(plugin2)
        self.assertIsNotNone(plugin3)
        self.assertIsNotNone(plugin4)

        self.assertEqual(plugin1.name, "Test VST3")
        self.assertEqual(plugin2.name, "Test AU")
        self.assertEqual(plugin3.name, "Test CLAP")
        self.assertEqual(plugin4.name, "Test WAM")

    def test_database_migration(self):
        """Test database migration functionality."""
        # Initial database should be at version 0
        conn = sqlite3.connect(self.temp_db_file)
        cursor = conn.cursor()
        cursor.execute("PRAGMA user_version")
        initial_version = cursor.fetchone()[0]
        conn.close()

        self.assertEqual(initial_version, 0)

        # Migrate to version 1.1.0
        success = self.db.migrate_database("1.1.0")
        self.assertTrue(success)

        # Check that plugin_stats table was created
        conn = sqlite3.connect(self.temp_db_file)
        cursor = conn.cursor()

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_stats'"
        )
        self.assertIsNotNone(cursor.fetchone())

        # Check that stats were populated for existing plugins
        cursor.execute("SELECT COUNT(*) FROM plugin_stats")
        stats_count = cursor.fetchone()[0]
        self.assertEqual(stats_count, 4)  # 4 test plugins

        # Migrate to version 1.2.0
        success = self.db.migrate_database("1.2.0")
        self.assertTrue(success)

        # Check that new columns were added to plugins table
        cursor.execute("PRAGMA table_info(plugins)")
        columns = [row[1] for row in cursor.fetchall()]
        self.assertIn("is_favorite", columns)
        self.assertIn("last_used", columns)

        # Check that plugin_tags table was created
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_tags'"
        )
        self.assertIsNotNone(cursor.fetchone())

        conn.close()

    def test_database_stats(self):
        """Test database statistics functionality."""
        # Get stats
        stats = self.db.get_stats()

        # Check stats
        self.assertEqual(stats["total_plugins"], 4)
        self.assertEqual(stats["plugins_by_category"]["eq"], 1)
        self.assertEqual(stats["plugins_by_category"]["compressor"], 1)
        self.assertEqual(stats["plugins_by_category"]["reverb"], 1)
        self.assertEqual(stats["plugins_by_category"]["synthesizer"], 1)

        self.assertEqual(stats["plugins_by_format"]["VST3"], 3)
        self.assertEqual(stats["plugins_by_format"]["AU"], 1)

        self.assertIn("FabFilter", stats["top_manufacturers"])
        self.assertIn("Waves", stats["top_manufacturers"])
        self.assertIn("Valhalla DSP", stats["top_manufacturers"])

        self.assertGreater(stats["avg_quality_rating"], 0.8)
        self.assertGreater(stats["avg_user_rating"], 0.8)


if __name__ == "__main__":
    unittest.main()
