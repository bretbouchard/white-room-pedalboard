"""Tests for the Agent Communication and State Management."""

import os
import tempfile
import uuid

import pytest

from audio_agent.core.agent_communication import (
    AgentCommunicationManager,
    AgentLearningSystem,
    AgentStateManager,
    ConflictResolutionManager,
)
from audio_agent.models.agent import AgentAction, AgentState, AgentType
from audio_agent.models.plugin import PluginCategory, PluginFormat, PluginRecommendation


class TestAgentCommunication:
    """Test cases for the Agent Communication and State Management."""

    @pytest.fixture
    def communication_manager(self):
        """Create an agent communication manager."""
        return AgentCommunicationManager()

    @pytest.fixture
    def state_manager(self):
        """Create an agent state manager with temporary storage."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield AgentStateManager(storage_dir=temp_dir)

    @pytest.fixture
    def learning_system(self):
        """Create an agent learning system with temporary storage."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield AgentLearningSystem(storage_dir=temp_dir)

    @pytest.fixture
    def conflict_manager(self):
        """Create a conflict resolution manager."""
        return ConflictResolutionManager()

    @pytest.fixture
    def session_id(self):
        """Create a test session ID."""
        return str(uuid.uuid4())

    @pytest.fixture
    def plugin_recommendations(self):
        """Create test plugin recommendations."""
        eq_rec = PluginRecommendation(
            recommendation_id=str(uuid.uuid4()),
            plugin_name="FabFilter Pro-Q 3",
            plugin_category=PluginCategory.EQ,
            plugin_format=PluginFormat.VST3,
            confidence=0.85,
            relevance_score=0.80,
            reasoning="Test EQ reasoning",
            style_context="ELECTRONIC",
            alternative_plugins=["Waves SSL E-Channel"],
            recommender_agent="test_agent",
        )

        comp_rec = PluginRecommendation(
            recommendation_id=str(uuid.uuid4()),
            plugin_name="FabFilter Pro-C 2",
            plugin_category=PluginCategory.COMPRESSOR,
            plugin_format=PluginFormat.VST3,
            confidence=0.82,
            relevance_score=0.78,
            reasoning="Test compressor reasoning",
            style_context="ELECTRONIC",
            alternative_plugins=["Waves CLA-76"],
            recommender_agent="test_agent",
        )

        reverb_rec1 = PluginRecommendation(
            recommendation_id=str(uuid.uuid4()),
            plugin_name="Valhalla Room",
            plugin_category=PluginCategory.REVERB,
            plugin_format=PluginFormat.VST3,
            confidence=0.88,
            relevance_score=0.85,
            reasoning="Test reverb reasoning",
            style_context="ELECTRONIC",
            alternative_plugins=["FabFilter Pro-R"],
            recommender_agent="test_agent",
        )

        reverb_rec2 = PluginRecommendation(
            recommendation_id=str(uuid.uuid4()),
            plugin_name="FabFilter Pro-R",
            plugin_category=PluginCategory.REVERB,
            plugin_format=PluginFormat.VST3,
            confidence=0.75,
            relevance_score=0.72,
            reasoning="Test reverb reasoning",
            style_context="ELECTRONIC",
            alternative_plugins=["Valhalla Room"],
            recommender_agent="test_agent",
        )

        return {
            "eq": eq_rec,
            "compressor": comp_rec,
            "reverb1": reverb_rec1,
            "reverb2": reverb_rec2,
        }

    def test_communication_manager_create_message(
        self, communication_manager, session_id
    ):
        """Test creating a message with the communication manager."""
        message = communication_manager.create_message(
            sender=AgentType.COORDINATOR,
            recipient=AgentType.EQ,
            action=AgentAction.ANALYZE,
            content={"test": "content"},
            session_id=session_id,
        )

        # Check that the message was created correctly
        assert message is not None
        assert message.sender == AgentType.COORDINATOR
        assert message.recipient == AgentType.EQ
        assert message.action == AgentAction.ANALYZE
        assert message.content == {"test": "content"}
        assert message.message_id is not None

        # Check that the message was stored in history
        assert session_id in communication_manager.message_history
        assert len(communication_manager.message_history[session_id]) == 1
        assert communication_manager.message_history[session_id][0] == message

    def test_communication_manager_get_messages(
        self, communication_manager, session_id
    ):
        """Test getting messages from the communication manager."""
        # Create test messages
        message1 = communication_manager.create_message(
            sender=AgentType.COORDINATOR,
            recipient=AgentType.EQ,
            action=AgentAction.ANALYZE,
            content={"test": "content1"},
            session_id=session_id,
        )

        message2 = communication_manager.create_message(
            sender=AgentType.EQ,
            recipient=AgentType.COORDINATOR,
            action=AgentAction.RECOMMEND,
            content={"test": "content2"},
            session_id=session_id,
        )

        # Test getting all messages
        all_messages = communication_manager.get_messages(session_id)
        assert len(all_messages) == 2

        # Test filtering by recipient
        eq_messages = communication_manager.get_messages(
            session_id, recipient=AgentType.EQ
        )
        assert len(eq_messages) == 1
        assert eq_messages[0] == message1

        # Test filtering by sender
        eq_sent_messages = communication_manager.get_messages(
            session_id, sender=AgentType.EQ
        )
        assert len(eq_sent_messages) == 1
        assert eq_sent_messages[0] == message2

        # Test filtering by action
        analyze_messages = communication_manager.get_messages(
            session_id, action=AgentAction.ANALYZE
        )
        assert len(analyze_messages) == 1
        assert analyze_messages[0] == message1

    def test_communication_manager_clear_messages(
        self, communication_manager, session_id
    ):
        """Test clearing messages from the communication manager."""
        # Create test messages
        communication_manager.create_message(
            sender=AgentType.COORDINATOR,
            recipient=AgentType.EQ,
            action=AgentAction.ANALYZE,
            content={"test": "content"},
            session_id=session_id,
        )

        # Check that messages exist
        assert len(communication_manager.get_messages(session_id)) == 1

        # Clear messages
        communication_manager.clear_messages(session_id)

        # Check that messages were cleared
        assert len(communication_manager.get_messages(session_id)) == 0

    def test_communication_manager_export_import(
        self, communication_manager, session_id
    ):
        """Test exporting and importing messages."""
        # Create test messages
        communication_manager.create_message(
            sender=AgentType.COORDINATOR,
            recipient=AgentType.EQ,
            action=AgentAction.ANALYZE,
            content={"test": "content"},
            session_id=session_id,
        )

        # Export messages
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as temp_file:
            export_path = temp_file.name

        try:
            communication_manager.export_messages(session_id, export_path)

            # Clear messages
            communication_manager.clear_messages(session_id)
            assert len(communication_manager.get_messages(session_id)) == 0

            # Import messages
            communication_manager.import_messages(export_path, session_id)

            # Check that messages were imported
            imported_messages = communication_manager.get_messages(session_id)
            assert len(imported_messages) == 1
            assert imported_messages[0].sender == AgentType.COORDINATOR
            assert imported_messages[0].recipient == AgentType.EQ
            assert imported_messages[0].action == AgentAction.ANALYZE
            assert imported_messages[0].content == {"test": "content"}
        finally:
            # Clean up
            if os.path.exists(export_path):
                os.remove(export_path)

    def test_state_manager_get_memory(self, state_manager, session_id):
        """Test getting agent memory from the state manager."""
        # Get memory for an agent
        memory = state_manager.get_memory(session_id, AgentType.EQ)

        # Check that memory was created
        assert memory is not None
        assert memory.agent_type == AgentType.EQ
        assert memory.context == {}
        assert memory.decisions == []
        assert memory.user_feedback == {}

    def test_state_manager_update_memory(self, state_manager, session_id):
        """Test updating agent memory."""
        # Update memory with context
        memory = state_manager.update_memory(
            session_id=session_id,
            agent_type=AgentType.EQ,
            context_updates={"test_key": "test_value"},
        )

        # Check that context was updated
        assert memory.context == {"test_key": "test_value"}

        # Update memory with decision
        decision = {"type": "eq_recommendation", "plugin": "FabFilter Pro-Q 3"}
        memory = state_manager.update_memory(
            session_id=session_id, agent_type=AgentType.EQ, decision=decision
        )

        # Check that decision was added
        assert len(memory.decisions) == 1
        assert memory.decisions[0] == decision

        # Update memory with user feedback
        decision_id = "test_decision_id"
        feedback = {"rating": 5, "comments": "Great recommendation!"}
        memory = state_manager.update_memory(
            session_id=session_id,
            agent_type=AgentType.EQ,
            user_feedback=feedback,
            decision_id=decision_id,
        )

        # Check that user feedback was added
        assert decision_id in memory.user_feedback
        assert len(memory.user_feedback[decision_id]) == 1
        assert memory.user_feedback[decision_id][0] == feedback

    def test_state_manager_save_load_state(self, state_manager, session_id):
        """Test saving and loading agent state."""
        # Create and update memory
        state_manager.update_memory(
            session_id=session_id,
            agent_type=AgentType.EQ,
            context_updates={"test_key": "test_value"},
            decision={"type": "eq_recommendation", "plugin": "FabFilter Pro-Q 3"},
        )

        # Save state
        file_path = state_manager.save_state(session_id)

        # Check that file was created
        assert os.path.exists(file_path)

        # Read and print the content for debugging
        with open(file_path) as f:
            content = f.read()
            print(f"Saved state content: {content}")

        # Clear state
        state_manager.clear_state(session_id)

        # Check that state was cleared
        assert session_id not in state_manager.agent_memories

        # Load state
        success = state_manager.load_state(session_id)

        # Print debug info
        print(f"Load success: {success}")
        print(f"Current agent_memories: {state_manager.agent_memories}")

        # Check that state was loaded
        assert success
        assert session_id in state_manager.agent_memories

        # Check that memory was restored correctly
        # In the loaded state, the keys are AgentType enum instances
        assert len(state_manager.agent_memories[session_id]) == 1

        # Get the first (and only) agent type from the loaded state
        loaded_agent_type = next(iter(state_manager.agent_memories[session_id].keys()))

        # Verify it's not None (it should be an AgentType enum instance)
        assert loaded_agent_type is not None
        print(f"Loaded agent type: {loaded_agent_type}")

        memory = state_manager.agent_memories[session_id][loaded_agent_type]
        assert memory.context == {"test_key": "test_value"}
        assert len(memory.decisions) == 1
        assert memory.decisions[0]["type"] == "eq_recommendation"
        assert memory.decisions[0]["plugin"] == "FabFilter Pro-Q 3"

    def test_learning_system_process_feedback(self, learning_system):
        """Test processing feedback in the learning system."""
        # Create test decision and feedback
        decision = {
            "type": "eq_recommendation",
            "plugin_name": "FabFilter Pro-Q 3",
            "plugin_category": "eq",
            "style": "ELECTRONIC",
        }

        feedback = {
            "type": "positive",
            "rating": 5,
            "comments": "Great recommendation!",
        }

        # Process feedback
        learning_system.process_feedback(AgentType.EQ, decision, feedback, "user_123")

        # Check that feedback was added to history
        assert len(learning_system.feedback_history[AgentType.EQ]) == 1
        feedback_entry = learning_system.feedback_history[AgentType.EQ][0]
        assert feedback_entry["decision"] == decision
        assert feedback_entry["feedback_type"] == "positive"
        assert feedback_entry["feedback_rating"] == 5
        assert feedback_entry["user_id"] == "user_123"

        # Check that learning model was updated
        model = learning_system.learning_models[AgentType.EQ]
        assert "eq_recommendation" in model["preference_weights"]
        assert (
            model["preference_weights"]["eq_recommendation"] > 0.5
        )  # Should increase for positive feedback

        # Check pattern matching
        pattern_key = learning_system._extract_pattern_key(decision)
        assert pattern_key in model["success_patterns"]
        assert model["success_patterns"][pattern_key] == 1

    def test_learning_system_get_recommendation_adjustment(self, learning_system):
        """Test getting recommendation adjustments from the learning system."""
        # Create test decision and feedback
        decision = {
            "type": "eq_recommendation",
            "plugin_name": "FabFilter Pro-Q 3",
            "plugin_category": "eq",
            "style": "ELECTRONIC",
        }

        feedback = {
            "type": "positive",
            "rating": 5,
            "comments": "Great recommendation!",
        }

        # Process feedback
        learning_system.process_feedback(AgentType.EQ, decision, feedback, "user_123")

        # Get recommendation adjustment using the exact same context as feedback
        adjustment = learning_system.get_recommendation_adjustment(
            agent_type=AgentType.EQ,
            decision_type="eq_recommendation",
            context=decision,  # Use the same decision dict that was used for feedback
        )

        # Check adjustment
        assert "preference_weight" in adjustment
        assert (
            adjustment["preference_weight"] > 0.5
        )  # Should be increased for positive feedback
        assert "confidence_adjustment" in adjustment
        # Note: confidence_adjustment could be 0.0 if there are no success/failure patterns
        assert adjustment["success_count"] == 1
        assert adjustment["failure_count"] == 0

    def test_conflict_manager_detect_conflicts(
        self, conflict_manager, plugin_recommendations
    ):
        """Test detecting conflicts with the conflict manager."""
        # Create agent state with recommendations
        state = AgentState(session_id=str(uuid.uuid4()))

        # Add recommendations
        state.recommendations = {
            PluginCategory.EQ: [plugin_recommendations["eq"]],
            PluginCategory.COMPRESSOR: [plugin_recommendations["compressor"]],
            PluginCategory.REVERB: [
                plugin_recommendations["reverb1"],
                plugin_recommendations["reverb2"],
            ],
        }

        # Detect conflicts
        conflicts = conflict_manager.detect_conflicts(state)

        # Check that conflicts were detected
        assert len(conflicts) > 0

        # Check for multiple reverbs conflict
        reverb_conflicts = [
            c for c in conflicts if c["conflict_type"] == "multiple_reverbs"
        ]
        assert len(reverb_conflicts) == 1
        assert len(reverb_conflicts[0]["recommendations"]) == 2
        assert reverb_conflicts[0]["recommendations"][0] in [
            plugin_recommendations["reverb1"].recommendation_id,
            plugin_recommendations["reverb2"].recommendation_id,
        ]

    def test_conflict_manager_resolve_conflict(
        self, conflict_manager, plugin_recommendations
    ):
        """Test resolving conflicts with the conflict manager."""
        # Create agent state with recommendations
        state = AgentState(session_id=str(uuid.uuid4()))

        # Add recommendations
        state.recommendations = {
            PluginCategory.REVERB: [
                plugin_recommendations["reverb1"],
                plugin_recommendations["reverb2"],
            ]
        }

        # Create conflict
        conflict = {
            "conflict_id": str(uuid.uuid4()),
            "conflict_type": "multiple_reverbs",
            "recommendations": [
                plugin_recommendations["reverb1"].recommendation_id,
                plugin_recommendations["reverb2"].recommendation_id,
            ],
            "description": "Multiple reverb plugins may cause phase issues or excessive ambience",
            "severity": 0.8,
        }

        # Resolve conflict
        resolution = conflict_manager.resolve_conflict(conflict, state)

        # Check resolution
        assert resolution["action"] == "remove_reverbs"
        assert "keep_recommendation_id" in resolution
        assert "remove_recommendation_ids" in resolution
        assert len(resolution["remove_recommendation_ids"]) == 1

        # The higher confidence reverb should be kept
        if (
            plugin_recommendations["reverb1"].confidence
            > plugin_recommendations["reverb2"].confidence
        ):
            assert (
                resolution["keep_recommendation_id"]
                == plugin_recommendations["reverb1"].recommendation_id
            )
            assert (
                resolution["remove_recommendation_ids"][0]
                == plugin_recommendations["reverb2"].recommendation_id
            )
        else:
            assert (
                resolution["keep_recommendation_id"]
                == plugin_recommendations["reverb2"].recommendation_id
            )
            assert (
                resolution["remove_recommendation_ids"][0]
                == plugin_recommendations["reverb1"].recommendation_id
            )
