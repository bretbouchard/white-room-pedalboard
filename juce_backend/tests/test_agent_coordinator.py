"""Tests for the LangGraph Agent Coordinator."""

import uuid
from unittest.mock import patch

import pytest

from audio_agent.core.agent_coordinator import AgentCoordinator
from audio_agent.models.agent import AgentAction, AgentMessage, AgentState, AgentType
from audio_agent.models.audio import (
    AudioAnalysis,
    AudioFeatures,
    AudioFormat,
    ChromaFeatures,
    DynamicFeatures,
    FrequencyBalance,
    HarmonicFeatures,
    MusicalContextFeatures,
    PerceptualFeatures,
    QualityFeatures,
    RhythmFeatures,
    SpatialFeatures,
    SpectralFeatures,
    TimbreFeatures,
)
from audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)
from audio_agent.models.plugin import PluginCategory, PluginFormat, PluginRecommendation
from audio_agent.models.user import UserPreferences


class TestAgentCoordinator:
    """Test cases for the LangGraph Agent Coordinator."""

    @pytest.fixture
    def coordinator(self):
        """Create an agent coordinator."""
        return AgentCoordinator()

    @pytest.fixture
    def audio_analysis(self):
        """Create a test audio analysis."""
        return AudioAnalysis(
            timestamp=1625097600.0,
            sample_rate=44100,
            duration=180.0,
            channels=2,
            format=AudioFormat.WAV,
            features=AudioFeatures(
                spectral=SpectralFeatures(
                    centroid=2000.0,
                    rolloff=8000.0,
                    flux=0.6,
                    bandwidth=4000.0,
                    flatness=0.5,
                    mfcc=[
                        0.0,
                        0.1,
                        0.2,
                        0.3,
                        0.4,
                        0.5,
                        0.6,
                        0.7,
                        0.8,
                        0.9,
                        1.0,
                        1.1,
                        1.2,
                    ],
                ),
                dynamic=DynamicFeatures(
                    rms_level=0.5,
                    peak_level=0.8,
                    dynamic_range=12.0,
                    transient_density=3.0,
                    zero_crossing_rate=0.4,
                ),
                harmonic=HarmonicFeatures(
                    fundamental_freq=440.0,
                    harmonic_content=[0.8, 0.6, 0.4, 0.2, 0.1],
                    inharmonicity=0.3,
                    pitch_clarity=0.7,
                ),
                perceptual=PerceptualFeatures(
                    loudness_lufs=-14.0,
                    perceived_brightness=0.6,
                    perceived_warmth=0.4,
                    roughness=0.3,
                    sharpness=1.0,
                ),
                spatial=SpatialFeatures(
                    stereo_width=0.8, phase_correlation=0.5, balance=0.0
                ),
                frequency_balance=FrequencyBalance(
                    bass=0.7, low_mid=0.5, mid=0.6, high_mid=0.7, treble=0.4
                ),
                chroma=ChromaFeatures(
                    chroma=[0.1] * 12,
                    chroma_normalized=[0.1] * 12,
                    root_note_likelihood=[0.1] * 12,
                    key="C major",
                ),
                musical_context=MusicalContextFeatures(
                    key="C major",
                    current_chord={"root": "C", "type": "major"},
                    mode="major",
                    time_signature="4/4",
                ),
                rhythm=RhythmFeatures(
                    tempo=120.0,
                    beats=[0.0, 0.5, 1.0],
                    beat_strength=[0.9, 0.8, 0.7],
                    meter="4/4",
                    time_signature="4/4",
                    tempo_confidence=0.9,
                ),
                timbre=TimbreFeatures(
                    instruments=[{"name": "piano", "confidence": 0.8}],
                    harmonic_percussive_ratio=0.6,
                    attack_strength=0.7,
                    sustain_length=0.5,
                    vibrato_rate=None,
                    vibrato_extent=None,
                ),
                quality=QualityFeatures(
                    issues=[],
                    overall_quality=0.9,
                    noise_floor=-70.0,
                    has_clipping=False,
                    dc_offset=0.0,
                    hum_frequency=None,
                ),
            ),
        )

    @pytest.fixture
    def composition_context(self):
        """Create a test composition context."""
        return CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.ELECTRONIC,
        )

    @pytest.fixture
    def user_preferences(self):
        """Create test user preferences."""
        return UserPreferences(
            clerk_user_id="user_123456789",  # Must be 10+ chars
            plugin_preferences={
                "preferred_brands": ["FabFilter", "Waves", "Valhalla"],
                "avoided_brands": [],
                "cpu_efficiency_priority": 0.5,
                "vintage_vs_modern": 0.3,
                "complexity_preference": 0.6,
            },
            mixing_preferences={
                "target_loudness": -14.0,
                "dynamic_range_preference": 0.7,
                "stereo_width_preference": 0.6,
                "frequency_balance_preference": {
                    "bass": 0.7,
                    "low_mid": 0.5,
                    "mid": 0.6,
                    "high_mid": 0.7,
                    "treble": 0.4,
                },
                "reverb_preference": 0.4,
            },
            learning_preferences={
                "feedback_frequency": 0.5,
                "explanation_detail": 0.8,
                "learning_rate": 0.3,
                "remember_corrections": True,
                "share_learning_data": False,
            },
        )

    def test_initialization(self, coordinator):
        """Test initialization of the agent coordinator."""
        assert coordinator is not None
        assert hasattr(coordinator, "graph")
        assert hasattr(coordinator, "performance_metrics")

        # Check that performance metrics are initialized for all agent types
        for agent_type in AgentType:
            assert agent_type in coordinator.performance_metrics

    def test_coordinator_node(self, coordinator):
        """Test the coordinator node function."""
        # Create a test state
        state = AgentState(session_id=str(uuid.uuid4()))

        # Process the state through the coordinator node
        updated_state = coordinator._coordinator_node(state)

        # Check that the state was updated
        assert updated_state is not None

        # Check that coordinator memory was created
        assert AgentType.COORDINATOR in updated_state.agent_memories

        # Check that performance metrics were updated
        assert coordinator.performance_metrics[AgentType.COORDINATOR].success_count == 1

    def test_specialist_nodes(self, coordinator, audio_analysis, composition_context):
        """Test the specialist node functions."""
        # Create a test state with messages for each specialist
        state = AgentState(
            session_id=str(uuid.uuid4()),
            audio_analysis=audio_analysis,
            composition_context=composition_context,
        )

        # Add test messages for each specialist
        for specialist in [
            AgentType.EQ,
            AgentType.DYNAMICS,
            AgentType.SPATIAL,
            AgentType.ARRANGEMENT,
        ]:
            message = AgentMessage(
                sender=AgentType.COORDINATOR,
                recipient=specialist,
                action=AgentAction.ANALYZE,
                message_id=str(uuid.uuid4()),
                content={},
            )
            state.add_message(message)

        # Process the state through each specialist node
        eq_state = coordinator._eq_specialist_node(state)
        dynamics_state = coordinator._dynamics_specialist_node(eq_state)
        spatial_state = coordinator._spatial_specialist_node(dynamics_state)
        arrangement_state = coordinator._arrangement_specialist_node(spatial_state)

        # Check that recommendations were added
        assert PluginCategory.EQ in arrangement_state.recommendations
        assert PluginCategory.COMPRESSOR in arrangement_state.recommendations
        assert PluginCategory.REVERB in arrangement_state.recommendations
        assert PluginCategory.UTILITY in arrangement_state.recommendations

        # Check that response messages were created
        coordinator_messages = [
            msg
            for msg in arrangement_state.messages
            if msg.recipient == AgentType.COORDINATOR
            and msg.action == AgentAction.RECOMMEND
        ]
        assert len(coordinator_messages) == 4

        # Check that performance metrics were updated
        assert coordinator.performance_metrics[AgentType.EQ].success_count == 1
        assert coordinator.performance_metrics[AgentType.DYNAMICS].success_count == 1
        assert coordinator.performance_metrics[AgentType.SPATIAL].success_count == 1
        assert coordinator.performance_metrics[AgentType.ARRANGEMENT].success_count == 1

    def test_conflict_resolution(self, coordinator):
        """Test the conflict resolution node."""
        # Create a test state with conflicts
        state = AgentState(session_id=str(uuid.uuid4()))

        # Add test conflicts
        state.add_conflict(
            {
                "conflict_id": str(uuid.uuid4()),
                "conflict_type": "eq_dynamics",
                "recommendations": [str(uuid.uuid4()), str(uuid.uuid4())],
                "description": "EQ and compressor settings may be working against each other",
            }
        )

        # Process the state through the conflict resolution node
        updated_state = coordinator._conflict_resolution_node(state)

        # Check that conflicts were resolved
        assert len(updated_state.conflicts) == 0

        # Check that resolution messages were created
        resolution_messages = [
            msg
            for msg in updated_state.messages
            if msg.action == AgentAction.RESOLVE_CONFLICT
        ]
        assert len(resolution_messages) == 1

        # Check that performance metrics were updated
        assert coordinator.performance_metrics[AgentType.COORDINATOR].success_count >= 1

    def test_routing_logic(self, coordinator):
        """Test the routing logic."""
        # Create a test state with messages for specialists
        state = AgentState(session_id=str(uuid.uuid4()))

        # Add a message for the EQ specialist
        state.add_message(
            AgentMessage(
                sender=AgentType.COORDINATOR,
                recipient=AgentType.EQ,
                action=AgentAction.ANALYZE,
                message_id=str(uuid.uuid4()),
                content={},
            )
        )

        # Check routing to EQ specialist
        next_node = coordinator._route_to_specialists(state)
        assert next_node == AgentType.EQ

        # Clear messages and add a conflict
        state.clear_messages()
        state.add_conflict(
            {
                "conflict_id": str(uuid.uuid4()),
                "conflict_type": "eq_dynamics",
                "recommendations": [str(uuid.uuid4()), str(uuid.uuid4())],
                "description": "EQ and compressor settings may be working against each other",
            }
        )

        # Check routing to conflict resolver
        next_node = coordinator._route_to_specialists(state)
        assert next_node == "conflict_resolver"

        # Clear conflicts and messages
        state.clear_conflicts()

        # Check routing to END when no messages or conflicts
        next_node = coordinator._route_to_specialists(state)
        assert next_node == "END"

    def test_process_method(
        self, coordinator, audio_analysis, composition_context, user_preferences
    ):
        """Test the process method."""
        # Mock the graph invoke method to return a state with recommendations
        with patch.object(coordinator.graph, "invoke") as mock_invoke:
            # Create a mock final state with recommendations
            final_state = AgentState(
                session_id=str(uuid.uuid4()),
                audio_analysis=audio_analysis,
                composition_context=composition_context,
                user_preferences=user_preferences,
            )

            # Add mock recommendations
            final_state.add_recommendation(
                PluginCategory.EQ,
                PluginRecommendation(
                    recommendation_id=str(uuid.uuid4()),
                    plugin_name="FabFilter Pro-Q 3",
                    plugin_category=PluginCategory.EQ,
                    plugin_format=PluginFormat.VST3,
                    confidence=0.85,
                    reasoning="Test reasoning",
                    style_context="ELECTRONIC",
                    alternative_plugins=["Waves SSL E-Channel"],
                    relevance_score=0.9,
                    recommender_agent=AgentType.EQ.value,
                    audio_context="full_mix",
                ),
            )

            # Set the mock to return our final state
            mock_invoke.return_value = final_state

            # Call the process method
            recommendations = coordinator.process(
                audio_analysis=audio_analysis,
                composition_context=composition_context,
                user_preferences=user_preferences,
            )

            # Check that recommendations were returned
            assert PluginCategory.EQ in recommendations
            assert len(recommendations[PluginCategory.EQ]) == 1
            assert (
                recommendations[PluginCategory.EQ][0].plugin_name == "FabFilter Pro-Q 3"
            )

    def test_get_performance_stats(self, coordinator):
        """Test the get_performance_stats method."""
        # Update some performance metrics
        coordinator.performance_metrics[AgentType.COORDINATOR].update_success(0.1)
        coordinator.performance_metrics[AgentType.EQ].update_success(0.2)
        coordinator.performance_metrics[AgentType.DYNAMICS].update_failure(0.3)

        # Get performance stats
        stats = coordinator.get_performance_stats()

        # Check that stats were returned for all agent types
        for agent_type in AgentType:
            assert agent_type.value in stats
            assert "success_count" in stats[agent_type.value]
            assert "failure_count" in stats[agent_type.value]
            assert "success_rate" in stats[agent_type.value]
            assert "avg_response_time" in stats[agent_type.value]
            assert "is_healthy" in stats[agent_type.value]

        # Check specific values
        assert stats[AgentType.COORDINATOR.value]["success_count"] == 1
        assert stats[AgentType.EQ.value]["success_count"] == 1
        assert stats[AgentType.DYNAMICS.value]["failure_count"] == 1
