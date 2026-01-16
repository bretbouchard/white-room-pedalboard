"""
Cross-component integration tests for audio agent.

Tests integration between audio agent and other system components
with proper authentication, API contracts, and error recovery.
"""

import time
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

# Import audio agent components
try:
    from audio_agent.auth.clerk_auth import ClerkAuthenticator
    from audio_agent.core.analysis_pipeline import AnalysisPipeline
    from audio_agent.main import app
    from audio_agent.models.audio import AudioAnalysisRequest, AudioAnalysisResponse
except ImportError as e:
    pytest.skip(f"Audio agent components not available: {e}", allow_module_level=True)


class TestAudioAgentCrossComponentIntegration:
    """Test audio agent integration with other system components."""

    @pytest.fixture
    def audio_client(self):
        """Create audio agent test client."""
        return TestClient(app)

    @pytest.fixture
    def authenticated_user(self):
        """Mock authenticated user for testing."""
        return {
            "user_id": "user_audio_integration",
            "email": "audio.integration@test.com",
            "session_id": "sess_audio_integration",
            "roles": ["user", "composer"],
            "permissions": [
                "use_audio_agent",
                "create_compositions",
                "edit_compositions",
                "advanced_audio_processing",
            ],
            "subscription": {
                "plan": "pro",
                "status": "active",
                "features": ["advanced_audio", "real_time_processing"],
            },
        }

    @pytest.fixture
    def mock_auth(self, authenticated_user):
        """Mock authentication for audio agent."""
        with patch(
            "audio_agent.auth.clerk_integration.ClerkAuthenticator.verify_token"
        ) as mock_verify:
            mock_verify.return_value = {
                "user_id": authenticated_user["user_id"],
                "session_id": authenticated_user["session_id"],
                "roles": authenticated_user["roles"],
                "permissions": authenticated_user["permissions"],
            }
            yield mock_verify

    @pytest.fixture
    def mock_backend_communication(self):
        """Mock communication with backend."""
        with patch("httpx.AsyncClient.post") as mock_post:
            with patch("httpx.AsyncClient.get") as mock_get:
                # Default successful responses
                mock_post.return_value = AsyncMock(
                    status_code=200,
                    json=lambda: {"status": "success", "received": True},
                )
                mock_get.return_value = AsyncMock(
                    status_code=200,
                    json=lambda: {"status": "healthy", "version": "1.0.0"},
                )
                yield {"post": mock_post, "get": mock_get}

    @pytest.mark.asyncio
    async def test_audio_processing_workflow_integration(
        self, audio_client, authenticated_user, mock_auth, mock_backend_communication
    ):
        """Test complete audio processing workflow with backend integration."""

        headers = {"Authorization": "Bearer audio_integration_token"}

        # Test 1: Receive processing request from backend
        processing_request = {
            "composition_id": "comp_audio_test",
            "processing_type": "full_analysis",
            "audio_data": {
                "sample_rate": 44100,
                "channels": 2,
                "duration": 30.0,
                "format": "wav",
            },
            "options": {
                "include_spectral": True,
                "include_harmonic": True,
                "include_dynamic": True,
                "include_perceptual": True,
            },
            "callback_url": "http://backend:8000/api/audio-processing/callback",
        }

        with patch(
            "audio_agent.core.analysis_pipeline.AnalysisPipeline.process"
        ) as mock_process:
            # Mock successful processing
            mock_process.return_value = {
                "composition_id": "comp_audio_test",
                "audio_features": {
                    "spectral_analysis": {
                        "centroid": 1800.0,
                        "bandwidth": 2200.0,
                        "rolloff": 3500.0,
                        "flux": 0.6,
                    },
                    "harmonic_analysis": {
                        "fundamental": 440.0,
                        "harmonics": [880.0, 1320.0, 1760.0],
                        "inharmonicity": 0.015,
                    },
                    "dynamic_analysis": {
                        "rms": 0.65,
                        "peak": 0.92,
                        "dynamic_range": 14.5,
                        "loudness": -16.2,
                    },
                    "perceptual_analysis": {
                        "brightness": 0.75,
                        "warmth": 0.55,
                        "roughness": 0.25,
                    },
                },
                "processing_metadata": {
                    "duration": 2.8,
                    "success": True,
                    "timestamp": datetime.now().isoformat(),
                    "agent_version": "1.0.0",
                },
            }

            response = audio_client.post(
                "/api/process", json=processing_request, headers=headers
            )

            assert response.status_code == 200
            result = response.json()

            # Verify processing result structure
            assert "composition_id" in result
            assert "audio_features" in result
            assert "processing_metadata" in result

            # Verify all requested analysis types are included
            audio_features = result["audio_features"]
            assert "spectral_analysis" in audio_features
            assert "harmonic_analysis" in audio_features
            assert "dynamic_analysis" in audio_features
            assert "perceptual_analysis" in audio_features

            # Verify callback to backend was made
            mock_backend_communication["post"].assert_called()
            callback_call = mock_backend_communication["post"].call_args
            assert "callback" in callback_call[0][0]  # URL contains 'callback'

    @pytest.mark.asyncio
    async def test_real_time_audio_processing(
        self, audio_client, authenticated_user, mock_auth
    ):
        """Test real-time audio processing capabilities."""

        headers = {"Authorization": "Bearer audio_integration_token"}

        # Test WebSocket connection for real-time processing
        with patch(
            "audio_agent.core.real_time_processor.RealTimeProcessor"
        ) as mock_processor:
            mock_processor_instance = AsyncMock()
            mock_processor.return_value = mock_processor_instance

            # Mock real-time processing results
            mock_processor_instance.process_chunk.return_value = {
                "chunk_id": 1,
                "features": {
                    "spectral_centroid": 1600.0,
                    "rms_level": 0.7,
                    "peak_level": 0.85,
                },
                "timestamp": time.time(),
            }

            # Start real-time session
            session_request = {
                "session_id": "rt_session_test",
                "sample_rate": 44100,
                "buffer_size": 1024,
                "analysis_types": ["spectral", "dynamic"],
            }

            response = audio_client.post(
                "/api/realtime/start", json=session_request, headers=headers
            )
            assert response.status_code == 200

            session_data = response.json()
            assert session_data["status"] == "started"
            assert "session_id" in session_data

    @pytest.mark.asyncio
    async def test_plugin_integration_workflow(
        self, audio_client, authenticated_user, mock_auth, mock_backend_communication
    ):
        """Test plugin integration workflow with backend."""

        headers = {"Authorization": "Bearer audio_integration_token"}

        # Test 1: Get available plugins
        with patch(
            "audio_agent.core.plugin_registry.PluginRegistry.get_available_plugins"
        ) as mock_plugins:
            mock_plugins.return_value = [
                {
                    "id": "reverb_plugin_1",
                    "name": "Concert Hall Reverb",
                    "type": "effect",
                    "category": "reverb",
                    "parameters": [
                        {
                            "name": "room_size",
                            "type": "float",
                            "min": 0.0,
                            "max": 1.0,
                            "default": 0.5,
                        },
                        {
                            "name": "damping",
                            "type": "float",
                            "min": 0.0,
                            "max": 1.0,
                            "default": 0.3,
                        },
                    ],
                },
                {
                    "id": "eq_plugin_1",
                    "name": "Parametric EQ",
                    "type": "effect",
                    "category": "eq",
                    "parameters": [
                        {
                            "name": "frequency",
                            "type": "float",
                            "min": 20.0,
                            "max": 20000.0,
                            "default": 1000.0,
                        },
                        {
                            "name": "gain",
                            "type": "float",
                            "min": -24.0,
                            "max": 24.0,
                            "default": 0.0,
                        },
                    ],
                },
            ]

            response = audio_client.get("/api/plugins", headers=headers)
            assert response.status_code == 200

            plugins = response.json()["plugins"]
            assert len(plugins) == 2
            assert plugins[0]["name"] == "Concert Hall Reverb"
            assert plugins[1]["name"] == "Parametric EQ"

        # Test 2: Apply plugin to composition
        with patch(
            "audio_agent.core.plugin_processor.PluginProcessor.apply_plugin"
        ) as mock_apply:
            mock_apply.return_value = {
                "composition_id": "comp_plugin_test",
                "plugin_id": "reverb_plugin_1",
                "processed_audio": {
                    "url": "http://storage.example.com/processed_audio.wav",
                    "duration": 30.0,
                    "format": "wav",
                },
                "plugin_settings": {
                    "room_size": 0.7,
                    "damping": 0.4,
                },
                "processing_time": 1.5,
            }

            plugin_request = {
                "composition_id": "comp_plugin_test",
                "plugin_id": "reverb_plugin_1",
                "parameters": {
                    "room_size": 0.7,
                    "damping": 0.4,
                },
                "output_format": "wav",
            }

            response = audio_client.post(
                "/api/plugins/apply", json=plugin_request, headers=headers
            )
            assert response.status_code == 200

            result = response.json()
            assert result["composition_id"] == "comp_plugin_test"
            assert result["plugin_id"] == "reverb_plugin_1"
            assert "processed_audio" in result

    @pytest.mark.asyncio
    async def test_error_recovery_mechanisms(
        self, audio_client, authenticated_user, mock_auth, mock_backend_communication
    ):
        """Test error recovery mechanisms in audio processing."""

        headers = {"Authorization": "Bearer audio_integration_token"}

        # Test 1: Processing failure with retry
        with patch(
            "audio_agent.core.analysis_pipeline.AnalysisPipeline.process"
        ) as mock_process:
            # First attempt fails, second succeeds
            mock_process.side_effect = [
                Exception("Audio processing engine unavailable"),
                {
                    "composition_id": "comp_recovery_test",
                    "audio_features": {"spectral_analysis": {"centroid": 1500.0}},
                    "processing_metadata": {"retry_count": 1, "success": True},
                },
            ]

            processing_request = {
                "composition_id": "comp_recovery_test",
                "processing_type": "spectral_analysis",
                "retry_on_failure": True,
                "max_retries": 3,
            }

            response = audio_client.post(
                "/api/process", json=processing_request, headers=headers
            )

            assert response.status_code == 200
            result = response.json()
            assert result["processing_metadata"]["retry_count"] == 1
            assert result["processing_metadata"]["success"] is True

        # Test 2: Graceful degradation when advanced features fail
        with patch(
            "audio_agent.core.analysis_pipeline.AnalysisPipeline.process"
        ) as mock_process:
            # Advanced analysis fails, basic analysis succeeds
            mock_process.return_value = {
                "composition_id": "comp_degradation_test",
                "audio_features": {
                    "spectral_analysis": {"centroid": 1400.0},  # Basic analysis works
                    # harmonic_analysis missing due to failure
                },
                "processing_metadata": {
                    "success": True,
                    "degraded_mode": True,
                    "failed_analyses": ["harmonic_analysis"],
                    "fallback_used": True,
                },
            }

            processing_request = {
                "composition_id": "comp_degradation_test",
                "processing_type": "full_analysis",
                "enable_graceful_degradation": True,
            }

            response = audio_client.post(
                "/api/process", json=processing_request, headers=headers
            )

            assert response.status_code == 200
            result = response.json()
            assert result["processing_metadata"]["degraded_mode"] is True
            assert "spectral_analysis" in result["audio_features"]
            assert "harmonic_analysis" not in result["audio_features"]

    @pytest.mark.asyncio
    async def test_authentication_integration(self, audio_client, authenticated_user):
        """Test authentication integration with Clerk."""

        # Test 1: Valid authentication
        with patch(
            "audio_agent.auth.clerk_integration.ClerkAuthenticator.verify_token"
        ) as mock_verify:
            mock_verify.return_value = {
                "user_id": authenticated_user["user_id"],
                "permissions": authenticated_user["permissions"],
            }

            headers = {"Authorization": "Bearer valid_token"}
            response = audio_client.get("/api/status", headers=headers)

            assert response.status_code == 200
            mock_verify.assert_called_once()

        # Test 2: Invalid authentication
        with patch(
            "audio_agent.auth.clerk_integration.ClerkAuthenticator.verify_token"
        ) as mock_verify:
            mock_verify.side_effect = Exception("Invalid token")

            headers = {"Authorization": "Bearer invalid_token"}
            response = audio_client.get("/api/status", headers=headers)

            assert response.status_code == 401

        # Test 3: Insufficient permissions
        with patch(
            "audio_agent.auth.clerk_integration.ClerkAuthenticator.verify_token"
        ) as mock_verify:
            mock_verify.return_value = {
                "user_id": "user_limited",
                "permissions": ["view_compositions"],  # Missing audio agent permission
            }

            headers = {"Authorization": "Bearer limited_token"}
            response = audio_client.post("/api/process", json={}, headers=headers)

            assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_performance_monitoring_integration(
        self, audio_client, authenticated_user, mock_auth
    ):
        """Test performance monitoring integration."""

        headers = {"Authorization": "Bearer audio_integration_token"}

        with patch(
            "audio_agent.telemetry.performance_monitor.track_processing"
        ) as mock_track:
            with patch(
                "audio_agent.core.analysis_pipeline.AnalysisPipeline.process"
            ) as mock_process:
                mock_process.return_value = {
                    "composition_id": "comp_perf_test",
                    "audio_features": {"spectral_analysis": {"centroid": 1600.0}},
                    "processing_metadata": {"duration": 1.2, "success": True},
                }

                processing_request = {
                    "composition_id": "comp_perf_test",
                    "processing_type": "spectral_analysis",
                }

                start_time = time.time()
                response = audio_client.post(
                    "/api/process", json=processing_request, headers=headers
                )
                end_time = time.time()

                assert response.status_code == 200

                # Verify performance tracking was called
                mock_track.assert_called()

                # Verify reasonable response time
                response_time = end_time - start_time
                assert response_time < 5.0  # Should complete within 5 seconds

    @pytest.mark.asyncio
    async def test_health_check_integration(
        self, audio_client, mock_backend_communication
    ):
        """Test health check integration with system monitoring."""

        # Test 1: Healthy status
        with patch(
            "audio_agent.health.system_health.check_all_components"
        ) as mock_health:
            mock_health.return_value = {
                "status": "healthy",
                "components": {
                    "audio_engine": {"status": "healthy", "response_time": 0.05},
                    "plugin_system": {"status": "healthy", "loaded_plugins": 15},
                    "analysis_pipeline": {"status": "healthy", "queue_size": 2},
                },
                "uptime": 3600,
                "version": "1.0.0",
            }

            response = audio_client.get("/api/health")

            assert response.status_code == 200
            health_data = response.json()
            assert health_data["status"] == "healthy"
            assert "components" in health_data
            assert "uptime" in health_data

        # Test 2: Degraded status
        with patch(
            "audio_agent.health.system_health.check_all_components"
        ) as mock_health:
            mock_health.return_value = {
                "status": "degraded",
                "components": {
                    "audio_engine": {"status": "healthy", "response_time": 0.05},
                    "plugin_system": {
                        "status": "degraded",
                        "error": "Some plugins failed to load",
                    },
                    "analysis_pipeline": {"status": "healthy", "queue_size": 8},
                },
                "issues": ["Plugin loading errors"],
            }

            response = audio_client.get("/api/health")

            assert response.status_code == 200
            health_data = response.json()
            assert health_data["status"] == "degraded"
            assert "issues" in health_data

    @pytest.mark.asyncio
    async def test_feature_flag_integration(
        self, audio_client, authenticated_user, mock_auth
    ):
        """Test feature flag integration with audio agent."""

        headers = {"Authorization": "Bearer audio_integration_token"}

        # Test 1: Feature enabled
        with patch("audio_agent.feature_flags.client.get_feature_flag") as mock_flag:
            mock_flag.return_value = {"enabled": True, "config": {"quality": "high"}}

            with patch(
                "audio_agent.core.analysis_pipeline.AnalysisPipeline.process"
            ) as mock_process:
                mock_process.return_value = {
                    "composition_id": "comp_flag_test",
                    "audio_features": {"spectral_analysis": {"centroid": 1700.0}},
                    "processing_metadata": {"quality": "high", "success": True},
                }

                processing_request = {
                    "composition_id": "comp_flag_test",
                    "processing_type": "spectral_analysis",
                    "use_advanced_processing": True,
                }

                response = audio_client.post(
                    "/api/process", json=processing_request, headers=headers
                )

                assert response.status_code == 200
                result = response.json()
                assert result["processing_metadata"]["quality"] == "high"

        # Test 2: Feature disabled - fallback behavior
        with patch("audio_agent.feature_flags.client.get_feature_flag") as mock_flag:
            mock_flag.return_value = {"enabled": False}

            with patch(
                "audio_agent.core.analysis_pipeline.AnalysisPipeline.process"
            ) as mock_process:
                mock_process.return_value = {
                    "composition_id": "comp_flag_test_2",
                    "audio_features": {"spectral_analysis": {"centroid": 1500.0}},
                    "processing_metadata": {"quality": "standard", "success": True},
                }

                processing_request = {
                    "composition_id": "comp_flag_test_2",
                    "processing_type": "spectral_analysis",
                    "use_advanced_processing": True,  # Requested but disabled
                }

                response = audio_client.post(
                    "/api/process", json=processing_request, headers=headers
                )

                assert response.status_code == 200
                result = response.json()
                assert (
                    result["processing_metadata"]["quality"] == "standard"
                )  # Fallback used

    @pytest.mark.asyncio
    async def test_daid_provenance_integration(
        self, audio_client, authenticated_user, mock_auth
    ):
        """Test DAID provenance tracking integration."""

        headers = {"Authorization": "Bearer audio_integration_token"}

        with patch(
            "audio_agent.daid.service.DAIDService.generate_daid"
        ) as mock_generate:
            with patch(
                "audio_agent.daid.service.DAIDService.track_operation"
            ) as mock_track:
                mock_generate.return_value = "daid_audio_processing_123"

                processing_request = {
                    "composition_id": "comp_daid_test",
                    "processing_type": "full_analysis",
                    "parent_daid": "daid_composition_456",
                }

                with patch(
                    "audio_agent.core.analysis_pipeline.AnalysisPipeline.process"
                ) as mock_process:
                    mock_process.return_value = {
                        "composition_id": "comp_daid_test",
                        "audio_features": {"spectral_analysis": {"centroid": 1550.0}},
                        "processing_metadata": {"success": True},
                        "daid": "daid_audio_processing_123",
                    }

                    response = audio_client.post(
                        "/api/process", json=processing_request, headers=headers
                    )

                    assert response.status_code == 200
                    result = response.json()

                    # Verify DAID was generated and tracked
                    mock_generate.assert_called_once()
                    mock_track.assert_called_once()

                    # Verify DAID is included in response
                    assert result["daid"] == "daid_audio_processing_123"
