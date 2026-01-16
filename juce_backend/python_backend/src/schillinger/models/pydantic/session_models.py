"""
Pydantic models for session management.
"""

from datetime import datetime
from typing import List, Optional, Tuple

from pydantic import BaseModel, Field


class TransportState(BaseModel):
    """Transport state model."""

    is_playing: bool = False
    is_recording: bool = False
    position: float = 0.0  # in seconds
    loop_start: Optional[float] = None
    loop_end: Optional[float] = None
    tempo: float = 120.0
    time_signature: Tuple[int, int] = (4, 4)


class Note(BaseModel):
    """Musical note model."""

    pitch: int  # MIDI note number
    velocity: int = Field(ge=0, le=127, default=64)
    start_time: float  # in seconds
    duration: float  # in seconds
    channel: int = Field(ge=0, le=15, default=0)


class Chord(BaseModel):
    """Musical chord model."""

    notes: List[int]  # MIDI note numbers
    root: int  # Root note MIDI number
    chord_type: str  # e.g., "major", "minor", "dominant7"
    start_time: float
    duration: float
    inversion: int = 0


class RhythmPattern(BaseModel):
    """Rhythm pattern model."""

    pattern: List[float]  # Rhythmic values in beats
    duration: float  # Total duration in beats
    swing: float = Field(ge=0.0, le=1.0, default=0.0)
    velocity_pattern: Optional[List[int]] = None


class FormStructure(BaseModel):
    """Musical form structure."""

    sections: List[str]  # e.g., ["A", "B", "A", "C"]
    section_lengths: List[float]  # Length of each section in bars
    repeats: dict = {}  # Section repeat patterns


class CompositionMetadata(BaseModel):
    """Composition metadata."""

    title: Optional[str] = None
    composer: Optional[str] = None
    genre: Optional[str] = None
    key_signature: str = "C"  # e.g., "C", "Am", "F#"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []


class CompositionData(BaseModel):
    """Composition data model."""

    notes: List[Note] = []
    chords: List[Chord] = []
    rhythms: List[RhythmPattern] = []
    form: Optional[FormStructure] = None
    metadata: CompositionMetadata = Field(default_factory=CompositionMetadata)


class SessionModel(BaseModel):
    """Main session model."""

    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Musical state
    tempo: float = 120.0
    time_signature: Tuple[int, int] = (4, 4)
    key_signature: str = "C"

    # Data
    composition_data: CompositionData = Field(default_factory=CompositionData)
    transport_state: TransportState = Field(default_factory=TransportState)

    # Metadata
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    is_public: bool = False

    # JUCE sync
    last_sync_with_juce: Optional[datetime] = None
    juce_connected: bool = False


class SessionUpdate(BaseModel):
    """Session update model for partial updates."""

    name: Optional[str] = None
    description: Optional[str] = None
    tempo: Optional[float] = None
    time_signature: Optional[Tuple[int, int]] = None
    key_signature: Optional[str] = None
    composition_data: Optional[CompositionData] = None
    transport_state: Optional[TransportState] = None
    is_public: Optional[bool] = None


class SessionCreate(BaseModel):
    """Session creation model."""

    name: str
    description: Optional[str] = None
    tempo: float = 120.0
    time_signature: Tuple[int, int] = (4, 4)
    key_signature: str = "C"
    is_public: bool = False
    project_id: Optional[str] = None


class SessionList(BaseModel):
    """Session list response model."""

    sessions: List[SessionModel]
    total: int
    page: int
    per_page: int