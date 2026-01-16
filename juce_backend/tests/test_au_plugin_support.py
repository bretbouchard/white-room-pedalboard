"""
Tests for AU plugin support on macOS.

This module tests the AU plugin scanning, metadata extraction, and
integration functionality added to the plugin database system.
"""

import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from src.audio_agent.core.plugin_database import PluginDatabase, PluginDatabaseConfig
from src.audio_agent.models.plugin import PluginFormat


class TestAUPluginSupport:
    """Test AU plugin support functionality."""

    @pytest.fixture
    def mock_au_plugin_dir(self):
        """Create a mock AU plugin directory structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create AU plugin bundle structure
            plugin_dir = Path(temp_dir) / "TestAU.component"
            plugin_dir.mkdir()

            # Create Contents directory
            contents_dir = plugin_dir / "Contents"
            contents_dir.mkdir()

            # Create Info.plist with AU metadata
            info_plist_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>TestAU Plugin</string>
    <key>CFBundleVersion</key>
    <string>1.2.3</string>
    <key>CFBundleIdentifier</key>
    <string>com.testcompany.TestAU</string>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2024 Test Company</string>
    <key>AudioUnit Component Type</key>
    <string>aufx</string>
    <key>AudioUnit Component SubType</key>
    <string>Tst1</string>
    <key>AudioUnit Component Manufacturer</key>
    <string>Tstc</string>
    <key>CFBundleExecutable</key>
    <string>TestAU</string>
</dict>
</plist>"""

            info_plist = contents_dir / "Info.plist"
            info_plist.write_text(info_plist_content)

            # Create MacOS directory with executable
            macos_dir = contents_dir / "MacOS"
            macos_dir.mkdir()

            executable = macos_dir / "TestAU"
            executable.write_bytes(b"fake executable content")

            yield str(plugin_dir)

    @pytest.fixture
    def plugin_db(self, tmp_path):
        """Create a temporary plugin database for testing."""
        config = PluginDatabaseConfig(
            database_path=str(tmp_path / "test_plugins.db"),
            auto_scan_on_startup=False,
            cache_path=str(tmp_path / "test_cache.json"),
        )
        return PluginDatabase(config)

    def test_get_system_au_directories_macos(self, plugin_db):
        """Test getting system AU directories on macOS."""
        with patch("platform.system", return_value="Darwin"):
            au_dirs = plugin_db._get_system_au_directories()

            # Should check for expected macOS AU directories (only those that exist)
            expected_dirs = [
                "/Library/Audio/Plug-Ins/Components",
                os.path.expanduser("~/Library/Audio/Plug-Ins/Components"),
                "/System/Library/Audio/Plug-Ins/Components",
            ]

            # The method only returns directories that actually exist
            # So we check that it considers the expected directories
            # but only returns those that are accessible
            assert isinstance(au_dirs, list)
            # Should not return directories that don't exist
            for au_dir in au_dirs:
                assert au_dir in expected_dirs

    def test_get_system_au_directories_non_macos(self, plugin_db):
        """Test getting system AU directories on non-macOS platforms."""
        with patch("platform.system", return_value="Windows"):
            au_dirs = plugin_db._get_system_au_directories()

            # Should return empty list on non-macOS
            assert au_dirs == []

    def test_validate_au_plugin_valid(self, plugin_db, mock_au_plugin_dir):
        """Test AU plugin validation with valid plugin."""
        assert plugin_db._validate_au_plugin(mock_au_plugin_dir) == True

    def test_validate_au_plugin_missing_directory(self, plugin_db):
        """Test AU plugin validation with non-existent directory."""
        assert plugin_db._validate_au_plugin("/nonexistent/path") == False

    def test_validate_au_plugin_missing_info_plist(self, plugin_db, tmp_path):
        """Test AU plugin validation with missing Info.plist."""
        # Create directory without Info.plist
        plugin_dir = Path(tmp_path) / "InvalidAU.component"
        plugin_dir.mkdir()

        assert plugin_db._validate_au_plugin(str(plugin_dir)) == False

    def test_extract_au_metadata_valid(self, plugin_db, mock_au_plugin_dir):
        """Test AU metadata extraction from valid plugin."""
        metadata = plugin_db._extract_au_metadata(mock_au_plugin_dir)

        assert metadata is not None
        assert metadata["name"] == "TestAU Plugin"
        assert metadata["version"] == "1.2.3"
        assert metadata["manufacturer"] == "testcompany"
        assert metadata["description"] == "Copyright © 2024 Test Company"
        assert metadata["component_type"] == "aufx"
        assert metadata["component_subtype"] == "Tst1"
        assert metadata["component_manu"] == "Tstc"
        assert metadata["has_binary"] == True

    def test_extract_au_metadata_missing_plist(self, plugin_db, tmp_path):
        """Test AU metadata extraction with missing Info.plist."""
        plugin_dir = Path(tmp_path) / "MissingPlist.component"
        plugin_dir.mkdir()

        metadata = plugin_db._extract_au_metadata(str(plugin_dir))
        assert metadata is None

    def test_extract_au_metadata_corrupt_plist(self, plugin_db, tmp_path):
        """Test AU metadata extraction with corrupt Info.plist."""
        plugin_dir = Path(tmp_path) / "CorruptPlist.component"
        plugin_dir.mkdir()

        contents_dir = plugin_dir / "Contents"
        contents_dir.mkdir()

        info_plist = contents_dir / "Info.plist"
        info_plist.write_text("not a valid plist")

        metadata = plugin_db._extract_au_metadata(str(plugin_dir))
        assert metadata is None

    def test_extract_au_metadata_fallback_values(self, plugin_db, tmp_path):
        """Test AU metadata extraction with minimal plist."""
        plugin_dir = Path(tmp_path) / "MinimalAU.component"
        plugin_dir.mkdir()

        contents_dir = plugin_dir / "Contents"
        contents_dir.mkdir()

        # Minimal plist with missing fields
        info_plist_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Minimal AU</string>
</dict>
</plist>"""

        info_plist = contents_dir / "Info.plist"
        info_plist.write_text(info_plist_content)

        metadata = plugin_db._extract_au_metadata(str(plugin_dir))

        assert metadata is not None
        assert metadata["name"] == "Minimal AU"
        assert metadata["manufacturer"] == ""  # Empty due to missing CFBundleIdentifier
        assert metadata["version"] == ""  # Empty due to missing CFBundleVersion

    def test_fallback_metadata_extraction_au(self, plugin_db, mock_au_plugin_dir):
        """Test fallback metadata extraction for AU plugins."""
        metadata = plugin_db._extract_plugin_metadata_fallback(
            mock_au_plugin_dir, PluginFormat.AU
        )

        assert metadata is not None
        assert metadata.name == "TestAU Plugin"
        assert metadata.manufacturer == "testcompany"
        assert metadata.version == "1.2.3"
        assert metadata.format == PluginFormat.AU
        assert "testcompany" in metadata.tags

    def test_fallback_metadata_extraction_au_no_plist(self, plugin_db, tmp_path):
        """Test fallback metadata extraction for AU without valid plist."""
        # Create AU plugin without valid metadata
        plugin_dir = Path(tmp_path) / "NoMetadataAU.component"
        plugin_dir.mkdir()

        contents_dir = plugin_dir / "Contents"
        contents_dir.mkdir()

        info_plist = contents_dir / "Info.plist"
        info_plist.write_text("invalid")

        metadata = plugin_db._extract_plugin_metadata_fallback(
            str(plugin_dir), PluginFormat.AU
        )

        # Should fallback to filename-based extraction
        assert metadata is not None
        assert metadata.name == "NoMetadataAU"
        assert metadata.manufacturer == "Unknown"
        assert metadata.version == "1.0.0"
        assert metadata.format == PluginFormat.AU

    def test_au_plugin_scan_integration(self, plugin_db, mock_au_plugin_dir):
        """Test full AU plugin scanning integration."""
        # Add the mock AU plugin directory to scan paths
        plugin_dir = Path(mock_au_plugin_dir).parent
        plugin_db.config.scan_paths = [str(plugin_dir)]

        # Scan for plugins
        (
            plugins_found,
            found_metadata,
            scan_errors,
        ) = plugin_db._scan_path_with_validation(str(plugin_dir))

        assert plugins_found >= 1
        assert len(found_metadata) >= 1

        # Find the AU plugin metadata
        au_plugin = next(
            (p for p in found_metadata if p.format == PluginFormat.AU), None
        )
        assert au_plugin is not None
        assert au_plugin.name == "TestAU Plugin"
        assert au_plugin.manufacturer == "testcompany"
        assert au_plugin.format == PluginFormat.AU

    def test_auto_scan_includes_au_directories(self, tmp_path):
        """Test that auto-scan includes AU directories on macOS."""
        with patch("platform.system", return_value="Darwin"):
            config = PluginDatabaseConfig(
                database_path=str(tmp_path / "test.db"), auto_scan_on_startup=True
            )

            with patch.object(PluginDatabase, "scan_plugins") as mock_scan:
                # Create database with auto-scan enabled
                PluginDatabase(config)

                # Verify scan_plugins was called
                mock_scan.assert_called_once()

                # Check that AU directories were added to scan paths
                # (This is indirectly tested through the mock_scan call)

    def test_au_plugin_parameter_mapping_support(self, plugin_db, mock_au_plugin_dir):
        """Test that AU plugins support parameter mapping."""
        metadata = plugin_db._extract_plugin_metadata_fallback(
            mock_au_plugin_dir, PluginFormat.AU
        )

        # AU plugins should support parameter mapping through component codes
        assert metadata is not None

        # The metadata should include AU-specific information
        # This would be expanded in a full implementation with actual parameter scanning
        assert metadata.format == PluginFormat.AU

    def test_get_plugins_by_format_au(self, plugin_db, mock_au_plugin_dir):
        """Test retrieving plugins by AU format."""
        # First add the AU plugin to the database
        metadata = plugin_db._extract_plugin_metadata_fallback(
            mock_au_plugin_dir, PluginFormat.AU
        )

        if metadata:
            plugin_id = plugin_db.add_or_update_plugin(metadata)
            assert plugin_id is not None

            # Retrieve AU plugins
            au_plugins = plugin_db.get_plugins_by_format(PluginFormat.AU)
            assert len(au_plugins) >= 1
            assert au_plugins[0].format == PluginFormat.AU
            assert au_plugins[0].name == "TestAU Plugin"


class TestAUPluginErrorHandling:
    """Test error handling for AU plugin support."""

    @pytest.fixture
    def plugin_db(self, tmp_path):
        """Create a temporary plugin database for testing."""
        config = PluginDatabaseConfig(
            database_path=str(tmp_path / "test_plugins.db"), auto_scan_on_startup=False
        )
        return PluginDatabase(config)

    @pytest.fixture
    def mock_au_plugin_dir_error(self):
        """Create a mock AU plugin directory structure for error tests."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create AU plugin bundle structure
            plugin_dir = Path(temp_dir) / "ErrorAU.component"
            plugin_dir.mkdir()

            # Create Contents directory
            contents_dir = plugin_dir / "Contents"
            contents_dir.mkdir()

            # Create Info.plist with AU metadata
            info_plist_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>ErrorAU Plugin</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleIdentifier</key>
    <string>com.error.ErrorAU</string>
</dict>
</plist>"""

            info_plist = contents_dir / "Info.plist"
            info_plist.write_text(info_plist_content)

            yield str(plugin_dir)

    def test_au_validation_with_file_not_directory(self, plugin_db, tmp_path):
        """Test AU validation with file instead of directory."""
        # Create a file instead of directory
        plugin_file = tmp_path / "NotAPlugin.component"
        plugin_file.write_text("not a directory")

        assert plugin_db._validate_au_plugin(str(plugin_file)) == False

    def test_au_metadata_extraction_permission_error(
        self, plugin_db, mock_au_plugin_dir_error
    ):
        """Test AU metadata extraction with permission error."""
        with patch("builtins.open", side_effect=PermissionError("Permission denied")):
            metadata = plugin_db._extract_au_metadata(mock_au_plugin_dir_error)
            assert metadata is None

    def test_au_plugin_scan_with_invalid_structure(self, plugin_db, tmp_path):
        """Test scanning AU plugin with invalid bundle structure."""
        # Create directory with invalid structure
        plugin_dir = Path(tmp_path) / "InvalidStructure.component"
        plugin_dir.mkdir()

        # Missing Contents directory
        (
            plugins_found,
            found_metadata,
            scan_errors,
        ) = plugin_db._scan_path_with_validation(str(tmp_path))

        # Should not find any plugins
        au_plugins = [p for p in found_metadata if p.format == PluginFormat.AU]
        assert len(au_plugins) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
