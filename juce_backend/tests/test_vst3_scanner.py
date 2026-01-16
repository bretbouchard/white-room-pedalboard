"""
Tests for the high-level VST3 Scanner interface.

Tests cover:
- Scanner initialization and configuration
- System directory scanning
- Plugin statistics and retrieval
- Context manager functionality
- Error handling and graceful degradation
"""

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from src.audio_agent.core.vst3_scanner import (
    VST3Scanner,
    get_plugin_summary,
    quick_scan,
)


class TestVST3Scanner(unittest.TestCase):
    """Test the high-level VST3 Scanner interface."""

    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up test fixtures."""
        import shutil

        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_scanner_initialization(self):
        """Test scanner initialization with default paths."""
        scanner = VST3Scanner(auto_scan=False)

        # Should have created database
        self.assertTrue(os.path.exists(scanner.config.database_path))
        self.assertTrue(Path(scanner.config.database_path).parent.exists())

        # Should have database instance
        self.assertIsNotNone(scanner.db)

        scanner.close()

    def test_scanner_custom_paths(self):
        """Test scanner initialization with custom paths."""
        db_path = os.path.join(self.temp_dir, "custom.db")
        cache_path = os.path.join(self.temp_dir, "custom_cache.json")

        scanner = VST3Scanner(
            database_path=db_path,
            cache_path=cache_path,
            auto_scan=False,
        )

        # Should use custom paths
        self.assertEqual(scanner.config.database_path, db_path)
        self.assertEqual(scanner.config.cache_path, cache_path)

        scanner.close()

    def test_get_plugin_count_empty(self):
        """Test getting plugin count from empty database."""
        scanner = VST3Scanner(auto_scan=False)

        count = scanner.get_plugin_count()
        self.assertEqual(count, 0)

        scanner.close()

    def test_get_scan_statistics(self):
        """Test getting scan statistics."""
        scanner = VST3Scanner(auto_scan=False)

        stats = scanner.get_scan_statistics()

        # Should have basic statistics
        self.assertIn("total_plugins", stats)
        self.assertIn("system_vst3_directories", stats)
        self.assertIn("configured_scan_paths", stats)
        self.assertIn("cache_enabled", stats)

        # Should be empty initially
        self.assertEqual(stats["total_plugins"], 0)

        scanner.close()

    def test_context_manager(self):
        """Test scanner as context manager."""
        with VST3Scanner(auto_scan=False) as scanner:
            # Scanner should be initialized
            self.assertIsNotNone(scanner.db)
            count = scanner.get_plugin_count()
            self.assertIsInstance(count, int)

        # Scanner should be closed after context
        self.assertIsNone(scanner.db._conn)

    @patch("src.audio_agent.core.plugin_database.PluginDatabase.scan_plugins")
    def test_scan_system_plugins(self, mock_scan):
        """Test system plugin scanning."""
        mock_scan.return_value = 5

        scanner = VST3Scanner(auto_scan=False)
        plugins_found = scanner.scan_system_plugins()

        self.assertEqual(plugins_found, 5)
        mock_scan.assert_called_once()

        scanner.close()

    @patch("src.audio_agent.core.plugin_database.PluginDatabase.scan_plugins")
    def test_refresh_scan(self, mock_scan):
        """Test refresh scan functionality."""
        mock_scan.return_value = 3

        scanner = VST3Scanner(auto_scan=False)

        # Create a mock cache file
        cache_file = Path(scanner.config.cache_path)
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text('{"test": "data"}')

        # Verify cache file exists
        self.assertTrue(cache_file.exists())

        # Refresh scan should clear cache and rescan
        plugins_found = scanner.refresh_scan()

        self.assertEqual(plugins_found, 3)
        mock_scan.assert_called_once()

        # Cache should be cleared
        self.assertFalse(cache_file.exists())

        scanner.close()

    @patch("src.audio_agent.core.plugin_database.PluginDatabase.scan_plugins")
    def test_scan_specific_directory(self, mock_scan):
        """Test scanning specific directory."""
        mock_scan.return_value = 2

        scanner = VST3Scanner(auto_scan=False)
        test_dir = "/path/to/test/plugins"

        plugins_found = scanner.scan_specific_directory(test_dir)

        self.assertEqual(plugins_found, 2)
        mock_scan.assert_called_once()

        scanner.close()


class TestVST3ScannerIntegration(unittest.TestCase):
    """Integration tests for VST3 Scanner."""

    def setUp(self):
        """Set up integration test fixtures."""
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up integration test fixtures."""
        import shutil

        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_end_to_end_scan_workflow(self):
        """Test complete scan workflow."""
        db_path = os.path.join(self.temp_dir, "integration.db")
        cache_path = os.path.join(self.temp_dir, "integration_cache.json")

        # Create mock plugin directory
        plugin_dir = os.path.join(self.temp_dir, "MockPlugins")
        os.makedirs(plugin_dir)

        # Create mock VST3 plugin
        mock_plugin = os.path.join(plugin_dir, "TestEQ.vst3")
        os.makedirs(os.path.join(mock_plugin, "Contents", "MacOS"))
        with open(os.path.join(mock_plugin, "Contents", "MacOS", "plugin"), "w") as f:
            f.write("mock plugin")

        with VST3Scanner(
            database_path=db_path,
            cache_path=cache_path,
            auto_scan=False,
        ) as scanner:
            # Scan specific directory
            plugins_found = scanner.scan_specific_directory(plugin_dir)
            self.assertEqual(plugins_found, 1)

            # Get plugin count
            count = scanner.get_plugin_count()
            self.assertEqual(count, 1)

            # Get statistics
            stats = scanner.get_scan_statistics()
            self.assertEqual(stats["total_plugins"], 1)

    def test_convenience_functions(self):
        """Test convenience functions."""
        # Test quick_scan function
        with patch(
            "src.audio_agent.core.vst3_scanner.VST3Scanner"
        ) as mock_scanner_class:
            mock_scanner = Mock()
            mock_scanner.scan_system_plugins.return_value = 5
            mock_scanner_class.return_value.__enter__.return_value = mock_scanner

            result = quick_scan()
            self.assertEqual(result, 5)

        # Test get_plugin_summary function
        with patch(
            "src.audio_agent.core.vst3_scanner.VST3Scanner"
        ) as mock_scanner_class:
            mock_scanner = Mock()
            mock_scanner.get_scan_statistics.return_value = {"total_plugins": 5}
            mock_scanner.get_plugin_count.return_value = 5
            mock_scanner_class.return_value.__enter__.return_value = mock_scanner

            summary = get_plugin_summary()
            self.assertEqual(summary["total_plugins"], 5)


if __name__ == "__main__":
    unittest.main(verbosity=2)
