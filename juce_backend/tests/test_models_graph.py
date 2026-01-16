"""Tests for React Flow graph state models."""

import pytest
from audio_agent.models.graph import (
    AudioInputNodeData,
    Edge,
    GraphState,
    GraphStateRoot,
    Node,
    NodeData,
    NodeType,
    PluginNodeData,
    Viewport,
)
from pydantic import ValidationError


class TestNodeType:
    """Test NodeType enum."""

    def test_node_type_values(self):
        """Test that all expected node types are defined."""
        assert NodeType.AUDIO_INPUT == "audio_input"
        assert NodeType.AUDIO_ANALYSIS == "audio_analysis"
        assert NodeType.PLUGIN == "plugin"
        assert NodeType.MIXER == "mixer"
        assert NodeType.OUTPUT == "output"
        assert NodeType.COMPOSITION == "composition"
        assert NodeType.INSTRUMENT == "instrument"
        assert NodeType.EFFECT == "effect"
        assert NodeType.CONTROL == "control"


class TestNodeData:
    """Test base NodeData model."""

    def test_valid_node_data(self):
        """Test creation of valid node data."""
        data = NodeData(
            label="Test Node",
            node_type=NodeType.AUDIO_INPUT,
            description="Test description",
            metadata={"key": "value"},
        )

        assert data.label == "Test Node"
        assert data.node_type == NodeType.AUDIO_INPUT
        assert data.description == "Test description"
        assert data.metadata == {"key": "value"}

    def test_node_data_missing_required(self):
        """Test validation error for missing required fields."""
        with pytest.raises(ValidationError) as exc_info:
            NodeData(
                # Missing label
                node_type=NodeType.AUDIO_INPUT,
            )

        assert "label" in str(exc_info.value)

    def test_node_data_default_metadata(self):
        """Test default metadata is empty dict."""
        data = NodeData(
            label="Test",
            node_type=NodeType.AUDIO_INPUT,
        )

        assert data.metadata == {}


class TestAudioInputNodeData:
    """Test AudioInputNodeData model."""

    def test_valid_audio_input_node(self):
        """Test creation of valid audio input node."""
        data = AudioInputNodeData(
            label="Audio Input",
            node_type=NodeType.AUDIO_INPUT,
            file_path="/path/to/audio.wav",
            duration=120.5,
            sample_rate=44100,
            channels=2,
        )

        assert data.label == "Audio Input"
        assert data.node_type == NodeType.AUDIO_INPUT
        assert data.file_path == "/path/to/audio.wav"
        assert data.duration == 120.5
        assert data.sample_rate == 44100
        assert data.channels == 2

    def test_audio_input_node_optional_fields(self):
        """Test audio input node with optional fields as None."""
        data = AudioInputNodeData(
            label="Audio Input",
            node_type=NodeType.AUDIO_INPUT,
        )

        assert data.file_path is None
        assert data.duration is None
        assert data.sample_rate is None
        assert data.channels is None


class TestPluginNodeData:
    """Test PluginNodeData model."""

    def test_valid_plugin_node(self):
        """Test creation of valid plugin node."""
        data = PluginNodeData(
            label="EQ Plugin",
            node_type=NodeType.PLUGIN,
            plugin_id="fabfilter_proq3",
            plugin_name="Pro-Q 3",
            plugin_type="VST3",
            parameters={"gain": 0.0, "frequency": 1000.0},
            bypassed=False,
        )

        assert data.label == "EQ Plugin"
        assert data.plugin_id == "fabfilter_proq3"
        assert data.plugin_name == "Pro-Q 3"
        assert data.plugin_type == "VST3"
        assert data.parameters == {"gain": 0.0, "frequency": 1000.0}
        assert data.bypassed is False

    def test_plugin_node_bypassed(self):
        """Test bypassed plugin node."""
        data = PluginNodeData(
            label="Bypassed Plugin",
            node_type=NodeType.PLUGIN,
            plugin_id="test_plugin",
            bypassed=True,
        )

        assert data.bypassed is True


class TestNode:
    """Test Node model."""

    def test_valid_node(self):
        """Test creation of valid node."""
        data = AudioInputNodeData(
            label="Audio Input",
            node_type=NodeType.AUDIO_INPUT,
        )

        node = Node(
            id="node_1",
            type="audioInput",
            position={"x": 100.0, "y": 200.0},
            data=data,
            width=200,
            height=100,
        )

        assert node.id == "node_1"
        assert node.type == "audioInput"
        assert node.position == {"x": 100.0, "y": 200.0}
        assert node.width == 200
        assert node.height == 100
        assert node.selected is False
        assert node.dragging is False
        assert node.zIndex == 0

    def test_node_default_values(self):
        """Test node default values."""
        data = AudioInputNodeData(
            label="Audio Input",
            node_type=NodeType.AUDIO_INPUT,
        )

        node = Node(
            id="node_1",
            type="audioInput",
            position={"x": 0.0, "y": 0.0},
            data=data,
        )

        assert node.width is None
        assert node.height is None
        assert node.selected is False
        assert node.dragging is False
        assert node.zIndex == 0

    def test_node_extra_fields_forbidden(self):
        """Test that extra fields are forbidden."""
        data = AudioInputNodeData(
            label="Audio Input",
            node_type=NodeType.AUDIO_INPUT,
        )

        with pytest.raises(ValidationError) as exc_info:
            Node(
                id="node_1",
                type="audioInput",
                position={"x": 0.0, "y": 0.0},
                data=data,
                extra_field="not_allowed",
            )

        assert "extra" in str(exc_info.value)


class TestEdge:
    """Test Edge model."""

    def test_valid_edge(self):
        """Test creation of valid edge."""
        edge = Edge(
            id="edge_1",
            source="node_1",
            target="node_2",
            type="default",
            animated=False,
        )

        assert edge.id == "edge_1"
        assert edge.source == "node_1"
        assert edge.target == "node_2"
        assert edge.type == "default"
        assert edge.animated is False
        assert edge.selected is False

    def test_edge_with_handles(self):
        """Test edge with source and target handles."""
        edge = Edge(
            id="edge_1",
            source="node_1",
            target="node_2",
            sourceHandle="source_handle",
            targetHandle="target_handle",
        )

        assert edge.sourceHandle == "source_handle"
        assert edge.targetHandle == "target_handle"

    def test_edge_types(self):
        """Test different edge types."""
        edge_types = ["default", "straight", "step", "smoothstep", "bezier"]

        for edge_type in edge_types:
            edge = Edge(
                id=f"edge_{edge_type}",
                source="node_1",
                target="node_2",
                type=edge_type,
            )
            assert edge.type == edge_type

    def test_edge_animated(self):
        """Test animated edge."""
        edge = Edge(
            id="edge_1",
            source="node_1",
            target="node_2",
            animated=True,
        )

        assert edge.animated is True

    def test_edge_extra_fields_forbidden(self):
        """Test that extra fields are forbidden."""
        with pytest.raises(ValidationError) as exc_info:
            Edge(
                id="edge_1",
                source="node_1",
                target="node_2",
                extra_field="not_allowed",
            )

        assert "extra" in str(exc_info.value)


class TestViewport:
    """Test Viewport model."""

    def test_default_viewport(self):
        """Test default viewport values."""
        viewport = Viewport()

        assert viewport.x == 0
        assert viewport.y == 0
        assert viewport.zoom == 1

    def test_custom_viewport(self):
        """Test custom viewport values."""
        viewport = Viewport(x=100.5, y=200.3, zoom=1.5)

        assert viewport.x == 100.5
        assert viewport.y == 200.3
        assert viewport.zoom == 1.5


class TestGraphState:
    """Test GraphState model."""

    def test_empty_graph_state(self):
        """Test creation of empty graph state."""
        graph = GraphState()

        assert graph.nodes == []
        assert graph.edges == []
        assert graph.viewport.x == 0
        assert graph.viewport.y == 0
        assert graph.viewport.zoom == 1
        assert graph.name is None
        assert graph.description is None
        assert graph.version == "1.0.0"

    def test_graph_state_with_metadata(self):
        """Test graph state with metadata."""
        graph = GraphState(
            name="Test Graph",
            description="Test description",
            version="2.0.0",
        )

        assert graph.name == "Test Graph"
        assert graph.description == "Test description"
        assert graph.version == "2.0.0"

    def test_add_node(self):
        """Test adding node to graph."""
        graph = GraphState()
        data = AudioInputNodeData(
            label="Audio Input",
            node_type=NodeType.AUDIO_INPUT,
        )
        node = Node(
            id="node_1",
            type="audioInput",
            position={"x": 100.0, "y": 200.0},
            data=data,
        )

        graph.add_node(node)

        assert len(graph.nodes) == 1
        assert graph.nodes[0].id == "node_1"

    def test_remove_node(self):
        """Test removing node from graph."""
        graph = GraphState()
        data1 = AudioInputNodeData(
            label="Audio Input 1",
            node_type=NodeType.AUDIO_INPUT,
        )
        data2 = AudioInputNodeData(
            label="Audio Input 2",
            node_type=NodeType.AUDIO_INPUT,
        )
        node1 = Node(
            id="node_1",
            type="audioInput",
            position={"x": 100.0, "y": 200.0},
            data=data1,
        )
        node2 = Node(
            id="node_2",
            type="audioInput",
            position={"x": 300.0, "y": 400.0},
            data=data2,
        )
        edge = Edge(
            id="edge_1",
            source="node_1",
            target="node_2",
        )

        graph.add_node(node1)
        graph.add_node(node2)
        graph.add_edge(edge)

        # Remove node and verify edge is also removed
        graph.remove_node("node_1")

        assert len(graph.nodes) == 1
        assert graph.nodes[0].id == "node_2"
        assert len(graph.edges) == 0  # Edge should be removed

    def test_add_edge(self):
        """Test adding edge to graph."""
        graph = GraphState()
        edge = Edge(
            id="edge_1",
            source="node_1",
            target="node_2",
        )

        graph.add_edge(edge)

        assert len(graph.edges) == 1
        assert graph.edges[0].id == "edge_1"

    def test_remove_edge(self):
        """Test removing edge from graph."""
        graph = GraphState()
        edge1 = Edge(
            id="edge_1",
            source="node_1",
            target="node_2",
        )
        edge2 = Edge(
            id="edge_2",
            source="node_2",
            target="node_3",
        )

        graph.add_edge(edge1)
        graph.add_edge(edge2)

        graph.remove_edge("edge_1")

        assert len(graph.edges) == 1
        assert graph.edges[0].id == "edge_2"

    def test_get_node(self):
        """Test getting node by ID."""
        graph = GraphState()
        data = AudioInputNodeData(
            label="Audio Input",
            node_type=NodeType.AUDIO_INPUT,
        )
        node = Node(
            id="node_1",
            type="audioInput",
            position={"x": 100.0, "y": 200.0},
            data=data,
        )

        graph.add_node(node)

        found_node = graph.get_node("node_1")
        assert found_node is not None
        assert found_node.id == "node_1"

        not_found = graph.get_node("nonexistent")
        assert not_found is None

    def test_get_edge(self):
        """Test getting edge by ID."""
        graph = GraphState()
        edge = Edge(
            id="edge_1",
            source="node_1",
            target="node_2",
        )

        graph.add_edge(edge)

        found_edge = graph.get_edge("edge_1")
        assert found_edge is not None
        assert found_edge.id == "edge_1"

        not_found = graph.get_edge("nonexistent")
        assert not_found is None

    def test_get_connected_nodes(self):
        """Test getting connected nodes."""
        graph = GraphState()
        edge1 = Edge(id="edge_1", source="node_1", target="node_2")
        edge2 = Edge(id="edge_2", source="node_2", target="node_3")
        edge3 = Edge(id="edge_3", source="node_3", target="node_1")

        graph.add_edge(edge1)
        graph.add_edge(edge2)
        graph.add_edge(edge3)

        # Node 1 is connected to nodes 2 and 3
        connected = graph.get_connected_nodes("node_1")
        assert set(connected) == {"node_2", "node_3"}

        # Node 2 is connected to nodes 1 and 3
        connected = graph.get_connected_nodes("node_2")
        assert set(connected) == {"node_1", "node_3"}

    def test_graph_serialization(self):
        """Test graph state JSON serialization."""
        graph = GraphState(
            name="Test Graph",
            description="Test description",
        )

        data = AudioInputNodeData(
            label="Audio Input",
            node_type=NodeType.AUDIO_INPUT,
        )
        node = Node(
            id="node_1",
            type="audioInput",
            position={"x": 100.0, "y": 200.0},
            data=data,
        )
        edge = Edge(
            id="edge_1",
            source="node_1",
            target="node_1",
        )

        graph.add_node(node)
        graph.add_edge(edge)

        # Test serialization
        json_data = graph.model_dump()
        assert json_data["name"] == "Test Graph"
        assert len(json_data["nodes"]) == 1
        assert len(json_data["edges"]) == 1

        # Test deserialization
        parsed_graph = GraphState.model_validate(json_data)
        assert parsed_graph.name == "Test Graph"
        assert len(parsed_graph.nodes) == 1
        assert len(parsed_graph.edges) == 1


class TestGraphStateRoot:
    """Test GraphStateRoot model."""

    def test_graph_state_root(self):
        """Test GraphStateRoot wrapper."""
        graph = GraphState(name="Test Graph")
        root = GraphStateRoot(graph)

        assert root.root.name == "Test Graph"

        # Test serialization through root
        json_data = root.model_dump()
        assert json_data["name"] == "Test Graph"

        # Test deserialization through root
        parsed_root = GraphStateRoot.model_validate(json_data)
        assert parsed_root.root.name == "Test Graph"
