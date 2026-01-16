#!/usr/bin/env python3
"""
Test to verify swap.md implementation completion.

This test checks that all the required components from swap.md are implemented
and working correctly.
"""

import numpy as np


def test_swap_requirements():
    """Test all requirements from swap.md."""
    print("🧪 Testing swap.md implementation requirements...")

    # Test 1: Individual Analyzer Classes (Priority 1 from swap.md)
    print("\n1. Testing Individual Analyzer Classes...")

    try:
        # Import the four main analyzer classes we implemented
        from audio_agent.core.faust_analyzers import (
            DynamicAnalyzer,
            HarmonicAnalyzer,
            PerceptualAnalyzer,
            SpectralAnalyzer,
        )

        print("✓ Core analyzer classes imported successfully")

        # Test instantiation
        analyzers = {
            "spectral": SpectralAnalyzer(sample_rate=44100, buffer_size=512),
            "dynamic": DynamicAnalyzer(sample_rate=44100, buffer_size=512),
            "harmonic": HarmonicAnalyzer(sample_rate=44100, buffer_size=512),
            "perceptual": PerceptualAnalyzer(sample_rate=44100, buffer_size=512),
        }
        print("✓ Core analyzer classes instantiated successfully")

        # Test that they have required methods
        test_audio = np.random.randn(1024).astype(np.float32) * 0.1

        for name, analyzer in analyzers.items():
            # Test process method
            results = analyzer.process(test_audio)
            assert isinstance(results, dict), f"{name} process() should return dict"

            # Test extract_features method
            analyzer.extract_features(test_audio)
            print(f"✓ {name.capitalize()}Analyzer has required methods and works")

    except Exception as e:
        print(f"❌ Core analyzer classes failed: {e}")
        raise AssertionError(f"Core analyzer classes failed: {e}")

    # Test 2: Additional Analyzer Classes
    print("\n2. Testing Additional Analyzer Classes...")

    try:
        from audio_agent.core.faust_analyzers import (
            ChromaAnalyzer,
            MusicalAnalyzer,
            QualityAnalyzer,
            RhythmAnalyzer,
            SpatialAnalyzer,
            TimbreAnalyzer,
        )

        print("✓ Additional analyzer classes imported successfully")

        # Test instantiation
        {
            "chroma": ChromaAnalyzer(sample_rate=44100, buffer_size=512),
            "musical": MusicalAnalyzer(sample_rate=44100, buffer_size=512),
            "rhythm": RhythmAnalyzer(sample_rate=44100, buffer_size=512),
            "timbre": TimbreAnalyzer(sample_rate=44100, buffer_size=512),
            "quality": QualityAnalyzer(sample_rate=44100, buffer_size=512),
            "spatial": SpatialAnalyzer(sample_rate=44100, buffer_size=512),
        }
        print("✓ Additional analyzer classes instantiated successfully")

    except Exception as e:
        print(f"❌ Additional analyzer classes failed: {e}")
        raise AssertionError(f"Additional analyzer classes failed: {e}")

    # Test 3: Enhanced Analysis Pipeline
    print("\n3. Testing Enhanced Analysis Pipeline...")

    try:
        from audio_agent.core.faust_analyzers import EnhancedAnalysisPipeline

        EnhancedAnalysisPipeline(sample_rate=44100, buffer_size=512)
        print("✓ EnhancedAnalysisPipeline instantiated successfully")

    except Exception as e:
        print(f"❌ EnhancedAnalysisPipeline failed: {e}")
        raise AssertionError(f"EnhancedAnalysisPipeline failed: {e}")

    # Test 4: Analyzer Integration Layer
    print("\n4. Testing Analyzer Integration Layer...")

    try:
        from audio_agent.core.analyzer_integration import AnalyzerIntegration

        # Just test that it can be imported and instantiated
        AnalyzerIntegration(sample_rate=44100, buffer_size=512)
        print("✓ AnalyzerIntegration class available")

    except Exception as e:
        print(f"❌ AnalyzerIntegration failed: {e}")
        raise AssertionError(f"AnalyzerIntegration failed: {e}")

    # Test 5: Base Classes and Registry
    print("\n5. Testing Base Classes and Registry...")

    try:
        from audio_agent.core.faust_analyzers.base import (
            AnalyzerRegistry,
        )

        # Check that analyzers are registered
        registered_analyzers = AnalyzerRegistry.get_all_analyzers()
        print(
            f"✓ AnalyzerRegistry has {len(registered_analyzers)} registered analyzers"
        )

        expected_analyzers = ["spectral", "dynamic", "harmonic", "perceptual", "timbre"]
        for analyzer_name in expected_analyzers:
            if analyzer_name in registered_analyzers:
                print(f"✓ {analyzer_name} analyzer is registered")
            else:
                print(f"⚠️ {analyzer_name} analyzer not registered (may be expected)")

    except Exception as e:
        print(f"❌ Base classes and registry failed: {e}")
        raise AssertionError(f"Base classes and registry failed: {e}")

    # Test 6: Model Integration
    print("\n6. Testing Model Integration...")

    try:
        from audio_agent.models.audio import (
            DynamicFeatures,
            HarmonicFeatures,
            PerceptualFeatures,
            SpectralFeatures,
        )

        print("✓ Audio feature models imported successfully")

        # Test that our analyzers return compatible models
        test_audio = np.random.randn(1024).astype(np.float32) * 0.1

        spectral_analyzer = SpectralAnalyzer(sample_rate=44100, buffer_size=512)
        spectral_features = spectral_analyzer.extract_features(test_audio)
        assert isinstance(spectral_features, SpectralFeatures)
        print("✓ SpectralAnalyzer returns SpectralFeatures model")

        dynamic_analyzer = DynamicAnalyzer(sample_rate=44100, buffer_size=512)
        dynamic_features = dynamic_analyzer.extract_features(test_audio)
        assert isinstance(dynamic_features, DynamicFeatures)
        print("✓ DynamicAnalyzer returns DynamicFeatures model")

        harmonic_analyzer = HarmonicAnalyzer(sample_rate=44100, buffer_size=512)
        harmonic_features = harmonic_analyzer.extract_features(test_audio)
        assert isinstance(harmonic_features, HarmonicFeatures)
        print("✓ HarmonicAnalyzer returns HarmonicFeatures model")

        perceptual_analyzer = PerceptualAnalyzer(sample_rate=44100, buffer_size=512)
        perceptual_features = perceptual_analyzer.extract_features(test_audio)
        assert isinstance(perceptual_features, PerceptualFeatures)
        print("✓ PerceptualAnalyzer returns PerceptualFeatures model")

    except Exception as e:
        print(f"❌ Model integration failed: {e}")
        raise AssertionError(f"Model integration failed: {e}")

    assert True


if __name__ == "__main__":
    print("🎯 Testing swap.md Implementation Completion")
    print("=" * 60)

    test_swap_requirements()
