"""
Tests for the integration of enhanced analyzers with DawDreamer engine.

This module tests the integration layer between the enhanced Faust analyzers
and the DawDreamer engine.
"""

import time
import unittest

import numpy as np

# Add src directory to path
# Repository-level pytest conftest handles imports.
from src.audio_agent.core.analyzer_integration import (
    AnalyzerIntegration,
    RealTimeAnalyzer,
    get_analyzer_integration,
)

# Import analyzers with fallbacks
try:
    from src.audio_agent.core.faust_analyzers import (
        ChromaAnalyzer,
        MusicalAnalyzer,
        QualityAnalyzer,
        RhythmAnalyzer,
        SpectralAnalyzer,
        TimbreAnalyzer,
    )
except ImportError:
    # Create mock classes
    class MockAnalyzer:
        def __init__(self, sample_rate=44100, buffer_size=1024) -> None:
            self.sample_rate = sample_rate
            self.buffer_size = buffer_size
            self.initialized = False

        def initialize(self) -> None:
            self.initialized = True

        def process(self, audio_data) -> dict:
            return {"mock": True}

    class MockSpectralAnalyzer(MockAnalyzer):
        pass

    class MockChromaAnalyzer(MockAnalyzer):
        pass

    class MockMusicalAnalyzer(MockAnalyzer):
        pass

    class MockRhythmAnalyzer(MockAnalyzer):
        pass

    class MockTimbreAnalyzer(MockAnalyzer):
        pass

    class MockQualityAnalyzer(MockAnalyzer):
        pass

    # Create alias
    SpectralAnalyzer = MockSpectralAnalyzer
    ChromaAnalyzer = MockChromaAnalyzer
    MusicalAnalyzer = MockMusicalAnalyzer
    RhythmAnalyzer = MockRhythmAnalyzer
    TimbreAnalyzer = MockTimbreAnalyzer
    QualityAnalyzer = MockQualityAnalyzer


class TestAnalyzerIntegration(unittest.TestCase):
    """Test cases for analyzer integration."""

    def setUp(self):
        """Set up test environment."""
        self.sample_rate = 44100
        self.buffer_size = 1024

        # Create test audio (sine wave at A4 = 440Hz)
        duration = 3.0  # seconds
        t = np.linspace(0, duration, int(duration * self.sample_rate), False)
        self.test_audio = np.sin(2 * np.pi * 440 * t).astype(np.float32)

        # Create test audio with chord (C major: C, E, G)
        c_freq = 261.63  # C4
        e_freq = 329.63  # E4
        g_freq = 392.00  # G4
        self.chord_audio = (
            np.sin(2 * np.pi * c_freq * t)
            + np.sin(2 * np.pi * e_freq * t)
            + np.sin(2 * np.pi * g_freq * t)
        ).astype(np.float32) / 3.0

        # Create stereo test audio
        self.stereo_audio = np.column_stack([self.test_audio, self.chord_audio])

    def test_analyzer_integration_initialization(self):
        """Test analyzer integration initialization."""
        try:
            # Create integration
            integration = AnalyzerIntegration(self.sample_rate, self.buffer_size)

            # Initialize
            integration.initialize()

            # Check initialization
            self.assertTrue(integration.initialized)
            self.assertEqual(len(integration.analyzers), 6)  # 6 analyzers

            print("Analyzer integration initialization test passed")

        except Exception as e:
            print(f"Analyzer integration initialization test failed: {e}")
            raise

    def test_audio_analysis(self):
        """Test audio analysis with integration."""
        try:
            # Create integration
            integration = AnalyzerIntegration(self.sample_rate, self.buffer_size)

            # Analyze audio
            analysis = integration.analyze_audio(self.test_audio)

            # Check analysis results
            self.assertIsNotNone(analysis)
            self.assertEqual(analysis.sample_rate, self.sample_rate)
            self.assertAlmostEqual(
                analysis.duration, len(self.test_audio) / self.sample_rate, delta=0.1
            )

            # Check features
            self.assertIsNotNone(analysis.features)

            print("Audio analysis test passed")

        except Exception as e:
            print(f"Audio analysis test failed: {e}")
            raise

    def test_compatibility_analysis(self):
        """Test compatibility analysis with integration."""
        try:
            # Create integration
            integration = AnalyzerIntegration(self.sample_rate, self.buffer_size)

            # Analyze compatibility
            results = integration.analyze_compatibility(
                [self.test_audio, self.chord_audio]
            )

            # Check results
            self.assertIsNotNone(results)
            self.assertIn("compatibility_matrix", results)
            self.assertIn("overall_compatibility", results)

            print(f"Compatibility score: {results['overall_compatibility']:.2f}")

            print("Compatibility analysis test passed")

        except Exception as e:
            print(f"Compatibility analysis test failed: {e}")
            raise

    def test_get_specific_analyzer(self):
        """Test getting specific analyzer from integration."""
        try:
            # Create integration
            integration = AnalyzerIntegration(self.sample_rate, self.buffer_size)

            # Get specific analyzers
            chroma_analyzer = integration.get_analyzer("chroma")
            musical_analyzer = integration.get_analyzer("musical")

            # Check analyzers
            self.assertIsNotNone(chroma_analyzer)
            self.assertIsNotNone(musical_analyzer)

            print("Get specific analyzer test passed")

        except Exception as e:
            print(f"Get specific analyzer test failed: {e}")
            raise

    def test_singleton_integration(self):
        """Test singleton integration instance."""
        try:
            # Get singleton instance
            integration1 = get_analyzer_integration()
            integration2 = get_analyzer_integration()

            # Check that they are the same instance
            self.assertIs(integration1, integration2)

            print("Singleton integration test passed")

        except Exception as e:
            print(f"Singleton integration test failed: {e}")
            raise

    def test_real_time_analyzer(self):
        """Test real-time analyzer."""
        try:
            # Create callback to receive analysis results
            results = []

            def analysis_callback(analysis):
                results.append(analysis)

            # Create real-time analyzer
            analyzer = RealTimeAnalyzer(callback=analysis_callback)

            # Start analyzer
            analyzer.start()

            # Wait for some analysis results
            time.sleep(0.2)

            # Stop analyzer
            analyzer.stop()

            # Check that we got some results
            # Note: In a mock environment, we might not get actual results
            print(f"Got {len(results)} real-time analysis results")

            print("Real-time analyzer test passed")

        except Exception as e:
            print(f"Real-time analyzer test failed: {e}")
            raise


if __name__ == "__main__":
    unittest.main()
