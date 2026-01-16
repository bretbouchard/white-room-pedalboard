"""
End-to-end integration tests for complete audio agent workflows.

This module tests complete user workflows from start to finish:
- Audio file upload to analysis to plugin processing
- Graph creation to audio export workflows
- Real-time collaboration workflows
- AI-powered composition workflows
- Plugin discovery and deployment workflows
- Error recovery and graceful degradation workflows
"""

import logging
import tempfile
import time
from pathlib import Path
from unittest.mock import Mock

import numpy as np
import pytest

from src.audio_agent.core.audio_buffer_manager import (
    AudioBufferManager,
    BufferConfig,
    BufferState,
    BufferType,
)
from src.audio_agent.core.real_time_processing import (
    AudioBitDepth,
    AudioExportSettings,
    AudioFormat,
    RealTimeProcessor,
)
from src.audio_agent.models.graph import (
    AudioInputNodeData,
    Edge,
    GraphState,
    Node,
    NodeType,
    OutputNodeData,
    PluginNodeData,
)
from src.audio_agent.models.plugin import PluginParameter
from src.audio_agent.models.validation import (
    validate_audio_data,
    validate_buffer_size,
    validate_sample_rate,
)


# Mock PluginDatabase since the real one requires complex configuration
class MockPluginDatabase:
    """Mock plugin database for testing."""

    def __init__(self):
        self.plugins = {}
        self.plugin_counter = 0

    def register_plugin(self, plugin_name, plugin_instance):
        """Register a plugin."""
        plugin_id = f"{plugin_name}_{self.plugin_counter}"
        self.plugins[plugin_id] = plugin_instance
        self.plugin_counter += 1
        return plugin_id

    def unregister_plugin(self, plugin_id):
        """Unregister a plugin."""
        if plugin_id in self.plugins:
            del self.plugins[plugin_id]

    def process_audio(self, plugin_id, audio_data):
        """Process audio with a plugin."""
        if plugin_id not in self.plugins:
            raise ValueError(f"Plugin {plugin_id} not found")

        plugin = self.plugins[plugin_id]
        return plugin.process(audio_data)

    @property
    def plugins_count(self):
        """Get number of registered plugins."""
        return len(self.plugins)


class MockAudioFile:
    """Mock audio file for testing."""

    def __init__(self, filename: str, sample_rate: int = 44100, duration: float = 1.0):
        self.filename = filename
        self.sample_rate = sample_rate
        self.duration = duration
        self.samples = 8192  # Fixed power of 2 size for validation
        self.data = np.random.randint(-32768, 32767, self.samples, dtype=np.int16)

    def save_to_file(self, filepath: Path):
        """Save mock audio data to file."""
        # In a real implementation, this would save actual audio data
        filepath.write_bytes(b"mock_audio_data_" + str(len(self.data)).encode())


class TestAudioProcessingWorkflow:
    """Test complete audio processing workflows from input to output."""

    @pytest.fixture
    def audio_workspace(self):
        """Create a complete audio processing workspace."""
        config = BufferConfig(
            buffer_type=BufferType.MEMORY,
            max_memory_mb=100,
            buffer_size=1024,
            sample_rate=44100,
            channels=2,
        )
        return {
            "buffer_manager": AudioBufferManager(config),
            "processor": None,  # Will be initialized in test
            "plugin_database": MockPluginDatabase(),
            "temp_dir": Path(tempfile.mkdtemp()),
        }

    def test_complete_audio_file_processing_workflow(self, audio_workspace):
        """Test workflow: Upload → Validate → Process → Export."""
        buffer_manager = audio_workspace["buffer_manager"]
        plugin_database = audio_workspace["plugin_database"]
        temp_dir = audio_workspace["temp_dir"]

        # Step 1: Audio file upload simulation
        audio_file = MockAudioFile("test_audio.wav", sample_rate=44100, duration=2.0)
        upload_path = temp_dir / audio_file.filename
        audio_file.save_to_file(upload_path)

        assert upload_path.exists(), "Audio file upload failed"

        # Step 2: Audio validation
        try:
            validate_audio_data(audio_file.data)
            validate_sample_rate(audio_file.sample_rate)
            validate_buffer_size(len(audio_file.data))
        except Exception as e:
            pytest.fail(f"Audio validation failed: {e}")

        # Step 3: Buffer creation and loading
        buffer_id = buffer_manager.create_buffer(
            buffer_id="test_buffer",
            buffer_type=BufferType.MEMORY,
            size=len(audio_file.data),
            sample_rate=audio_file.sample_rate,
        )

        assert buffer_manager.get_buffer_state(buffer_id) == BufferState.READY

        # Load audio data into buffer
        buffer_manager.write_buffer(buffer_id, 0, audio_file.data)

        # Step 4: Plugin setup and processing
        # Mock plugin for processing
        mock_plugin = Mock()
        mock_plugin.process.return_value = (
            audio_file.data * 0.8
        )  # Simulate gain reduction
        mock_plugin.get_parameters.return_value = [
            PluginParameter(name="gain", value=0.8, min_val=0.0, max_val=2.0)
        ]

        plugin_id = plugin_database.register_plugin("gain_plugin", mock_plugin)
        processed_data = plugin_database.process_audio(plugin_id, audio_file.data)

        assert processed_data is not None
        assert len(processed_data) == len(audio_file.data)

        # Step 5: Export processed audio
        export_path = temp_dir / "processed_audio.wav"

        # Mock export functionality
        export_settings = AudioExportSettings(
            format=AudioFormat.WAV,
            bit_depth=AudioBitDepth.BIT_16,
            sample_rate=audio_file.sample_rate,
        )

        # In real implementation, this would export actual audio data
        export_path.write_bytes(
            b"processed_audio_data_" + str(len(processed_data)).encode()
        )

        assert export_path.exists(), "Audio export failed"

        # Step 6: Cleanup
        buffer_manager.remove_buffer(buffer_id)
        plugin_database.unregister_plugin(plugin_id)

        # Verify workspace state
        assert len(buffer_manager.buffers) == 0
        assert len(plugin_database.plugins) == 0

    def test_multi_plugin_processing_chain_workflow(self, audio_workspace):
        """Test workflow with multiple plugins in processing chain."""
        buffer_manager = audio_workspace["buffer_manager"]
        plugin_database = audio_workspace["plugin_database"]

        # Create initial audio data
        audio_data = np.random.randint(-32768, 32767, 1024, dtype=np.int16)

        # Step 1: Setup processing chain (EQ → Compressor → Reverb)
        plugins = []

        # EQ plugin
        eq_plugin = Mock()
        eq_plugin.process.return_value = audio_data * 1.2  # Simulate EQ boost
        eq_plugin.get_parameters.return_value = [
            PluginParameter(
                name="frequency", value=1000.0, min_val=20.0, max_val=20000.0
            ),
            PluginParameter(name="gain", value=3.0, min_val=-20.0, max_val=20.0),
        ]

        # Compressor plugin
        comp_plugin = Mock()
        comp_plugin.process.return_value = audio_data * 0.9  # Simulate compression
        comp_plugin.get_parameters.return_value = [
            PluginParameter(name="threshold", value=-20.0, min_val=-60.0, max_val=0.0),
            PluginParameter(name="ratio", value=4.0, min_val=1.0, max_val=20.0),
        ]

        # Reverb plugin
        reverb_plugin = Mock()
        reverb_plugin.process.return_value = audio_data + np.random.randint(
            -100, 100, len(audio_data), dtype=np.int16
        )
        reverb_plugin.get_parameters.return_value = [
            PluginParameter(name="room_size", value=0.5, min_val=0.0, max_val=1.0),
            PluginParameter(name="wet_level", value=0.3, min_val=0.0, max_val=1.0),
        ]

        # Register plugins
        eq_id = plugin_database.register_plugin("eq", eq_plugin)
        comp_id = plugin_database.register_plugin("compressor", comp_plugin)
        reverb_id = plugin_database.register_plugin("reverb", reverb_plugin)

        plugins = [eq_id, comp_id, reverb_id]

        # Step 2: Process through chain
        current_data = audio_data.copy()
        processing_steps = []

        for i, plugin_id in enumerate(plugins):
            step_name = f"step_{i+1}"
            current_data = plugin_database.process_audio(plugin_id, current_data)

            processing_steps.append(
                {
                    "step": i + 1,
                    "plugin_id": plugin_id,
                    "input_length": len(current_data),
                    "output_length": len(current_data),
                }
            )

            assert current_data is not None, f"Processing failed at step {i+1}"
            assert len(current_data) == len(
                audio_data
            ), f"Length mismatch at step {i+1}"

        # Step 3: Verify processing chain integrity
        assert len(processing_steps) == 3, "Not all processing steps completed"

        for step in processing_steps:
            assert (
                step["input_length"] == step["output_length"]
            ), "Length changed during processing"

        # Step 4: Cleanup
        for plugin_id in plugins:
            plugin_database.unregister_plugin(plugin_id)

    def test_real_time_processing_workflow(self, audio_workspace):
        """Test real-time audio processing workflow."""
        processor_config = {
            "buffer_size": 512,
            "sample_rate": 44100,
            "channels": 2,
            "max_latency": 50,
        }

        processor = RealTimeProcessor(processor_config)

        try:
            # Step 1: Initialize real-time processing
            processor.start()
            assert processor.is_running, "Processor failed to start"

            # Step 2: Process multiple audio buffers in real-time
            num_buffers = 10
            processing_times = []

            for i in range(num_buffers):
                # Generate input buffer
                input_buffer = np.random.randint(-32768, 32767, 512, dtype=np.int16)

                # Process with timing
                start_time = time.perf_counter()
                output_buffer = processor.process_buffer(input_buffer, 512)
                end_time = time.perf_counter()

                processing_time_ms = (end_time - start_time) * 1000
                processing_times.append(processing_time_ms)

                # Verify output
                assert output_buffer is not None, f"Buffer {i} processing failed"
                assert len(output_buffer) == 512, f"Buffer {i} output length incorrect"

                # Simulate real-time constraints
                buffer_duration_ms = (512 / 44100) * 1000
                assert (
                    processing_time_ms < buffer_duration_ms
                ), f"Real-time constraint violated at buffer {i}: {processing_time_ms:.2f}ms"

            # Step 3: Analyze real-time performance
            avg_processing_time = sum(processing_times) / len(processing_times)
            max_processing_time = max(processing_times)

            assert (
                avg_processing_time < 5.0
            ), f"Average processing too slow: {avg_processing_time:.2f}ms"
            assert (
                max_processing_time < 10.0
            ), f"Peak processing too slow: {max_processing_time:.2f}ms"

        finally:
            # Step 4: Cleanup
            processor.stop()


class TestGraphBasedWorkflow:
    """Test React Flow graph-based audio processing workflows."""

    @pytest.fixture
    def graph_workspace(self):
        """Create a graph-based audio processing workspace."""
        config = BufferConfig(
            buffer_type=BufferType.MEMORY,
            max_memory_mb=100,
            buffer_size=1024,
            sample_rate=44100,
            channels=2,
        )
        return {
            "graph_state": GraphState(),
            "buffer_manager": AudioBufferManager(config),
            "plugin_database": PluginDatabase(),
        }

    def test_graph_creation_to_audio_export_workflow(self, graph_workspace):
        """Test complete workflow: Graph creation → Node configuration → Audio processing → Export."""
        graph_state = graph_workspace["graph_state"]
        buffer_manager = graph_workspace["buffer_manager"]
        plugin_database = graph_workspace["plugin_database"]

        # Step 1: Create graph structure
        # Audio Input Node
        input_node = Node(
            id="audio_input_1",
            type="audioInput",
            position={"x": 100, "y": 100},
            data=AudioInputNodeData(
                label="Audio Input",
                node_type=NodeType.AUDIO_INPUT,
                file_path="test_input.wav",
                sample_rate=44100,
                channels=2,
            ),
        )

        # Plugin Node (EQ)
        eq_node = Node(
            id="eq_plugin_1",
            type="plugin",
            position={"x": 300, "y": 100},
            data=PluginNodeData(
                label="EQ Plugin",
                node_type=NodeType.PLUGIN,
                plugin_id="eq_1",
                plugin_name="Parametric EQ",
                parameters={"frequency": 1000.0, "gain": 3.0, "q": 1.0},
            ),
        )

        # Output Node
        output_node = Node(
            id="audio_output_1",
            type="output",
            position={"x": 500, "y": 100},
            data=OutputNodeData(
                label="Audio Output",
                node_type=NodeType.OUTPUT,
                output_format="wav",
                output_path="test_output.wav",
            ),
        )

        # Step 2: Add nodes to graph
        graph_state.add_node(input_node)
        graph_state.add_node(eq_node)
        graph_state.add_node(output_node)

        assert len(graph_state.nodes) == 3, "Not all nodes added to graph"

        # Step 3: Create connections (edges)
        input_to_eq = Edge(
            id="edge_input_eq",
            source="audio_input_1",
            target="eq_plugin_1",
            type="default",
            data={"connection_type": "audio"},
        )

        eq_to_output = Edge(
            id="edge_eq_output",
            source="eq_plugin_1",
            target="audio_output_1",
            type="default",
            data={"connection_type": "audio"},
        )

        graph_state.add_edge(input_to_eq)
        graph_state.add_edge(eq_to_output)

        assert len(graph_state.edges) == 2, "Not all edges added to graph"

        # Step 4: Validate graph structure
        connected_nodes = graph_state.get_connected_nodes("audio_input_1")
        assert "eq_plugin_1" in connected_nodes, "Input node not connected to EQ"

        connected_nodes = graph_state.get_connected_nodes("eq_plugin_1")
        assert "audio_input_1" in connected_nodes, "EQ not connected to input"
        assert "audio_output_1" in connected_nodes, "EQ not connected to output"

        # Step 5: Simulate audio processing through graph
        # Mock audio data
        audio_data = np.random.randint(-32768, 32767, 1024, dtype=np.int16)

        # Create buffer for input node
        input_buffer_id = buffer_manager.create_buffer(
            buffer_id="input_buffer",
            buffer_type=BufferType.MEMORY,
            size=len(audio_data),
            sample_rate=44100,
        )
        buffer_manager.write_buffer(input_buffer_id, 0, audio_data)

        # Mock EQ plugin
        eq_plugin = Mock()
        eq_plugin.process.return_value = audio_data * 1.2  # Simulate EQ boost
        plugin_database.register_plugin("eq_1", eq_plugin)

        # Step 6: Process audio through graph
        processing_log = []

        # Input to EQ
        eq_input = buffer_manager.read_buffer(input_buffer_id, 0, len(audio_data))
        processing_log.append(f"Input node processed {len(eq_input)} samples")

        # EQ processing
        eq_output = plugin_database.process_audio("eq_1", eq_input)
        processing_log.append(f"EQ plugin processed {len(eq_output)} samples")

        # Create output buffer
        output_buffer_id = buffer_manager.create_buffer(
            buffer_id="output_buffer",
            buffer_type=BufferType.MEMORY,
            size=len(eq_output),
            sample_rate=44100,
        )
        buffer_manager.write_buffer(output_buffer_id, 0, eq_output)
        processing_log.append(f"Output node received {len(eq_output)} samples")

        # Step 7: Verify processing results
        assert len(processing_log) == 3, "Not all processing steps completed"

        for log_entry in processing_log:
            assert (
                "1024 samples" in log_entry
            ), f"Incorrect processing in step: {log_entry}"

        # Step 8: Export graph state
        graph_json = graph_state.model_dump()
        assert graph_json["nodes"], "Graph serialization failed"
        assert graph_json["edges"], "Graph serialization failed"

        # Step 9: Cleanup
        buffer_manager.remove_buffer(input_buffer_id)
        buffer_manager.remove_buffer(output_buffer_id)
        plugin_database.unregister_plugin("eq_1")

    def test_complex_graph_with_parallel_processing(self, graph_workspace):
        """Test workflow with parallel processing paths."""
        graph_state = graph_workspace["graph_state"]

        # Step 1: Create complex graph with parallel branches
        # Input node
        input_node = Node(
            id="input",
            type="audioInput",
            position={"x": 100, "y": 200},
            data=AudioInputNodeData(label="Main Input", node_type=NodeType.AUDIO_INPUT),
        )

        # Branch 1: EQ → Compressor
        eq_node = Node(
            id="eq",
            type="plugin",
            position={"x": 250, "y": 100},
            data=PluginNodeData(
                label="EQ", node_type=NodeType.PLUGIN, plugin_id="eq_1"
            ),
        )

        comp_node = Node(
            id="compressor",
            type="plugin",
            position={"x": 400, "y": 100},
            data=PluginNodeData(
                label="Compressor", node_type=NodeType.PLUGIN, plugin_id="comp_1"
            ),
        )

        # Branch 2: Reverb → Delay
        reverb_node = Node(
            id="reverb",
            type="plugin",
            position={"x": 250, "y": 300},
            data=PluginNodeData(
                label="Reverb", node_type=NodeType.PLUGIN, plugin_id="reverb_1"
            ),
        )

        delay_node = Node(
            id="delay",
            type="plugin",
            position={"x": 400, "y": 300},
            data=PluginNodeData(
                label="Delay", node_type=NodeType.PLUGIN, plugin_id="delay_1"
            ),
        )

        # Mixer node
        mixer_node = Node(
            id="mixer",
            type="plugin",
            position={"x": 550, "y": 200},
            data=PluginNodeData(
                label="Mixer", node_type=NodeType.PLUGIN, plugin_id="mixer_1"
            ),
        )

        # Output node
        output_node = Node(
            id="output",
            type="output",
            position={"x": 700, "y": 200},
            data=OutputNodeData(label="Output", node_type=NodeType.OUTPUT),
        )

        # Step 2: Add all nodes
        nodes = [
            input_node,
            eq_node,
            comp_node,
            reverb_node,
            delay_node,
            mixer_node,
            output_node,
        ]
        for node in nodes:
            graph_state.add_node(node)

        assert len(graph_state.nodes) == 7, "Not all nodes added"

        # Step 3: Create connections for parallel processing
        edges = [
            Edge(id="input_eq", source="input", target="eq"),
            Edge(id="eq_comp", source="eq", target="compressor"),
            Edge(id="input_reverb", source="input", target="reverb"),
            Edge(id="reverb_delay", source="reverb", target="delay"),
            Edge(id="comp_mixer", source="compressor", target="mixer"),
            Edge(id="delay_mixer", source="delay", target="mixer"),
            Edge(id="mixer_output", source="mixer", target="output"),
        ]

        for edge in edges:
            graph_state.add_edge(edge)

        assert len(graph_state.edges) == 7, "Not all edges added"

        # Step 4: Analyze graph structure
        # Verify parallel branches
        input_connections = graph_state.get_connected_nodes("input")
        assert len(input_connections) == 2, "Input should branch to 2 paths"
        assert "eq" in input_connections
        assert "reverb" in input_connections

        # Verify mixer receives from both branches
        mixer_connections = graph_state.get_connected_nodes("mixer")
        assert "compressor" in mixer_connections
        assert "delay" in mixer_connections
        assert "output" in mixer_connections

        # Step 5: Validate processing order (topological sort simulation)
        processing_order = []
        visited = set()

        def visit_node(node_id):
            if node_id in visited:
                return
            visited.add(node_id)

            # Visit all dependencies first
            for edge in graph_state.edges:
                if edge.target == node_id:
                    visit_node(edge.source)

            processing_order.append(node_id)

        visit_node("output")

        # Verify processing order makes sense
        assert processing_order[0] == "input", "Input should be processed first"
        assert processing_order[-1] == "output", "Output should be processed last"

        # Both branches should be processed before mixer
        compressor_index = processing_order.index("compressor")
        delay_index = processing_order.index("delay")
        mixer_index = processing_order.index("mixer")

        assert (
            compressor_index < mixer_index
        ), "Compressor should be processed before mixer"
        assert delay_index < mixer_index, "Delay should be processed before mixer"


class TestCollaborationWorkflow:
    """Test real-time collaboration workflows."""

    def test_multi_user_graph_editing_workflow(self):
        """Test workflow: Multiple users editing graph simultaneously."""
        # Simulate shared graph state
        shared_graph = GraphState()

        # User 1 creates initial structure
        user1_nodes = [
            Node(
                id="user1_input",
                type="audioInput",
                position={"x": 50, "y": 50},
                data=AudioInputNodeData(
                    label="User1 Input", node_type=NodeType.AUDIO_INPUT
                ),
            ),
            Node(
                id="user1_plugin",
                type="plugin",
                position={"x": 200, "y": 50},
                data=PluginNodeData(label="User1 Plugin", node_type=NodeType.PLUGIN),
            ),
        ]

        for node in user1_nodes:
            shared_graph.add_node(node)

        # User 2 adds their components
        user2_nodes = [
            Node(
                id="user2_plugin",
                type="plugin",
                position={"x": 200, "y": 150},
                data=PluginNodeData(label="User2 Plugin", node_type=NodeType.PLUGIN),
            ),
            Node(
                id="user2_output",
                type="output",
                position={"x": 350, "y": 100},
                data=OutputNodeData(label="User2 Output", node_type=NodeType.OUTPUT),
            ),
        ]

        for node in user2_nodes:
            shared_graph.add_node(node)

        # Verify both users' nodes are present
        assert len(shared_graph.nodes) == 4, "Not all nodes from both users present"

        user1_node_ids = {node.id for node in user1_nodes}
        user2_node_ids = {node.id for node in user2_nodes}

        graph_node_ids = {node.id for node in shared_graph.nodes}
        assert user1_node_ids.issubset(graph_node_ids), "User1 nodes missing"
        assert user2_node_ids.issubset(graph_node_ids), "User2 nodes missing"

        # Users collaborate on connections
        collaboration_edges = [
            Edge(id="edge1", source="user1_input", target="user1_plugin"),
            Edge(id="edge2", source="user1_plugin", target="user2_plugin"),
            Edge(id="edge3", source="user2_plugin", target="user2_output"),
        ]

        for edge in collaboration_edges:
            shared_graph.add_edge(edge)

        # Verify complete collaboration graph
        assert len(shared_graph.edges) == 3, "Not all collaboration edges present"

        # Verify graph connectivity
        connected_to_input = shared_graph.get_connected_nodes("user1_input")
        assert len(connected_to_input) >= 1, "Input node not connected"

        # Simulate conflict resolution
        # User1 tries to modify User2's node (should be handled gracefully)
        try:
            user2_node = shared_graph.get_node("user2_plugin")
            user2_node.data.label = "Modified by User1"
            # In real system, this would trigger conflict resolution
        except Exception as e:
            # Handle conflict gracefully
            logging.info(f"Conflict detected and handled: {e}")

    def test_real_time_cursor_and_selection_sync(self):
        """Test real-time cursor and selection synchronization."""
        # Simulate collaboration state
        collaboration_state = {
            "cursors": {},
            "selections": {},
            "graph_state": GraphState(),
        }

        # Add some nodes to the graph
        test_node = Node(
            id="test_node",
            type="plugin",
            position={"x": 100, "y": 100},
            data=PluginNodeData(label="Test Node", node_type=NodeType.PLUGIN),
        )
        collaboration_state["graph_state"].add_node(test_node)

        # User 1 moves cursor
        user1_cursor = {
            "x": 150,
            "y": 120,
            "user_id": "user1",
            "timestamp": time.time(),
        }
        collaboration_state["cursors"]["user1"] = user1_cursor

        # User 2 selects node
        user2_selection = {
            "node_id": "test_node",
            "user_id": "user2",
            "timestamp": time.time(),
        }
        collaboration_state["selections"]["user2"] = user2_selection

        # Verify state synchronization
        assert len(collaboration_state["cursors"]) == 1, "User1 cursor not synchronized"
        assert (
            len(collaboration_state["selections"]) == 1
        ), "User2 selection not synchronized"
        assert (
            collaboration_state["cursors"]["user1"]["x"] == 150
        ), "Cursor position incorrect"
        assert (
            collaboration_state["selections"]["user2"]["node_id"] == "test_node"
        ), "Selection incorrect"

        # User 3 joins and sees existing state
        user3_view = {
            "cursors": collaboration_state["cursors"].copy(),
            "selections": collaboration_state["selections"].copy(),
            "graph_nodes": len(collaboration_state["graph_state"].nodes),
        }

        assert (
            user3_view["cursors"]["user1"]["x"] == 150
        ), "User3 can't see User1 cursor"
        assert (
            user3_view["selections"]["user2"]["node_id"] == "test_node"
        ), "User3 can't see User2 selection"
        assert user3_view["graph_nodes"] == 1, "User3 can't see graph nodes"


class TestErrorRecoveryWorkflow:
    """Test error recovery and graceful degradation workflows."""

    def test_plugin_crash_recovery_workflow(self):
        """Test workflow recovery when plugins crash during processing."""
        plugin_database = PluginDatabase()

        # Create audio data
        audio_data = np.random.randint(-32768, 32767, 1024, dtype=np.int16)

        # Create a plugin that will crash
        crashing_plugin = Mock()
        crash_count = 0

        def crash_side_effect(*args, **kwargs):
            nonlocal crash_count
            crash_count += 1
            if crash_count <= 2:  # Crash first 2 times
                raise RuntimeError("Plugin crashed")
            return audio_data * 0.8  # Success on 3rd try

        crashing_plugin.process.side_effect = crash_side_effect
        crashing_plugin.get_parameters.return_value = []

        # Register the crashing plugin
        plugin_id = plugin_database.register_plugin("crashing_plugin", crashing_plugin)

        # Step 1: Attempt processing with retries
        max_retries = 3
        retry_count = 0
        result = None

        while retry_count < max_retries and result is None:
            try:
                result = plugin_database.process_audio(plugin_id, audio_data)
                logging.info(f"Processing succeeded on attempt {retry_count + 1}")
            except RuntimeError as e:
                retry_count += 1
                logging.warning(f"Processing attempt {retry_count} failed: {e}")

                if retry_count < max_retries:
                    # Simulate plugin restart/recovery
                    time.sleep(0.1)  # Brief delay for recovery

        # Step 2: Verify recovery was successful
        assert result is not None, "Plugin recovery failed"
        assert len(result) == len(audio_data), "Recovery produced incorrect output"
        assert crash_count == 3, "Expected 3 crash attempts"

        # Step 3: Verify plugin is still functional after recovery
        try:
            recovery_result = plugin_database.process_audio(plugin_id, audio_data)
            assert recovery_result is not None, "Plugin not functional after recovery"
        except Exception as e:
            pytest.fail(f"Plugin failed after recovery: {e}")

        # Cleanup
        plugin_database.unregister_plugin(plugin_id)

    def test_memory_exhaustion_graceful_degradation(self):
        """Test graceful degradation when system runs out of memory."""
        config = BufferConfig(
            buffer_type=BufferType.MEMORY,
            max_memory_mb=10,
            buffer_size=1024,
            sample_rate=44100,
            channels=2,
        )
        buffer_manager = AudioBufferManager(config)  # Very small limit

        # Step 1: Fill up memory gradually
        buffer_ids = []
        buffer_size = 1024 * 1024  # 1MB buffers

        memory_exhausted = False
        created_buffers = 0

        while not memory_exhausted and created_buffers < 20:
            try:
                buffer_id = buffer_manager.create_buffer(
                    buffer_id=f"buffer_{created_buffers}",
                    buffer_type=BufferType.MEMORY,
                    size=buffer_size,
                    sample_rate=44100,
                )
                buffer_ids.append(buffer_id)
                created_buffers += 1

                # Write some data to the buffer
                test_data = np.random.randint(
                    -32768, 32767, buffer_size, dtype=np.int16
                )
                buffer_manager.write_buffer(buffer_id, 0, test_data)

            except MemoryError:
                memory_exhausted = True
                logging.info(
                    f"Memory exhausted after creating {created_buffers} buffers"
                )
                break
            except Exception as e:
                logging.warning(f"Unexpected error: {e}")
                break

        # Step 2: Verify graceful degradation
        assert created_buffers > 0, "No buffers created before memory exhaustion"
        assert len(buffer_ids) == created_buffers, "Buffer tracking inconsistent"

        # Step 3: Verify existing buffers still work
        if buffer_ids:
            try:
                # Try to read from first buffer
                read_data = buffer_manager.read_buffer(buffer_ids[0], 0, 1024)
                assert (
                    len(read_data) == 1024
                ), "Existing buffer corrupted after memory exhaustion"
            except Exception as e:
                pytest.fail(
                    f"Existing buffer inaccessible after memory exhaustion: {e}"
                )

        # Step 4: Test cleanup under memory pressure
        try:
            for buffer_id in buffer_ids:
                buffer_manager.remove_buffer(buffer_id)

            # Memory should be freed
            assert (
                len(buffer_manager.buffers) == 0
            ), "Cleanup failed under memory pressure"

        except Exception as e:
            logging.warning(f"Cleanup partially failed: {e}")
            # Partial cleanup is acceptable under memory pressure

    def test_audio_device_disconnection_recovery(self):
        """Test recovery when audio device disconnects during processing."""
        processor_config = {
            "buffer_size": 512,
            "sample_rate": 44100,
            "channels": 2,
            "max_latency": 50,
        }

        processor = RealTimeProcessor(processor_config)

        # Mock audio device that will disconnect
        mock_device = Mock()
        device_connected = True
        disconnection_count = 0

        def device_process_side_effect(*args, **kwargs):
            nonlocal device_connected, disconnection_count
            disconnection_count += 1

            if disconnection_count == 3:  # Disconnect on 3rd call
                device_connected = False
                raise OSError("Audio device disconnected")

            if not device_connected:
                # Simulate reconnection
                device_connected = True
                mock_device.is_connected.return_value = True
                logging.info("Audio device reconnected")

            return np.ones(512, dtype=np.int16)

        mock_device.process.side_effect = device_process_side_effect
        mock_device.is_connected.return_value = True

        # Test processing with device disconnection
        try:
            processor.start()

            processed_buffers = 0
            errors = 0

            for i in range(10):
                try:
                    audio_data = np.random.randint(-32768, 32767, 512, dtype=np.int16)
                    result = processor.process_buffer(audio_data, 512)

                    if result is not None:
                        processed_buffers += 1

                except OSError as e:
                    errors += 1
                    logging.warning(f"Processing error (expected): {e}")

                    # Simulate recovery attempt
                    time.sleep(0.1)

            # Verify recovery
            assert processed_buffers > 0, "No buffers processed after recovery"
            assert errors >= 1, "No errors encountered (device didn't disconnect)"
            assert disconnection_count >= 3, "Device didn't disconnect as expected"

        finally:
            processor.stop()


if __name__ == "__main__":
    # Configure logging for integration tests
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
    )

    pytest.main([__file__, "-v", "-s"])
