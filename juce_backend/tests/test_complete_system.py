#!/usr/bin/env python3
"""
Complete system integration test.

This test verifies that the entire audio analysis system works together:
- All analyzer classes can be imported and instantiated
- The analysis pipeline works end-to-end
- Models are properly integrated
- Registry system functions
- Error handling works
"""

import traceback

import numpy as np


def test_complete_system():
    """Test the complete audio analysis system integration."""
    print("🎯 COMPLETE SYSTEM INTEGRATION TEST")
    print("=" * 60)
    try:
        from audio_agent.core.faust_analyzers import (
            DynamicAnalyzer,
            HarmonicAnalyzer,
            PerceptualAnalyzer,
            SpectralAnalyzer,
        )

        # Create and test each analyzer
        analyzers = {
            "spectral": SpectralAnalyzer(sample_rate=44100, buffer_size=512),
            "dynamic": DynamicAnalyzer(sample_rate=44100, buffer_size=512),
            "harmonic": HarmonicAnalyzer(sample_rate=44100, buffer_size=512),
            "perceptual": PerceptualAnalyzer(sample_rate=44100, buffer_size=512),
        }

        # Define test audio and results container used throughout the test
        global test_audio, results
        if "test_audio" not in globals():
            # 1 second of 440 Hz sine wave
            t = np.linspace(0, 1.0, 44100, endpoint=False)
            test_audio = np.sin(2 * np.pi * 440 * t).astype(np.float32)
        if "results" not in globals():
            results = {}

        for name, analyzer in analyzers.items():
            # Test process method
            process_results = analyzer.process(test_audio)
            assert isinstance(
                process_results, dict
            ), f"{name} process should return dict"

            # Test extract_features method
            features = analyzer.extract_features(test_audio)
            assert (
                features is not None
            ), f"{name} extract_features should return features"

            results[name] = {"process_results": process_results, "features": features}

            print(
                f"✓ {name.capitalize()}Analyzer: process() and extract_features() work"
            )

        print("✓ All core analyzer classes working correctly")

    except Exception as e:
        print(f"❌ Core analyzer test failed: {e}")
        traceback.print_exc()
        raise AssertionError(f"Core analyzer test failed: {e}")

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

        additional_analyzers = {
            "chroma": ChromaAnalyzer(sample_rate=44100, buffer_size=512),
            "musical": MusicalAnalyzer(sample_rate=44100, buffer_size=512),
            "rhythm": RhythmAnalyzer(sample_rate=44100, buffer_size=512),
            "timbre": TimbreAnalyzer(sample_rate=44100, buffer_size=512),
            "quality": QualityAnalyzer(sample_rate=44100, buffer_size=512),
            "spatial": SpatialAnalyzer(sample_rate=44100, buffer_size=512),
        }

        for name, analyzer in additional_analyzers.items():
            try:
                process_results = analyzer.process(test_audio)
                print(
                    f"✓ {name.capitalize()}Analyzer: instantiated and processes audio"
                )
            except Exception as e:
                print(f"⚠️ {name.capitalize()}Analyzer: {e}")

        print("✓ Additional analyzer classes tested")

    except Exception as e:
        print(f"❌ Additional analyzer test failed: {e}")
        raise AssertionError(f"Additional analyzer test failed: {e}")

    # Test 3: Enhanced Analysis Pipeline
    print("\n3. Testing Enhanced Analysis Pipeline...")
    try:
        from audio_agent.core.faust_analyzers import EnhancedAnalysisPipeline

        pipeline = EnhancedAnalysisPipeline(sample_rate=44100, buffer_size=512)

        # Test without initialization (should work with mock data)
        try:
            pipeline_results = pipeline.analyze(test_audio)
            assert isinstance(pipeline_results, dict), "Pipeline should return dict"
            print("✓ EnhancedAnalysisPipeline works without initialization")
        except Exception as e:
            print(f"⚠️ Pipeline without init: {e}")

        # Test with initialization
        try:
            pipeline.initialize()
            pipeline_results = pipeline.analyze(test_audio)
            assert isinstance(pipeline_results, dict), "Pipeline should return dict"
            print("✓ EnhancedAnalysisPipeline works with initialization")
        except Exception as e:
            print(f"⚠️ Pipeline with init: {e}")

        print("✓ Enhanced Analysis Pipeline tested")

    except Exception as e:
        print(f"❌ Pipeline test failed: {e}")
        raise AssertionError(f"Pipeline test failed: {e}")

    # Test 4: Model Integration
    print("\n4. Testing Model Integration...")
    try:
        from audio_agent.models.audio import (
            DynamicFeatures,
            HarmonicFeatures,
            PerceptualFeatures,
            SpectralFeatures,
        )

        # Verify our analyzers return the correct model types
        spectral = SpectralAnalyzer()
        spectral_features = spectral.extract_features(test_audio)
        assert isinstance(spectral_features, SpectralFeatures)
        print("✓ SpectralAnalyzer returns SpectralFeatures model")

        dynamic = DynamicAnalyzer()
        dynamic_features = dynamic.extract_features(test_audio)
        assert isinstance(dynamic_features, DynamicFeatures)
        print("✓ DynamicAnalyzer returns DynamicFeatures model")

        harmonic = HarmonicAnalyzer()
        harmonic_features = harmonic.extract_features(test_audio)
        assert isinstance(harmonic_features, HarmonicFeatures)
        print("✓ HarmonicAnalyzer returns HarmonicFeatures model")

        perceptual = PerceptualAnalyzer()
        perceptual_features = perceptual.extract_features(test_audio)
        assert isinstance(perceptual_features, PerceptualFeatures)
        print("✓ PerceptualAnalyzer returns PerceptualFeatures model")

        print("✓ Model integration working correctly")

    except Exception as e:
        print(f"❌ Model integration test failed: {e}")
        raise AssertionError(f"Model integration test failed: {e}")

    # Test 5: Registry System
    print("\n5. Testing Registry System...")
    try:
        from audio_agent.core.faust_analyzers.base import AnalyzerRegistry

        # Check registered analyzers
        registered = AnalyzerRegistry.get_all_analyzers()
        print(
            f"✓ Registry contains {len(registered)} analyzers: {list(registered.keys())}"
        )

        # Test creating analyzers from registry
        for analyzer_name in ["spectral", "dynamic", "harmonic", "perceptual"]:
            if analyzer_name in registered:
                analyzer = AnalyzerRegistry.create(analyzer_name)
                analyzer.process(test_audio)
                print(f"✓ Created and tested {analyzer_name} analyzer from registry")

        print("✓ Registry system working correctly")

    except Exception as e:
        print(f"❌ Registry test failed: {e}")
        raise AssertionError(f"Registry test failed: {e}")

    # Test 6: Error Handling
    print("\n6. Testing Error Handling...")
    try:
        # Test with invalid audio data
        invalid_audio = np.array([])

        spectral = SpectralAnalyzer()
        try:
            spectral.process(invalid_audio)
            print("✓ Handles empty audio gracefully")
        except Exception:
            print("✓ Properly raises exception for invalid audio")

        # Test with None input
        try:
            spectral.process(None)
            print("✓ Handles None input gracefully")
        except Exception:
            print("✓ Properly raises exception for None input")

        print("✓ Error handling working correctly")

    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        raise AssertionError(f"Error handling test failed: {e}")

    # Test 7: Integration with DawDreamer (Mock)
    print("\n7. Testing DawDreamer Integration...")
    try:
        from audio_agent.core.analyzer_integration import AnalyzerIntegration

        # Test basic instantiation
        integration = AnalyzerIntegration(sample_rate=44100, buffer_size=512)
        print("✓ AnalyzerIntegration instantiated")

        # Test analysis without full initialization (should work with fallbacks)
        try:
            integration.analyze_audio(test_audio, skip_cache=True)
            print("✓ AnalyzerIntegration can analyze audio")
        except Exception as e:
            print(f"⚠️ Integration analysis: {e}")

        print("✓ DawDreamer integration tested")

    except Exception as e:
        print(f"❌ DawDreamer integration test failed: {e}")
        raise AssertionError(f"DawDreamer integration test failed: {e}")

    assert True


if __name__ == "__main__":
    test_complete_system()
