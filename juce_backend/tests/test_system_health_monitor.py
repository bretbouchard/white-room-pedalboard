"""
Tests for system health monitoring.
"""

import json
import os
import sys
import tempfile
import time
from unittest.mock import Mock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.audio_agent.core.error_handling import ComponentType
from src.audio_agent.core.system_health_monitor import (
    AlertLevel,
    AlertManager,
    ComponentHealth,
    HealthMetric,
    HealthStatus,
    PerformanceMonitor,
    SystemAlert,
    SystemHealthMonitor,
    check_system_health,
    get_system_health,
    start_health_monitoring,
    stop_health_monitoring,
)


class TestHealthMetric:
    """Test HealthMetric dataclass."""

    def test_health_metric_creation(self):
        """Test creating a health metric."""
        metric = HealthMetric(
            name="CPU Usage",
            value=75.5,
            status=HealthStatus.WARNING,
            threshold_warning=70.0,
            threshold_critical=90.0,
            unit="%",
            description="System CPU utilization",
        )

        assert metric.name == "CPU Usage"
        assert metric.value == 75.5
        assert metric.status == HealthStatus.WARNING
        assert metric.threshold_warning == 70.0
        assert metric.threshold_critical == 90.0
        assert metric.unit == "%"
        assert metric.description == "System CPU utilization"
        assert metric.last_updated > 0


class TestComponentHealth:
    """Test ComponentHealth dataclass."""

    def test_component_health_creation(self):
        """Test creating component health."""
        health = ComponentHealth(
            component_type=ComponentType.FAUST_ANALYZER, status=HealthStatus.HEALTHY
        )

        assert health.component_type == ComponentType.FAUST_ANALYZER
        assert health.status == HealthStatus.HEALTHY
        assert isinstance(health.metrics, dict)
        assert health.last_check > 0
        assert health.error_count == 0
        assert health.performance_score == 1.0


class TestSystemAlert:
    """Test SystemAlert dataclass."""

    def test_system_alert_creation(self):
        """Test creating a system alert."""
        alert = SystemAlert(
            alert_id="test_alert_123",
            component=ComponentType.DAWDREAMER_ENGINE,
            level=AlertLevel.WARNING,
            message="Test alert message",
        )

        assert alert.alert_id == "test_alert_123"
        assert alert.component == ComponentType.DAWDREAMER_ENGINE
        assert alert.level == AlertLevel.WARNING
        assert alert.message == "Test alert message"
        assert alert.timestamp > 0
        assert alert.resolved is False
        assert alert.resolution_time is None


class TestPerformanceMonitor:
    """Test PerformanceMonitor class."""

    @patch("src.audio_agent.core.system_health_monitor.psutil")
    def test_collect_system_metrics(self, mock_psutil):
        """Test collecting system metrics."""
        # Mock psutil responses
        mock_psutil.cpu_percent.return_value = 45.5
        mock_psutil.virtual_memory.return_value = Mock(percent=60.0)
        mock_psutil.disk_usage.return_value = Mock(used=50, total=100)
        mock_psutil.net_io_counters.return_value = Mock(
            bytes_sent=1000, bytes_recv=2000, packets_sent=10, packets_recv=20
        )
        mock_psutil.pids.return_value = list(range(100))  # 100 processes

        monitor = PerformanceMonitor()
        metrics = monitor.collect_system_metrics()

        assert "cpu_usage" in metrics
        assert "memory_usage" in metrics
        assert "disk_usage" in metrics
        assert "process_count" in metrics

        assert metrics["cpu_usage"].value == 45.5
        assert metrics["cpu_usage"].status == HealthStatus.HEALTHY
        assert metrics["memory_usage"].value == 60.0
        assert metrics["process_count"].value == 100

    def test_performance_summary(self):
        """Test performance summary generation."""
        monitor = PerformanceMonitor()

        # Add some test data
        monitor.cpu_history = [10.0, 20.0, 30.0, 40.0, 50.0]
        monitor.memory_history = [30.0, 35.0, 40.0, 45.0, 50.0]
        monitor.disk_history = [60.0, 65.0, 70.0, 75.0, 80.0]

        summary = monitor.get_performance_summary()

        assert "cpu" in summary
        assert "memory" in summary
        assert "disk" in summary

        assert summary["cpu"]["current"] == 50.0
        assert summary["cpu"]["average"] == 30.0
        assert summary["cpu"]["max"] == 50.0
        assert summary["cpu"]["min"] == 10.0


class TestAlertManager:
    """Test AlertManager class."""

    def test_alert_creation(self):
        """Test creating alerts."""
        manager = AlertManager()

        alert = manager.create_alert(
            component=ComponentType.FAUST_ANALYZER,
            level=AlertLevel.WARNING,
            message="Test warning",
            metadata={"test": "data"},
        )

        assert alert.component == ComponentType.FAUST_ANALYZER
        assert alert.level == AlertLevel.WARNING
        assert alert.message == "Test warning"
        assert alert.metadata["test"] == "data"
        assert len(manager.alerts) == 1

    def test_alert_resolution(self):
        """Test resolving alerts."""
        manager = AlertManager()

        alert = manager.create_alert(
            component=ComponentType.FAUST_ANALYZER,
            level=AlertLevel.WARNING,
            message="Test warning",
        )

        # Resolve the alert
        resolved = manager.resolve_alert(alert.alert_id)
        assert resolved is True
        assert alert.resolved is True
        assert alert.resolution_time is not None

        # Try to resolve non-existent alert
        resolved = manager.resolve_alert("non_existent")
        assert resolved is False

    def test_active_alerts_filtering(self):
        """Test filtering active alerts."""
        manager = AlertManager()

        # Create alerts
        alert1 = manager.create_alert(
            ComponentType.FAUST_ANALYZER, AlertLevel.WARNING, "Warning 1"
        )
        alert2 = manager.create_alert(
            ComponentType.DAWDREAMER_ENGINE, AlertLevel.ERROR, "Error 1"
        )
        alert3 = manager.create_alert(
            ComponentType.FAUST_ANALYZER, AlertLevel.CRITICAL, "Critical 1"
        )

        # Resolve one alert
        manager.resolve_alert(alert1.alert_id)

        # Test filtering
        active_alerts = manager.get_active_alerts()
        assert len(active_alerts) == 2

        faust_alerts = manager.get_active_alerts(component=ComponentType.FAUST_ANALYZER)
        assert len(faust_alerts) == 1
        assert faust_alerts[0].alert_id == alert3.alert_id

        error_alerts = manager.get_active_alerts(level=AlertLevel.ERROR)
        assert len(error_alerts) == 1
        assert error_alerts[0].alert_id == alert2.alert_id

    def test_alert_summary(self):
        """Test alert summary generation."""
        manager = AlertManager()

        # Create various alerts
        manager.create_alert(
            ComponentType.FAUST_ANALYZER, AlertLevel.WARNING, "Warning 1"
        )
        manager.create_alert(ComponentType.FAUST_ANALYZER, AlertLevel.ERROR, "Error 1")
        manager.create_alert(
            ComponentType.DAWDREAMER_ENGINE, AlertLevel.CRITICAL, "Critical 1"
        )

        summary = manager.get_alert_summary()

        assert summary["total_alerts"] == 3
        assert summary["active_alerts"] == 3
        assert summary["resolved_alerts"] == 0
        assert summary["alerts_by_level"]["warning"] == 1
        assert summary["alerts_by_level"]["error"] == 1
        assert summary["alerts_by_level"]["critical"] == 1
        assert summary["alerts_by_component"]["faust_analyzer"] == 2
        assert summary["alerts_by_component"]["dawdreamer_engine"] == 1

    def test_alert_callback(self):
        """Test alert callback functionality."""
        manager = AlertManager()
        callback_called = []

        def test_callback(alert):
            callback_called.append(alert)

        manager.add_alert_callback(test_callback)

        alert = manager.create_alert(
            ComponentType.FAUST_ANALYZER, AlertLevel.WARNING, "Test"
        )

        assert len(callback_called) == 1
        assert callback_called[0].alert_id == alert.alert_id


class TestSystemHealthMonitor:
    """Test SystemHealthMonitor class."""

    def test_health_monitor_initialization(self):
        """Test health monitor initialization."""
        monitor = SystemHealthMonitor(check_interval=10.0)

        assert monitor.check_interval == 10.0
        assert len(monitor.component_health) == len(ComponentType)
        assert isinstance(monitor.performance_monitor, PerformanceMonitor)
        assert isinstance(monitor.alert_manager, AlertManager)
        assert monitor.monitoring_active is False

    @patch("src.audio_agent.core.system_health_monitor.faust_error_handler")
    def test_check_faust_analyzers(self, mock_faust_handler):
        """Test checking Faust analyzer health."""
        mock_faust_handler.get_analyzer_status.return_value = {
            "total_analyzers": 5,
            "healthy_analyzers": 4,
            "fallback_analyzers": 1,
        }

        monitor = SystemHealthMonitor()
        monitor._check_faust_analyzers()

        health = monitor.component_health[ComponentType.FAUST_ANALYZER]
        assert health.status == HealthStatus.WARNING  # Has fallback analyzers
        assert health.metrics["total_analyzers"].value == 5
        assert health.metrics["healthy_analyzers"].value == 4
        assert health.metrics["fallback_analyzers"].value == 1
        assert health.performance_score == 0.8  # 4/5

    @patch("src.audio_agent.core.system_health_monitor.dawdreamer_error_handler")
    def test_check_dawdreamer_engine(self, mock_dd_handler):
        """Test checking DawDreamer engine health."""
        mock_dd_handler.get_engine_status.return_value = {
            "engine_health": True,
            "recovery_attempts": 1,
            "blacklisted_plugins": ["BadPlugin"],
        }

        monitor = SystemHealthMonitor()
        monitor._check_dawdreamer_engine()

        health = monitor.component_health[ComponentType.DAWDREAMER_ENGINE]
        assert (
            health.status == HealthStatus.WARNING
        )  # Has recovery attempts and blacklisted plugins
        assert health.metrics["engine_health"].value is True
        assert health.metrics["recovery_attempts"].value == 1
        assert health.metrics["blacklisted_plugins"].value == 1

    @patch("src.audio_agent.core.system_health_monitor.langgraph_error_handler")
    def test_check_langgraph_agents(self, mock_lg_handler):
        """Test checking LangGraph agent health."""
        mock_lg_handler.get_agent_status.return_value = {
            "agent_health": {"eq": True, "dynamics": True, "spatial": False},
            "fallback_active": ["spatial"],
        }

        monitor = SystemHealthMonitor()
        monitor._check_langgraph_agents()

        health = monitor.component_health[ComponentType.LANGGRAPH_AGENT]
        assert health.status == HealthStatus.WARNING  # Has fallback agents
        assert health.metrics["total_agents"].value == 3
        assert health.metrics["healthy_agents"].value == 2
        assert health.metrics["fallback_agents"].value == 1
        assert abs(health.performance_score - 2 / 3) < 0.01  # 2/3

    @patch("src.audio_agent.core.system_health_monitor.psutil")
    def test_check_system_resources(self, mock_psutil):
        """Test checking system resources."""
        # Mock high CPU usage (critical)
        mock_psutil.cpu_percent.return_value = 95.0
        mock_psutil.virtual_memory.return_value = Mock(percent=50.0)
        mock_psutil.disk_usage.return_value = Mock(used=50, total=100)
        mock_psutil.net_io_counters.return_value = Mock(
            bytes_sent=1000, bytes_recv=2000, packets_sent=10, packets_recv=20
        )
        mock_psutil.pids.return_value = list(range(100))

        monitor = SystemHealthMonitor()
        monitor._check_system_resources()

        # Check that system components are marked as critical due to high CPU
        audio_health = monitor.component_health[ComponentType.AUDIO_IO]
        assert audio_health.status == HealthStatus.CRITICAL

    def test_health_report_generation(self):
        """Test health report generation."""
        monitor = SystemHealthMonitor()

        # Set some test health data
        health = monitor.component_health[ComponentType.FAUST_ANALYZER]
        health.status = HealthStatus.WARNING
        health.performance_score = 0.8
        health.metrics["test_metric"] = HealthMetric(
            name="Test Metric",
            value=42,
            status=HealthStatus.HEALTHY,
            unit="units",
            description="Test metric",
        )

        report = monitor.get_health_report()

        assert "overall_status" in report
        assert "overall_performance_score" in report
        assert "components" in report
        assert "system_performance" in report
        assert "alerts" in report

        faust_report = report["components"]["faust_analyzer"]
        assert faust_report["status"] == "warning"
        assert faust_report["performance_score"] == 0.8
        assert "test_metric" in faust_report["metrics"]

    def test_monitoring_lifecycle(self):
        """Test starting and stopping monitoring."""
        monitor = SystemHealthMonitor(
            check_interval=0.1
        )  # Very short interval for testing

        # Start monitoring
        monitor.start_monitoring()
        assert monitor.monitoring_active is True
        assert monitor.monitor_thread is not None
        assert monitor.monitor_thread.is_alive()

        # Let it run briefly
        time.sleep(0.2)

        # Stop monitoring
        monitor.stop_monitoring()
        assert monitor.monitoring_active is False

        # Wait for thread to finish
        time.sleep(0.1)
        assert not monitor.monitor_thread.is_alive()

    def test_custom_metrics(self):
        """Test adding custom metrics."""
        monitor = SystemHealthMonitor()

        custom_metric = HealthMetric(
            name="Custom Metric",
            value=123,
            status=HealthStatus.HEALTHY,
            description="A custom metric",
        )

        monitor.add_custom_metric(ComponentType.FAUST_ANALYZER, "custom", custom_metric)

        health = monitor.component_health[ComponentType.FAUST_ANALYZER]
        assert "custom" in health.metrics
        assert health.metrics["custom"].value == 123

    def test_health_data_export(self):
        """Test exporting health data."""
        monitor = SystemHealthMonitor()

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            temp_file = f.name

        try:
            monitor.export_health_data(temp_file)

            # Verify file was created and contains valid JSON
            assert os.path.exists(temp_file)

            with open(temp_file) as f:
                data = json.load(f)

            assert "overall_status" in data
            assert "components" in data

        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)


class TestGlobalFunctions:
    """Test global convenience functions."""

    def test_global_health_functions(self):
        """Test global health monitoring functions."""
        # These should work without errors
        health_report = get_system_health()
        assert isinstance(health_report, dict)

        check_report = check_system_health()
        assert isinstance(check_report, dict)

    @patch("src.audio_agent.core.system_health_monitor.system_health_monitor")
    def test_start_stop_monitoring(self, mock_monitor):
        """Test global start/stop monitoring functions."""
        start_health_monitoring(check_interval=15.0)
        mock_monitor.start_monitoring.assert_called_once()
        assert mock_monitor.check_interval == 15.0

        stop_health_monitoring()
        mock_monitor.stop_monitoring.assert_called_once()


class TestIntegration:
    """Test integration between components."""

    @patch("src.audio_agent.core.system_health_monitor.faust_error_handler")
    @patch("src.audio_agent.core.system_health_monitor.dawdreamer_error_handler")
    @patch("src.audio_agent.core.system_health_monitor.langgraph_error_handler")
    def test_full_health_check_integration(self, mock_lg, mock_dd, mock_faust):
        """Test full health check integration."""
        # Mock all handlers
        mock_faust.get_analyzer_status.return_value = {
            "total_analyzers": 3,
            "healthy_analyzers": 3,
            "fallback_analyzers": 0,
        }
        mock_dd.get_engine_status.return_value = {
            "engine_health": True,
            "recovery_attempts": 0,
            "blacklisted_plugins": [],
        }
        mock_lg.get_agent_status.return_value = {
            "agent_health": {"eq": True, "dynamics": True},
            "fallback_active": [],
        }

        monitor = SystemHealthMonitor()

        with patch.object(
            monitor.performance_monitor, "collect_system_metrics"
        ) as mock_metrics:
            mock_metrics.return_value = {
                "cpu_usage": HealthMetric("CPU", 30.0, HealthStatus.HEALTHY),
                "memory_usage": HealthMetric("Memory", 40.0, HealthStatus.HEALTHY),
                "disk_usage": HealthMetric("Disk", 50.0, HealthStatus.HEALTHY),
                "process_count": HealthMetric("Processes", 200, HealthStatus.HEALTHY),
            }

            # Also mock the error handler status to ensure it's healthy
            with patch(
                "src.audio_agent.core.system_health_monitor.error_handler"
            ) as mock_error_handler:
                # Mock the get_system_health method (not get_error_health)
                mock_error_handler.get_system_health.return_value = {
                    "overall_health": True,
                    "recent_errors": 0,
                    "error_rate": 0.0,
                    "total_errors": 0,
                    "critical_errors": 0,
                }

                report = monitor.check_system_health()

                # Verify all components were checked
                assert report["overall_status"] == "healthy"
            assert len(report["components"]) == len(ComponentType)

            # Verify specific component statuses
            assert report["components"]["faust_analyzer"]["status"] == "healthy"
            assert report["components"]["dawdreamer_engine"]["status"] == "healthy"
            assert report["components"]["langgraph_agent"]["status"] == "healthy"


if __name__ == "__main__":
    pytest.main([__file__])
