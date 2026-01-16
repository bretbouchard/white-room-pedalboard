#!/usr/bin/env python3
"""
Simple tests for core modules that we can initialize without complex dependencies.
"""


import pytest

# Add src to path
# Repository-level pytest conftest handles imports.


def test_faust_analyzers_simple():
    """Test Faust analyzers functionality."""
    from audio_agent.core.faust_analyzers import (
        FaustAnalyzerConfig,
        FaustAnalyzerManager,
    )

    # Create analyzer manager (basic test)
    manager = FaustAnalyzerManager()
    assert manager is not None
    assert hasattr(manager, "get_analyzers")

    # Create analyzer config (basic test)
    config = FaustAnalyzerConfig(
        name="test_analyzer",
        faust_code="process = _;",
        analysis_type="test",
        output_parameters=["param1"],
    )
    assert config is not None
    assert config.name == "test_analyzer"

    # Test that we can get analyzers
    analyzers = manager.get_analyzers()
    assert isinstance(analyzers, dict)


def test_error_handling_simple():
    """Test error handling functionality."""
    from audio_agent.core.error_handling import AudioAgentError

    # Test error class (basic test)
    error = AudioAgentError("Test error")
    assert error is not None
    assert str(error) == "Test error"


def test_basic_imports():
    """Test basic imports work."""
    # Test importing core modules
    from audio_agent.core.dawdreamer_engine import DawDreamerEngine

    assert DawDreamerEngine is not None

    # Test importing audio models
    from audio_agent.models.audio import AudioAnalysis

    assert AudioAnalysis is not None

    # Test importing plugin models
    from audio_agent.models.plugin import PluginInstance

    assert PluginInstance is not None

    # Test importing composition models
    from audio_agent.models.composition import CompositionContext

    assert CompositionContext is not None

    # Test importing user models
    from audio_agent.models.user import UserProfile

    assert UserProfile is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
