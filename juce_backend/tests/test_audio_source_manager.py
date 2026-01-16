"""
Tests for the Universal Audio Input Interface.

This module tests the AudioSourceManager class and its ability to handle
different audio sources, format detection, routing, and buffer management.
"""

import os
import sys
import tempfile
import unittest

import numpy as np

# Add src directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.audio_agent.core.audio_source_manager import (
    AudioFormat,
    AudioSourceConfig,
    AudioSourceManager,
    AudioSourceType,
    get_audio_source_manager,
)


class TestAudioSourceManager(unittest.TestCase):
    """Test cases for the AudioSourceManager."""

    def setUp(self):
        """Set up test environment."""
        self.sample_rate = 44100
        self.buffer_size = 1024
        self.manager = AudioSourceManager(self.sample_rate, self.buffer_size)

        # Create test audio data
        self.test_audio = (
            np.sin(2 * np.pi * 440 * np.linspace(0, 1, self.sample_rate))
            .astype(np.float32)
            .reshape(-1, 1)
        )

        # Create temporary audio file
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        self.temp_file.close()

        try:
            import soundfile as sf

            sf.write(self.temp_file.name, self.test_audio, self.sample_rate)
        except ImportError:
            print("soundfile not installed, skipping file creation")

    def tearDown(self):
        """Clean up after tests."""
        # Close all sources
        self.manager.close_all_sources()

        # Remove temporary file
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

    def test_create_internal_generator_source(self):
        """Test creating an internal generator source."""
        config = AudioSourceConfig(
            name="test_generator",
            source_type=AudioSourceType.INTERNAL_GENERATOR,
            sample_rate=self.sample_rate,
            channels=2,
            buffer_size=self.buffer_size,
        )

        # Create source
        result = self.manager.create_source(config)
        self.assertTrue(result)

        # Check that source exists
        self.assertIn("test_generator", self.manager.sources)

        # Get source
        source = self.manager.get_source("test_generator")
        self.assertIsNotNone(source)

        # Check source type
        self.assertEqual(source.config.source_type, AudioSourceType.INTERNAL_GENERATOR)

        # Get buffer
        buffer = self.manager.get_source_buffer("test_generator")
        self.assertIsNotNone(buffer)
        self.assertEqual(buffer.shape, (self.buffer_size, 2))

        # Check health
        health = self.manager.get_source_health("test_generator")
        self.assertIsNotNone(health)

        print("Internal generator source test passed")

    def test_create_file_source(self):
        """Test creating a file source."""
        # Skip if soundfile or librosa not installed
        try:
            import librosa
            import soundfile
        except ImportError:
            print("soundfile or librosa not installed, skipping file source test")
            return

        # Create config with file_path as a keyword argument first
        config_dict = {
            "name": "test_file",
            "source_type": AudioSourceType.AUDIO_FILE,
            "sample_rate": self.sample_rate,
            "channels": 1,
            "buffer_size": self.buffer_size,
            "file_path": self.temp_file.name,
        }

        config = AudioSourceConfig(**config_dict)

        # Create source
        result = self.manager.create_source(config)
        self.assertTrue(result)

        # Check that source exists
        self.assertIn("test_file", self.manager.sources)

        # Get source
        source = self.manager.get_source("test_file")
        self.assertIsNotNone(source)

        # Check source type
        self.assertEqual(source.config.source_type, AudioSourceType.AUDIO_FILE)

        # Get buffer
        buffer = self.manager.get_source_buffer("test_file")
        self.assertIsNotNone(buffer)
        self.assertEqual(buffer.shape, (self.buffer_size, 1))

        print("File source test passed")

    def test_audio_format_detection(self):
        """Test audio format detection."""
        # Test WAV format
        self.assertEqual(self.manager.detect_audio_format("test.wav"), AudioFormat.WAV)

        # Test MP3 format
        self.assertEqual(self.manager.detect_audio_format("test.mp3"), AudioFormat.MP3)

        # Test FLAC format
        self.assertEqual(
            self.manager.detect_audio_format("test.flac"), AudioFormat.FLAC
        )

        # Test AIFF format
        self.assertEqual(
            self.manager.detect_audio_format("test.aiff"), AudioFormat.AIFF
        )

        # Test OGG format
        self.assertEqual(self.manager.detect_audio_format("test.ogg"), AudioFormat.OGG)

        # Test unknown format
        self.assertEqual(
            self.manager.detect_audio_format("test.xyz"), AudioFormat.UNKNOWN
        )

        print("Audio format detection test passed")

    def test_routing(self):
        """Test audio routing."""
        # Create two sources
        config1 = AudioSourceConfig(
            name="source1",
            source_type=AudioSourceType.INTERNAL_GENERATOR,
            sample_rate=self.sample_rate,
            channels=2,
            buffer_size=self.buffer_size,
        )

        config2 = AudioSourceConfig(
            name="source2",
            source_type=AudioSourceType.INTERNAL_GENERATOR,
            sample_rate=self.sample_rate,
            channels=2,
            buffer_size=self.buffer_size,
        )

        # Create sources
        self.manager.create_source(config1)
        self.manager.create_source(config2)

        # Set routing
        self.manager.set_routing("source1", ["output"])
        self.manager.set_routing("source2", ["output"])

        # Check routing
        routing1 = self.manager.get_routing("source1")
        self.assertEqual(routing1, ["output"])

        routing2 = self.manager.get_routing("source2")
        self.assertEqual(routing2, ["output"])

        # Get all routing
        all_routing = self.manager.get_all_routing()
        self.assertEqual(len(all_routing), 2)
        self.assertIn("source1", all_routing)
        self.assertIn("source2", all_routing)

        # Process routing
        output_buffers = self.manager.process_routing()
        self.assertIn("output", output_buffers)
        self.assertEqual(output_buffers["output"].shape, (self.buffer_size, 2))

        print("Routing test passed")

    def test_remove_source(self):
        """Test removing an audio source."""
        # Create source
        config = AudioSourceConfig(
            name="test_source",
            source_type=AudioSourceType.INTERNAL_GENERATOR,
            sample_rate=self.sample_rate,
            channels=2,
            buffer_size=self.buffer_size,
        )

        self.manager.create_source(config)
        self.assertIn("test_source", self.manager.sources)

        # Remove source
        result = self.manager.remove_source("test_source")
        self.assertTrue(result)

        # Check that source is removed
        self.assertNotIn("test_source", self.manager.sources)

        print("Remove source test passed")

    def test_singleton_instance(self):
        """Test singleton instance."""
        # Get singleton instance
        manager1 = get_audio_source_manager()
        manager2 = get_audio_source_manager()

        # Check that they are the same instance
        self.assertIs(manager1, manager2)

        print("Singleton instance test passed")

    def test_get_all_sources_and_health(self):
        """Test getting all sources and health."""
        # Create two sources
        config1 = AudioSourceConfig(
            name="source1",
            source_type=AudioSourceType.INTERNAL_GENERATOR,
            sample_rate=self.sample_rate,
            channels=2,
            buffer_size=self.buffer_size,
        )

        config2 = AudioSourceConfig(
            name="source2",
            source_type=AudioSourceType.INTERNAL_GENERATOR,
            sample_rate=self.sample_rate,
            channels=2,
            buffer_size=self.buffer_size,
        )

        # Create sources
        self.manager.create_source(config1)
        self.manager.create_source(config2)

        # Get all sources
        all_sources = self.manager.get_all_sources()
        self.assertEqual(len(all_sources), 2)
        self.assertIn("source1", all_sources)
        self.assertIn("source2", all_sources)

        # Get all health
        all_health = self.manager.get_all_source_health()
        self.assertEqual(len(all_health), 2)
        self.assertIn("source1", all_health)
        self.assertIn("source2", all_health)

        print("Get all sources and health test passed")


if __name__ == "__main__":
    unittest.main()
