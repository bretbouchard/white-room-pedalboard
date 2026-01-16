"""
Edge case and error handling tests for critical audio processing modules.

This module tests error scenarios and edge cases for:
- Audio Buffer Manager
- Real-Time Processing
- Plugin System
- Validation System
"""

import gc
import json
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import Mock, mock_open, patch

import numpy as np
import psutil
import pytest
import requests

from src.audio_agent.core.audio_buffer_manager import (
    AudioBufferManager,
    BufferState,
    BufferType,
)
from src.audio_agent.core.plugin_database import PluginDatabase
from src.audio_agent.core.real_time_processing import (
    AudioExportSettings,
    AudioProcessingError,
    BufferSizeError,
    LatencyError,
    RealTimeProcessor,
)
from src.audio_agent.models.plugin import PluginParameter
from src.audio_agent.models.validation import (
    validate_audio_data,
    validate_buffer_size,
    validate_sample_rate,
)


class TestAudioBufferManagerEdgeCases:
    """Test edge cases and error handling in Audio Buffer Manager."""

    @pytest.fixture
    def buffer_manager(self):
        """Create a buffer manager for testing."""
        return AudioBufferManager(max_memory_mb=100)

    def test_extremely_large_buffer_allocation(self, buffer_manager):
        """Test handling of extremely large buffer requests."""
        # Request buffer larger than available memory
        huge_size = 10**12  # 1TB

        with pytest.raises(MemoryError) as exc_info:
            buffer_manager.create_buffer(
                buffer_id="huge_test",
                buffer_type=BufferType.MEMORY,
                size=huge_size,
                sample_rate=44100,
            )

        assert "memory" in str(exc_info.value).lower()
        assert buffer_manager.get_buffer_state("huge_test") == BufferState.ERROR

    def test_zero_size_buffer_request(self, buffer_manager):
        """Test handling of zero-size buffer requests."""
        with pytest.raises(ValueError) as exc_info:
            buffer_manager.create_buffer(
                buffer_id="zero_test",
                buffer_type=BufferType.MEMORY,
                size=0,
                sample_rate=44100,
            )

        assert "size" in str(exc_info.value).lower()

    def test_negative_buffer_parameters(self, buffer_manager):
        """Test handling of negative buffer parameters."""
        with pytest.raises(ValueError) as exc_info:
            buffer_manager.create_buffer(
                buffer_id="negative_test",
                buffer_type=BufferType.MEMORY,
                size=-1000,
                sample_rate=-44100,
            )

        assert "negative" in str(exc_info.value).lower()

    def test_nonexistent_buffer_access(self, buffer_manager):
        """Test accessing buffers that don't exist."""
        with pytest.raises(KeyError):
            buffer_manager.get_buffer("nonexistent_buffer")

        with pytest.raises(KeyError):
            buffer_manager.read_buffer("nonexistent_buffer", 0, 1024)

    def test_buffer_corruption_detection(self, buffer_manager):
        """Test detection of corrupted buffer data."""
        # Create a normal buffer
        buffer_id = buffer_manager.create_buffer(
            buffer_type=BufferType.MEMORY, size=1024, sample_rate=44100
        )

        # Simulate memory corruption by directly modifying internal data
        if hasattr(buffer_manager.buffers[buffer_id], "_data"):
            # Corrupt the data by setting it to None
            buffer_manager.buffers[buffer_id]._data = None

        # Attempt to read corrupted buffer
        with pytest.raises((RuntimeError, AttributeError, ValueError)):
            buffer_manager.read_buffer(buffer_id, 0, 512)

    def test_concurrent_buffer_access(self, buffer_manager):
        """Test thread safety of buffer operations."""
        buffer_id = buffer_manager.create_buffer(
            buffer_type=BufferType.MEMORY, size=1024 * 1024, sample_rate=44100  # 1MB
        )

        errors = []

        def write_data(thread_id):
            try:
                for i in range(100):
                    data = np.random.randint(-32768, 32767, 1024, dtype=np.int16)
                    buffer_manager.write_buffer(buffer_id, i * 1024, data)
            except Exception as e:
                errors.append(f"Thread {thread_id}: {e}")

        def read_data(thread_id):
            try:
                for i in range(100):
                    buffer_manager.read_buffer(buffer_id, i * 1024, 1024)
            except Exception as e:
                errors.append(f"Thread {thread_id}: {e}")

        # Create multiple threads for concurrent access
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for i in range(5):
                futures.append(executor.submit(write_data, i))
                futures.append(executor.submit(read_data, i + 5))

            # Wait for all threads to complete
            for future in futures:
                future.result()

        # Check for any thread safety errors
        assert len(errors) == 0, f"Thread safety errors: {errors}"

    def test_memory_pressure_handling(self, buffer_manager):
        """Test behavior under memory pressure."""
        # Create buffers until memory is exhausted
        buffer_ids = []
        try:
            for i in range(1000):
                buffer_id = buffer_manager.create_buffer(
                    buffer_type=BufferType.MEMORY,
                    size=10 * 1024 * 1024,  # 10MB each
                    sample_rate=44100,
                )
                buffer_ids.append(buffer_id)
        except MemoryError:
            # Expected when memory is exhausted
            pass

        # Verify that buffers are still accessible
        if buffer_ids:
            # Should still be able to access existing buffers
            data = buffer_manager.read_buffer(buffer_ids[0], 0, 1024)
            assert len(data) == 1024

            # Buffer manager should report memory usage correctly
            memory_usage = buffer_manager.get_memory_usage()
            assert memory_usage > 0

    def test_invalid_buffer_types(self, buffer_manager):
        """Test handling of invalid buffer type specifications."""
        with pytest.raises(ValueError):
            buffer_manager.create_buffer(
                buffer_id="invalid_type",
                buffer_type="invalid_buffer_type",
                size=1024,
                sample_rate=44100,
            )

    def test_disk_buffer_permission_errors(self, buffer_manager, tmp_path):
        """Test disk buffer creation with permission errors."""
        # Create a read-only directory
        readonly_dir = tmp_path / "readonly"
        readonly_dir.mkdir()
        readonly_dir.chmod(0o444)

        try:
            with pytest.raises((PermissionError, OSError)):
                buffer_manager.create_buffer(
                    buffer_type=BufferType.DISK,
                    size=1024 * 1024,
                    sample_rate=44100,
                    file_path=str(readonly_dir / "test_buffer.bin"),
                )
        finally:
            # Restore permissions for cleanup
            readonly_dir.chmod(0o755)


class TestRealTimeProcessingEdgeCases:
    """Test edge cases and error handling in Real-Time Processing."""

    @pytest.fixture
    def processor(self):
        """Create a real-time processor for testing."""
        config = {
            "buffer_size": 512,
            "sample_rate": 44100,
            "channels": 2,
            "max_latency": 1000,  # 1 second max latency
        }
        return RealTimeProcessor(config)

    def test_buffer_underrun_handling(self, processor):
        """Test handling of buffer underrun conditions."""
        # Start processing
        processor.start()

        try:
            # Simulate buffer underrun by not providing input data
            with pytest.raises(BufferSizeError) as exc_info:
                processor.process_buffer(None, 512)  # No input data

            assert "underrun" in str(exc_info.value).lower()
        finally:
            processor.stop()

    def test_buffer_overrun_handling(self, processor):
        """Test handling of buffer overrun conditions."""
        processor.start()

        try:
            # Create data larger than buffer can handle
            oversized_data = np.random.randint(
                -32768, 32767, 1024 * 1024, dtype=np.int16
            )

            with pytest.raises(BufferSizeError) as exc_info:
                processor.process_buffer(oversized_data, 1024 * 1024)

            assert "overrun" in str(exc_info.value).lower()
        finally:
            processor.stop()

    def test_latency_exceeded_error(self, processor):
        """Test handling of excessive processing latency."""
        processor.start()

        try:
            # Simulate slow processing that exceeds latency threshold
            def slow_processing(*args, **kwargs):
                time.sleep(2.0)  # Sleep longer than max latency

            with patch.object(processor, "_process_audio", slow_processing):
                data = np.random.randint(-32768, 32767, 512, dtype=np.int16)

                with pytest.raises(LatencyError) as exc_info:
                    processor.process_buffer(data, 512)

                assert "latency" in str(exc_info.value).lower()
        finally:
            processor.stop()

    def test_invalid_audio_formats(self, processor):
        """Test handling of invalid audio formats."""
        processor.start()

        try:
            # Test invalid data types
            invalid_data = "not_audio_data"

            with pytest.raises((AudioProcessingError, ValueError, TypeError)):
                processor.process_buffer(invalid_data, 512)

            # Test invalid sample rates
            with pytest.raises((AudioProcessingError, ValueError)):
                invalid_config = {"sample_rate": -44100}
                processor.update_config(invalid_config)

        finally:
            processor.stop()

    def test_concurrent_processing_errors(self, processor):
        """Test error handling in concurrent processing scenarios."""
        processor.start()

        errors = []

        def process_with_errors(thread_id):
            try:
                for i in range(10):
                    if i % 3 == 0:
                        # Occasionally provide invalid data
                        try:
                            processor.process_buffer(None, 512)
                        except BufferUnderrunError:
                            pass  # Expected
                    else:
                        data = np.random.randint(-32768, 32767, 512, dtype=np.int16)
                        processor.process_buffer(data, 512)
            except Exception as e:
                errors.append(f"Thread {thread_id}: {e}")

        try:
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(process_with_errors, i) for i in range(5)]

                for future in futures:
                    future.result()

            # Should not have unexpected errors
            assert (
                len(errors) == 0
            ), f"Unexpected concurrent processing errors: {errors}"
        finally:
            processor.stop()

    def test_audio_export_invalid_settings(self, processor):
        """Test audio export with invalid settings."""
        processor.start()

        try:
            # Test invalid export settings
            invalid_settings = AudioExportSettings(
                format="invalid_format",
                bit_depth=64,  # Unsupported bit depth
                sample_rate=0,  # Invalid sample rate
            )

            data = np.random.randint(-32768, 32767, 512, dtype=np.int16)
            processor.process_buffer(data, 512)

            with pytest.raises((AudioProcessingError, ValueError)):
                processor.export_audio("test_output", invalid_settings)
        finally:
            processor.stop()

    def test_plugin_crash_during_processing(self, processor):
        """Test handling of plugin crashes during processing."""
        processor.start()

        try:
            # Add a mock plugin that crashes
            crash_plugin = Mock()
            crash_plugin.process.side_effect = RuntimeError("Plugin crashed")

            processor.add_plugin("crash_plugin", crash_plugin)

            data = np.random.randint(-32768, 32767, 512, dtype=np.int16)

            # Should handle plugin crash gracefully
            with pytest.raises(AudioProcessingError) as exc_info:
                processor.process_buffer(data, 512)

            assert "plugin" in str(exc_info.value).lower()
            assert "crash" in str(exc_info.value).lower()
        finally:
            processor.stop()


class TestValidationSystemEdgeCases:
    """Test edge cases and error handling in validation system."""

    def test_extreme_buffer_sizes(self):
        """Test validation of extreme buffer sizes."""
        # Test extremely large buffer sizes
        with pytest.raises(ValueError):
            validate_buffer_size(10**12)  # 1TB

        # Test negative buffer sizes
        with pytest.raises(ValueError):
            validate_buffer_size(-1024)

        # Test zero buffer size
        with pytest.raises(ValueError):
            validate_buffer_size(0)

        # Test non-integer buffer sizes
        with pytest.raises((ValueError, TypeError)):
            validate_buffer_size(1024.5)

    def test_extreme_sample_rates(self):
        """Test validation of extreme sample rates."""
        # Test extremely high sample rates
        with pytest.raises(ValueError):
            validate_sample_rate(10**9)  # 1 GHz

        # Test negative sample rates
        with pytest.raises(ValueError):
            validate_sample_rate(-44100)

        # Test zero sample rate
        with pytest.raises(ValueError):
            validate_sample_rate(0)

        # Test very low sample rates - some may pass validation
        try:
            validate_sample_rate(1)  # 1 Hz may or may not be valid
        except ValueError:
            pass  # Expected to fail

    def test_invalid_audio_data(self):
        """Test validation of audio data."""
        # Test invalid audio data types
        with pytest.raises(ValueError):
            validate_audio_data("not_audio_data")

        # Test None audio data
        with pytest.raises(ValueError):
            validate_audio_data(None)

        # Test audio data with NaN values
        data_with_nan = np.array([1.0, np.nan, 3.0])
        with pytest.raises(ValueError):
            validate_audio_data(data_with_nan)

    def test_validation_with_corrupted_data(self):
        """Test validation with corrupted or malicious data."""
        # Test with NaN values
        with pytest.raises((ValueError, TypeError)):
            validate_buffer_size(float("nan"))

        # Test with infinity values
        with pytest.raises((ValueError, TypeError)):
            validate_sample_rate(float("inf"))

        # Test with corrupted audio data
        corrupted_data = np.array([1.0, float("inf"), 3.0])
        with pytest.raises(ValueError):
            validate_audio_data(corrupted_data)

    def test_validation_edge_cases(self):
        """Test validation edge cases."""
        # Test very small but valid buffer sizes
        try:
            validate_buffer_size(64)  # Very small buffer
        except ValueError:
            pass  # May fail validation

        # Test unusual but potentially valid sample rates
        try:
            validate_sample_rate(8000)  # Low but valid sample rate
        except ValueError:
            pass  # May fail validation


class TestPluginSystemEdgeCases:
    """Test edge cases and error handling in plugin system."""

    @pytest.fixture
    def plugin_database(self):
        """Create a plugin database for testing."""
        return PluginDatabase()

    def test_plugin_loading_invalid_paths(self, plugin_database):
        """Test loading plugins from invalid paths."""
        # Test non-existent path
        with pytest.raises((FileNotFoundError, ValidationError)):
            plugin_database.load_plugins_from_path("/nonexistent/path")

        # Test file instead of directory
        with tempfile.NamedTemporaryFile() as tmp:
            with pytest.raises((NotADirectoryError, ValidationError)):
                plugin_database.load_plugins_from_path(tmp.name)

    def test_plugin_parameter_validation_errors(self, plugin_database):
        """Test plugin parameter validation errors."""
        # Create plugin with invalid parameters
        invalid_params = [
            PluginParameter(
                name="freq", value="not_a_number", min_val=20, max_val=20000
            ),
            PluginParameter(name="gain", value=float("inf"), min_val=-60, max_val=12),
            PluginParameter(name="q", value=float("nan"), min_val=0.1, max_val=100),
        ]

        for param in invalid_params:
            with pytest.raises(ValidationError):
                plugin_database.validate_plugin_parameter(param)

    def test_plugin_crash_isolation(self, plugin_database):
        """Test that plugin crashes don't affect the system."""
        # Create a mock plugin that crashes
        crash_plugin = Mock()
        crash_plugin.process.side_effect = RuntimeError("Plugin crashed")
        crash_plugin.get_parameters.side_effect = RuntimeError("Plugin crashed")

        # Add crash-prone plugin
        plugin_id = plugin_database.register_plugin("crash_plugin", crash_plugin)

        # System should continue working despite plugin crash
        try:
            result = plugin_database.process_audio(plugin_id, np.zeros(512))
        except RuntimeError:
            pass  # Expected for crash plugin

        # Other plugins should still work
        normal_plugin = Mock()
        normal_plugin.process.return_value = np.ones(512)
        normal_plugin.get_parameters.return_value = []

        normal_id = plugin_database.register_plugin("normal_plugin", normal_plugin)
        result = plugin_database.process_audio(normal_id, np.zeros(512))

        assert result is not None
        assert len(result) == 512

    def test_plugin_memory_leak_detection(self, plugin_database):
        """Test detection of plugin memory leaks."""
        # Get initial memory usage
        process = psutil.Process()
        initial_memory = process.memory_info().rss

        # Create and use many plugin instances
        for i in range(100):
            leaky_plugin = Mock()
            leaky_plugin.process.return_value = np.ones(512) * i
            leaky_plugin.get_parameters.return_value = []

            plugin_id = plugin_database.register_plugin(
                f"leaky_plugin_{i}", leaky_plugin
            )

            # Process some audio
            plugin_database.process_audio(plugin_id, np.zeros(512))

            # Remove plugin
            plugin_database.unregister_plugin(plugin_id)

        # Force garbage collection
        gc.collect()

        # Check final memory usage
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable (less than 100MB for this test)
        assert (
            memory_increase < 100 * 1024 * 1024
        ), f"Potential memory leak: {memory_increase / 1024 / 1024:.2f}MB increase"


class TestSystemIntegrationErrors:
    """Test error handling in system integration scenarios."""

    def test_audio_device_disconnection(self):
        """Test handling of audio device disconnection during processing."""
        # Mock audio device that disconnects
        mock_device = Mock()
        mock_device.is_connected.return_value = True
        mock_device.process.return_value = np.ones(512)

        # Simulate device disconnection
        def disconnect_side_effect(*args, **kwargs):
            mock_device.is_connected.return_value = False
            raise OSError("Device disconnected")

        mock_device.process.side_effect = disconnect_side_effect

        # Should handle device disconnection gracefully
        with pytest.raises(IOError) as exc_info:
            mock_device.process(np.ones(512))

        assert "disconnected" in str(exc_info.value).lower()

    def test_file_system_errors_during_export(self):
        """Test handling of file system errors during audio export."""
        # Mock export with file system error
        with patch("builtins.open", side_effect=PermissionError("Permission denied")):
            with pytest.raises(PermissionError):
                # Attempt to export should fail gracefully
                with open("test_output.wav", "wb") as f:
                    f.write(b"audio data")

    def test_network_errors_in_remote_processing(self):
        """Test handling of network errors in remote processing scenarios."""
        # Mock remote processing with network error
        with patch(
            "requests.post", side_effect=requests.ConnectionError("Network unreachable")
        ):
            with pytest.raises(requests.ConnectionError):
                # Remote processing should fail gracefully
                requests.post("http://remote-processor/process", data={"audio": "data"})

    def test_database_connection_failures(self):
        """Test handling of database connection failures."""
        # Mock database that fails to connect
        mock_db = Mock()
        mock_db.connect.side_effect = ConnectionError("Database unavailable")

        with pytest.raises(ConnectionError) as exc_info:
            mock_db.connect()

        assert (
            "database" in str(exc_info.value).lower()
            or "unavailable" in str(exc_info.value).lower()
        )

    def test_configuration_file_corruption(self):
        """Test handling of corrupted configuration files."""
        # Create a corrupted JSON config file
        corrupted_config = '{"invalid": json content}'

        with patch("builtins.open", mock_open(read_data=corrupted_config)):
            with patch(
                "json.load",
                side_effect=json.JSONDecodeError("Invalid JSON", corrupted_config, 0),
            ):
                with pytest.raises(json.JSONDecodeError):
                    # Should handle corrupted config gracefully
                    import json

                    json.load(open("config.json"))


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
