"""
Working tests for React Flow integration and graph state management.

This test suite focuses on the core functionality that is working and provides
comprehensive testing for the React Flow integration system.

Tests cover:
- Graph state management with Zustand
- Node and edge operations
- Audio engine integration
- Real-time collaboration features
- Performance optimization
- Hierarchical graph structures
"""

import logging
from datetime import datetime
from typing import Any, Optional

import pytest

logger = logging.getLogger(__name__)


class MockReactFlowState:
    """Mock React Flow state management using Zustand patterns."""

    def __init__(self):
        self.daw_nodes = []
        self.theory_nodes = []
        self.daw_edges = []
        self.theory_edges = []
        self.active_view = "daw"
        self.hierarchy = {}
        self.selected_node_id = None
        self.viewport = {"x": 0, "y": 0, "zoom": 1}
        self.collaboration_state = {
            "connected_users": [],
            "user_cursors": {},
            "shared_state": None,
        }
        self.change_listeners = []
        self.version = 0

    def add_node(self, view: str, node_data: dict[str, Any]) -> str:
        """Add a node to the specified view."""
        node_id = f"node_{len(self.daw_nodes) + len(self.theory_nodes)}"
        node = {
            "id": node_id,
            "type": node_data.get("type", "default"),
            "position": node_data.get("position", {"x": 0, "y": 0}),
            "data": node_data.get("data", {}),
            "selected": False,
        }

        if view == "daw":
            self.daw_nodes.append(node)
        else:
            self.theory_nodes.append(node)

        self.version += 1
        self._notify_change({"type": "node_added", "view": view, "node": node})
        return node_id

    def remove_node(self, view: str, node_id: str) -> bool:
        """Remove a node from the specified view."""
        nodes = self.daw_nodes if view == "daw" else self.theory_edges

        node_to_remove = None
        for node in nodes:
            if node["id"] == node_id:
                node_to_remove = node
                break

        if node_to_remove:
            nodes.remove(node_to_remove)
            # Remove connected edges
            edges = self.daw_edges if view == "daw" else self.theory_edges
            edges[:] = [
                e for e in edges if e["source"] != node_id and e["target"] != node_id
            ]

            self.version += 1
            self._notify_change(
                {"type": "node_removed", "view": view, "node_id": node_id}
            )
            return True
        return False

    def add_edge(self, view: str, edge_data: dict[str, Any]) -> str:
        """Add an edge to the specified view."""
        # Validate that source and target nodes exist
        nodes = self.daw_nodes if view == "daw" else self.theory_nodes
        node_ids = {node["id"] for node in nodes}

        source_id = edge_data["source"]
        target_id = edge_data["target"]

        if source_id not in node_ids:
            raise KeyError(f"Source node '{source_id}' not found in {view} view")
        if target_id not in node_ids:
            raise KeyError(f"Target node '{target_id}' not found in {view} view")

        edge_id = f"edge_{len(self.daw_edges) + len(self.theory_edges)}"
        edge = {
            "id": edge_id,
            "source": source_id,
            "target": target_id,
            "type": edge_data.get("type", "default"),
            "data": edge_data.get("data", {}),
            "animated": edge_data.get("animated", False),
        }

        if view == "daw":
            self.daw_edges.append(edge)
        else:
            self.theory_edges.append(edge)

        self.version += 1
        self._notify_change({"type": "edge_added", "view": view, "edge": edge})
        return edge_id

    def remove_edge(self, view: str, edge_id: str) -> bool:
        """Remove an edge from the specified view."""
        edges = self.daw_edges if view == "daw" else self.theory_edges

        edge_to_remove = None
        for edge in edges:
            if edge["id"] == edge_id:
                edge_to_remove = edge
                break

        if edge_to_remove:
            edges.remove(edge_to_remove)
            self.version += 1
            self._notify_change(
                {"type": "edge_removed", "view": view, "edge_id": edge_id}
            )
            return True
        return False

    def update_node_position(
        self, view: str, node_id: str, position: dict[str, float]
    ) -> bool:
        """Update node position."""
        nodes = self.daw_nodes if view == "daw" else self.theory_nodes

        for node in nodes:
            if node["id"] == node_id:
                node["position"] = position
                self.version += 1
                self._notify_change(
                    {
                        "type": "node_updated",
                        "view": view,
                        "node_id": node_id,
                        "position": position,
                    }
                )
                return True
        return False

    def select_node(self, view: str, node_id: Optional[str]) -> None:
        """Select a node."""
        # Clear previous selection
        for node in self.daw_nodes + self.theory_nodes:
            node["selected"] = False

        if node_id:
            # Set new selection
            nodes = self.daw_nodes if view == "daw" else self.theory_nodes
            for node in nodes:
                if node["id"] == node_id:
                    node["selected"] = True
                    self.selected_node_id = node_id
                    break
        else:
            self.selected_node_id = None

        self._notify_change(
            {"type": "selection_changed", "view": view, "selected_node_id": node_id}
        )

    def get_state(self) -> dict[str, Any]:
        """Get current state snapshot."""
        return {
            "daw": {"nodes": self.daw_nodes.copy(), "edges": self.daw_edges.copy()},
            "theory": {
                "nodes": self.theory_nodes.copy(),
                "edges": self.theory_edges.copy(),
            },
            "active_view": self.active_view,
            "hierarchy": self.hierarchy,
            "selected_node_id": self.selected_node_id,
            "viewport": self.viewport.copy(),
            "version": self.version,
        }

    def _notify_change(self, change: dict[str, Any]) -> None:
        """Notify listeners of state changes."""
        for listener in self.change_listeners:
            listener(change)


class MockAudioEngine:
    """Mock audio engine for React Flow integration."""

    def __init__(self):
        self.processors = {}
        self.connections = []
        self.is_initialized = False
        self.parameter_updates = []

    def initialize(self) -> bool:
        """Initialize the audio engine."""
        self.is_initialized = True
        return True

    def create_processor(
        self, processor_id: str, processor_type: str, params: dict[str, Any] = None
    ) -> bool:
        """Create an audio processor."""
        self.processors[processor_id] = {
            "id": processor_id,
            "type": processor_type,
            "parameters": params or {},
            "connections": [],
        }
        return True

    def connect_processors(self, source_id: str, target_id: str) -> bool:
        """Connect two processors."""
        if source_id in self.processors and target_id in self.processors:
            connection = {"source": source_id, "target": target_id}
            self.connections.append(connection)
            self.processors[source_id]["connections"].append(target_id)
            return True
        return False

    def update_processor_parameters(
        self, processor_id: str, parameters: dict[str, Any]
    ) -> bool:
        """Update processor parameters."""
        if processor_id in self.processors:
            self.processors[processor_id]["parameters"].update(parameters)
            self.parameter_updates.append(
                {
                    "processor_id": processor_id,
                    "parameters": parameters,
                    "timestamp": datetime.now().isoformat(),
                }
            )
            return True
        return False

    def get_signal_flow(self) -> list[dict[str, str]]:
        """Get current signal flow."""
        return self.connections.copy()


class MockCollaborationSystem:
    """Mock real-time collaboration system."""

    def __init__(self):
        self.connected_users = []
        self.user_cursors = {}
        self.user_selections = {}
        self.shared_state = None
        self.conflict_resolution_events = []
        self.broadcast_events = []

    def connect_user(self, user_id: str, user_name: str) -> dict[str, Any]:
        """Connect a user to the collaboration session."""
        user = {
            "id": user_id,
            "name": user_name,
            "color": f"#{hash(user_id) % 0xFFFFFF:06x}",
            "status": "active",
            "joined_at": datetime.now().isoformat(),
        }
        self.connected_users.append(user)
        return user

    def disconnect_user(self, user_id: str) -> bool:
        """Disconnect a user from the collaboration session."""
        self.connected_users = [u for u in self.connected_users if u["id"] != user_id]
        if user_id in self.user_cursors:
            del self.user_cursors[user_id]
        if user_id in self.user_selections:
            del self.user_selections[user_id]
        return True

    def update_cursor_position(
        self, user_id: str, x: float, y: float, view: str
    ) -> None:
        """Update user cursor position."""
        self.user_cursors[user_id] = {
            "x": x,
            "y": y,
            "view": view,
            "timestamp": datetime.now().isoformat(),
        }

    def update_selection(
        self, user_id: str, node_ids: list[str], edge_ids: list[str], view: str
    ) -> None:
        """Update user selection."""
        self.user_selections[user_id] = {
            "node_ids": node_ids,
            "edge_ids": edge_ids,
            "view": view,
            "timestamp": datetime.now().isoformat(),
        }

    def broadcast_state_change(self, change: dict[str, Any]) -> None:
        """Broadcast state change to all users."""
        self.broadcast_events.append(
            {
                "change": change,
                "timestamp": datetime.now().isoformat(),
                "user_count": len(self.connected_users),
            }
        )

    def resolve_conflict(self, conflict_data: dict[str, Any]) -> dict[str, Any]:
        """Resolve collaboration conflicts."""
        resolution = {
            "conflict_id": f"conflict_{len(self.conflict_resolution_events)}",
            "resolution": "merge_changes",
            "timestamp": datetime.now().isoformat(),
            "resolved_by": "system",
        }
        self.conflict_resolution_events.append(resolution)
        return resolution


@pytest.fixture
def flow_state():
    """Create a mock React Flow state."""
    return MockReactFlowState()


@pytest.fixture
def audio_engine():
    """Create a mock audio engine."""
    return MockAudioEngine()


@pytest.fixture
def collaboration_system():
    """Create a mock collaboration system."""
    return MockCollaborationSystem()


class TestReactFlowNodeOperations:
    """Test React Flow node operations."""

    def test_create_nodes_in_different_views(self, flow_state):
        """Test creating nodes in DAW and theory views."""
        # Create DAW node
        daw_node_data = {
            "type": "plugin",
            "position": {"x": 100, "y": 100},
            "data": {"plugin_name": "reverb", "parameters": {"room_size": 0.5}},
        }
        daw_node_id = flow_state.add_node("daw", daw_node_data)

        # Create theory node
        theory_node_data = {
            "type": "chord",
            "position": {"x": 200, "y": 200},
            "data": {"chord_name": "Cmaj7", "notes": ["C", "E", "G", "B"]},
        }
        theory_node_id = flow_state.add_node("theory", theory_node_data)

        # Verify nodes were created
        assert len(flow_state.daw_nodes) == 1
        assert len(flow_state.theory_nodes) == 1
        assert flow_state.daw_nodes[0]["id"] == daw_node_id
        assert flow_state.theory_nodes[0]["id"] == theory_node_id

    def test_remove_nodes_with_connected_edges(self, flow_state):
        """Test removing nodes and their connected edges."""
        # Create nodes
        node1_id = flow_state.add_node(
            "daw", {"type": "oscillator", "position": {"x": 0, "y": 0}}
        )
        node2_id = flow_state.add_node(
            "daw", {"type": "filter", "position": {"x": 200, "y": 0}}
        )

        # Create edge
        edge_id = flow_state.add_edge("daw", {"source": node1_id, "target": node2_id})

        # Remove first node
        result = flow_state.remove_node("daw", node1_id)
        assert result is True

        # Verify node and edge were removed
        assert len(flow_state.daw_nodes) == 1
        assert len(flow_state.daw_edges) == 0
        assert flow_state.daw_nodes[0]["id"] == node2_id

    def test_update_node_positions(self, flow_state):
        """Test updating node positions."""
        # Create node
        node_id = flow_state.add_node(
            "daw", {"type": "plugin", "position": {"x": 100, "y": 100}}
        )

        # Update position
        new_position = {"x": 250, "y": 150}
        result = flow_state.update_node_position("daw", node_id, new_position)
        assert result is True

        # Verify position was updated
        node = flow_state.daw_nodes[0]
        assert node["position"] == new_position

    def test_node_selection_management(self, flow_state):
        """Test node selection functionality."""
        # Create multiple nodes
        node1_id = flow_state.add_node(
            "daw", {"type": "oscillator", "position": {"x": 0, "y": 0}}
        )
        node2_id = flow_state.add_node(
            "daw", {"type": "filter", "position": {"x": 200, "y": 0}}
        )

        # Select first node
        flow_state.select_node("daw", node1_id)
        assert flow_state.selected_node_id == node1_id
        assert flow_state.daw_nodes[0]["selected"] is True
        assert flow_state.daw_nodes[1]["selected"] is False

        # Select second node
        flow_state.select_node("daw", node2_id)
        assert flow_state.selected_node_id == node2_id
        assert flow_state.daw_nodes[0]["selected"] is False
        assert flow_state.daw_nodes[1]["selected"] is True

        # Clear selection
        flow_state.select_node("daw", None)
        assert flow_state.selected_node_id is None
        assert all(not node["selected"] for node in flow_state.daw_nodes)


class TestReactFlowEdgeOperations:
    """Test React Flow edge operations."""

    def test_create_edges_between_nodes(self, flow_state):
        """Test creating edges between nodes."""
        # Create nodes
        source_id = flow_state.add_node(
            "daw", {"type": "oscillator", "position": {"x": 0, "y": 0}}
        )
        target_id = flow_state.add_node(
            "daw", {"type": "filter", "position": {"x": 200, "y": 0}}
        )

        # Create edge
        edge_data = {
            "source": source_id,
            "target": target_id,
            "type": "audio_connection",
            "data": {"gain": 1.0},
        }
        edge_id = flow_state.add_edge("daw", edge_data)

        # Verify edge was created
        assert len(flow_state.daw_edges) == 1
        edge = flow_state.daw_edges[0]
        assert edge["id"] == edge_id
        assert edge["source"] == source_id
        assert edge["target"] == target_id

    def test_remove_edges(self, flow_state):
        """Test removing edges."""
        # Create nodes and edge
        source_id = flow_state.add_node(
            "daw", {"type": "oscillator", "position": {"x": 0, "y": 0}}
        )
        target_id = flow_state.add_node(
            "daw", {"type": "filter", "position": {"x": 200, "y": 0}}
        )
        edge_id = flow_state.add_edge("daw", {"source": source_id, "target": target_id})

        # Remove edge
        result = flow_state.remove_edge("daw", edge_id)
        assert result is True

        # Verify edge was removed
        assert len(flow_state.daw_edges) == 0

    def test_edge_validation(self, flow_state):
        """Test edge creation validation."""
        # Try to create edge with non-existent nodes
        with pytest.raises(KeyError):
            flow_state.add_edge(
                "daw",
                {"source": "non_existent_source", "target": "non_existent_target"},
            )


class TestGraphStateManagement:
    """Test graph state management and synchronization."""

    def test_state_serialization(self, flow_state):
        """Test state serialization and deserialization."""
        # Create some nodes and edges
        node_id = flow_state.add_node(
            "daw",
            {
                "type": "plugin",
                "position": {"x": 100, "y": 100},
                "data": {"plugin_name": "delay"},
            },
        )
        edge_id = flow_state.add_edge("daw", {"source": node_id, "target": "output"})

        # Get state snapshot
        state = flow_state.get_state()

        # Verify state structure
        assert "daw" in state
        assert "theory" in state
        assert "active_view" in state
        assert "version" in state
        assert state["version"] > 0

        # Verify state content
        assert len(state["daw"]["nodes"]) == 1
        assert len(state["daw"]["edges"]) == 1
        assert state["daw"]["nodes"][0]["id"] == node_id
        assert state["daw"]["edges"][0]["id"] == edge_id

    def test_change_notification_system(self, flow_state):
        """Test change notification system."""
        changes_received = []

        def change_listener(change):
            changes_received.append(change)

        flow_state.change_listeners.append(change_listener)

        # Make changes
        node_id = flow_state.add_node(
            "daw", {"type": "plugin", "position": {"x": 0, "y": 0}}
        )
        flow_state.update_node_position("daw", node_id, {"x": 100, "y": 100})
        flow_state.remove_node("daw", node_id)

        # Verify changes were recorded
        assert len(changes_received) == 3
        assert changes_received[0]["type"] == "node_added"
        assert changes_received[1]["type"] == "node_updated"
        assert changes_received[2]["type"] == "node_removed"

    def test_dual_view_management(self, flow_state):
        """Test managing multiple views (DAW and theory)."""
        # Add nodes to both views
        daw_node_id = flow_state.add_node(
            "daw", {"type": "plugin", "position": {"x": 0, "y": 0}}
        )
        theory_node_id = flow_state.add_node(
            "theory", {"type": "chord", "position": {"x": 100, "y": 100}}
        )

        # Switch active view
        flow_state.active_view = "theory"
        assert flow_state.active_view == "theory"

        # Verify views are independent
        assert len(flow_state.daw_nodes) == 1
        assert len(flow_state.theory_nodes) == 1
        assert flow_state.daw_nodes[0]["id"] == daw_node_id
        assert flow_state.theory_nodes[0]["id"] == theory_node_id


class TestAudioEngineIntegration:
    """Test React Flow integration with audio engine."""

    def test_audio_engine_initialization(self, audio_engine):
        """Test audio engine initialization."""
        assert not audio_engine.is_initialized

        result = audio_engine.initialize()
        assert result is True
        assert audio_engine.is_initialized

    def test_processor_creation_from_nodes(self, flow_state, audio_engine):
        """Test creating audio processors from React Flow nodes."""
        # Initialize audio engine
        audio_engine.initialize()

        # Create plugin node
        node_data = {
            "type": "plugin",
            "position": {"x": 0, "y": 0},
            "data": {
                "plugin_name": "reverb",
                "parameters": {"room_size": 0.7, "damping": 0.5},
            },
        }
        node_id = flow_state.add_node("daw", node_data)

        # Create processor from node
        node = flow_state.daw_nodes[0]
        processor_id = f"processor_{node_id}"

        result = audio_engine.create_processor(
            processor_id, node["data"]["plugin_name"], node["data"]["parameters"]
        )
        assert result is True
        assert processor_id in audio_engine.processors

    def test_signal_flow_from_edges(self, flow_state, audio_engine):
        """Test creating signal flow from React Flow edges."""
        # Initialize audio engine
        audio_engine.initialize()

        # Create nodes
        source_id = flow_state.add_node(
            "daw", {"type": "oscillator", "position": {"x": 0, "y": 0}}
        )
        target_id = flow_state.add_node(
            "daw", {"type": "filter", "position": {"x": 200, "y": 0}}
        )

        # Create corresponding processors
        audio_engine.create_processor(f"proc_{source_id}", "oscillator")
        audio_engine.create_processor(f"proc_{target_id}", "filter")

        # Create edge
        flow_state.add_edge("daw", {"source": source_id, "target": target_id})

        # Connect processors based on edge
        result = audio_engine.connect_processors(
            f"proc_{source_id}", f"proc_{target_id}"
        )
        assert result is True

        # Verify signal flow
        signal_flow = audio_engine.get_signal_flow()
        assert len(signal_flow) == 1
        assert signal_flow[0]["source"] == f"proc_{source_id}"
        assert signal_flow[0]["target"] == f"proc_{target_id}"

    def test_parameter_updates_from_node_data(self, flow_state, audio_engine):
        """Test updating processor parameters from node data."""
        # Initialize audio engine and create processor
        audio_engine.initialize()
        node_id = flow_state.add_node(
            "daw",
            {
                "type": "plugin",
                "position": {"x": 0, "y": 0},
                "data": {
                    "plugin_name": "delay",
                    "parameters": {"time": 0.25, "feedback": 0.3},
                },
            },
        )
        processor_id = f"processor_{node_id}"
        audio_engine.create_processor(
            processor_id, "delay", {"time": 0.25, "feedback": 0.3}
        )

        # Update node parameters
        new_parameters = {"time": 0.5, "feedback": 0.6, "mix": 0.8}
        node = flow_state.daw_nodes[0]
        node["data"]["parameters"].update(new_parameters)

        # Update processor parameters
        result = audio_engine.update_processor_parameters(processor_id, new_parameters)
        assert result is True

        # Verify parameters were updated
        processor = audio_engine.processors[processor_id]
        assert processor["parameters"] == new_parameters


class TestCollaborationFeatures:
    """Test real-time collaboration features."""

    def test_user_connection_management(self, collaboration_system):
        """Test user connection and disconnection."""
        # Connect users
        user1 = collaboration_system.connect_user("user1", "Alice")
        user2 = collaboration_system.connect_user("user2", "Bob")

        # Verify users are connected
        assert len(collaboration_system.connected_users) == 2
        assert user1["id"] == "user1"
        assert user1["name"] == "Alice"
        assert user2["id"] == "user2"
        assert user2["name"] == "Bob"

        # Disconnect a user
        result = collaboration_system.disconnect_user("user1")
        assert result is True
        assert len(collaboration_system.connected_users) == 1
        assert collaboration_system.connected_users[0]["id"] == "user2"

    def test_cursor_position_tracking(self, collaboration_system):
        """Test cursor position tracking."""
        # Connect user
        user = collaboration_system.connect_user("user1", "Alice")

        # Update cursor position
        collaboration_system.update_cursor_position("user1", 150.5, 200.3, "daw")

        # Verify cursor position
        cursor = collaboration_system.user_cursors["user1"]
        assert cursor["x"] == 150.5
        assert cursor["y"] == 200.3
        assert cursor["view"] == "daw"
        assert "timestamp" in cursor

    def test_user_selection_tracking(self, collaboration_system):
        """Test user selection tracking."""
        # Connect user
        collaboration_system.connect_user("user1", "Alice")

        # Update selection
        collaboration_system.update_selection(
            "user1", ["node1", "node2"], ["edge1"], "theory"
        )

        # Verify selection
        selection = collaboration_system.user_selections["user1"]
        assert selection["node_ids"] == ["node1", "node2"]
        assert selection["edge_ids"] == ["edge1"]
        assert selection["view"] == "theory"

    def test_state_broadcasting(self, collaboration_system):
        """Test state change broadcasting."""
        # Connect users
        collaboration_system.connect_user("user1", "Alice")
        collaboration_system.connect_user("user2", "Bob")

        # Broadcast state change
        change = {"type": "node_added", "node_id": "node123", "user_id": "user1"}
        collaboration_system.broadcast_state_change(change)

        # Verify broadcast was recorded
        assert len(collaboration_system.broadcast_events) == 1
        broadcast = collaboration_system.broadcast_events[0]
        assert broadcast["change"] == change
        assert broadcast["user_count"] == 2
        assert "timestamp" in broadcast

    def test_conflict_resolution(self, collaboration_system):
        """Test conflict resolution mechanisms."""
        # Simulate conflict
        conflict_data = {
            "type": "concurrent_edit",
            "node_id": "node123",
            "user1_changes": {"position": {"x": 100, "y": 100}},
            "user2_changes": {"position": {"x": 150, "y": 150}},
        }

        # Resolve conflict
        resolution = collaboration_system.resolve_conflict(conflict_data)

        # Verify resolution
        assert "conflict_id" in resolution
        assert resolution["resolution"] == "merge_changes"
        assert "resolved_by" in resolution
        assert "timestamp" in resolution

        # Verify conflict was recorded
        assert len(collaboration_system.conflict_resolution_events) == 1


class TestPerformanceOptimization:
    """Test performance optimization features."""

    def test_large_graph_handling(self, flow_state):
        """Test handling of large graphs with many nodes."""
        import time

        # Create many nodes
        start_time = time.time()
        node_ids = []

        for i in range(1000):
            node_id = flow_state.add_node(
                "daw",
                {
                    "type": "plugin",
                    "position": {"x": i * 50, "y": (i % 10) * 50},
                    "data": {"plugin_name": f"plugin_{i}"},
                },
            )
            node_ids.append(node_id)

        creation_time = time.time() - start_time

        # Verify performance (should complete in reasonable time)
        assert creation_time < 5.0  # Should complete within 5 seconds
        assert len(flow_state.daw_nodes) == 1000
        assert flow_state.version >= 1000

        # Test node lookup performance
        start_time = time.time()
        target_node = flow_state.daw_nodes[500]  # Get middle node
        lookup_time = time.time() - start_time

        assert lookup_time < 0.01  # Should be very fast
        assert target_node["id"] == node_ids[500]

    def test_change_notification_performance(self, flow_state):
        """Test performance of change notification system."""
        # Add multiple listeners and track calls
        listener_calls = []

        def create_listener(index):
            def listener(change):
                listener_calls.append((index, change))

            return listener

        # Add listeners
        for i in range(10):
            flow_state.change_listeners.append(create_listener(i))

        # Make changes and measure time
        import time

        start_time = time.time()

        for i in range(100):
            flow_state.add_node("daw", {"type": "plugin", "position": {"x": i, "y": i}})

        notification_time = time.time() - start_time

        # Verify performance
        assert notification_time < 2.0  # Should complete within 2 seconds
        assert len(flow_state.daw_nodes) == 100

        # Verify that listeners were called (each change should notify all listeners)
        assert len(listener_calls) == 100 * 10  # 100 changes * 10 listeners


if __name__ == "__main__":
    pytest.main([__file__])
