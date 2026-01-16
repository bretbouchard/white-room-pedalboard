"""
Data models for the Schillinger SDK.

This module defines all Pydantic models for request/response data structures.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator, ConfigDict


# ============================================================================
# Rhythm Models
# ============================================================================

class GeneratorProfile(BaseModel):
    """Profile of a rhythmic generator."""

    strikes: List[int] = Field(description="Strike positions within the cycle")
    period: int = Field(gt=0, description="Number of beats in the cycle")
    symmetry: Optional[float] = Field(None, ge=0.0, le=1.0, description="Symmetry score")
    density: float = Field(ge=0.0, le=1.0, description="Density of strikes")
    vector: Optional[List[int]] = Field(default=None, description="Interval vector")


class ResultantPattern(BaseModel):
    """Rhythmic resultant pattern."""

    generators: List[GeneratorProfile] = Field(description="Component generators")
    resultant: GeneratorProfile = Field(description="Combined resultant pattern")
    interference: List[int] = Field(default_factory=list, description="Interference points")
    balance: float = Field(ge=0.0, le=1.0, description="Balance score")


class RhythmicVariation(BaseModel):
    """Variation of a rhythmic pattern."""

    original: GeneratorProfile = Field(description="Original pattern")
    variation: GeneratorProfile = Field(description="Variation pattern")
    technique: str = Field(description="Variation technique applied")
    transformation: Dict[str, Any] = Field(default_factory=dict, description="Transformation details")


class PatternAnalysis(BaseModel):
    """Analysis of a rhythmic pattern."""

    profile: GeneratorProfile = Field(description="Pattern profile")
    generators: List[GeneratorProfile] = Field(description="Inferred generators")
    fit_quality: float = Field(ge=0.0, le=1.0, description="Quality of generator fit")
    complexity: float = Field(ge=0.0, le=1.0, description="Rhythmic complexity")
    classification: str = Field(description="Pattern classification")


# ============================================================================
# Harmony Models
# ============================================================================

class Chord(BaseModel):
    """Musical chord representation."""

    root: int = Field(ge=0, le=11, description="Root pitch class (0-11)")
    quality: str = Field(description="Chord quality (major, minor, etc.)")
    extensions: List[int] = Field(default_factory=list, description="Extension intervals")
    voicing: Optional[List[int]] = Field(None, description="Specific voicing")
    inversion: int = Field(default=0, ge=0, description="Chord inversion")

    @field_validator('quality')
    @classmethod
    def validate_quality(cls, v: str) -> str:
        """Validate chord quality."""
        valid_qualities = {'major', 'minor', 'diminished', 'augmented',
                          'dominant', 'half-diminished', 'sus2', 'sus4'}
        if v.lower() not in valid_qualities:
            raise ValueError(f"Invalid chord quality: {v}")
        return v.lower()


class HarmonicProgression(BaseModel):
    """Harmonic progression model."""

    chords: List[Chord] = Field(description="Chords in the progression")
    key: Optional[str] = Field(None, description="Key center")
    scale: str = Field(default="major", description="Scale type")
    functional_analysis: Optional[Dict[str, str]] = Field(None, description="Roman numeral analysis")
    tension_profile: Optional[List[float]] = Field(None, description="Tension over time")


class AxisPattern(BaseModel):
    """Schillinger harmonic axis pattern."""

    primary_axis: List[int] = Field(description="Primary axis intervals")
    secondary_axis: Optional[List[int]] = Field(None, description="Secondary axis")
    rotation: int = Field(default=0, ge=0, description="Rotation offset")
    tension_flow: List[float] = Field(description="Tension flow values")


class HarmonicResolution(BaseModel):
    """Resolution of harmonic tension."""

    chord: Chord = Field(description="Original chord")
    resolution: Chord = Field(description="Resolved chord")
    resolution_degree: float = Field(ge=0.0, le=1.0, description="Strength of resolution")
    voice_leading: Optional[Dict[str, List[int]]] = Field(None, description="Voice leading paths")


# ============================================================================
# Melody Models
# ============================================================================

class MelodicContour(BaseModel):
    """Melodic contour description."""

    contour: List[int] = Field(description="Contour intervals (up/down/unison)")
    peaks: List[int] = Field(description="Peak positions")
    valleys: List[int] = Field(description="Valley positions")
    range: int = Field(ge=0, description="Pitch range in semitones")
    centroid: float = Field(description="Melodic centroid")


class MelodicFragment(BaseModel):
    """Melodic fragment."""

    pitches: List[int] = Field(description="Pitch classes (0-11 with octave)")
    durations: List[float] = Field(description="Note durations (in beats)")
    contour: Optional[MelodicContour] = Field(None, description="Melodic contour")
    rhythm: Optional[GeneratorProfile] = Field(None, description="Rhythmic structure")


class MelodicVariation(BaseModel):
    """Variation of a melodic fragment."""

    original: MelodicFragment = Field(description="Original melody")
    variation: MelodicFragment = Field(description="Variation melody")
    technique: str = Field(description="Variation technique")
    transformation: Dict[str, Any] = Field(default_factory=dict, description="Transformation details")


class MelodicAnalysis(BaseModel):
    """Analysis of a melodic fragment."""

    fragment: MelodicFragment = Field(description="Analyzed fragment")
    contour: MelodicContour = Field(description="Contour analysis")
    structural_tones: List[int] = Field(description="Structural tone positions")
    ornamentation: List[int] = Field(description="Ornamentation positions")
    phrase_structure: Optional[Dict[str, Any]] = Field(None, description="Phrase boundaries")


# ============================================================================
# Composition Models
# ============================================================================

class CompositionMetadata(BaseModel):
    """Metadata for a composition."""

    title: str = Field(description="Composition title")
    key: Optional[str] = Field(None, description="Key")
    tempo: Optional[int] = Field(None, gt=0, description="Tempo in BPM")
    time_signature: Optional[str] = Field(None, description="Time signature")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")
    tags: List[str] = Field(default_factory=list, description="Descriptive tags")
    model_config = ConfigDict(use_enum_values=True)


class CompositionSection(BaseModel):
    """Section of a composition."""

    id: str = Field(description="Section identifier")
    name: str = Field(description="Section name")
    bars: int = Field(gt=0, description="Number of bars")
    melody: Optional[MelodicFragment] = Field(None, description="Melodic content")
    harmony: Optional[HarmonicProgression] = Field(None, description="Harmonic content")
    rhythm: Optional[ResultantPattern] = Field(None, description="Rhythmic content")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Additional properties")


class Composition(BaseModel):
    """Complete composition model."""

    id: str = Field(description="Composition identifier")
    metadata: CompositionMetadata = Field(description="Composition metadata")
    sections: List[CompositionSection] = Field(description="Composition sections")
    global_structure: Optional[Dict[str, Any]] = Field(None, description="Global form structure")
    analysis: Optional[Dict[str, Any]] = Field(None, description="Analysis results")


class UserEncoding(BaseModel):
    """Encoded user input."""

    encoding_type: str = Field(description="Type of encoding (e.g., 'contour', 'rhythm')")
    data: List[int] = Field(description="Encoded data")
    confidence: float = Field(ge=0.0, le=1.0, description="Encoding confidence")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class CompositionAnalysis(BaseModel):
    """Analysis results for a composition."""

    composition_id: str = Field(description="Analyzed composition ID")
    formal_structure: Dict[str, Any] = Field(description="Formal analysis")
    harmonic_analysis: Dict[str, Any] = Field(description="Harmonic analysis")
    melodic_analysis: Dict[str, Any] = Field(description="Melodic analysis")
    rhythmic_analysis: Dict[str, Any] = Field(description="Rhythmic analysis")
    coherence_score: float = Field(ge=0.0, le=1.0, description="Overall coherence")


# ============================================================================
# Request/Response Wrapper Models
# ============================================================================

class APIRequest(BaseModel):
    """Base API request model."""

    request_id: Optional[str] = Field(None, description="Unique request identifier")
    timestamp: datetime = Field(default_factory=datetime.now, description="Request timestamp")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Request parameters")


class APIResponse(BaseModel):
    """Base API response model."""

    request_id: str = Field(description="Corresponding request ID")
    timestamp: datetime = Field(description="Response timestamp")
    status: str = Field(description="Response status (success/error)")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")
    error: Optional[Dict[str, Any]] = Field(None, description="Error details if failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status value."""
        if v not in ('success', 'error', 'partial'):
            raise ValueError(f"Invalid status: {v}")
        return v


class BatchRequest(BaseModel):
    """Batch request for multiple operations."""

    requests: List[APIRequest] = Field(description="List of requests to batch")
    execution_order: str = Field(default="parallel", description="Execution order: parallel or sequential")
    stop_on_error: bool = Field(default=False, description="Stop on first error")


class BatchResponse(BaseModel):
    """Batch response for multiple operations."""

    responses: List[APIResponse] = Field(description="List of responses")
    total_count: int = Field(description="Total number of requests")
    success_count: int = Field(description="Number of successful requests")
    error_count: int = Field(description="Number of failed requests")
    execution_time: float = Field(ge=0.0, description="Total execution time in seconds")
