"""
Tests for Real-Time Audio Processing Pipeline functionality.
"""

from unittest.mock import Mock, patch

import numpy as np
import pytest

from src.audio_agent.core.advanced_plugin_management import AdvancedPluginManager
from src.audio_agent.core.dawdreamer_engine import DawDreamerEngine
from src.audio_agent.engine.client import EngineClientStub

# Test-time alias: let DawDreamerEngine refer to EngineClientStub so legacy
# tests that patch DawDreamerEngine methods continue to work.
DawDreamerEngine = EngineClientStub
from src.audio_agent.core.mixing_console import MixingConsole
from src.audio_agent.core.real_time_processing import (
    AudioBitDepth,
    AudioBuffer,
    AudioExportSettings,
    AudioFormat,
    AudioMeter,
    AudioProcessingError,
    BufferSizeError,
    LatencyInfo,
    PerformanceStats,
    RealTimeProcessor,
)
from src.audio_agent.models.plugin import (
    PluginCategory,
    PluginFormat,
    PluginMetadata,
    PluginState,
)


@pytest.fixture
def engine():
    """Create a DawDreamer engine for testing."""
    return DawDreamerEngine()


@pytest.fixture
def plugin_manager(engine):
    """Create an AdvancedPluginManager for testing."""
    return AdvancedPluginManager(engine)


@pytest.fixture
def mixing_console(engine, plugin_manager):
    """Create a MixingConsole for testing."""
    return MixingConsole(engine, plugin_manager)


@pytest.fixture
def processor(engine, plugin_manager, mixing_console):
    """Create a RealTimeProcessor for testing."""
    return RealTimeProcessor(engine, plugin_manager, mixing_console)


@pytest.fixture
def mock_plugin_metadata():
    """Create mock plugin metadata."""
    return PluginMetadata(
        name="Mock Plugin",
        manufacturer="Mock Manufacturer",
        version="1.0.0",
        unique_id="mock_plugin_123",
        category=PluginCategory.EQ,
        format=PluginFormat.VST3,
        input_channels=2,
        output_channels=2,
    )


class TestAudioBuffer:
    """Test AudioBuffer functionality."""

    def test_create_empty(self):
        """Test creating an empty audio buffer."""
        buffer = AudioBuffer.create_empty(channels=2, sample_rate=44100, duration=1.0)

        assert buffer.channels == 2
        assert buffer.sample_rate == 44100
        assert buffer.duration == 1.0
        assert buffer.samples.shape == (2, 44100)
        assert np.all(buffer.samples == 0.0)

    def test_create_sine_wave(self):
        """Test creating a sine wave buffer."""
        buffer = AudioBuffer.create_sine_wave(
            frequency=440.0, channels=2, sample_rate=44100, duration=1.0, amplitude=0.5
        )

        assert buffer.channels == 2
        assert buffer.sample_rate == 44100
        assert buffer.duration == 1.0
        assert buffer.samples.shape == (2, 44100)

        # Check that it's not all zeros
        assert not np.all(buffer.samples == 0.0)

        # Check amplitude
        assert np.max(buffer.samples) <= 0.5
        assert np.min(buffer.samples) >= -0.5


class TestAudioMeter:
    """Test AudioMeter functionality."""

    def test_update_meter(self):
        """Test updating an audio meter."""
        meter = AudioMeter()

        # Create test buffer with known peak
        buffer = np.zeros((2, 1000))
        buffer[0, 500] = 0.5  # 50% peak

        # Update meter
        meter.update(buffer)

        # Check peak level (should be around -6 dB for 0.5 amplitude)
        assert -7.0 < meter.peak_level_db < -5.0

        # Check RMS level (should be much lower)
        assert meter.rms_level_db < -20.0

        # Check no clipping
        assert not meter.clipping
        assert meter.clip_count == 0

    def test_clipping_detection(self):
        """Test clipping detection."""
        meter = AudioMeter()

        # Create test buffer with clipping
        buffer = np.zeros((2, 1000))
        buffer[0, 500] = 1.2  # 120% peak (clipping)

        # Update meter
        meter.update(buffer)

        # Check clipping detected
        assert meter.clipping
        assert meter.clip_count == 1


class TestLatencyInfo:
    """Test LatencyInfo functionality."""

    def test_latency_calculations(self):
        """Test latency calculations."""
        info = LatencyInfo(
            input_latency_samples=512,
            output_latency_samples=512,
            plugin_latency_samples=1024,
            buffer_size=512,
            sample_rate=44100,
        )

        # Check total latency
        assert info.total_latency_samples == 2048

        # Check latency in milliseconds
        expected_ms = (2048 / 44100) * 1000.0
        assert abs(info.total_latency_ms - expected_ms) < 0.01

        # Check buffer latency
        expected_buffer_ms = (512 / 44100) * 1000.0
        assert abs(info.buffer_latency_ms - expected_buffer_ms) < 0.01


class TestPerformanceStats:
    """Test PerformanceStats functionality."""

    def test_update_process_time(self):
        """Test updating process time statistics."""
        stats = PerformanceStats()

        # Update with some process times
        stats.update_process_time(5.0)
        stats.update_process_time(10.0)
        stats.update_process_time(15.0)

        # Check statistics
        assert stats.max_process_time_ms == 15.0
        assert stats.avg_process_time_ms == 10.0
        assert len(stats.process_time_samples) == 3

    def test_report_buffer_underrun(self):
        """Test reporting buffer underruns."""
        stats = PerformanceStats()

        # Report underruns
        stats.report_buffer_underrun()
        stats.report_buffer_underrun()

        # Check counts
        assert stats.buffer_underruns == 2
        assert stats.xruns == 2


class TestRealTimeProcessor:
    """Test RealTimeProcessor functionality."""

    def test_initialization(self, processor):
        """Test processor initialization."""
        # Check initial state
        assert not processor._is_processing
        assert processor._buffer_size == processor.engine.audio_config.buffer_size
        assert processor._sample_rate == processor.engine.audio_config.sample_rate

        # Check meters created
        assert "master" in processor._meters
        assert "main_bus" in processor._meters

    def test_configure_buffer_size(self, processor):
        """Test configuring buffer size."""
        # Configure valid buffer size
        result = processor.configure_buffer_size(1024)

        # Check result
        assert result is True
        assert processor._buffer_size == 1024
        assert processor._latency_info.buffer_size == 1024
        assert processor.engine.audio_config.buffer_size == 1024

    def test_configure_invalid_buffer_size(self, processor):
        """Test configuring invalid buffer size."""
        # Try invalid buffer size (not power of 2)
        with pytest.raises(BufferSizeError):
            processor.configure_buffer_size(1000)

        # Try negative buffer size
        with pytest.raises(BufferSizeError):
            processor.configure_buffer_size(-512)

    def test_configure_sample_rate(self, processor):
        """Test configuring sample rate."""
        # Configure valid sample rate
        result = processor.configure_sample_rate(48000)

        # Check result
        assert result is True
        assert processor._sample_rate == 48000
        assert processor._latency_info.sample_rate == 48000
        assert processor.engine.audio_config.sample_rate == 48000

    def test_configure_invalid_sample_rate(self, processor):
        """Test configuring invalid sample rate."""
        # Try invalid sample rate
        with pytest.raises(AudioProcessingError):
            processor.configure_sample_rate(12345)

    def test_calculate_system_latency(self, processor):
        """Test calculating system latency."""
        # Calculate latency
        latency_info = processor.calculate_system_latency()

        # Check latency info
        assert latency_info.input_latency_samples == processor._buffer_size
        assert latency_info.output_latency_samples == processor._buffer_size
        assert latency_info.plugin_latency_samples == 0  # No plugins yet

    @patch.object(DawDreamerEngine, "start_real_time_processing")
    @patch.object(MixingConsole, "start_playback")
    def test_start_processing(self, mock_start_playback, mock_start_rt, processor):
        """Test starting real-time processing."""
        # Start processing
        result = processor.start_processing()

        # Check result
        assert result is True
        assert processor._is_processing is True

        # Check engine methods called
        mock_start_rt.assert_called_once()
        mock_start_playback.assert_called_once()

    @patch.object(DawDreamerEngine, "stop_real_time_processing")
    @patch.object(MixingConsole, "stop_playback")
    def test_stop_processing(self, mock_stop_playback, mock_stop_rt, processor):
        """Test stopping real-time processing."""
        # Set processing active
        processor._is_processing = True

        # Stop processing
        result = processor.stop_processing()

        # Check result
        assert result is True
        assert processor._is_processing is False

        # Check engine methods called
        mock_stop_rt.assert_called_once()
        mock_stop_playback.assert_called_once()

    def test_process_input_output(self, processor):
        """Test processing input and getting output."""
        # Set processing active
        processor._is_processing = True

        # Create input buffer
        input_buffer = AudioBuffer.create_sine_wave(
            frequency=440.0,
            channels=2,
            sample_rate=processor._sample_rate,
            duration=processor._buffer_size / processor._sample_rate,
        )

        # Process input
        result = processor.process_input(input_buffer)

        # Check result
        assert result is True

        # Get output (may be None in test since processing thread isn't running)
        output = processor.get_output()

        # Either output is None or it's an AudioBuffer
        if output is not None:
            assert isinstance(output, AudioBuffer)

    @patch.object(DawDreamerEngine, "render_audio")
    def test_export_audio(self, mock_render, processor):
        """Test exporting audio."""
        # Setup mock
        mock_render.return_value = np.zeros((2, 44100))

        # Create export settings
        settings = AudioExportSettings(
            format=AudioFormat.WAV, sample_rate=44100, bit_depth=AudioBitDepth.BIT_24
        )

        # Export audio
        result = processor.export_audio(
            file_path="test.wav", duration=1.0, settings=settings
        )

        # Check result
        assert result is True


class TestAnalyzerIntegration:
    """Test analyzer integration functionality."""

    @patch.object(DawDreamerEngine, "create_faust_processor")
    def test_insert_analyzer(self, mock_create_faust, processor):
        """Test inserting an analyzer."""
        # Setup mocks
        mock_create_faust.return_value = "test_analyzer"

        # Mock the plugin instances dictionary to include our test analyzer
        processor.plugin_manager._plugin_instances["test_analyzer"] = {
            "id": "test_analyzer",
            "name": "Test Analyzer",
        }

        # Insert analyzer
        analyzer_id = processor.insert_analyzer(
            analyzer_type="spectral",
            insertion_point="master",
            analyzer_id="test_analyzer",
        )

        # Check result
        assert analyzer_id == "test_analyzer"

        # Check Faust processor created
        mock_create_faust.assert_called_once()
        args = mock_create_faust.call_args[0]
        assert args[0] == "test_analyzer"  # analyzer_id
        assert 'import("stdfaust.lib")' in args[1]  # faust_code

    @patch.object(AdvancedPluginManager, "unload_plugin")
    def test_remove_analyzer(self, mock_unload, processor, plugin_manager):
        """Test removing an analyzer."""
        # Setup mock chain with analyzer
        plugin_manager._plugin_chains = {
            "master_analyzers": Mock(plugin_instances=["test_analyzer"])
        }
        plugin_manager.update_plugin_chain = Mock(return_value=True)

        # Remove analyzer
        result = processor.remove_analyzer("test_analyzer")

        # Check result
        assert result is True

        # Check plugin unloaded
        mock_unload.assert_called_once_with("test_analyzer")

    @patch.object(DawDreamerEngine, "get_analysis_results")
    def test_get_analyzer_results(self, mock_get_results, processor):
        """Test getting analyzer results."""
        # Setup mock
        mock_results = {
            "spectral_centroid": 1000.0,
            "spectral_rolloff": 5000.0,
            "rms_level": -20.0,
        }
        mock_get_results.return_value = mock_results

        # Get results
        results = processor.get_analyzer_results("test_analyzer")

        # Check results
        assert results == mock_results

        # Check engine method called
        mock_get_results.assert_called_once_with("test_analyzer")

    @patch.object(RealTimeProcessor, "get_analyzer_results")
    def test_get_all_analyzer_results(
        self, mock_get_results, processor, plugin_manager
    ):
        """Test getting all analyzer results."""
        # Setup mock analyzers
        plugin_manager._plugin_instances = {
            "analyzer_1": Mock(state=PluginState.ACTIVE),
            "analyzer_2": Mock(state=PluginState.ACTIVE),
            "not_analyzer": Mock(state=PluginState.ACTIVE),
        }

        # Setup mock results
        mock_get_results.side_effect = lambda aid: {
            "analyzer_1": {"spectral_centroid": 1000.0},
            "analyzer_2": {"spectral_centroid": 2000.0},
        }.get(aid, {})

        # Get all results
        results = processor.get_all_analyzer_results()

        # Check results
        assert "analyzer_1" in results
        assert "analyzer_2" in results
        assert "not_analyzer" not in results
        assert results["analyzer_1"]["spectral_centroid"] == 1000.0
        assert results["analyzer_2"]["spectral_centroid"] == 2000.0

    def test_get_analyzer_faust_code(self, processor):
        """Test getting analyzer Faust code."""
        # Get code for different analyzer types
        spectral_code = processor._get_analyzer_faust_code("spectral")
        dynamic_code = processor._get_analyzer_faust_code("dynamic")
        harmonic_code = processor._get_analyzer_faust_code("harmonic")
        unknown_code = processor._get_analyzer_faust_code("unknown")

        # Check code contains expected elements
        assert 'import("stdfaust.lib")' in spectral_code
        assert "an.spectral_level_display" in spectral_code

        assert 'import("stdfaust.lib")' in dynamic_code
        assert "an.dynamics_display" in dynamic_code

        assert 'import("stdfaust.lib")' in harmonic_code
        assert "an.harmonic_analysis" in harmonic_code

        # Unknown type should return default analyzer
        assert 'import("stdfaust.lib")' in unknown_code
        assert "an.analyzer(1024)" in unknown_code
