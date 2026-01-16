"""
Tests for the Real Plugin Scanner functionality.

This module tests the comprehensive plugin scanning capabilities,
metadata extraction, categorization, and quality assessment.
"""

import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from src.audio_agent.core.real_plugin_scanner import RealPluginScanner
from src.audio_agent.models.plugin import PluginCategory, PluginFormat


class TestRealPluginScanner:
    """Test the real plugin scanner functionality."""

    @pytest.fixture
    def scanner(self):
        """Create a RealPluginScanner instance for testing."""
        return RealPluginScanner()

    @pytest.fixture
    def mock_vst3_plugin(self):
        """Create a mock VST3 plugin directory structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            plugin_dir = Path(temp_dir) / "TestVST3.vst3"
            plugin_dir.mkdir()

            # Create Contents directory
            contents_dir = plugin_dir / "Contents"
            contents_dir.mkdir()

            # Create Info.plist
            info_plist_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Test VST3 Plugin</string>
    <key>CFBundleVersion</key>
    <string>2.1.0</string>
    <key>CFBundleIdentifier</key>
    <string>com.testcompany.testvst3</string>
</dict>
</plist>"""

            info_plist = contents_dir / "Info.plist"
            info_plist.write_text(info_plist_content)

            yield str(plugin_dir)

    @pytest.fixture
    def mock_au_plugin(self):
        """Create a mock AU plugin directory structure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            plugin_dir = Path(temp_dir) / "TestAU.component"
            plugin_dir.mkdir()

            # Create Contents directory
            contents_dir = plugin_dir / "Contents"
            contents_dir.mkdir()

            # Create Info.plist
            info_plist_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Test AU Plugin</string>
    <key>CFBundleVersion</key>
    <string>1.5.2</string>
    <key>CFBundleIdentifier</key>
    <string>com.testcompany.TestAU</string>
</dict>
</plist>"""

            info_plist = contents_dir / "Info.plist"
            info_plist.write_text(info_plist_content)

            yield str(plugin_dir)

    @pytest.fixture
    def mock_plugin_directories(self, mock_vst3_plugin, mock_au_plugin):
        """Create mock plugin directories with various plugins."""
        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)

            # Create VST3 directory
            vst3_dir = base_dir / "VST3"
            vst3_dir.mkdir()

            # Create AU directory
            au_dir = base_dir / "AU"
            au_dir.mkdir()

            # Copy mock plugins
            os.symlink(mock_vst3_plugin, vst3_dir / "TestVST3.vst3")
            os.symlink(mock_au_plugin, au_dir / "TestAU.component")

            # Create additional mock plugins
            self._create_additional_plugins(vst3_dir, au_dir)

            yield {PluginFormat.VST3: [str(vst3_dir)], PluginFormat.AU: [str(au_dir)]}

    def _create_additional_plugins(self, vst3_dir, au_dir):
        """Create additional mock plugins for testing."""
        # Create EQ plugin
        eq_dir = vst3_dir / "FabFilter Pro-Q 3.vst3"
        eq_dir.mkdir()
        (eq_dir / "Contents").mkdir()
        (eq_dir / "Contents" / "Info.plist").write_text(
            """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>FabFilter Pro-Q 3</string>
    <key>CFBundleVersion</key>
    <string>3.22.0</string>
    <key>CFBundleIdentifier</key>
    <string>com.fabfilter.pro-q3</string>
</dict>
</plist>"""
        )

        # Create Compressor plugin
        comp_dir = au_dir / "Waves C1.comp.component"
        comp_dir.mkdir()
        (comp_dir / "Contents").mkdir()
        (comp_dir / "Contents" / "Info.plist").write_text(
            """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Waves C1 Compressor</string>
    <key>CFBundleVersion</key>
    <string>14.0.0</string>
    <key>CFBundleIdentifier</key>
    <string>com.waves.c1-compressor</string>
</dict>
</plist>"""
        )

    def test_extract_plugin_name(self, scanner):
        """Test plugin name extraction from various formats."""
        # Test VST3
        assert scanner._extract_plugin_name("/path/TestPlugin.vst3") == "TestPlugin"
        assert scanner._extract_plugin_name("/path/Test Plugin.vst3") == "Test Plugin"
        assert scanner._extract_plugin_name("/path/Test-Plugin.vst3") == "Test Plugin"
        assert scanner._extract_plugin_name("/path/Test_Plugin.vst3") == "Test Plugin"

        # Test AU
        assert (
            scanner._extract_plugin_name("/path/TestPlugin.component") == "TestPlugin"
        )
        assert (
            scanner._extract_plugin_name("/path/Test Plugin.component") == "Test Plugin"
        )

        # Test edge cases
        assert scanner._extract_plugin_name("") == "Unknown Plugin"
        assert scanner._extract_plugin_name("simple") == "simple"

    def test_extract_plugin_manufacturer(
        self, scanner, mock_vst3_plugin, mock_au_plugin
    ):
        """Test plugin manufacturer extraction."""
        # Test from bundle identifier
        manufacturer = scanner._extract_plugin_manufacturer(
            mock_vst3_plugin, "Test VST3 Plugin"
        )
        assert manufacturer == "Testcompany"

        manufacturer = scanner._extract_plugin_manufacturer(
            mock_au_plugin, "Test AU Plugin"
        )
        assert manufacturer == "Testcompany"

        # Test fallback from name
        manufacturer = scanner._extract_plugin_manufacturer(
            "/path/FabFilter Pro-Q.vst3", "FabFilter Pro-Q"
        )
        assert manufacturer == "Fabfilter"

        manufacturer = scanner._extract_plugin_manufacturer(
            "/path/Unknown Plugin.vst3", "Unknown Plugin"
        )
        assert manufacturer == "Unknown"

    def test_categorize_plugin(self, scanner):
        """Test plugin categorization logic."""
        # Test EQ plugins
        assert (
            scanner._categorize_plugin("FabFilter Pro-Q 3", "FabFilter")
            == PluginCategory.EQ
        )
        assert scanner._categorize_plugin("Parametric EQ", "Test") == PluginCategory.EQ
        assert scanner._categorize_plugin("Graphic EQ", "Test") == PluginCategory.EQ

        # Test Compressor plugins
        assert (
            scanner._categorize_plugin("Waves C1 Compressor", "Waves")
            == PluginCategory.COMPRESSOR
        )
        assert (
            scanner._categorize_plugin("SSL Bus Compressor", "Test")
            == PluginCategory.COMPRESSOR
        )
        assert scanner._categorize_plugin("Limiter", "Test") == PluginCategory.LIMITER

        # Test Reverb plugins
        assert (
            scanner._categorize_plugin("Valhalla VintageVerb", "Valhalla")
            == PluginCategory.REVERB
        )
        assert (
            scanner._categorize_plugin("Hall Reverb", "Test") == PluginCategory.REVERB
        )

        # Test Synthesizer plugins
        assert scanner._categorize_plugin("Serum", "Xfer") == PluginCategory.SYNTHESIZER
        assert (
            scanner._categorize_plugin("Wavetable Synth", "Test")
            == PluginCategory.SYNTHESIZER
        )

        # Test Analyzer plugins
        assert (
            scanner._categorize_plugin("Spectrum Analyzer", "Test")
            == PluginCategory.ANALYZER
        )
        assert (
            scanner._categorize_plugin("Phase Scope", "Test") == PluginCategory.ANALYZER
        )

        # Test default categorization
        assert (
            scanner._categorize_plugin("Unknown Tool", "Test") == PluginCategory.UTILITY
        )

    def test_assess_plugin_quality(self, scanner):
        """Test plugin quality assessment."""
        # High quality manufacturers
        assert scanner._assess_plugin_quality("/path", "FabFilter", "Pro-Q") > 0.7
        assert scanner._assess_plugin_quality("/path", "Waves", "C1") > 0.7
        assert (
            scanner._assess_plugin_quality("/path", "Native Instruments", "Kontakt")
            > 0.7
        )

        # Medium quality
        assert scanner._assess_plugin_quality("/path", "TestCompany", "Plugin") >= 0.5
        assert scanner._assess_plugin_quality("/path", "Unknown", "Plugin") == 0.5

    def test_generate_plugin_id(self, scanner):
        """Test plugin ID generation."""
        id1 = scanner._generate_plugin_id("Pro-Q 3", "FabFilter", PluginFormat.VST3)
        id2 = scanner._generate_plugin_id("Pro-Q 3", "FabFilter", PluginFormat.VST3)
        assert id1 == id2  # Should be consistent

        id3 = scanner._generate_plugin_id("Pro-Q 3", "FabFilter", PluginFormat.AU)
        assert id3 != id1  # Different format should generate different ID

        # Check ID format
        assert "_" in id1
        assert len(id1) > 10

    def test_matches_plugin_format(self, scanner):
        """Test plugin format matching."""
        # VST3 matching
        assert scanner._matches_plugin_format("/path/Test.vst3", PluginFormat.VST3)
        assert scanner._matches_plugin_format("/path/Test.VST3", PluginFormat.VST3)
        assert not scanner._matches_plugin_format(
            "/path/Test.component", PluginFormat.VST3
        )

        # AU matching
        assert scanner._matches_plugin_format("/path/Test.component", PluginFormat.AU)
        assert not scanner._matches_plugin_format("/path/Test.vst3", PluginFormat.AU)

        # Non-existent path
        assert not scanner._matches_plugin_format(
            "/nonexistent/Test.vst3", PluginFormat.VST3
        )

    @patch("src.audio_agent.core.real_plugin_scanner.platform.system")
    def test_get_system_plugin_directories_macos(self, mock_system, scanner):
        """Test getting system plugin directories on macOS."""
        mock_system.return_value = "Darwin"

        directories = scanner._get_system_plugin_directories()

        # Should include VST3 and AU directories for macOS
        assert PluginFormat.VST3 in directories
        assert PluginFormat.AU in directories

        vst3_dirs = directories[PluginFormat.VST3]
        au_dirs = directories[PluginFormat.AU]

        # Check for expected directories
        expected_vst3 = ["/Library/Audio/Plug-Ins/VST3"]
        expected_au = ["/Library/Audio/Plug-Ins/Components"]

        for expected in expected_vst3:
            assert expected in vst3_dirs

        for expected in expected_au:
            assert expected in au_dirs

    @patch("src.audio_agent.core.real_plugin_scanner.platform.system")
    def test_get_system_plugin_directories_windows(self, mock_system, scanner):
        """Test getting system plugin directories on Windows."""
        mock_system.return_value = "Windows"

        directories = scanner._get_system_plugin_directories()

        # Should include VST3 directories for Windows
        assert PluginFormat.VST3 in directories

        vst3_dirs = directories[PluginFormat.VST3]
        assert any("Program Files" in dir_path for dir_path in vst3_dirs)

    def test_scan_directory(self, scanner, mock_vst3_plugin):
        """Test scanning a directory for plugins."""
        with tempfile.TemporaryDirectory() as temp_dir:
            scan_dir = Path(temp_dir)
            # Create a symlink to our mock plugin
            plugin_link = scan_dir / "TestVST3.vst3"
            plugin_link.symlink_to(mock_vst3_plugin)

            plugins = scanner._scan_directory(str(scan_dir), PluginFormat.VST3)

            assert len(plugins) == 1
            plugin = plugins[0]
            assert plugin.name == "Test VST3 Plugin"
            assert plugin.manufacturer == "Testcompany"
            assert plugin.format == PluginFormat.VST3
            assert plugin.version == "2.1.0"

    def test_scan_system_plugins_integration(self, scanner):
        """Test integration of system plugin scanning."""
        with patch.object(scanner, "_get_system_plugin_directories") as mock_dirs:
            mock_dirs.return_value = {
                PluginFormat.VST3: ["/fake/vst3/path"],
                PluginFormat.AU: ["/fake/au/path"],
            }

            with patch.object(scanner, "_scan_directory") as mock_scan:
                mock_scan.return_value = []

                plugins = scanner.scan_system_plugins()

                # Should call scan_directory for each directory
                assert mock_scan.call_count == 2
                assert isinstance(plugins, list)

    def test_extract_plugin_metadata_vst3(self, scanner, mock_vst3_plugin):
        """Test metadata extraction from VST3 plugin."""
        metadata = scanner._extract_plugin_metadata(mock_vst3_plugin, PluginFormat.VST3)

        assert metadata is not None
        assert metadata.name == "Test VST3 Plugin"
        assert metadata.manufacturer == "Testcompany"
        assert metadata.version == "2.1.0"
        assert metadata.format == PluginFormat.VST3
        assert metadata.category == PluginCategory.UTILITY  # Default categorization
        assert metadata.supports_64bit == True

    def test_extract_plugin_metadata_au(self, scanner, mock_au_plugin):
        """Test metadata extraction from AU plugin."""
        metadata = scanner._extract_plugin_metadata(mock_au_plugin, PluginFormat.AU)

        assert metadata is not None
        assert metadata.name == "Test AU Plugin"
        assert metadata.manufacturer == "Testcompany"
        assert metadata.version == "1.5.2"
        assert metadata.format == PluginFormat.AU
        assert metadata.supports_64bit == True

    def test_enhance_plugin_metadata(self, scanner, mock_vst3_plugin):
        """Test plugin metadata enhancement."""
        metadata = scanner._extract_plugin_metadata(mock_vst3_plugin, PluginFormat.VST3)
        enhanced = scanner._enhance_plugin_metadata(metadata)

        # Should return the same metadata object (for now)
        assert enhanced == metadata

    def test_generate_tags(self, scanner):
        """Test tag generation for plugins."""
        # Basic tags
        tags = scanner._generate_tags("Pro-Q 3", "FabFilter", PluginCategory.EQ)
        assert "eq" in tags
        assert "fabfilter" in tags

        # Special tags
        tags = scanner._generate_tags("Demo Reverb", "Test", PluginCategory.REVERB)
        assert "demo" in tags
        assert "reverb" in tags

        tags = scanner._generate_tags(
            "Free Compressor", "Test", PluginCategory.COMPRESSOR
        )
        assert "free" in tags
        assert "compressor" in tags

        tags = scanner._generate_tags("Vintage EQ", "Test", PluginCategory.EQ)
        assert "vintage" in tags
        assert "eq" in tags

    def test_quality_estimates(self, scanner):
        """Test CPU and memory usage estimates."""
        # CPU usage estimates
        assert scanner._estimate_cpu_usage("/path", PluginCategory.SYNTHESIZER) > 0.3
        assert scanner._estimate_cpu_usage("/path", PluginCategory.UTILITY) < 0.1
        assert (
            scanner._estimate_cpu_usage("/path", PluginCategory.CONVOLUTION_REVERB)
            > 0.5
        )

        # Memory usage estimates
        assert (
            scanner._estimate_memory_usage("/path", PluginCategory.CONVOLUTION_REVERB)
            > 400.0
        )
        assert scanner._estimate_memory_usage("/path", PluginCategory.UTILITY) < 10.0
        assert (
            scanner._estimate_memory_usage("/path", PluginCategory.SYNTHESIZER) > 150.0
        )

    def test_supported_sample_rates(self, scanner):
        """Test supported sample rates."""
        rates = scanner._get_supported_sample_rates(PluginFormat.VST3)
        assert 44100 in rates
        assert 48000 in rates
        assert 96000 in rates
        assert 192000 in rates

    def test_error_handling(self, scanner):
        """Test error handling in various scenarios."""
        # Non-existent plugin path
        metadata = scanner._extract_plugin_metadata("/nonexistent", PluginFormat.VST3)
        assert metadata is None

        # Empty plugin name
        name = scanner._extract_plugin_name("")
        assert name == "Unknown Plugin"

        # Invalid directory
        with patch("os.listdir", side_effect=PermissionError("Permission denied")):
            plugins = scanner._scan_directory("/restricted", PluginFormat.VST3)
            assert plugins == []


class TestPluginQualityAssessment:
    """Test plugin quality assessment functionality."""

    @pytest.fixture
    def scanner(self):
        """Create a RealPluginScanner instance."""
        return RealPluginScanner()

    def test_high_quality_manufacturers(self, scanner):
        """Test recognition of high-quality manufacturers."""
        for manufacturer in scanner.high_quality_manufacturers:
            score = scanner._assess_plugin_quality("/path", manufacturer, "Test Plugin")
            assert score > 0.7

    def test_complexity_based_quality(self, scanner):
        """Test quality assessment based on plugin complexity."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create complex plugin structure
            plugin_dir = Path(temp_dir) / "Complex.vst3"
            plugin_dir.mkdir()

            # Create many subdirectories and files
            for i in range(10):
                (plugin_dir / f"subdir_{i}").mkdir()
                for j in range(5):
                    (plugin_dir / f"subdir_{i}" / f"file_{j}.txt").write_text("test")

            score = scanner._assess_plugin_quality(str(plugin_dir), "Test", "Complex")
            assert score > 0.5

    def test_format_based_quality(self, scanner):
        """Test quality assessment based on plugin format."""
        base_score = scanner._assess_plugin_quality("/path", "Test", "Plugin")

        vst3_score = scanner._assess_plugin_quality("/path/Test.vst3", "Test", "Plugin")
        clap_score = scanner._assess_plugin_quality("/path/Test.clap", "Test", "Plugin")

        assert vst3_score > base_score
        assert clap_score > base_score

    def test_quality_score_capping(self, scanner):
        """Test that quality scores are properly capped."""
        # Multiple factors that should increase score
        score = scanner._assess_plugin_quality(
            "/path/Test.vst3",  # VST3 format bonus
            "FabFilter",  # High quality manufacturer
            "Pro-Q 3",  # Complex plugin
        )

        assert score <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
