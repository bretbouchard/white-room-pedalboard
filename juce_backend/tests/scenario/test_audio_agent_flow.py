from src.audio_agent.agents.graph_audio_agent import (
    SessionState,
)
from src.audio_agent.agents.graph_audio_agent import (
    app as audio_agent_app,
)


def test_add_plugin_scenario():
    """Tests a complete scenario of adding a plugin via the agent graph."""
    # 1. Define the user request
    request = {
        "action": "add_plugin",
        "name": "test_synth",
        "plugin_path": "/path/to/test_synth.vst",
    }

    # 2. Set up the initial state
    initial_state = SessionState(
        session_id="test_session_123",
        user_id="test_user",
        org_id="test_org",
        request=request,
        plugin_count=0,
    )

    # 3. Run the graph
    # We don't need callbacks for this test
    config = {}
    final_state = None
    for event in audio_agent_app.stream(initial_state, config=config):
        if event.get("__end__"):
            final_state = event.get("__end__")

    # 4. Assert the outcome
    assert final_state is not None

    # Check that the plan node created the correct tool call
    assert "tool_calls" in final_state
    tool_calls = final_state.get("tool_calls", [])
    assert len(tool_calls) == 1
    assert tool_calls[0]["tool"] == "load_plugin"
    assert tool_calls[0]["args"]["name"] == "test_synth"

    # Check that the execute_tools node ran and produced a result
    assert "tool_results" in final_state
    tool_results = final_state.get("tool_results", [])
    assert len(tool_results) == 1
    # This asserts against the placeholder tool's return value
    assert "Placeholder result for load_plugin" in tool_results[0]
