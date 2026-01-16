"""
Tests for the Real-Time Analysis Pipeline.

This module tests the AnalysisPipeline class that processes audio through
Faust modules and formats the results for LangGraph agent consumption.
"""

import json
import os
import time
import unittest

import numpy as np

from audio_agent.core.analysis_pipeline import (
    AnalysisPipeline,
    get_analysis_pipeline,
)
from audio_agent.core.audio_source_manager import (
    AudioSourceConfig,
    AudioSourceType,
    get_audio_source_manager,
)

# Import analyzers with fallbacks
try:
    from audio_agent.core.faust_analyzers import (
        ChromaAnalyzer,
        MusicalAnalyzer,
        QualityAnalyzer,
        RhythmAnalyzer,
        SpatialAnalyzer,
        SpectralAnalyzer,
        TimbreAnalyzer,
    )
except ImportError:
    # Create mock classes if import fails
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

    class MockSpatialAnalyzer(MockAnalyzer):
        pass

    # Create aliases
    SpectralAnalyzer = MockSpectralAnalyzer
    ChromaAnalyzer = MockChromaAnalyzer
    MusicalAnalyzer = MockMusicalAnalyzer
    RhythmAnalyzer = MockRhythmAnalyzer
    TimbreAnalyzer = MockTimbreAnalyzer
    QualityAnalyzer = MockQualityAnalyzer
    SpatialAnalyzer = MockSpatialAnalyzer


class TestAnalysisPipeline(unittest.TestCase):
    """Test cases for the analysis pipeline."""

    def setUp(self):
        """Set up test environment."""
        self.sample_rate = 44100
        self.buffer_size = 1024

        # Create test audio (sine wave at A4 = 440Hz)
        duration = 1.0  # seconds
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

        # Create pipeline
        self.pipeline = AnalysisPipeline(self.sample_rate, self.buffer_size)

    def test_pipeline_initialization(self):
        """Test pipeline initialization."""
        try:
            # Initialize pipeline
            self.pipeline.initialize()

            # Check initialization
            self.assertTrue(self.pipeline.initialized)
            self.assertIsNotNone(self.pipeline.analyzer_integration)

            print("Pipeline initialization test passed")

        except Exception as e:
            print(f"Pipeline initialization test failed: {e}")
            raise

    def test_audio_processing(self):
        """Test audio processing through pipeline."""
        try:
            # Process test audio
            analysis = self.pipeline.process(self.test_audio)

            # Check analysis results
            self.assertIsNotNone(analysis)
            self.assertEqual(analysis.sample_rate, self.sample_rate)
            self.assertAlmostEqual(
                analysis.duration, len(self.test_audio) / self.sample_rate, delta=0.1
            )

            # Check features
            self.assertIsNotNone(analysis.features)

            print("Audio processing test passed")

        except Exception as e:
            print(f"Audio processing test failed: {e}")
            raise

    def test_cache_functionality(self):
        """Test analysis cache functionality."""
        try:
            # Process test audio first time (cache miss)
            start_time = time.time()
            self.pipeline.process(self.test_audio)
            first_process_time = time.time() - start_time

            # Process same audio second time (should be cache hit)
            start_time = time.time()
            self.pipeline.process(self.test_audio)
            second_process_time = time.time() - start_time

            # Check that second processing was faster
            self.assertLess(second_process_time, first_process_time)

            # Check cache hit rate
            metrics = self.pipeline.get_latest_metrics()
            if metrics:
                self.assertGreater(metrics.cache_hit_rate, 0)

            # Clear cache
            self.pipeline.clear_cache()

            # Process again (should be cache miss)
            start_time = time.time()
            self.pipeline.process(self.test_audio)
            third_process_time = time.time() - start_time

            # Should be closer to first time than second time
            self.assertGreater(third_process_time, second_process_time)

            print("Cache functionality test passed")

        except Exception as e:
            print(f"Cache functionality test failed: {e}")
            raise

    def test_langgraph_formatting(self):
        """Test formatting for LangGraph consumption."""
        try:
            # Enable LangGraph formatting
            self.pipeline.format_for_langgraph = True

            # Process test audio
            analysis = self.pipeline.process(self.test_audio)

            # Check for suggested actions
            self.assertIsNotNone(analysis.enhanced_suggested_actions)
            self.assertIsInstance(analysis.enhanced_suggested_actions, list)

            print("LangGraph formatting test passed")

        except Exception as e:
            print(f"LangGraph formatting test failed: {e}")
            raise

    def test_performance_metrics(self):
        """Test performance metrics collection."""
        try:
            # Process test audio
            self.pipeline.process(self.test_audio)

            # Get metrics
            metrics = self.pipeline.get_latest_metrics()

            # Check metrics
            self.assertIsNotNone(metrics)
            self.assertGreater(metrics.processing_time_ms, 0)
            self.assertEqual(metrics.buffer_size, self.buffer_size)
            self.assertEqual(metrics.sample_rate, self.sample_rate)

            # Get metrics history
            metrics_history = self.pipeline.get_metrics()
            self.assertGreaterEqual(len(metrics_history), 1)

            print("Performance metrics test passed")

        except Exception as e:
            print(f"Performance metrics test failed: {e}")
            raise

    def test_singleton_instance(self):
        """Test singleton pipeline instance."""
        try:
            # Get singleton instance
            pipeline1 = get_analysis_pipeline()
            pipeline2 = get_analysis_pipeline()

            # Check that they are the same instance
            self.assertIs(pipeline1, pipeline2)

            print("Singleton instance test passed")

        except Exception as e:
            print(f"Singleton instance test failed: {e}")
            raise

    def test_json_export(self):
        """Test exporting analysis to JSON."""
        try:
            # Process test audio
            analysis = self.pipeline.process(self.test_audio)

            # Export to temporary file
            temp_file = "temp_analysis.json"
            success = self.pipeline.export_analysis_to_json(analysis, temp_file)

            # Check export success
            self.assertTrue(success)
            self.assertTrue(os.path.exists(temp_file))

            # Check file content
            with open(temp_file) as f:
                data = json.load(f)
                self.assertIn("features", data)
                self.assertIn("timestamp", data)

            # Clean up
            os.remove(temp_file)

            print("JSON export test passed")

        except Exception as e:
            print(f"JSON export test failed: {e}")
            raise

    def test_audio_source_integration(self):
        """Test integration with AudioSourceManager."""
        try:
            # Get audio source manager
            manager = get_audio_source_manager()

            # Create internal generator source
            config = AudioSourceConfig(
                name="test_generator",
                source_type=AudioSourceType.INTERNAL_GENERATOR,
                sample_rate=self.sample_rate,
                channels=1,
                buffer_size=self.buffer_size,
            )

            success = manager.create_source(config)
            if not success:
                self.skipTest("Failed to create audio source")

            # Process audio from source
            analysis = self.pipeline.process_audio_source("test_generator")

            # Check analysis results
            self.assertIsNotNone(analysis)
            self.assertEqual(analysis.sample_rate, self.sample_rate)

            # Process all sources
            results = self.pipeline.process_all_sources()
            self.assertIn("test_generator", results)

            # Clean up
            manager.close_source("test_generator")

            print("Audio source integration test passed")

        except Exception as e:
            print(f"Audio source integration test failed: {e}")
            raise

    def test_cache_parameters(self):
        """Test setting cache parameters."""
        try:
            # Set cache parameters
            new_size_limit = 50
            new_ttl = 10.0
            self.pipeline.set_cache_parameters(size_limit=new_size_limit, ttl=new_ttl)

            # Check parameters
            self.assertEqual(self.pipeline.cache_size_limit, new_size_limit)
            self.assertEqual(self.pipeline.cache_ttl, new_ttl)

            print("Cache parameters test passed")

        except Exception as e:
            print(f"Cache parameters test failed: {e}")
            raise

    def test_pipeline_reset(self):
        """Test pipeline reset."""
        try:
            # Process test audio to populate cache
            self.pipeline.process(self.test_audio)

            # Reset pipeline
            self.pipeline.reset()

            # Check that cache is cleared
            self.assertEqual(len(self.pipeline.cache), 0)
            self.assertEqual(self.pipeline.cache_hits, 0)
            self.assertEqual(self.pipeline.cache_misses, 0)

            # Check that metrics are cleared
            self.assertEqual(len(self.pipeline.metrics_history), 0)

            print("Pipeline reset test passed")

        except Exception as e:
            print(f"Pipeline reset test failed: {e}")
            raise

    def test_latency_benchmarks(self):
        """Test latency benchmarks."""
        try:
            # Process test audio multiple times to get average latency
            num_iterations = 5
            latencies = []

            # Clear cache first
            self.pipeline.clear_cache()

            for _ in range(num_iterations):
                start_time = time.time()
                self.pipeline.process(self.test_audio, skip_cache=True)
                latency = (time.time() - start_time) * 1000  # ms
                latencies.append(latency)

            # Calculate average and standard deviation
            avg_latency = sum(latencies) / len(latencies)
            std_dev = np.std(latencies)

            print(f"Average latency: {avg_latency:.2f} ms (std dev: {std_dev:.2f} ms)")

            # Check that latency is reasonable
            self.assertLess(avg_latency, 1000)  # Should be less than 1 second

            print("Latency benchmark test passed")

        except Exception as e:
            print(f"Latency benchmark test failed: {e}")
            raise


if __name__ == "__main__":
    unittest.main()
