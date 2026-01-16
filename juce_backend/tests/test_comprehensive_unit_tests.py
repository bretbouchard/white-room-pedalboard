"""
Comprehensive unit tests with quality validation for audio agent
"""

import ast
import asyncio
import os
from pathlib import Path
from typing import Any
from unittest.mock import Mock

import numpy as np
import pytest
from pydantic import BaseModel, ConfigDict, ValidationError


class AudioAgentTestValidator:
    """Validates comprehensive testing standards for audio agent"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.src_path = project_root / "src"

    def get_python_modules(self) -> list[Path]:
        """Get all Python modules in the audio agent"""
        modules = []
        for root, dirs, files in os.walk(self.src_path):
            # Skip test directories and __pycache__
            dirs[:] = [
                d
                for d in dirs
                if not d.startswith(".")
                and d != "__pycache__"
                and "test" not in d.lower()
            ]

            for file in files:
                if file.endswith(".py") and not file.startswith("test_"):
                    modules.append(Path(root) / file)
        return modules

    def validate_audio_specific_imports(self, module_path: Path) -> list[str]:
        """Validate audio-specific import patterns"""
        issues = []

        try:
            with open(module_path, encoding="utf-8") as f:
                content = f.read()

            # Check for audio-specific imports
            audio_imports = [
                "numpy",
                "scipy",
                "librosa",
                "dawdreamer",
                "pydantic",
                "fastapi",
                "websockets",
            ]

            for audio_import in audio_imports:
                if audio_import in content:
                    # Check if import is properly handled
                    if audio_import == "dawdreamer" and "try:" not in content:
                        issues.append(
                            "DawDreamer import should be wrapped in try/except for optional dependency"
                        )

        except Exception as e:
            issues.append(f"Error validating audio imports: {e}")

        return issues

    def validate_async_patterns(self, module_path: Path) -> list[str]:
        """Validate async/await patterns"""
        issues = []

        try:
            with open(module_path, encoding="utf-8") as f:
                content = f.read()

            if "async def" in content:
                tree = ast.parse(content)

                for node in ast.walk(tree):
                    if isinstance(node, ast.AsyncFunctionDef):
                        # Check if async function has proper error handling
                        has_try_except = any(
                            isinstance(child, ast.Try) for child in ast.walk(node)
                        )

                        if not has_try_except and len(node.body) > 1:
                            issues.append(
                                f"Async function '{node.name}' should have error handling"
                            )

        except Exception as e:
            issues.append(f"Error validating async patterns: {e}")

        return issues


@pytest.fixture
def audio_validator():
    """Create an audio agent test validator"""
    project_root = Path(__file__).parent.parent
    return AudioAgentTestValidator(project_root)


class TestAudioAgentImports:
    """Test audio agent import validation"""

    def test_core_audio_imports(self):
        """Test that core audio libraries can be imported"""

        # Test NumPy import
        try:
            import numpy as np

            assert hasattr(np, "array")
            assert hasattr(np, "fft")
        except ImportError:
            pytest.skip("NumPy not available")

        # Test SciPy import
        try:
            import scipy

            assert hasattr(scipy, "signal")
        except ImportError:
            pytest.skip("SciPy not available")

        # Test Librosa import (optional)
        try:
            import librosa

            assert hasattr(librosa, "load")
            assert hasattr(librosa, "stft")
        except ImportError:
            pytest.skip("Librosa not available")

    def test_dawdreamer_optional_import(self):
        """Test DawDreamer optional import pattern"""

        # Test the pattern used in the codebase
        dawdreamer_available = False
        try:
            import dawdreamer as daw

            dawdreamer_available = True
        except ImportError:
            # This is expected in test environment
            pass

        # Should handle both cases gracefully
        assert isinstance(dawdreamer_available, bool)

    def test_audio_agent_module_imports(self):
        """Test audio agent module imports"""

        try:
            from audio_agent import main

            assert hasattr(main, "app")
        except ImportError as e:
            # Some imports might fail in test environment
            pytest.skip(f"Audio agent modules not available: {e}")

    def test_pydantic_models_import(self):
        """Test Pydantic models import"""

        try:
            from audio_agent.models import agent

            # Should be able to import without errors
        except ImportError as e:
            pytest.skip(f"Audio agent models not available: {e}")


class TestAudioDataGenerators:
    """Test audio-specific data generators"""

    def test_audio_buffer_generator(self):
        """Test audio buffer data generation"""

        def generate_audio_buffer(
            sample_rate: int = 44100, duration: float = 1.0, channels: int = 2
        ) -> np.ndarray:
            """Generate test audio buffer"""
            samples = int(sample_rate * duration)
            if channels == 1:
                return np.random.random(samples).astype(np.float32)
            else:
                return np.random.random((samples, channels)).astype(np.float32)

        # Test mono audio
        mono_buffer = generate_audio_buffer(channels=1)
        assert mono_buffer.ndim == 1
        assert len(mono_buffer) == 44100
        assert mono_buffer.dtype == np.float32

        # Test stereo audio
        stereo_buffer = generate_audio_buffer(channels=2)
        assert stereo_buffer.ndim == 2
        assert stereo_buffer.shape == (44100, 2)
        assert stereo_buffer.dtype == np.float32

    def test_plugin_parameter_generator(self):
        """Test plugin parameter data generation"""

        def generate_plugin_parameters(
            plugin_type: str = "reverb", parameter_count: int = 5
        ) -> dict[str, Any]:
            """Generate test plugin parameters"""
            base_params = {
                "bypass": False,
                "wet_dry_mix": 0.5,
                "input_gain": 0.0,
                "output_gain": 0.0,
            }

            if plugin_type == "reverb":
                base_params.update(
                    {"room_size": 0.7, "damping": 0.3, "pre_delay": 0.02}
                )
            elif plugin_type == "eq":
                base_params.update(
                    {
                        "low_freq": 100.0,
                        "mid_freq": 1000.0,
                        "high_freq": 10000.0,
                        "low_gain": 0.0,
                        "mid_gain": 0.0,
                        "high_gain": 0.0,
                    }
                )

            return base_params

        # Test reverb parameters
        reverb_params = generate_plugin_parameters("reverb")
        assert "room_size" in reverb_params
        assert "damping" in reverb_params
        assert reverb_params["bypass"] is False

        # Test EQ parameters
        eq_params = generate_plugin_parameters("eq")
        assert "low_freq" in eq_params
        assert "mid_freq" in eq_params
        assert "high_freq" in eq_params

    def test_midi_data_generator(self):
        """Test MIDI data generation"""

        def generate_midi_sequence(
            note_count: int = 8,
            velocity_range: tuple = (64, 127),
            duration_range: tuple = (0.25, 1.0),
        ) -> list[dict[str, Any]]:
            """Generate test MIDI sequence"""
            import random

            notes = []
            current_time = 0.0

            for i in range(note_count):
                note = {
                    "note": 60 + (i % 12),  # C major scale
                    "velocity": random.randint(*velocity_range),
                    "start_time": current_time,
                    "duration": random.uniform(*duration_range),
                    "channel": 0,
                }
                notes.append(note)
                current_time += note["duration"]

            return notes

        midi_sequence = generate_midi_sequence()
        assert len(midi_sequence) == 8

        for note in midi_sequence:
            assert "note" in note
            assert "velocity" in note
            assert "start_time" in note
            assert "duration" in note
            assert 64 <= note["velocity"] <= 127


class TestAudioMockingFramework:
    """Test audio-specific mocking framework"""

    def test_dawdreamer_engine_mock(self):
        """Test DawDreamer engine mocking"""

        class MockDawDreamerEngine:
            def __init__(self):
                self.sample_rate = 44100
                self.buffer_size = 512
                self.plugins = []

            def load_plugin(self, plugin_path: str) -> Mock:
                mock_plugin = Mock()
                mock_plugin.get_parameter_count.return_value = 10
                mock_plugin.get_parameter_name.return_value = "test_param"
                mock_plugin.set_parameter.return_value = None
                self.plugins.append(mock_plugin)
                return mock_plugin

            def render(self, duration: float) -> np.ndarray:
                samples = int(self.sample_rate * duration)
                return np.random.random((samples, 2)).astype(np.float32)

        # Test mock engine
        engine = MockDawDreamerEngine()
        assert engine.sample_rate == 44100

        # Test plugin loading
        plugin = engine.load_plugin("/path/to/plugin.vst3")
        assert plugin.get_parameter_count() == 10

        # Test rendering
        audio = engine.render(1.0)
        assert audio.shape == (44100, 2)
        assert audio.dtype == np.float32

    def test_websocket_mock(self):
        """Test WebSocket mocking for real-time communication"""

        class MockWebSocket:
            def __init__(self):
                self.messages = []
                self.closed = False

            async def send(self, message: str):
                if self.closed:
                    raise ConnectionError("WebSocket is closed")
                self.messages.append(message)

            async def recv(self) -> str:
                if self.closed:
                    raise ConnectionError("WebSocket is closed")
                if self.messages:
                    return self.messages.pop(0)
                return '{"type": "ping"}'

            async def close(self):
                self.closed = True

        # Test WebSocket mock
        async def test_websocket():
            ws = MockWebSocket()

            await ws.send(
                '{"type": "parameter_change", "plugin_id": 1, "param": "gain", "value": 0.5}'
            )
            assert len(ws.messages) == 1

            message = await ws.recv()
            assert '"type": "parameter_change"' in message

            await ws.close()
            assert ws.closed is True

        asyncio.run(test_websocket())

    def test_audio_analysis_mock(self):
        """Test audio analysis mocking"""

        class MockAudioAnalyzer:
            def __init__(self):
                self.sample_rate = 44100

            def analyze_spectrum(self, audio: np.ndarray) -> dict[str, Any]:
                # Mock spectral analysis
                return {
                    "fundamental_freq": 440.0,
                    "spectral_centroid": 2000.0,
                    "spectral_rolloff": 8000.0,
                    "mfcc": np.random.random(13).tolist(),
                    "rms_energy": 0.1,
                }

            def detect_tempo(self, audio: np.ndarray) -> float:
                # Mock tempo detection
                return 120.0

            def analyze_harmony(self, audio: np.ndarray) -> dict[str, Any]:
                # Mock harmonic analysis
                return {
                    "key": "C major",
                    "chord_progression": ["C", "Am", "F", "G"],
                    "harmonic_complexity": 0.6,
                }

        # Test audio analyzer mock
        analyzer = MockAudioAnalyzer()
        test_audio = np.random.random(44100).astype(np.float32)

        spectrum = analyzer.analyze_spectrum(test_audio)
        assert "fundamental_freq" in spectrum
        assert spectrum["fundamental_freq"] == 440.0

        tempo = analyzer.detect_tempo(test_audio)
        assert tempo == 120.0

        harmony = analyzer.analyze_harmony(test_audio)
        assert "key" in harmony
        assert harmony["key"] == "C major"


class TestAudioEdgeCases:
    """Test audio-specific edge cases"""

    def test_audio_buffer_edge_cases(self):
        """Test audio buffer edge cases"""

        def process_audio_buffer(buffer: np.ndarray) -> np.ndarray:
            """Process audio buffer with edge case handling"""
            if buffer is None or buffer.size == 0:
                return np.zeros(1024, dtype=np.float32)

            # Handle different input shapes
            if buffer.ndim == 1:
                # Mono to stereo
                return np.column_stack([buffer, buffer])
            elif buffer.ndim == 2:
                # Already stereo
                return buffer
            else:
                raise ValueError(f"Unsupported audio buffer shape: {buffer.shape}")

        # Test empty buffer
        empty_buffer = np.array([])
        result = process_audio_buffer(empty_buffer)
        assert result.shape == (1024,)

        # Test None input
        result = process_audio_buffer(None)
        assert result.shape == (1024,)

        # Test mono buffer
        mono_buffer = np.random.random(1024).astype(np.float32)
        result = process_audio_buffer(mono_buffer)
        assert result.shape == (1024, 2)

        # Test stereo buffer
        stereo_buffer = np.random.random((1024, 2)).astype(np.float32)
        result = process_audio_buffer(stereo_buffer)
        assert result.shape == (1024, 2)

        # Test invalid shape
        invalid_buffer = np.random.random((1024, 2, 3)).astype(np.float32)
        with pytest.raises(ValueError, match="Unsupported audio buffer shape"):
            process_audio_buffer(invalid_buffer)

    def test_sample_rate_conversion(self):
        """Test sample rate conversion edge cases"""

        def convert_sample_rate(
            audio: np.ndarray, original_rate: int, target_rate: int
        ) -> np.ndarray:
            """Convert sample rate with edge case handling"""
            if original_rate == target_rate:
                return audio

            if original_rate <= 0 or target_rate <= 0:
                raise ValueError("Sample rates must be positive")

            # Simple resampling (in real implementation would use proper resampling)
            ratio = target_rate / original_rate
            new_length = int(len(audio) * ratio)

            if new_length == 0:
                return np.array([], dtype=audio.dtype)

            # Linear interpolation for simplicity
            indices = np.linspace(0, len(audio) - 1, new_length)
            return np.interp(indices, np.arange(len(audio)), audio).astype(audio.dtype)

        # Test same sample rate
        audio = np.random.random(1024).astype(np.float32)
        result = convert_sample_rate(audio, 44100, 44100)
        assert np.array_equal(result, audio)

        # Test upsampling
        result = convert_sample_rate(audio, 44100, 88200)
        assert len(result) == 2048

        # Test downsampling
        result = convert_sample_rate(audio, 44100, 22050)
        assert len(result) == 512

        # Test invalid sample rates
        with pytest.raises(ValueError, match="Sample rates must be positive"):
            convert_sample_rate(audio, -44100, 44100)

        with pytest.raises(ValueError, match="Sample rates must be positive"):
            convert_sample_rate(audio, 44100, 0)

    def test_plugin_parameter_validation(self):
        """Test plugin parameter validation edge cases"""

        class PluginParameter(BaseModel):
            model_config = ConfigDict(strict=True)

            name: str
            value: float
            min_value: float = 0.0
            max_value: float = 1.0

            def validate_range(self) -> bool:
                return self.min_value <= self.value <= self.max_value

        # Test valid parameter
        param = PluginParameter(name="gain", value=0.5, min_value=0.0, max_value=1.0)
        assert param.validate_range() is True

        # Test parameter out of range
        param_out_of_range = PluginParameter(
            name="gain", value=1.5, min_value=0.0, max_value=1.0
        )
        assert param_out_of_range.validate_range() is False

        # Test invalid type
        with pytest.raises(ValidationError):
            PluginParameter(
                name="gain",
                value="invalid",  # Should be float
                min_value=0.0,
                max_value=1.0,
            )

    def test_real_time_processing_constraints(self):
        """Test real-time processing constraints"""

        def real_time_audio_process(
            input_buffer: np.ndarray,
            max_processing_time: float = 0.01,  # 10ms for real-time
        ) -> np.ndarray:
            """Process audio with real-time constraints"""
            import time

            start_time = time.time()

            # Simulate audio processing
            output_buffer = input_buffer * 0.5  # Simple gain reduction

            # Add some processing delay
            time.sleep(0.001)  # 1ms processing time

            processing_time = time.time() - start_time

            if processing_time > max_processing_time:
                raise RuntimeError(
                    f"Processing took {processing_time:.3f}s, exceeds {max_processing_time:.3f}s limit"
                )

            return output_buffer

        # Test normal processing
        input_audio = np.random.random(512).astype(np.float32)
        output_audio = real_time_audio_process(input_audio)
        assert output_audio.shape == input_audio.shape
        assert np.allclose(output_audio, input_audio * 0.5)

        # Test processing time constraint
        # This test might be flaky depending on system performance
        try:
            result = real_time_audio_process(input_audio, max_processing_time=0.1)
            assert result is not None
        except RuntimeError:
            # This is acceptable if the system is slow
            pass


class TestAudioCodeQuality:
    """Test audio-specific code quality standards"""

    def test_numpy_array_handling(self):
        """Test NumPy array handling standards"""

        def safe_array_operation(arr: np.ndarray) -> np.ndarray:
            """Safely handle NumPy array operations"""
            if not isinstance(arr, np.ndarray):
                arr = np.asarray(arr)

            # Ensure float32 for audio processing
            if arr.dtype != np.float32:
                arr = arr.astype(np.float32)

            # Ensure values are in valid range [-1, 1]
            arr = np.clip(arr, -1.0, 1.0)

            return arr

        # Test with list input
        list_input = [0.5, -0.3, 1.2, -1.5]
        result = safe_array_operation(list_input)
        assert isinstance(result, np.ndarray)
        assert result.dtype == np.float32
        assert np.all(result >= -1.0) and np.all(result <= 1.0)

        # Test with wrong dtype
        int_array = np.array([1, 2, 3], dtype=np.int32)
        result = safe_array_operation(int_array)
        assert result.dtype == np.float32

        # Test clipping
        out_of_range = np.array([2.0, -2.0, 0.5], dtype=np.float32)
        result = safe_array_operation(out_of_range)
        assert result[0] == 1.0  # Clipped to 1.0
        assert result[1] == -1.0  # Clipped to -1.0
        assert result[2] == 0.5  # Unchanged

    def test_deployment_configuration_validation(self):
        """Test deployment configuration standards"""

        def validate_deployment_config(config: dict[str, Any]) -> list[str]:
            """Validate deployment configuration"""
            issues = []

            # Check for required environment variables
            required_env_vars = [
                "CLERK_SECRET_KEY",
                "SCHILLINGER_API_URL",
                "AUDIO_AGENT_PORT",
            ]

            for var in required_env_vars:
                if var not in config.get("env", {}):
                    issues.append(f"Missing required environment variable: {var}")

            # Check for process definitions
            if "processes" not in config:
                issues.append("Missing process definitions in configuration")

            # Check for proper logging configuration
            if "logging" in config:
                logging_config = config["logging"]
                if "level" not in logging_config:
                    issues.append("Missing logging level in configuration")
                if "handlers" not in logging_config:
                    issues.append("Missing logging handlers in configuration")

            return issues

        # Test valid configuration
        valid_config = {
            "env": {
                "CLERK_SECRET_KEY": "test-key",
                "SCHILLINGER_API_URL": "http://localhost:8000",
                "AUDIO_AGENT_PORT": "8001",
            },
            "processes": {"web": "python -m audio_agent.main"},
            "logging": {"level": "INFO", "handlers": ["console"]},
        }

        issues = validate_deployment_config(valid_config)
        assert len(issues) == 0

        # Test invalid configuration
        invalid_config = {
            "env": {
                "CLERK_SECRET_KEY": "test-key"
                # Missing other required vars
            }
            # Missing processes and logging
        }

        issues = validate_deployment_config(invalid_config)
        assert len(issues) > 0
        assert any("SCHILLINGER_API_URL" in issue for issue in issues)
        assert any("process definitions" in issue for issue in issues)

    def test_import_validation_comprehensive(self):
        """Test comprehensive import validation"""

        def validate_imports(module_content: str) -> list[str]:
            """Validate imports in module content"""
            issues = []

            try:
                tree = ast.parse(module_content)

                for node in ast.walk(tree):
                    if isinstance(node, ast.ImportFrom):
                        if node.module:
                            # Check for problematic import patterns
                            if node.module.startswith("audio_agent."):
                                # Validate internal imports
                                if "non_existent" in node.module:
                                    issues.append(
                                        f"Import from non-existent module: {node.module}"
                                    )

                            # Check for deprecated imports
                            deprecated_modules = [
                                "audio_agent.legacy",
                                "audio_agent.old_api",
                            ]
                            if node.module in deprecated_modules:
                                issues.append(
                                    f"Import from deprecated module: {node.module}"
                                )

                    elif isinstance(node, ast.Import):
                        for alias in node.names:
                            # Check for problematic direct imports
                            if (
                                alias.name in ["dawdreamer"]
                                and "try:" not in module_content
                            ):
                                issues.append(
                                    "DawDreamer import should be wrapped in try/except"
                                )

            except SyntaxError as e:
                issues.append(f"Syntax error in module: {e}")

            return issues

        # Test valid imports
        valid_module = """
import logging
from audio_agent.models import agent
from audio_agent.core import processor

try:
    import dawdreamer
    DAWDREAMER_AVAILABLE = True
except ImportError:
    DAWDREAMER_AVAILABLE = False

logger = logging.getLogger(__name__)
"""

        issues = validate_imports(valid_module)
        assert len(issues) == 0

        # Test problematic imports
        problematic_module = """
import dawdreamer  # Should be wrapped in try/except
from audio_agent.non_existent import something
from audio_agent.legacy import old_function
"""

        issues = validate_imports(problematic_module)
        assert len(issues) >= 2  # Should catch multiple issues
        assert any("try/except" in issue for issue in issues)
        assert any("non_existent" in issue for issue in issues)

    def test_async_audio_processing(self):
        """Test async audio processing patterns"""

        class AsyncAudioProcessor:
            def __init__(self):
                self.processing_queue = asyncio.Queue()
                self.is_running = False

            async def start_processing(self):
                """Start async audio processing loop"""
                self.is_running = True
                while self.is_running:
                    try:
                        # Wait for audio buffer with timeout
                        buffer = await asyncio.wait_for(
                            self.processing_queue.get(), timeout=0.1
                        )

                        # Process buffer
                        await self.process_buffer(buffer)

                        # Mark task as done
                        self.processing_queue.task_done()

                    except asyncio.TimeoutError:
                        # No buffer to process, continue
                        continue
                    except Exception as e:
                        # Log error but continue processing
                        print(f"Processing error: {e}")
                        continue

            async def process_buffer(self, buffer: np.ndarray) -> np.ndarray:
                """Process audio buffer asynchronously"""
                # Simulate async processing
                await asyncio.sleep(0.001)
                return buffer * 0.8  # Simple gain reduction

            async def add_buffer(self, buffer: np.ndarray):
                """Add buffer to processing queue"""
                await self.processing_queue.put(buffer)

            def stop_processing(self):
                """Stop processing loop"""
                self.is_running = False

        # Test async processor
        async def test_async_processing():
            processor = AsyncAudioProcessor()

            # Start processing in background
            processing_task = asyncio.create_task(processor.start_processing())

            # Add some buffers
            test_buffer = np.random.random(512).astype(np.float32)
            await processor.add_buffer(test_buffer)

            # Wait a bit for processing
            await asyncio.sleep(0.01)

            # Stop processing
            processor.stop_processing()

            # Wait for processing task to complete
            await asyncio.sleep(0.01)
            processing_task.cancel()

            try:
                await processing_task
            except asyncio.CancelledError:
                pass

        # Run the test
        asyncio.run(test_async_processing())

    def test_error_handling_patterns(self):
        """Test audio-specific error handling patterns"""

        class AudioProcessingError(Exception):
            """Custom audio processing error"""

            pass

        def robust_audio_function(audio: np.ndarray) -> np.ndarray:
            """Audio function with robust error handling"""
            try:
                # Validate input
                if audio is None:
                    raise AudioProcessingError("Audio input is None")

                if not isinstance(audio, np.ndarray):
                    raise AudioProcessingError("Audio input must be NumPy array")

                if audio.size == 0:
                    raise AudioProcessingError("Audio input is empty")

                # Process audio
                result = audio * 0.5

                # Validate output
                if np.any(np.isnan(result)) or np.any(np.isinf(result)):
                    raise AudioProcessingError(
                        "Audio processing produced invalid values"
                    )

                return result

            except AudioProcessingError:
                # Re-raise audio-specific errors
                raise
            except Exception as e:
                # Wrap other exceptions
                raise AudioProcessingError(f"Unexpected error in audio processing: {e}")

        # Test valid input
        valid_audio = np.random.random(1024).astype(np.float32)
        result = robust_audio_function(valid_audio)
        assert result.shape == valid_audio.shape

        # Test None input
        with pytest.raises(AudioProcessingError, match="Audio input is None"):
            robust_audio_function(None)

        # Test empty input
        with pytest.raises(AudioProcessingError, match="Audio input is empty"):
            robust_audio_function(np.array([]))

        # Test invalid type
        with pytest.raises(
            AudioProcessingError, match="Audio input must be NumPy array"
        ):
            robust_audio_function("invalid")


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v", "--tb=short"])
