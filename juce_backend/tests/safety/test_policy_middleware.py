import pytest
from langchain_core.tools import ToolException

from src.audio_agent.agents.graph_audio_agent import (
    SessionState,
)
from src.audio_agent.agents.graph_audio_agent import (
    app as audio_agent_app,
)
from src.audio_agent.agents.middleware import PolicyMiddleware


def test_policy_middleware_blocks_exceeding_plugin_limit():
    """Tests that the PolicyMiddleware blocks adding a plugin when the count is already at the limit."""
    # 1. Define the user request
    request = {
        "action": "add_plugin",
        "name": "violating_synth",
        "plugin_path": "/path/to/violating_synth.vst",
    }

    # 2. Set up the initial state with plugin_count at the policy limit
    initial_state = SessionState(
        session_id="test_session_policy_123",
        user_id="test_user_policy",
        org_id="test_org_policy",
        request=request,
        plugin_count=5,  # Set to the exact limit
    )

    # 3. Run the graph with the PolicyMiddleware
    config = {"callbacks": [PolicyMiddleware()]}

    # 4. Assert that a ToolException is raised during execution
    with pytest.raises(ToolException) as excinfo:
        # The graph should fail when the middleware intercepts the tool call
        for _event in audio_agent_app.stream(initial_state, config=config):
            # We need to consume the stream to trigger the execution
            pass

    # 5. Check the exception message
    assert "Policy Violation: Cannot load more than 5 plugins" in str(excinfo.value)
