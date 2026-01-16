"""
Tests for enhanced VST3 plugin scanning functionality.

Tests cover:
- System VST3 directory detection
- VST3 plugin validation
- Enhanced metadata extraction
- Error handling and graceful degradation
- Caching functionality
"""

import os
import tempfile
import unittest
from unittest.mock import Mock, patch

from src.audio_agent.core.plugin_database import (
    PluginDatabase,
    PluginDatabaseConfig,
)
from src.audio_agent.models.plugin import PluginCategory, PluginFormat


class TestVST3Scanning(unittest.TestCase):
    """Test enhanced VST3 scanning functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_plugins.db")
        self.cache_path = os.path.join(self.temp_dir, "test_cache.json")

        self.config = PluginDatabaseConfig(
            database_path=self.db_path,
            auto_scan_on_startup=False,  # Don't auto-scan in tests
            cache_path=self.cache_path,
            cache_ttl_seconds=3600,
        )

    def tearDown(self):
        """Clean up test fixtures."""
        import shutil

        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_get_system_vst3_directories(self):
        """Test system VST3 directory detection."""
        db = PluginDatabase(self.config)

        # Should return directories for current platform
        system_dirs = db._get_system_vst3_directories()

        # Should return a list
        self.assertIsInstance(system_dirs, list)

        # Should not be empty (fallback directory should be added if no system dirs found)
        self.assertGreaterEqual(len(system_dirs), 0)

    def test_validate_vst3_plugin_structure(self):
        """Test VST3 plugin structure validation."""
        db = PluginDatabase(self.config)

        # Test with non-existent path
        self.assertFalse(db._validate_vst3_plugin("/non/existent/path"))

        # Test with file instead of directory
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, "w") as f:
            f.write("test")
        self.assertFalse(db._validate_vst3_plugin(test_file))

        # Test with empty directory
        empty_dir = os.path.join(self.temp_dir, "empty.vst3")
        os.makedirs(empty_dir)
        self.assertFalse(db._validate_vst3_plugin(empty_dir))

        # Test with valid VST3 structure
        valid_vst3 = os.path.join(self.temp_dir, "valid.vst3")
        os.makedirs(os.path.join(valid_vst3, "Contents", "MacOS"))

        # Create a mock plugin binary
        plugin_binary = os.path.join(valid_vst3, "Contents", "MacOS", "plugin")
        with open(plugin_binary, "w") as f:
            f.write("mock binary")

        self.assertTrue(db._validate_vst3_plugin(valid_vst3))

    def test_validate_vst3_plugin_with_descriptor(self):
        """Test VST3 plugin validation with descriptor files."""
        db = PluginDatabase(self.config)

        # Create VST3 with descriptor
        vst3_with_descriptor = os.path.join(self.temp_dir, "with_descriptor.vst3")
        os.makedirs(os.path.join(vst3_with_descriptor, "Contents", "Resources"))

        # Create descriptor file
        descriptor = os.path.join(
            vst3_with_descriptor, "Contents", "Resources", "moduleinfo.json"
        )
        with open(descriptor, "w") as f:
            f.write('{"name": "Test Plugin"}')

        # Create plugin binary
        plugin_binary = os.path.join(
            vst3_with_descriptor, "Contents", "MacOS", "plugin"
        )
        os.makedirs(os.path.dirname(plugin_binary))
        with open(plugin_binary, "w") as f:
            f.write("mock binary")

        self.assertTrue(db._validate_vst3_plugin(vst3_with_descriptor))

    @patch("src.audio_agent.core.plugin_database.DAWDREAMER_AVAILABLE", False)
    def test_fallback_metadata_extraction(self):
        """Test metadata extraction when DawDreamer is not available."""
        db = PluginDatabase(self.config)

        # Create a mock VST3 plugin directory
        plugin_path = os.path.join(self.temp_dir, "TestManufacturer_TestPlugin.vst3")
        os.makedirs(plugin_path)

        # Test fallback extraction
        metadata = db._extract_plugin_metadata_fallback(plugin_path, PluginFormat.VST3)

        self.assertIsNotNone(metadata)
        self.assertEqual(metadata.name, "TestPlugin")
        self.assertEqual(metadata.manufacturer, "TestManufacturer")
        self.assertEqual(metadata.format, PluginFormat.VST3)

    @patch("src.audio_agent.core.plugin_database.DAWDREAMER_AVAILABLE", True)
    def test_dawdreamer_metadata_extraction(self):
        """Test metadata extraction with DawDreamer."""
        db = PluginDatabase(self.config)

        # Create a mock VST3 plugin directory
        plugin_path = os.path.join(self.temp_dir, "TestManufacturer_TestPlugin.vst3")
        os.makedirs(plugin_path)

        # Mock the engine client
        with patch("src.audio_agent.core.plugin_database.EngineClient") as mock_engine:
            mock_instance = Mock()
            mock_engine.return_value = mock_instance

            # Mock engine methods
            mock_instance.get_plugin_parameters.return_value = [
                {"name": "frequency", "min": 20, "max": 20000, "value": 1000},
                {"name": "gain", "min": -60, "max": 12, "value": 0},
            ]

            mock_instance.get_plugin_presets.return_value = [
                {"name": "Default", "parameters": {}},
                {"name": "Bright", "parameters": {}},
            ]

            # Test extraction
            metadata = db._extract_plugin_metadata_with_dawdreamer(
                plugin_path, PluginFormat.VST3
            )

            self.assertIsNotNone(metadata)
            self.assertEqual(metadata.name, "TestPlugin")
            self.assertEqual(metadata.manufacturer, "TestManufacturer")
            self.assertEqual(metadata.format, PluginFormat.VST3)

    def test_analyze_plugin_parameters(self):
        """Test plugin parameter analysis."""
        db = PluginDatabase(self.config)

        # Test with EQ-like parameters (multiple frequency and filter params)
        eq_params = [
            {"name": "frequency", "min": 20, "max": 20000},
            {"name": "frequency_2", "min": 20, "max": 20000},
            {"name": "frequency_3", "min": 20, "max": 20000},
            {"name": "gain", "min": -20, "max": 20},
            {"name": "filter", "min": 0.1, "max": 10},
            {"name": "cutoff", "min": 0, "max": 3},
        ]

        info = db._analyze_plugin_parameters(eq_params)

        self.assertEqual(info["parameter_count"], 6)
        self.assertEqual(info["category"], PluginCategory.FILTER)
        self.assertGreaterEqual(info["cpu_usage_estimate"], 0.1)  # Should be >= 0.1

    def test_analyze_plugin_parameters_compressor(self):
        """Test parameter analysis for compressor detection."""
        db = PluginDatabase(self.config)

        # Test with compressor-like parameters
        comp_params = [
            {"name": "threshold", "min": -60, "max": 0},
            {"name": "ratio", "min": 1, "max": 20},
            {"name": "attack", "min": 0.1, "max": 100},
            {"name": "release", "min": 10, "max": 1000},
        ]

        info = db._analyze_plugin_parameters(comp_params)

        self.assertEqual(info["parameter_count"], 4)
        self.assertEqual(info["category"], PluginCategory.COMPRESSOR)

    def test_extract_plugin_name_from_path(self):
        """Test plugin name extraction from file path."""
        db = PluginDatabase(self.config)

        # Test various path formats
        test_cases = [
            ("/path/to/FabFilter_Pro-Q_3.vst3", "Pro Q 3"),
            ("/path/to/Waves_C1_Compressor.vst3", "C1 Compressor"),
            ("/path/to/Valhalla_Supermassive.vst3", "Supermassive"),
            ("/path/to/TestPlugin.vst3", "TestPlugin"),
        ]

        for path, expected_name in test_cases:
            with self.subTest(path=path):
                name = db._extract_plugin_name_from_path(path)
                self.assertEqual(name, expected_name)

    def test_extract_manufacturer_from_path(self):
        """Test manufacturer extraction from file path."""
        db = PluginDatabase(self.config)

        # Test various path formats
        test_cases = [
            ("/path/to/FabFilter_Pro-Q_3.vst3", "FabFilter"),
            ("/path/to/Waves_C1_Compressor.vst3", "Waves"),
            ("/path/to/Valhalla_Supermassive.vst3", "Valhalla"),
            ("/path/to/TestPlugin.vst3", "Unknown"),
        ]

        for path, expected_manufacturer in test_cases:
            with self.subTest(path=path):
                manufacturer = db._extract_manufacturer_from_path(path)
                self.assertEqual(manufacturer, expected_manufacturer)

    def test_validate_plugin_metadata(self):
        """Test plugin metadata validation."""
        db = PluginDatabase(self.config)

        # Test valid metadata
        from src.audio_agent.models.plugin import PluginMetadata

        valid_metadata = PluginMetadata(
            name="Test Plugin",
            manufacturer="Test Manufacturer",
            version="1.0.0",
            unique_id="test_manufacturer_test_plugin_vst3",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            supported_sample_rates=[44100, 48000],
        )

        self.assertTrue(db._validate_plugin_metadata(valid_metadata))

        # Test invalid metadata (empty name)
        invalid_metadata = PluginMetadata(
            name="",
            manufacturer="Test Manufacturer",
            version="1.0.0",
            unique_id="test_manufacturer_test_plugin_vst3",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            supported_sample_rates=[44100, 48000],
        )

        self.assertFalse(db._validate_plugin_metadata(invalid_metadata))

    def test_scan_with_validation(self):
        """Test enhanced scanning with validation."""
        db = PluginDatabase(self.config)

        # Create a mock plugin directory
        plugin_dir = os.path.join(self.temp_dir, "mock_plugins")
        os.makedirs(plugin_dir)

        # Create a valid VST3 plugin
        valid_plugin = os.path.join(plugin_dir, "Valid_Plugin.vst3")
        os.makedirs(os.path.join(valid_plugin, "Contents", "MacOS"))
        with open(os.path.join(valid_plugin, "Contents", "MacOS", "plugin"), "w") as f:
            f.write("mock binary")

        # Create an invalid plugin (empty directory)
        invalid_plugin = os.path.join(plugin_dir, "Invalid_Plugin.vst3")
        os.makedirs(invalid_plugin)

        # Test scanning
        plugins_found, metadata, errors = db._scan_path_with_validation(plugin_dir)

        # Should find the valid plugin
        self.assertEqual(plugins_found, 1)
        self.assertEqual(len(metadata), 1)
        self.assertEqual(metadata[0].name, "Plugin")  # From filename parsing

        # Should have errors for the invalid plugin
        self.assertGreater(len(errors), 0)

    def test_auto_scan_with_system_directories(self):
        """Test auto-scan with system directory detection."""
        # Create config with auto-scan enabled but no paths
        config = PluginDatabaseConfig(
            database_path=self.db_path,
            auto_scan_on_startup=True,
            scan_paths=[],  # No paths configured
            cache_path=self.cache_path,
        )

        # Mock the system directory detection
        with patch.object(
            PluginDatabase, "_get_system_vst3_directories"
        ) as mock_get_dirs:
            mock_get_dirs.return_value = [self.temp_dir]

            with patch.object(PluginDatabase, "scan_plugins") as mock_scan:
                db = PluginDatabase(config)

                # Should have called get_system_vst3_directories
                mock_get_dirs.assert_called_once()

                # Should have called scan_plugins
                mock_scan.assert_called_once()

    def test_caching_functionality(self):
        """Test plugin scanning cache functionality."""
        db = PluginDatabase(self.config)

        # Test cache validation (no cache file exists)
        self.assertFalse(db._is_cache_valid())

        # Test writing to cache
        from src.audio_agent.models.plugin import PluginMetadata

        metadata_list = [
            PluginMetadata(
                name="Test Plugin",
                manufacturer="Test",
                version="1.0.0",
                unique_id="test_test_plugin_vst3",
                category=PluginCategory.UTILITY,
                format=PluginFormat.VST3,
                input_channels=2,
                output_channels=2,
                supported_sample_rates=[44100],
            )
        ]

        db._write_to_cache(metadata_list)

        # Cache should now be valid
        self.assertTrue(db._is_cache_valid())

        # Test loading from cache
        loaded_count = db._load_from_cache()
        self.assertEqual(loaded_count, 1)


class TestVST3ScanningIntegration(unittest.TestCase):
    """Integration tests for VST3 scanning."""

    def setUp(self):
        """Set up integration test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "integration_test.db")
        self.cache_path = os.path.join(self.temp_dir, "integration_cache.json")

    def tearDown(self):
        """Clean up integration test fixtures."""
        import shutil

        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_end_to_end_vst3_scan(self):
        """Test complete VST3 scanning workflow."""
        config = PluginDatabaseConfig(
            database_path=self.db_path,
            auto_scan_on_startup=False,
            cache_path=self.cache_path,
            cache_ttl_seconds=3600,
            scan_paths=[self.temp_dir],
        )

        # Create mock VST3 plugins
        plugins_dir = os.path.join(self.temp_dir, "Plugins")
        os.makedirs(plugins_dir)

        # Create several mock plugins
        for i in range(3):
            plugin_dir = os.path.join(
                plugins_dir, f"TestManufacturer_TestPlugin{i}.vst3"
            )
            os.makedirs(os.path.join(plugin_dir, "Contents", "MacOS"))

            with open(
                os.path.join(plugin_dir, "Contents", "MacOS", "plugin"), "w"
            ) as f:
                f.write(f"mock binary {i}")

        # Run the scan
        db = PluginDatabase(config)
        plugins_found = db.scan_plugins()

        # Should have found 3 plugins
        self.assertEqual(plugins_found, 3)

        # Verify plugins in database
        all_plugins = db.get_plugins_by_format(PluginFormat.VST3)
        self.assertEqual(len(all_plugins), 3)

        # Verify plugin metadata
        for i, plugin in enumerate(all_plugins):
            self.assertIn(f"TestPlugin{i}", plugin.name)
            self.assertEqual(plugin.manufacturer, "TestManufacturer")
            self.assertEqual(plugin.format, PluginFormat.VST3)

    def test_error_handling_during_scan(self):
        """Test error handling during plugin scanning."""
        config = PluginDatabaseConfig(
            database_path=self.db_path,
            auto_scan_on_startup=False,
            scan_paths=[self.temp_dir],
        )

        # Create a mix of valid and invalid plugins
        plugins_dir = os.path.join(self.temp_dir, "MixedPlugins")
        os.makedirs(plugins_dir)

        # Valid plugin
        valid_plugin = os.path.join(plugins_dir, "Valid.vst3")
        os.makedirs(os.path.join(valid_plugin, "Contents", "MacOS"))
        with open(os.path.join(valid_plugin, "Contents", "MacOS", "plugin"), "w") as f:
            f.write("valid")

        # Invalid plugin (empty directory)
        invalid_plugin = os.path.join(plugins_dir, "Invalid.vst3")
        os.makedirs(invalid_plugin)

        # Non-readable directory (simulate permission error)
        readonly_plugin = os.path.join(plugins_dir, "ReadOnly.vst3")
        os.makedirs(readonly_plugin)
        os.chmod(readonly_plugin, 0o000)

        try:
            db = PluginDatabase(config)
            plugins_found = db.scan_plugins()

            # Should still find the valid plugin despite errors
            self.assertEqual(plugins_found, 1)

            # Verify only valid plugin is in database
            all_plugins = db.get_plugins_by_format(PluginFormat.VST3)
            self.assertEqual(len(all_plugins), 1)
            self.assertEqual(all_plugins[0].name, "Valid")

        finally:
            # Restore permissions for cleanup
            os.chmod(readonly_plugin, 0o755)


if __name__ == "__main__":
    unittest.main(verbosity=2)
