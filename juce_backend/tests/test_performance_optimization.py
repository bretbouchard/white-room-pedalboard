"""
Comprehensive tests for performance optimization and React Flow scalability.

This test suite covers:
- React Flow performance optimization utilities
- Virtual scrolling and level-of-detail rendering
- Node clustering and edge simplification
- Performance monitoring and metrics
- Memory management and optimization strategies
- Large-scale workflow handling (1000+ nodes)
- Performance thresholds and recommendations
"""

import json
import logging
import time
from typing import Any

import pytest

logger = logging.getLogger(__name__)


class MockNode:
    """Mock React Flow node for testing."""

    def __init__(
        self,
        node_id: str,
        node_type: str,
        position: dict[str, float],
        data: dict[str, Any] = None,
    ):
        self.id = node_id
        self.type = node_type
        self.position = position
        self.data = data or {}
        self.selected = False


class MockEdge:
    """Mock React Flow edge for testing."""

    def __init__(
        self,
        edge_id: str,
        source: str,
        target: str,
        edge_type: str = "default",
        data: dict[str, Any] = None,
    ):
        self.id = edge_id
        self.source = source
        self.target = target
        self.type = edge_type
        self.data = data or {}
        self.animated = False
        self.style = {}


class MockViewport:
    """Mock viewport for React Flow."""

    def __init__(
        self,
        x: float = 0,
        y: float = 0,
        zoom: float = 1.0,
        width: int = 1920,
        height: int = 1080,
    ):
        self.x = x
        self.y = y
        self.zoom = zoom
        self.width = width
        self.height = height


class PerformanceOptimizer:
    """Mock performance optimizer for testing React Flow optimization strategies."""

    def __init__(self):
        self.thresholds = {
            "MAX_VISIBLE_NODES": 1000,
            "VIRTUAL_SCROLLING_THRESHOLD": 2000,
            "LOD_HIGH_ZOOM": 0.7,
            "LOD_MEDIUM_ZOOM": 0.3,
            "FRAME_BUDGET_MS": 16.67,
            "MEMORY_WARNING_MB": 500,
            "MEMORY_CRITICAL_MB": 1000,
        }

        self.metrics = {
            "fps": 60,
            "memoryUsage": 100,
            "renderTime": 10,
            "visibleNodes": 0,
            "totalNodes": 0,
            "optimizationLevel": "none",
        }

        self.frame_count = 0
        self.last_frame_time = time.time()

    def calculate_node_complexity(self, node: MockNode) -> str:
        """Calculate node complexity based on data properties."""
        data = node.data or {}
        complexity_score = 0

        # Base data size
        if isinstance(data, dict):
            complexity_score += len(data.keys())

        # Check for large data arrays
        if data.get("audioData") and isinstance(data["audioData"], list):
            complexity_score += len(data["audioData"]) / 1000

        if data.get("spectrumData") and isinstance(data["spectrumData"], list):
            complexity_score += len(data["spectrumData"]) / 100

        # Check for complex nested objects
        try:
            serialized_size = len(json.dumps(data))
            complexity_score += serialized_size / 1000
        except:
            complexity_score += 10

        # Determine complexity level
        if complexity_score < 5:
            return "simple"
        elif complexity_score < 15:
            return "medium"
        elif complexity_score < 50:
            return "complex"
        else:
            return "heavy"

    def determine_optimization_strategy(
        self, node_count: int, edge_count: int, current_metrics: dict[str, float] = None
    ) -> dict[str, bool]:
        """Determine optimal optimization strategy based on workflow size."""
        strategy = {
            "virtual_scrolling": False,
            "level_of_detail": False,
            "edge_simplification": False,
            "node_clustering": False,
            "lazy_rendering": False,
        }

        # Base decisions on node count
        if node_count > self.thresholds["VIRTUAL_SCROLLING_THRESHOLD"]:
            strategy.update(
                {
                    "virtual_scrolling": True,
                    "level_of_detail": True,
                    "edge_simplification": True,
                    "node_clustering": True,
                    "lazy_rendering": True,
                }
            )
        elif node_count > self.thresholds["MAX_VISIBLE_NODES"]:
            strategy.update(
                {
                    "level_of_detail": True,
                    "edge_simplification": True,
                    "lazy_rendering": True,
                }
            )
        elif node_count > 500:
            strategy.update(
                {
                    "level_of_detail": True,
                    "lazy_rendering": True,
                }
            )

        # Adjust based on current performance
        if current_metrics:
            if current_metrics.get("fps", 60) < 30:
                strategy.update(
                    {
                        "virtual_scrolling": True,
                        "level_of_detail": True,
                        "edge_simplification": True,
                        "node_clustering": True,
                        "lazy_rendering": True,
                    }
                )
            elif (
                current_metrics.get("memoryUsage", 0)
                > self.thresholds["MEMORY_CRITICAL_MB"]
            ):
                strategy.update(
                    {
                        "virtual_scrolling": True,
                        "node_clustering": True,
                        "lazy_rendering": True,
                    }
                )

        # Consider edge complexity
        if edge_count > node_count * 3:
            strategy["edge_simplification"] = True

        return strategy

    def is_node_in_viewport(self, node: MockNode, viewport: MockViewport) -> bool:
        """Check if a node is within the current viewport."""
        node_x = node.position["x"]
        node_y = node.position["y"]
        node_width = node.data.get("width", 200)
        node_height = node.data.get("height", 100)

        vp_x = viewport.x
        vp_y = viewport.y
        vp_width = viewport.width
        vp_height = viewport.height

        # Add some padding for smoother transitions
        padding = 100

        return (
            node_x < vp_x + vp_width + padding
            and node_x + node_width > vp_x - padding
            and node_y < vp_y + vp_height + padding
            and node_y + node_height > vp_y - padding
        )

    def apply_level_of_detail(
        self,
        nodes: list[MockNode],
        viewport: MockViewport,
        max_visible_nodes: int = None,
    ) -> list[MockNode]:
        """Apply level-of-detail rendering to nodes."""
        if max_visible_nodes is None:
            max_visible_nodes = self.thresholds["MAX_VISIBLE_NODES"]

        zoom = viewport.zoom
        result = []
        processed_nodes = 0

        for node in nodes:
            # Stop if we've reached the limit
            if processed_nodes >= max_visible_nodes:
                break

            # Check if node is in viewport
            if not self.is_node_in_viewport(node, viewport):
                continue

            # Apply LOD based on zoom and distance
            lod_node = self.apply_node_lod(node, zoom, viewport)
            result.append(lod_node)
            processed_nodes += 1

        return result

    def apply_node_lod(
        self, node: MockNode, zoom: float, viewport: MockViewport
    ) -> MockNode:
        """Apply level-of-detail to individual node."""
        complexity = self.calculate_node_complexity(node)
        lod_node = MockNode(node.id, node.type, node.position.copy(), node.data.copy())

        # High detail - no changes
        if zoom >= self.thresholds["LOD_HIGH_ZOOM"]:
            return lod_node

        # Medium detail - simplify some properties
        if zoom >= self.thresholds["LOD_MEDIUM_ZOOM"]:
            if "audioData" in lod_node.data and isinstance(
                lod_node.data["audioData"], list
            ):
                lod_node.data["audioData"] = {
                    "_preview": True,
                    "_length": len(lod_node.data["audioData"]),
                    "_sampleRate": lod_node.data["audioData"][0]
                    if lod_node.data["audioData"]
                    else 44100,
                }

            if "spectrumData" in lod_node.data and isinstance(
                lod_node.data["spectrumData"], list
            ):
                lod_node.data["spectrumData"] = {
                    "_preview": True,
                    "_length": len(lod_node.data["spectrumData"]),
                }

            return lod_node

        # Low detail - minimal rendering
        lod_node.data = {
            "label": lod_node.data.get("label", lod_node.id),
            "width": lod_node.data.get("width", 200),
            "height": lod_node.data.get("height", 100),
            "color": lod_node.data.get("color", "#3b82f6"),
            "_lod": "low",
        }

        # For very small nodes at low zoom, further simplify
        if zoom < 0.1:
            lod_node.data = {
                "_lod": "minimal",
                "color": lod_node.data.get("color", "#3b82f6"),
            }

        return lod_node

    def simplify_edges(
        self, edges: list[MockEdge], visible_node_ids: set, max_edges: int = 2000
    ) -> list[MockEdge]:
        """Simplify edges for better performance."""
        if len(edges) <= max_edges:
            return [
                edge
                for edge in edges
                if edge.source in visible_node_ids and edge.target in visible_node_ids
            ]

        # Prioritize edges between visible nodes
        visible_edges = [
            edge
            for edge in edges
            if edge.source in visible_node_ids and edge.target in visible_node_ids
        ]

        if len(visible_edges) <= max_edges:
            return visible_edges

        # If still too many, apply further simplification
        simplified_edges = visible_edges[:max_edges]
        for edge in simplified_edges:
            if edge.type in ["smoothstep", "bezier"]:
                edge.type = "default"
            edge.animated = False
            if not hasattr(edge, "style"):
                edge.style = {}
            edge.style["strokeWidth"] = min(edge.style.get("strokeWidth", 1) * 0.7, 2)

        return simplified_edges

    def cluster_nodes(
        self, nodes: list[MockNode], max_clusters: int = 50
    ) -> tuple[list[MockNode], dict[str, list[MockNode]]]:
        """Cluster nodes for better performance."""
        if len(nodes) <= max_clusters:
            return nodes, {}

        clusters = {}
        grid_size = max(1, int((len(nodes) / max_clusters) ** 0.5))
        cluster_size = 200 * grid_size

        # Simple grid-based clustering
        for node in nodes:
            cluster_x = int(node.position["x"] / cluster_size)
            cluster_y = int(node.position["y"] / cluster_size)
            cluster_key = f"{cluster_x}_{cluster_y}"

            if cluster_key not in clusters:
                clusters[cluster_key] = []
            clusters[cluster_key].append(node)

        # Create cluster representative nodes
        clustered_nodes = []
        for cluster_key, cluster_nodes_list in clusters.items():
            if len(cluster_nodes_list) == 1:
                clustered_nodes.append(cluster_nodes_list[0])
            else:
                # Create a cluster node
                center_x = sum(node.position["x"] for node in cluster_nodes_list) / len(
                    cluster_nodes_list
                )
                center_y = sum(node.position["y"] for node in cluster_nodes_list) / len(
                    cluster_nodes_list
                )

                cluster_node = MockNode(
                    f"cluster_{cluster_key}",
                    "cluster",
                    {"x": center_x, "y": center_y},
                    {
                        "label": f"{len(cluster_nodes_list)} nodes",
                        "cluster": True,
                        "nodeCount": len(cluster_nodes_list),
                        "originalNodes": [n.id for n in cluster_nodes_list],
                    },
                )
                clustered_nodes.append(cluster_node)

        return clustered_nodes, clusters

    def update_metrics(
        self, total_nodes: int = 0, visible_nodes: int = 0
    ) -> dict[str, Any]:
        """Update performance metrics."""
        now = time.time()
        delta_time = now - self.last_frame_time

        self.frame_count += 1

        # Calculate FPS every 30 frames
        if self.frame_count % 30 == 0:
            self.metrics["fps"] = 30000 / (now - self.last_frame_time + 1)
            self.last_frame_time = now

        self.metrics["renderTime"] = delta_time * 1000  # Convert to ms
        self.metrics["totalNodes"] = total_nodes
        self.metrics["visibleNodes"] = visible_nodes

        # Update optimization level
        if (
            self.metrics["fps"] < 20
            or self.metrics["memoryUsage"] > self.thresholds["MEMORY_CRITICAL_MB"]
        ):
            self.metrics["optimizationLevel"] = "aggressive"
        elif (
            self.metrics["fps"] < 30
            or self.metrics["memoryUsage"] > self.thresholds["MEMORY_WARNING_MB"]
        ):
            self.metrics["optimizationLevel"] = "moderate"
        elif self.metrics["fps"] < 50:
            self.metrics["optimizationLevel"] = "light"
        else:
            self.metrics["optimizationLevel"] = "none"

        return self.metrics.copy()

    def get_recommendations(self) -> list[str]:
        """Get performance recommendations."""
        recommendations = []

        if self.metrics["fps"] < 30:
            recommendations.append(
                "Low FPS detected - enable virtual scrolling and reduce visible nodes"
            )

        if self.metrics["memoryUsage"] > self.thresholds["MEMORY_WARNING_MB"]:
            recommendations.append(
                "High memory usage - enable node clustering and clear unused cache"
            )

        if self.metrics["renderTime"] > self.thresholds["FRAME_BUDGET_MS"] * 2:
            recommendations.append(
                "Slow rendering detected - enable level-of-detail and edge simplification"
            )

        if self.metrics["fps"] < 20:
            recommendations.append(
                "Critical performance issue - reduce workflow complexity or enable all optimizations"
            )

        return recommendations


@pytest.fixture
def optimizer():
    """Create a performance optimizer for testing."""
    return PerformanceOptimizer()


@pytest.fixture
def sample_nodes():
    """Create sample nodes for testing."""
    nodes = []

    # Simple nodes
    for i in range(100):
        nodes.append(
            MockNode(
                f"simple_node_{i}",
                "plugin",
                {"x": i * 100, "y": (i % 10) * 100},
                {"plugin_name": f"plugin_{i}", "parameters": {"gain": 0.5}},
            )
        )

    # Complex nodes with audio data
    for i in range(50):
        nodes.append(
            MockNode(
                f"complex_node_{i}",
                "analyzer",
                {"x": i * 150, "y": (i % 5) * 150 + 500},
                {
                    "analyzer_type": "spectrum",
                    "audioData": list(range(1000)),  # Large array
                    "spectrumData": list(range(100)),  # Medium array
                    "parameters": {f"param_{j}": f"value_{j}" for j in range(20)},
                },
            )
        )

    return nodes


@pytest.fixture
def sample_edges(sample_nodes):
    """Create sample edges for testing."""
    edges = []

    # Create connections between consecutive nodes
    for i in range(len(sample_nodes) - 1):
        edges.append(
            MockEdge(
                f"edge_{i}",
                sample_nodes[i].id,
                sample_nodes[i + 1].id,
                "audio_connection",
                {"gain": 1.0, "latency": 0.1},
            )
        )

    # Add some cross connections
    for i in range(0, len(sample_nodes), 5):
        if i + 10 < len(sample_nodes):
            edges.append(
                MockEdge(
                    f"cross_edge_{i}",
                    sample_nodes[i].id,
                    sample_nodes[i + 10].id,
                    "control_connection",
                    {"control_type": "automation"},
                )
            )

    return edges


class TestNodeComplexityCalculation:
    """Test node complexity calculation."""

    def test_simple_node_complexity(self, optimizer):
        """Test complexity calculation for simple nodes."""
        simple_node = MockNode(
            "simple",
            "plugin",
            {"x": 0, "y": 0},
            {"plugin_name": "reverb", "parameters": {"room_size": 0.5}},
        )

        complexity = optimizer.calculate_node_complexity(simple_node)
        assert complexity in ["simple", "medium"]

    def test_complex_node_complexity(self, optimizer):
        """Test complexity calculation for complex nodes."""
        complex_node = MockNode(
            "complex",
            "analyzer",
            {"x": 0, "y": 0},
            {
                "analyzer_type": "spectrum",
                "audioData": list(range(5000)),  # Large array
                "spectrumData": list(range(500)),  # Medium array
                "parameters": {f"param_{i}": f"value_{i}" for i in range(50)},
            },
        )

        complexity = optimizer.calculate_node_complexity(complex_node)
        assert complexity in ["complex", "heavy"]

    def test_node_complexity_with_serialization_error(self, optimizer):
        """Test complexity calculation when serialization fails."""
        # Create a node with circular reference that will fail serialization
        problematic_data = {"name": "test"}
        problematic_data["self"] = problematic_data  # Circular reference

        problematic_node = MockNode(
            "problematic", "plugin", {"x": 0, "y": 0}, problematic_data
        )

        complexity = optimizer.calculate_node_complexity(problematic_node)
        # Should handle serialization error gracefully
        assert complexity in ["complex", "heavy"]


class TestOptimizationStrategy:
    """Test optimization strategy determination."""

    def test_small_workflow_strategy(self, optimizer):
        """Test strategy for small workflows."""
        strategy = optimizer.determine_optimization_strategy(100, 150)

        expected = {
            "virtual_scrolling": False,
            "level_of_detail": False,
            "edge_simplification": False,
            "node_clustering": False,
            "lazy_rendering": False,
        }
        assert strategy == expected

    def test_medium_workflow_strategy(self, optimizer):
        """Test strategy for medium workflows."""
        strategy = optimizer.determine_optimization_strategy(800, 1200)

        expected = {
            "virtual_scrolling": False,
            "level_of_detail": True,
            "edge_simplification": False,
            "node_clustering": False,
            "lazy_rendering": True,
        }
        assert strategy == expected

    def test_large_workflow_strategy(self, optimizer):
        """Test strategy for large workflows."""
        strategy = optimizer.determine_optimization_strategy(2500, 4000)

        expected = {
            "virtual_scrolling": True,
            "level_of_detail": True,
            "edge_simplification": True,
            "node_clustering": True,
            "lazy_rendering": True,
        }
        assert strategy == expected

    def test_strategy_with_poor_performance(self, optimizer):
        """Test strategy adjustment for poor performance."""
        poor_metrics = {"fps": 25, "memoryUsage": 200}
        strategy = optimizer.determine_optimization_strategy(800, 1200, poor_metrics)

        # Poor performance should enable all optimizations
        assert all(strategy.values())

    def test_strategy_with_high_memory_usage(self, optimizer):
        """Test strategy adjustment for high memory usage."""
        high_memory_metrics = {"fps": 50, "memoryUsage": 1200}
        strategy = optimizer.determine_optimization_strategy(
            800, 1200, high_memory_metrics
        )

        assert strategy["virtual_scrolling"] is True
        assert strategy["node_clustering"] is True
        assert strategy["lazy_rendering"] is True


class TestViewportOperations:
    """Test viewport-related operations."""

    def test_node_in_viewport_detection(self, optimizer):
        """Test node viewport detection."""
        viewport = MockViewport(x=0, y=0, zoom=1.0, width=1000, height=800)

        # Node inside viewport
        inside_node = MockNode(
            "inside", "plugin", {"x": 500, "y": 400}, {"width": 100, "height": 50}
        )
        assert optimizer.is_node_in_viewport(inside_node, viewport) is True

        # Node outside viewport
        outside_node = MockNode(
            "outside", "plugin", {"x": 1500, "y": 400}, {"width": 100, "height": 50}
        )
        assert optimizer.is_node_in_viewport(outside_node, viewport) is False

    def test_viewport_with_padding(self, optimizer):
        """Test viewport detection with padding."""
        viewport = MockViewport(x=0, y=0, zoom=1.0, width=1000, height=800)

        # Node just outside viewport but within padding
        near_node = MockNode(
            "near", "plugin", {"x": 1050, "y": 400}, {"width": 100, "height": 50}
        )
        assert optimizer.is_node_in_viewport(near_node, viewport) is True

    def test_viewport_zoom_scaling(self, optimizer):
        """Test viewport detection with different zoom levels."""
        viewport = MockViewport(x=0, y=0, zoom=0.5, width=1000, height=800)

        # Node that should be visible at 0.5x zoom
        visible_node = MockNode(
            "visible", "plugin", {"x": 1800, "y": 700}, {"width": 100, "height": 50}
        )
        assert optimizer.is_node_in_viewport(visible_node, viewport) is True


class TestLevelOfDetail:
    """Test level-of-detail rendering."""

    def test_high_zoom_no_lod(self, optimizer):
        """Test that high zoom doesn't apply LOD."""
        viewport = MockViewport(zoom=0.8)

        original_node = MockNode(
            "test",
            "analyzer",
            {"x": 0, "y": 0},
            {"audioData": list(range(1000)), "spectrumData": list(range(100))},
        )

        lod_node = optimizer.apply_node_lod(original_node, viewport.zoom, viewport)

        # High zoom should preserve original data
        assert lod_node.data.get("audioData") is not None
        assert lod_node.data.get("spectrumData") is not None

    def test_medium_zoom_partial_lod(self, optimizer):
        """Test that medium zoom applies partial LOD."""
        viewport = MockViewport(zoom=0.5)

        original_node = MockNode(
            "test",
            "analyzer",
            {"x": 0, "y": 0},
            {"audioData": list(range(1000)), "spectrumData": list(range(100))},
        )

        lod_node = optimizer.apply_node_lod(original_node, viewport.zoom, viewport)

        # Medium zoom should simplify but preserve metadata
        assert "_preview" in lod_node.data.get("audioData", {})
        assert "_length" in lod_node.data.get("audioData", {})
        assert lod_node.data["audioData"]["_length"] == 1000

    def test_low_zoom_full_lod(self, optimizer):
        """Test that low zoom applies full LOD."""
        viewport = MockViewport(zoom=0.2)

        original_node = MockNode(
            "test",
            "analyzer",
            {"x": 0, "y": 0},
            {"audioData": list(range(1000)), "spectrumData": list(range(100))},
        )

        lod_node = optimizer.apply_node_lod(original_node, viewport.zoom, viewport)

        # Low zoom should only keep essential properties
        assert "label" in lod_node.data
        assert "width" in lod_node.data
        assert "height" in lod_node.data
        assert lod_node.data.get("_lod") == "low"

    def test_very_low_zoom_minimal_lod(self, optimizer):
        """Test that very low zoom applies minimal LOD."""
        viewport = MockViewport(zoom=0.05)

        original_node = MockNode(
            "test",
            "analyzer",
            {"x": 0, "y": 0},
            {"label": "Test Node", "width": 200, "height": 100},
        )

        lod_node = optimizer.apply_node_lod(original_node, viewport.zoom, viewport)

        # Very low zoom should only keep color
        assert "_lod" in lod_node.data
        assert lod_node.data["_lod"] == "minimal"
        assert "color" in lod_node.data

    def test_lod_with_max_visible_nodes(self, optimizer):
        """Test LOD with maximum visible nodes limit."""
        viewport = MockViewport(zoom=0.5)

        # Create many nodes
        nodes = []
        for i in range(1500):
            nodes.append(
                MockNode(
                    f"node_{i}",
                    "plugin",
                    {"x": i * 50, "y": (i % 20) * 50},
                    {"label": f"Node {i}"},
                )
            )

        lod_nodes = optimizer.apply_level_of_detail(
            nodes, viewport, max_visible_nodes=500
        )

        # Should limit to max visible nodes
        assert len(lod_nodes) <= 500


class TestEdgeSimplification:
    """Test edge simplification for performance."""

    def test_no_simplification_needed(self, optimizer):
        """Test that edges below threshold aren't simplified."""
        visible_node_ids = {f"node_{i}" for i in range(100)}

        edges = []
        for i in range(0, 99, 2):
            edges.append(
                MockEdge(
                    f"edge_{i}",
                    f"node_{i}",
                    f"node_{i + 1}",
                    "smoothstep",
                    {"animated": True, "strokeWidth": 3},
                )
            )

        simplified_edges = optimizer.simplify_edges(edges, visible_node_ids)

        # Should preserve all edges and properties
        assert len(simplified_edges) == len(edges)
        assert all(edge.type == "smoothstep" for edge in simplified_edges)

    def test_edge_filtering(self, optimizer):
        """Test that edges to invisible nodes are filtered out."""
        visible_node_ids = {
            f"node_{i}" for i in range(50)
        }  # Only first 50 nodes visible

        edges = []
        for i in range(100):
            edges.append(MockEdge(f"edge_{i}", f"node_{i}", f"node_{i + 1}", "default"))

        simplified_edges = optimizer.simplify_edges(edges, visible_node_ids)

        # Should only keep edges between visible nodes
        for edge in simplified_edges:
            assert edge.source in visible_node_ids
            assert edge.target in visible_node_ids

    def test_edge_type_simplification(self, optimizer):
        """Test that complex edge types are simplified."""
        visible_node_ids = {f"node_{i}" for i in range(3000)}  # Many visible nodes

        edges = []
        for i in range(2500):  # Over threshold
            edge_type = "smoothstep" if i % 2 == 0 else "bezier"
            edges.append(
                MockEdge(
                    f"edge_{i}",
                    f"node_{i}",
                    f"node_{i + 1}",
                    edge_type,
                    {"animated": True, "strokeWidth": 5},
                )
            )

        simplified_edges = optimizer.simplify_edges(
            edges, visible_node_ids, max_edges=2000
        )

        # Should limit edges and simplify types
        assert len(simplified_edges) <= 2000
        assert all(edge.type == "default" for edge in simplified_edges)
        assert all(not edge.animated for edge in simplified_edges)


class TestNodeClustering:
    """Test node clustering for performance."""

    def test_no_clustering_needed(self, optimizer):
        """Test that small node sets don't need clustering."""
        nodes = []
        for i in range(30):  # Below max_clusters
            nodes.append(
                MockNode(
                    f"node_{i}",
                    "plugin",
                    {"x": i * 100, "y": i * 100},
                    {"label": f"Node {i}"},
                )
            )

        clustered_nodes, clusters = optimizer.cluster_nodes(nodes, max_clusters=50)

        # Should return original nodes and no clusters
        assert len(clustered_nodes) == len(nodes)
        assert len(clusters) == 0

    def test_grid_based_clustering(self, optimizer):
        """Test grid-based node clustering."""
        nodes = []

        # Create nodes in a grid pattern
        for i in range(100):
            for j in range(100):
                nodes.append(
                    MockNode(
                        f"node_{i}_{j}",
                        "plugin",
                        {"x": i * 200, "y": j * 200},
                        {"label": f"Node {i},{j}"},
                    )
                )

        clustered_nodes, clusters = optimizer.cluster_nodes(nodes, max_clusters=50)

        # Should create clusters
        assert len(clustered_nodes) <= 50
        assert len(clusters) > 0

        # Verify cluster nodes have correct properties
        cluster_nodes = [node for node in clustered_nodes if node.type == "cluster"]
        assert len(cluster_nodes) > 0

        for cluster_node in cluster_nodes:
            assert "cluster" in cluster_node.data
            assert "nodeCount" in cluster_node.data
            assert "originalNodes" in cluster_node.data
            assert cluster_node.data["nodeCount"] > 1

    def test_cluster_position_calculation(self, optimizer):
        """Test that cluster positions are calculated correctly."""
        nodes = [
            MockNode("node1", "plugin", {"x": 0, "y": 0}),
            MockNode("node2", "plugin", {"x": 200, "y": 0}),
            MockNode("node3", "plugin", {"x": 100, "y": 200}),
        ]

        clustered_nodes, clusters = optimizer.cluster_nodes(nodes, max_clusters=1)

        # Should create one cluster at the center
        assert len(clustered_nodes) == 1
        cluster_node = clustered_nodes[0]

        # Center should be at (100, 100)
        assert cluster_node.position["x"] == 100
        assert cluster_node.position["y"] == 100
        assert cluster_node.data["nodeCount"] == 3


class TestPerformanceMonitoring:
    """Test performance monitoring and metrics."""

    def test_metrics_update(self, optimizer):
        """Test performance metrics updating."""
        metrics = optimizer.update_metrics(total_nodes=1000, visible_nodes=100)

        assert "fps" in metrics
        assert "memoryUsage" in metrics
        assert "renderTime" in metrics
        assert "totalNodes" in metrics
        assert "visibleNodes" in metrics
        assert "optimizationLevel" in metrics

        assert metrics["totalNodes"] == 1000
        assert metrics["visibleNodes"] == 100

    def test_optimization_level_determination(self, optimizer):
        """Test optimization level determination based on metrics."""
        # Good performance
        optimizer.metrics["fps"] = 60
        optimizer.metrics["memoryUsage"] = 100
        metrics = optimizer.update_metrics()
        assert metrics["optimizationLevel"] == "none"

        # Poor FPS
        optimizer.metrics["fps"] = 25
        metrics = optimizer.update_metrics()
        assert metrics["optimizationLevel"] == "moderate"

        # Critical performance
        optimizer.metrics["fps"] = 15
        optimizer.metrics["memoryUsage"] = 1200
        metrics = optimizer.update_metrics()
        assert metrics["optimizationLevel"] == "aggressive"

    def test_performance_recommendations(self, optimizer):
        """Test performance recommendations generation."""
        # Good performance - no recommendations
        optimizer.metrics["fps"] = 60
        optimizer.metrics["memoryUsage"] = 100
        optimizer.metrics["renderTime"] = 10
        recommendations = optimizer.get_recommendations()
        assert len(recommendations) == 0

        # Low FPS - should recommend optimizations
        optimizer.metrics["fps"] = 25
        recommendations = optimizer.get_recommendations()
        assert len(recommendations) > 0
        assert any("Low FPS" in rec for rec in recommendations)

        # High memory usage
        optimizer.metrics["memoryUsage"] = 1200
        recommendations = optimizer.get_recommendations()
        assert any("High memory" in rec for rec in recommendations)

        # Critical performance
        optimizer.metrics["fps"] = 15
        recommendations = optimizer.get_recommendations()
        assert any("Critical performance" in rec for rec in recommendations)


class TestLargeScalePerformance:
    """Test performance with large-scale workflows."""

    def test_large_workflow_handling(self, optimizer, sample_nodes, sample_edges):
        """Test handling of large workflows with many nodes and edges."""
        # Create large workflow
        large_nodes = sample_nodes * 10  # ~1500 nodes
        large_edges = sample_edges * 10  # ~1500 edges

        # Determine strategy for large workflow
        strategy = optimizer.determine_optimization_strategy(
            len(large_nodes), len(large_edges)
        )

        # Should enable all optimizations
        assert strategy["virtual_scrolling"] is True
        assert strategy["level_of_detail"] is True
        assert strategy["edge_simplification"] is True
        assert strategy["node_clustering"] is True
        assert strategy["lazy_rendering"] is True

    def test_performance_with_1000_nodes(self, optimizer):
        """Test performance metrics with 1000+ nodes."""
        start_time = time.time()

        # Create 1000 nodes
        nodes = []
        for i in range(1000):
            nodes.append(
                MockNode(
                    f"node_{i}",
                    "plugin",
                    {"x": (i % 50) * 100, "y": (i // 50) * 100},
                    {"label": f"Plugin {i}", "parameters": {"gain": 0.5}},
                )
            )

        creation_time = time.time() - start_time
        logger.info(f"Created 1000 nodes in {creation_time:.3f}s")

        # Apply optimizations
        viewport = MockViewport(x=0, y=0, zoom=1.0, width=1920, height=1080)

        start_time = time.time()
        optimized_nodes = optimizer.apply_level_of_detail(nodes, viewport)
        lod_time = time.time() - start_time

        logger.info(f"Applied LOD to 1000 nodes in {lod_time:.3f}s")

        # Test clustering
        start_time = time.time()
        clustered_nodes, clusters = optimizer.cluster_nodes(
            optimized_nodes, max_clusters=50
        )
        clustering_time = time.time() - start_time

        logger.info(
            f"Clustered 1000 nodes into {len(clustered_nodes)} clusters in {clustering_time:.3f}s"
        )

        # Performance assertions
        assert creation_time < 1.0  # Should create nodes quickly
        assert lod_time < 0.5  # LOD should be fast
        assert clustering_time < 0.5  # Clustering should be fast
        assert len(clustered_nodes) <= 50  # Should respect max_clusters

        # Update metrics
        metrics = optimizer.update_metrics(
            total_nodes=1000, visible_nodes=len(optimized_nodes)
        )
        assert metrics["totalNodes"] == 1000

    def test_memory_efficiency_with_large_data(self, optimizer):
        """Test memory efficiency with large data sets."""
        # Create nodes with large audio data
        nodes_with_audio = []
        for i in range(100):
            large_audio_data = list(range(10000))  # Large array
            nodes_with_audio.append(
                MockNode(
                    f"audio_node_{i}",
                    "analyzer",
                    {"x": i * 150, "y": i * 20},
                    {
                        "audioData": large_audio_data,
                        "spectrumData": list(range(1000)),
                        "analysis_data": {"frequency": i * 100, "amplitude": 0.5},
                    },
                )
            )

        # Apply LOD to reduce memory usage
        viewport = MockViewport(zoom=0.3)  # Medium zoom
        optimized_nodes = optimizer.apply_level_of_detail(nodes_with_audio, viewport)

        # Verify memory reduction
        for node in optimized_nodes:
            if "audioData" in node.data:
                assert "_preview" in node.data["audioData"]
                assert len(node.data["audioData"]) < 100  # Should be much smaller

        # Test clustering for further memory reduction
        clustered_nodes, clusters = optimizer.cluster_nodes(
            optimized_nodes, max_clusters=20
        )
        assert len(clustered_nodes) <= 20


if __name__ == "__main__":
    pytest.main([__file__])
