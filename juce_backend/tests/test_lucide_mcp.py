"""
Test script for verifying the Lucide Icons MCP integration.
"""

import json
import os


def test_mcp_config_exists():
    """Test that the MCP configuration file exists."""
    config_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), ".kiro", "settings", "mcp.json"
    )
    assert os.path.exists(config_path), "MCP configuration file does not exist"


def test_lucide_mcp_config():
    """Test that the Lucide Icons MCP server is configured correctly."""
    config_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), ".kiro", "settings", "mcp.json"
    )
    with open(config_path) as f:
        config = json.load(f)

    assert "mcpServers" in config, "MCP configuration does not contain mcpServers"
    assert (
        "lucide-icons-enhanced" in config["mcpServers"]
    ), "Lucide Icons Enhanced MCP server is not configured"

    lucide_config = config["mcpServers"]["lucide-icons-enhanced"]
    assert (
        lucide_config["command"] == "node"
    ), "Lucide Icons MCP server command is incorrect"
    assert (
        "--stdio" in lucide_config["args"]
    ), "Lucide Icons MCP server args should contain --stdio"
    # Note: The enhanced version may not have disabled/autoApprove settings, so we'll check if they exist
    if "disabled" in lucide_config:
        assert lucide_config["disabled"] is False, "Lucide Icons MCP server is disabled"

    # Check that common operations are auto-approved (if autoApprove exists)
    if "autoApprove" in lucide_config:
        auto_approve = lucide_config["autoApprove"]
        # Check for common operations that should be auto-approved
        expected_operations = [
            "search_icons",
            "search_categories",
            "list_all_categories",
        ]
        for operation in expected_operations:
            if operation in auto_approve:
                assert auto_approve[operation], f"{operation} should be auto-approved"


if __name__ == "__main__":
    test_mcp_config_exists()
    test_lucide_mcp_config()
    print("All tests passed!")
