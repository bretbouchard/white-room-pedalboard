"""
Comprehensive tests for the UnifiedDAIDClient
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from daid_core import (
    UnifiedDAIDClient,
    UnifiedDAIDConfig,
)


@pytest.fixture
def basic_config():
    """Basic configuration for testing."""
    return UnifiedDAIDConfig(
        agent_id="test-agent-v1",
        base_url="http://localhost:8080",
        api_key="test-key",
        enable_batching=True,
        enable_caching=True,
        enable_health_monitoring=False,  # Disable for testing
        batch_size=5,
        batch_timeout=0.1,
        system_component="test-client",
    )


@pytest.fixture
async def client(basic_config):
    """Create a test client."""
    client = UnifiedDAIDClient(basic_config)
    await client.initialize()
    yield client
    await client.cleanup()


@pytest.mark.asyncio
class TestUnifiedDAIDClient:
    """Test suite for UnifiedDAIDClient."""

    async def test_client_initialization(self, basic_config):
        """Test client initialization and cleanup."""
        client = UnifiedDAIDClient(basic_config)
        assert not client.initialized

        await client.initialize()
        assert client.initialized

        await client.cleanup()
        assert not client.initialized

    async def test_basic_daid_creation(self, client):
        """Test basic DAID creation."""
        result = await client.create_daid(
            entity_type="test_entity",
            entity_id="test-001",
            operation="create",
            metadata={"test": "data"},
            batch=False,
        )

        assert result.success
        assert result.daid is not None
        assert result.daid.startswith("daid:")
        assert not result.metadata.get("cached", False)
        assert not result.metadata.get("batched", False)

    async def test_batched_daid_creation(self, client):
        """Test batched DAID creation."""
        # Create multiple DAIDs with batching enabled
        results = []
        for i in range(3):
            result = await client.create_daid(
                entity_type="batch_test",
                entity_id=f"batch-{i}",
                operation="create",
                batch=True,
            )
            results.append(result)

        # All should succeed and be batched
        for result in results:
            assert result.success
            assert result.daid is not None
            assert result.metadata.get("batched", False)

        # Flush batch to ensure processing
        await client.flush_batch()

    async def test_caching_behavior(self, client):
        """Test caching functionality."""
        # First call should not be cached
        result1 = await client.create_daid(
            entity_type="cache_test",
            entity_id="cache-001",
            operation="create",
            metadata={"test": "cache"},
            batch=False,
            skip_cache=False,
        )

        assert result1.success
        assert not result1.metadata.get("cached", False)

        # Second identical call should be cached
        result2 = await client.create_daid(
            entity_type="cache_test",
            entity_id="cache-001",
            operation="create",
            metadata={"test": "cache"},
            batch=False,
            skip_cache=False,
        )

        assert result2.success
        assert result2.metadata.get("cached", False)
        assert result1.daid == result2.daid

    async def test_error_handling(self, client):
        """Test error handling in DAID creation."""
        # Mock the client to raise an exception
        with patch.object(
            client, "_process_single_record", side_effect=Exception("Test error")
        ):
            result = await client.create_daid(
                entity_type="error_test",
                entity_id="error-001",
                operation="create",
                batch=False,
            )

            assert not result.success
            assert result.error == "Test error"
            assert result.daid is None

    async def test_parent_daid_relationships(self, client):
        """Test parent DAID relationships."""
        # Create parent DAID
        parent_result = await client.create_daid(
            entity_type="parent",
            entity_id="parent-001",
            operation="create",
            batch=False,
        )

        assert parent_result.success

        # Create child DAID with parent relationship
        child_result = await client.create_daid(
            entity_type="child",
            entity_id="child-001",
            operation="create",
            parent_daids=[parent_result.daid],
            batch=False,
        )

        assert child_result.success
        assert child_result.daid != parent_result.daid

    async def test_batch_flushing(self, client):
        """Test batch flushing behavior."""
        # Add items to batch
        for i in range(3):
            await client.create_daid(
                entity_type="flush_test",
                entity_id=f"flush-{i}",
                operation="create",
                batch=True,
            )

        # Check batch queue has items
        stats_before = client.get_stats()
        assert stats_before["batch_queue_size"] > 0

        # Flush batch
        await client.flush_batch()

        # Check batch queue is empty
        stats_after = client.get_stats()
        assert stats_after["batch_queue_size"] == 0

    async def test_statistics_tracking(self, client):
        """Test statistics tracking."""
        initial_stats = client.get_stats()

        # Perform some operations
        await client.create_daid("stats_test", "stats-001", "create", batch=False)
        await client.create_daid("stats_test", "stats-002", "create", batch=True)

        final_stats = client.get_stats()

        # Check stats were updated
        assert final_stats["operations_count"] > initial_stats["operations_count"]
        assert final_stats["batched_operations"] >= initial_stats["batched_operations"]

    @patch("daid_core.DAIDClient")
    async def test_query_daids(self, mock_client_class, client):
        """Test DAID querying functionality."""
        # Mock the query response
        mock_client_instance = mock_client_class.return_value
        mock_client_instance.queryRecords = AsyncMock(
            return_value=[MagicMock(daid="daid:test1"), MagicMock(daid="daid:test2")]
        )

        result = await client.queryDAIDs({"entityType": "test", "limit": 10})

        assert result["success"]
        assert len(result["daids"]) == 2
        assert "daid:test1" in result["daids"]

    async def test_provenance_chain_retrieval(self, client):
        """Test provenance chain retrieval."""
        # Create a DAID first
        result = await client.create_daid(
            entity_type="chain_test",
            entity_id="chain-001",
            operation="create",
            batch=False,
        )

        assert result.success

        # Try to get provenance chain
        chain_result = client.getProvenanceChain(result.daid)

        # Should succeed (even if chain is empty for local-only operation)
        assert chain_result["success"]

    async def test_configuration_validation(self):
        """Test configuration validation."""
        # Test with minimal config
        minimal_config = UnifiedDAIDConfig(agent_id="test")
        client = UnifiedDAIDClient(minimal_config)

        assert client.config.agent_id == "test"
        assert client.config.batch_size == 100  # Default value
        assert client.config.enable_batching is True  # Default value

        await client.cleanup()

    async def test_metadata_enrichment(self, client):
        """Test that metadata is properly enriched."""
        result = await client.create_daid(
            entity_type="metadata_test",
            entity_id="meta-001",
            operation="create",
            metadata={"custom": "value"},
            tags=["test-tag"],
            user_id="user-123",
            batch=False,
        )

        assert result.success

        # The metadata should be enriched with system information
        # This is tested indirectly through successful DAID creation

    async def test_concurrent_operations(self, client):
        """Test concurrent DAID operations."""
        # Create multiple concurrent operations
        tasks = []
        for i in range(10):
            task = client.create_daid(
                entity_type="concurrent_test",
                entity_id=f"concurrent-{i}",
                operation="create",
                batch=True,
            )
            tasks.append(task)

        # Wait for all to complete
        results = await asyncio.gather(*tasks)

        # All should succeed
        for result in results:
            assert result.success
            assert result.daid is not None

        # All DAIDs should be unique
        daids = [r.daid for r in results]
        assert len(set(daids)) == len(daids)

    async def test_cache_key_generation(self, client):
        """Test cache key generation for different scenarios."""
        # Same parameters should generate same cache key (and hit cache)
        result1 = await client.create_daid(
            "cache_key_test", "key-001", "create", metadata={"a": 1}, batch=False
        )

        result2 = await client.create_daid(
            "cache_key_test", "key-001", "create", metadata={"a": 1}, batch=False
        )

        # Should be cached
        assert result2.metadata.get("cached", False)
        assert result1.daid == result2.daid

        # Different metadata should not hit cache
        result3 = await client.create_daid(
            "cache_key_test", "key-001", "create", metadata={"a": 2}, batch=False
        )

        assert not result3.metadata.get("cached", False)
        assert result1.daid != result3.daid


@pytest.mark.asyncio
class TestIntegrationScenarios:
    """Integration test scenarios."""

    async def test_audio_workflow_simulation(self, client):
        """Simulate an audio processing workflow."""
        # Create project
        project_result = await client.create_daid(
            "project",
            "audio-project-001",
            "create",
            metadata={"name": "Test Audio Project"},
            tags=["audio", "project"],
            batch=False,
        )
        assert project_result.success

        # Create track
        track_result = await client.create_daid(
            "track",
            "track-001",
            "create",
            metadata={"name": "Lead Vocal", "bpm": 120},
            parent_daids=[project_result.daid],
            tags=["audio", "track"],
            batch=False,
        )
        assert track_result.success

        # Add plugin
        plugin_result = await client.create_daid(
            "plugin",
            "reverb-001",
            "create",
            metadata={"name": "Hall Reverb", "preset": "Large Hall"},
            parent_daids=[track_result.daid],
            tags=["audio", "plugin", "effect"],
            batch=False,
        )
        assert plugin_result.success

        # Parameter change
        param_result = await client.create_daid(
            "parameter",
            "reverb-001-wetness",
            "update",
            metadata={"parameter": "wetness", "value": 0.3, "previous": 0.2},
            parent_daids=[plugin_result.daid],
            tags=["audio", "parameter", "automation"],
            batch=True,
        )
        assert param_result.success

        # Flush batch operations
        await client.flush_batch()

        # Verify all DAIDs are unique
        daids = [
            project_result.daid,
            track_result.daid,
            plugin_result.daid,
            param_result.daid,
        ]
        assert len(set(daids)) == 4

    async def test_batch_performance(self, client):
        """Test batch performance with many operations."""
        import time

        start_time = time.time()

        # Create many operations
        tasks = []
        for i in range(50):
            task = client.create_daid(
                "performance_test",
                f"perf-{i}",
                "create",
                metadata={"index": i},
                batch=True,
            )
            tasks.append(task)

        results = await asyncio.gather(*tasks)

        # Flush remaining batch
        await client.flush_batch()

        end_time = time.time()
        duration = end_time - start_time

        # All should succeed
        assert all(r.success for r in results)

        # Should complete reasonably quickly (adjust threshold as needed)
        assert duration < 5.0  # 5 seconds for 50 operations

        print(f"Batch performance: {len(results)} operations in {duration:.2f}s")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
