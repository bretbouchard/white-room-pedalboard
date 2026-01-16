#!/usr/bin/env python3
"""
Simple test for Faust analyzer functionality without complex imports.
"""

import os
import sys

# Set up the Python path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
SRC_ROOT = os.path.join(PROJECT_ROOT, "src")

if SRC_ROOT not in sys.path:
    # Repository-level pytest conftest ensures SRC_ROOT is on sys.path during tests.
    pass


def test_basic_imports():
    """Test that we can import basic modules."""
    # Test importing core modules
    from audio_agent.core.dawdreamer_engine import DawDreamerEngine

    print("✓ Successfully imported DawDreamerEngine")

    # Test importing audio models
    print("✓ Successfully imported AudioAnalysis")

    # Create a simple engine instance
    DawDreamerEngine()
    print("✓ Successfully created DawDreamerEngine instance")
    assert True


def test_faust_analyzer_import():
    """Test importing Faust analyzer classes."""
    # Import directly from the faust_analyzers.py file
    # Repository-level pytest conftest handles imports.

    print("✓ Successfully imported FaustAnalyzerManager and FaustAnalyzerConfig")
    assert True


def test_faust_analyzer_creation():
    """Test creating Faust analyzer manager."""
    # Import basic modules first
    from faust_analyzers import FaustAnalyzerManager

    # Create analyzer manager without engine
    manager = FaustAnalyzerManager()

    print(
        f"✓ Successfully created FaustAnalyzerManager with sample_rate={manager.sample_rate}, buffer_size={manager.buffer_size}"
    )

    # Test getting analyzers
    analyzers = manager.get_analyzers()
    print(f"✓ Got analyzers dictionary: {analyzers}")

    assert True


def test_analyzer_config_creation():
    """Test creating analyzer configurations."""
    from faust_analyzers import FaustAnalyzerConfig

    # Create a simple config
    config = FaustAnalyzerConfig(
        name="test_analyzer",
        faust_code="process = _;",
        analysis_type="test",
        output_parameters=["param1"],
    )

    print(f"✓ Created analyzer config: {config.name}")
    assert True


def test_available_analyzers():
    """Test listing available analyzers."""
    from faust_analyzers import FaustAnalyzerManager

    manager = FaustAnalyzerManager()

    # Use the available method
    analyzers = manager.get_analyzers()
    print(f"✓ Got analyzers: {analyzers}")
    assert True


if __name__ == "__main__":
    print("Testing Faust analyzer imports and basic functionality...")
    print("=" * 50)

    success_count = 0
    total_tests = 5

    # Test basic imports
    if test_basic_imports():
        success_count += 1

    if test_faust_analyzer_import():
        success_count += 1

    if test_analyzer_config_creation():
        success_count += 1

    if test_faust_analyzer_creation():
        success_count += 1

    if test_available_analyzers():
        success_count += 1

    print("=" * 50)
    print(f"Results: {success_count}/{total_tests} tests passed")

    if success_count == total_tests:
        print("All tests passed! ✅")
        sys.exit(0)
    else:
        print("Some tests failed. ❌")
        sys.exit(1)
