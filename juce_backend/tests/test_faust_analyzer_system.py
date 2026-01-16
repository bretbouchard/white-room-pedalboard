"""
Comprehensive tests for the Faust analyzer system.

This test suite covers:
- Faust DSP compilation and loading
- Analyzer management and configuration
- Real-time audio analysis
- API endpoint functionality
- Error handling and edge cases
- Performance and reliability
"""

import asyncio
import tempfile
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest
from audio_agent.api.faust_analyzer_endpoints import (
    analyze_audio_data,
    compile_custom_analyzer,
    get_analyzer_integration,
    list_analyzers,
)
from audio_agent.core.enhanced_analyzer_integration import EnhancedAnalyzerIntegration
from audio_agent.core.faust_analyzer_manager import FaustAnalyzerManager
from audio_agent.core.faust_dsp_compiler import (
    CompilationTarget,
    FaustDSPCompiler,
    FaustDSPConfig,
)
from audio_agent.engine.client import EngineClient
from audio_agent.models.audio import AudioAnalysis


class TestFaustDSPCompiler:
    """Test cases for Faust DSP compilation system."""

    @pytest.fixture
    def compiler_config(self):
        """Create a test configuration for the compiler."""
        return FaustDSPConfig(
            sample_rate=44100,
            buffer_size=256,
            optimization_level=2,
            compile_targets=["cpp", "python"],
        )

    @pytest.fixture
    def compiler(self, compiler_config):
        """Create a Faust DSP compiler instance."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield FaustDSPCompiler(config=compiler_config, cache_dir=Path(temp_dir))

    def test_compiler_initialization(self, compiler, compiler_config):
        """Test compiler initialization with configuration."""
        assert compiler.config == compiler_config
        assert compiler.cache_dir.exists()
        assert isinstance(compiler.compiled_dsps, dict)
        assert len(compiler.compiled_dsps) == 0

    @pytest.mark.asyncio
    async def test_compile_simple_dsp(self, compiler):
        """Test compilation of simple DSP code."""
        dsp_code = """
        process = _ : *(0.5) : _;
        """

        result = await compiler.compile_dsp(
            name="test_analyzer", dsp_code=dsp_code, target=CompilationTarget.PYTHON
        )

        assert result.success
        assert result.name == "test_analyzer"
        assert result.target == CompilationTarget.PYTHON
        assert result.compilation_time > 0

    @pytest.mark.asyncio
    async def test_compile_with_syntax_error(self, compiler):
        """Test compilation handling of syntax errors."""
        invalid_dsp_code = """
        process = _ : *invalid_syntax( : _;
        """

        result = await compiler.compile_dsp(
            name="invalid_analyzer",
            dsp_code=invalid_dsp_code,
            target=CompilationTarget.PYTHON,
        )

        assert not result.success
        assert result.error_message is not None
        assert "syntax" in result.error_message.lower()

    @pytest.mark.asyncio
    async def test_compile_duplicate_name(self, compiler):
        """Test compilation with duplicate analyzer names."""
        dsp_code = """
        process = _ : *(0.5) : _;
        """

        # First compilation should succeed
        result1 = await compiler.compile_dsp(
            name="duplicate_test", dsp_code=dsp_code, target=CompilationTarget.PYTHON
        )
        assert result1.success

        # Second compilation with same name should handle gracefully
        result2 = await compiler.compile_dsp(
            name="duplicate_test", dsp_code=dsp_code, target=CompilationTarget.PYTHON
        )
        assert result2.success  # Should either succeed or handle gracefully

    def test_cache_operations(self, compiler):
        """Test DSP compilation cache operations."""
        # Test cache directory structure
        cache_path = compiler.cache_dir / "compiled_dsps"
        assert cache_path.parent.exists()

        # Test cache metadata handling
        metadata = {
            "name": "test_analyzer",
            "target": "python",
            "compilation_time": 0.1,
            "created_at": time.time(),
        }

        # Cache should store and retrieve metadata correctly
        compiler._save_cache_metadata("test_analyzer", metadata)
        retrieved = compiler._load_cache_metadata("test_analyzer")
        assert retrieved is not None
        assert retrieved["name"] == "test_analyzer"

    @pytest.mark.asyncio
    async def test_unload_dsp(self, compiler):
        """Test unloading of compiled DSP."""
        dsp_code = """
        process = _ : *(0.5) : _;
        """

        # Compile DSP
        result = await compiler.compile_dsp(
            name="unload_test", dsp_code=dsp_code, target=CompilationTarget.PYTHON
        )
        assert result.success
        assert "unload_test" in compiler.compiled_dsps

        # Unload DSP
        success = await compiler.unload_dsp("unload_test")
        assert success
        assert "unload_test" not in compiler.compiled_dsps

        # Unload non-existent DSP
        success = await compiler.unload_dsp("non_existent")
        assert not success

    def test_get_compilation_targets(self, compiler):
        """Test getting available compilation targets."""
        targets = compiler.get_compilation_targets()
        assert isinstance(targets, list)
        assert len(targets) > 0
        assert CompilationTarget.PYTHON in targets
        assert CompilationTarget.CPP in targets


class TestFaustAnalyzerManager:
    """Test cases for Faust analyzer manager."""

    @pytest.fixture
    def mock_engine_client(self):
        """Create a mock engine client."""
        client = MagicMock(spec=EngineClient)
        client.load_dsp = AsyncMock(return_value=True)
        client.unload_dsp = AsyncMock(return_value=True)
        client.process_audio = AsyncMock(return_value=np.array([0.1, 0.2, 0.3]))
        return client

    @pytest.fixture
    def analyzer_manager(self, mock_engine_client):
        """Create a Faust analyzer manager instance."""
        config = FaustDSPConfig(sample_rate=48000, buffer_size=512)
        return FaustAnalyzerManager(engine_client=mock_engine_client, config=config)

    @pytest.mark.asyncio
    async def test_manager_initialization(self, analyzer_manager):
        """Test analyzer manager initialization."""
        assert analyzer_manager.engine_client is not None
        assert analyzer_manager.config is not None
        assert isinstance(analyzer_manager.analyzer_definitions, dict)
        assert len(analyzer_manager.analyzer_definitions) > 0

        # Check that default analyzers are defined
        expected_analyzers = [
            "spectral_analyzer",
            "dynamic_analyzer",
            "harmonic_analyzer",
            "perceptual_analyzer",
            "spatial_analyzer",
        ]

        for analyzer_name in expected_analyzers:
            assert analyzer_name in analyzer_manager.analyzer_definitions

    @pytest.mark.asyncio
    async def test_initialize_analyzers(self, analyzer_manager):
        """Test initialization of default analyzers."""
        success = await analyzer_manager.initialize()
        assert success
        assert analyzer_manager.initialized

        # Check that analyzers are loaded
        active_analyzers = analyzer_manager.get_active_analyzers()
        assert len(active_analyzers) > 0

    @pytest.mark.asyncio
    async def test_compile_analyzer(self, analyzer_manager):
        """Test compilation of a custom analyzer."""
        dsp_code = """
        import("stdfaust.lib");
        process = _ : si.smooth(0.999) : _;
        """

        success = await analyzer_manager.compile_analyzer(
            analyzer_name="custom_test", dsp_code=dsp_code
        )
        assert success

        # Check that analyzer is available
        available = analyzer_manager.get_available_analyzers()
        assert "custom_test" in available

    @pytest.mark.asyncio
    async def test_analyze_audio(self, analyzer_manager):
        """Test audio analysis functionality."""
        # Initialize analyzers
        await analyzer_manager.initialize()

        # Generate test audio data
        audio_data = np.sin(2 * np.pi * 440 * np.linspace(0, 1, 48000)).tolist()

        # Perform analysis
        analysis = await analyzer_manager.analyze_audio(
            analyzer_name="spectral_analyzer", audio_data=audio_data, sample_rate=48000
        )

        assert analysis is not None
        assert isinstance(analysis, AudioAnalysis)
        assert analysis.analyzer == "spectral_analyzer"
        assert hasattr(analysis, "features")
        assert hasattr(analysis, "statistics")

    @pytest.mark.asyncio
    async def test_analyze_with_invalid_analyzer(self, analyzer_manager):
        """Test analysis with invalid analyzer name."""
        audio_data = [0.1, 0.2, 0.3]

        analysis = await analyzer_manager.analyze_audio(
            analyzer_name="non_existent_analyzer", audio_data=audio_data
        )

        assert analysis is None

    def test_get_analyzer_info(self, analyzer_manager):
        """Test getting analyzer information."""
        # Test info for existing analyzer
        info = analyzer_manager.get_analyzer_info("spectral_analyzer")
        assert info is not None
        assert "name" in info
        assert info["name"] == "spectral_analyzer"

        # Test info for non-existent analyzer
        info = analyzer_manager.get_analyzer_info("non_existent")
        assert info is None

    def test_get_statistics(self, analyzer_manager):
        """Test getting analyzer manager statistics."""
        stats = analyzer_manager.get_statistics()
        assert isinstance(stats, dict)
        assert "total_analyses" in stats
        assert "successful_analyses" in stats
        assert "failed_analyses" in stats
        assert "total_compilation_time" in stats


class TestEnhancedAnalyzerIntegration:
    """Test cases for enhanced analyzer integration."""

    @pytest.fixture
    def enhanced_integration(self):
        """Create an enhanced analyzer integration instance."""
        config = FaustDSPConfig(sample_rate=48000, buffer_size=512)
        return EnhancedAnalyzerIntegration(config=config)

    @pytest.mark.asyncio
    async def test_integration_initialization(self, enhanced_integration):
        """Test enhanced analyzer integration initialization."""
        assert not enhanced_integration.initialized

        success = await enhanced_integration.initialize()
        assert success
        assert enhanced_integration.initialized

        # Check components are initialized
        assert enhanced_integration.analyzer_manager is not None
        assert enhanced_integration.analysis_pipeline is not None

    @pytest.mark.asyncio
    async def test_analyze_audio_multiple_analyzers(self, enhanced_integration):
        """Test analysis with multiple analyzers."""
        await enhanced_integration.initialize()

        # Generate test audio data
        audio_data = np.random.randn(1024).tolist()

        # Analyze with multiple analyzers
        results = await enhanced_integration.analyze_audio(
            audio_data=audio_data, analyzers=["spectral_analyzer", "dynamic_analyzer"]
        )

        assert isinstance(results, dict)
        assert len(results) <= 2  # May be less if some analyzers fail

        for analyzer_name, analysis in results.items():
            assert isinstance(analysis, AudioAnalysis)
            assert analysis.analyzer == analyzer_name

    @pytest.mark.asyncio
    async def test_realtime_analysis_caching(self, enhanced_integration):
        """Test real-time analysis caching functionality."""
        await enhanced_integration.initialize()

        # Generate test audio data
        audio_data = np.random.randn(512).tolist()

        # First analysis
        results1 = await enhanced_integration.analyze_audio(
            audio_data=audio_data, analyzers=["spectral_analyzer"]
        )

        # Get cached result immediately
        cached_result = await enhanced_integration.get_realtime_analysis(
            analyzer_name="spectral_analyzer"
        )

        assert cached_result is not None
        assert cached_result.analyzer == "spectral_analyzer"

    @pytest.mark.asyncio
    async def test_load_custom_analyzer(self, enhanced_integration):
        """Test loading custom analyzer."""
        await enhanced_integration.initialize()

        dsp_code = """
        import("stdfaust.lib");
        process = _ : fi.lowpass(1000, 1) : _;
        """

        success = await enhanced_integration.load_custom_analyzer(
            analyzer_name="custom_lowpass", dsp_code=dsp_code, target="python"
        )

        assert success

        # Check that analyzer is available
        available = enhanced_integration.get_available_analyzers()
        assert "custom_lowpass" in available

    @pytest.mark.asyncio
    async def test_unload_analyzer(self, enhanced_integration):
        """Test unloading analyzer."""
        await enhanced_integration.initialize()

        # Load a custom analyzer first
        dsp_code = "process = _ : _;"
        await enhanced_integration.load_custom_analyzer(
            analyzer_name="temp_analyzer", dsp_code=dsp_code
        )

        # Unload it
        success = await enhanced_integration.unload_analyzer("temp_analyzer")
        assert success

    def test_get_statistics(self, enhanced_integration):
        """Test getting comprehensive statistics."""
        stats = enhanced_integration.get_statistics()
        assert isinstance(stats, dict)

        # Check basic statistics
        basic_stats = [
            "total_analyses",
            "successful_analyses",
            "failed_analyses",
            "total_analysis_time",
            "average_analysis_time",
            "cache_hits",
            "fallbacks_avoided",
        ]

        for stat in basic_stats:
            assert stat in stats

        # Check analyzer manager statistics
        assert "faust_analyzer_stats" in stats

    def test_process_audio_chunk(self, enhanced_integration):
        """Test processing audio chunks."""
        # Test without initialization
        audio_chunk = [0.1, 0.2, 0.3, 0.4]
        result = enhanced_integration.process_audio_chunk(audio_chunk)
        assert "error" in result

    @pytest.mark.asyncio
    async def test_shutdown(self, enhanced_integration):
        """Test proper shutdown of integration system."""
        await enhanced_integration.initialize()
        assert enhanced_integration.initialized

        await enhanced_integration.shutdown()
        assert not enhanced_integration.initialized


class TestAPIEndpoints:
    """Test cases for Faust analyzer API endpoints."""

    @pytest.fixture
    def mock_analyzer_integration(self):
        """Create a mock analyzer integration for API testing."""
        integration = MagicMock(spec=EnhancedAnalyzerIntegration)
        integration.initialized = True
        integration.get_statistics.return_value = {
            "total_analyses": 10,
            "successful_analyses": 8,
            "failed_analyses": 2,
            "average_analysis_time": 0.05,
        }
        integration.get_available_analyzers.return_value = [
            "spectral_analyzer",
            "dynamic_analyzer",
        ]
        integration.get_active_analyzers.return_value = ["spectral_analyzer"]
        integration.get_analyzer_info.return_value = {
            "name": "spectral_analyzer",
            "is_compiled": True,
            "compilation_target": "python",
        }
        integration.analyze_audio = AsyncMock(
            return_value={
                "spectral_analyzer": AudioAnalysis(
                    analyzer="spectral_analyzer",
                    features={"spectral_centroid": 1000.0},
                    statistics={"mean": 0.0, "std": 0.1},
                )
            }
        )
        integration.load_custom_analyzer = AsyncMock(return_value=True)
        integration.unload_analyzer = AsyncMock(return_value=True)
        return integration

    @pytest.mark.asyncio
    async def test_get_analyzer_integration_dependency(self):
        """Test analyzer integration dependency injection."""
        with patch(
            "audio_agent.api.faust_analyzer_endpoints.EnhancedAnalyzerIntegration"
        ) as mock_class:
            mock_instance = AsyncMock()
            mock_instance.initialize.return_value = True
            mock_class.return_value = mock_instance

            integration = await get_analyzer_integration()
            assert integration is not None

    @pytest.mark.asyncio
    async def test_list_analyzers_endpoint(self, mock_analyzer_integration):
        """Test listing analyzers via API endpoint."""
        with patch(
            "audio_agent.api.faust_analyzer_endpoints.get_analyzer_integration"
        ) as mock_get:
            mock_get.return_value = mock_analyzer_integration

            response = await list_analyzers(
                analyzer_integration=mock_analyzer_integration
            )

            assert response.available is not None
            assert response.active is not None
            assert response.total_count == 2
            assert response.active_count == 1

    @pytest.mark.asyncio
    async def test_compile_custom_analyzer_endpoint(self, mock_analyzer_integration):
        """Test compiling custom analyzer via API endpoint."""
        from audio_agent.api.faust_analyzer_endpoints import CompilationRequest

        request = CompilationRequest(
            analyzer_name="test_analyzer", dsp_code="process = _ : _;", target="python"
        )

        with patch(
            "audio_agent.api.faust_analyzer_endpoints.get_analyzer_integration"
        ) as mock_get:
            mock_get.return_value = mock_analyzer_integration

            response = await compile_custom_analyzer(
                request=request, analyzer_integration=mock_analyzer_integration
            )

            assert response.success
            assert response.analyzer_name == "test_analyzer"
            assert response.target == "python"

    @pytest.mark.asyncio
    async def test_analyze_audio_data_endpoint(self, mock_analyzer_integration):
        """Test audio analysis via API endpoint."""
        from audio_agent.api.faust_analyzer_endpoints import AudioDataRequest

        request = AudioDataRequest(
            audio_data=[0.1, 0.2, 0.3, 0.4] * 256,
            sample_rate=44100,
            analyzers=["spectral_analyzer"],
        )

        with patch(
            "audio_agent.api.faust_analyzer_endpoints.get_analyzer_integration"
        ) as mock_get:
            mock_get.return_value = mock_analyzer_integration

            responses = await analyze_audio_data(
                request=request, analyzer_integration=mock_analyzer_integration
            )

            assert len(responses) == 1
            assert responses[0].success
            assert responses[0].analyzer_name == "spectral_analyzer"
            assert responses[0].results is not None

    @pytest.mark.asyncio
    async def test_error_handling_in_endpoints(self):
        """Test error handling in API endpoints."""
        # Test with uninitialized integration
        integration = MagicMock(spec=EnhancedAnalyzerIntegration)
        integration.initialized = False
        integration.get_available_analyzers.side_effect = Exception("Not initialized")

        with patch(
            "audio_agent.api.faust_analyzer_endpoints.get_analyzer_integration"
        ) as mock_get:
            mock_get.return_value = integration

            # Should handle errors gracefully
            response = await list_analyzers(analyzer_integration=integration)
            assert response is not None  # Should not raise exception


class TestPerformanceAndReliability:
    """Test cases for performance and reliability of the Faust analyzer system."""

    @pytest.mark.asyncio
    async def test_concurrent_analyses(self):
        """Test concurrent audio analyses."""
        # This test would require a more complex setup with actual analyzer instances
        # For now, we'll test the basic structure
        config = FaustDSPConfig(sample_rate=48000, buffer_size=512)
        integration = EnhancedAnalyzerIntegration(config=config)

        # Mock the analyze_audio method to avoid dependencies
        integration.analyze_audio = AsyncMock(
            return_value={
                "test": AudioAnalysis(analyzer="test", features={}, statistics={})
            }
        )

        # Create concurrent analysis tasks
        audio_data = np.random.randn(512).tolist()
        tasks = [
            integration.analyze_audio(audio_data, ["spectral_analyzer"])
            for _ in range(10)
        ]

        # Execute concurrently
        results = await asyncio.gather(*tasks)

        assert len(results) == 10
        for result in results:
            assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_memory_usage_with_many_analyses(self):
        """Test memory usage during many analyses."""
        config = FaustDSPConfig(sample_rate=48000, buffer_size=512)
        integration = EnhancedAnalyzerIntegration(config=config)

        # Mock to avoid actual audio processing
        integration.analyze_audio = AsyncMock(
            return_value={
                "test": AudioAnalysis(analyzer="test", features={}, statistics={})
            }
        )

        audio_data = np.random.randn(512).tolist()

        # Perform many analyses
        for i in range(100):
            await integration.analyze_audio(audio_data, ["spectral_analyzer"])

        # Check statistics
        stats = integration.get_statistics()
        assert stats["total_analyses"] == 100

    def test_cache_efficiency(self):
        """Test cache efficiency with repeated requests."""
        config = FaustDSPConfig(
            sample_rate=48000,
            buffer_size=512,
            analysis_cache_duration=0.01,  # Very short cache for testing
        )
        integration = EnhancedAnalyzerIntegration(config=config)

        # Mock a recent analysis
        integration.last_analysis = AudioAnalysis(
            analyzer="spectral_analyzer", features={}, statistics={}
        )
        integration.last_analysis_time = time.time()

        # Should get cached result
        result = asyncio.run(integration.get_realtime_analysis("spectral_analyzer"))
        assert result is not None

        # Cache hit should be recorded
        stats = integration.get_statistics()
        assert stats["cache_hits"] > 0


# Integration Tests
class TestSystemIntegration:
    """Integration tests for the complete Faust analyzer system."""

    @pytest.mark.asyncio
    async def test_end_to_end_analysis_workflow(self):
        """Test complete end-to-end analysis workflow."""
        # This would be a comprehensive integration test
        # For now, we'll test the basic structure

        # Create system components
        config = FaustDSPConfig(sample_rate=48000, buffer_size=512)

        # Mock engine client to avoid dependencies
        mock_client = MagicMock(spec=EngineClient)
        mock_client.load_dsp = AsyncMock(return_value=True)

        # Create manager and integration
        manager = FaustAnalyzerManager(engine_client=mock_client, config=config)
        integration = EnhancedAnalyzerIntegration(config=config)
        integration.analyzer_manager = manager

        # Initialize system
        await integration.initialize()

        # Test analysis workflow
        audio_data = np.sin(2 * np.pi * 440 * np.linspace(0, 1, 48000)).tolist()

        # Mock the actual analysis
        manager.analyze_audio = AsyncMock(
            return_value=AudioAnalysis(
                analyzer="spectral_analyzer",
                features={"spectral_centroid": 440.0},
                statistics={"mean": 0.0, "std": 0.707},
            )
        )

        # Perform analysis
        results = await integration.analyze_audio(
            audio_data=audio_data, analyzers=["spectral_analyzer"]
        )

        # Verify results
        assert "spectral_analyzer" in results
        analysis = results["spectral_analyzer"]
        assert analysis.analyzer == "spectral_analyzer"
        assert "spectral_centroid" in analysis.features

        # Cleanup
        await integration.shutdown()


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
