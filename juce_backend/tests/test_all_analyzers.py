#!/usr/bin/env python3
"""
Comprehensive test for all Faust-based analyzer classes.

This test verifies that all analyzer classes can be imported, instantiated,
and used correctly according to the swap.md specifications.
"""

import numpy as np


def test_all_analyzers():
    """Test all analyzer classes comprehensively."""
    print("🧪 Testing all Faust-based analyzer classes...")

    # Test imports
    try:
        from audio_agent.core.faust_analyzers import (
            ChromaAnalyzer,
            DynamicAnalyzer,
            EnhancedAnalysisPipeline,
            HarmonicAnalyzer,
            HarmonicCompatibilityAnalyzer,
            MusicalAnalyzer,
            PerceptualAnalyzer,
            QualityAnalyzer,
            RhythmAnalyzer,
            SpatialAnalyzer,
            SpectralAnalyzer,
            TimbreAnalyzer,
        )
        from audio_agent.models.audio import AudioAnalysis

        print("✓ All analyzer classes imported successfully")
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        raise AssertionError(f"Import failed: {e}")

    # Test analyzer instantiation
    analyzers = {}
    analyzer_classes = {
        "spectral": SpectralAnalyzer,
        "dynamic": DynamicAnalyzer,
        "harmonic": HarmonicAnalyzer,
        "perceptual": PerceptualAnalyzer,
        "chroma": ChromaAnalyzer,
        "musical": MusicalAnalyzer,
        "rhythm": RhythmAnalyzer,
        "timbre": TimbreAnalyzer,
        "quality": QualityAnalyzer,
        "spatial": SpatialAnalyzer,
    }

    for name, analyzer_class in analyzer_classes.items():
        try:
            analyzer = analyzer_class(sample_rate=44100, buffer_size=512)
            analyzers[name] = analyzer
            print(f"✓ {name.capitalize()}Analyzer instantiated successfully")
        except Exception as e:
            print(f"❌ Failed to instantiate {name}Analyzer: {e}")
            raise AssertionError(f"Failed to instantiate {name}Analyzer: {e}")

    # Test analyzer methods
    test_audio = np.random.randn(1024).astype(np.float32) * 0.1

    for name, analyzer in analyzers.items():
        try:
            # Test process method
            results = analyzer.process(test_audio)
            assert isinstance(results, dict), f"{name} process() should return dict"
            print(f"✓ {name.capitalize()}Analyzer process() method works")

            # Test extract_features method if available
            if hasattr(analyzer, "extract_features"):
                analyzer.extract_features(test_audio)
                print(f"✓ {name.capitalize()}Analyzer extract_features() method works")

        except Exception as e:
            print(f"❌ {name.capitalize()}Analyzer failed: {e}")
            raise AssertionError(f"{name.capitalize()}Analyzer failed: {e}")

    # Test EnhancedAnalysisPipeline
    try:
        pipeline = EnhancedAnalysisPipeline(sample_rate=44100, buffer_size=512)
        pipeline.initialize()
        results = pipeline.analyze(test_audio)
        assert isinstance(
            results, AudioAnalysis
        ), "Pipeline should return AudioAnalysis"
        print("✓ EnhancedAnalysisPipeline works correctly")
    except Exception as e:
        print(f"❌ EnhancedAnalysisPipeline failed: {e}")
        raise AssertionError(f"EnhancedAnalysisPipeline failed: {e}")

    # Test HarmonicCompatibilityAnalyzer
    try:
        compat_analyzer = HarmonicCompatibilityAnalyzer(
            sample_rate=44100, buffer_size=512
        )
        compat_analyzer.initialize()

        # Test with multiple audio buffers
        audio_buffers = [test_audio, test_audio * 0.8, test_audio * 1.2]
        compatibility = compat_analyzer.analyze_compatibility(audio_buffers)
        assert isinstance(
            compatibility, dict
        ), "Compatibility analyzer should return dict"
        print("✓ HarmonicCompatibilityAnalyzer works correctly")
    except Exception as e:
        print(f"❌ HarmonicCompatibilityAnalyzer failed: {e}")
        raise AssertionError(f"HarmonicCompatibilityAnalyzer failed: {e}")

    print("\n" + "=" * 60)
    print("Tests passed: All analyzer classes working correctly!")
    print("🎉 All Faust-based analyzers are ready for use!")
    assert True


def test_analyzer_integration():
    """Test the AnalyzerIntegration class."""
    print("\n🔗 Testing AnalyzerIntegration class...")

    try:
        from audio_agent.core.analyzer_integration import AnalyzerIntegration

        # Create integration instance
        integration = AnalyzerIntegration(sample_rate=44100, buffer_size=512)
        integration.initialize()

        # Test audio analysis
        test_audio = np.random.randn(1024).astype(np.float32) * 0.1
        integration.analyze_audio(test_audio)

        print("✓ AnalyzerIntegration initialized and working correctly")
        assert True

    except Exception as e:
        print(f"❌ AnalyzerIntegration failed: {e}")
        raise AssertionError(f"AnalyzerIntegration failed: {e}")


if __name__ == "__main__":
    test_all_analyzers()
    test_analyzer_integration()
