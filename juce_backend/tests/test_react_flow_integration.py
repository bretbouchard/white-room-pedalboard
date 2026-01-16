"""
Comprehensive tests for React Flow integration and graph state management.

This test suite covers:
- React Flow node and edge operations
- Graph state synchronization
- Real-time collaboration features
- Audio engine integration with React Flow
- Node type validation and handling
- Workflow optimization and performance
- Hierarchical graph structures
- AI suggestion integration with React Flow
- Audio routing and signal flow
"""

import logging
from datetime import datetime
from typing import Any
from unittest.mock import Mock

import pytest

from src.audio_agent.models.graph import (
    AudioAnalysisNodeData,
    AudioInputNodeData,
    Edge,
    GraphState,
    GraphStateRoot,
    Node,
    NodeData,
    NodeType,
    OutputNodeData,
    PluginNodeData,
    Viewport,
)

logger = logging.getLogger(__name__)


class MockReactFlowIntegration:
    """Mock React Flow integration for testing."""

    def __init__(self):
        self.nodes = []
        self.edges = []
        self.viewport = Viewport(x=0, y=0, zoom=1)
        self.selected_nodes = []
        self.collaboration_state = {
            "connected_users": [],
            "user_cursors": {},
            "shared_graph_state": None,
        }
        self.audio_engine_state = {
            "is_initialized": False,
            "routing_manager": None,
            "active_nodes": [],
            "signal_flow": [],
        }
        self.ai_suggestions = []
        self.change_listeners = []

    def add_node(self, node: Node) -> str:
        """Add a node to the graph."""
        self.nodes.append(node)
        self._notify_change({"type": "node_added", "node": node})
        return node.id

    def remove_node(self, node_id: str) -> bool:
        """Remove a node from the graph."""
        node_to_remove = None
        for node in self.nodes:
            if node.id == node_id:
                node_to_remove = node
                break

        if node_to_remove:
            self.nodes.remove(node_to_remove)
            # Remove connected edges
            self.edges = [
                e for e in self.edges if e.source != node_id and e.target != node_id
            ]
            self._notify_change({"type": "node_removed", "node_id": node_id})
            return True
        return False

    def update_node(self, node_id: str, updates: dict[str, Any]) -> bool:
        """Update a node in the graph."""
        for node in self.nodes:
            if node.id == node_id:
                if "position" in updates:
                    node.position = updates["position"]
                if "data" in updates:
                    # Handle Pydantic model updates by creating new model with merged data
                    current_data = node.data.model_dump()
                    current_data.update(updates["data"])
                    node.data = node.data.__class__(**current_data)
                self._notify_change(
                    {"type": "node_updated", "node_id": node_id, "updates": updates}
                )
                return True
        return False

    def add_edge(self, edge: Edge) -> str:
        """Add an edge to the graph."""
        self.edges.append(edge)
        self._notify_change({"type": "edge_added", "edge": edge})
        return edge.id

    def remove_edge(self, edge_id: str) -> bool:
        """Remove an edge from the graph."""
        edge_to_remove = None
        for edge in self.edges:
            if edge.id == edge_id:
                edge_to_remove = edge
                break

        if edge_to_remove:
            self.edges.remove(edge_to_remove)
            self._notify_change({"type": "edge_removed", "edge_id": edge_id})
            return True
        return False

    def get_graph_state(self) -> GraphState:
        """Get the current graph state."""
        return GraphState(nodes=self.nodes, edges=self.edges, viewport=self.viewport)

    def set_viewport(self, viewport: Viewport) -> None:
        """Set the viewport."""
        self.viewport = viewport
        self._notify_change({"type": "viewport_updated", "viewport": viewport})

    def select_node(self, node_id: str) -> None:
        """Select a node."""
        self.selected_nodes = [node_id]
        self._notify_change({"type": "node_selected", "node_id": node_id})

    def clear_selection(self) -> None:
        """Clear node selection."""
        self.selected_nodes = []
        self._notify_change({"type": "selection_cleared"})

    def add_change_listener(self, listener):
        """Add a change listener."""
        self.change_listeners.append(listener)

    def _notify_change(self, change: dict[str, Any]) -> None:
        """Notify all change listeners."""
        for listener in self.change_listeners:
            listener(change)


class MockAudioEngineIntegration:
    """Mock audio engine integration for testing."""

    def __init__(self):
        self.is_initialized = False
        self.routing_manager = Mock()
        self.active_processors = {}
        self.signal_flow = []
        self.audio_buffers = {}

    def initialize(self) -> bool:
        """Initialize the audio engine."""
        self.is_initialized = True
        return True

    def create_processor(
        self, processor_id: str, processor_type: str, parameters: dict[str, Any]
    ) -> str:
        """Create an audio processor."""
        self.active_processors[processor_id] = {
            "type": processor_type,
            "parameters": parameters,
            "state": "active",
        }
        return processor_id

    def connect_processors(self, source_id: str, target_id: str) -> bool:
        """Connect two processors."""
        if source_id in self.active_processors and target_id in self.active_processors:
            self.signal_flow.append((source_id, target_id))
            return True
        return False

    def disconnect_processors(self, source_id: str, target_id: str) -> bool:
        """Disconnect two processors."""
        connection = (source_id, target_id)
        if connection in self.signal_flow:
            self.signal_flow.remove(connection)
            return True
        return False

    def update_processor_parameters(
        self, processor_id: str, parameters: dict[str, Any]
    ) -> bool:
        """Update processor parameters."""
        if processor_id in self.active_processors:
            self.active_processors[processor_id]["parameters"].update(parameters)
            return True
        return False

    def get_signal_flow(self) -> list[tuple]:
        """Get the current signal flow."""
        return self.signal_flow.copy()


class MockCollaborationIntegration:
    """Mock collaboration integration for testing."""

    def __init__(self):
        self.connected_users = []
        self.user_sessions = {}
        self.shared_graph_state = None
        self.conflict_resolution = Mock()
        self.version_control = Mock()

    def connect_user(self, user_id: str, session_id: str) -> bool:
        """Connect a user to the collaboration session."""
        if user_id not in self.connected_users:
            self.connected_users.append(user_id)
            self.user_sessions[user_id] = {
                "session_id": session_id,
                "connected_at": datetime.now(),
                "last_activity": datetime.now(),
            }
            return True
        return False

    def disconnect_user(self, user_id: str) -> bool:
        """Disconnect a user from the collaboration session."""
        if user_id in self.connected_users:
            self.connected_users.remove(user_id)
            del self.user_sessions[user_id]
            return True
        return False

    def update_user_cursor(
        self, user_id: str, cursor_position: dict[str, float]
    ) -> None:
        """Update a user's cursor position."""
        if user_id in self.user_sessions:
            self.user_sessions[user_id]["cursor"] = cursor_position
            self.user_sessions[user_id]["last_activity"] = datetime.now()

    def broadcast_graph_update(
        self, graph_state: GraphState, source_user_id: str
    ) -> None:
        """Broadcast graph updates to all connected users."""
        self.shared_graph_state = graph_state

    def resolve_conflicts(
        self, conflicts: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Resolve collaboration conflicts."""
        # Mock conflict resolution
        resolved = []
        for conflict in conflicts:
            resolved.append(
                {
                    "conflict_id": conflict.get("id"),
                    "resolution": "accepted",
                    "resolved_by": "auto_resolution",
                    "timestamp": datetime.now().isoformat(),
                }
            )
        return resolved


class MockAIIntegration:
    """Mock AI integration for testing."""

    def __init__(self):
        self.suggestions = []
        self.active_context = {}
        self.learning_state = {
            "user_patterns": [],
            "suggestion_acceptance_rate": 0.0,
            "recent_feedback": [],
        }

    def analyze_graph_state(self, graph_state: GraphState) -> dict[str, Any]:
        """Analyze the current graph state."""
        analysis = {
            "node_count": len(graph_state.nodes),
            "edge_count": len(graph_state.edges),
            "node_types": {},
            "connectivity": 0.0,
            "complexity": 0.0,
            "suggestions": [],
        }

        # Count node types
        for node in graph_state.nodes:
            node_type = node.data.node_type
            analysis["node_types"][node_type] = (
                analysis["node_types"].get(node_type, 0) + 1
            )

        # Calculate connectivity
        if analysis["node_count"] > 0:
            analysis["connectivity"] = analysis["edge_count"] / (
                analysis["node_count"] * (analysis["node_count"] - 1)
            )

        # Generate suggestions
        analysis["suggestions"] = self._generate_suggestions(graph_state)

        return analysis

    def _generate_suggestions(self, graph_state: GraphState) -> list[dict[str, Any]]:
        """Generate AI suggestions based on graph state."""
        suggestions = []

        # Analyze graph for improvement opportunities
        if len(graph_state.nodes) == 0:
            suggestions.append(
                {
                    "type": "setup_suggestion",
                    "action": "add_input_node",
                    "confidence": 0.9,
                    "description": "Add an audio input node to get started",
                }
            )

        if len(graph_state.nodes) > 0 and len(graph_state.edges) == 0:
            suggestions.append(
                {
                    "type": "connection_suggestion",
                    "action": "connect_nodes",
                    "confidence": 0.8,
                    "description": "Connect nodes to establish signal flow",
                }
            )

        # Look for isolated nodes
        connected_nodes = set()
        for edge in graph_state.edges:
            connected_nodes.add(edge.source)
            connected_nodes.add(edge.target)

        isolated_nodes = [
            node for node in graph_state.nodes if node.id not in connected_nodes
        ]
        if isolated_nodes:
            suggestions.append(
                {
                    "type": "connection_suggestion",
                    "action": "connect_isolated_nodes",
                    "confidence": 0.7,
                    "description": f"Connect {len(isolated_nodes)} isolated node(s)",
                }
            )

        return suggestions

    def apply_suggestion(
        self, suggestion: dict[str, Any], graph_state: GraphState
    ) -> GraphState:
        """Apply an AI suggestion to the graph state."""
        if suggestion["action"] == "add_input_node":
            # Add audio input node
            new_node = Node(
                id=f"audio_input_{len(graph_state.nodes)}",
                position={"x": 100, "y": 100},
                data=AudioInputNodeData(
                    label="Audio Input",
                    node_type=NodeType.AUDIO_INPUT,
                    file_path="/test/audio.wav",
                    duration=10.0,
                    sample_rate=44100,
                    channels=2,
                ),
            )
            graph_state.nodes.append(new_node)

        elif suggestion["action"] == "connect_nodes":
            # Connect first two unconnected nodes
            unconnected_pairs = []
            for i, node1 in enumerate(graph_state.nodes):
                for node2 in graph_state.nodes[i + 1 :]:
                    if not any(
                        (edge.source == node1.id and edge.target == node2.id)
                        or (edge.source == node2.id and edge.target == node1.id)
                        for edge in graph_state.edges
                    ):
                        unconnected_pairs.append((node1, node2))

            if unconnected_pairs:
                node1, node2 = unconnected_pairs[0]
                new_edge = Edge(
                    id=f"edge_{len(graph_state.edges)}",
                    source=node1.id,
                    target=node2.id,
                    data={"type": "audio"},
                )
                graph_state.edges.append(new_edge)

        return graph_state


@pytest.fixture
def react_flow_integration():
    """Create a mock React Flow integration."""
    return MockReactFlowIntegration()


@pytest.fixture
def audio_engine_integration():
    """Create a mock audio engine integration."""
    return MockAudioEngineIntegration()


@pytest.fixture
def collaboration_integration():
    """Create a mock collaboration integration."""
    return MockCollaborationIntegration()


@pytest.fixture
def ai_integration():
    """Create a mock AI integration."""
    return MockAIIntegration()


class TestReactFlowNodes:
    """Test React Flow node operations."""

    def test_create_audio_input_node(self, react_flow_integration):
        """Test creating an audio input node."""
        node_data = AudioInputNodeData(
            label="Test Audio Input",
            node_type=NodeType.AUDIO_INPUT,
            file_path="/test/audio.wav",
            duration=10.0,
            sample_rate=44100,
            channels=2,
        )

        node = Node(
            id="test_audio_input",
            type="audioInput",
            position={"x": 100, "y": 100},
            data=node_data,
        )

        # Add node
        node_id = react_flow_integration.add_node(node)

        # Verify node was added
        assert node_id == "test_audio_input"
        assert len(react_flow_integration.nodes) == 1
        assert react_flow_integration.nodes[0].id == "test_audio_input"
        assert react_flow_integration.nodes[0].data.label == "Test Audio Input"
        assert react_flow_integration.nodes[0].data.node_type == NodeType.AUDIO_INPUT

    def test_create_plugin_node(self, react_flow_integration):
        """Test creating a plugin node."""
        node_data = PluginNodeData(
            label="Test Plugin",
            node_type=NodeType.PLUGIN,
            plugin_id="test_plugin_1",
            plugin_name="TestPlugin",
            plugin_type="VST3",
            parameters={"frequency": 440.0, "resonance": 0.5},
            bypassed=False,
        )

        node = Node(
            id="test_plugin",
            type="plugin",
            position={"x": 200, "y": 200},
            data=node_data,
        )

        # Add node
        node_id = react_flow_integration.add_node(node)

        # Verify node was added
        assert node_id == "test_plugin"
        assert len(react_flow_integration.nodes) == 1
        assert react_flow_integration.nodes[0].data.plugin_id == "test_plugin_1"
        assert react_flow_integration.nodes[0].data.parameters["frequency"] == 440.0

    def test_create_analysis_node(self, react_flow_integration):
        """Test creating an audio analysis node."""
        node_data = AudioAnalysisNodeData(
            label="Spectral Analysis",
            node_type=NodeType.AUDIO_ANALYSIS,
            analysis_id="spectral_analyzer_1",
            analysis_type="spectral",
            features={"spectral_centroid": 1500, "spectral_rolloff": 5000},
            confidence=0.85,
        )

        node = Node(
            id="spectral_analyzer",
            type="analysis",
            position={"x": 300, "y": 300},
            data=node_data,
        )

        # Add node
        node_id = react_flow_integration.add_node(node)

        # Verify node was added
        assert node_id == "spectral_analyzer"
        assert react_flow_integration.nodes[0].data.analysis_type == "spectral"
        assert (
            react_flow_integration.nodes[0].data.features["spectral_centroid"] == 1500
        )
        assert react_flow_integration.nodes[0].data.confidence == 0.85

    def test_update_node_position(self, react_flow_integration):
        """Test updating node position."""
        # Create initial node
        node = Node(
            id="test_node",
            type="default",
            position={"x": 100, "y": 100},
            data=NodeData(label="Test", node_type=NodeType.PLUGIN),
        )
        react_flow_integration.add_node(node)

        # Update position
        new_position = {"x": 200, "y": 300}
        result = react_flow_integration.update_node(
            "test_node", {"position": new_position}
        )

        # Verify position was updated
        assert result is True
        updated_node = next(
            n for n in react_flow_integration.nodes if n.id == "test_node"
        )
        assert updated_node.position == new_position

    def test_update_node_data(self, react_flow_integration):
        """Test updating node data."""
        # Create initial plugin node
        node_data = PluginNodeData(
            label="Test Plugin",
            node_type=NodeType.PLUGIN,
            parameters={"frequency": 440.0},
        )
        node = Node(
            id="test_plugin",
            type="plugin",
            position={"x": 100, "y": 100},
            data=node_data,
        )
        react_flow_integration.add_node(node)

        # Update node data
        new_parameters = {"frequency": 880.0, "resonance": 0.7}
        result = react_flow_integration.update_node(
            "test_plugin", {"data": {"parameters": new_parameters}}
        )

        # Verify data was updated
        assert result is True
        updated_node = next(
            n for n in react_flow_integration.nodes if n.id == "test_plugin"
        )
        assert updated_node.data.parameters["frequency"] == 880.0
        assert updated_node.data.parameters["resonance"] == 0.7

    def test_remove_node(self, react_flow_integration):
        """Test removing a node."""
        # Create and add multiple nodes
        nodes = [
            Node(
                type="default",
                id="node1",
                position={"x": 0, "y": 0},
                data=NodeData(label="Node 1", node_type=NodeType.PLUGIN),
            ),
            Node(
                type="default",
                id="node2",
                position={"x": 100, "y": 100},
                data=NodeData(label="Node 2", node_type=NodeType.PLUGIN),
            ),
            Node(
                type="default",
                id="node3",
                position={"x": 200, "y": 200},
                data=NodeData(label="Node 3", node_type=NodeType.PLUGIN),
            ),
        ]

        for node in nodes:
            react_flow_integration.add_node(node)

        # Add edges
        edges = [
            Edge(id="edge1", source="node1", target="node2", data={"type": "audio"}),
            Edge(id="edge2", source="node2", target="node3", data={"type": "audio"}),
        ]

        for edge in edges:
            react_flow_integration.add_edge(edge)

        # Remove middle node (should also remove connected edges)
        result = react_flow_integration.remove_node("node2")

        # Verify node was removed
        assert result is True
        remaining_node_ids = [n.id for n in react_flow_integration.nodes]
        assert "node2" not in remaining_node_ids
        assert "node1" in remaining_node_ids
        assert "node3" in remaining_node_ids

        # Verify connected edges were removed
        remaining_edge_ids = [e.id for e in react_flow_integration.edges]
        assert "edge1" not in remaining_edge_ids
        assert "edge2" not in remaining_edge_ids

    def test_remove_nonexistent_node(self, react_flow_integration):
        """Test removing a node that doesn't exist."""
        result = react_flow_integration.remove_node("nonexistent_node")
        assert result is False


class TestReactFlowEdges:
    """Test React Flow edge operations."""

    def test_create_edge(self, react_flow_integration):
        """Test creating an edge between nodes."""
        # Create two nodes
        node1 = Node(
            type="default",
            id="source_node",
            position={"x": 0, "y": 0},
            data=NodeData(label="Source", node_type=NodeType.PLUGIN),
        )
        node2 = Node(
            type="default",
            id="target_node",
            position={"x": 100, "y": 0},
            data=NodeData(label="Target", node_type=NodeType.PLUGIN),
        )

        react_flow_integration.add_node(node1)
        react_flow_integration.add_node(node2)

        # Create edge
        edge_data = {"type": "audio", "animated": True}
        edge = Edge(
            id="test_edge", source="source_node", target="target_node", data=edge_data
        )

        # Add edge
        edge_id = react_flow_integration.add_edge(edge)

        # Verify edge was added
        assert edge_id == "test_edge"
        assert len(react_flow_integration.edges) == 1
        assert react_flow_integration.edges[0].source == "source_node"
        assert react_flow_integration.edges[0].target == "target_node"
        assert react_flow_integration.edges[0].data.type == "audio"

    def test_remove_edge(self, react_flow_integration):
        """Test removing an edge."""
        # Create nodes and edge
        node1 = Node(
            type="default",
            id="source",
            position={"x": 0, "y": 0},
            data=NodeData(label="Source", node_type=NodeType.PLUGIN),
        )
        node2 = Node(
            type="default",
            id="target",
            position={"x": 100, "y": 0},
            data=NodeData(label="Target", node_type=NodeType.PLUGIN),
        )
        edge = Edge(
            id="test_edge", source="source", target="target", data={"type": "audio"}
        )

        react_flow_integration.add_node(node1)
        react_flow_integration.add_node(node2)
        react_flow_integration.add_edge(edge)

        # Remove edge
        result = react_flow_integration.remove_edge("test_edge")

        # Verify edge was removed
        assert result is True
        assert len(react_flow_integration.edges) == 0

    def test_edge_with_nonexistent_nodes(self, react_flow_integration):
        """Test creating an edge with nonexistent nodes."""
        edge = Edge(
            id="invalid_edge",
            source="nonexistent_source",
            target="nonexistent_target",
            data={"type": "audio"},
        )

        # Edge should be added even if nodes don't exist (React Flow allows this)
        edge_id = react_flow_integration.add_edge(edge)

        # Verify edge was added
        assert edge_id == "invalid_edge"
        assert len(react_flow_integration.edges) == 1


class TestGraphStateManagement:
    """Test graph state management and synchronization."""

    def test_graph_state_serialization(self, react_flow_integration):
        """Test graph state serialization and deserialization."""
        # Create a complex graph state
        node1 = Node(
            id="input_node",
            position={"x": 50, "y": 50},
            data=AudioInputNodeData(
                label="Audio Input",
                node_type=NodeType.AUDIO_INPUT,
                file_path="/test/audio.wav",
                duration=5.0,
            ),
        )

        node2 = Node(
            id="plugin_node",
            position={"x": 200, "y": 50},
            data=PluginNodeData(
                label="EQ Plugin",
                node_type=NodeType.PLUGIN,
                plugin_id="eq_1",
                parameters={"low_gain": -2.0, "high_gain": 3.0},
            ),
        )

        edge = Edge(
            id="connection_edge",
            source="input_node",
            target="plugin_node",
            data=EdgeData(type="audio", animated=True),
        )

        viewport = Viewport(x=0, y=0, zoom=1.2)

        # Add components to integration
        react_flow_integration.add_node(node1)
        react_flow_integration.add_node(node2)
        react_flow_integration.add_edge(edge)
        react_flow_integration.set_viewport(viewport)

        # Get graph state
        graph_state = react_flow_integration.get_graph_state()

        # Verify graph state
        assert len(graph_state.nodes) == 2
        assert len(graph_state.edges) == 1
        assert graph_state.viewport.x == 0
        assert graph_state.viewport.y == 0
        assert graph_state.viewport.zoom == 1.2

        # Test JSON serialization
        graph_json = graph_state.model_dump_json()
        assert isinstance(graph_json, str)

        # Test deserialization
        parsed_state = GraphState.model_validate_json(graph_json)
        assert len(parsed_state.nodes) == 2
        assert len(parsed_state.edges) == 1
        assert parsed_state.viewport.zoom == 1.2

    def test_graph_state_root_serialization(self, react_flow_integration):
        """Test GraphStateRoot serialization for storage."""
        # Create graph state
        graph_state = react_flow_integration.get_graph_state()
        graph_root = GraphStateRoot(
            graph=graph_state,
            metadata={"version": "1.0", "created_at": datetime.now().isoformat()},
        )

        # Test JSON serialization
        root_json = graph_root.model_dump_json()
        assert isinstance(root_json, str)
        assert "graph" in root_json
        assert "metadata" in root_json

        # Test deserialization
        parsed_root = GraphStateRoot.model_validate_json(root_json)
        assert len(parsed_root.graph.nodes) == len(graph_state.nodes)
        assert parsed_root.metadata["version"] == "1.0"

    def test_graph_state_validation(self):
        """Test graph state validation."""
        # Test valid graph state
        valid_data = {
            "nodes": [
                {
                    "id": "test_node",
                    "position": {"x": 100, "y": 100},
                    "data": {"label": "Test Node", "node_type": "plugin"},
                }
            ],
            "edges": [
                {
                    "id": "test_edge",
                    "source": "test_node",
                    "target": "test_node",
                    "data": {"type": "audio"},
                }
            ],
            "viewport": {"x": 0, "y": 0, "zoom": 1.0},
        }

        # Should validate successfully
        graph_state = GraphState(**valid_data)
        assert len(graph_state.nodes) == 1
        assert len(graph_state.edges) == 1

        # Test invalid graph state (missing required fields)
        invalid_data = {
            "nodes": [{"id": "test_node"}],  # Missing required fields
            "edges": [],
            "viewport": {"x": 0, "y": 0, "zoom": 1.0},
        }

        # Should raise validation error
        with pytest.raises(Exception):
            GraphState(**invalid_data)

    def test_node_selection_management(self, react_flow_integration):
        """Test node selection functionality."""
        # Create nodes
        nodes = [
            Node(
                type="default",
                id="node1",
                position={"x": 0, "y": 0},
                data=NodeData(label="Node 1", node_type=NodeType.PLUGIN),
            ),
            Node(
                type="default",
                id="node2",
                position={"x": 100, "y": 0},
                data=NodeData(label="Node 2", node_type=NodeType.PLUGIN),
            ),
            Node(
                type="default",
                id="node3",
                position={"x": 200, "y": 0},
                data=NodeData(label="Node 3", node_type=NodeType.PLUGIN),
            ),
        ]

        for node in nodes:
            react_flow_integration.add_node(node)

        # Test selecting nodes
        react_flow_integration.select_node("node2")
        assert react_flow_integration.selected_nodes == ["node2"]

        # Test clearing selection
        react_flow_integration.clear_selection()
        assert react_flow_integration.selected_nodes == []

        # Test selecting multiple nodes (simulate)
        react_flow_integration.selected_nodes = ["node1", "node3"]
        assert len(react_flow_integration.selected_nodes) == 2
        assert "node1" in react_flow_integration.selected_nodes
        assert "node3" in react_flow_integration.selected_nodes


class TestAudioEngineIntegration:
    """Test audio engine integration with React Flow."""

    def test_audio_engine_initialization(
        self, audio_engine_integration, react_flow_integration
    ):
        """Test audio engine initialization."""
        # Initialize audio engine
        result = audio_engine_integration.initialize()
        assert result is True
        assert audio_engine_integration.is_initialized is True

    def test_processor_creation_from_node(
        self, audio_engine_integration, react_flow_integration
    ):
        """Test creating audio processors from React Flow nodes."""
        # Create plugin node
        node_data = PluginNodeData(
            label="Test Plugin",
            node_type=NodeType.PLUGIN,
            plugin_id="test_processor",
            plugin_name="TestProcessor",
            parameters={"frequency": 440.0, "gain": 0.8},
        )

        node = Node(id="plugin_node", position={"x": 100, "y": 100}, data=node_data)

        react_flow_integration.add_node(node)

        # Create processor from node
        processor_id = audio_engine_integration.create_processor(
            "test_processor", "plugin", node_data.parameters
        )

        # Verify processor creation
        assert processor_id == "test_processor"
        assert "test_processor" in audio_engine_integration.active_processors
        assert (
            audio_engine_integration.active_processors["test_processor"]["parameters"][
                "frequency"
            ]
            == 440.0
        )

    def test_signal_flow_from_edges(
        self, audio_engine_integration, react_flow_integration
    ):
        """Test creating signal flow from React Flow edges."""
        # Create nodes
        node1 = Node(
            id="input",
            position={"x": 0, "y": 0},
            data=AudioInputNodeData(label="Input", node_type=NodeType.AUDIO_INPUT),
        )
        node2 = Node(
            id="processor1",
            position={"x": 100, y: 0},
            data=PluginNodeData(label="Processor 1", node_type=NodeType.PLUGIN),
        )
        node3 = Node(
            id="output",
            position={"x": 200, "y": 0},
            data=OutputNodeData(label="Output", node_type=NodeType.OUTPUT),
        )

        react_flow_integration.add_node(node1)
        react_flow_integration.add_node(node2)
        react_flow_integration.add_node(node3)

        # Create edges representing signal flow
        edge1 = Edge(
            id="edge1", source="input", target="processor1", data={"type": "audio"}
        )
        edge2 = Edge(
            id="edge2", source="processor1", target="output", data={"type": "audio"}
        )

        react_flow_integration.add_edge(edge1)
        react_flow_integration.add_edge(edge2)

        # Create processors for nodes
        audio_engine_integration.create_processor("input", "audio_input", {})
        audio_engine_integration.create_processor("processor1", "plugin", {})
        audio_engine_integration.create_processor("output", "audio_output", {})

        # Connect processors based on edges
        audio_engine_integration.connect_processors("input", "processor1")
        audio_engine_integration.connect_processors("processor1", "output")

        # Verify signal flow
        signal_flow = audio_engine_integration.get_signal_flow()
        assert len(signal_flow) == 2
        assert ("input", "processor1") in signal_flow
        assert ("processor1", "output") in signal_flow

    def test_processor_parameter_updates(
        self, audio_engine_integration, react_flow_integration
    ):
        """Test updating processor parameters from React Flow."""
        # Create plugin node
        node_data = PluginNodeData(
            label="Parametric Plugin",
            node_type=NodeType.PLUGIN,
            parameters={"frequency": 440.0, "gain": 0.5, "filter_type": "lowpass"},
        )

        node = Node(
            id="parametric_plugin", position={"x": 100, "y": 100}, data=node_data
        )

        react_flow_integration.add_node(node)

        # Create processor
        audio_engine_integration.create_processor(
            "parametric_plugin", "plugin", node_data.parameters
        )

        # Update parameters via React Flow node
        new_parameters = {"frequency": 880.0, "gain": 0.7, "filter_type": "highpass"}
        react_flow_integration.update_node(
            "parametric_plugin", {"data": {"parameters": new_parameters}}
        )

        # Update audio engine processor
        audio_engine_integration.update_processor_parameters(
            "parametric_plugin", new_parameters
        )

        # Verify parameter updates
        assert (
            audio_engine_integration.active_processors["parametric_plugin"][
                "parameters"
            ]["frequency"]
            == 880.0
        )
        assert (
            audio_engine_integration.active_processors["parametric_plugin"][
                "parameters"
            ]["gain"]
            == 0.7
        )
        assert (
            audio_engine_integration.active_processors["parametric_plugin"][
                "parameters"
            ]["filter_type"]
            == "highpass"
        )


class TestCollaborationFeatures:
    """Test real-time collaboration features."""

    def test_user_connection_management(self, collaboration_integration):
        """Test user connection and disconnection."""
        # Connect users
        user1_connected = collaboration_integration.connect_user("user1", "session1")
        user2_connected = collaboration_integration.connect_user("user2", "session2")

        # Verify connections
        assert user1_connected is True
        assert user2_connected is True
        assert len(collaboration_integration.connected_users) == 2
        assert "user1" in collaboration_integration.connected_users
        assert "user2" in collaboration_integration.connected_users

        # Verify user sessions
        assert (
            collaboration_integration.user_sessions["user1"]["session_id"] == "session1"
        )
        assert (
            collaboration_integration.user_sessions["user2"]["session_id"] == "session2"
        )

        # Disconnect a user
        user1_disconnected = collaboration_integration.disconnect_user("user1")
        assert user1_disconnected is True
        assert len(collaboration_integration.connected_users) == 1
        assert "user1" not in collaboration_integration.connected_users
        assert "user2" in collaboration_integration.connected_users

    def test_cursor_position_tracking(self, collaboration_integration):
        """Test user cursor position tracking."""
        # Connect user
        collaboration_integration.connect_user("user1", "session1")

        # Update cursor position
        cursor_position = {"x": 150.5, "y": 75.2}
        collaboration_integration.update_user_cursor("user1", cursor_position)

        # Verify cursor position update
        assert (
            collaboration_integration.user_sessions["user1"]["cursor"]
            == cursor_position
        )
        assert (
            collaboration_integration.user_sessions["user1"]["last_activity"]
            > collaboration_integration.user_sessions["user1"]["connected_at"]
        )

    def test_graph_state_broadcasting(
        self, collaboration_integration, react_flow_integration
    ):
        """Test broadcasting graph state updates to collaborators."""
        # Connect users
        collaboration_integration.connect_user("user1", "session1")
        collaboration_integration.connect_user("user2", "session2")

        # Create graph state
        node = Node(
            id="broadcast_node",
            position={"x": 100, "y": 100},
            data=NodeData(label="Broadcast Test", node_type=NodeType.PLUGIN),
        )
        react_flow_integration.add_node(node)

        graph_state = react_flow_integration.get_graph_state()

        # Broadcast graph update
        collaboration_integration.broadcast_graph_update(graph_state, "user1")

        # Verify broadcasting
        assert collaboration_integration.shared_graph_state is not None
        assert collaboration_integration.shared_graph_state.nodes == graph_state.nodes

    def test_conflict_resolution(self, collaboration_integration):
        """Test conflict resolution for concurrent edits."""
        # Create mock conflicts
        conflicts = [
            {
                "id": "conflict1",
                "type": "node_position",
                "users": ["user1", "user2"],
                "conflicting_data": [
                    {"user": "user1", "position": {"x": 100, "y": 100}},
                    {"user": "user2", "position": {"x": 200, "y": 200}},
                ],
            },
            {
                "id": "conflict2",
                "type": "edge_creation",
                "users": ["user1", "user3"],
                "conflicting_data": [
                    {"user": "user1", "source": "node1", "target": "node2"},
                    {"user": "user3", "source": "node1", "target": "node3"},
                ],
            },
        ]

        # Resolve conflicts
        resolved = collaboration_integration.resolve_conflicts(conflicts)

        # Verify conflict resolution
        assert len(resolved) == len(conflicts)
        for resolution in resolved:
            assert resolution["resolution"] in ["accepted", "rejected", "merged"]
            assert "resolved_by" in resolution
            assert "timestamp" in resolution

    def test_concurrent_user_activity(self, collaboration_integration):
        """Test handling concurrent user activity."""
        # Connect multiple users
        users = ["user1", "user2", "user3"]
        for user in users:
            collaboration_integration.connect_user(user, f"session_{user[-1]}")

        # Simulate concurrent activity
        activities = []
        for i, user in enumerate(users):
            activity = {
                "user": user,
                "action": "move_node",
                "node_id": f"node_{i}",
                "timestamp": datetime.now().isoformat(),
            }
            activities.append(activity)

        # Update user activity (simulate)
        for activity in activities:
            collaboration_integration.user_sessions[activity["user"]][
                "last_activity"
            ] = datetime.now()

        # Verify all users are still connected and active
        assert len(collaboration_integration.connected_users) == len(users)
        for user in users:
            assert (
                collaboration_integration.user_sessions[user]["last_activity"]
                > collaboration_integration.user_sessions[user]["connected_at"]
            )


class TestAIGraphIntegration:
    """Test AI integration with React Flow graphs."""

    def test_graph_state_analysis(self, ai_integration, react_flow_integration):
        """Test AI analysis of graph state."""
        # Create a complex graph
        nodes = [
            Node(
                id="input1",
                position={"x": 0, "y": 0},
                data=AudioInputNodeData(
                    label="Input 1", node_type=NodeType.AUDIO_INPUT
                ),
            ),
            Node(
                id="plugin1",
                position={"x": 150, "y": 0},
                data=PluginNodeData(label="Plugin 1", node_type=NodeType.PLUGIN),
            ),
            Node(
                id="plugin2",
                position={"x": 300, "y": 0},
                data=PluginNodeData(label="Plugin 2", node_type=NodeType.PLUGIN),
            ),
            Node(
                id="analyzer1",
                position={"x": 450, "y": 0},
                data=AudioAnalysisNodeData(
                    label="Analyzer 1", node_type=NodeType.AUDIO_ANALYSIS
                ),
            ),
        ]

        edges = [
            Edge(id="edge1", source="input1", target="plugin1", data={"type": "audio"}),
            Edge(
                id="edge2", source="plugin1", target="plugin2", data={"type": "audio"}
            ),
            Edge(
                id="edge3", source="plugin2", target="analyzer1", data={"type": "audio"}
            ),
        ]

        for node in nodes:
            react_flow_integration.add_node(node)
        for edge in edges:
            react_flow_integration.add_edge(edge)

        # Analyze graph state
        graph_state = react_flow_integration.get_graph_state()
        analysis = ai_integration.analyze_graph_state(graph_state)

        # Verify analysis
        assert analysis["node_count"] == 4
        assert analysis["edge_count"] == 3
        assert analysis["connectivity"] > 0  # Should have some connectivity
        assert "node_types" in analysis
        assert analysis["node_types"]["audio_input"] == 1
        assert analysis["node_types"]["plugin"] == 2
        assert analysis["node_types"]["audio_analysis"] == 1

    def test_ai_suggestion_generation(self, ai_integration, react_flow_integration):
        """Test AI suggestion generation."""
        # Create empty graph
        empty_graph_state = react_flow_integration.get_graph_state()

        # Generate suggestions
        suggestions = ai_integration._generate_suggestions(empty_graph_state)

        # Empty graph should suggest adding input node
        assert len(suggestions) > 0
        setup_suggestion = next(
            (s for s in suggestions if s["action"] == "add_input_node"), None
        )
        assert setup_suggestion is not None
        assert setup_suggestion["confidence"] > 0.8

        # Create graph with nodes but no edges
        node = Node(
            id="isolated_node",
            position={"x": 100, "y": 100},
            data=NodeData(label="Isolated", node_type=NodeType.PLUGIN),
        )
        react_flow_integration.add_node(node)

        graph_with_nodes = react_flow_integration.get_graph_state()
        suggestions = ai_integration._generate_suggestions(graph_with_nodes)

        # Graph with nodes but no edges should suggest connections
        connection_suggestion = next(
            (s for s in suggestions if s["action"] == "connect_nodes"), None
        )
        assert connection_suggestion is not None
        assert connection_suggestion["confidence"] > 0.7

    def test_ai_suggestion_application(self, ai_integration, react_flow_integration):
        """Test applying AI suggestions to the graph."""
        # Create initial state
        initial_node = Node(
            id="initial_node",
            position={"x": 50, "y": 50},
            data=NodeData(label="Initial", node_type=NodeType.PLUGIN),
        )
        react_flow_integration.add_node(initial_node)

        graph_state = react_flow_integration.get_graph_state()

        # Generate and apply suggestion to add input node
        suggestions = ai_integration._generate_suggestions(graph_state)
        input_suggestion = next(
            (s for s in suggestions if s["action"] == "add_input_node"), None
        )

        if input_suggestion:
            updated_state = ai_integration.apply_suggestion(
                input_suggestion, graph_state
            )

            # Verify suggestion was applied
            assert len(updated_state.nodes) == len(graph_state.nodes) + 1
            new_node = updated_state.nodes[-1]
            assert new_node.data.node_type == NodeType.AUDIO_INPUT
            assert new_node.data.label == "Audio Input"

    def test_suggestion_confidence_scoring(
        self, ai_integration, react_flow_integration
    ):
        """Test AI suggestion confidence scoring."""
        # Create different graph scenarios
        scenarios = [
            {"nodes": 0, "edges": 0, "expected_confidence": 0.9},  # Empty graph
            {
                "nodes": 5,
                "edges": 4,
                "expected_confidence": 0.3,
            },  # Well-connected graph
            {"nodes": 5, "edges": 0, "expected_confidence": 0.8},  # No connections
            {"nodes": 10, "edges": 3, "expected_confidence": 0.6},  # Poor connectivity
        ]

        for scenario in scenarios:
            # Create test graph
            react_flow_integration.nodes.clear()
            react_flow_integration.edges.clear()

            # Add nodes
            for i in range(scenario["nodes"]):
                node = Node(
                    id=f"node_{i}",
                    position={"x": i * 100, "y": 0},
                    data=NodeData(label=f"Node {i}", node_type=NodeType.PLUGIN),
                )
                react_flow_integration.add_node(node)

            # Add edges
            for i in range(scenario["edges"]):
                if i + 1 < scenario["nodes"]:
                    edge = Edge(
                        id=f"edge_{i}",
                        source=f"node_{i}",
                        target=f"node_{i+1}",
                        data={"type": "audio"},
                    )
                    react_flow_integration.add_edge(edge)

            # Generate suggestions and check confidence
            graph_state = react_flow_integration.get_graph_state()
            suggestions = ai_integration._generate_suggestions(graph_state)

            if suggestions:
                avg_confidence = sum(s["confidence"] for s in suggestions) / len(
                    suggestions
                )
                # Check that confidence is in expected range
                assert avg_confidence >= scenario["expected_confidence"] - 0.2
                assert avg_confidence <= 1.0


class TestPerformanceOptimization:
    """Test performance optimization for large graphs."""

    def test_large_graph_handling(self, react_flow_integration):
        """Test handling of large graphs with many nodes."""
        # Create a large graph (100 nodes)
        num_nodes = 100
        nodes_created = []

        for i in range(num_nodes):
            node = Node(
                id=f"large_node_{i}",
                position={"x": (i % 10) * 100, "y": (i // 10) * 100},
                data=NodeData(
                    label=f"Large Node {i}",
                    node_type=NodeType.PLUGIN,
                    metadata={"performance_index": i},
                ),
            )
            node_id = react_flow_integration.add_node(node)
            nodes_created.append(node_id)

        # Verify all nodes were created
        assert len(nodes_created) == num_nodes
        assert len(react_flow_integration.nodes) == num_nodes

        # Test graph state generation performance
        start_time = datetime.now()
        graph_state = react_flow_integration.get_graph_state()
        end_time = datetime.now()

        # Should complete quickly even with large graphs
        generation_time = (end_time - start_time).total_seconds()
        assert generation_time < 1.0  # Should complete in under 1 second

        # Verify state integrity
        assert len(graph_state.nodes) == num_nodes

    def test_edge_count_performance(self, react_flow_integration):
        """Test performance with many edges."""
        # Create nodes
        num_nodes = 50
        for i in range(num_nodes):
            node = Node(
                id=f"perf_node_{i}",
                position={"x": i * 50, "y": i * 30},
                data=NodeData(label=f"Perf Node {i}", node_type=NodeType.PLUGIN),
            )
            react_flow_integration.add_node(node)

        # Create many edges (connect each node to several others)
        edges_created = []
        for i in range(num_nodes):
            for j in range(min(3, num_nodes - i - 1)):
                target_index = i + j + 1
                edge = Edge(
                    id=f"perf_edge_{i}_{j}",
                    source=f"perf_node_{i}",
                    target=f"perf_node_{target_index}",
                    data={"type": "audio"},
                )
                edge_id = react_flow_integration.add_edge(edge)
                edges_created.append(edge_id)

        # Verify all edges were created
        assert (
            len(edges_created) == num_nodes * 3
        )  # Each node connects to 3 others (except last few)

        # Test edge iteration performance
        start_time = datetime.now()
        graph_state = react_flow_integration.get_graph_state()
        end_time = datetime.now()

        iteration_time = (end_time - start_time).total_seconds()
        assert iteration_time < 1.0

        # Verify edge count
        assert len(graph_state.edges) == len(edges_created)

    def test_change_notification_performance(self, react_flow_integration):
        """Test performance of change notifications."""
        # Create change listeners
        notification_count = 0

        def change_listener(change):
            nonlocal notification_count
            notification_count += 1

        react_flow_integration.add_change_listener(change_listener)

        # Make many rapid changes
        num_changes = 50
        for i in range(num_changes):
            node = Node(
                id=f"rapid_node_{i}",
                position={"x": i * 10, "y": i * 10},
                data=NodeData(label=f"Rapid Node {i}", node_type=NodeType.PLUGIN),
            )
            react_flow_integration.add_node(node)

        # Verify all changes were notified
        assert notification_count == num_changes

        # Clear listeners
        react_flow_integration.change_listeners.clear()

        # Make another change (should not be notified)
        react_flow_integration.add_node(
            Node(
                id="final_node",
                position={"x": 500, "y": 500},
                data=NodeData(label="Final Node", node_type=NodeType.PLUGIN),
            )
        )

        # Should have no new notifications
        assert notification_count == num_changes


class TestHierarchicalGraphs:
    """Test hierarchical graph structures for complex workflows."""

    def test_hierarchy_creation(self, react_flow_integration):
        """Test creating hierarchical graph structures."""
        # Create hierarchical structure: Song -> Sections -> Tracks -> Clips
        hierarchy = [
            # Song level
            Node(
                type="default",
                id="song",
                position={"x": 0, "y": 0},
                data=NodeData(
                    label="Main Song",
                    node_type=NodeType.COMPOSITION,
                    metadata={"hierarchy_level": 0, "path": ["song"]},
                ),
            ),
            # Section level
            Node(
                type="default",
                id="verse",
                position={"x": 100, "y": 50},
                data=NodeData(
                    label="Verse",
                    node_type=NodeType.COMPOSITION,
                    metadata={"hierarchy_level": 1, "path": ["song", "verse"]},
                ),
            ),
            Node(
                type="default",
                id="chorus",
                position={"x": 300, "y": 50},
                data=NodeData(
                    label="Chorus",
                    node_type=NodeType.COMPOSITION,
                    metadata={"hierarchy_level": 1, "path": ["song", "chorus"]},
                ),
            ),
            # Track level
            Node(
                type="default",
                id="bass",
                position={"x": 50, "y": 100},
                data=NodeData(
                    label="Bass Track",
                    node_type=NodeType.INSTRUMENT,
                    metadata={"hierarchy_level": 2, "path": ["song", "verse", "bass"]},
                ),
            ),
            Node(
                type="default",
                id="drums",
                position={"x": 150, "y": 100},
                data=NodeData(
                    label="Drums",
                    node_type=NodeType.INSTRUMENT,
                    metadata={"hierarchy_level": 2, "path": ["song", "verse", "drums"]},
                ),
            ),
            Node(
                type="default",
                id="guitar",
                position={"x": 250, "y": 100},
                data=NodeData(
                    label="Guitar",
                    node_type=NodeType.INSTRUMENT,
                    metadata={
                        "hierarchy_level": 2,
                        "path": ["song", "verse", "guitar"],
                    },
                ),
            ),
            # Clip level
            Node(
                type="default",
                id="bass_clip",
                position={"x": 30, "y": 150},
                data=NodeData(
                    label="Bass Clip",
                    node_type=NodeType.EFFECT,
                    metadata={
                        "hierarchy_level": 3,
                        "path": ["song", "verse", "bass", "bass_clip"],
                    },
                ),
            ),
            Node(
                type="default",
                id="guitar_solo",
                position={"x": 230, "y": 150},
                data=NodeData(
                    label="Guitar Solo",
                    node_type=NodeType.EFFECT,
                    metadata={
                        "hierarchy_level": 3,
                        "path": ["song", "verse", "guitar", "guitar_solo"],
                    },
                ),
            ),
        ]

        # Add all nodes
        for node in hierarchy:
            react_flow_integration.add_node(node)

        # Verify hierarchy structure
        hierarchy_levels = {}
        for node in react_flow_integration.nodes:
            level = node.data.metadata["hierarchy_level"]
            if level not in hierarchy_levels:
                hierarchy_levels[level] = []
            hierarchy_levels[level].append(node.id)

        assert len(hierarchy_levels) == 4  # Levels 0, 1, 2, 3
        assert len(hierarchy_levels[0]) == 1  # Song level
        assert len(hierarchy_levels[1]) == 2  # Section level
        assert len(hierarchy_levels[2]) == 3  # Track level
        assert len(hierarchy_levels[3]) == 2  # Clip level

    def test_hierarchy_edges(self, react_flow_integration):
        """Test creating edges that respect hierarchy."""
        # Create hierarchical nodes
        hierarchy_nodes = [
            Node(
                type="default",
                id="song",
                position={"x": 0, "y": 0},
                data=NodeData(
                    label="Song",
                    node_type=NodeType.COMPOSITION,
                    metadata={"hierarchy_level": 0, "path": ["song"]},
                ),
            ),
            Node(
                type="default",
                id="verse",
                position={"x": 100, "y": 50},
                data=NodeData(
                    label="Verse",
                    node_type=NodeType.COMPOSITION,
                    metadata={"hierarchy_level": 1, "path": ["song", "verse"]},
                ),
            ),
            Node(
                type="default",
                id="bass",
                position={"x": 50, "y": 100},
                data=NodeData(
                    label="Bass",
                    node_type=NodeType.INSTRUMENT,
                    metadata={"hierarchy_level": 2, "path": ["song", "verse", "bass"]},
                ),
            ),
        ]

        for node in hierarchy_nodes:
            react_flow_integration.add_node(node)

        # Create hierarchy-respecting edges
        hierarchy_edges = [
            Edge(
                id="song_to_verse",
                source="song",
                target="verse",
                data=EdgeData(type="hierarchy", metadata={"relationship": "contains"}),
            ),
            Edge(
                id="verse_to_bass",
                source="verse",
                target="bass",
                data=EdgeData(type="hierarchy", metadata={"relationship": "contains"}),
            ),
            Edge(
                id="bass_to_solo",
                source="bass",
                target="bass_solo",
                data=EdgeData(type="audio", metadata={"relationship": "routes_to"}),
            ),
        ]

        # Add nodes for clip edge
        bass_solo_node = Node(
            id="bass_solo",
            position={"x": 80, "y": 150},
            data=NodeData(
                label="Bass Solo",
                node_type=NodeType.EFFECT,
                metadata={
                    "hierarchy_level": 3,
                    "path": ["song", "verse", "bass", "bass_solo"],
                },
            ),
        )
        react_flow_integration.add_node(bass_solo_node)

        for edge in hierarchy_edges:
            react_flow_integration.add_edge(edge)

        # Verify hierarchy relationships
        song_to_verse = next(
            (
                e
                for e in react_flow_integration.edges
                if e.source == "song" and e.target == "verse"
            ),
            None,
        )
        verse_to_bass = next(
            (
                e
                for e in react_flow_integration.edges
                if e.source == "verse" and e.target == "bass"
            ),
            None,
        )
        bass_to_solo = next(
            (
                e
                for e in react_flow_integration.edges
                if e.source == "bass" and e.target == "bass_solo"
            ),
            None,
        )

        assert song_to_verse is not None
        assert verse_to_bass is not None
        assert bass_to_solo is not None

        # Verify edge types
        assert song_to_verse.data.type == "hierarchy"
        assert verse_to_bass.data.type == "hierarchy"
        assert bass_to_solo.data.type == "audio"

    def test_hierarchy_visualization(self, react_flow_integration):
        """Test hierarchical graph visualization aspects."""
        # Create hierarchical structure
        hierarchy_nodes = [
            Node(
                type="default",
                id="root",
                position={"x": 200, "y": 50},
                data=NodeData(
                    label="Root",
                    node_type=NodeType.COMPOSITION,
                    metadata={
                        "hierarchy_level": 0,
                        "size": "large",
                        "color": "#primary",
                    },
                ),
            ),
            Node(
                type="default",
                id="child1",
                position={"x": 100, "y": 150},
                data=NodeData(
                    label="Child 1",
                    node_type=NodeType.PLUGIN,
                    metadata={
                        "hierarchy_level": 1,
                        "size": "medium",
                        "color": "#secondary",
                    },
                ),
            ),
            Node(
                type="default",
                id="child2",
                position={"x": 300, "y": 150},
                data=NodeData(
                    label="Child 2",
                    node_type=NodeType.PLUGIN,
                    metadata={
                        "hierarchy_level": 1,
                        "size": "medium",
                        "color": "#secondary",
                    },
                ),
            ),
            Node(
                type="default",
                id="grandchild",
                position={"x": 200, "y": 250},
                data=NodeData(
                    label="Grandchild",
                    node_type=NodeType.EFFECT,
                    metadata={
                        "hierarchy_level": 2,
                        "size": "small",
                        "color": "#accent",
                    },
                ),
            ),
        ]

        for node in hierarchy_nodes:
            react_flow_integration.add_node(node)

        # Create hierarchical edges
        edges = [
            Edge(
                id="root_to_child1",
                source="root",
                target="child1",
                data=EdgeData(type="hierarchy", style="hierarchy_line"),
            ),
            Edge(
                id="root_to_child2",
                source="root",
                target="child2",
                data=EdgeData(type="hierarchy", style="hierarchy_line"),
            ),
            Edge(
                id="child2_to_grandchild",
                source="child2",
                target="grandchild",
                data=EdgeData(type="audio", style="dashed"),
            ),
        ]

        for edge in edges:
            react_flow_integration.add_edge(edge)

        # Test hierarchical graph analysis
        graph_state = react_flow_integration.get_graph_state()

        # Count nodes by hierarchy level
        level_counts = {}
        for node in graph_state.nodes:
            level = node.data.metadata["hierarchy_level"]
            level_counts[level] = level_counts.get(level, 0) + 1

        assert level_counts[0] == 1  # Root node
        assert level_counts[1] == 2  # Child nodes
        assert level_counts[2] == 1  # Grandchild node

        # Test hierarchy depth
        max_depth = max(level_counts.keys())
        assert max_depth == 2  # Should have 3 levels (0, 1, 2)


if __name__ == "__main__":
    pytest.main([__file__])
