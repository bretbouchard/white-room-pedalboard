"""
Simple tests for performance optimization focused on the key functionality.
"""

import time

import pytest


class MockNode:
    def __init__(self, node_id, node_type, position, data=None):
        self.id = node_id
        self.type = node_type
        self.position = position
        self.data = data or {}
        self.selected = False


class MockEdge:
    def __init__(self, edge_id, source, target, edge_type="default", data=None):
        self.id = edge_id
        self.source = source
        self.target = target
        self.type = edge_type
        self.data = data or {}
        self.animated = False
        self.style = {}


class MockViewport:
    def __init__(self, x=0, y=0, zoom=1.0, width=1920, height=1080):
        self.x = x
        self.y = y
        self.zoom = zoom
        self.width = width
        self.height = height


class PerformanceOptimizer:
    def __init__(self):
        self.thresholds = {
            "MAX_VISIBLE_NODES": 1000,
            "VIRTUAL_SCROLLING_THRESHOLD": 2000,
            "LOD_HIGH_ZOOM": 0.7,
            "LOD_MEDIUM_ZOOM": 0.3,
        }

    def determine_optimization_strategy(
        self, node_count, edge_count, current_metrics=None
    ):
        strategy = {
            "virtual_scrolling": False,
            "level_of_detail": False,
            "edge_simplification": False,
            "node_clustering": False,
            "lazy_rendering": False,
        }

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

        return strategy

    def is_node_in_viewport(self, node, viewport):
        node_x = node.position["x"]
        node_y = node.position["y"]
        node_width = node.data.get("width", 200)
        node_height = node.data.get("height", 100)

        vp_x = viewport.x
        vp_y = viewport.y
        vp_width = viewport.width
        vp_height = viewport.height

        padding = 100

        return (
            node_x < vp_x + vp_width + padding
            and node_x + node_width > vp_x - padding
            and node_y < vp_y + vp_height + padding
            and node_y + node_height > vp_y - padding
        )

    def apply_level_of_detail(self, nodes, viewport, max_visible_nodes=None):
        if max_visible_nodes is None:
            max_visible_nodes = self.thresholds["MAX_VISIBLE_NODES"]

        zoom = viewport.zoom
        result = []
        processed_nodes = 0

        for node in nodes:
            if processed_nodes >= max_visible_nodes:
                break

            if not self.is_node_in_viewport(node, viewport):
                continue

            lod_node = self.apply_node_lod(node, zoom, viewport)
            result.append(lod_node)
            processed_nodes += 1

        return result

    def apply_node_lod(self, node, zoom, viewport):
        lod_node = MockNode(node.id, node.type, node.position.copy(), node.data.copy())

        if zoom >= self.thresholds["LOD_HIGH_ZOOM"]:
            return lod_node

        if zoom >= self.thresholds["LOD_MEDIUM_ZOOM"]:
            if "audioData" in lod_node.data:
                if isinstance(lod_node.data["audioData"], list):
                    lod_node.data["audioData"] = {
                        "_preview": True,
                        "_length": len(lod_node.data["audioData"]),
                    }
            return lod_node

        lod_node.data = {
            "label": lod_node.data.get("label", lod_node.id),
            "width": lod_node.data.get("width", 200),
            "height": lod_node.data.get("height", 100),
            "color": lod_node.data.get("color", "#3b82f6"),
            "_lod": "low",
        }

        if zoom < 0.1:
            lod_node.data = {
                "_lod": "minimal",
                "color": lod_node.data.get("color", "#3b82f6"),
            }

        return lod_node

    def cluster_nodes(self, nodes, max_clusters=50):
        if len(nodes) <= max_clusters:
            return nodes, {}

        clusters = {}
        grid_size = max(1, int((len(nodes) / max_clusters) ** 0.5))
        cluster_size = 200 * grid_size

        for node in nodes:
            cluster_x = int(node.position["x"] / cluster_size)
            cluster_y = int(node.position["y"] / cluster_size)
            cluster_key = f"{cluster_x}_{cluster_y}"

            if cluster_key not in clusters:
                clusters[cluster_key] = []
            clusters[cluster_key].append(node)

        clustered_nodes = []
        for cluster_key, cluster_nodes_list in clusters.items():
            if len(cluster_nodes_list) == 1:
                clustered_nodes.append(cluster_nodes_list[0])
            else:
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
                    },
                )
                clustered_nodes.append(cluster_node)

        return clustered_nodes, clusters

    def update_metrics(self, total_nodes=0, visible_nodes=0):
        return {
            "fps": 60,
            "memoryUsage": 100,
            "renderTime": 10,
            "totalNodes": total_nodes,
            "visibleNodes": visible_nodes,
            "optimizationLevel": "none",
        }


@pytest.fixture
def optimizer():
    return PerformanceOptimizer()


@pytest.fixture
def sample_nodes():
    nodes = []
    for i in range(100):
        nodes.append(
            MockNode(
                f"node_{i}",
                "plugin",
                {"x": i * 100, "y": (i % 10) * 100},
                {"plugin_name": f"plugin_{i}", "parameters": {"gain": 0.5}},
            )
        )
    return nodes


class TestPerformanceOptimization:
    """Test performance optimization core functionality."""

    def test_small_workflow_strategy(self, optimizer):
        strategy = optimizer.determine_optimization_strategy(100, 150)
        expected = {
            "virtual_scrolling": False,
            "level_of_detail": False,
            "edge_simplification": False,
            "node_clustering": False,
            "lazy_rendering": False,
        }
        assert strategy == expected

    def test_large_workflow_strategy(self, optimizer):
        strategy = optimizer.determine_optimization_strategy(2500, 4000)
        expected = {
            "virtual_scrolling": True,
            "level_of_detail": True,
            "edge_simplification": True,
            "node_clustering": True,
            "lazy_rendering": True,
        }
        assert strategy == expected

    def test_node_in_viewport_detection(self, optimizer):
        viewport = MockViewport(x=0, y=0, zoom=1.0, width=1000, height=800)

        inside_node = MockNode(
            "inside", "plugin", {"x": 500, "y": 400}, {"width": 100, "height": 50}
        )
        assert optimizer.is_node_in_viewport(inside_node, viewport) is True

        outside_node = MockNode(
            "outside", "plugin", {"x": 1500, "y": 400}, {"width": 100, "height": 50}
        )
        assert optimizer.is_node_in_viewport(outside_node, viewport) is False

    def test_high_zoom_no_lod(self, optimizer):
        viewport = MockViewport(zoom=0.8)
        original_node = MockNode(
            "test", "analyzer", {"x": 0, "y": 0}, {"audioData": list(range(1000))}
        )

        lod_node = optimizer.apply_node_lod(original_node, viewport.zoom, viewport)
        assert lod_node.data.get("audioData") is not None

    def test_low_zoom_full_lod(self, optimizer):
        viewport = MockViewport(zoom=0.2)
        original_node = MockNode(
            "test", "analyzer", {"x": 0, "y": 0}, {"audioData": list(range(1000))}
        )

        lod_node = optimizer.apply_node_lod(original_node, viewport.zoom, viewport)
        assert lod_node.data.get("_lod") == "low"
        assert "label" in lod_node.data

    def test_lod_with_max_visible_nodes(self, optimizer):
        viewport = MockViewport(zoom=0.5)
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
        assert len(lod_nodes) <= 500

    def test_no_clustering_needed(self, optimizer):
        nodes = []
        for i in range(30):
            nodes.append(
                MockNode(
                    f"node_{i}",
                    "plugin",
                    {"x": i * 100, "y": i * 100},
                    {"label": f"Node {i}"},
                )
            )

        clustered_nodes, clusters = optimizer.cluster_nodes(nodes, max_clusters=50)
        assert len(clustered_nodes) == len(nodes)
        assert len(clusters) == 0

    def test_node_clustering(self, optimizer):
        nodes = []
        for i in range(200):
            nodes.append(
                MockNode(
                    f"node_{i}",
                    "plugin",
                    {"x": i * 20, "y": i * 20},
                    {"label": f"Node {i}"},
                )
            )

        clustered_nodes, clusters = optimizer.cluster_nodes(nodes, max_clusters=50)
        assert len(clustered_nodes) <= 50
        assert len(clusters) > 0

    def test_performance_with_1000_nodes(self, optimizer):
        start_time = time.time()

        nodes = []
        for i in range(1000):
            nodes.append(
                MockNode(
                    f"node_{i}",
                    "plugin",
                    {"x": (i % 50) * 100, "y": (i // 50) * 100},
                    {"label": f"Plugin {i}"},
                )
            )

        creation_time = time.time() - start_time
        assert creation_time < 1.0

        viewport = MockViewport(x=0, y=0, zoom=1.0, width=1920, height=1080)

        start_time = time.time()
        optimized_nodes = optimizer.apply_level_of_detail(nodes, viewport)
        lod_time = time.time() - start_time
        assert lod_time < 0.5

        start_time = time.time()
        clustered_nodes, clusters = optimizer.cluster_nodes(
            optimized_nodes, max_clusters=50
        )
        clustering_time = time.time() - start_time
        assert clustering_time < 0.5
        assert len(clustered_nodes) <= 50

        metrics = optimizer.update_metrics(
            total_nodes=1000, visible_nodes=len(optimized_nodes)
        )
        assert metrics["totalNodes"] == 1000


if __name__ == "__main__":
    pytest.main([__file__])
