"""Tests for Real-Time Feedback Loop and Learning System."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.audio_agent.core.feedback_loop import (
    AnalysisComparison,
    ConvergenceCriteria,
    FeedbackLoop,
    FeedbackLoopConfig,
    FeedbackLoopState,
)
from src.audio_agent.core.real_time_processing import RealTimeProcessor
from src.audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)


@pytest.fixture
def mock_processor():
    """Create a mock real-time processor."""
    processor = Mock(spec=RealTimeProcessor)
    processor.is_processing.return_value = True
    processor.get_all_analyzer_results.return_value = {
        "analyzer_1": {
            "spectral_centroid": 2000.0,
            "spectral_rolloff": 8000.0,
            "rms_level": -20.0,
            "peak_level": -10.0,
            "stereo_width": 0.6,
            "phase_correlation": 0.8,
        }
    }
    return processor


@pytest.fixture
def basic_composition_context():
    """Create a basic composition context for testing."""
    return CompositionContext(
        tempo=120.0,
        key_signature=MusicalKey.C_MAJOR,
        time_signature=TimeSignature(numerator=4, denominator=4),
        style=MusicalStyle.POP,
        title="Test Composition",
    )


@pytest.fixture
def feedback_loop(mock_processor, basic_composition_context):
    """Create a feedback loop for testing."""
    config = FeedbackLoopConfig(
        analysis_interval_ms=100,  # Fast for testing
        convergence_criteria=ConvergenceCriteria(
            min_improvement_threshold=0.01,
            max_iterations=5,
            target_improvement_score=0.8,
            consecutive_no_improvement=2,
        ),
    )
    return FeedbackLoop(
        processor=mock_processor,
        composition_context=basic_composition_context,
        config=config,
    )


class TestFeedbackLoop:
    """Tests for FeedbackLoop."""

    def test_initialization(
        self, feedback_loop, mock_processor, basic_composition_context
    ):
        """Test feedback loop initialization."""
        assert feedback_loop.processor == mock_processor
        assert feedback_loop.composition_context == basic_composition_context
        assert feedback_loop.state == FeedbackLoopState.IDLE
        assert not feedback_loop.is_running
        assert feedback_loop.iteration_count == 0
        assert len(feedback_loop.analysis_history) == 0

    def test_start_stop(self, feedback_loop, mock_processor):
        """Test starting and stopping the feedback loop."""
        # Start the loop
        result = feedback_loop.start()
        assert result is True
        assert feedback_loop.is_running
        # State should be either ANALYZING or ADJUSTING (due to threading timing)
        assert feedback_loop.state in [
            FeedbackLoopState.ANALYZING,
            FeedbackLoopState.ADJUSTING,
        ]

        # Stop the loop
        result = feedback_loop.stop()
        assert result is True
        assert not feedback_loop.is_running
        assert feedback_loop.state == FeedbackLoopState.IDLE

    def test_start_when_processor_not_running(self, feedback_loop, mock_processor):
        """Test starting when processor is not running."""
        mock_processor.is_processing.return_value = False
        result = feedback_loop.start()
        assert result is False
        assert not feedback_loop.is_running

    def test_manual_override(self, feedback_loop):
        """Test manual override functionality."""
        # Enable manual override
        result = feedback_loop.set_manual_override(True)
        assert result is True
        assert feedback_loop.state == FeedbackLoopState.MANUAL_OVERRIDE

        # Disable manual override
        result = feedback_loop.set_manual_override(False)
        assert result is True
        assert feedback_loop.state == FeedbackLoopState.ANALYZING

    def test_reset(self, feedback_loop):
        """Test resetting the feedback loop."""
        # Set some state
        feedback_loop._state = FeedbackLoopState.CONVERGED
        feedback_loop._iteration_count = 5
        feedback_loop._analysis_history = [AsyncMock()]

        # Reset
        result = feedback_loop.reset()
        assert result is True
        assert feedback_loop.state == FeedbackLoopState.IDLE
        assert feedback_loop.iteration_count == 0
        assert len(feedback_loop.analysis_history) == 0

    def test_analyze_current_audio(self, feedback_loop, mock_processor):
        """Test analyzing current audio."""
        # Setup mock analyzer results
        mock_processor.get_all_analyzer_results.return_value = {
            "analyzer_1": {
                "spectral_centroid": 2000.0,
                "spectral_rolloff": 8000.0,
                "band_energy_ratio": {"low": 0.3, "mid": 0.4, "high": 0.3},
            },
            "analyzer_2": {
                "rms_level": -20.0,
                "peak_level": -10.0,
                "transient_density": 0.7,
            },
            "analyzer_3": {
                "stereo_width": 0.6,
                "phase_correlation": 0.8,
                "panning_balance": 0.1,
            },
        }

        # Analyze audio
        results = feedback_loop._analyze_current_audio()

        # Check results
        assert "spectral_balance" in results
        assert "dynamic_range" in results
        assert "stereo_width" in results

        # Check spectral balance
        assert "low_balance" in results["spectral_balance"]
        assert "mid_balance" in results["spectral_balance"]
        assert "high_balance" in results["spectral_balance"]

        # Check dynamic range
        assert "peak_level" in results["dynamic_range"]
        assert "rms_level" in results["dynamic_range"]
        assert "dynamic_range" in results["dynamic_range"]
        assert results["dynamic_range"]["dynamic_range"] == 10.0  # peak - rms

        # Check stereo width
        assert "width" in results["stereo_width"]
        assert "correlation" in results["stereo_width"]
        assert results["stereo_width"]["width"] == 0.6

    def test_compare_analysis(self, feedback_loop):
        """Test comparing analysis results."""
        # Create before and after analysis
        before = {
            "spectral_balance": {
                "low_balance": 0.3,
                "mid_balance": 0.4,
                "high_balance": 0.3,
            },
            "dynamic_range": {
                "peak_level": -10.0,
                "rms_level": -20.0,
                "dynamic_range": 10.0,
            },
            "stereo_width": {"width": 0.5, "correlation": 0.8},
        }

        after = {
            "spectral_balance": {
                "low_balance": 0.6,  # Closer to target (0.7)
                "mid_balance": 0.6,  # Closer to target (0.7)
                "high_balance": 0.6,  # Closer to target (0.7)
            },
            "dynamic_range": {
                "peak_level": -8.0,
                "rms_level": -20.0,
                "dynamic_range": 12.0,  # Exactly at target
            },
            "stereo_width": {
                "width": 0.7,  # Exactly at target
                "correlation": 0.9,  # Better correlation
            },
        }

        # Compare
        comparison = feedback_loop._compare_analysis(before, after)

        # Check comparison
        assert isinstance(comparison, AnalysisComparison)
        assert comparison.before_analysis == before
        assert comparison.after_analysis == after
        assert len(comparison.improvements) > 0
        assert comparison.overall_improvement > 0.0

    def test_check_convergence(self, feedback_loop):
        """Test convergence detection."""
        # Create comparison with high improvement score
        high_improvement = AnalysisComparison(
            before_analysis={},
            after_analysis={},
            improvements={"spectral_balance": 0.9},
            regressions={},
            overall_improvement=0.9,  # Above target (0.8)
        )

        # Check convergence with high improvement
        assert feedback_loop._check_convergence(high_improvement) is True

        # Create comparison with low improvement score
        low_improvement = AnalysisComparison(
            before_analysis={},
            after_analysis={},
            improvements={"spectral_balance": 0.1},
            regressions={},
            overall_improvement=0.005,  # Below threshold (0.01)
        )

        # Reset consecutive counter
        feedback_loop._consecutive_no_improvement = 0

        # First check should not converge
        assert feedback_loop._check_convergence(low_improvement) is False
        assert feedback_loop._consecutive_no_improvement == 1

        # Second check should converge (consecutive_no_improvement = 2)
        assert feedback_loop._check_convergence(low_improvement) is True
        assert feedback_loop._consecutive_no_improvement == 2

    @patch("threading.Thread")
    def test_feedback_loop_thread(self, mock_thread, feedback_loop):
        """Test feedback loop thread creation."""
        # Start the loop
        feedback_loop.start()

        # Check thread created and started
        mock_thread.assert_called_once()
        mock_thread.return_value.start.assert_called_once()

    def test_perform_iteration(self, feedback_loop):
        """Test performing one iteration."""
        # Mock methods
        feedback_loop._analyze_current_audio = Mock(return_value={"test": "analysis"})
        feedback_loop._compare_analysis = Mock(
            return_value=AnalysisComparison(
                before_analysis={},
                after_analysis={},
                improvements={},
                regressions={},
                overall_improvement=0.1,
            )
        )
        feedback_loop._check_convergence = Mock(return_value=False)
        feedback_loop._apply_adjustments = Mock()

        # Perform iteration
        feedback_loop._perform_iteration()

        # Check methods called
        feedback_loop._analyze_current_audio.assert_called_once()
        feedback_loop._compare_analysis.assert_called_once()
        feedback_loop._check_convergence.assert_called_once()
        feedback_loop._apply_adjustments.assert_called_once()

        # Check state updated
        assert feedback_loop._iteration_count == 1
        assert len(feedback_loop._analysis_history) == 1

    def test_perform_iteration_converged(self, feedback_loop):
        """Test performing iteration with convergence."""
        # Mock methods
        feedback_loop._analyze_current_audio = Mock(return_value={"test": "analysis"})
        feedback_loop._compare_analysis = Mock(
            return_value=AnalysisComparison(
                before_analysis={},
                after_analysis={},
                improvements={},
                regressions={},
                overall_improvement=0.1,
            )
        )
        feedback_loop._check_convergence = Mock(return_value=True)  # Converged
        feedback_loop._apply_adjustments = Mock()

        # Set running state
        feedback_loop._is_running = True

        # Perform iteration
        feedback_loop._perform_iteration()

        # Check methods called
        feedback_loop._analyze_current_audio.assert_called_once()
        feedback_loop._compare_analysis.assert_called_once()
        feedback_loop._check_convergence.assert_called_once()
        feedback_loop._apply_adjustments.assert_not_called()  # Should not be called

        # Check state updated
        assert feedback_loop.state == FeedbackLoopState.CONVERGED
        assert not feedback_loop.is_running

    def test_calculate_overall_improvement(self, feedback_loop):
        """Test calculating overall improvement score."""
        # Empty improvements and regressions
        assert feedback_loop._calculate_overall_improvement({}, {}) == 0.0

        # Only improvements
        improvements = {"spectral_balance": 0.5, "dynamic_range": 0.3}
        score = feedback_loop._calculate_overall_improvement(improvements, {})
        assert score > 0.0

        # Only regressions
        regressions = {"spectral_balance": 0.5, "dynamic_range": 0.3}
        score = feedback_loop._calculate_overall_improvement({}, regressions)
        assert score < 0.0

        # Both improvements and regressions
        score = feedback_loop._calculate_overall_improvement(
            {"spectral_balance": 0.7}, {"dynamic_range": 0.3}
        )
        assert score > 0.0  # Net positive

        # Equal improvements and regressions
        score = feedback_loop._calculate_overall_improvement(
            {"spectral_balance": 0.5}, {"dynamic_range": 0.5}
        )
        assert -0.1 < score < 0.1  # Close to zero

    @patch(
        "src.audio_agent.core.composition_aware_mixing.CompositionAwareMixingEngine.create_mixing_plan"
    )
    def test_apply_adjustments(self, mock_create_plan, feedback_loop):
        """Test applying adjustments."""
        # Create mock mixing plan
        mock_plan = Mock()
        mock_plan.sorted_actions = [
            Mock(parameter="eq_settings", reasoning="Test EQ"),
            Mock(parameter="compression", reasoning="Test compression"),
        ]
        mock_create_plan.return_value = mock_plan

        # Mock apply_mixing_action
        feedback_loop._apply_mixing_action = Mock()

        # Apply adjustments
        comparison = AnalysisComparison(
            before_analysis={},
            after_analysis={},
            improvements={},
            regressions={},
            overall_improvement=0.1,
        )
        feedback_loop._apply_adjustments(comparison)

        # Check methods called
        mock_create_plan.assert_called_once()
        assert feedback_loop._apply_mixing_action.call_count == 2

    def test_integration(self, feedback_loop, mock_processor):
        """Test integration of feedback loop components."""
        # Setup mock analyzer results that improve over time
        mock_results = [
            # Initial state
            {
                "analyzer_1": {
                    "spectral_centroid": 1500.0,
                    "spectral_rolloff": 6000.0,
                    "band_energy_ratio": {"low": 0.2, "mid": 0.3, "high": 0.5},
                    "rms_level": -25.0,
                    "peak_level": -10.0,
                    "stereo_width": 0.4,
                }
            },
            # Improved state
            {
                "analyzer_1": {
                    "spectral_centroid": 2000.0,
                    "spectral_rolloff": 7000.0,
                    "band_energy_ratio": {"low": 0.3, "mid": 0.4, "high": 0.3},
                    "rms_level": -20.0,
                    "peak_level": -8.0,
                    "stereo_width": 0.6,
                }
            },
            # Further improved state
            {
                "analyzer_1": {
                    "spectral_centroid": 2500.0,
                    "spectral_rolloff": 8000.0,
                    "band_energy_ratio": {"low": 0.4, "mid": 0.4, "high": 0.2},
                    "rms_level": -18.0,
                    "peak_level": -6.0,
                    "stereo_width": 0.7,
                }
            },
        ]

        # Setup mock to return different results on each call
        mock_processor.get_all_analyzer_results.side_effect = mock_results

        # Mock apply_adjustments to avoid actual processing
        feedback_loop._apply_adjustments = Mock()

        # Run a few iterations manually
        feedback_loop._perform_iteration()  # First iteration
        assert feedback_loop._iteration_count == 1
        assert len(feedback_loop._analysis_history) == 1

        feedback_loop._perform_iteration()  # Second iteration
        assert feedback_loop._iteration_count == 2
        assert len(feedback_loop._analysis_history) == 2

        # Check that improvement is positive
        assert feedback_loop._analysis_history[-1].overall_improvement > 0.0
