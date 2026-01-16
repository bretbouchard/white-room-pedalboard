"""
Comprehensive tests for the analysis-based AI suggestion system.

This test suite covers:
- Real audio analysis integration
- Suggestion generation based on actual audio features
- EQ, compression, spatial, harmonic, and quality suggestions
- API endpoint functionality
- Error handling and edge cases
- Performance and reliability
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest
from audio_agent.ai.analysis_based_suggestion_service import (
    AnalysisBasedSuggestion,
    AnalysisBasedSuggestionService,
    AudioFeatureProfile,
)
from audio_agent.core.enhanced_analyzer_integration import EnhancedAnalyzerIntegration
from audio_agent.models.audio import AudioAnalysis


class TestAudioFeatureProfile:
    """Test cases for AudioFeatureProfile creation and processing."""

    @pytest.fixture
    def mock_analysis_results(self):
        """Create mock analysis results for testing."""
        return {
            "spectral_analyzer": AudioAnalysis(
                analyzer="spectral_analyzer",
                features={
                    "spectral_centroid": 2500.0,
                    "spectral_rolloff": 8000.0,
                    "spectral_flux": 0.3,
                    "zero_crossing_rate": 0.05,
                },
                statistics={"mean": 0.0, "std": 0.1},
            ),
            "dynamic_analyzer": AudioAnalysis(
                analyzer="dynamic_analyzer",
                features={
                    "rms": 0.4,
                    "peak": 0.8,
                    "dynamic_range": 15.0,
                    "transient_density": 2.5,
                    "crest_factor": 12.0,
                },
                statistics={"mean": 0.0, "std": 0.1},
            ),
            "spatial_analyzer": AudioAnalysis(
                analyzer="spatial_analyzer",
                features={
                    "stereo_width": 0.4,
                    "phase_correlation": 0.85,
                    "mid_level": 0.6,
                    "side_level": 0.3,
                },
                statistics={"mean": 0.0, "std": 0.1},
            ),
            "harmonic_analyzer": AudioAnalysis(
                analyzer="harmonic_analyzer",
                features={
                    "harmonic_richness": 0.6,
                    "fundamental_strength": 0.7,
                    "inharmonicity": 0.1,
                },
                statistics={"mean": 0.0, "std": 0.1},
            ),
            "perceptual_analyzer": AudioAnalysis(
                analyzer="perceptual_analyzer",
                features={"loudness": 0.5, "sharpness": 0.3, "roughness": 0.2},
                statistics={"mean": 0.0, "std": 0.1},
            ),
            "quality_analyzer": AudioAnalysis(
                analyzer="quality_analyzer",
                features={
                    "overall_quality": 0.7,
                    "noise_level": 0.05,
                    "clipping_detected": False,
                },
                statistics={"mean": 0.0, "std": 0.1},
            ),
        }

    def test_create_audio_feature_profile(self, mock_analysis_results):
        """Test creation of AudioFeatureProfile from analysis results."""
        profile = AudioFeatureProfile.from_analysis_results(mock_analysis_results)

        # Check that all feature types are populated
        assert profile.spectral_features is not None
        assert profile.dynamic_features is not None
        assert profile.harmonic_features is not None
        assert profile.spatial_features is not None
        assert profile.perceptual_features is not None
        assert profile.quality_metrics is not None

        # Check computed characteristics
        assert profile.frequency_balance is not None
        assert profile.dynamic_characteristics is not None
        assert profile.spatial_characteristics is not None

        # Check specific values
        assert profile.spectral_features["spectral_centroid"] == 2500.0
        assert profile.dynamic_features["rms"] == 0.4
        assert profile.spatial_features["stereo_width"] == 0.4

    def test_frequency_balance_computation(self, mock_analysis_results):
        """Test frequency balance computation from spectral features."""
        profile = AudioFeatureProfile.from_analysis_results(mock_analysis_results)
        freq_balance = profile.frequency_balance

        # Should have all frequency bands
        assert "sub_bass" in freq_balance
        assert "bass" in freq_balance
        assert "low_mid" in freq_balance
        assert "mid" in freq_balance
        assert "high_mid" in freq_balance
        assert "treble" in freq_balance
        assert "air" in freq_balance

        # Values should be between 0 and 1
        for band, value in freq_balance.items():
            assert 0 <= value <= 1

        # Spectral centroid of 2500Hz should favor mid-high frequencies
        assert freq_balance["mid"] > freq_balance["sub_bass"]
        assert freq_balance["high_mid"] > freq_balance["bass"]

    def test_dynamic_characteristics_computation(self, mock_analysis_results):
        """Test dynamic characteristics computation."""
        profile = AudioFeatureProfile.from_analysis_results(mock_analysis_results)
        dynamics = profile.dynamic_characteristics

        # Should have all dynamic characteristics
        assert "rms_level" in dynamics
        assert "peak_level" in dynamics
        assert "dynamic_range" in dynamics
        assert "crest_factor" in dynamics
        assert "transient_density" in dynamics
        assert "compression_ratio_needed" in dynamics

        # Check specific values
        assert dynamics["rms_level"] == 0.4
        assert dynamics["peak_level"] == 0.8
        assert dynamics["dynamic_range"] > 0
        assert dynamics["compression_ratio_needed"] > 1.0

    def test_spatial_characteristics_computation(self, mock_analysis_results):
        """Test spatial characteristics computation."""
        profile = AudioFeatureProfile.from_analysis_results(mock_analysis_results)
        spatial = profile.spatial_characteristics

        # Should have all spatial characteristics
        assert "stereo_width" in spatial
        assert "mono_compatibility" in spatial
        assert "phase_correlation" in spatial
        assert "mid_side_balance" in spatial

        # Check specific values
        assert spatial["stereo_width"] == 0.4
        assert spatial["phase_correlation"] == 0.85
        assert 0 <= spatial["mono_compatibility"] <= 1

    def test_empty_analysis_results(self):
        """Test handling of empty analysis results."""
        profile = AudioFeatureProfile.from_analysis_results({})

        # Should create default profile
        assert profile.spectral_features == {}
        assert profile.dynamic_features == {}
        assert profile.frequency_balance is not None
        assert profile.dynamic_characteristics is not None
        assert profile.spatial_characteristics is not None


class TestAnalysisBasedSuggestionService:
    """Test cases for the AnalysisBasedSuggestionService."""

    @pytest.fixture
    def mock_analyzer_integration(self):
        """Create a mock analyzer integration."""
        integration = MagicMock(spec=EnhancedAnalyzerIntegration)
        integration.initialized = True
        integration.analyze_audio = AsyncMock(
            return_value={
                "spectral_analyzer": AudioAnalysis(
                    analyzer="spectral_analyzer",
                    features={"spectral_centroid": 2000.0, "spectral_flux": 0.2},
                    statistics={},
                ),
                "dynamic_analyzer": AudioAnalysis(
                    analyzer="dynamic_analyzer",
                    features={"rms": 0.3, "dynamic_range": 18.0},
                    statistics={},
                ),
                "spatial_analyzer": AudioAnalysis(
                    analyzer="spatial_analyzer",
                    features={"stereo_width": 0.25, "phase_correlation": 0.9},
                    statistics={},
                ),
            }
        )
        return integration

    @pytest.fixture
    def suggestion_service(self, mock_analyzer_integration):
        """Create a suggestion service with mocked analyzer integration."""
        service = AnalysisBasedSuggestionService(mock_analyzer_integration)
        return service

    @pytest.fixture
    def test_audio_data(self):
        """Create test audio data."""
        # Generate 1 second of test audio at 48kHz
        return np.sin(2 * np.pi * 440 * np.linspace(0, 1, 48000)).tolist()

    @pytest.mark.asyncio
    async def test_successful_audio_analysis_and_suggestions(
        self, suggestion_service, test_audio_data
    ):
        """Test successful audio analysis and suggestion generation."""
        result = await suggestion_service.analyze_audio_and_generate_suggestions(
            audio_data=test_audio_data,
            track_id="test_track",
            context={"genre": "rock"},
            suggestion_types=["eq", "compression"],
        )

        assert result["success"] is True
        assert "analysis_id" in result
        assert result["track_id"] == "test_track"
        assert "audio_profile" in result
        assert "suggestions" in result
        assert "analysis_summary" in result

        # Check audio profile
        audio_profile = result["audio_profile"]
        assert "frequency_balance" in audio_profile
        assert "dynamic_characteristics" in audio_profile
        assert "spatial_characteristics" in audio_profile

        # Check suggestions
        suggestions = result["suggestions"]
        assert len(suggestions) > 0

        # Check suggestion structure
        for suggestion in suggestions:
            assert "id" in suggestion
            assert "type" in suggestion
            assert "title" in suggestion
            assert "confidence" in suggestion
            assert "reasoning" in suggestion
            assert "analysis_basis" in suggestion
            assert "parameters" in suggestion
            assert "priority" in suggestion

        # Check analysis summary
        summary = result["analysis_summary"]
        assert "analyzers_used" in summary
        assert "suggestion_count" in summary
        assert summary["suggestion_count"] == len(suggestions)

    @pytest.mark.asyncio
    async def test_no_analyzer_integration(self, test_audio_data):
        """Test behavior when no analyzer integration is available."""
        service = AnalysisBasedSuggestionService(None)

        result = await service.analyze_audio_and_generate_suggestions(
            audio_data=test_audio_data, track_id="test_track"
        )

        assert result["success"] is False
        assert "error" in result
        assert result["error"] == "No analyzer integration available"
        assert result["suggestions"] == []

    @pytest.mark.asyncio
    async def test_analyzer_integration_failure(self, test_audio_data):
        """Test behavior when analyzer integration fails."""
        mock_integration = MagicMock(spec=EnhancedAnalyzerIntegration)
        mock_integration.initialized = True
        mock_integration.analyze_audio = AsyncMock(
            side_effect=Exception("Analysis failed")
        )

        service = AnalysisBasedSuggestionService(mock_integration)

        result = await service.analyze_audio_and_generate_suggestions(
            audio_data=test_audio_data, track_id="test_track"
        )

        assert result["success"] is False
        assert "error" in result
        assert "Analysis failed" in result["error"]
        assert result["suggestions"] == []

    @pytest.mark.asyncio
    async def test_empty_analyses_return(self, suggestion_service, test_audio_data):
        """Test behavior when analyzers return empty results."""
        suggestion_service.analyzer_integration.analyze_audio.return_value = {}

        result = await suggestion_service.analyze_audio_and_generate_suggestions(
            audio_data=test_audio_data, track_id="test_track"
        )

        assert result["success"] is False
        assert "error" in result
        assert result["suggestions"] == []

    @pytest.mark.asyncio
    async def test_suggestion_type_filtering(self, suggestion_service, test_audio_data):
        """Test filtering of suggestion types."""
        # Request only EQ suggestions
        result = await suggestion_service.analyze_audio_and_generate_suggestions(
            audio_data=test_audio_data, track_id="test_track", suggestion_types=["eq"]
        )

        assert result["success"] is True
        suggestions = result["suggestions"]

        # All suggestions should be EQ type
        for suggestion in suggestions:
            assert suggestion["type"] == "eq"

    @pytest.mark.asyncio
    async def test_comprehensive_suggestion_generation(
        self, suggestion_service, test_audio_data
    ):
        """Test generation of all suggestion types."""
        result = await suggestion_service.analyze_audio_and_generate_suggestions(
            audio_data=test_audio_data,
            track_id="test_track",
            suggestion_types=["eq", "compression", "spatial", "harmonic", "quality"],
        )

        assert result["success"] is True
        suggestions = result["suggestions"]

        # Should have suggestions from different types
        suggestion_types = set(s["type"] for s in suggestions)
        assert len(suggestion_types) > 1

        # Check priority ordering
        priorities = [s["priority"] for s in suggestions]
        priority_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}

        # Suggestions should be sorted by priority and confidence
        for i in range(len(suggestions) - 1):
            current_priority_value = priority_order[suggestions[i]["priority"]]
            next_priority_value = priority_order[suggestions[i + 1]["priority"]]

            # Either higher priority or same priority with higher confidence
            assert current_priority_value > next_priority_value or (
                current_priority_value == next_priority_value
                and suggestions[i]["confidence"] >= suggestions[i + 1]["confidence"]
            )

    def test_eq_suggestion_generation(self):
        """Test EQ suggestion generation logic."""
        # Create a profile with bass deficiency
        profile = AudioFeatureProfile(
            spectral_features={"spectral_centroid": 500},
            dynamic_features={},
            harmonic_features={},
            spatial_features={},
            perceptual_features={},
            quality_metrics={},
            frequency_balance={"bass": 0.2},  # Low bass
            dynamic_characteristics={},
            spatial_characteristics={},
        )

        service = AnalysisBasedSuggestionService()
        suggestions = asyncio.run(
            service._generate_eq_suggestions(profile, "test_track")
        )

        assert len(suggestions) > 0
        bass_suggestion = next(
            (s for s in suggestions if "bass" in s.title.lower()), None
        )
        assert bass_suggestion is not None
        assert bass_suggestion.type == "eq"
        assert bass_suggestion.parameters["frequency"] < 200  # Bass frequency
        assert bass_suggestion.parameters["gain"] > 0  # Boost, not cut

    def test_compression_suggestion_generation(self):
        """Test compression suggestion generation logic."""
        # Create a profile with wide dynamic range
        profile = AudioFeatureProfile(
            spectral_features={},
            dynamic_features={"dynamic_range": 20.0},  # Wide dynamic range
            harmonic_features={},
            spatial_features={},
            perceptual_features={},
            quality_metrics={},
            frequency_balance={},
            dynamic_characteristics={"dynamic_range": 20.0},
            spatial_characteristics={},
        )

        service = AnalysisBasedSuggestionService()
        suggestions = asyncio.run(
            service._generate_compression_suggestions(profile, "test_track")
        )

        assert len(suggestions) > 0
        compression_suggestion = next(
            (s for s in suggestions if s.type == "compression"), None
        )
        assert compression_suggestion is not None
        assert compression_suggestion.parameters["ratio"] > 1.0
        assert compression_suggestion.priority in ["medium", "high"]

    def test_spatial_suggestion_generation(self):
        """Test spatial suggestion generation logic."""
        # Create a profile with narrow stereo width
        profile = AudioFeatureProfile(
            spectral_features={},
            dynamic_features={},
            harmonic_features={},
            spatial_features={"stereo_width": 0.2},  # Narrow stereo
            perceptual_features={},
            quality_metrics={},
            frequency_balance={},
            dynamic_characteristics={},
            spatial_characteristics={"stereo_width": 0.2},
        )

        service = AnalysisBasedSuggestionService()
        suggestions = asyncio.run(
            service._generate_spatial_suggestions(profile, "test_track")
        )

        assert len(suggestions) > 0
        spatial_suggestion = next((s for s in suggestions if s.type == "spatial"), None)
        assert spatial_suggestion is not None
        assert (
            "width" in spatial_suggestion.title.lower()
            or "stereo" in spatial_suggestion.title.lower()
        )

    def test_harmonic_suggestion_generation(self):
        """Test harmonic suggestion generation logic."""
        # Create a profile with low harmonic richness
        profile = AudioFeatureProfile(
            spectral_features={},
            dynamic_features={},
            harmonic_features={"harmonic_richness": 0.3},  # Low richness
            spatial_features={},
            perceptual_features={},
            quality_metrics={},
            frequency_balance={},
            dynamic_characteristics={},
            spatial_characteristics={},
        )

        service = AnalysisBasedSuggestionService()
        suggestions = asyncio.run(
            service._generate_harmonic_suggestions(profile, "test_track")
        )

        assert len(suggestions) > 0
        harmonic_suggestion = next(
            (s for s in suggestions if s.type == "harmonic"), None
        )
        assert harmonic_suggestion is not None
        assert (
            "harmonic" in harmonic_suggestion.title.lower()
            or "richness" in harmonic_suggestion.title.lower()
        )

    def test_quality_suggestion_generation(self):
        """Test quality improvement suggestion generation logic."""
        # Create a profile with quality issues
        profile = AudioFeatureProfile(
            spectral_features={},
            dynamic_features={},
            harmonic_features={},
            spatial_features={},
            perceptual_features={},
            quality_metrics={
                "overall_quality": 0.4,
                "clipping_detected": True,
            },  # Low quality with clipping
            frequency_balance={},
            dynamic_characteristics={},
            spatial_characteristics={},
        )

        service = AnalysisBasedSuggestionService()
        suggestions = asyncio.run(
            service._generate_quality_suggestions(profile, "test_track")
        )

        assert len(suggestions) > 0
        quality_suggestion = next((s for s in suggestions if s.type == "quality"), None)
        assert quality_suggestion is not None
        assert (
            "clipping" in quality_suggestion.title.lower()
            or "quality" in quality_suggestion.title.lower()
        )
        assert (
            quality_suggestion.priority == "critical"
        )  # Clipping should be critical priority

    @pytest.mark.asyncio
    async def test_suggestion_feedback_processing(
        self, suggestion_service, test_audio_data
    ):
        """Test processing of user feedback on suggestions."""
        # Generate suggestions first
        result = await suggestion_service.analyze_audio_and_generate_suggestions(
            audio_data=test_audio_data, track_id="test_track"
        )

        assert result["success"] is True
        suggestions = result["suggestions"]
        assert len(suggestions) > 0

        # Get first suggestion ID
        suggestion_id = suggestions[0]["id"]

        # Process feedback
        await suggestion_service.process_suggestion_feedback(
            suggestion_id=suggestion_id, action="accept", user_id="test_user"
        )

        # Check that feedback was processed
        user_stats = suggestion_service.get_user_stats("test_user")
        assert user_stats["total_suggestions"] == 1
        assert user_stats["accepted_suggestions"] == 1
        assert user_stats["acceptance_rate"] == 100.0

    def test_user_statistics(self, suggestion_service):
        """Test user statistics calculation."""
        user_id = "test_user"

        # Initially should have empty stats
        stats = suggestion_service.get_user_stats(user_id)
        assert stats["total_suggestions"] == 0
        assert stats["accepted_suggestions"] == 0
        assert stats["rejected_suggestions"] == 0
        assert stats["acceptance_rate"] == 0.0

        # Add some feedback manually
        suggestion_service.user_feedback[user_id] = [
            {"action": "accept", "confidence": 0.8},
            {"action": "reject", "confidence": 0.6},
            {"action": "accept", "confidence": 0.9},
        ]

        stats = suggestion_service.get_user_stats(user_id)
        assert stats["total_suggestions"] == 3
        assert stats["accepted_suggestions"] == 2
        assert stats["rejected_suggestions"] == 1
        assert stats["acceptance_rate"] == 66.66666666666666
        assert stats["average_confidence"] == 0.7666666666666666

    def test_suggestion_configuration_thresholds(self):
        """Test suggestion threshold configuration."""
        service = AnalysisBasedSuggestionService()

        # Check default thresholds
        assert service.suggestion_thresholds["eq_min_imbalance"] == 0.15
        assert service.suggestion_thresholds["compression_min_range"] == 10.0
        assert service.suggestion_thresholds["spatial_min_narrowness"] == 0.3
        assert service.suggestion_thresholds["quality_min_score"] == 0.6

    def test_analysis_based_suggestion_dataclass(self):
        """Test AnalysisBasedSuggestion dataclass functionality."""
        suggestion = AnalysisBasedSuggestion(
            id="test_suggestion",
            type="eq",
            title="Test EQ",
            description="Test description",
            confidence=0.8,
            reasoning="Test reasoning",
            analysis_basis={"test": "data"},
            agent_type="test_agent",
            target_track_id="track_1",
            parameters={"frequency": 1000, "gain": 2.0},
            priority="high",
        )

        # Test to_dict conversion
        suggestion_dict = suggestion.to_dict()
        assert suggestion_dict["id"] == "test_suggestion"
        assert suggestion_dict["type"] == "eq"
        assert suggestion_dict["confidence"] == 0.8
        assert suggestion_dict["analysis_basis"]["test"] == "data"
        assert suggestion_dict["parameters"]["frequency"] == 1000
        assert suggestion_dict["priority"] == "high"

        # Test timestamp generation
        assert suggestion.timestamp is not None


class TestIntegrationWithSuggestionService:
    """Test integration with the legacy suggestion service."""

    @pytest.mark.asyncio
    async def test_legacy_service_integration(self):
        """Test that the new service integrates properly with the legacy service."""
        from audio_agent.ai.suggestion_service import AISuggestionService

        # Create legacy service
        legacy_service = AISuggestionService()

        # Initially should use mock data
        assert legacy_service.use_real_analysis is False

        # Enable real analysis
        mock_integration = MagicMock(spec=EnhancedAnalyzerIntegration)
        mock_integration.initialized = True

        legacy_service.enable_real_analysis(mock_integration)
        assert legacy_service.use_real_analysis is True

        # Disable real analysis
        legacy_service.disable_real_analysis()
        assert legacy_service.use_real_analysis is False

    @pytest.mark.asyncio
    async def test_legacy_service_analysis_with_real_data(self):
        """Test legacy service analysis with real data."""
        from audio_agent.ai.suggestion_service import AISuggestionService

        # Create legacy service with mocked integration
        legacy_service = AISuggestionService()

        mock_integration = MagicMock(spec=EnhancedAnalyzerIntegration)
        mock_integration.initialized = True

        # Mock the analysis-based service to return specific results
        with patch(
            "audio_agent.ai.suggestion_service.analysis_based_suggestion_service"
        ) as mock_service:
            mock_service.analyze_audio_and_generate_suggestions = AsyncMock(
                return_value={
                    "success": True,
                    "analysis_id": "test_analysis",
                    "track_id": "test_track",
                    "audio_profile": {"frequency_balance": {"bass": 0.3}},
                    "suggestions": [
                        {
                            "id": "test_suggestion",
                            "type": "eq",
                            "title": "Test EQ",
                            "description": "Test description",
                            "confidence": 0.8,
                            "reasoning": "Test reasoning",
                            "analysis_basis": {"test": "data"},
                            "agentType": "test_agent",
                            "targetTrackId": "track_1",
                            "parameters": {"frequency": 1000},
                            "status": "pending",
                        }
                    ],
                    "analysis_summary": {"analyzers_used": ["spectral_analyzer"]},
                }
            )

            legacy_service.enable_real_analysis(mock_integration)

            # Test analysis with audio data (float array)
            test_audio = [0.1, 0.2, 0.3] * 1000
            result = await legacy_service.analyze_audio(
                audio_data=test_audio,
                analysis_type="comprehensive",
                context={"track_id": "test_track"},
            )

            assert result["success"] is True
            assert result["real_analysis"] is True
            assert len(result["suggestions"]) == 1
            assert result["suggestions"][0]["id"] == "test_suggestion"

    @pytest.mark.asyncio
    async def test_legacy_service_fallback_to_mock(self):
        """Test that legacy service falls back to mock when real analysis fails."""
        from audio_agent.ai.suggestion_service import AISuggestionService

        legacy_service = AISuggestionService()

        mock_integration = MagicMock(spec=EnhancedAnalyzerIntegration)
        mock_integration.initialized = True

        # Mock the analysis-based service to fail
        with patch(
            "audio_agent.ai.suggestion_service.analysis_based_suggestion_service"
        ) as mock_service:
            mock_service.analyze_audio_and_generate_suggestions = AsyncMock(
                return_value={"success": False, "error": "Analysis failed"}
            )

            legacy_service.enable_real_analysis(mock_integration)

            # Test analysis
            test_audio = [0.1, 0.2, 0.3] * 1000
            result = await legacy_service.analyze_audio(
                audio_data=test_audio, analysis_type="comprehensive"
            )

            assert result["success"] is True  # Should succeed with fallback
            assert result["real_analysis"] is False  # But use mock data


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
