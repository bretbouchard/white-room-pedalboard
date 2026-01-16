from unittest.mock import AsyncMock

from src.audio_agent.api.transformation_api import (
    TransformationRequest,
    TransformationResult,
    TransformationType,
)
from src.audio_agent.models.audio import AudioAnalysis
from src.audio_agent.models.composition import (
    CompositionContext,
    MusicalKey,
    MusicalStyle,
    TimeSignature,
)


def test_transformation_request_creation():
    """Tests basic creation of TransformationRequest."""
    req = TransformationRequest(transformation=TransformationType.COMPOSITION_ANALYSIS)
    assert req.transformation == TransformationType.COMPOSITION_ANALYSIS
    assert req.composition_context is None
    assert req.audio_analysis is None
    assert req.user_preferences is None
    assert req.tracks is None
    assert req.processor_type is None
    assert req.parameters is None


def test_transformation_request_with_context():
    """Tests TransformationRequest with a CompositionContext."""
    context = CompositionContext(
        tempo=120,
        time_signature=TimeSignature(numerator=4, denominator=4),
        key_signature=MusicalKey.C_MAJOR,
        style=MusicalStyle.POP,
    )
    req = TransformationRequest(
        transformation=TransformationType.COMPOSITION_ANALYSIS,
        composition_context=context,
    )
    assert req.composition_context == context


def test_transformation_request_with_audio_analysis():
    """Tests TransformationRequest with an AudioAnalysis."""
    analysis = AsyncMock(spec=AudioAnalysis)
    req = TransformationRequest(
        transformation=TransformationType.EQ_RECOMMENDATION,
        audio_analysis=analysis,
    )
    assert req.audio_analysis == analysis


def test_transformation_result_creation():
    """Tests basic creation of TransformationResult."""
    res = TransformationResult(
        success=True,
        result={"foo": "bar"},
        transformation_type=TransformationType.COMPOSITION_ANALYSIS,
        metadata={},
    )
    assert res.success is True
    assert res.result == {"foo": "bar"}
    assert res.transformation_type == TransformationType.COMPOSITION_ANALYSIS
    assert res.metadata == {}
    assert res.error is None


def test_transformation_result_failure():
    """Tests a failed TransformationResult."""
    res = TransformationResult(
        success=False,
        result=None,
        transformation_type=TransformationType.COMPOSITION_ANALYSIS,
        metadata={},
        error="Something went wrong",
    )
    assert res.success is False
    assert res.result is None
    assert res.error == "Something went wrong"
