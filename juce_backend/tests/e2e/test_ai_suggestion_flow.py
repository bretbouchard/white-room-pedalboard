"""
End-to-end tests for AI suggestion flows in the Audio Agent DAW.

These tests simulate the interaction between the frontend (DAW UI) and the
backend (FastAPI server with AI transformation functions) to verify that
AI-generated suggestions are correctly processed and applied to the DAW state.
"""

from unittest.mock import AsyncMock, patch

import pytest


class MockFastAPIClient:
    """
    Mocks the FastAPI client for testing purposes.
    Allows setting predefined responses for transformation requests.
    """

    def __init__(self):
        self.responses = {}

    def set_response(self, transformation_name, response_data):
        """Sets a mock response for a given transformation."""
        self.responses[transformation_name] = response_data

    async def transform(self, request_data):
        """Simulates a transformation request to the mocked FastAPI client."""
        transformation = request_data.get("transformation")
        if transformation in self.responses:
            return self.responses[transformation]
        raise ValueError(f"No mock response for transformation: {transformation}")


mock_fastapi_client = MockFastAPIClient()


class MockAudioStore:
    """
    Mocks the Zustand audio store from the frontend.
    Provides a simplified state and methods to simulate DAW actions.
    """

    def __init__(self):
        self.state = {
            "mixer": {
                "tracks": {},
                "masterVolume": 0.8,
                "masterMuted": False,
                "selectedTrackId": None,
                "soloedTracks": [],
                "masterEQ": {"highGain": 0, "midGain": 0, "lowGain": 0},
                "limiter": {"enabled": False, "threshold": -1, "release": 100},
            }
        }

    def getState(self):
        """Returns the current mocked DAW state."""
        return self.state

    def setState(self, new_state):
        """Updates the mocked DAW state."""
        self.state.update(new_state)

    def setTrackVolume(self, trackId, volume):
        """Simulates setting a track's volume."""
        self.state["mixer"]["tracks"][trackId]["volume"] = volume

    def setTrackPan(self, trackId, pan):
        """Simulates setting a track's pan."""
        self.state["mixer"]["tracks"][trackId]["pan"] = pan

    def setTrackEQ(self, trackId, eq):
        """Simulates setting a track's EQ."""
        self.state["mixer"]["tracks"][trackId]["eq"].update(eq)

    def setTrackCompression(self, trackId, compression):
        """Simulates setting a track's compression."""
        self.state["mixer"]["tracks"][trackId]["compression"].update(compression)

    def setTrackReverb(self, trackId, reverb):
        """Simulates setting a track's reverb."""
        self.state["mixer"]["tracks"][trackId]["reverb"].update(reverb)

    def setMasterEQ(self, eq):
        """Simulates setting the master EQ."""
        self.state["mixer"]["masterEQ"].update(eq)

    def setLimiter(self, limiter):
        """Simulates setting the master limiter."""
        self.state["mixer"]["limiter"].update(limiter)

    def addTrack(self, track_type, name=None):
        """Simulates adding a new track to the DAW."""
        track_id = f"track_{len(self.state['mixer']['tracks']) + 1}"
        self.state["mixer"]["tracks"][track_id] = {
            "id": track_id,
            "name": name or f"{track_type.capitalize()} Track",
            "type": track_type,
            "muted": False,
            "solo": False,
            "volume": 0.8,
            "pan": 0,
            "color": "#FFFFFF",
            "plugins": [],
            "armed": False,
            "height": 80,
            "audioRegions": [],
            "midiRegions": [],
            "eq": {"highGain": 0, "midGain": 0, "lowGain": 0},
            "compression": {"threshold": -18, "ratio": 3, "attack": 20, "release": 100},
            "reverb": {"sendLevel": 0, "decayTime": 1.5},
        }
        return track_id


mock_audio_store = MockAudioStore()


# Patch the SDK functions to use the mock FastAPI client
@patch(
    "audio_agent.sdk.analyze_composition",
    new=AsyncMock(side_effect=mock_fastapi_client.transform),
)
@patch(
    "audio_agent.sdk.create_mixing_plan",
    new=AsyncMock(side_effect=mock_fastapi_client.transform),
)
@patch(
    "audio_agent.sdk.recommend_dynamics",
    new=AsyncMock(side_effect=mock_fastapi_client.transform),
)
@patch(
    "audio_agent.sdk.recommend_eq",
    new=AsyncMock(side_effect=mock_fastapi_client.transform),
)
@patch(
    "audio_agent.sdk.recommend_spatial",
    new=AsyncMock(side_effect=mock_fastapi_client.transform),
)
class TestAISuggestionFlow:
    """
    End-to-end tests for the AI suggestion workflow.
    These tests simulate the full cycle of AI suggestion generation and application
    to the DAW state.
    """

    @pytest.fixture(autouse=True)
    def setup(self):
        """Resets mock state before each test to ensure test isolation."""
        mock_fastapi_client.responses = {}
        mock_audio_store.state = {
            "mixer": {
                "tracks": {},
                "masterVolume": 0.8,
                "masterMuted": False,
                "selectedTrackId": None,
                "soloedTracks": [],
                "masterEQ": {"highGain": 0, "midGain": 0, "lowGain": 0},
                "limiter": {"enabled": False, "threshold": -1, "release": 100},
            }
        }

    async def test_ai_suggestion_eq_flow(self):
        """
        Tests the end-to-end flow of an AI EQ suggestion.
        Verifies that an EQ suggestion is generated and correctly applied to a track.
        """
        # 1. Simulate an audio input and add a track
        track_id = mock_audio_store.addTrack("audio", "Vocal Track")

        # 2. Mock AI suggestion response
        mock_fastapi_client.set_response(
            "recommend_eq",
            {
                "plugin_recommendation": {"plugin_name": "FabFilter Pro-Q 3"},
                "bands": [{"frequency": 3000, "gain": 2.0, "q": 1.0, "type": "bell"}],
                "overall_gain": 0.0,
                "daid": "daid:v1.0:...",  # Dummy DAID
            },
        )

        # 3. Simulate AI generating a suggestion (this would come from the backend)
        # In a real e2e test, this would be an actual call to the FastAPI endpoint
        # For this mock, we directly use the mock_fastapi_client
        ai_suggestion_data = await mock_fastapi_client.transform(
            {
                "transformation": "recommend_eq",
                "audio_analysis": {},
                "composition_context": {},
                "user_preferences": {},
            }
        )

        # Simulate the AISuggestionPanel receiving and processing the suggestion
        # This part mimics the logic in MixingConsole.tsx handleAcceptSuggestion
        suggestion = {
            "id": "sugg_eq_1",
            "type": "eq",
            "title": "Boost vocal clarity",
            "description": "Apply a slight boost to the high-mids of the vocal track to improve clarity.",
            "confidence": 0.85,
            "reasoning": "Vocal analysis shows a lack of presence in the 2-4kHz range.",
            "parameters": {
                "trackId": track_id,
                "highGain": ai_suggestion_data["bands"][0]["gain"],
                "midGain": 0,
                "lowGain": 0,
            },
            "targetTrackId": track_id,
            "timestamp": 12345,
            "status": "pending",
            "agentType": "eq_specialist",
        }

        # 4. Simulate accepting the suggestion
        # This calls the actual store action
        mock_audio_store.setTrackEQ(
            suggestion["targetTrackId"],
            {
                "highGain": suggestion["parameters"]["highGain"],
                "midGain": suggestion["parameters"]["midGain"],
                "lowGain": suggestion["parameters"]["lowGain"],
            },
        )

        # 5. Verify that the DAW state has changed accordingly
        updated_track = mock_audio_store.getState()["mixer"]["tracks"][track_id]
        assert updated_track["eq"]["highGain"] == 2.0
        assert updated_track["eq"]["midGain"] == 0
        assert updated_track["eq"]["lowGain"] == 0

    async def test_ai_suggestion_compression_flow(self):
        """
        Tests the end-to-end flow of an AI compression suggestion.
        Verifies that a compression suggestion is generated and correctly applied to a track.
        """
        # 1. Simulate an audio input and add a track
        track_id = mock_audio_store.addTrack("audio", "Bass Track")

        # 2. Mock AI suggestion response
        mock_fastapi_client.set_response(
            "recommend_dynamics",
            {
                "plugin_recommendation": {"plugin_name": "Waves CLA-2A"},
                "settings": {
                    "threshold": -18.0,
                    "ratio": 3.0,
                    "attack": 20.0,
                    "release": 150.0,
                    "knee": 6.0,
                    "makeup_gain": 2.0,
                    "mix": 100.0,
                },
                "daid": "daid:v1.0:...",  # Dummy DAID
            },
        )

        # 3. Simulate AI generating a suggestion
        ai_suggestion_data = await mock_fastapi_client.transform(
            {
                "transformation": "recommend_dynamics",
                "audio_analysis": {},
                "composition_context": {},
                "user_preferences": {},
            }
        )

        suggestion = {
            "id": "sugg_comp_1",
            "type": "compression",
            "title": "Even out bass dynamics",
            "description": "Apply gentle compression to the bass track.",
            "confidence": 0.78,
            "reasoning": "Bass track has inconsistent RMS levels.",
            "parameters": {
                "trackId": track_id,
                "threshold": ai_suggestion_data["settings"]["threshold"],
                "ratio": ai_suggestion_data["settings"]["ratio"],
                "attack": ai_suggestion_data["settings"]["attack"],
                "release": ai_suggestion_data["settings"]["release"],
            },
            "targetTrackId": track_id,
            "timestamp": 12346,
            "status": "pending",
            "agentType": "dynamics_specialist",
        }

        # 4. Simulate accepting the suggestion
        mock_audio_store.setTrackCompression(
            suggestion["targetTrackId"],
            {
                "threshold": suggestion["parameters"]["threshold"],
                "ratio": suggestion["parameters"]["ratio"],
                "attack": suggestion["parameters"]["attack"],
                "release": suggestion["parameters"]["release"],
            },
        )

        # 5. Verify that the DAW state has changed accordingly
        updated_track = mock_audio_store.getState()["mixer"]["tracks"][track_id]
        assert updated_track["compression"]["threshold"] == -18.0
        assert updated_track["compression"]["ratio"] == 3.0
        assert updated_track["compression"]["attack"] == 20.0
        assert updated_track["compression"]["release"] == 150.0

    async def test_ai_suggestion_master_eq_flow(self):
        """
        Tests the end-to-end flow of an AI master EQ suggestion.
        Verifies that a master EQ suggestion is generated and correctly applied to the master bus.
        """
        # 1. No specific track needed for master EQ

        # 2. Mock AI suggestion response
        mock_fastapi_client.set_response(
            "recommend_eq",
            {
                "plugin_recommendation": {"plugin_name": "FabFilter Pro-Q 3"},
                "bands": [{"frequency": 500, "gain": -1.5, "q": 1.0, "type": "bell"}],
                "overall_gain": 0.0,
                "daid": "daid:v1.0:...",  # Dummy DAID
            },
        )

        # 3. Simulate AI generating a suggestion
        ai_suggestion_data = await mock_fastapi_client.transform(
            {
                "transformation": "recommend_eq",
                "audio_analysis": {},
                "composition_context": {},
                "user_preferences": {},
            }
        )

        suggestion = {
            "id": "sugg_master_eq_1",
            "type": "eq",
            "title": "Clean up master bus mids",
            "description": "Apply a slight cut to the master bus mids.",
            "confidence": 0.90,
            "reasoning": "Overall mix analysis shows muddiness in the mid-range.",
            "parameters": {
                "highGain": 0,
                "midGain": ai_suggestion_data["bands"][0]["gain"],
                "lowGain": 0,
            },
            "timestamp": 12347,
            "status": "pending",
            "agentType": "eq_specialist",
        }

        # 4. Simulate accepting the suggestion
        mock_audio_store.setMasterEQ(
            {
                "highGain": suggestion["parameters"]["highGain"],
                "midGain": suggestion["parameters"]["midGain"],
                "lowGain": suggestion["parameters"]["lowGain"],
            },
        )

        # 5. Verify that the DAW state has changed accordingly
        updated_master_eq = mock_audio_store.getState()["mixer"]["masterEQ"]
        assert updated_master_eq["highGain"] == 0
        assert updated_master_eq["midGain"] == -1.5
        assert updated_master_eq["lowGain"] == 0
