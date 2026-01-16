"""
SQLAlchemy models for UI telemetry.

Models:
- UISession: Session-level metrics (time to first sound, focus changes, etc.)
- UIInteractionEvent: Raw interaction events from Swift UI gestures
- UIControlMetrics: Aggregated per-control metrics

Data model specification:
plans/ui-telemetry-constraints-testing/data-model.md
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from schillinger.models.sqlalchemy.base import BaseModel


class UISession(BaseModel):
    """
    Represents a single user session from app launch to termination.

    Session-level metrics:
    - time_to_first_sound_ms: Milliseconds from launch to audio output
    - focus_changes: Number of focus movements in session
    - control_switches_per_min: Context switches per minute
    - dead_interactions: Input with no audible result

    State transitions:
    [Active] -> [Ended] (on app background/quit)
    """

    __tablename__ = "ui_sessions"

    # Session identifier (matches UISessionTracker.sessionID in Swift)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True,
    )

    # Session timing
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    end_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Session metrics
    time_to_first_sound_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    focus_changes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    control_switches_per_min: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    dead_interactions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    # Relationships
    interaction_events: Mapped[list["UIInteractionEvent"]] = relationship(
        "UIInteractionEvent",
        back_populates="session",
        cascade="all, delete-orphan",
    )

    control_metrics: Mapped[list["UIControlMetrics"]] = relationship(
        "UIControlMetrics",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class UIInteractionEvent(BaseModel):
    """
    Raw interaction event captured from Swift UI gesture layer.

    Captures:
    - delta: Parameter change magnitude
    - duration_ms: Interaction duration
    - reversed: User reversed direction during interaction (overshoot)
    - abandoned: Focus lost before commit

    Relationships:
    - Belongs to: UISession (many-to-one)
    - Aggregates to: UIControlMetrics (many-to-one)
    """

    __tablename__ = "ui_interaction_events"

    # Event identifier (matches UIInteractionEvent.eventID in Swift)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True,
    )

    # Foreign key to session
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ui_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Control identifier (e.g., "filter.cutoff", "song:tempo")
    control_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    # Interaction data
    delta: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    duration_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    reversed: Mapped[bool] = mapped_column(
        # Using Integer for boolean compatibility
        Integer,
        nullable=False,
        default=0,
    )

    abandoned: Mapped[bool] = mapped_column(
        # Using Integer for boolean compatibility
        Integer,
        nullable=False,
        default=0,
    )

    # Event timestamp (Unix ms)
    timestamp_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # Relationships
    session: Mapped["UISession"] = relationship(
        "UISession",
        back_populates="interaction_events",
    )


class UIControlMetrics(BaseModel):
    """
    Aggregated metrics per control, computed from raw interaction events.

    Metrics:
    - interaction_count: Total number of interactions
    - avg_adjust_time_ms: Mean duration of adjustments
    - overshoot_rate: Reversals / total interactions (0-1)
    - micro_adjust_count: Tiny corrections (< threshold)
    - undo_rate: Undos / total interactions (0-1)
    - abandon_rate: Focus lost mid-adjustment / total (0-1)

    Computed from:
    - UIInteractionEvent records for same control_id
    """

    __tablename__ = "ui_control_metrics"

    # Foreign key to session
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ui_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Control identifier
    control_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    # Metrics
    interaction_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    avg_adjust_time_ms: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    overshoot_rate: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    micro_adjust_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    undo_rate: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    abandon_rate: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    # Relationships
    session: Mapped["UISession"] = relationship(
        "UISession",
        back_populates="control_metrics",
    )
