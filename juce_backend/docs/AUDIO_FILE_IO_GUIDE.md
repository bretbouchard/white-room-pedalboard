# Audio File I/O and Export System Guide

## Overview

The Audio File I/O system provides comprehensive audio file management, analysis, and export capabilities for the DAW application. It supports multiple audio formats, advanced metadata handling, batch processing, and high-quality export options.

## Features

### Core Capabilities

- **Multi-format Support**: WAV, AIFF, FLAC, OGG, MP3, M4A, AAC
- **Enhanced Metadata Extraction**: ID3 tags, broadcast information, ISRC codes
- **Audio Analysis**: LUFS loudness, spectral analysis, tempo/key detection
- **High-Quality Export**: Configurable sample rates, bit depths, dithering options
- **Batch Processing**: Automated conversion and export workflows
- **Real-time Waveform Generation**: Optimized visualization data
- **Audio Region Management**: Timeline-based audio clip handling

### Audio Formats

| Format | Extension | Quality | Sample Rate | Bit Depth | Use Case |
|--------|-----------|---------|-------------|-----------|----------|
| WAV | .wav | Lossless | Up to 192kHz | 16/24/32-bit | Professional audio |
| AIFF | .aiff | Lossless | Up to 192kHz | 16/24/32-bit | Mac professional audio |
| FLAC | .flac | Lossless | Up to 655kHz | 16/24/32-bit | Compressed lossless |
| MP3 | .mp3 | Lossy | Up to 48kHz | N/A | Web/distribution |
| OGG | .ogg | Lossy | Up to 192kHz | N/A | Open source alternative |
| M4A/AAC | .m4a/.aac | Lossy | Up to 48kHz | N/A | Apple ecosystem |

## API Reference

### File Upload and Loading

#### Upload Audio File

```http
POST /api/audio/upload
Content-Type: multipart/form-data
```

**Parameters:**
- `file`: Audio file (required)
- `extract_metadata`: Boolean (optional, default: true)

**Response:**
```json
{
  "file_id": "uuid-string",
  "file_name": "audio.wav",
  "duration": 120.5,
  "sample_rate": 44100,
  "channels": 2,
  "format": "WAV",
  "file_size": 21168000,
  "bit_depth": 16,
  "title": "Track Title",
  "artist": "Artist Name",
  "album": "Album Name",
  "genre": "Electronic",
  "year": 2024,
  "bpm": 128.0,
  "key_signature": "C"
}
```

#### Get File Metadata

```http
GET /api/audio/files/{file_id}/metadata
```

**Response:** AudioFileMetadata object

### Audio Analysis

#### Analyze Audio

```http
GET /api/audio/files/{file_id}/analysis
```

**Response:**
```json
{
  "duration": 120.5,
  "sample_rate": 44100,
  "channels": 2,
  "loudness_lufs": -14.2,
  "loudness_peak": -1.5,
  "rms_level": -12.8,
  "dynamic_range": 11.3,
  "zero_crossings": 45231,
  "spectral_centroid": 2341.7,
  "spectral_bandwidth": 892.4,
  "spectral_rolloff": 4521.8,
  "tempo": 128.5,
  "key": "C"
}
```

#### Generate Waveform

```http
GET /api/audio/files/{file_id}/waveform?target_length=1000
```

**Response:**
```json
{
  "peaks": [0.1, 0.2, 0.15, ...],
  "length": 1000,
  "sample_rate": 44100
}
```

### Audio Export

#### Export Audio

```http
POST /api/audio/export
Content-Type: application/json
```

**Request Body:**
```json
{
  "file_id": "uuid-string",
  "output_path": "/path/to/export.wav",
  "settings": {
    "format": "wav",
    "sample_rate": 44100,
    "bit_depth": 16,
    "channels": 2,
    "quality": null,
    "dither": "none",
    "normalize": false,
    "normalize_target": -1.0,
    "trim_silence": false,
    "fade_in": 0.0,
    "fade_out": 0.0
  },
  "start_time": 0.0,
  "end_time": null
}
```

**Response:**
```json
{
  "output_path": "/path/to/export.wav"
}
```

#### Export Settings

- **format**: Target audio format (wav, aiff, flac, mp3, ogg)
- **sample_rate**: Output sample rate in Hz
- **bit_depth**: Bit depth for lossless formats (16, 24, 32)
- **channels**: Number of channels (1=mono, 2=stereo)
- **quality**: Quality setting for lossy formats (kbps)
- **dither**: Dithering type (none, triangular, shaped)
- **normalize**: Whether to normalize audio
- **normalize_target**: Target level in dBFS
- **trim_silence**: Remove silence from beginning/end
- **fade_in**: Fade in duration in seconds
- **fade_out**: Fade out duration in seconds

### Batch Processing

#### Create Batch Job

```http
POST /api/audio/batch/create
Content-Type: application/json
```

**Request Body:**
```json
{
  "input_files": ["/path/to/file1.wav", "/path/to/file2.wav"],
  "export_settings": {
    "format": "flac",
    "sample_rate": 48000,
    "bit_depth": 24,
    "channels": 2
  },
  "output_directory": "/path/to/output"
}
```

**Response:**
```json
{
  "job_id": "batch-uuid-string"
}
```

#### Process Batch Job

```http
POST /api/audio/batch/{job_id}/process
```

**Response:**
```json
{
  "message": "Batch job {job_id} started"
}
```

#### Get Batch Job Status

```http
GET /api/audio/batch/{job_id}
```

**Response:**
```json
{
  "job_id": "batch-uuid-string",
  "status": "processing",
  "progress": 0.75,
  "completed_files": ["/path/to/output1.flac"],
  "failed_files": [],
  "start_time": 1640995200.0,
  "end_time": null
}
```

### Audio Regions

#### Create Audio Region

```http
POST /api/audio/regions
Content-Type: multipart/form-data
```

**Parameters:**
- `track_id`: Track identifier
- `file_id`: Audio file identifier
- `start_time`: Start time in seconds
- `duration`: Duration in seconds (optional)
- `name`: Region name (optional)
- `gain`: Volume gain (default: 1.0)

#### Get Track Regions

```http
GET /api/audio/regions/track/{track_id}
```

**Response:** Array of AudioRegion objects

#### Delete Audio Region

```http
DELETE /api/audio/regions/{region_id}
```

### Format Information

#### Get Supported Formats

```http
GET /api/audio/formats
```

**Response:** Array of supported file extensions

#### Get Format Information

```http
GET /api/audio/formats/{format_name}
```

**Response:**
```json
{
  "name": "Waveform Audio File Format",
  "extension": ".wav",
  "compression": "None",
  "quality": "Lossless",
  "max_sample_rate": 192000,
  "max_bit_depth": 32,
  "supported_bit_depths": [16, 24, 32],
  "file_size_estimate": "Large"
}
```

## Usage Examples

### Basic File Upload and Analysis

```python
import httpx

# Upload file
with open("audio.wav", "rb") as f:
    response = httpx.post(
        "http://localhost:8000/api/audio/upload",
        files={"file": f},
        data={"extract_metadata": True}
    )

file_data = response.json()
file_id = file_data["file_id"]

# Analyze audio
analysis = httpx.get(f"http://localhost:8000/api/audio/files/{file_id}/analysis")
print(f"Loudness: {analysis.json()['loudness_lufs']} LUFS")
print(f"Tempo: {analysis.json()['tempo']} BPM")
print(f"Key: {analysis.json()['key']}")
```

### High-Quality Export

```python
export_settings = {
    "file_id": file_id,
    "output_path": "/path/to/export.wav",
    "settings": {
        "format": "wav",
        "sample_rate": 48000,
        "bit_depth": 24,
        "channels": 2,
        "normalize": True,
        "normalize_target": -6.0,
        "dither": "triangular",
        "fade_in": 0.1,
        "fade_out": 0.1
    }
}

response = httpx.post(
    "http://localhost:8000/api/audio/export",
    json=export_settings
)
```

### Batch Conversion

```python
batch_request = {
    "input_files": [
        "/path/to/song1.wav",
        "/path/to/song2.wav",
        "/path/to/song3.wav"
    ],
    "export_settings": {
        "format": "flac",
        "sample_rate": 48000,
        "bit_depth": 24,
        "channels": 2
    },
    "output_directory": "/path/to/flac_outputs"
}

# Create batch job
create_response = httpx.post(
    "http://localhost:8000/api/audio/batch/create",
    json=batch_request
)
job_id = create_response.json()["job_id"]

# Start processing
httpx.post(f"http://localhost:8000/api/audio/batch/{job_id}/process")

# Monitor progress
while True:
    status = httpx.get(f"http://localhost:8000/api/audio/batch/{job_id}")
    job_data = status.json()

    print(f"Progress: {job_data['progress']:.1%}")

    if job_data["status"] in ["completed", "failed"]:
        break

    time.sleep(1)
```

## Technical Implementation

### Architecture

The Audio File I/O system consists of several key components:

1. **AudioFileService**: Core service for audio processing
2. **Audio File Endpoints**: REST API layer
3. **Metadata Extraction**: Comprehensive tag reading
4. **Audio Analysis**: Signal processing and analysis
5. **Export Engine**: Multi-format audio export
6. **Batch Processor**: Background job processing

### Key Classes

#### AudioFileService

```python
class AudioFileService:
    def __init__(self, audio_files_dir: str = "audio_files")
    async def load_audio_file(self, file_path: Path, extract_metadata: bool = True)
    async def analyze_audio(self, file_id: str) -> AudioAnalysisResult
    async def export_audio(self, file_id: str, output_path: Path, settings: ExportSettings)
    async def generate_waveform(self, file_id: str, target_length: int = 1000)
    async def create_batch_processing_job(self, input_files: List[str], settings: ExportSettings)
```

#### ExportSettings

```python
@dataclass
class ExportSettings:
    format: AudioFormat
    sample_rate: int = 44100
    bit_depth: int = 16
    channels: int = 2
    quality: Optional[int] = None
    dither: DitherType = DitherType.NONE
    normalize: bool = False
    normalize_target: float = -1.0
    trim_silence: bool = False
    fade_in: float = 0.0
    fade_out: float = 0.0
```

#### AudioAnalysisResult

```python
@dataclass
class AudioAnalysisResult:
    duration: float
    sample_rate: int
    channels: int
    loudness_lufs: float
    loudness_peak: float
    rms_level: float
    dynamic_range: float
    zero_crossings: int
    spectral_centroid: float
    spectral_bandwidth: float
    spectral_rolloff: float
    tempo: Optional[float] = None
    key: Optional[str] = None
```

### Dependencies

- **librosa**: Audio analysis and processing
- **soundfile**: Audio file I/O
- **mutagen**: Metadata extraction
- **numpy**: Numerical processing
- **scipy**: Signal processing
- **fastapi**: Web framework
- **pydantic**: Data validation

### Performance Considerations

1. **Memory Management**: Large audio files are processed in chunks
2. **Caching**: Analysis results and waveforms are cached
3. **Async Processing**: I/O operations are fully asynchronous
4. **Background Tasks**: Batch processing runs in background threads
5. **Resource Cleanup**: Temporary files are automatically cleaned up

### Error Handling

The system includes comprehensive error handling:

- **File Validation**: Checks for supported formats and corruption
- **Memory Protection**: Limits on file sizes and processing resources
- **Graceful Degradation**: Failed metadata extraction doesn't stop file loading
- **Detailed Logging**: All operations are logged for debugging
- **User-Friendly Messages**: Clear error messages for API consumers

## Best Practices

### File Management

1. **Use Temporary Files**: Process large files in temporary locations
2. **Cleanup Resources**: Always call cleanup() when done
3. **Monitor Memory**: Watch memory usage with large files
4. **Validate Inputs**: Check file formats before processing

### Export Settings

1. **Choose Appropriate Formats**: Use lossless for archival, lossy for distribution
2. **Apply Dithering**: Always use dithering when reducing bit depth
3. **Normalize Carefully**: Avoid over-normalization which can degrade quality
4. **Consider Use Case**: Match settings to intended playback environment

### Batch Processing

1. **Limit Concurrent Jobs**: Don't overload system with too many simultaneous jobs
2. **Monitor Progress**: Check job status regularly
3. **Handle Failures**: Implement retry logic for failed conversions
4. **Plan Storage**: Ensure adequate disk space for outputs

### Performance Optimization

1. **Cache Results**: Store analysis results to avoid re-computation
2. **Use Appropriate Resolutions**: Generate waveforms at suitable resolutions
3. **Process in Background**: Use batch jobs for large operations
4. **Monitor Resources**: Track CPU and memory usage

## Troubleshooting

### Common Issues

1. **Unsupported Formats**: Check file format compatibility
2. **Memory Errors**: Reduce file size or increase system memory
3. **Export Failures**: Verify output directory permissions
4. **Slow Processing**: Check system resources and file sizes
5. **Metadata Issues**: Some files may have incomplete or corrupted tags

### Debug Logging

Enable debug logging to troubleshoot issues:

```python
import logging
logging.getLogger("src.audio_agent.core.audio_file_service").setLevel(logging.DEBUG)
```

### Performance Monitoring

Monitor system performance during intensive operations:

```bash
# Monitor memory usage
top -p $(pgrep -f "python.*main.py")

# Monitor disk I/O
iotop -p $(pgrep -f "python.*main.py")

# Check temporary file usage
du -sh /tmp/audio_files/
```

## Future Enhancements

Planned improvements include:

1. **Additional Formats**: Support for DSD, ALAC, and other formats
2. **Advanced Analysis**: Transcription, chord detection, and more
3. **Cloud Integration**: Direct cloud storage import/export
4. **Real-time Processing**: Live audio stream processing
5. **Audio Restoration**: Noise reduction and audio repair tools
6. **Machine Learning**: AI-powered audio enhancement and analysis

## API Versioning

The current API version is 1.0. Future versions will maintain backward compatibility where possible. Breaking changes will be announced in advance and versioned accordingly.

## Support

For issues, questions, or contributions:

- **Documentation**: Check this guide and API reference
- **Logging**: Enable debug logging for detailed error information
- **Issues**: Report bugs through the project issue tracker
- **Community**: Join discussions in the project forums