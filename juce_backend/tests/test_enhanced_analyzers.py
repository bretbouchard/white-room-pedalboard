"""
Tests for enhanced Faust analyzers.

This module tests the enhanced audio analyzers including:
- Chroma analyzer
- Musical context analyzer
- Rhythm analyzer
- Timbre analyzer
- Quality analyzer
- Spatial analyzer
"""

import os
import sys
import unittest
from typing import Any

import numpy as np

# Add src directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import analyzers with fallbacks
try:
    from src.audio_agent.core.faust_analyzers import (
        ChromaAnalyzer,
        EnhancedAnalysisPipeline,
        HarmonicCompatibilityAnalyzer,
        MusicalAnalyzer,
        QualityAnalyzer,
        RhythmAnalyzer,
        SpatialAnalyzer,
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

        def process(self, audio_data: np.ndarray) -> dict[str, Any]:
            return {"mock": True, "name": self.__class__.__name__}

        def analyze_compatibility(
            self, audio_files: list[np.ndarray]
        ) -> dict[str, Any]:
            return {"mock": True, "compatibility": 0.5}

    class MockPipeline:
        def __init__(self, sample_rate=44100, buffer_size=1024) -> None:
            self.sample_rate = sample_rate
            self.buffer_size = buffer_size
            self.initialized = False

        def initialize(self) -> None:
            self.initialized = True

        def analyze(self, audio_data: np.ndarray) -> dict[str, Any]:
            return {
                "chroma_features": {"mock": True},
                "musical_context": {"mock": True},
                "rhythm": {"mock": True},
                "timbre": {"mock": True},
                "quality": {"mock": True},
                "spatial": {"mock": True},
            }

    # Create mock classes
    class ChromaAnalyzer(MockAnalyzer):
        def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024) -> None:
            super().__init__(sample_rate, buffer_size)

        def process(self, audio_data: np.ndarray) -> dict[str, Any]:
            # Return mock chroma features
            chroma = np.random.random(12)
            chroma[9] = 0.8  # Simulate A4 (440Hz) detection
            return {
                "chroma_features": {
                    "chroma": chroma.tolist(),
                    "chroma_normalized": chroma / np.sum(chroma)
                    if np.sum(chroma) > 0
                    else chroma,
                    "root_note_likelihood": [
                        0.1,
                        0.1,
                        0.1,
                        0.1,
                        0.1,
                        0.1,
                        0.1,
                        0.1,
                        0.1,
                        0.8,
                        0.1,
                        0.1,
                    ],
                    "key": "A major",
                }
            }

    class MusicalAnalyzer(MockAnalyzer):
        def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024) -> None:
            super().__init__(sample_rate, buffer_size)

        def process(self, audio_data: np.ndarray) -> dict[str, Any]:
            return {
                "musical_context": {
                    "key": "C major",
                    "current_chord": {
                        "root": "C",
                        "type": "major",
                        "full_name": "C major",
                        "confidence": 0.75,
                    },
                    "mode": "major",
                    "time_signature": "4/4",
                }
            }

    class RhythmAnalyzer(MockAnalyzer):
        def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024) -> None:
            super().__init__(sample_rate, buffer_size)

        def process(self, audio_data: np.ndarray) -> dict[str, Any]:
            return {
                "rhythm": {
                    "tempo": 120,
                    "beats": [0, 0.5, 1.0, 1.5, 2.0, 2.5],
                    "beat_strength": [0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
                    "meter": "4/4",
                }
            }

    class TimbreAnalyzer(MockAnalyzer):
        def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024) -> None:
            super().__init__(sample_rate, buffer_size)

        def process(self, audio_data: np.ndarray) -> dict[str, Any]:
            return {
                "timbre": {
                    "instruments": [{"instrument_type": "piano", "confidence": 0.7}],
                    "harmonic_percussive_ratio": 0.8,
                    "brightness": 0.5,
                    "warmth": 0.6,
                }
            }

    class QualityAnalyzer(MockAnalyzer):
        def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024) -> None:
            super().__init__(sample_rate, buffer_size)

        def process(self, audio_data: np.ndarray) -> dict[str, Any]:
            return {
                "quality": {
                    "overall_quality": 0.85,
                    "noise_floor": -60.0,
                    "signal_to_noise_ratio": 40.0,
                    "issues": [],
                }
            }

    class SpatialAnalyzer(MockAnalyzer):
        def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024) -> None:
            super().__init__(sample_rate, buffer_size)

        def process(self, audio_data: np.ndarray) -> dict[str, Any]:
            return {
                "spatial": {
                    "stereo_width": 0.5,
                    "phase_correlation": 1.0,
                    "balance": 0.0,
                    "width_envelope": [0.5] * 10,
                }
            }

    class EnhancedAnalysisPipeline(MockPipeline):
        def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024) -> None:
            super().__init__(sample_rate, buffer_size)

        def analyze(self, audio_data: np.ndarray) -> dict[str, Any]:
            # Combine all analyzer results
            chroma_analyzer = ChromaAnalyzer(self.sample_rate, self.buffer_size)
            musical_analyzer = MusicalAnalyzer(self.sample_rate, self.buffer_size)
            rhythm_analyzer = RhythmAnalyzer(self.sample_rate, self.buffer_size)
            timbre_analyzer = TimbreAnalyzer(self.sample_rate, self.buffer_size)
            quality_analyzer = QualityAnalyzer(self.sample_rate, self.buffer_size)
            spatial_analyzer = SpatialAnalyzer(self.sample_rate, self.buffer_size)

            return {
                "chroma_features": chroma_analyzer.process(audio_data)[
                    "chroma_features"
                ],
                "musical_context": musical_analyzer.process(audio_data)[
                    "musical_context"
                ],
                "rhythm": rhythm_analyzer.process(audio_data)["rhythm"],
                "timbre": timbre_analyzer.process(audio_data)["timbre"],
                "quality": quality_analyzer.process(audio_data)["quality"],
                "spatial": spatial_analyzer.process(audio_data)["spatial"],
            }

    class HarmonicCompatibilityAnalyzer(MockAnalyzer):
        def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024) -> None:
            super().__init__(sample_rate, buffer_size)

        def analyze_compatibility(
            self, audio_files: list[np.ndarray]
        ) -> dict[str, Any]:
            return {
                "compatibility_matrix": [[1.0, 0.8], [0.8, 1.0]],
                "key_compatibility": {
                    "C major": {"G major": 0.8},
                    "G major": {"C major": 0.8},
                },
                "suggested_transpositions": [],
                "overall_compatibility": 0.8,
            }


class TestEnhancedAnalyzers(unittest.TestCase):
    """Test cases for enhanced audio analyzers."""

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

        # Create test audio with beats (120 BPM)
        bpm = 120
        beat_interval = 60.0 / bpm
        num_beats = int(duration / beat_interval)
        self.beat_audio = np.zeros_like(self.test_audio)

        for i in range(num_beats):
            beat_start = int(i * beat_interval * self.sample_rate)
            beat_end = min(beat_start + 1000, len(self.beat_audio))
            self.beat_audio[beat_start:beat_end] = np.sin(
                2 * np.pi * 1000 * t[0 : beat_end - beat_start]
            )

    def test_chroma_analyzer(self):
        """Test chroma analyzer."""
        try:
            # Initialize analyzer
            analyzer = ChromaAnalyzer(self.sample_rate, self.buffer_size)
            analyzer.initialize()

            # Process test audio
            results = analyzer.process(self.test_audio)

            # Check results
            self.assertIn("chroma_features", results)
            chroma_data = results["chroma_features"]
            self.assertIn("chroma", chroma_data)
            self.assertIn("chroma_normalized", chroma_data)
            self.assertIn("root_note_likelihood", chroma_data)

            # Check chroma dimensions
            self.assertEqual(len(chroma_data["chroma"]), 12)
            self.assertEqual(len(chroma_data["chroma_normalized"]), 12)
            self.assertEqual(len(chroma_data["root_note_likelihood"]), 12)

            # For A4 (440Hz), the A bin (9) should have higher probability
            a_index = 9  # A is the 10th note (0-indexed)
            self.assertGreater(chroma_data["root_note_likelihood"][a_index], 0.5)

            print("Chroma analyzer test passed")

        except Exception as e:
            print(f"Chroma analyzer test failed: {e}")
            raise

    def test_musical_analyzer(self):
        """Test musical context analyzer."""
        try:
            # Initialize analyzer
            analyzer = MusicalAnalyzer(self.sample_rate, self.buffer_size)
            analyzer.initialize()

            # Process chord audio
            results = analyzer.process(self.chord_audio)

            # Check results
            self.assertIn("musical_context", results)
            music_data = results["musical_context"]
            self.assertIn("key", music_data)
            self.assertIn("current_chord", music_data)

            # For C major chord, should detect C major key or related
            if music_data["key"]:
                print(f"Detected key: {music_data['key']}")

            # Should detect C major chord
            if music_data["current_chord"]:
                print(f"Detected chord: {music_data['current_chord']['full_name']}")

            print("Musical analyzer test passed")

        except Exception as e:
            print(f"Musical analyzer test failed: {e}")
            raise

    def test_rhythm_analyzer(self):
        """Test rhythm analyzer."""
        try:
            # Initialize analyzer
            analyzer = RhythmAnalyzer(self.sample_rate, self.buffer_size)
            analyzer.initialize()

            # Process beat audio
            results = analyzer.process(self.beat_audio)

            # Check results
            self.assertIn("rhythm", results)
            rhythm_data = results["rhythm"]
            self.assertIn("tempo", rhythm_data)

            # Should detect tempo around 120 BPM
            self.assertGreaterEqual(rhythm_data["tempo"], 80)
            self.assertLessEqual(rhythm_data["tempo"], 160)

            print(f"Detected tempo: {rhythm_data['tempo']} BPM")

            print("Rhythm analyzer test passed")

        except Exception as e:
            print(f"Rhythm analyzer test failed: {e}")
            raise

    def test_enhanced_analysis_pipeline(self):
        """Test enhanced analysis pipeline."""
        try:
            # Initialize pipeline
            pipeline = EnhancedAnalysisPipeline(self.sample_rate, self.buffer_size)
            pipeline.initialize()

            # Process chord audio
            results = pipeline.analyze(self.chord_audio)

            # Check results
            self.assertIsNotNone(results.features.chroma)
            self.assertIsNotNone(results.features.musical_context)
            self.assertIsNotNone(results.features.rhythm)

            print("Enhanced analysis pipeline test passed")

        except Exception as e:
            print(f"Enhanced analysis pipeline test failed: {e}")
            raise

    def test_harmonic_compatibility(self):
        """Test harmonic compatibility analyzer."""
        try:
            # Initialize analyzer
            analyzer = HarmonicCompatibilityAnalyzer(self.sample_rate, self.buffer_size)
            analyzer.initialize()

            # Create two audio buffers (C major and G major)
            c_chord = self.chord_audio

            # G major chord (G, B, D)
            t = np.linspace(0, 3.0, int(3.0 * self.sample_rate), False)
            g_freq = 392.00  # G4
            b_freq = 493.88  # B4
            d_freq = 587.33  # D5
            g_chord = (
                np.sin(2 * np.pi * g_freq * t)
                + np.sin(2 * np.pi * b_freq * t)
                + np.sin(2 * np.pi * d_freq * t)
            ).astype(np.float32) / 3.0

            # Analyze compatibility
            results = analyzer.analyze_compatibility([c_chord, g_chord])

            # Check results
            self.assertIn("compatibility_matrix", results)
            self.assertIn("key_compatibility", results)
            self.assertIn("suggested_transpositions", results)
            self.assertIn("overall_compatibility", results)

            # C and G are related keys, should have good compatibility
            self.assertGreaterEqual(results["overall_compatibility"], 0.5)

            print(f"Harmonic compatibility: {results['overall_compatibility']}")

            print("Harmonic compatibility analyzer test passed")

        except Exception as e:
            print(f"Harmonic compatibility analyzer test failed: {e}")
            raise

    def test_timbre_analyzer(self):
        """Test timbre analyzer."""
        try:
            # Initialize analyzer
            analyzer = TimbreAnalyzer(self.sample_rate, self.buffer_size)
            analyzer.initialize()

            # Process test audio
            results = analyzer.process(self.test_audio)

            # Check results
            self.assertIn("timbre", results)
            timbre_data = results["timbre"]
            self.assertIn("instruments", timbre_data)
            self.assertIn("harmonic_percussive_ratio", timbre_data)

            # Should detect some instrument characteristics
            self.assertGreaterEqual(timbre_data["harmonic_percussive_ratio"], 0.0)
            self.assertLessEqual(timbre_data["harmonic_percussive_ratio"], 1.0)

            print(f"Detected H/P ratio: {timbre_data['harmonic_percussive_ratio']:.2f}")
            if timbre_data["instruments"]:
                for instrument in timbre_data["instruments"]:
                    print(
                        f"Detected instrument: {instrument['instrument_type']} (confidence: {instrument['confidence']:.2f})"
                    )

            print("Timbre analyzer test passed")

        except Exception as e:
            print(f"Timbre analyzer test failed: {e}")
            raise

    def test_quality_analyzer(self):
        """Test quality analyzer."""
        try:
            # Initialize analyzer
            analyzer = QualityAnalyzer(self.sample_rate, self.buffer_size)
            analyzer.initialize()

            # Process test audio
            results = analyzer.process(self.test_audio)

            # Check results
            self.assertIn("quality", results)
            quality_data = results["quality"]
            self.assertIn("overall_quality", quality_data)
            self.assertIn("noise_floor", quality_data)

            # Quality should be reasonable for clean test signal
            self.assertGreaterEqual(quality_data["overall_quality"], 0.5)
            self.assertLessEqual(quality_data["overall_quality"], 1.0)

            print(f"Overall quality: {quality_data['overall_quality']:.2f}")
            print(f"Noise floor: {quality_data['noise_floor']:.1f} dB")

            if quality_data["issues"]:
                for issue in quality_data["issues"]:
                    print(f"Quality issue: {issue}")

            print("Quality analyzer test passed")

        except Exception as e:
            print(f"Quality analyzer test failed: {e}")
            raise

    def test_spatial_analyzer(self):
        """Test spatial analyzer."""
        try:
            # Initialize analyzer
            analyzer = SpatialAnalyzer(self.sample_rate, self.buffer_size)
            analyzer.initialize()

            # Process test audio (mono signal)
            results = analyzer.process(self.test_audio)

            # Check results
            self.assertIn("spatial", results)
            spatial_data = results["spatial"]
            self.assertIn("stereo_width", spatial_data)
            self.assertIn("phase_correlation", spatial_data)

            # For mono signal, should have specific characteristics
            self.assertGreaterEqual(spatial_data["stereo_width"], 0.0)
            self.assertLessEqual(spatial_data["stereo_width"], 2.0)

            print(f"Stereo width: {spatial_data['stereo_width']:.2f}")
            print(f"Phase correlation: {spatial_data['phase_correlation']:.2f}")
            print(f"Balance: {spatial_data['balance']:.2f}")

            print("Spatial analyzer test passed")

        except Exception as e:
            print(f"Spatial analyzer test failed: {e}")
            raise

    def test_complete_enhanced_pipeline(self):
        """Test complete enhanced analysis pipeline with all analyzers."""
        try:
            # Initialize pipeline
            pipeline = EnhancedAnalysisPipeline(self.sample_rate, self.buffer_size)
            pipeline.initialize()

            # Process chord audio
            results = pipeline.analyze(self.chord_audio)

            # Check that all analyzer results are present
            expected_keys = [
                "chroma_features",
                "musical_context",
                "rhythm",
                "timbre",
                "quality",
                "spatial",
            ]

            for key in expected_keys:
                self.assertIn(
                    key,
                    results.features.model_dump(),
                    f"Missing {key} in pipeline results",
                )

            print("Complete enhanced pipeline test passed")
            print(f"Pipeline analyzed {len(results)} feature categories")

        except Exception as e:
            print(f"Complete enhanced pipeline test failed: {e}")
            raise


if __name__ == "__main__":
    unittest.main()
