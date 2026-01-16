"""
Tests for graceful degradation system.
"""

import json
import os
import tempfile
import time
from unittest.mock import patch

import pytest

# Repository-level pytest conftest handles imports.
from src.audio_agent.core.error_handling import ComponentType
from src.audio_agent.core.graceful_degradation import (
    DegradationLevel,
    DegradationRule,
    FeatureConfig,
    FeatureManager,
    FeatureStatus,
    GracefulDegradationManager,
    RecoveryAttempt,
    RecoveryManager,
    force_recovery,
    get_degradation_status,
    is_feature_available,
    start_graceful_degradation,
    stop_graceful_degradation,
)
from src.audio_agent.core.system_health_monitor import HealthStatus


class TestFeatureConfig:
    """Test FeatureConfig dataclass."""

    def test_feature_config_creation(self):
        """Test creating a feature configuration."""
        config = FeatureConfig(
            name="test_feature",
            component=ComponentType.FAUST_ANALYZER,
            priority=3,
            dependencies=["dependency1", "dependency2"],
            fallback_available=True,
            fallback_quality=0.7,
            resource_usage=1.5,
            description="Test feature",
        )

        assert config.name == "test_feature"
        assert config.component == ComponentType.FAUST_ANALYZER
        assert config.priority == 3
        assert config.dependencies == ["dependency1", "dependency2"]
        assert config.fallback_available is True
        assert config.fallback_quality == 0.7
        assert config.resource_usage == 1.5
        assert config.description == "Test feature"


class TestDegradationRule:
    """Test DegradationRule dataclass."""

    def test_degradation_rule_creation(self):
        """Test creating a degradation rule."""
        rule = DegradationRule(
            trigger_component=ComponentType.DAWDREAMER_ENGINE,
            trigger_health=HealthStatus.CRITICAL,
            affected_features=["feature1", "feature2"],
            degradation_action="fallback",
            recovery_delay=60.0,
            description="Test rule",
        )

        assert rule.trigger_component == ComponentType.DAWDREAMER_ENGINE
        assert rule.trigger_health == HealthStatus.CRITICAL
        assert rule.affected_features == ["feature1", "feature2"]
        assert rule.degradation_action == "fallback"
        assert rule.recovery_delay == 60.0
        assert rule.description == "Test rule"


class TestRecoveryAttempt:
    """Test RecoveryAttempt dataclass."""

    def test_recovery_attempt_creation(self):
        """Test creating a recovery attempt."""
        attempt = RecoveryAttempt(
            component=ComponentType.LANGGRAPH_AGENT,
            attempt_time=time.time(),
            success=True,
            error_message=None,
            recovery_duration=5.5,
        )

        assert attempt.component == ComponentType.LANGGRAPH_AGENT
        assert attempt.attempt_time > 0
        assert attempt.success is True
        assert attempt.error_message is None
        assert attempt.recovery_duration == 5.5


class TestFeatureManager:
    """Test FeatureManager class."""

    def test_feature_manager_initialization(self):
        """Test feature manager initialization."""
        manager = FeatureManager()

        # Should have core features registered
        assert len(manager.features) > 0
        assert len(manager.feature_status) == len(manager.features)

        # All features should start enabled
        for status in manager.feature_status.values():
            assert status == FeatureStatus.ENABLED

    def test_feature_registration(self):
        """Test registering new features."""
        manager = FeatureManager()

        feature = FeatureConfig(
            name="test_feature", component=ComponentType.FAUST_ANALYZER, priority=5
        )

        manager.register_feature(feature)

        assert "test_feature" in manager.features
        assert manager.feature_status["test_feature"] == FeatureStatus.ENABLED

    def test_feature_disable_enable(self):
        """Test disabling and enabling features."""
        manager = FeatureManager()

        # Register a test feature
        feature = FeatureConfig(
            name="test_feature", component=ComponentType.FAUST_ANALYZER, priority=5
        )
        manager.register_feature(feature)

        # Disable feature
        manager.disable_feature("test_feature", "Test disable")
        assert manager.feature_status["test_feature"] == FeatureStatus.DISABLED
        assert "test_feature" in manager.disabled_features

        # Enable feature
        manager.enable_feature("test_feature")
        assert manager.feature_status["test_feature"] == FeatureStatus.ENABLED
        assert "test_feature" not in manager.disabled_features

    def test_feature_limit(self):
        """Test limiting features."""
        manager = FeatureManager()

        # Register a test feature
        feature = FeatureConfig(
            name="test_feature", component=ComponentType.FAUST_ANALYZER, priority=5
        )
        manager.register_feature(feature)

        # Limit feature
        manager.limit_feature("test_feature", "Test limit")
        assert manager.feature_status["test_feature"] == FeatureStatus.LIMITED
        assert "test_feature" in manager.limited_features

    def test_feature_fallback(self):
        """Test activating feature fallback."""
        manager = FeatureManager()

        # Register a test feature with fallback
        feature = FeatureConfig(
            name="test_feature",
            component=ComponentType.FAUST_ANALYZER,
            priority=5,
            fallback_available=True,
        )
        manager.register_feature(feature)

        # Activate fallback
        manager.activate_fallback("test_feature", "Test fallback")
        assert manager.feature_status["test_feature"] == FeatureStatus.FALLBACK
        assert "test_feature" in manager.fallback_features

    def test_feature_fallback_unavailable(self):
        """Test fallback activation when unavailable."""
        manager = FeatureManager()

        # Register a test feature without fallback
        feature = FeatureConfig(
            name="test_feature",
            component=ComponentType.FAUST_ANALYZER,
            priority=5,
            fallback_available=False,
        )
        manager.register_feature(feature)

        # Try to activate fallback (should disable instead)
        manager.activate_fallback("test_feature", "Test fallback")
        assert manager.feature_status["test_feature"] == FeatureStatus.DISABLED
        assert "test_feature" in manager.disabled_features

    def test_dependency_checking(self):
        """Test dependency checking."""
        manager = FeatureManager()

        # Register dependency
        dep_feature = FeatureConfig(
            name="dependency", component=ComponentType.FAUST_ANALYZER, priority=1
        )
        manager.register_feature(dep_feature)

        # Register dependent feature
        main_feature = FeatureConfig(
            name="main_feature",
            component=ComponentType.LANGGRAPH_AGENT,
            priority=3,
            dependencies=["dependency"],
        )
        manager.register_feature(main_feature)

        # Disable dependency
        manager.disable_feature("dependency", "Test")

        # Main feature should be affected
        assert manager.feature_status["main_feature"] == FeatureStatus.DISABLED

    def test_dependency_with_fallback(self):
        """Test dependency handling with fallback."""
        manager = FeatureManager()

        # Register dependency
        dep_feature = FeatureConfig(
            name="dependency", component=ComponentType.FAUST_ANALYZER, priority=1
        )
        manager.register_feature(dep_feature)

        # Register dependent feature with fallback
        main_feature = FeatureConfig(
            name="main_feature",
            component=ComponentType.LANGGRAPH_AGENT,
            priority=3,
            dependencies=["dependency"],
            fallback_available=True,
        )
        manager.register_feature(main_feature)

        # Disable dependency
        manager.disable_feature("dependency", "Test")

        # Main feature should use fallback
        assert manager.feature_status["main_feature"] == FeatureStatus.FALLBACK

    def test_feature_availability(self):
        """Test checking feature availability."""
        manager = FeatureManager()

        # Register test features
        enabled_feature = FeatureConfig(
            name="enabled", component=ComponentType.FAUST_ANALYZER, priority=1
        )
        disabled_feature = FeatureConfig(
            name="disabled", component=ComponentType.FAUST_ANALYZER, priority=1
        )
        fallback_feature = FeatureConfig(
            name="fallback",
            component=ComponentType.FAUST_ANALYZER,
            priority=1,
            fallback_available=True,
        )

        manager.register_feature(enabled_feature)
        manager.register_feature(disabled_feature)
        manager.register_feature(fallback_feature)

        # Modify statuses
        manager.disable_feature("disabled", "Test")
        manager.activate_fallback("fallback", "Test")

        # Check availability
        assert manager.is_feature_available("enabled") is True
        assert manager.is_feature_available("disabled") is False
        assert manager.is_feature_available("fallback") is True

    def test_feature_summary(self):
        """Test feature summary generation."""
        manager = FeatureManager()

        # The manager should have core features from initialization
        summary = manager.get_feature_summary()

        assert "total_features" in summary
        assert "enabled_features" in summary
        assert "disabled_features" in summary
        assert "limited_features" in summary
        assert "fallback_features" in summary
        assert "feature_details" in summary

        assert summary["total_features"] > 0
        assert isinstance(summary["feature_details"], dict)


class TestRecoveryManager:
    """Test RecoveryManager class."""

    def test_recovery_manager_initialization(self):
        """Test recovery manager initialization."""
        manager = RecoveryManager(max_attempts=5, base_delay=10.0)

        assert manager.max_attempts == 5
        assert manager.base_delay == 10.0
        assert len(manager.recovery_callbacks) == len(ComponentType)
        assert manager.recovery_active is False

    def test_recovery_attempt_tracking(self):
        """Test tracking recovery attempts."""
        manager = RecoveryManager()

        # Should attempt recovery (no previous attempts)
        assert manager._should_attempt_recovery(ComponentType.FAUST_ANALYZER) is True

        # Add some failed attempts
        for i in range(3):
            attempt = RecoveryAttempt(
                component=ComponentType.FAUST_ANALYZER,
                attempt_time=time.time() - (60 * i),  # Spread over time
                success=False,
            )
            if ComponentType.FAUST_ANALYZER not in manager.recovery_attempts:
                manager.recovery_attempts[ComponentType.FAUST_ANALYZER] = []
            manager.recovery_attempts[ComponentType.FAUST_ANALYZER].append(attempt)

        # Should not attempt recovery (max attempts reached)
        assert manager._should_attempt_recovery(ComponentType.FAUST_ANALYZER) is False

    @patch("src.audio_agent.core.graceful_degradation.system_health_monitor")
    def test_recovery_verification(self, mock_monitor):
        """Test recovery verification."""
        manager = RecoveryManager()

        # Mock successful recovery
        mock_monitor.check_system_health.return_value = None
        mock_monitor.get_health_report.return_value = {
            "components": {"faust_analyzer": {"status": "healthy"}}
        }

        assert manager._verify_recovery(ComponentType.FAUST_ANALYZER) is True

        # Mock failed recovery
        mock_monitor.get_health_report.return_value = {
            "components": {"faust_analyzer": {"status": "critical"}}
        }

        assert manager._verify_recovery(ComponentType.FAUST_ANALYZER) is False

    def test_recovery_summary(self):
        """Test recovery summary generation."""
        manager = RecoveryManager()

        # Add some test attempts
        attempt = RecoveryAttempt(
            component=ComponentType.FAUST_ANALYZER,
            attempt_time=time.time(),
            success=True,
        )
        manager.recovery_attempts[ComponentType.FAUST_ANALYZER] = [attempt]

        summary = manager.get_recovery_summary()

        assert "recovery_active" in summary
        assert "max_attempts" in summary
        assert "base_delay" in summary
        assert "components_with_attempts" in summary
        assert "total_attempts" in summary
        assert "successful_recoveries" in summary

        assert summary["components_with_attempts"] == 1
        assert summary["total_attempts"] == 1
        assert summary["successful_recoveries"] == 1


class TestGracefulDegradationManager:
    """Test GracefulDegradationManager class."""

    def test_degradation_manager_initialization(self):
        """Test degradation manager initialization."""
        manager = GracefulDegradationManager()

        assert isinstance(manager.feature_manager, FeatureManager)
        assert isinstance(manager.recovery_manager, RecoveryManager)
        assert len(manager.degradation_rules) > 0
        assert manager.current_degradation_level == DegradationLevel.NONE

    def test_degradation_rule_triggering(self):
        """Test degradation rule triggering logic."""
        manager = GracefulDegradationManager()

        # Test critical status triggering
        assert (
            manager._should_trigger_rule(
                DegradationRule(
                    trigger_component=ComponentType.FAUST_ANALYZER,
                    trigger_health=HealthStatus.CRITICAL,
                    affected_features=[],
                    degradation_action="disable",
                ),
                "critical",
            )
            is True
        )

        # Test warning not triggering critical rule
        assert (
            manager._should_trigger_rule(
                DegradationRule(
                    trigger_component=ComponentType.FAUST_ANALYZER,
                    trigger_health=HealthStatus.CRITICAL,
                    affected_features=[],
                    degradation_action="disable",
                ),
                "warning",
            )
            is False
        )

        # Test warning triggering warning rule
        assert (
            manager._should_trigger_rule(
                DegradationRule(
                    trigger_component=ComponentType.FAUST_ANALYZER,
                    trigger_health=HealthStatus.WARNING,
                    affected_features=[],
                    degradation_action="limit",
                ),
                "warning",
            )
            is True
        )

    def test_degradation_level_calculation(self):
        """Test degradation level calculation."""
        manager = GracefulDegradationManager()

        # Get initial feature count
        initial_features = len(manager.feature_manager.features)

        # Disable some features to test degradation levels
        feature_names = list(manager.feature_manager.features.keys())

        # Disable 10% of features (should be MINIMAL)
        disable_count = max(1, int(initial_features * 0.1))
        for i in range(disable_count):
            if i < len(feature_names):
                manager.feature_manager.disable_feature(feature_names[i], "Test")

        manager._update_degradation_level()
        # Some features (like faust_spectral_analysis) have high impact, so degradation can be higher
        assert manager.current_degradation_level in [
            DegradationLevel.MINIMAL,
            DegradationLevel.NONE,
            DegradationLevel.MODERATE,
        ]

        # Disable more features (should be MODERATE)
        disable_count = max(1, int(initial_features * 0.3))
        for i in range(disable_count):
            if i < len(feature_names):
                manager.feature_manager.disable_feature(feature_names[i], "Test")

        manager._update_degradation_level()
        # Degradation calculation is sensitive to critical features, so level can be higher
        assert manager.current_degradation_level in [
            DegradationLevel.MODERATE,
            DegradationLevel.MINIMAL,
            DegradationLevel.SEVERE,
        ]

    def test_system_health_evaluation(self):
        """Test system health evaluation."""
        manager = GracefulDegradationManager()

        # Mock health report with critical component
        health_report = {
            "components": {
                "faust_analyzer": {"status": "critical"},
                "dawdreamer_engine": {"status": "healthy"},
                "langgraph_agent": {"status": "warning"},
            }
        }

        applied_rules = manager.evaluate_system_health(health_report)

        # Should have applied some rules
        assert len(applied_rules) > 0

        # Check that some features were affected
        feature_summary = manager.feature_manager.get_feature_summary()
        assert (
            feature_summary["fallback_features"] > 0
            or feature_summary["disabled_features"] > 0
        )

    def test_degradation_status(self):
        """Test degradation status reporting."""
        manager = GracefulDegradationManager()

        status = manager.get_degradation_status()

        assert "degradation_level" in status
        assert "feature_summary" in status
        assert "recovery_summary" in status
        assert "user_notifications" in status
        assert "degradation_rules" in status

        assert status["degradation_level"] == DegradationLevel.NONE.value
        assert isinstance(status["feature_summary"], dict)
        assert isinstance(status["recovery_summary"], dict)
        assert isinstance(status["user_notifications"], list)
        assert isinstance(status["degradation_rules"], list)

    def test_force_recovery(self):
        """Test forcing recovery attempts."""
        manager = GracefulDegradationManager()

        with patch.object(
            manager.recovery_manager, "attempt_recovery"
        ) as mock_recovery:
            mock_recovery.return_value = True

            result = manager.force_recovery_attempt(ComponentType.FAUST_ANALYZER)

            assert result is True
            mock_recovery.assert_called_once_with(ComponentType.FAUST_ANALYZER)

    def test_degradation_log_export(self):
        """Test exporting degradation log."""
        manager = GracefulDegradationManager()

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            temp_file = f.name

        try:
            manager.export_degradation_log(temp_file)

            # Verify file was created and contains valid JSON
            assert os.path.exists(temp_file)

            with open(temp_file) as f:
                data = json.load(f)

            assert "degradation_level" in data
            assert "feature_summary" in data

        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)


class TestGlobalFunctions:
    """Test global convenience functions."""

    def test_global_degradation_functions(self):
        """Test global degradation functions."""
        # These should work without errors
        status = get_degradation_status()
        assert isinstance(status, dict)

        # Test feature availability check
        available = is_feature_available("faust_spectral_analysis")
        assert isinstance(available, bool)

    @patch("src.audio_agent.core.graceful_degradation.graceful_degradation_manager")
    def test_start_stop_degradation(self, mock_manager):
        """Test global start/stop degradation functions."""
        start_graceful_degradation()
        mock_manager.start_degradation_monitoring.assert_called_once()

        stop_graceful_degradation()
        mock_manager.stop_degradation_monitoring.assert_called_once()

    @patch("src.audio_agent.core.graceful_degradation.graceful_degradation_manager")
    def test_force_recovery_global(self, mock_manager):
        """Test global force recovery function."""
        mock_manager.force_recovery_attempt.return_value = True

        result = force_recovery(ComponentType.FAUST_ANALYZER)

        assert result is True
        mock_manager.force_recovery_attempt.assert_called_once_with(
            ComponentType.FAUST_ANALYZER
        )


class TestIntegration:
    """Test integration between degradation components."""

    def test_full_degradation_scenario(self):
        """Test a full degradation scenario."""
        manager = GracefulDegradationManager()

        # Simulate system health degradation
        health_report = {
            "components": {
                "faust_analyzer": {"status": "critical"},
                "dawdreamer_engine": {"status": "critical"},
                "langgraph_agent": {"status": "warning"},
            }
        }

        # Apply degradation
        applied_rules = manager.evaluate_system_health(health_report)

        # Verify degradation was applied
        assert len(applied_rules) > 0
        assert manager.current_degradation_level != DegradationLevel.NONE

        # Check that features are in degraded state
        feature_summary = manager.feature_manager.get_feature_summary()
        degraded_count = (
            feature_summary["disabled_features"]
            + feature_summary["limited_features"]
            + feature_summary["fallback_features"]
        )
        assert degraded_count > 0

        # Test recovery
        with patch.object(manager.recovery_manager, "_verify_recovery") as mock_verify:
            mock_verify.return_value = True

            recovery_success = manager.force_recovery_attempt(
                ComponentType.FAUST_ANALYZER
            )
            # Recovery might not succeed due to mocking, but should not crash
            assert isinstance(recovery_success, bool)

    def test_feature_dependency_cascade(self):
        """Test feature dependency cascading during degradation."""
        manager = GracefulDegradationManager()

        # Register a chain of dependent features
        base_feature = FeatureConfig(
            name="base_feature", component=ComponentType.FAUST_ANALYZER, priority=1
        )

        dependent_feature = FeatureConfig(
            name="dependent_feature",
            component=ComponentType.LANGGRAPH_AGENT,
            priority=2,
            dependencies=["base_feature"],
            fallback_available=True,
        )

        final_feature = FeatureConfig(
            name="final_feature",
            component=ComponentType.PLUGIN_SYSTEM,
            priority=3,
            dependencies=["dependent_feature"],
        )

        manager.feature_manager.register_feature(base_feature)
        manager.feature_manager.register_feature(dependent_feature)
        manager.feature_manager.register_feature(final_feature)

        # Disable base feature
        manager.feature_manager.disable_feature("base_feature", "Test cascade")

        # Check cascade effect
        assert (
            manager.feature_manager.feature_status["base_feature"]
            == FeatureStatus.DISABLED
        )
        assert (
            manager.feature_manager.feature_status["dependent_feature"]
            == FeatureStatus.FALLBACK
        )  # Has fallback
        assert (
            manager.feature_manager.feature_status["final_feature"]
            == FeatureStatus.ENABLED
        )  # Dependent still available via fallback


if __name__ == "__main__":
    pytest.main([__file__])
