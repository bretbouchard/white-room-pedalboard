"""
Simple test script for the Analysis Pipeline.

This script tests the basic functionality of the AnalysisPipeline class
without relying on the pytest framework.
"""

import time

import numpy as np

# Add src directory to path
# Repository-level pytest conftest handles imports.
from audio_agent.core.analysis_pipeline import AnalysisPipeline


def main():
    """Run simple tests for the analysis pipeline."""
    print("Testing Analysis Pipeline...")

    # Create test audio (sine wave at A4 = 440Hz)
    sample_rate = 44100
    buffer_size = 1024
    duration = 1.0  # seconds
    t = np.linspace(0, duration, int(duration * sample_rate), False)
    test_audio = np.sin(2 * np.pi * 440 * t).astype(np.float32)

    # Create pipeline
    pipeline = AnalysisPipeline(sample_rate, buffer_size)

    # Test initialization
    print("\nTesting initialization...")
    pipeline.initialize()
    print("Initialization successful!")

    # Test audio processing
    print("\nTesting audio processing...")
    try:
        analysis = pipeline.process(test_audio)
        print(f"Analysis successful! Duration: {analysis.duration:.2f}s")
        print(f"Sample rate: {analysis.sample_rate} Hz")
        print(f"Channels: {analysis.channels}")

        # Check features
        if hasattr(analysis.features, "spectral"):
            print(f"Spectral centroid: {analysis.features.spectral.centroid:.2f} Hz")

        if hasattr(analysis.features, "dynamic"):
            print(f"Dynamic range: {analysis.features.dynamic.dynamic_range:.2f} dB")

        if (
            hasattr(analysis.features, "musical_context")
            and analysis.features.musical_context.key
        ):
            print(f"Detected key: {analysis.features.musical_context.key}")

        if hasattr(analysis.features, "rhythm"):
            print(f"Detected tempo: {analysis.features.rhythm.tempo:.1f} BPM")

        # Check suggested actions
        if hasattr(analysis, "enhanced_suggested_actions"):
            print("\nSuggested actions:")
            for action in analysis.enhanced_suggested_actions:
                print(f"- {action}")
    except Exception as e:
        print(f"Error during audio processing: {e}")

    # Test cache functionality
    print("\nTesting cache functionality...")
    try:
        # Process test audio first time (cache miss)
        start_time = time.time()
        pipeline.process(test_audio)
        first_process_time = time.time() - start_time

        # Process same audio second time (should be cache hit)
        start_time = time.time()
        pipeline.process(test_audio)
        second_process_time = time.time() - start_time

        print(f"First processing time: {first_process_time * 1000:.2f} ms")
        print(f"Second processing time: {second_process_time * 1000:.2f} ms")

        if second_process_time < first_process_time:
            print("Cache hit confirmed! Second processing was faster.")
        else:
            print("Cache may not be working correctly.")

        # Get cache hit rate
        metrics = pipeline.get_latest_metrics()
        if metrics:
            print(f"Cache hit rate: {metrics.cache_hit_rate:.2f}")
    except Exception as e:
        print(f"Error during cache testing: {e}")

    # Test performance metrics
    print("\nTesting performance metrics...")
    try:
        metrics = pipeline.get_latest_metrics()

        if metrics:
            print(f"Processing time: {metrics.processing_time_ms:.2f} ms")
            print(f"CPU usage: {metrics.cpu_usage_percent:.2f}%")
            print(f"Memory usage: {metrics.memory_usage_mb:.2f} MB")
            print(f"Latency: {metrics.latency_ms:.2f} ms")
        else:
            print("No metrics available.")
    except Exception as e:
        print(f"Error during metrics testing: {e}")

    print("\nTests completed!")


if __name__ == "__main__":
    main()
