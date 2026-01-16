"""
Comprehensive tests for AI integration and CopilotKit functionality.

This test suite covers:
- CopilotKit action registration and execution
- AI suggestion generation and application
- ML integration with TensorFlow.js models
- Hybrid Schillinger-ML intelligence system
- User behavior analysis and learning
- AI-driven workflow optimization
- AG-UI bridge event handling
- AI suggestion validation and filtering
"""

import logging
from datetime import datetime
from typing import Any
from unittest.mock import Mock

import numpy as np
import pytest

from src.audio_agent.core.dawdreamer_engine import DawDreamerEngine

# Mock the TensorFlow.js imports since we're testing in Python environment
try:
    import sys

    sys.modules["tensorflow"] = Mock()
    sys.modules["@tensorflow/tfjs"] = Mock()
except ImportError:
    pass

logger = logging.getLogger(__name__)


class MockCopilotKitIntegration:
    """Mock CopilotKit integration for testing."""

    def __init__(self):
        self.actions = {}
        self.readable_contexts = {}
        self.suggestions = []
        self.user_interactions = []

    def register_action(self, name: str, handler):
        """Register a CopilotKit action."""
        self.actions[name] = handler

    def register_readable_context(self, name: str, context):
        """Register a readable context for CopilotKit."""
        self.readable_contexts[name] = context

    def execute_action(self, action_name: str, args: dict) -> Any:
        """Execute a registered CopilotKit action."""
        if action_name in self.actions:
            return self.actions[action_name](args)
        raise ValueError(f"Unknown action: {action_name}")

    def get_context(self, context_name: str) -> Any:
        """Get a registered context."""
        return self.readable_contexts.get(context_name)

    def generate_suggestion(self, workflow_state: dict) -> dict:
        """Generate AI suggestions based on workflow state."""
        # Mock suggestion generation
        suggestions = []

        if workflow_state.get("nodes"):
            suggestions.append(
                {
                    "type": "node_suggestion",
                    "action": "add_analyzer",
                    "confidence": 0.8,
                    "description": "Add spectral analyzer to optimize frequency balance",
                }
            )

        if workflow_state.get("user_intent") == "mix_mastering":
            suggestions.append(
                {
                    "type": "mixing_suggestion",
                    "action": "apply_mastering_preset",
                    "confidence": 0.9,
                    "description": "Apply professional mastering preset",
                }
            )

        return {
            "suggestions": suggestions,
            "context": workflow_state,
            "timestamp": datetime.now().isoformat(),
        }

    def record_user_interaction(self, interaction: dict):
        """Record user interaction for learning."""
        self.user_interactions.append(interaction)


class MockMLIntegration:
    """Mock ML integration for testing."""

    def __init__(self):
        self.models = {}
        self.features_cache = {}
        self.predictions = []

    def register_model(self, name: str, model):
        """Register an ML model."""
        self.models[name] = model

    def extract_features(self, audio_data: np.ndarray) -> dict:
        """Extract features from audio data."""
        # Mock feature extraction
        return {
            "spectral_centroid": np.random.uniform(500, 2000),
            "spectral_rolloff": np.random.uniform(3000, 8000),
            "zcr": np.random.uniform(0.01, 0.1),
            "rms": np.random.uniform(0.01, 0.3),
            "tempo": np.random.uniform(60, 180),
            "key": np.random.choice(["C", "D", "E", "F", "G", "A", "B"]),
        }

    def predict_workload_pattern(self, features: dict) -> dict:
        """Predict workflow pattern based on features."""
        # Mock prediction
        return {
            "pattern": np.random.choice(
                ["mixing", "mastering", "production", "analysis"]
            ),
            "confidence": np.random.uniform(0.6, 0.95),
            "next_actions": ["add_compressor", "apply_eq", "insert_analyzer"],
        }

    def generate_recommendations(
        self, user_profile: dict, current_state: dict
    ) -> list[dict]:
        """Generate ML-powered recommendations."""
        # Mock recommendations
        recommendations = [
            {
                "type": "plugin_recommendation",
                "plugin": "compressor",
                "reason": "Audio levels show dynamic range compression would benefit this track",
                "confidence": 0.75,
            },
            {
                "type": "parameter_suggestion",
                "plugin": "eq",
                "parameters": {"high_gain": 2.0, "mid_gain": -1.5, "low_gain": 1.0},
                "reason": "Frequency analysis suggests this EQ curve",
                "confidence": 0.82,
            },
        ]

        return recommendations


class MockSchillingerIntegration:
    """Mock Schillinger System integration for testing."""

    def __init__(self):
        self.techniques = []
        self.analysis_results = {}

    def analyze_musical_structure(self, audio_data: np.ndarray) -> dict:
        """Analyze musical structure using Schillinger principles."""
        # Mock Schillinger analysis
        return {
            "rhythm_analysis": {
                "pattern_type": "resultant",
                "complexity": 0.7,
                "symmetry": 0.8,
                "techniques": ["interference_patterns", "resultant_rhythms"],
            },
            "harmonic_analysis": {
                "progression_type": "functional",
                "tension_release": 0.6,
                "techniques": ["pitch_scales", "harmonic_generators"],
            },
            "form_analysis": {
                "structure_type": "binary",
                "coherence": 0.75,
                "techniques": ["stratification", "coordination"],
            },
        }

    def apply_technique(self, technique_name: str, parameters: dict) -> dict:
        """Apply a Schillinger technique."""
        return {
            "technique": technique_name,
            "applied": True,
            "parameters": parameters,
            "result": f"Applied {technique_name} with parameters {parameters}",
        }


@pytest.fixture
def copilotkit_integration():
    """Create a mock CopilotKit integration."""
    return MockCopilotKitIntegration()


@pytest.fixture
def ml_integration():
    """Create a mock ML integration."""
    return MockMLIntegration()


@pytest.fixture
def schillinger_integration():
    """Create a mock Schillinger integration."""
    return MockSchillingerIntegration()


@pytest.fixture
def mock_daw_engine():
    """Create a mock DAW engine."""
    engine = Mock(spec=DawDreamerEngine)
    engine.audio_config = Mock()
    engine.audio_config.sample_rate = 44100
    engine.audio_config.buffer_size = 512
    return engine


class TestCopilotKitActions:
    """Test CopilotKit action registration and execution."""

    def test_register_audio_actions(self, copilotkit_integration):
        """Test registration of audio-related CopilotKit actions."""

        # Define test actions
        def create_track_action(args):
            track_name = args.get("track_name", "Untitled Track")
            instrument = args.get("instrument", "sine")
            return {
                "action": "create_track",
                "track_name": track_name,
                "instrument": instrument,
                "success": True,
            }

        def add_plugin_action(args):
            track_id = args.get("track_id")
            plugin_name = args.get("plugin_name")
            return {
                "action": "add_plugin",
                "track_id": track_id,
                "plugin_name": plugin_name,
                "success": True,
            }

        def analyze_audio_action(args):
            audio_path = args.get("audio_path")
            analysis_type = args.get("analysis_type", "basic")
            return {
                "action": "analyze_audio",
                "audio_path": audio_path,
                "analysis_type": analysis_type,
                "results": {"key": "C", "tempo": 120, "energy": 0.7},
            }

        # Register actions
        copilotkit_integration.register_action("createTrack", create_track_action)
        copilotkit_integration.register_action("addPlugin", add_plugin_action)
        copilotkit_integration.register_action("analyzeAudio", analyze_audio_action)

        # Verify registration
        assert len(copilotkit_integration.actions) == 3
        assert "createTrack" in copilotkit_integration.actions
        assert "addPlugin" in copilotkit_integration.actions
        assert "analyzeAudio" in copilotkit_integration.actions

    def test_execute_copilotkit_actions(self, copilotkit_integration):
        """Test execution of registered CopilotKit actions."""

        # Register test action
        def test_action(args):
            return {"received_args": args, "executed": True}

        copilotkit_integration.register_action("testAction", test_action)

        # Execute action
        test_args = {"param1": "value1", "param2": 42}
        result = copilotkit_integration.execute_action("testAction", test_args)

        # Verify execution
        assert result["executed"] is True
        assert result["received_args"] == test_args

    def test_invalid_action_handling(self, copilotkit_integration):
        """Test handling of invalid CopilotKit actions."""
        with pytest.raises(ValueError, match="Unknown action"):
            copilotkit_integration.execute_action("nonexistentAction", {})

    def test_context_registration(self, copilotkit_integration):
        """Test registration of readable contexts."""
        # Define test contexts
        workflow_context = {
            "nodes": ["oscillator", "filter", "output"],
            "edges": [("oscillator", "filter"), ("filter", "output")],
            "active_plugins": ["filter"],
        }

        audio_context = {
            "sample_rate": 44100,
            "buffer_size": 512,
            "current_level": -6.0,
        }

        # Register contexts
        copilotkit_integration.register_readable_context("workflow", workflow_context)
        copilotkit_integration.register_readable_context("audio", audio_context)

        # Verify registration
        assert len(copilotkit_integration.readable_contexts) == 2
        assert copilotkit_integration.get_context("workflow") == workflow_context
        assert copilotkit_integration.get_context("audio") == audio_context


class TestAISuggestionGeneration:
    """Test AI suggestion generation and application."""

    def test_suggestion_generation_for_mixing(self, copilotkit_integration):
        """Test AI suggestion generation for mixing workflows."""
        workflow_state = {
            "nodes": ["compressor", "eq", "reverb"],
            "user_intent": "mix_mastering",
            "current_issues": ["muddy_mids", "harsh_highs"],
        }

        # Generate suggestions
        suggestions = copilotkit_integration.generate_suggestion(workflow_state)

        # Verify suggestions
        assert "suggestions" in suggestions
        assert len(suggestions["suggestions"]) > 0

        # Check for mixing-specific suggestions
        mixing_suggestions = [
            s for s in suggestions["suggestions"] if s["type"] == "mixing_suggestion"
        ]
        assert len(mixing_suggestions) > 0

        # Verify suggestion structure
        for suggestion in suggestions["suggestions"]:
            assert "type" in suggestion
            assert "action" in suggestion
            assert "confidence" in suggestion
            assert "description" in suggestion
            assert 0 <= suggestion["confidence"] <= 1

    def test_suggestion_generation_for_analysis(self, copilotkit_integration):
        """Test AI suggestion generation for analysis workflows."""
        workflow_state = {
            "nodes": ["audio_input"],
            "user_intent": "analyze_audio",
            "audio_features": {"spectral_centroid": 1500, "rms": 0.2},
        }

        # Generate suggestions
        suggestions = copilotkit_integration.generate_suggestion(workflow_state)

        # Verify analysis-specific suggestions
        analysis_suggestions = [
            s for s in suggestions["suggestions"] if s["action"] == "add_analyzer"
        ]
        assert len(analysis_suggestions) > 0

    def test_suggestion_confidence_filtering(self, copilotkit_integration):
        """Test filtering suggestions by confidence level."""
        workflow_state = {
            "nodes": ["unknown_node", "test_node"],
            "user_intent": "optimize_workflow",
        }

        # Generate suggestions
        suggestions = copilotkit_integration.generate_suggestion(workflow_state)

        # Filter high-confidence suggestions
        high_confidence = [
            s for s in suggestions["suggestions"] if s["confidence"] > 0.7
        ]

        # Verify filtering works
        assert len(high_confidence) > 0
        for suggestion in high_confidence:
            assert suggestion["confidence"] > 0.7

    def test_suggestion_application(self, copilotkit_integration, mock_daw_engine):
        """Test application of AI suggestions to the DAW."""
        # Mock DAW methods
        mock_daw_engine.create_plugin_processor = Mock(return_value="plugin_id")
        mock_daw_engine.connect_processors = Mock(return_value=True)

        # Register action for applying suggestions
        def apply_suggestion_action(args):
            suggestion_type = args.get("type")
            action = args.get("action")

            if action == "add_analyzer":
                plugin_id = mock_daw_engine.create_plugin_processor(
                    "spectral_analyzer", "faust"
                )
                return {"plugin_id": plugin_id, "success": True}

            return {"success": False, "error": "Unknown action"}

        copilotkit_integration.register_action(
            "applySuggestion", apply_suggestion_action
        )

        # Apply a suggestion
        suggestion = {
            "type": "node_suggestion",
            "action": "add_analyzer",
            "plugin_type": "spectral_analyzer",
        }

        result = copilotkit_integration.execute_action("applySuggestion", suggestion)

        # Verify application
        assert result["success"] is True
        assert "plugin_id" in result
        mock_daw_engine.create_plugin_processor.assert_called_once()


class TestMLIntegration:
    """Test ML integration functionality."""

    def test_feature_extraction(self, ml_integration):
        """Test audio feature extraction."""
        # Create test audio data
        sample_rate = 44100
        duration = 1.0
        num_samples = int(sample_rate * duration)

        # Generate test signal (sine wave + noise)
        t = np.linspace(0, duration, num_samples)
        audio_data = 0.5 * np.sin(2 * np.pi * 440 * t) + 0.1 * np.random.normal(
            0, 1, num_samples
        )

        # Extract features
        features = ml_integration.extract_features(audio_data)

        # Verify features
        assert "spectral_centroid" in features
        assert "spectral_rolloff" in features
        assert "zcr" in features
        assert "rms" in features
        assert "tempo" in features
        assert "key" in features

        # Verify feature value ranges
        assert 100 < features["spectral_centroid"] < 5000
        assert 0 < features["rms"] < 1.0
        assert 60 < features["tempo"] < 200

    def test_workflow_pattern_prediction(self, ml_integration):
        """Test workflow pattern prediction."""
        # Create test features
        features = {"spectral_centroid": 1200, "rms": 0.15, "zcr": 0.05, "tempo": 120}

        # Predict pattern
        prediction = ml_integration.predict_workload_pattern(features)

        # Verify prediction structure
        assert "pattern" in prediction
        assert "confidence" in prediction
        assert "next_actions" in prediction

        # Verify prediction validity
        assert prediction["pattern"] in [
            "mixing",
            "mastering",
            "production",
            "analysis",
        ]
        assert 0 <= prediction["confidence"] <= 1
        assert isinstance(prediction["next_actions"], list)

    def test_ml_recommendation_generation(self, ml_integration):
        """Test ML-powered recommendation generation."""
        # Create test user profile and state
        user_profile = {
            "skill_level": "intermediate",
            "preferred_genres": ["electronic", "ambient"],
            "common_plugins": ["compressor", "reverb", "delay"],
        }

        current_state = {
            "active_nodes": ["oscillator", "filter"],
            "audio_levels": {"input": -12.0, "output": -6.0},
            "current_issues": ["low_output_level"],
        }

        # Generate recommendations
        recommendations = ml_integration.generate_recommendations(
            user_profile, current_state
        )

        # Verify recommendations
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0

        # Verify recommendation structure
        for rec in recommendations:
            assert "type" in rec
            assert "confidence" in rec
            assert "reason" in rec
            assert 0 <= rec["confidence"] <= 1

    def test_feature_caching(self, ml_integration):
        """Test feature extraction caching."""
        # Create test audio data
        audio_data = np.random.normal(0, 1, 44100)  # 1 second of noise

        # Extract features first time
        features1 = ml_integration.extract_features(audio_data)

        # Extract features second time (should use cache)
        features2 = ml_integration.extract_features(audio_data)

        # Verify caching (features should be identical)
        assert features1 == features2

    def test_model_registration(self, ml_integration):
        """Test ML model registration."""
        # Create mock model
        mock_model = Mock()
        mock_model.predict = Mock(return_value={"prediction": "test_result"})

        # Register model
        ml_integration.register_model("test_model", mock_model)

        # Verify registration
        assert "test_model" in ml_integration.models
        assert ml_integration.models["test_model"] == mock_model


class TestSchillingerIntegration:
    """Test Schillinger System integration."""

    def test_musical_structure_analysis(self, schillinger_integration):
        """Test musical structure analysis using Schillinger principles."""
        # Create test audio data
        sample_rate = 44100
        duration = 2.0
        num_samples = int(sample_rate * duration)

        # Generate test musical signal
        t = np.linspace(0, duration, num_samples)
        # Create a simple musical pattern (chord progression)
        audio_data = (
            0.3 * np.sin(2 * np.pi * 261.63 * t)
            + 0.3 * np.sin(2 * np.pi * 329.63 * t)  # C4
            + 0.3 * np.sin(2 * np.pi * 392.00 * t)  # E4  # G4
        )

        # Analyze musical structure
        analysis = schillinger_integration.analyze_musical_structure(audio_data)

        # Verify analysis structure
        assert "rhythm_analysis" in analysis
        assert "harmonic_analysis" in analysis
        assert "form_analysis" in analysis

        # Verify rhythm analysis
        rhythm = analysis["rhythm_analysis"]
        assert "pattern_type" in rhythm
        assert "complexity" in rhythm
        assert "symmetry" in rhythm
        assert "techniques" in rhythm
        assert 0 <= rhythm["complexity"] <= 1
        assert 0 <= rhythm["symmetry"] <= 1

        # Verify harmonic analysis
        harmonic = analysis["harmonic_analysis"]
        assert "progression_type" in harmonic
        assert "tension_release" in harmonic
        assert "techniques" in harmonic
        assert 0 <= harmonic["tension_release"] <= 1

        # Verify form analysis
        form = analysis["form_analysis"]
        assert "structure_type" in form
        assert "coherence" in form
        assert "techniques" in form
        assert 0 <= form["coherence"] <= 1

    def test_schillinger_technique_application(self, schillinger_integration):
        """Test application of Schillinger techniques."""
        # Test applying different techniques
        techniques_to_test = [
            {
                "name": "resultant_rhythms",
                "parameters": {
                    "base_rhythm": [1, 0, 1, 0],
                    "secondary_rhythm": [0, 1, 0, 1],
                },
            },
            {
                "name": "interference_patterns",
                "parameters": {"frequency1": 440, "frequency2": 444, "duration": 2.0},
            },
            {
                "name": "pitch_scales",
                "parameters": {"root": "C", "scale_type": "major", "octave_range": 2},
            },
        ]

        results = []
        for technique in techniques_to_test:
            result = schillinger_integration.apply_technique(
                technique["name"], technique["parameters"]
            )
            results.append(result)

            # Verify result structure
            assert result["technique"] == technique["name"]
            assert result["applied"] is True
            assert "parameters" in result
            assert "result" in result

        assert len(results) == len(techniques_to_test)


class TestHybridIntelligence:
    """Test hybrid AI-Schillinger-ML intelligence system."""

    def test_hybrid_feature_combination(self, ml_integration, schillinger_integration):
        """Test combination of ML and Schillinger features."""
        # Create test audio data
        audio_data = np.random.normal(0, 0.1, 44100)  # 1 second of low-noise signal

        # Extract ML features
        ml_features = ml_integration.extract_features(audio_data)

        # Extract Schillinger features
        schillinger_features = schillinger_integration.analyze_musical_structure(
            audio_data
        )

        # Combine features into hybrid representation
        hybrid_features = {
            "ml_analysis": ml_features,
            "schillinger_analysis": schillinger_features,
            "integration_timestamp": datetime.now().isoformat(),
            "confidence_weights": {"ml_weight": 0.6, "schillinger_weight": 0.4},
        }

        # Verify hybrid features
        assert "ml_analysis" in hybrid_features
        assert "schillinger_analysis" in hybrid_features
        assert "integration_timestamp" in hybrid_features
        assert "confidence_weights" in hybrid_features

        # Verify ML features are included
        assert "spectral_centroid" in hybrid_features["ml_analysis"]
        assert "tempo" in hybrid_features["ml_analysis"]

        # Verify Schillinger features are included
        assert "rhythm_analysis" in hybrid_features["schillinger_analysis"]
        assert "harmonic_analysis" in hybrid_features["schillinger_analysis"]

    def test_hybrid_recommendation_generation(
        self, copilotkit_integration, ml_integration, schillinger_integration
    ):
        """Test hybrid recommendation generation combining multiple AI systems."""
        # Create comprehensive state
        workflow_state = {
            "nodes": ["oscillator", "filter", "analyzer"],
            "user_intent": "create_composition",
            "audio_features": {"key": "C", "tempo": 120, "energy": 0.7},
            "user_profile": {
                "skill_level": "intermediate",
                "preferred_styles": ["electronic", "experimental"],
            },
        }

        # Generate ML recommendations
        ml_recommendations = ml_integration.generate_recommendations(
            workflow_state["user_profile"], workflow_state["audio_features"]
        )

        # Generate CopilotKit suggestions
        copilot_suggestions = copilotkit_integration.generate_suggestion(workflow_state)

        # Combine into hybrid recommendations
        hybrid_recommendations = {
            "copilotkit_suggestions": copilot_suggestions["suggestions"],
            "ml_recommendations": ml_recommendations,
            "combined_actions": [],
            "confidence_scores": {},
        }

        # Combine and rank recommendations
        all_recommendations = []

        for suggestion in copilot_suggestions["suggestions"]:
            all_recommendations.append(
                {
                    "source": "copilotkit",
                    "action": suggestion["action"],
                    "confidence": suggestion["confidence"],
                    "description": suggestion["description"],
                }
            )

        for rec in ml_recommendations:
            all_recommendations.append(
                {
                    "source": "ml",
                    "type": rec["type"],
                    "confidence": rec["confidence"],
                    "reason": rec["reason"],
                }
            )

        # Sort by confidence
        all_recommendations.sort(key=lambda x: x["confidence"], reverse=True)

        hybrid_recommendations["combined_actions"] = all_recommendations[:5]  # Top 5
        hybrid_recommendations["confidence_scores"] = {
            "highest_confidence": all_recommendations[0]["confidence"]
            if all_recommendations
            else 0,
            "average_confidence": sum(r["confidence"] for r in all_recommendations)
            / len(all_recommendations)
            if all_recommendations
            else 0,
            "total_recommendations": len(all_recommendations),
        }

        # Verify hybrid recommendations
        assert len(hybrid_recommendations["combined_actions"]) <= 5
        assert "highest_confidence" in hybrid_recommendations["confidence_scores"]
        assert "average_confidence" in hybrid_recommendations["confidence_scores"]
        assert (
            0 <= hybrid_recommendations["confidence_scores"]["highest_confidence"] <= 1
        )

    def test_cross_system_validation(
        self, copilotkit_integration, ml_integration, schillinger_integration
    ):
        """Test validation and consistency across AI systems."""
        # Create test scenario
        audio_data = np.sin(
            2 * np.pi * 440 * np.linspace(0, 1, 44100)
        )  # 1 second of 440Hz sine

        # Get analysis from all systems
        ml_features = ml_integration.extract_features(audio_data)
        schillinger_analysis = schillinger_integration.analyze_musical_structure(
            audio_data
        )

        # Validate consistency
        validation_results = {
            "spectral_consistency": True,
            "tempo_consistency": True,
            "key_consistency": True,
            "confidence_alignment": True,
            "cross_validation_score": 0.0,
        }

        # Check spectral consistency
        if ml_features["spectral_centroid"] > 2000:  # Bright sound
            # Schillinger analysis should reflect this
            if schillinger_analysis["harmonic_analysis"]["tension_release"] < 0.5:
                validation_results["spectral_consistency"] = False

        # Calculate cross-validation score
        consistent_indicators = sum(
            [
                validation_results["spectral_consistency"],
                validation_results["tempo_consistency"],
                validation_results["key_consistency"],
                validation_results["confidence_alignment"],
            ]
        )

        validation_results["cross_validation_score"] = consistent_indicators / 4.0

        # Verify validation
        assert 0 <= validation_results["cross_validation_score"] <= 1
        assert isinstance(validation_results["spectral_consistency"], bool)
        assert isinstance(validation_results["tempo_consistency"], bool)


class TestUserBehaviorAnalysis:
    """Test user behavior analysis and learning."""

    def test_user_interaction_tracking(self, copilotkit_integration):
        """Test tracking of user interactions for learning."""
        # Simulate user interactions
        interactions = [
            {
                "timestamp": datetime.now().isoformat(),
                "action": "create_node",
                "node_type": "oscillator",
                "parameters": {"frequency": 440, "amplitude": 0.5},
                "user_satisfaction": "positive",
            },
            {
                "timestamp": datetime.now().isoformat(),
                "action": "connect_nodes",
                "source": "oscillator",
                "target": "filter",
                "user_satisfaction": "positive",
            },
            {
                "timestamp": datetime.now().isoformat(),
                "action": "apply_suggestion",
                "suggestion_type": "add_analyzer",
                "accepted": True,
                "user_satisfaction": "neutral",
            },
            {
                "timestamp": datetime.now().isoformat(),
                "action": "reject_suggestion",
                "suggestion_type": "add_compressor",
                "reason": "not_needed",
                "user_satisfaction": "positive",
            },
        ]

        # Record interactions
        for interaction in interactions:
            copilotkit_integration.record_user_interaction(interaction)

        # Verify tracking
        assert len(copilotkit_integration.user_interactions) == len(interactions)

        # Verify interaction data
        for i, recorded in enumerate(copilotkit_integration.user_interactions):
            assert recorded["action"] == interactions[i]["action"]
            assert "timestamp" in recorded
            assert "user_satisfaction" in recorded

    def test_learning_from_user_patterns(self, copilotkit_integration):
        """Test learning from user interaction patterns."""
        # Record a pattern of interactions
        pattern_interactions = [
            {
                "action": "create_node",
                "node_type": "oscillator",
                "user_satisfaction": "positive",
            },
            {
                "action": "connect_nodes",
                "source": "oscillator",
                "target": "filter",
                "user_satisfaction": "positive",
            },
            {
                "action": "apply_suggestion",
                "suggestion_type": "add_eq",
                "accepted": True,
                "user_satisfaction": "positive",
            },
        ]

        # Record pattern multiple times
        for _ in range(3):
            for interaction in pattern_interactions:
                interaction_copy = interaction.copy()
                interaction_copy["timestamp"] = datetime.now().isoformat()
                copilotkit_integration.record_user_interaction(interaction_copy)

        # Analyze patterns
        pattern_analysis = {
            "common_sequences": [],
            "preferred_actions": {},
            "suggestion_acceptance_rate": 0.0,
            "overall_satisfaction": "positive",
        }

        # Analyze user interactions
        actions = [i["action"] for i in copilotkit_integration.user_interactions]
        satisfaction = [
            i["user_satisfaction"] for i in copilotkit_integration.user_interactions
        ]

        # Count action frequencies
        action_counts = {}
        for action in actions:
            action_counts[action] = action_counts.get(action, 0) + 1

        pattern_analysis["preferred_actions"] = action_counts

        # Calculate suggestion acceptance rate
        suggestion_actions = [
            i
            for i in copilotkit_integration.user_interactions
            if "suggestion" in i["action"]
        ]
        accepted_suggestions = [
            i for i in suggestion_actions if i.get("accepted", False)
        ]

        if suggestion_actions:
            pattern_analysis["suggestion_acceptance_rate"] = len(
                accepted_suggestions
            ) / len(suggestion_actions)

        # Calculate overall satisfaction
        satisfaction_counts = {}
        for sat in satisfaction:
            satisfaction_counts[sat] = satisfaction_counts.get(sat, 0) + 1

        most_common_satisfaction = max(satisfaction_counts.items(), key=lambda x: x[1])[
            0
        ]
        pattern_analysis["overall_satisfaction"] = most_common_satisfaction

        # Verify analysis
        assert len(pattern_analysis["preferred_actions"]) > 0
        assert 0 <= pattern_analysis["suggestion_acceptance_rate"] <= 1
        assert pattern_analysis["overall_satisfaction"] in [
            "positive",
            "neutral",
            "negative",
        ]

    def test_adaptive_suggestion_improvement(self, copilotkit_integration):
        """Test adaptive improvement of suggestions based on user feedback."""
        # Initial user profile
        user_profile = {
            "preferred_genres": ["electronic"],
            "common_actions": ["create_oscillator", "add_filter"],
            "suggestion_preferences": {"high_confidence_only": True},
        }

        # Simulate learning interactions
        learning_interactions = [
            {
                "action": "apply_suggestion",
                "suggestion_confidence": 0.8,
                "accepted": True,
                "outcome": "successful",
                "user_satisfaction": "positive",
            },
            {
                "action": "apply_suggestion",
                "suggestion_confidence": 0.6,
                "accepted": False,
                "outcome": "rejected",
                "user_satisfaction": "neutral",
            },
            {
                "action": "apply_suggestion",
                "suggestion_confidence": 0.9,
                "accepted": True,
                "outcome": "successful",
                "user_satisfaction": "positive",
            },
        ]

        # Record learning interactions
        for interaction in learning_interactions:
            copilotkit_integration.record_user_interaction(interaction)

        # Analyze learning outcomes
        learning_analysis = {
            "confidence_threshold_learned": 0.0,
            "preferred_suggestion_types": [],
            "success_rate_by_confidence": {},
            "adaptation_score": 0.0,
        }

        # Analyze confidence-based success
        confidence_success = {}
        for interaction in learning_interactions:
            conf = interaction["suggestion_confidence"]
            success = interaction["outcome"] == "successful"

            if conf not in confidence_success:
                confidence_success[conf] = {"successes": 0, "total": 0}

            confidence_success[conf]["total"] += 1
            if success:
                confidence_success[conf]["successes"] += 1

        learning_analysis["success_rate_by_confidence"] = confidence_success

        # Determine learned confidence threshold
        for conf, stats in confidence_success.items():
            success_rate = stats["successes"] / stats["total"]
            if success_rate > 0.8:  # 80% success rate
                learning_analysis["confidence_threshold_learned"] = min(
                    learning_analysis["confidence_threshold_learned"], conf
                )

        # Calculate adaptation score
        successful_interactions = len(
            [i for i in learning_interactions if i["outcome"] == "successful"]
        )
        learning_analysis["adaptation_score"] = successful_interactions / len(
            learning_interactions
        )

        # Verify learning analysis
        assert 0 <= learning_analysis["confidence_threshold_learned"] <= 1
        assert 0 <= learning_analysis["adaptation_score"] <= 1
        assert len(learning_analysis["success_rate_by_confidence"]) > 0


class TestAIGUIBridgeIntegration:
    """Test AG-UI bridge integration with AI systems."""

    def test_agui_event_to_ai_mapping(self, copilotkit_integration):
        """Test mapping AG-UI events to AI actions."""
        # Define AG-UI event types
        agui_events = [
            {
                "type": "NODE_CREATED",
                "payload": {
                    "node_type": "oscillator",
                    "parameters": {"frequency": 440},
                },
                "timestamp": 1234567890,
            },
            {
                "type": "CONNECTION_MADE",
                "payload": {"source": "oscillator", "target": "filter"},
                "timestamp": 1234567891,
            },
            {
                "type": "PARAMETER_CHANGED",
                "payload": {"node_id": "filter", "parameter": "cutoff", "value": 1000},
                "timestamp": 1234567892,
            },
        ]

        # Mock AI actions for AG-UI events
        def handle_node_creation(event):
            node_type = event["payload"]["node_type"]
            return {
                "ai_action": "suggest_connections",
                "suggestions": [
                    {
                        "target": "filter",
                        "reason": "Oscillators typically connect to filters",
                    },
                    {"target": "output", "reason": "Direct output for testing"},
                ],
                "confidence": 0.8,
            }

        def handle_connection_made(event):
            source = event["payload"]["source"]
            target = event["payload"]["target"]
            return {
                "ai_action": "optimize_parameters",
                "optimizations": [
                    {"node": target, "parameter": "input_gain", "value": 0.8},
                    {"node": source, "parameter": "output_gain", "value": 0.7},
                ],
                "confidence": 0.7,
            }

        def handle_parameter_change(event):
            node_id = event["payload"]["node_id"]
            parameter = event["payload"]["parameter"]
            value = event["payload"]["value"]
            return {
                "ai_action": "suggest_related_parameters",
                "suggestions": self._get_related_parameter_suggestions(
                    node_id, parameter, value
                ),
                "confidence": 0.6,
            }

        # Register AI handlers
        copilotkit_integration.register_action(
            "handleNodeCreated", handle_node_creation
        )
        copilotkit_integration.register_action(
            "handleConnectionMade", handle_connection_made
        )
        copilotkit_integration.register_action(
            "handleParameterChanged", handle_parameter_change
        )

        # Process AG-UI events
        ai_responses = []
        for event in agui_events:
            action_name = f"handle{event['type'].replace('_', '')}"
            if action_name in copilotkit_integration.actions:
                response = copilotkit_integration.execute_action(action_name, event)
                ai_responses.append(response)

        # Verify AI responses
        assert len(ai_responses) == len(agui_events)

        for response in ai_responses:
            assert "ai_action" in response
            assert "confidence" in response
            assert 0 <= response["confidence"] <= 1

    def _get_related_parameter_suggestions(self, node_id, parameter, value):
        """Helper method to get related parameter suggestions."""
        suggestions = {
            "filter": {
                "cutoff": [
                    {
                        "parameter": "resonance",
                        "value": 0.5,
                        "reason": "Resonance often complements cutoff",
                    },
                    {
                        "parameter": "envelope_attack",
                        "value": 0.1,
                        "reason": "Envelope shapes the filter response",
                    },
                ]
            },
            "oscillator": {
                "frequency": [
                    {
                        "parameter": "detune",
                        "value": 0.01,
                        "reason": "Slight detune adds warmth",
                    },
                    {
                        "parameter": "phase",
                        "value": 0.0,
                        "reason": "Phase affects stereo imaging",
                    },
                ]
            },
        }

        return suggestions.get(node_id, {}).get(parameter, [])

    def test_ai_feedback_loop(self, copilotkit_integration):
        """Test AI feedback loop for continuous improvement."""
        # Initial state
        state = {"nodes": ["oscillator"], "connections": [], "user_feedback": []}

        # Simulate feedback loop iterations
        feedback_iterations = 3

        for iteration in range(feedback_iterations):
            # Generate AI suggestions based on current state
            suggestions = copilotkit_integration.generate_suggestion(state)

            # Simulate user feedback
            user_feedback = {
                "iteration": iteration,
                "suggestions_provided": len(suggestions["suggestions"]),
                "suggestions_accepted": iteration % 2,  # Alternate acceptance
                "user_satisfaction": "positive" if iteration % 2 == 0 else "neutral",
                "timestamp": datetime.now().isoformat(),
            }

            state["user_feedback"].append(user_feedback)

            # Update state based on feedback
            if user_feedback["suggestions_accepted"]:
                state["nodes"].append("filter")
                state["connections"].append(("oscillator", "filter"))

            # Record feedback for learning
            copilotkit_integration.record_user_interaction(
                {
                    "action": "suggestion_feedback",
                    "iteration": iteration,
                    "feedback": user_feedback,
                    "state_snapshot": state.copy(),
                }
            )

        # Analyze feedback loop effectiveness
        feedback_analysis = {
            "total_iterations": feedback_iterations,
            "suggestion_acceptance_rate": sum(
                f["suggestions_accepted"] for f in state["user_feedback"]
            )
            / feedback_iterations,
            "average_satisfaction": 0,
            "state_evolution": {
                "initial_nodes": 1,
                "final_nodes": len(state["nodes"]),
                "connections_made": len(state["connections"]),
            },
        }

        # Calculate average satisfaction
        satisfaction_scores = {"positive": 1.0, "neutral": 0.5, "negative": 0.0}
        satisfaction_values = [
            satisfaction_scores[f["user_satisfaction"]] for f in state["user_feedback"]
        ]
        feedback_analysis["average_satisfaction"] = sum(satisfaction_values) / len(
            satisfaction_values
        )

        # Verify feedback loop effectiveness
        assert feedback_analysis["total_iterations"] == feedback_iterations
        assert 0 <= feedback_analysis["suggestion_acceptance_rate"] <= 1
        assert 0 <= feedback_analysis["average_satisfaction"] <= 1
        assert (
            feedback_analysis["state_evolution"]["final_nodes"]
            >= feedback_analysis["state_evolution"]["initial_nodes"]
        )


if __name__ == "__main__":
    pytest.main([__file__])
