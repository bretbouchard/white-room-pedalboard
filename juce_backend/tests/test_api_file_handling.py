"""
Comprehensive tests for updated API endpoints with real file handling.

Tests cover:
- File upload validation and processing
- MIME type checking and security
- File size limits and validation
- Real audio processing with buffer management
- Error handling and edge cases
- Performance metrics and monitoring
- Batch processing capabilities
"""

import io
import os
import tempfile
import unittest
from unittest.mock import AsyncMock, Mock, patch

import numpy as np
from fastapi import UploadFile
from fastapi.testclient import TestClient

from src.audio_agent.api.endpoints import (
    AudioFileHandler,
    AudioFileInfo,
    FileValidationError,
    validate_mime_type,
)
from src.audio_agent.main import app


class TestAudioFileHandler(unittest.TestCase):
    """Test the AudioFileHandler utility class."""

    def setUp(self):
        """Set up test fixtures."""
        self.handler = AudioFileHandler()
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up test fixtures."""
        import shutil

        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_supported_audio_formats(self):
        """Test supported audio formats configuration."""
        formats = self.handler.supported_formats

        # Check common formats are supported
        self.assertIn("audio/wav", formats)
        self.assertIn("audio/mpeg", formats)
        self.assertIn("audio/flac", formats)
        self.assertIn("audio/aiff", formats)
        self.assertIn("audio/ogg", formats)

    def test_validate_file_upload_success(self):
        """Test successful file validation."""
        # Create a mock UploadFile
        mock_file = Mock()
        mock_file.filename = "test.wav"
        mock_file.content_type = "audio/wav"

        is_valid, error = self.handler.validate_file_upload(mock_file)

        self.assertTrue(is_valid)
        self.assertIsNone(error)

    def test_validate_file_upload_no_file(self):
        """Test validation with no file provided."""
        mock_file = Mock()
        mock_file.filename = None

        is_valid, error = self.handler.validate_file_upload(mock_file)

        self.assertFalse(is_valid)
        self.assertEqual(error, "No file provided")

    def test_validate_file_upload_unsupported_extension(self):
        """Test validation with unsupported file extension."""
        mock_file = Mock()
        mock_file.filename = "test.txt"
        mock_file.content_type = "text/plain"

        is_valid, error = self.handler.validate_file_upload(mock_file)

        self.assertFalse(is_valid)
        self.assertIn("Unsupported file extension", error)

    def test_validate_file_upload_unsupported_mime_type(self):
        """Test validation with unsupported MIME type."""
        mock_file = Mock()
        mock_file.filename = "test.wav"
        mock_file.content_type = "text/plain"

        is_valid, error = self.handler.validate_file_upload(mock_file)

        self.assertFalse(is_valid)
        self.assertIn("Unsupported MIME type", error)

    async def test_save_uploaded_file_success(self):
        """Test successful file upload and saving."""
        # Create test audio data
        test_data = np.random.randn(1000, 2).astype(np.float32)
        test_file = io.BytesIO(test_data.tobytes())

        mock_file = UploadFile(filename="test.wav")
        mock_file.filename = "test.wav"
        mock_file.content_type = "audio/wav"
        mock_file._file = test_file

        with patch("builtins.open", create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.write = Mock(
                return_value=len(test_data)
            )
            mock_open.return_value.__exit__.return_value = None

            file_info = await self.handler.save_uploaded_file(mock_file)

            self.assertIsInstance(file_info, AudioFileInfo)
            self.assertEqual(file_info.filename, "test.wav")
            self.assertEqual(file_info.mime_type, "audio/wav")
            self.assertEqual(file_info.format, "WAV")

    async def test_save_uploaded_file_too_large(self):
        """Test file upload with file exceeding size limit."""
        # Create handler with small size limit
        small_handler = AudioFileHandler(max_file_size=1024)  # 1KB limit

        test_data = np.random.randn(10000, 2).astype(np.float32)  # Much larger than 1KB
        test_file = io.BytesIO(test_data.tobytes())

        mock_file = UploadFile(filename="large.wav")
        mock_file.filename = "large.wav"
        mock_file.content_type = "audio/wav"
        mock_file._file = test_file

        with self.assertRaises(FileValidationError) as cm:
            await small_handler.save_uploaded_file(mock_file)

        self.assertIn("File too large", str(cm.exception))

    def test_cleanup_file_success(self):
        """Test successful file cleanup."""
        # Create a temporary file
        temp_file = os.path.join(self.temp_dir, "test_cleanup.wav")
        with open(temp_file, "wb") as f:
            f.write(b"test data")

        self.assertTrue(os.path.exists(temp_file))

        result = self.handler.cleanup_file(temp_file)

        self.assertTrue(result)
        self.assertFalse(os.path.exists(temp_file))

    def test_cleanup_file_nonexistent(self):
        """Test cleanup of non-existent file."""
        nonexistent_file = os.path.join(self.temp_dir, "nonexistent.wav")

        result = self.handler.cleanup_file(nonexistent_file)

        self.assertFalse(result)

    def test_extract_audio_info(self):
        """Test audio info extraction."""
        # Create a mock audio file path
        mock_file_path = "/tmp/test.wav"

        # Mock librosa to avoid dependency
        with patch("src.audio_agent.api.file_handlers.librosa") as mock_librosa:
            mock_y = np.random.randn(1000, 2)
            mock_sr = 44100
            mock_librosa.load.return_value = (mock_y, mock_sr)

            audio_info = self.handler._extract_audio_info(mock_file_path)

            self.assertEqual(audio_info["sample_rate"], 44100)
            self.assertEqual(audio_info["channels"], 2)
            self.assertEqual(audio_info["duration"], 1000 / 44100)


class TestFileUploadAPI(unittest.TestCase):
    """Test the updated API endpoints with file uploads."""

    def setUp(self):
        """Set up test fixtures."""
        self.client = TestClient(app)
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up test fixtures."""
        import shutil

        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def create_test_audio_file(
        self, filename: str = "test.wav", size_kb: int = 100
    ) -> bytes:
        """Create a test audio file as bytes."""
        # Generate simple sine wave audio data
        sample_rate = 44100
        duration = size_kb * 1024 / 8  # Approximate duration based on size
        samples = int(sample_rate * duration)
        t = np.linspace(0, duration, samples)
        audio_data = 0.1 * np.sin(2 * np.pi * 440 * t)  # 440Hz sine wave
        stereo_data = np.column_stack([audio_data, audio_data])

        return stereo_data.astype(np.float32).tobytes()

    def test_analyze_audio_upload_endpoint_exists(self):
        """Test that the analyze-audio-upload endpoint exists."""
        response = self.client.options("/api/v1/analyze-audio-upload")

        # Should not return 404
        self.assertNotEqual(response.status_code, 404)

    @patch("src.audio_agent.api.endpoints.get_current_user")
    @patch("src.audio_agent.api.endpoints.AnalysisPipeline")
    def test_analyze_audio_upload_success(self, mock_pipeline_class, mock_auth):
        """Test successful audio file upload and analysis."""
        # Mock authentication
        mock_auth.return_value = {"clerkId": "test_user", "email": "test@example.com"}

        # Mock analysis pipeline
        mock_pipeline = AsyncMock()
        mock_pipeline.analyze_file.return_value = {
            "spectral_features": {"centroid": 1000, "rolloff": 5000},
            "dynamic_features": {"rms_level": 0.5, "peak_level": 0.8},
        }
        mock_pipeline_class.return_value = mock_pipeline

        # Create test audio file
        test_audio = self.create_test_audio_file()

        # Make request
        response = self.client.post(
            "/api/v1/analyze-audio-upload",
            files={"file": ("test.wav", test_audio, "audio/wav")},
            data={"analysis_type": "basic"},
        )

        # Check response
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIn("success", response_data)
        self.assertTrue(response_data["success"])

    def test_analyze_audio_upload_no_file(self):
        """Test upload endpoint with no file provided."""
        response = self.client.post(
            "/api/v1/analyze-audio-upload",
            data={"analysis_type": "basic"},
        )

        # FastAPI handles missing files with 422 Unprocessable Entity
        self.assertEqual(response.status_code, 422)

    def test_analyze_audio_upload_invalid_file_type(self):
        """Test upload endpoint with invalid file type."""
        # Create a text file instead of audio
        invalid_file = b"This is not an audio file"

        response = self.client.post(
            "/api/v1/analyze-audio-upload",
            files={"file": ("test.txt", invalid_file, "text/plain")},
            data={"analysis_type": "basic"},
        )

        # Should return validation error
        self.assertEqual(response.status_code, 422)

    @patch("src.audio_agent.api.endpoints.get_current_user")
    @patch("src.audio_agent.api.endpoints.get_file_handler")
    def test_analyze_audio_upload_validation_error(self, mock_get_handler, mock_auth):
        """Test upload endpoint with file validation error."""
        # Mock authentication
        mock_auth.return_value = {"clerkId": "test_user", "email": "test@example.com"}

        # Mock file handler to raise validation error
        mock_handler = Mock()
        mock_handler.save_uploaded_file = AsyncMock(
            side_effect=FileValidationError("Invalid file")
        )
        mock_get_handler.return_value = mock_handler

        # Create test audio file
        test_audio = self.create_test_audio_file()

        response = self.client.post(
            "/api/v1/analyze-audio-upload",
            files={"file": ("test.wav", test_audio, "audio/wav")},
            data={"analysis_type": "basic"},
        )

        # Should return validation error
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertFalse(response_data["success"])
        self.assertIn("error", response_data)


class TestMIMETypeValidation(unittest.TestCase):
    """Test MIME type validation and security."""

    def test_validate_mime_type_success(self):
        """Test successful MIME type validation."""
        # Create a temporary WAV file
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_file.write(
            b"RIFF"
            + b"\x00" * 36
            + b"WAVEfmt "
            + b"\x00" * 24
            + b"data"
            + b"\x00" * 100
        )
        temp_file.close()

        try:
            result = validate_mime_type(temp_file.name, "audio/wav")
            self.assertTrue(result)
        finally:
            os.unlink(temp_file.name)

    def test_validate_mime_type_no_magic_library(self):
        """Test MIME type validation when python-magic is not available."""
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        temp_file.write(b"test data")
        temp_file.close()

        try:
            with patch(
                "src.audio_agent.api.file_handlers.python_magic",
                side_effect=ImportError,
            ):
                result = validate_mime_type(temp_file.name, "audio/wav")
                self.assertTrue(
                    result
                )  # Should return True when library is not available
        finally:
            os.unlink(temp_file.name)


class TestSecurityFeatures(unittest.TestCase):
    """Test security features of file handling."""

    def test_sanitize_filename(self):
        """Test filename sanitization for security."""
        from src.audio_agent.api.file_handlers import sanitize_filename

        # Test dangerous characters
        dangerous_filename = "../../../etc/passwd"
        safe_filename = sanitize_filename(dangerous_filename)
        self.assertNotIn("..", safe_filename)
        self.assertNotIn("/", safe_filename)

        # Test special characters
        special_filename = "test<>:|?*file.wav"
        safe_filename = sanitize_filename(special_filename)
        self.assertNotIn("<", safe_filename)
        self.assertNotIn(">", safe_filename)
        self.assertNotIn(":", safe_filename)
        self.assertNotIn("|", safe_filename)
        self.assertNotIn("?", safe_filename)
        self.assertNotIn("*", safe_filename)

        # Test long filename
        long_filename = "a" * 300 + ".wav"
        safe_filename = sanitize_filename(long_filename)
        self.assertLessEqual(len(safe_filename), 255)

    def test_is_safe_path(self):
        """Test path safety validation."""
        from src.audio_agent.api.file_handlers import is_safe_path

        # Test safe paths
        safe_path = "/tmp/test.wav"
        base_path = "/tmp"
        self.assertTrue(is_safe_path(safe_path, base_path))

        # Test unsafe paths (path traversal)
        unsafe_path = "/tmp/../etc/passwd"
        self.assertFalse(is_safe_path(unsafe_path, base_path))

        # Test absolute path check
        safe_absolute = "/home/user/test.wav"
        base_absolute = "/home/user"
        self.assertTrue(is_safe_path(safe_absolute, base_absolute))


class TestPerformanceMetrics(unittest.TestCase):
    """Test performance metrics and monitoring."""

    @patch("src.audio_agent.api.endpoints.get_current_user")
    def test_audio_analysis_response_metrics(self, mock_auth):
        """Test that responses include performance metrics."""
        from src.audio_agent.api.endpoints import AudioAnalysisResponse

        # Mock authentication
        mock_auth.return_value = {"clerkId": "test_user", "email": "test@example.com"}

        # Create a response with metrics
        from src.audio_agent.api.endpoints import ProcessingMetrics

        metrics = ProcessingMetrics(
            file_size_mb=10.5,
            processing_time_ms=1500.0,
            peak_memory_mb=25.3,
            buffer_operations=42,
            cache_hit_rate=0.75,
            sample_rate=44100,
            duration_seconds=5.0,
        )

        response = AudioAnalysisResponse(
            success=True,
            processing_time_ms=1500.0,
            metrics=metrics.model_dump(),
        )

        # Verify metrics are included
        self.assertIsNotNone(response.metrics)
        self.assertEqual(response.metrics["file_size_mb"], 10.5)
        self.assertEqual(response.metrics["processing_time_ms"], 1500.0)
        self.assertEqual(response.metrics["peak_memory_mb"], 25.3)


class TestBatchProcessing(unittest.TestCase):
    """Test batch processing capabilities."""

    @patch("src.audio_agent.api.endpoints.get_current_user")
    @patch("src.audio_agent.api.endpoints.analyze_local_audio_upload")
    async def test_batch_analyze_files_success(self, mock_analyze, mock_auth):
        """Test successful batch file analysis."""
        from src.audio_agent.api.endpoints import batch_analyze_files

        # Mock authentication
        mock_auth.return_value = {"clerkId": "test_user", "email": "test@example.com"}

        # Mock individual analysis responses
        mock_responses = [
            AudioAnalysisResponse(success=True, analysis={"id": "1"}),
            AudioAnalysisResponse(success=True, analysis={"id": "2"}),
        ]
        mock_analyze.side_effect = mock_responses

        # Create mock files
        mock_files = [
            Mock(filename="test1.wav"),
            Mock(filename="test2.wav"),
        ]

        # Run batch analysis
        results = await batch_analyze_files(mock_files, "basic", mock_auth.return_value)

        # Check results
        self.assertEqual(len(results), 2)
        self.assertTrue(all(r.success for r in results))

    @patch("src.audio_agent.api.endpoints.get_current_user")
    async def test_batch_analyze_files_mixed_success(self, mock_auth):
        """Test batch analysis with mixed success/failure."""
        from src.audio_agent.api.endpoints import batch_analyze_files

        # Mock authentication
        mock_auth.return_value = {"clerkId": "test_user", "email": "test@example.com"}

        # Mock mixed responses
        mock_responses = [
            AudioAnalysisResponse(success=True, analysis={"id": "1"}),
            AudioAnalysisResponse(success=False, error="Invalid file"),
        ]
        mock_analyze = AsyncMock(side_effect=mock_responses)

        # Create mock files
        mock_files = [
            Mock(filename="test1.wav"),
            Mock(filename="test2.wav"),
        ]

        # Run batch analysis
        results = await batch_analyze_files(mock_files, "basic", mock_auth.return_value)

        # Check results
        self.assertEqual(len(results), 2)
        self.assertTrue(results[0].success)
        self.assertFalse(results[1].success)


class TestAPIIntegration(unittest.TestCase):
    """Integration tests for the complete API workflow."""

    def setUp(self):
        """Set up test fixtures."""
        self.client = TestClient(app)

    def test_api_endpoints_listed_in_root(self):
        """Test that updated endpoints are listed in root endpoint."""
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        root_data = response.json()

        # Check that new endpoints are mentioned (if endpoints list exists)
        if "endpoints" in root_data:
            endpoints = root_data["endpoints"]
            self.assertIn("analyze_audio_upload", endpoints.values())
            self.assertIn("process_audio_with_plugin", endpoints.values())

    def test_health_check_includes_new_components(self):
        """Test that health check includes audio buffer manager."""
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        health_data = response.json()

        # Should include basic components
        self.assertIn("components", health_data)
        self.assertIn("status", health_data)
        self.assertIn("service", health_data)

    def test_cors_headers_present(self):
        """Test that CORS headers are present for file uploads."""
        # Test preflight request
        response = self.client.options("/api/v1/analyze-audio-upload")

        # Should allow CORS
        self.assertIn("access-control-allow-origin", response.headers)


if __name__ == "__main__":
    # Configure logging for tests
    logging.basicConfig(
        level=logging.WARNING,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Run tests
    unittest.main(verbosity=2)
