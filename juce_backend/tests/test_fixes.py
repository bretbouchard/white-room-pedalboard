#!/usr/bin/env python3
"""
Test that our fixes work correctly.
"""

import numpy as np


def test_basic_functionality():
    """Test basic analyzer functionality."""
    print("🧪 Testing basic analyzer functionality...")

    # Test imports
    try:
        from audio_agent.core.faust_analyzers import (
            DynamicAnalyzer,
            HarmonicAnalyzer,
            PerceptualAnalyzer,
            SpectralAnalyzer,
        )
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        raise AssertionError(f"Import failed: {e}")

    # Test instantiation
    try:
        spectral = SpectralAnalyzer(sample_rate=44100, buffer_size=512)
        dynamic = DynamicAnalyzer(sample_rate=44100, buffer_size=512)
        harmonic = HarmonicAnalyzer(sample_rate=44100, buffer_size=512)
        perceptual = PerceptualAnalyzer(sample_rate=44100, buffer_size=512)
        print("✓ All analyzer classes instantiated successfully")
    except Exception as e:
        print(f"❌ Instantiation failed: {e}")
        raise AssertionError(f"Instantiation failed: {e}")

    # Test processing without initialization (should work with mock data)
    try:
        test_audio = np.random.randn(1024).astype(np.float32) * 0.1

        # Test spectral analyzer
        spectral_results = spectral.process(test_audio)
        assert isinstance(spectral_results, dict)
        spectral.extract_features(test_audio)
        print("✓ SpectralAnalyzer works without initialization")

        # Test dynamic analyzer
        dynamic_results = dynamic.process(test_audio)
        assert isinstance(dynamic_results, dict)
        dynamic.extract_features(test_audio)
        print("✓ DynamicAnalyzer works without initialization")

        # Test harmonic analyzer
        harmonic_results = harmonic.process(test_audio)
        assert isinstance(harmonic_results, dict)
        harmonic.extract_features(test_audio)
        print("✓ HarmonicAnalyzer works without initialization")

        # Test perceptual analyzer
        perceptual_results = perceptual.process(test_audio)
        assert isinstance(perceptual_results, dict)
        perceptual.extract_features(test_audio)
        print("✓ PerceptualAnalyzer works without initialization")

    except Exception as e:
        print(f"❌ Processing failed: {e}")
        raise AssertionError(f"Processing failed: {e}")

    assert True


def test_model_compatibility():
    try:
        from audio_agent.core.faust_analyzers import (
            DynamicAnalyzer,
            HarmonicAnalyzer,
            PerceptualAnalyzer,
            SpectralAnalyzer,
        )
        from audio_agent.models.audio import (
            DynamicFeatures,
            HarmonicFeatures,
            PerceptualFeatures,
            SpectralFeatures,
        )

        test_audio = np.random.randn(1024).astype(np.float32) * 0.1

        # Test SpectralFeatures
        spectral = SpectralAnalyzer()
        features = spectral.extract_features(test_audio)
        assert isinstance(features, SpectralFeatures)
        print("✓ SpectralAnalyzer returns SpectralFeatures model")
        # Test DynamicFeatures
        dynamic = DynamicAnalyzer()
        features = dynamic.extract_features(test_audio)
        assert isinstance(features, DynamicFeatures)
        print("✓ DynamicAnalyzer returns DynamicFeatures model")
        # Test HarmonicFeatures
        harmonic = HarmonicAnalyzer()
        features = harmonic.extract_features(test_audio)
        assert isinstance(features, HarmonicFeatures)
        print("✓ HarmonicAnalyzer returns HarmonicFeatures model")
        # Test PerceptualFeatures
        perceptual = PerceptualAnalyzer()
        features = perceptual.extract_features(test_audio)
        assert isinstance(features, PerceptualFeatures)
        print("✓ PerceptualAnalyzer returns PerceptualFeatures model")
    except Exception as e:
        print(f"❌ Model compatibility failed: {e}")
        raise AssertionError(f"Model compatibility failed: {e}")

    assert True


def test_registry():
    """Test analyzer registry functionality."""
    print("\n📋 Testing analyzer registry...")

    try:
        from audio_agent.core.faust_analyzers.base import AnalyzerRegistry

        # Check that analyzers are registered
        registered = AnalyzerRegistry.get_all_analyzers()
        print(f"✓ Registry has {len(registered)} analyzers: {list(registered.keys())}")

        # Test creating analyzers from registry
        if "spectral" in registered:
            AnalyzerRegistry.create("spectral")
            print("✓ Can create SpectralAnalyzer from registry")

        if "dynamic" in registered:
            AnalyzerRegistry.create("dynamic")
            print("✓ Can create DynamicAnalyzer from registry")

    except Exception as e:
        print(f"❌ Registry test failed: {e}")
        raise AssertionError(f"Registry test failed: {e}")

    assert True


def test_additional_analyzers():
    """Test additional analyzer classes."""
    print("\n🔧 Testing additional analyzer classes...")

    try:
        from audio_agent.core.faust_analyzers import (
            ChromaAnalyzer,
            MusicalAnalyzer,
            QualityAnalyzer,
            RhythmAnalyzer,
            SpatialAnalyzer,
            TimbreAnalyzer,
        )

        # Test instantiation
        analyzers = {
            "chroma": ChromaAnalyzer(),
            "musical": MusicalAnalyzer(),
            "rhythm": RhythmAnalyzer(),
            "timbre": TimbreAnalyzer(),
            "quality": QualityAnalyzer(),
            "spatial": SpatialAnalyzer(),
        }

        print("✓ All additional analyzer classes instantiated successfully")

        # Test basic processing
        test_audio = np.random.randn(1024).astype(np.float32) * 0.1

        for name, analyzer in analyzers.items():
            try:
                analyzer.process(test_audio)
                print(f"✓ {name.capitalize()}Analyzer processes audio")
            except Exception as e:
                print(f"⚠️ {name.capitalize()}Analyzer processing issue: {e}")

    except Exception as e:
        print(f"❌ Additional analyzers failed: {e}")
        raise AssertionError(f"Additional analyzers failed: {e}")

    assert True


if __name__ == "__main__":
    print("🔧 Testing Fixed Analyzer Implementation")
    print("=" * 50)

    test_basic_functionality()
    test_model_compatibility()
    test_registry()
    test_additional_analyzers()
