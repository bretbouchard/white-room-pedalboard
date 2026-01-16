#!/usr/bin/env python3
"""
Integration tests for core modules to improve overall test coverage.
"""


import pytest

# Add src to path
# Repository-level pytest conftest manages PYTHONPATH; no per-test insertion required.


def test_dawdreamer_engine_core():
    """Test core DawDreamer engine functionality."""
    from audio_agent.core.dawdreamer_engine import DawDreamerEngine

    # Create engine instance (basic test)
    engine = DawDreamerEngine()
    assert engine is not None
    assert hasattr(engine, "get_plugin_registration_function")


def test_plugin_database_core():
    """Test core plugin database functionality."""
    from audio_agent.core.plugin_database import PluginDatabase, PluginDatabaseConfig

    # Test that classes exist without initializing complex dependencies
    assert PluginDatabase is not None
    assert PluginDatabaseConfig is not None
    required_methods = [
        "scan_plugins",
        "add_or_update_plugin",
        "get_plugin_by_id",
        "search_plugins",
        "add_user_plugin_rating",
        "get_user_plugin_ratings",
        "get_stats",
        "close",
        "migrate_database",
    ]
    for method in required_methods:
        assert hasattr(PluginDatabase, method)


def test_faust_analyzers_core():
    """Test core Faust analyzers functionality."""
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


def test_audio_source_manager_core():
    """Test core audio source manager functionality."""
    from audio_agent.core.audio_source_manager import AudioSourceManager

    # Create manager instance (basic test)
    manager = AudioSourceManager()
    assert manager is not None
    assert hasattr(manager, "create_source")


def test_error_handling_core():
    """Test core error handling functionality."""
    from audio_agent.core.error_handling import AudioAgentError

    # Test error classes (basic test)
    error = AudioAgentError("Test error")
    assert error is not None
    assert str(error) == "Test error"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
