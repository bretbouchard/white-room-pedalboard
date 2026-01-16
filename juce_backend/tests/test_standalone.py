"""
Standalone test for the Analysis Pipeline implementation.

This script tests the basic functionality of the AnalysisPipeline class
without relying on the existing codebase.
"""

import hashlib
import json
import os
import threading
import time

import numpy as np
from pydantic import BaseModel, ConfigDict, Field


class AnalysisMetrics(BaseModel):
    """Performance metrics for analysis pipeline."""

    model_config = ConfigDict(strict=True, validate_assignment=True)

    processing_time_ms: float = Field(
        default=0.0, description="Processing time in milliseconds"
    )
    cpu_usage_percent: float = Field(default=0.0, description="CPU usage percentage")
    memory_usage_mb: float = Field(default=0.0, description="Memory usage in megabytes")
    buffer_size: int = Field(default=0, description="Audio buffer size in samples")
    sample_rate: int = Field(default=0, description="Audio sample rate in Hz")
    latency_ms: float = Field(
        default=0.0, description="End-to-end latency in milliseconds"
    )
    cache_hit_rate: float = Field(default=0.0, description="Cache hit rate (0-1)")
    timestamp: float = Field(default=0.0, description="Timestamp of metrics collection")


class AudioFeatures(BaseModel):
    """Basic audio features."""

    model_config = ConfigDict(strict=True, validate_assignment=True)

    spectral_centroid: float = Field(default=0.0)
    spectral_rolloff: float = Field(default=0.0)
    spectral_flux: float = Field(default=0.0)
    dynamic_range: float = Field(default=0.0)
    rms_level: float = Field(default=0.0)
    peak_level: float = Field(default=0.0)


class EnhancedAudioFeatures(AudioFeatures):
    """Enhanced audio features with additional analysis."""

    model_config = ConfigDict(strict=True, validate_assignment=True)

    tempo: float | None = Field(default=None)
    key: str | None = Field(default=None)
    stereo_width: float = Field(default=0.0)
    phase_correlation: float = Field(default=0.0)


class EnhancedAudioAnalysis(BaseModel):
    """Enhanced audio analysis results."""

    model_config = ConfigDict(strict=True, validate_assignment=True)

    timestamp: float = Field(default_factory=time.time)
    sample_rate: int
    duration: float
    channels: int = Field(default=1)
    format: str = Field(default="wav")
    features: EnhancedAudioFeatures = Field(default_factory=EnhancedAudioFeatures)
    enhanced_suggested_actions: list[str] = Field(default_factory=list)


class AnalysisCacheEntry(BaseModel):
    """Cache entry for analysis results."""

    model_config = ConfigDict(strict=True, validate_assignment=True)

    analysis: EnhancedAudioAnalysis
    timestamp: float
    audio_hash: str
    metrics: AnalysisMetrics | None = None


class MockAnalyzer:
    """Mock analyzer for testing."""

    def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024):
        """Initialize the mock analyzer."""
        self.sample_rate = sample_rate
        self.buffer_size = buffer_size
        self.initialized = True

    def analyze_audio(self, audio_data: np.ndarray) -> EnhancedAudioAnalysis:
        """
        Analyze audio data and return mock results.

        Args:
            audio_data: Audio data as numpy array

        Returns:
            Mock analysis results
        """
        # Calculate basic features
        spectral_centroid = np.random.uniform(2000, 8000)
        spectral_rolloff = np.random.uniform(5000, 15000)
        spectral_flux = np.random.uniform(0.0, 1.0)

        rms_level = np.sqrt(np.mean(audio_data**2))
        peak_level = np.max(np.abs(audio_data))
        dynamic_range = 20 * np.log10(peak_level / max(rms_level, 1e-10))

        # Create features
        features = EnhancedAudioFeatures(
            spectral_centroid=spectral_centroid,
            spectral_rolloff=spectral_rolloff,
            spectral_flux=spectral_flux,
            dynamic_range=dynamic_range,
            rms_level=float(rms_level),
            peak_level=float(peak_level),
            tempo=np.random.uniform(80, 160),
            key=np.random.choice(
                ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab"]
            ),
            stereo_width=np.random.uniform(0.0, 1.0),
            phase_correlation=np.random.uniform(-1.0, 1.0),
        )

        # Create analysis
        analysis = EnhancedAudioAnalysis(
            timestamp=time.time(),
            sample_rate=self.sample_rate,
            duration=len(audio_data) / self.sample_rate,
            channels=audio_data.shape[1] if len(audio_data.shape) > 1 else 1,
            format="wav",
            features=features,
        )

        return analysis

    def reset(self) -> None:
        """Reset the analyzer."""
        pass


class AnalysisPipeline:
    """
    Real-Time Analysis Pipeline for audio processing.

    This class processes audio and formats the results for LangGraph agent consumption.
    It includes caching to avoid redundant processing and performance monitoring
    for real-time constraints.
    """

    def __init__(self, sample_rate: int = 44100, buffer_size: int = 1024):
        """
        Initialize the analysis pipeline.

        Args:
            sample_rate: Audio sample rate in Hz
            buffer_size: Processing buffer size in samples
        """
        self.sample_rate = sample_rate
        self.buffer_size = buffer_size

        # Create mock analyzer
        self.analyzer = MockAnalyzer(sample_rate, buffer_size)

        # Initialize cache
        self.cache = {}
        self.cache_size_limit = 100  # Maximum number of entries
        self.cache_ttl = 5.0  # Time-to-live in seconds
        self.cache_hits = 0
        self.cache_misses = 0

        # Performance monitoring
        self.metrics_history = []
        self.metrics_history_limit = 100  # Maximum number of metrics entries

        # Thread safety
        self.lock = threading.RLock()

        # Initialization state
        self.initialized = False

        # LangGraph formatting options
        self.format_for_langgraph = True

        print("Analysis pipeline initialized")

    def initialize(self) -> None:
        """Initialize the analysis pipeline and its components."""
        with self.lock:
            if self.initialized:
                return

            # Initialize analyzer
            self.analyzer.reset()

            self.initialized = True
            print("Analysis pipeline components initialized")

    def process(
        self, audio_data: np.ndarray, skip_cache: bool = False
    ) -> EnhancedAudioAnalysis:
        """
        Process audio data through the analysis pipeline.

        Args:
            audio_data: Audio data as numpy array
            skip_cache: Whether to skip the cache and force reanalysis

        Returns:
            Enhanced audio analysis results
        """
        with self.lock:
            if not self.initialized:
                self.initialize()

            # Start timing
            start_time = time.time()

            # Check cache if not skipping
            if not skip_cache:
                cached_result = self._check_cache(audio_data)
                if cached_result:
                    self.cache_hits += 1
                    return cached_result

            self.cache_misses += 1

            # Process with analyzer
            analysis = self.analyzer.analyze_audio(audio_data)

            # Format for LangGraph if needed
            if self.format_for_langgraph:
                analysis = self._format_for_langgraph(analysis)

            # Calculate performance metrics
            end_time = time.time()
            processing_time = end_time - start_time

            metrics = AnalysisMetrics(
                processing_time_ms=processing_time * 1000,
                cpu_usage_percent=self._get_cpu_usage(),
                memory_usage_mb=self._get_memory_usage(),
                buffer_size=self.buffer_size,
                sample_rate=self.sample_rate,
                latency_ms=processing_time * 1000,
                cache_hit_rate=self._get_cache_hit_rate(),
                timestamp=end_time,
            )

            # Update metrics history
            self._update_metrics_history(metrics)

            # Cache the result
            self._cache_result(audio_data, analysis, metrics)

            return analysis

    def _check_cache(self, audio_data: np.ndarray) -> EnhancedAudioAnalysis | None:
        """
        Check if analysis for this audio data is in the cache.

        Args:
            audio_data: Audio data to check

        Returns:
            Cached analysis if found, None otherwise
        """
        # Calculate hash of audio data
        audio_hash = self._hash_audio(audio_data)

        # Check if in cache
        if audio_hash in self.cache:
            entry = self.cache[audio_hash]

            # Check if entry is still valid (not expired)
            current_time = time.time()
            if current_time - entry.timestamp <= self.cache_ttl:
                return entry.analysis

            # Entry expired, remove from cache
            del self.cache[audio_hash]

        return None

    def _cache_result(
        self,
        audio_data: np.ndarray,
        analysis: EnhancedAudioAnalysis,
        metrics: AnalysisMetrics,
    ) -> None:
        """
        Cache analysis result for future use.

        Args:
            audio_data: Audio data that was analyzed
            analysis: Analysis results
            metrics: Performance metrics
        """
        # Calculate hash of audio data
        audio_hash = self._hash_audio(audio_data)

        # Create cache entry
        entry = AnalysisCacheEntry(
            analysis=analysis,
            timestamp=time.time(),
            audio_hash=audio_hash,
            metrics=metrics,
        )

        # Add to cache
        self.cache[audio_hash] = entry

        # Enforce cache size limit
        if len(self.cache) > self.cache_size_limit:
            # Remove oldest entry
            oldest_hash = min(self.cache.keys(), key=lambda k: self.cache[k].timestamp)
            del self.cache[oldest_hash]

    def _hash_audio(self, audio_data: np.ndarray) -> str:
        """
        Calculate hash of audio data for cache lookup.

        Args:
            audio_data: Audio data to hash

        Returns:
            Hash string
        """
        # Use a subset of the audio data for faster hashing
        # Take every 10th sample or first 1000 samples, whichever is smaller
        if len(audio_data) > 1000:
            subset = audio_data[::10][:1000]
        else:
            subset = audio_data

        # Calculate MD5 hash
        hasher = hashlib.md5()
        hasher.update(subset.tobytes())
        return hasher.hexdigest()

    def _format_for_langgraph(
        self, analysis: EnhancedAudioAnalysis
    ) -> EnhancedAudioAnalysis:
        """
        Format analysis results for LangGraph agent consumption.

        Args:
            analysis: Raw analysis results

        Returns:
            Formatted analysis results
        """
        # Add suggested actions based on analysis
        suggested_actions = self._generate_suggested_actions(analysis)

        # Create a copy with enhanced suggested actions
        enhanced_analysis = analysis.model_copy(deep=True)
        enhanced_analysis.enhanced_suggested_actions = suggested_actions

        return enhanced_analysis

    def _generate_suggested_actions(self, analysis: EnhancedAudioAnalysis) -> list[str]:
        """
        Generate suggested mixing actions based on analysis.

        Args:
            analysis: Analysis results

        Returns:
            List of suggested actions
        """
        actions = []
        features = analysis.features

        # Check spectral centroid
        if features.spectral_centroid > 8000:
            actions.append("Apply low-shelf EQ to add warmth")
        elif features.spectral_centroid < 2000:
            actions.append("Apply high-shelf EQ to add brightness")

        # Check dynamic range
        if features.dynamic_range < 6:
            actions.append("Reduce compression to increase dynamic range")
        elif features.dynamic_range > 20:
            actions.append("Apply gentle compression to control dynamics")

        # Check stereo width
        if features.stereo_width < 0.3:
            actions.append("Enhance stereo width with spatial processing")

        # Check phase correlation
        if features.phase_correlation < 0:
            actions.append("Check for phase issues between channels")

        # Check key
        if features.key:
            actions.append(f"Current key is {features.key}")

        # Check tempo
        if features.tempo:
            actions.append(f"Tempo is approximately {features.tempo:.1f} BPM")

        return actions

    def _get_cpu_usage(self) -> float:
        """
        Get current CPU usage for the analysis process.

        Returns:
            CPU usage percentage
        """
        try:
            import psutil

            return psutil.Process().cpu_percent()
        except ImportError:
            return np.random.uniform(5, 20)  # Mock CPU usage

    def _get_memory_usage(self) -> float:
        """
        Get current memory usage for the analysis process.

        Returns:
            Memory usage in megabytes
        """
        try:
            import psutil

            return psutil.Process().memory_info().rss / (1024 * 1024)
        except ImportError:
            return np.random.uniform(50, 200)  # Mock memory usage

    def _get_cache_hit_rate(self) -> float:
        """
        Calculate cache hit rate.

        Returns:
            Cache hit rate (0-1)
        """
        total = self.cache_hits + self.cache_misses
        if total > 0:
            return self.cache_hits / total
        return 0.0

    def _update_metrics_history(self, metrics: AnalysisMetrics) -> None:
        """
        Update metrics history with new metrics.

        Args:
            metrics: New metrics to add
        """
        self.metrics_history.append(metrics)

        # Enforce history size limit
        if len(self.metrics_history) > self.metrics_history_limit:
            self.metrics_history.pop(0)

    def get_metrics(self) -> list[AnalysisMetrics]:
        """
        Get performance metrics history.

        Returns:
            List of performance metrics
        """
        with self.lock:
            return self.metrics_history.copy()

    def get_latest_metrics(self) -> AnalysisMetrics | None:
        """
        Get the most recent performance metrics.

        Returns:
            Latest metrics or None if no metrics available
        """
        with self.lock:
            if self.metrics_history:
                return self.metrics_history[-1]
            return None

    def clear_cache(self) -> None:
        """Clear the analysis cache."""
        with self.lock:
            self.cache = {}
            self.cache_hits = 0
            self.cache_misses = 0
            print("Analysis cache cleared")

    def set_cache_parameters(
        self, size_limit: int | None = None, ttl: float | None = None
    ) -> None:
        """
        Set cache parameters.

        Args:
            size_limit: Maximum number of entries in cache
            ttl: Time-to-live in seconds
        """
        with self.lock:
            if size_limit is not None:
                self.cache_size_limit = max(1, size_limit)

            if ttl is not None:
                self.cache_ttl = max(0.1, ttl)

            print(
                f"Cache parameters updated: size_limit={self.cache_size_limit}, ttl={self.cache_ttl}"
            )

    def export_analysis_to_json(
        self, analysis: EnhancedAudioAnalysis, file_path: str
    ) -> bool:
        """
        Export analysis results to a JSON file.

        Args:
            analysis: Analysis results to export
            file_path: Path to save JSON file

        Returns:
            True if successful, False otherwise
        """
        try:
            # Convert to dict
            analysis_dict = analysis.model_dump()

            # Save to file
            with open(file_path, "w") as f:
                json.dump(analysis_dict, f, indent=2)

            print(f"Analysis exported to {file_path}")
            return True

        except Exception as e:
            print(f"Error exporting analysis to JSON: {e}")
            return False

    def reset(self) -> None:
        """Reset the analysis pipeline."""
        with self.lock:
            # Clear cache
            self.clear_cache()

            # Reset analyzer
            self.analyzer.reset()

            # Reset metrics
            self.metrics_history = []

            print("Analysis pipeline reset")


def main():
    """Run simple tests for the analysis pipeline."""
    print("Testing Analysis Pipeline...")

    # Create test audio (sine wave at A4 = 440Hz)
    sample_rate = 44100
    buffer_size = 1024
    duration = 1.0  # seconds
    t = np.linspace(0, duration, int(duration * sample_rate), False)
    test_audio = np.sin(2 * np.pi * 440 * t).astype(np.float32)

    # Make it stereo
    test_audio = np.column_stack([test_audio, test_audio])

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
        print(f"Spectral centroid: {analysis.features.spectral_centroid:.2f} Hz")
        print(f"Dynamic range: {analysis.features.dynamic_range:.2f} dB")

        if analysis.features.key:
            print(f"Detected key: {analysis.features.key}")

        if analysis.features.tempo:
            print(f"Detected tempo: {analysis.features.tempo:.1f} BPM")

        # Check suggested actions
        if analysis.enhanced_suggested_actions:
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
        analysis1 = pipeline.process(test_audio)
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

    # Test JSON export
    print("\nTesting JSON export...")
    try:
        success = pipeline.export_analysis_to_json(analysis1, "analysis_export.json")
        if success:
            print("JSON export successful!")

            # Read the file back
            with open("analysis_export.json") as f:
                data = json.load(f)
                print(f"Exported JSON contains {len(data)} keys")

            # Clean up
            os.remove("analysis_export.json")
        else:
            print("JSON export failed.")
    except Exception as e:
        print(f"Error during JSON export testing: {e}")

    print("\nTests completed!")


if __name__ == "__main__":
    main()
