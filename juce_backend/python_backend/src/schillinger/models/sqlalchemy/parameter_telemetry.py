"""
SQLAlchemy model for JUCE parameter change telemetry.

Model:
- ParameterChangeEvent: Parameter changes captured from JUCE audio thread

Data model specification:
plans/ui-telemetry-constraints-testing/data-model.md
"""

import uuid
from typing import Optional

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from schillinger.models.sqlalchemy.base import BaseModel


class ParameterChangeEvent(BaseModel):
    """
    Parameter change captured from JUCE audio thread (safe).

    Captured from JUCE ParameterTelemetryRecorder and queued via:
    - Audio thread: parameterChanged() callback queues event
    - Message thread: flushEvents() serializes to JSONL

    Thread safety:
    - Queued from audio thread (lock-free)
    - Flushed from message thread
    - Serialized to JSONL on message thread

    Fields:
    - event_id: Unique event identifier (UUID v4)
    - parameter_id: JUCE parameter identifier
    - previous_value: Value before change
    - new_value: Value after change
    - delta: Absolute change magnitude
    - is_undo: Change is from undo operation
    - duration_ms: Time from first change to settle
    - timestamp_ms: Unix timestamp (ms)
    """

    __tablename__ = "parameter_change_events"

    # Event identifier (matches ParameterChangeEvent.eventID in JUCE)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True,
    )

    # Parameter identifier (e.g., "op1_ratio", "masterVolume")
    parameter_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    # Parameter values
    previous_value: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    new_value: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    # Computed delta (absolute change)
    delta: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    # Undo flag
    is_undo: Mapped[bool] = mapped_column(
        # Using Integer for boolean compatibility
        Integer,
        nullable=False,
        default=0,
    )

    # Duration of adjustment (ms)
    # - 0 for instantaneous changes
    # - >0 for continuous adjustments
    duration_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    # Event timestamp (Unix ms)
    timestamp_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )
