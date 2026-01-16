"""
Tests for Faust analyzer functionality.
"""

import os

# Import the classes from the main faust_analyzers module
import pytest

# Add project root to path to enable imports
script_dir = os.path.dirname(__file__)
project_root = os.path.normpath(os.path.join(script_dir, "..", "src"))
# Path is handled at pytest collection time by the repository conftest.

from audio_agent.core.dawdreamer_engine import DawDreamerEngine
from audio_agent.core.faust_analyzers import FaustAnalyzerConfig, FaustAnalyzerManager


class TestFaustAnalyzerConfig:
    """Test FaustAnalyzerConfig dataclass."""

    def test_config_creation(self):
        """Test creating analyzer configuration."""
        config = FaustAnalyzerConfig(
            name="test_analyzer",
            faust_code="process = _;",
            analysis_type="test",
            output_parameters=["param1", "param2"],
        )

        assert config.name == "test_analyzer"
        assert config.faust_code == "process = _;"
        assert config.analysis_type == "test"
        assert config.output_parameters == ["param1", "param2"]
        assert config.sample_rate == 44100  # Default
        assert config.buffer_size == 1024  # Default

    def test_config_with_custom_audio_settings(self):
        """Test configuration with custom audio settings."""
        config = FaustAnalyzerConfig(
            name="custom_analyzer",
            faust_code="process = _ : *(0.5);",
            analysis_type="custom",
            output_parameters=["gain"],
            sample_rate=48000,
            buffer_size=1024,
        )

        assert config.sample_rate == 48000
        assert config.buffer_size == 1024


class TestFaustAnalyzerManager:
    """Test FaustAnalyzerManager functionality."""

    @pytest.fixture
    def engine(self):
        """Create DawDreamer engine for testing."""
        return DawDreamerEngine()

    def test_analyzer_manager_initialization(self):
        """Test that Faust analyzer manager initializes correctly."""
        # Test with simplified version that doesn't require engine
        from audio_agent.core.faust_analyzers import FaustAnalyzerManager

        manager = FaustAnalyzerManager()
        assert manager is not None
        assert manager.analyzers == {}  # Initial state is empty dict

    def test_analyzer_config(self):
        """Test Faust analyzer configuration."""
        from audio_agent.core.faust_analyzers import FaustAnalyzerConfig

        config = FaustAnalyzerConfig(
            name="test_analyzer",
            faust_code="process = _;",
            analysis_type="spectral",
            output_parameters=["param1", "param2"],
        )

        assert config.name == "test_analyzer"
        assert config.analysis_type == "spectral"
        assert len(config.output_parameters) == 2
        assert isinstance(config.faust_code, str)
        assert "process" in config.faust_code


class TestFaustDSPCode:
    """Test Faust DSP code functionality."""

    def test_faust_analyzer_manager_initialization(self):
        """Test that Faust analyzer manager initializes correctly."""
        # Test with simplified version that doesn't require engine
        manager = FaustAnalyzerManager()

        # Check if analyzers dict is available
        analyzers = manager.get_analyzers()
        assert analyzers is not None
        assert isinstance(analyzers, dict)

        # Check if we can add an analyzer
        manager.analyzers["test_analyzer"] = "test_config"
        assert len(manager.analyzers) > 0

    def test_faust_analyzer_config(self):
        """Test Faust analyzer configuration."""
        config = FaustAnalyzerConfig(
            name="test_analyzer",
            faust_code='import("stdfaust.lib"); process = _;',
            analysis_type="spectral",
            output_parameters=["param1", "param2"],
        )

        assert isinstance(config.faust_code, str)
        assert len(config.faust_code) > 0
        assert "process" in config.faust_code
        assert "import(" in config.faust_code


class TestFaustAnalyzerIntegration:
    """Integration tests for Faust analyzers with DawDreamer engine."""

    @pytest.fixture
    def engine(self):
        """Create DawDreamer engine."""
        return DawDreamerEngine()

    def test_faust_dsp_code_present(self):
        """Test that analyzer classes are available in the mock."""
        from audio_agent.core.faust_analyzers import (
            DynamicAnalyzer,
            PerceptualAnalyzer,
            SpectralAnalyzer,
        )

        # Test that the analyzer classes are available
        assert SpectralAnalyzer is not None
        assert DynamicAnalyzer is not None
        assert PerceptualAnalyzer is not None

        # Test that they are classes
        assert callable(SpectralAnalyzer)
        assert callable(DynamicAnalyzer)
        assert callable(PerceptualAnalyzer)
