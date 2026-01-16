"""Tests for plugin state management models."""

from datetime import datetime, timedelta

import pytest
from pydantic import ValidationError

from src.audio_agent.models.plugin import (
    PluginCategory,
    PluginFormat,
    PluginInstance,
    PluginMetadata,
    PluginState,
)
from src.audio_agent.models.plugin_state import (
    PluginPerformanceMetrics,
    PluginSessionState,
    PluginStateSnapshot,
)


class TestPluginStateSnapshot:
    """Test PluginStateSnapshot model validation."""

    def create_test_plugin_instance(self, instance_id: str = "test_plugin_1"):
        """Create test plugin instance."""
        metadata = PluginMetadata(
            name="Test Plugin",
            manufacturer="Test Co",
            version="1.0",
            unique_id=f"test_{instance_id}",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
        )

        return PluginInstance(
            instance_id=instance_id,
            plugin_metadata=metadata,
            state=PluginState.ACTIVE,
            cpu_usage=0.1,
        )

    def test_valid_plugin_state_snapshot(self):
        """Test creation of valid plugin state snapshot."""
        plugin1 = self.create_test_plugin_instance("plugin1")
        plugin2 = self.create_test_plugin_instance("plugin2")

        snapshot = PluginStateSnapshot(
            clerk_user_id="user_2abc123def456",
            snapshot_id="snap_123",
            session_id="sess_456",
            plugin_instances=[plugin1, plugin2],
            description="Test snapshot",
        )

        assert snapshot.clerk_user_id == "user_2abc123def456"
        assert snapshot.snapshot_id == "snap_123"
        assert len(snapshot.plugin_instances) == 2
        assert snapshot.description == "Test snapshot"

    def test_clerk_user_id_validation(self):
        """Test Clerk user ID validation."""
        plugin1 = self.create_test_plugin_instance()

        # Valid Clerk user ID
        snapshot = PluginStateSnapshot(
            clerk_user_id="user_2abc123def456",
            snapshot_id="snap_123",
            session_id="sess_456",
            plugin_instances=[plugin1],
        )
        assert snapshot.clerk_user_id == "user_2abc123def456"

        # Invalid Clerk user ID
        with pytest.raises(ValidationError, match="must start with 'user_'"):
            PluginStateSnapshot(
                clerk_user_id="invalid_123",
                snapshot_id="snap_123",
                session_id="sess_456",
                plugin_instances=[plugin1],
            )

    def test_plugin_categories_computation(self):
        """Test plugin categories computation."""
        eq_plugin = self.create_test_plugin_instance("eq1")
        comp_plugin = self.create_test_plugin_instance("comp1")
        comp_plugin.plugin_metadata.category = PluginCategory.COMPRESSOR

        snapshot = PluginStateSnapshot(
            clerk_user_id="user_2abc123def456",
            snapshot_id="snap_123",
            session_id="sess_456",
            plugin_instances=[eq_plugin, comp_plugin],
        )

        categories = snapshot.plugin_categories
        assert categories["eq"] == 1
        assert categories["compressor"] == 1

    def test_plugin_formats_computation(self):
        """Test plugin formats computation."""
        vst_plugin = self.create_test_plugin_instance("vst1")
        au_plugin = self.create_test_plugin_instance("au1")
        au_plugin.plugin_metadata.format = PluginFormat.AU

        snapshot = PluginStateSnapshot(
            clerk_user_id="user_2abc123def456",
            snapshot_id="snap_123",
            session_id="sess_456",
            plugin_instances=[vst_plugin, au_plugin],
        )

        formats = snapshot.plugin_formats
        assert formats["VST3"] == 1
        assert formats["AU"] == 1

    def test_calculate_statistics(self):
        """Test statistics calculation."""
        active_plugin = self.create_test_plugin_instance("active1")
        active_plugin.state = PluginState.ACTIVE
        active_plugin.cpu_usage = 0.3

        bypassed_plugin = self.create_test_plugin_instance("bypassed1")
        bypassed_plugin.is_bypassed = True
        bypassed_plugin.cpu_usage = 0.2

        snapshot = PluginStateSnapshot(
            clerk_user_id="user_2abc123def456",
            snapshot_id="snap_123",
            session_id="sess_456",
            plugin_instances=[active_plugin, bypassed_plugin],
        )

        snapshot.calculate_statistics()

        assert snapshot.total_plugins == 2
        assert snapshot.active_plugins == 1  # Only active plugin counts
        assert snapshot.estimated_cpu_usage == 0.5  # Sum of both plugins


class TestPluginSessionState:
    """Test PluginSessionState model validation."""

    def create_test_plugin_instance(self, instance_id: str = "test_plugin_1"):
        """Create test plugin instance."""
        metadata = PluginMetadata(
            name="Test Plugin",
            manufacturer="Test Co",
            version="1.0",
            unique_id=f"test_{instance_id}",
            category=PluginCategory.EQ,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
        )

        return PluginInstance(
            instance_id=instance_id,
            plugin_metadata=metadata,
            state=PluginState.ACTIVE,
            cpu_usage=0.1,
        )

    def test_valid_plugin_session_state(self):
        """Test creation of valid plugin session state."""
        plugin1 = self.create_test_plugin_instance("plugin1")

        session_state = PluginSessionState(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            current_plugins=[plugin1],
            project_id="proj_456",
        )

        assert session_state.clerk_user_id == "user_2abc123def456"
        assert session_state.session_id == "sess_123"
        assert session_state.project_id == "proj_456"
        assert len(session_state.current_plugins) == 1
        assert session_state.is_active

    def test_computed_properties(self):
        """Test computed properties."""
        active_plugin = self.create_test_plugin_instance("active1")
        active_plugin.state = PluginState.ACTIVE

        bypassed_plugin = self.create_test_plugin_instance("bypassed1")
        bypassed_plugin.is_bypassed = True

        session_state = PluginSessionState(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            current_plugins=[active_plugin, bypassed_plugin],
        )

        assert session_state.total_plugins == 2
        assert session_state.active_plugins == 1
        assert not session_state.can_undo  # No snapshots yet
        assert not session_state.can_redo

    def test_create_snapshot(self):
        """Test snapshot creation."""
        plugin1 = self.create_test_plugin_instance("plugin1")

        session_state = PluginSessionState(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            current_plugins=[plugin1],
        )

        # Create first snapshot
        snapshot_id = session_state.create_snapshot("Initial state")

        assert len(session_state.snapshots) == 1
        assert session_state.current_snapshot_index == 0
        assert session_state.snapshots[0].description == "Initial state"
        assert session_state.snapshots[0].snapshot_id == snapshot_id

    def test_undo_redo_functionality(self):
        """Test undo/redo functionality."""
        plugin1 = self.create_test_plugin_instance("plugin1")
        plugin2 = self.create_test_plugin_instance("plugin2")

        session_state = PluginSessionState(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            current_plugins=[plugin1],
        )

        # Create initial snapshot
        session_state.create_snapshot("State 1")
        assert session_state.current_snapshot_index == 0
        assert not session_state.can_undo

        # Add another plugin and create snapshot
        session_state.current_plugins.append(plugin2)
        session_state.create_snapshot("State 2")
        assert session_state.current_snapshot_index == 1
        assert session_state.can_undo
        assert not session_state.can_redo

        # Test undo
        success = session_state.undo()
        assert success
        assert session_state.current_snapshot_index == 0
        assert len(session_state.current_plugins) == 1
        assert session_state.can_redo

        # Test redo
        success = session_state.redo()
        assert success
        assert session_state.current_snapshot_index == 1
        assert len(session_state.current_plugins) == 2

        # Test undo when at beginning
        session_state.current_snapshot_index = 0
        success = session_state.undo()
        assert not success  # Should fail

    def test_restore_snapshot(self):
        """Test snapshot restoration."""
        plugin1 = self.create_test_plugin_instance("plugin1")
        plugin2 = self.create_test_plugin_instance("plugin2")

        session_state = PluginSessionState(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            current_plugins=[plugin1],
        )

        # Create snapshots
        snapshot_id_1 = session_state.create_snapshot("State 1")
        session_state.current_plugins.append(plugin2)
        session_state.create_snapshot("State 2")

        # Restore to first snapshot
        success = session_state.restore_snapshot(snapshot_id_1)
        assert success
        assert len(session_state.current_plugins) == 1
        assert session_state.current_snapshot_index == 0

        # Try to restore non-existent snapshot
        success = session_state.restore_snapshot("nonexistent")
        assert not success

    def test_snapshot_index_validation(self):
        """Test snapshot index validation."""
        plugin1 = self.create_test_plugin_instance("plugin1")

        # Valid session state
        session_state = PluginSessionState(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            current_plugins=[plugin1],
            current_snapshot_index=-1,  # Valid for no snapshots
        )
        assert session_state.current_snapshot_index == -1

        # Create a snapshot first
        session_state.create_snapshot("Test")

        # Invalid snapshot index (too high)
        with pytest.raises(ValidationError, match="exceeds available snapshots"):
            session_state.current_snapshot_index = 5

    def test_max_undo_steps_limit(self):
        """Test maximum undo steps limitation."""
        plugin1 = self.create_test_plugin_instance("plugin1")

        session_state = PluginSessionState(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            current_plugins=[plugin1],
            max_undo_steps=3,  # Small limit for testing
        )

        # Create more snapshots than the limit
        for i in range(5):
            session_state.create_snapshot(f"State {i}")

        # Should only keep the last 3 snapshots
        assert len(session_state.snapshots) == 3
        assert session_state.current_snapshot_index == 2

    def test_get_current_snapshot(self):
        """Test getting current snapshot."""
        plugin1 = self.create_test_plugin_instance("plugin1")

        session_state = PluginSessionState(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            current_plugins=[plugin1],
        )

        # No snapshots yet
        current = session_state.get_current_snapshot()
        assert current is None

        # Create snapshot
        session_state.create_snapshot("Test snapshot")
        current = session_state.get_current_snapshot()
        assert current is not None
        assert current.description == "Test snapshot"


class TestPluginPerformanceMetrics:
    """Test PluginPerformanceMetrics model validation."""

    def test_valid_plugin_performance_metrics(self):
        """Test creation of valid plugin performance metrics."""
        metrics = PluginPerformanceMetrics(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            plugin_instance_id="plugin_456",
        )

        assert metrics.clerk_user_id == "user_2abc123def456"
        assert metrics.session_id == "sess_123"
        assert metrics.plugin_instance_id == "plugin_456"
        assert metrics.sample_count == 0
        assert metrics.collection_duration_minutes == 0.0

    def test_add_sample(self):
        """Test adding performance samples."""
        metrics = PluginPerformanceMetrics(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            plugin_instance_id="plugin_456",
        )

        # Add valid sample
        metrics.add_sample(0.5, 100.0, 5.0)

        assert metrics.sample_count == 1
        assert metrics.avg_cpu_usage == 0.5
        assert metrics.avg_memory_usage == 100.0
        assert metrics.avg_processing_time == 5.0
        assert metrics.max_cpu_usage == 0.5

        # Add another sample
        metrics.add_sample(0.7, 150.0, 8.0)

        assert metrics.sample_count == 2
        assert metrics.avg_cpu_usage == 0.6  # (0.5 + 0.7) / 2
        assert metrics.max_cpu_usage == 0.7

    def test_sample_validation(self):
        """Test sample value validation."""
        metrics = PluginPerformanceMetrics(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            plugin_instance_id="plugin_456",
        )

        # Invalid CPU usage (too high)
        with pytest.raises(ValueError, match="CPU usage must be between 0 and 1"):
            metrics.add_sample(1.5, 100.0, 5.0)

        # Invalid memory usage (negative)
        with pytest.raises(ValueError, match="Memory usage cannot be negative"):
            metrics.add_sample(0.5, -10.0, 5.0)

        # Invalid processing time (negative)
        with pytest.raises(ValueError, match="Processing time cannot be negative"):
            metrics.add_sample(0.5, 100.0, -1.0)

    def test_sample_history_limit(self):
        """Test sample history limitation."""
        metrics = PluginPerformanceMetrics(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            plugin_instance_id="plugin_456",
        )

        # Add many samples (more than the limit)
        for _i in range(1200):  # Exceeds 1000 sample limit
            metrics.add_sample(0.1, 50.0, 2.0)

        # Should be limited to 1000 samples
        assert metrics.sample_count == 1000
        assert len(metrics.cpu_usage_samples) == 1000
        assert len(metrics.memory_usage_samples) == 1000
        assert len(metrics.processing_time_samples) == 1000
        assert len(metrics.sample_timestamps) == 1000

    def test_get_recent_samples(self):
        """Test getting recent samples."""
        metrics = PluginPerformanceMetrics(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            plugin_instance_id="plugin_456",
        )

        # Add samples with different timestamps
        now = datetime.utcnow()
        old_time = now - timedelta(minutes=10)
        recent_time = now - timedelta(minutes=2)

        metrics.add_sample(0.3, 80.0, 3.0, old_time)
        metrics.add_sample(0.5, 100.0, 5.0, recent_time)
        metrics.add_sample(0.7, 120.0, 7.0, now)

        # Get recent samples (last 5 minutes)
        recent = metrics.get_recent_samples(5)

        # Should only include the last 2 samples
        assert len(recent["cpu"]) == 2
        assert recent["cpu"] == [0.5, 0.7]
        assert recent["memory"] == [100.0, 120.0]

    def test_performance_degradation_detection(self):
        """Test performance degradation detection."""
        metrics = PluginPerformanceMetrics(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            plugin_instance_id="plugin_456",
        )

        # Add samples indicating good performance
        metrics.add_sample(0.3, 100.0, 3.0)
        metrics.add_sample(0.4, 120.0, 4.0)

        degradation = metrics.is_performance_degraded()
        assert not degradation["cpu_degraded"]
        assert not degradation["memory_degraded"]
        assert not degradation["processing_time_degraded"]
        assert not degradation["overall_degraded"]

        # Add samples indicating poor performance
        metrics.add_sample(0.9, 600.0, 15.0)  # High CPU, memory, and processing time

        degradation = metrics.is_performance_degraded()
        assert degradation["cpu_degraded"]
        assert degradation["memory_degraded"]
        assert degradation["processing_time_degraded"]
        assert degradation["overall_degraded"]

    def test_sample_lists_length_validation(self):
        """Test that sample lists maintain consistent lengths."""
        # This test ensures the validator works correctly
        # In practice, the add_sample method maintains consistency

        metrics = PluginPerformanceMetrics(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            plugin_instance_id="plugin_456",
        )

        # Add samples normally
        metrics.add_sample(0.5, 100.0, 5.0)
        metrics.add_sample(0.6, 110.0, 6.0)

        # All lists should have the same length
        assert len(metrics.cpu_usage_samples) == len(metrics.memory_usage_samples)
        assert len(metrics.cpu_usage_samples) == len(metrics.processing_time_samples)
        assert len(metrics.cpu_usage_samples) == len(metrics.sample_timestamps)

    def test_collection_duration_calculation(self):
        """Test collection duration calculation."""
        start_time = datetime.utcnow() - timedelta(minutes=30)

        metrics = PluginPerformanceMetrics(
            clerk_user_id="user_2abc123def456",
            session_id="sess_123",
            plugin_instance_id="plugin_456",
            collection_started=start_time,
        )

        # Add a sample to update last_updated
        metrics.add_sample(0.5, 100.0, 5.0)

        # Duration should be approximately 30 minutes
        duration = metrics.collection_duration_minutes
        assert 29 <= duration <= 31  # Allow for small timing differences
