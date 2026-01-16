# Real File Handling API Documentation

## Overview

This document covers the updated Audio Agent API endpoints that replace mock responses with actual file processing, proper validation, and real processing results.

## New Features

### 🎯 Core Improvements

- **Real File Upload Handling**: Actual file upload processing instead of file path strings
- **Comprehensive Validation**: MIME type checking, file size limits, and security validation
- **Memory-Efficient Processing**: Integration with Audio Buffer Management System
- **Performance Metrics**: Detailed processing metrics and monitoring
- **Error Handling**: Comprehensive error handling with detailed error messages
- **Batch Processing**: Support for processing multiple files in parallel

### 🔒 Security Features

- **File Type Validation**: Strict MIME type and file extension checking
- **Size Limits**: Configurable file size limits to prevent abuse
- **Path Security**: Path traversal attack prevention
- **Filename Sanitization**: Safe filename generation
- **Temporary File Management**: Secure temporary file handling and cleanup

## Updated Endpoints

### 1. Audio Analysis with File Upload

#### `POST /api/v1/analyze-audio-upload`

Replaces the mock `/api/v1/analyze-local-audio` endpoint with real file processing.

**Request:**
- `file` (UploadFile): Audio file to analyze
- `analysis_type` (str, optional): Type of analysis (`full`, `basic`, `advanced`)

**Supported Audio Formats:**
- WAV: `.wav` (audio/wav, audio/wave, audio/x-wav)
- MP3: `.mp3` (audio/mpeg, audio/mp3, audio/x-mpeg)
- FLAC: `.flac` (audio/flac, audio/x-flac)
- AIFF: `.aiff`, `.aif` (audio/aiff, audio/x-aiff)
- OGG: `.ogg` (audio/ogg, audio/x-ogg)
- M4A: `.m4a` (audio/x-m4a, audio/mp4)

**Example Request:**
```bash
curl -X POST \
  "http://localhost:8000/api/v1/analyze-audio-upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@example.wav" \
  -F "analysis_type=full"
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "spectral_features": {
      "centroid": 1200.5,
      "rolloff": 5500.0,
      "flux": 0.02,
      "bandwidth": 2000.0,
      "flatness": 0.15,
      "mfcc": [-12.5, 8.2, 5.1, ...]
    },
    "dynamic_features": {
      "rms_level": 0.05,
      "peak_level": 0.15,
      "dynamic_range": 25.0,
      "transient_density": 15.3,
      "zero_crossing_rate": 0.08
    },
    "daid": "daid_123456",
    "user_id": "user_123",
    "file_path": "example.wav"
  },
  "file_info": {
    "filename": "example.wav",
    "file_path": "/tmp/abc123.wav",
    "file_size": 10485760,
    "mime_type": "audio/wav",
    "duration": 30.0,
    "sample_rate": 44100,
    "channels": 2,
    "format": "WAV"
  },
  "processing_time_ms": 1500.5,
  "metrics": {
    "file_size_mb": 10.0,
    "processing_time_ms": 1500.5,
    "peak_memory_mb": 25.3,
    "buffer_operations": 42,
    "cache_hit_rate": 0.75,
    "sample_rate": 44100,
    "duration_seconds": 30.0
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Unsupported file extension: .txt. Supported formats: .wav, .mp3, .flac, .aiff, .ogg, .m4a",
  "processing_time_ms": 25.2
}
```

### 2. Real Plugin Processing

#### `POST /api/v1/process-audio-with-plugin`

Replaces mock plugin processing with actual plugin execution.

**Request:**
- `file` (UploadFile): Audio file to process
- `plugin_id` (str): Plugin ID to use for processing
- `plugin_parameters` (str, optional): JSON string of plugin parameters

**Example Request:**
```bash
curl -X POST \
  "http://localhost:8000/api/v1/process-audio-with-plugin" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@example.wav" \
  -F "plugin_id=eq_plugin" \
  -F "plugin_parameters='{\"frequency\": 1000, \"gain\": 1.5, \"q\": 0.7}'"
```

**Response:**
```json
{
  "success": true,
  "processed_audio": {
    "output_file": "/tmp/processed_abc123.wav",
    "parameters": {
      "frequency": 1000,
      "gain": 1.5,
      "q": 0.7
    }
  },
  "file_info": {
    "filename": "example.wav",
    "file_size": 10485760,
    "mime_type": "audio/wav"
  },
  "plugin_id": "eq_plugin",
  "daid": "daid_789012",
  "user_id": "user_123",
  "processing_time_ms": 3200.8,
  "performance_metrics": {
    "buffer_operations": 128,
    "memory_usage_mb": 45.2,
    "avg_read_time_ms": 0.8,
    "avg_write_time_ms": 1.2
  }
}
```

### 3. Batch Audio Analysis

#### `POST /api/v1/batch-analyze-audio`

Process multiple audio files in parallel.

**Request:**
- `files` (List[UploadFile]): Multiple audio files to analyze
- `analysis_type` (str, optional): Analysis type for all files

**Example Request:**
```bash
curl -X POST \
  "http://localhost:8000/api/v1/batch-analyze-audio" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@file1.wav" \
  -F "files=@file2.mp3" \
  -F "analysis_type=basic"
```

**Response:**
```json
[
  {
    "success": true,
    "analysis": { /* analysis for file1.wav */ },
    "file_info": { /* file1.wav info */ },
    "processing_time_ms": 1200.3
  },
  {
    "success": true,
    "analysis": { /* analysis for file2.mp3 */ },
    "file_info": { /* file2.mp3 info */ },
    "processing_time_ms": 800.7
  }
]
```

### 4. File Processing Status

#### `GET /api/v1/file-status/{file_id}`

Get real-time status for long-running processing tasks.

**Example Request:**
```bash
curl -X GET \
  "http://localhost:8000/api/v1/file-status/abc123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "file_id": "abc123",
  "status": "processing",
  "progress": 65.0,
  "processing_time_ms": 3500.0,
  "user_id": "user_123",
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:35Z",
  "estimated_completion": "2024-01-01T12:01:00Z"
}
```

### 5. Temporary File Cleanup

#### `POST /api/v1/cleanup-temp-files`

Clean up temporary files from previous sessions.

**Request:**
- `user_id` (str, optional): Specific user ID to clean up
- `max_age_hours` (int, optional): Maximum file age in hours (default: 24)

**Example Request:**
```bash
curl -X POST \
  "http://localhost:8000/api/v1/cleanup-temp-files" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "max_age_hours=12"
```

**Response:**
```json
{
  "success": true,
  "cleanup_stats": {
    "files_removed": 15,
    "space_freed_mb": 234.5,
    "errors": []
  },
  "temp_directory": "/tmp",
  "max_age_hours": 12
}
```

## File Validation Rules

### File Size Limits

- **Default Limit**: 500MB per file
- **Batch Total**: 1GB per batch request
- **Configurable**: Can be adjusted per deployment

### Supported Audio Formats

| Format | Extensions | MIME Types |
|--------|-------------|------------|
| WAV | `.wav` | `audio/wav`, `audio/wave`, `audio/x-wav` |
| MP3 | `.mp3` | `audio/mpeg`, `audio/mp3`, `audio/x-mpeg` |
| FLAC | `.flac` | `audio/flac`, `audio/x-flac` |
| AIFF | `.aiff`, `.aif` | `audio/aiff`, `audio/x-aiff` |
| OGG | `.ogg` | `audio/ogg`, `audio/x-ogg` |
| M4A | `.m4a` | `audio/x-m4a`, `audio/mp4` |

### Security Validation

1. **Filename Sanitization**
   - Removes dangerous characters: `< > : " | ? * \0`
   - Limits filename length to 255 characters
   - Replaces invalid characters with underscores

2. **Path Validation**
   - Prevents path traversal attacks
   - Ensures files stay within allowed directories
   - Validates against whitelist of safe directories

3. **MIME Type Verification**
   - Validates file extension against MIME type
   - Uses python-magic for MIME type detection when available
   - Provides fallback for development environments

## Performance Optimization

### Memory Management

The system uses the Audio Buffer Management System for efficient processing:

- **Large Files (>50MB)**: Streaming buffers with disk backing
- **Medium Files**: Memory buffers with caching
- **Real-time Processing**: Ring buffers for low latency

### Parallel Processing

- **Batch Operations**: Up to 3 concurrent analyses
- **Buffer Pooling**: Reuses buffers for performance
- **Background Cleanup**: Automatic cleanup of old files

### Metrics Tracking

- **Processing Time**: Detailed timing metrics
- **Memory Usage**: Peak memory consumption
- **Buffer Operations**: Read/write statistics
- **Cache Hit Rates**: Cache effectiveness metrics

## Error Handling

### Common Error Responses

**File Validation Errors:**
```json
{
  "success": false,
  "error": "Unsupported file extension: .txt. Supported formats: .wav, .mp3, .flac, .aiff, .ogg, .m4a"
}
```

**File Size Errors:**
```json
{
  "success": false,
  "error": "File too large: 600,000,000 bytes (max: 500,000,000 bytes)"
}
```

**Processing Errors:**
```json
{
  "success": false,
  "error": "Audio analysis failed: Unable to process audio file"
}
```

## Client Integration Examples

### JavaScript (Fetch API)

```javascript
// Upload and analyze audio file
async function analyzeAudioFile(file, analysisType = 'full') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('analysis_type', analysisType);

  try {
    const response = await fetch('/api/v1/analyze-audio-upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      console.log('Analysis completed:', result.analysis);
      console.log('Metrics:', result.metrics);
      return result;
    } else {
      console.error('Analysis failed:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

// Process with plugin
async function processWithPlugin(file, pluginId, parameters = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('plugin_id', pluginId);
  formData.append('plugin_parameters', JSON.stringify(parameters));

  const response = await fetch('/api/v1/process-audio-with-plugin', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: formData
  });

  return response.json();
}

// Batch analysis
async function batchAnalyzeFiles(files, analysisType = 'basic') {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('analysis_type', analysisType);

  const response = await fetch('/api/v1/batch-analyze-audio', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: formData
  });

  return response.json();
}
```

### Python (requests)

```python
import requests

def analyze_audio_file(file_path, analysis_type='full', auth_token=None):
    """Upload and analyze audio file."""
    url = 'http://localhost:8000/api/v1/analyze-audio-upload'

    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {'analysis_type': analysis_type}
        headers = {'Authorization': f'Bearer {auth_token}'} if auth_token else {}

        response = requests.post(url, files=files, data=data, headers=headers)

        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Analysis failed: {response.text}")

def process_with_plugin(file_path, plugin_id, parameters=None, auth_token=None):
    """Process audio file with plugin."""
    url = 'http://localhost:8000/api/v1/process-audio-with-plugin'

    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {
            'plugin_id': plugin_id,
            'plugin_parameters': json.dumps(parameters or {})
        }
        headers = {'Authorization': f'Bearer {auth_token}'} if auth_token else {}

        response = requests.post(url, files=files, data=data, headers=headers)
        return response.json()
```

## Monitoring and Debugging

### Performance Metrics

All endpoints return detailed performance metrics:

```json
{
  "metrics": {
    "file_size_mb": 10.0,
    "processing_time_ms": 1500.5,
    "peak_memory_mb": 25.3,
    "buffer_operations": 42,
    "cache_hit_rate": 0.75,
    "sample_rate": 44100,
    "duration_seconds": 30.0
  }
}
```

### Health Check

```bash
curl http://localhost:8000/health
```

### API Documentation

```bash
curl http://localhost:8000/docs
```

## Configuration

### Environment Variables

```bash
# File upload limits
MAX_FILE_SIZE=5368709120  # 500MB in bytes
CHUNK_SIZE=8192           # 8KB chunks for file reading

# Temporary directory
TEMP_DIR=/tmp/audio_agent

# Security settings
ALLOWED_DIRECTORIES="/tmp,/var/tmp,~/.audio_agent"
```

### Custom Configuration

The AudioFileHandler can be configured with custom parameters:

```python
from src.audio_agent.api.file_handlers import AudioFileHandler

handler = AudioFileHandler(
    max_file_size=100 * 1024 * 1024,  # 100MB
    supported_formats={ ... },  # Custom formats
    temp_dir="/custom/temp"
)
```

## Migration Guide

### From Mock Endpoints

**Old:**
```bash
POST /api/v1/analyze-local-audio
Content-Type: application/json

{
  "audio_file_path": "/path/to/file.wav"
}
```

**New:**
```bash
POST /api/v1/analyze-audio-upload
Content-Type: multipart/form-data

file=@/path/to/file.wav
analysis_type=full
```

### Client Code Updates

**Old:**
```javascript
fetch('/api/v1/analyze-local-audio', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({audio_file_path: '/path/to/file.wav'})
})
```

**New:**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('analysis_type', 'full');

fetch('/api/v1/analyze-audio-upload', {
  method: 'POST',
  body: formData
})
```

## Best Practices

### Client-Side

1. **File Size Pre-validation**: Check file sizes before uploading
2. **Progress Feedback**: Show upload progress for large files
3. **Error Handling**: Handle validation and processing errors gracefully
4. **Cleanup**: Clean up temporary files after processing

### Server-Side

1. **Resource Monitoring**: Monitor memory and disk usage
2. **Rate Limiting**: Implement rate limiting for file uploads
3. **Audit Logging**: Log all file operations for security
4. **Regular Cleanup**: Schedule periodic cleanup of temporary files

### Security

1. **File Validation**: Always validate file types and sizes
2. **Access Control**: Ensure proper authentication and authorization
3. **Sanitization**: Sanitize all user-provided data
4. **Monitoring**: Monitor for unusual upload patterns

## Troubleshooting

### Common Issues

#### Upload Failures
- Check file format and size limits
- Verify authentication token
- Check server logs for detailed error messages

#### Performance Issues
- Monitor memory usage during large file processing
- Check disk space for temporary files
- Consider adjusting buffer sizes for different file types

#### Validation Errors
- Verify MIME type matches file extension
- Check supported audio formats
- Ensure file is not corrupted

### Debug Tools

1. **Health Check**: Use `/health` endpoint to check system status
2. **API Documentation**: Use `/docs` for interactive API testing
3. **Logs**: Check server logs for detailed error information
4. **Metrics**: Monitor performance metrics for optimization opportunities

## License

This API update maintains the existing MIT License while providing enhanced file handling capabilities.