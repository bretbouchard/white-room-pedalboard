"""Tests for the plugin database and categorization system."""

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


class TestPluginDatabase(unittest.TestCase):
    """Test the plugin database functionality."""

    def setUp(self):
        """Set up test environment."""
        # Create temporary database file
        self.temp_db_file = tempfile.NamedTemporaryFile(delete=False).name

        # Create test configuration
        self.config = PluginDatabaseConfig(
            database_path=self.temp_db_file,
            scan_paths=[],  # No real paths for testing
            auto_scan_on_startup=False,
        )

        # Create database instance
        self.db = PluginDatabase(self.config)

        # Sample plugin metadata for testing
        self.test_plugin = PluginMetadata(
            name="Test EQ",
            manufacturer="Test Audio",
            version="1.0.0",
            unique_id="test_audio_test_eq_vst3",
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

    def tearDown(self):
        """Clean up after tests."""
        self.db.close()
        if os.path.exists(self.temp_db_file):
            os.unlink(self.temp_db_file)

    def test_database_initialization(self):
        """Test database initialization."""
        # Check that database file was created
        self.assertTrue(os.path.exists(self.temp_db_file))

        # Check that tables were created
        conn = sqlite3.connect(self.temp_db_file)
        cursor = conn.cursor()

        # Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        # Check required tables exist
        required_tables = [
            "plugins",
            "plugin_parameters",
            "plugin_presets",
            "user_plugin_ratings",
            "plugin_feature_vectors",
            "plugin_compatibility",
        ]

        for table in required_tables:
            self.assertIn(table, tables)

        conn.close()

    def test_add_plugin(self):
        """Test adding a plugin to the database."""
        # Add test plugin
        plugin_id = self.db.add_or_update_plugin(self.test_plugin)

        # Check plugin was added
        self.assertEqual(plugin_id, self.test_plugin.unique_id)

        # Retrieve plugin and check data
        retrieved_plugin = self.db.get_plugin_by_id(plugin_id)
        self.assertIsNotNone(retrieved_plugin)
        self.assertEqual(retrieved_plugin.name, self.test_plugin.name)
        self.assertEqual(retrieved_plugin.manufacturer, self.test_plugin.manufacturer)
        self.assertEqual(retrieved_plugin.category, self.test_plugin.category)
        self.assertEqual(retrieved_plugin.format, self.test_plugin.format)

    def test_update_plugin(self):
        """Test updating a plugin in the database."""
        # Add test plugin
        self.db.add_or_update_plugin(self.test_plugin)

        # Modify plugin
        updated_plugin = self.test_plugin.model_copy()
        updated_plugin.name = "Updated EQ"
        updated_plugin.quality_rating = 0.9

        # Update plugin
        self.db.add_or_update_plugin(updated_plugin)

        # Retrieve plugin and check data
        retrieved_plugin = self.db.get_plugin_by_id(self.test_plugin.unique_id)
        self.assertIsNotNone(retrieved_plugin)
        self.assertEqual(retrieved_plugin.name, "Updated EQ")
        self.assertEqual(retrieved_plugin.quality_rating, 0.9)

    def test_get_plugins_by_category(self):
        """Test retrieving plugins by category."""
        # Add test plugins with different categories
        eq_plugin = self.test_plugin.model_copy()
        eq_plugin.unique_id = "test_eq"
        eq_plugin.category = PluginCategory.EQ

        comp_plugin = self.test_plugin.model_copy()
        comp_plugin.unique_id = "test_comp"
        comp_plugin.name = "Test Compressor"
        comp_plugin.category = PluginCategory.COMPRESSOR

        self.db.add_or_update_plugin(eq_plugin)
        self.db.add_or_update_plugin(comp_plugin)

        # Get plugins by category
        eq_plugins = self.db.get_plugins_by_category(PluginCategory.EQ)
        comp_plugins = self.db.get_plugins_by_category(PluginCategory.COMPRESSOR)

        # Check results
        self.assertEqual(len(eq_plugins), 1)
        self.assertEqual(eq_plugins[0].unique_id, "test_eq")

        self.assertEqual(len(comp_plugins), 1)
        self.assertEqual(comp_plugins[0].unique_id, "test_comp")

    def test_get_plugins_by_format(self):
        """Test retrieving plugins by format."""
        # Add test plugins with different formats
        vst_plugin = self.test_plugin.model_copy()
        vst_plugin.unique_id = "test_vst"
        vst_plugin.format = PluginFormat.VST3

        au_plugin = self.test_plugin.model_copy()
        au_plugin.unique_id = "test_au"
        au_plugin.name = "Test AU"
        au_plugin.format = PluginFormat.AU

        self.db.add_or_update_plugin(vst_plugin)
        self.db.add_or_update_plugin(au_plugin)

        # Get plugins by format
        vst_plugins = self.db.get_plugins_by_format(PluginFormat.VST3)
        au_plugins = self.db.get_plugins_by_format(PluginFormat.AU)

        # Check results
        self.assertEqual(len(vst_plugins), 1)
        self.assertEqual(vst_plugins[0].unique_id, "test_vst")

        self.assertEqual(len(au_plugins), 1)
        self.assertEqual(au_plugins[0].unique_id, "test_au")

    def test_search_plugins(self):
        """Test searching for plugins."""
        # Add test plugins
        plugin1 = self.test_plugin.model_copy()
        plugin1.unique_id = "fabfilter_pro_q3"
        plugin1.name = "Pro-Q 3"
        plugin1.manufacturer = "FabFilter"
        plugin1.category = PluginCategory.EQ

        plugin2 = self.test_plugin.model_copy()
        plugin2.unique_id = "waves_ssl_comp"
        plugin2.name = "SSL G-Master Compressor"
        plugin2.manufacturer = "Waves"
        plugin2.category = PluginCategory.COMPRESSOR

        plugin3 = self.test_plugin.model_copy()
        plugin3.unique_id = "fabfilter_pro_c2"
        plugin3.name = "Pro-C 2"
        plugin3.manufacturer = "FabFilter"
        plugin3.category = PluginCategory.COMPRESSOR

        self.db.add_or_update_plugin(plugin1)
        self.db.add_or_update_plugin(plugin2)
        self.db.add_or_update_plugin(plugin3)

        # Search by manufacturer
        fabfilter_plugins = self.db.search_plugins("FabFilter")
        self.assertEqual(len(fabfilter_plugins), 2)

        # Search by name
        pro_plugins = self.db.search_plugins("Pro")
        self.assertEqual(len(pro_plugins), 2)

        # Search by category
        comp_plugins = self.db.search_plugins(
            "", categories=[PluginCategory.COMPRESSOR]
        )
        self.assertEqual(len(comp_plugins), 2)

        # Combined search
        fabfilter_comp_plugins = self.db.search_plugins(
            "FabFilter", categories=[PluginCategory.COMPRESSOR]
        )
        self.assertEqual(len(fabfilter_comp_plugins), 1)
        self.assertEqual(fabfilter_comp_plugins[0].unique_id, "fabfilter_pro_c2")

    def test_user_plugin_ratings(self):
        """Test user plugin ratings."""
        # Add test plugin
        self.db.add_or_update_plugin(self.test_plugin)

        # Add user rating
        clerk_user_id = "user_test123456"
        self.db.add_user_plugin_rating(
            clerk_user_id, self.test_plugin.unique_id, 0.9, "Great plugin!"
        )

        # Get user ratings
        ratings = self.db.get_user_plugin_ratings(clerk_user_id)

        # Check results
        self.assertIn(self.test_plugin.unique_id, ratings)
        self.assertEqual(ratings[self.test_plugin.unique_id], 0.9)

        # Update rating
        self.db.add_user_plugin_rating(
            clerk_user_id, self.test_plugin.unique_id, 0.8, "Still good but not perfect"
        )

        # Check updated rating
        ratings = self.db.get_user_plugin_ratings(clerk_user_id)
        self.assertEqual(ratings[self.test_plugin.unique_id], 0.8)

    def test_plugin_compatibility(self):
        """Test plugin compatibility checking."""
        # Add test plugin
        self.db.add_or_update_plugin(self.test_plugin)

        # Check compatibility with same format (should be 100% compatible)
        is_compatible, score, notes = self.db.check_plugin_compatibility(
            self.test_plugin.unique_id, PluginFormat.VST3
        )
        self.assertTrue(is_compatible)
        self.assertEqual(score, 1.0)

        # Check compatibility with different format
        is_compatible, score, notes = self.db.check_plugin_compatibility(
            self.test_plugin.unique_id, PluginFormat.AU
        )
        # The exact result depends on the compatibility matrix
        # but we can check that the function returns a valid result
        self.assertIsInstance(is_compatible, bool)
        self.assertIsInstance(score, float)

    def test_plugin_feature_vector(self):
        """Test plugin feature vector storage and retrieval."""
        # Add test plugin
        self.db.add_or_update_plugin(self.test_plugin)

        # Create feature vector
        feature_vector = PluginFeatureVector(
            plugin_id=self.test_plugin.unique_id,
            plugin_metadata=self.test_plugin,
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
        success = self.db.add_plugin_feature_vector(
            self.test_plugin.unique_id, feature_vector
        )
        self.assertTrue(success)

        # Retrieve feature vector
        retrieved_vector = self.db.get_plugin_feature_vector(self.test_plugin.unique_id)

        # Check results
        self.assertIsNotNone(retrieved_vector)
        self.assertEqual(retrieved_vector.plugin_id, self.test_plugin.unique_id)
        self.assertEqual(retrieved_vector.ease_of_use, 0.8)
        self.assertEqual(retrieved_vector.vintage_character, 0.3)
        self.assertEqual(retrieved_vector.modern_character, 0.7)
        self.assertEqual(len(retrieved_vector.frequency_response), 10)
        self.assertEqual(len(retrieved_vector.feature_vector), 10)
        self.assertIn("rock", retrieved_vector.genre_affinity)
        self.assertEqual(retrieved_vector.genre_affinity["rock"], 0.8)

    @patch("os.walk")
    def test_scan_plugins(self, mock_walk):
        """Test plugin scanning."""
        # Mock os.walk to return test plugin paths
        mock_walk.return_value = [
            (
                "/test/path",
                [],
                ["plugin1.vst3", "plugin2.component", "not_a_plugin.txt"],
            )
        ]

        # Set up scan paths
        self.db.config.scan_paths = ["/test/path"]

        # Mock _extract_plugin_metadata to return test metadata
        def mock_extract_metadata(path, format):
            if "plugin1.vst3" in path:
                plugin = self.test_plugin.model_copy()
                plugin.unique_id = "test_plugin1"
                plugin.name = "Plugin 1"
                plugin.format = PluginFormat.VST3
                return plugin
            elif "plugin2.component" in path:
                plugin = self.test_plugin.model_copy()
                plugin.unique_id = "test_plugin2"
                plugin.name = "Plugin 2"
                plugin.format = PluginFormat.AU
                return plugin
            return None

        self.db._extract_plugin_metadata = mock_extract_metadata

        # Scan plugins
        num_plugins = self.db.scan_plugins()

        # Check results
        self.assertEqual(num_plugins, 2)

        # Verify plugins were added
        plugin1 = self.db.get_plugin_by_id("test_plugin1")
        plugin2 = self.db.get_plugin_by_id("test_plugin2")

        self.assertIsNotNone(plugin1)
        self.assertIsNotNone(plugin2)
        self.assertEqual(plugin1.name, "Plugin 1")
        self.assertEqual(plugin2.name, "Plugin 2")

    def test_database_migration(self):
        """Test database migration."""
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

        # Check that new tables were created
        conn = sqlite3.connect(self.temp_db_file)
        cursor = conn.cursor()

        # Check for plugin_stats table
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_stats'"
        )
        self.assertIsNotNone(cursor.fetchone())

        conn.close()

    def test_database_stats(self):
        """Test database statistics."""
        # Add test plugins
        plugin1 = self.test_plugin.model_copy()
        plugin1.unique_id = "test_eq1"
        plugin1.category = PluginCategory.EQ

        plugin2 = self.test_plugin.model_copy()
        plugin2.unique_id = "test_eq2"
        plugin2.category = PluginCategory.EQ

        plugin3 = self.test_plugin.model_copy()
        plugin3.unique_id = "test_comp"
        plugin3.category = PluginCategory.COMPRESSOR

        self.db.add_or_update_plugin(plugin1)
        self.db.add_or_update_plugin(plugin2)
        self.db.add_or_update_plugin(plugin3)

        # Get stats
        stats = self.db.get_stats()

        # Check results
        self.assertEqual(stats["total_plugins"], 3)
        self.assertEqual(stats["plugins_by_category"]["eq"], 2)
        self.assertEqual(stats["plugins_by_category"]["compressor"], 1)


if __name__ == "__main__":
    unittest.main()
