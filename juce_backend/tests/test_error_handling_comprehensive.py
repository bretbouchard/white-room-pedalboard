"""
Comprehensive tests for error handling system.
"""

# pylint: disable=too-many-lines,unused-import,line-too-long,import-outside-toplevel,missing-module-docstring
import asyncio
import time
from unittest.mock import AsyncMock, patch

import numpy as np
import pytest
import requests
import requests.exceptions

# sys.path modification removed. Repository-level pytest conftest handles imports.
from src.audio_agent.core.dawdreamer_error_handling import (
    DawDreamerErrorHandler,
    PluginCrashIsolation,
    dawdreamer_error_handler,
    safe_engine_operation,
    safe_plugin_operation,
)
from src.audio_agent.core.error_handling import (
    AudioAgentError,
    ComponentType,
    DawDreamerError,
    ErrorContext,
    ErrorHandler,
    ErrorSeverity,
    FaustAnalyzerError,
    LangGraphAgentError,
    error_handler,
)
from src.audio_agent.core.faust_error_handling import (
    FaustAnalyzerErrorHandler,
    faust_error_handler,
)
from src.audio_agent.core.langgraph_error_handling import (
    AgentTimeoutHandler,
    LangGraphErrorHandler,
    RecommendationCache,
    langgraph_error_handler,
    safe_agent_operation,
)


class TestErrorHandler:
    """Test the main error handler."""

    def test_error_handler_initialization(self):
        """Test error handler initializes correctly."""
        handler = ErrorHandler()

        assert len(handler.component_health) == len(ComponentType)
        assert all(handler.component_health.values())  # All should start healthy
        assert len(handler.fallback_strategies) == len(ComponentType)

    def test_error_context_creation(self):
        """Test error context creation."""
        context = ErrorContext(
            component=ComponentType.FAUST_ANALYZER,
            operation="analyze_spectral",
            timestamp=time.time(),
            user_id="test_user",
            session_id="test_session",
            audio_context={"sample_rate": 44100},
        )

        assert context.component == ComponentType.FAUST_ANALYZER
        assert context.operation == "analyze_spectral"
        assert context.user_id == "test_user"
        assert context.session_id == "test_session"
        assert context.audio_context["sample_rate"] == 44100

    def test_audio_agent_error_creation(self):
        """Test AudioAgentError creation."""
        error = AudioAgentError(
            message="Test error",
            severity=ErrorSeverity.HIGH,
            component=ComponentType.DAWDREAMER_ENGINE,
        )

        assert str(error) == "Test error"
        assert error.severity == ErrorSeverity.HIGH
        assert error.component == ComponentType.DAWDREAMER_ENGINE
        assert error.timestamp > 0

    def test_specialized_error_creation(self):
        """Test specialized error types."""
        faust_error = FaustAnalyzerError("Faust failed", "spectral_analyzer")
        assert faust_error.analyzer_name == "spectral_analyzer"
        assert faust_error.component == ComponentType.FAUST_ANALYZER

        dd_error = DawDreamerError("DawDreamer failed")
        assert dd_error.component == ComponentType.DAWDREAMER_ENGINE

        lg_error = LangGraphAgentError("Agent failed", "eq_agent")
        assert lg_error.agent_type == "eq_agent"
        assert lg_error.component == ComponentType.LANGGRAPH_AGENT

    @patch("src.audio_agent.core.error_handling.logging")
    def test_error_handling_context_manager(self, mock_logging):
        """Test error handling context manager."""
        handler = ErrorHandler()
        context = ErrorContext(
            component=ComponentType.FAUST_ANALYZER,
            operation="test_operation",
            timestamp=time.time(),
        )

        # Test successful operation
        with handler.handle_errors(context):
            pass  # No error

        # Test error handling - expect a ValueError to propagate
        with pytest.raises(ValueError):
            with handler.handle_errors(context):
                raise ValueError("Test error")

    def test_system_health_reporting(self):
        """Test system health reporting."""
        handler = ErrorHandler()

        # Initially all healthy
        health = handler.get_system_health()
        assert health["overall_health"] is True
        assert health["recent_errors"] == 0

        # Simulate component failure
        handler.component_health[ComponentType.FAUST_ANALYZER] = False

        health = handler.get_system_health()
        assert health["overall_health"] is False
        assert not health["component_health"]["faust_analyzer"]


class TestFaustAnalyzerErrorHandler:
    """Test Faust analyzer error handling."""

    def test_faust_error_handler_initialization(self):
        """Test Faust error handler initializes correctly."""
        handler = FaustAnalyzerErrorHandler()

        assert isinstance(handler.analyzer_health, dict)
        assert isinstance(handler.fallback_active, dict)
        assert isinstance(handler.error_counts, dict)

    def test_analyzer_error_context_manager(self):
        """Test analyzer error context manager."""
        handler = FaustAnalyzerErrorHandler()
        audio_data = np.random.random(4096).astype(np.float32)

        # Test successful operation
        with handler.handle_analyzer_errors("spectral", audio_data):
            pass  # No error

        assert handler.analyzer_health.get("spectral", False) is True
        assert handler.error_counts.get("spectral", 0) == 0

    def test_python_fallback_analysis(self):
        """Test Python fallback analysis methods."""
        handler = FaustAnalyzerErrorHandler()
        audio_data = np.random.random(4096).astype(np.float32)
        sample_rate = 44100

        # Test spectral analysis fallback
        result = handler._python_spectral_analysis(audio_data, sample_rate)
        assert "centroid" in result
        assert "rolloff" in result
        assert "analysis_method" in result

        # Test dynamic analysis fallback
        result = handler._python_dynamic_analysis(audio_data, sample_rate)
        assert "rms_level" in result
        assert "peak_level" in result
        assert "dynamic_range" in result

    def test_minimal_analysis_fallback(self):
        """Test minimal analysis fallback when librosa unavailable."""
        handler = FaustAnalyzerErrorHandler()
        audio_data = np.random.random(4096).astype(np.float32)

        result = handler._get_minimal_analysis("spectral", audio_data, 44100)
        assert "rms_level" in result
        assert "peak_level" in result
        assert "centroid" in result
        assert result["analysis_method"] == "minimal_fallback"

    def test_analyzer_status_reporting(self):
        """Test analyzer status reporting."""
        handler = FaustAnalyzerErrorHandler()

        # Simulate some analyzer states
        handler.analyzer_health["spectral"] = True
        handler.analyzer_health["dynamic"] = False
        handler.fallback_active["dynamic"] = True
        handler.error_counts["dynamic"] = 2

        status = handler.get_analyzer_status()
        assert status["total_analyzers"] == 2
        assert status["healthy_analyzers"] == 1
        assert status["fallback_analyzers"] == 1
        assert status["error_counts"]["dynamic"] == 2


class TestDawDreamerErrorHandler:
    """Test DawDreamer error handling."""

    def test_plugin_crash_isolation(self):
        """Test plugin crash isolation."""
        isolation = PluginCrashIsolation()

        # Test plugin crash recording
        isolation.record_plugin_crash("TestPlugin")
        assert isolation.crashed_plugins["TestPlugin"] == 1
        assert not isolation.is_plugin_blacklisted("TestPlugin")

        # Test blacklisting after max crashes
        for _ in range(isolation.max_crashes_per_plugin):
            isolation.record_plugin_crash("TestPlugin")

        assert isolation.is_plugin_blacklisted("TestPlugin")

    def test_safe_plugin_list(self):
        """Test safe plugin list generation."""
        isolation = PluginCrashIsolation()
        available_plugins = ["Plugin1", "Plugin2", "Plugin3"]

        # Initially all safe
        safe_plugins = isolation.get_safe_plugins(available_plugins)
        assert len(safe_plugins) == 3

        # Blacklist one plugin
        isolation.plugin_blacklist.add("Plugin2")
        safe_plugins = isolation.get_safe_plugins(available_plugins)
        assert len(safe_plugins) == 2
        assert "Plugin2" not in safe_plugins

    def test_dawdreamer_error_handler_initialization(self):
        """Test DawDreamer error handler initialization."""
        handler = DawDreamerErrorHandler()

        assert handler.engine_health is True
        assert isinstance(handler.plugin_isolation, PluginCrashIsolation)
        assert handler.recovery_attempts == 0

    def test_engine_error_context_manager(self):
        """Test engine error context manager."""
        handler = DawDreamerErrorHandler()

        # Test successful operation
        with handler.handle_engine_errors("render"):
            pass  # No error

        assert handler.engine_health is True
        assert handler.recovery_attempts == 0

    def test_safe_processing_chain_creation(self):
        """Test safe processing chain creation."""
        handler = DawDreamerErrorHandler()

        # Blacklist a plugin
        handler.plugin_isolation.plugin_blacklist.add("BadPlugin")

        desired_chain = [
            {"plugin_name": "GoodPlugin", "category": "eq"},
            {"plugin_name": "BadPlugin", "category": "compressor"},
            {"plugin_name": "AnotherGoodPlugin", "category": "reverb"},
        ]

        with patch.object(
            handler, "get_safe_plugin_recommendations"
        ) as mock_recommendations:
            mock_recommendations.return_value = ["SafeCompressor"]

            safe_chain = handler.create_safe_processing_chain(desired_chain)

            assert len(safe_chain) == 3
            assert safe_chain[0]["plugin_name"] == "GoodPlugin"
            assert safe_chain[1]["plugin_name"] == "SafeCompressor"
            assert safe_chain[1]["replaced_plugin"] == "BadPlugin"

    def test_safe_operation_decorators(self):
        """Test safe operation decorators."""

        @safe_plugin_operation("TestPlugin", "load")
        def test_plugin_function():
            return "success"

        @safe_engine_operation("render")
        def test_engine_function():
            return "rendered"

        # These should work without error
        result1 = test_plugin_function()
        result2 = test_engine_function()

        assert result1 == "success"
        assert result2 == "rendered"


class TestLangGraphErrorHandler:
    """Test LangGraph error handling."""

    def test_agent_timeout_handler(self):
        """Test agent timeout handler."""
        timeout_handler = AgentTimeoutHandler()

        # Test default timeout
        assert (
            timeout_handler.get_timeout_for_agent("unknown")
            == timeout_handler.default_timeout
        )

        # Test specific agent timeout
        assert timeout_handler.get_timeout_for_agent("eq") == 15.0

        # Test timeout recording
        timeout_handler.record_timeout("eq")
        assert timeout_handler.timeout_counts["eq"] == 1

        # Test should use cached response
        for _ in range(timeout_handler.max_timeouts_per_agent):
            timeout_handler.record_timeout("eq")

        assert timeout_handler.should_use_cached_response("eq")

    def test_recommendation_cache(self):
        """Test recommendation cache."""
        cache = RecommendationCache(max_cache_size=10, cache_ttl_hours=1)

        context = {"audio_analysis": {"centroid": 1000}}
        recommendation = {"plugin": "TestEQ", "confidence": 0.8}

        # Test caching
        cache.cache_recommendation("eq", context, recommendation)

        # Test retrieval
        cached = cache.get_cached_recommendation("eq", context)
        assert cached is not None
        assert cached["plugin"] == "TestEQ"

        # Test cache miss
        different_context = {"audio_analysis": {"centroid": 2000}}
        cached = cache.get_cached_recommendation("eq", different_context)
        assert cached is None

    def test_cache_eviction(self):
        """Test cache eviction when full."""
        cache = RecommendationCache(max_cache_size=2, cache_ttl_hours=1)

        # Fill cache beyond capacity
        for i in range(3):
            context = {"test": i}
            recommendation = {"result": i}
            cache.cache_recommendation("eq", context, recommendation)

        # Should have evicted oldest entry
        assert len(cache.cache) <= cache.max_cache_size

    def test_langgraph_error_handler_initialization(self):
        """Test LangGraph error handler initialization."""
        handler = LangGraphErrorHandler()

        assert isinstance(handler.timeout_handler, AgentTimeoutHandler)
        assert isinstance(handler.recommendation_cache, RecommendationCache)
        assert isinstance(handler.agent_health, dict)

    def test_agent_error_context_manager(self):
        """Test agent error context manager."""
        handler = LangGraphErrorHandler()

        # Test successful operation
        with handler.handle_agent_errors("eq", "analyze"):
            pass  # No error

        assert handler.agent_health.get("eq", False) is True
        assert handler.error_counts.get("eq", 0) == 0

    @pytest.mark.asyncio
    async def test_async_agent_error_context_manager(self):
        """Test async agent error context manager."""
        handler = LangGraphErrorHandler()

        # Test successful operation
        async with handler.handle_agent_errors_async("eq", "analyze"):
            await asyncio.sleep(0.01)  # Simulate async work

        assert handler.agent_health.get("eq", False) is True
        assert handler.error_counts.get("eq", 0) == 0

    def test_fallback_recommendation_generation(self):
        """Test fallback recommendation generation."""
        handler = LangGraphErrorHandler()
        context = {"audio_analysis": {"centroid": 1000}}

        # Test simple fallback generation
        recommendation = handler._generate_simple_fallback("eq", context)
        assert "plugin_name" in recommendation
        assert "confidence" in recommendation
        assert recommendation["confidence"] < 0.5  # Should be low confidence

    def test_recommendation_with_fallback(self):
        """Test getting recommendation with automatic fallback."""
        handler = LangGraphErrorHandler()
        context = {"test": "data"}

        def successful_agent_function(ctx):
            return {"plugin": "Success", "confidence": 0.9}

        def failing_agent_function(ctx):
            # Use a more specific exception type for tests to avoid broad-exception warnings
            raise RuntimeError("Agent failed")

        # Test successful case
        result = handler.get_recommendation_with_fallback(
            "eq", context, successful_agent_function
        )
        assert result["plugin"] == "Success"

        # Test fallback case
        result = handler.get_recommendation_with_fallback(
            "eq", context, failing_agent_function
        )
        assert "plugin_name" in result  # Should get fallback
        assert result["confidence"] < 0.5

    @pytest.mark.asyncio
    async def test_async_recommendation_with_fallback(self):
        """Test async recommendation with fallback."""
        handler = LangGraphErrorHandler()
        context = {"test": "data"}

        async def successful_agent_coro():
            return {"plugin": "AsyncSuccess", "confidence": 0.9}

        async def failing_agent_coro():
            # Use a more specific exception type for tests to avoid broad-exception warnings
            raise RuntimeError("Async agent failed")

        # Test successful case
        result = await handler.get_recommendation_with_fallback_async(
            "eq", context, successful_agent_coro()
        )
        assert result["plugin"] == "AsyncSuccess"

        # Test fallback case
        result = await handler.get_recommendation_with_fallback_async(
            "eq", context, failing_agent_coro()
        )
        assert "plugin_name" in result  # Should get fallback

    def test_agent_status_reporting(self):
        """Test agent status reporting."""
        handler = LangGraphErrorHandler()

        # Simulate some agent states
        handler.agent_health["eq"] = True
        handler.agent_health["dynamics"] = False
        handler.error_counts["dynamics"] = 2
        handler.fallback_active.add("dynamics")

        status = handler.get_agent_status()
        assert status["agent_health"]["eq"] is True
        assert status["agent_health"]["dynamics"] is False
        assert status["error_counts"]["dynamics"] == 2
        assert "dynamics" in status["fallback_active"]

    def test_safe_agent_operation_decorator(self):
        """Test safe agent operation decorator."""

        @safe_agent_operation("eq", "analyze")
        def test_agent_function():
            return "analyzed"

        result = test_agent_function()
        assert result == "analyzed"

    def test_safe_async_agent_operation_decorator(self, handler):
        pass

    @patch("requests.get", side_effect=requests.exceptions.ConnectionError)
    def test_network_failure_handling(self, mock_get, handler):
        @safe_agent_operation(handler, "test_agent", "network_call")
        def mock_network_call():
            requests.get("http://example.com")
            return "success"

        result = mock_network_call()
        assert result is None  # Or whatever the fallback behavior is
        assert handler.get_agent_status("test_agent")["error_count"] == 1
        assert "network_call" in handler.get_agent_status("test_agent")["last_error"]
        assert "ConnectionError" in handler.get_agent_status("test_agent")["last_error"]

    @patch("requests.get")
    def test_invalid_response_handling(self, mock_get, handler):
        mock_response = AsyncMock()
        mock_response.status_code = 500
        mock_response.json.return_value = {"error": "Internal Server Error"}
        mock_get.return_value = mock_response

        @safe_agent_operation(handler, "test_agent", "invalid_response_call")
        def mock_invalid_response_call():
            requests.get("http://example.com")
            return "success"

        result = mock_invalid_response_call()
        assert result is None
        assert handler.get_agent_status("test_agent")["error_count"] == 1
        assert (
            "invalid_response_call"
            in handler.get_agent_status("test_agent")["last_error"]
        )
        assert (
            "Internal Server Error"
            in handler.get_agent_status("test_agent")["last_error"]
        )

    @patch("requests.get", side_effect=requests.exceptions.Timeout)
    def test_timeout_handling(self, mock_get, handler):
        @safe_agent_operation(handler, "test_agent", "timeout_call")
        def mock_timeout_call():
            requests.get("http://example.com")
            return "success"

        result = mock_timeout_call()
        assert result is None
        assert handler.get_agent_status("test_agent")["error_count"] == 1
        assert "timeout_call" in handler.get_agent_status("test_agent")["last_error"]
        assert "Timeout" in handler.get_agent_status("test_agent")["last_error"]

    def test_fallback_mechanism_with_failing_agent(self, handler):
        context = {"audio_analysis": {"centroid": 1000}}

        def failing_agent_function(ctx):
            raise ValueError("Agent failed to provide recommendation")

        result = handler.get_recommendation_with_fallback(
            "eq", context, failing_agent_function
        )
        assert "plugin_name" in result
        assert result["confidence"] < 0.5
        assert (
            handler.get_agent_status("eq")["error_counts"][
                "get_recommendation_with_fallback"
            ]
            == 1
        )
        assert "fallback_active" in handler.get_agent_status("eq")

    # TODO: Add more fallback scenarios


class TestIntegratedErrorHandling:
    """Test integrated error handling across components."""

    def test_component_health_integration(self):
        """Test that component health is tracked across all handlers."""
        # Test that all error handlers can report their status
        faust_status = faust_error_handler.get_analyzer_status()
        dd_status = dawdreamer_error_handler.get_engine_status()
        lg_status = langgraph_error_handler.get_agent_status()

        assert "analyzer_health" in faust_status
        assert "engine_health" in dd_status
        assert "agent_health" in lg_status

    def test_error_propagation(self):
        """Test that errors propagate correctly through the system."""
        # Simulate a cascade of errors
        context = ErrorContext(
            component=ComponentType.FAUST_ANALYZER,
            operation="analyze",
            timestamp=time.time(),
        )

        # This should trigger fallback mechanisms
        with pytest.raises(Exception):
            with error_handler.handle_errors(context):
                raise FaustAnalyzerError("Cascade test", "test_analyzer")

    def test_recovery_coordination(self):
        """Test that recovery attempts are coordinated."""
        # Reset all error handlers
        faust_error_handler.reset_analyzer_errors()
        dawdreamer_error_handler.reset_engine_status()
        langgraph_error_handler.reset_agent_status()

        # Verify clean state
        faust_status = faust_error_handler.get_analyzer_status()
        dd_status = dawdreamer_error_handler.get_engine_status()
        lg_status = langgraph_error_handler.get_agent_status()

        assert (
            faust_status["total_analyzers"] == 0
            or faust_status["healthy_analyzers"] == faust_status["total_analyzers"]
        )
        assert dd_status["engine_health"] is True
        assert len(lg_status["fallback_active"]) == 0

    @patch("src.audio_agent.core.error_handling.logging")
    def test_error_logging_integration(self, mock_logging):
        """Test that errors are logged consistently across components."""
        # Create errors in different components
        faust_error = FaustAnalyzerError("Test Faust error", "test_analyzer")
        dd_error = DawDreamerError("Test DawDreamer error")
        lg_error = LangGraphAgentError("Test LangGraph error", "test_agent")

        # These should all result in logging calls
        error_handler._log_error(faust_error)
        error_handler._log_error(dd_error)
        error_handler._log_error(lg_error)

        # Verify logging was called
        assert mock_logging.error.call_count >= 3


if __name__ == "__main__":
    pytest.main([__file__])
