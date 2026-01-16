"""
Service layer for telemetry upload operations.

Handles:
- Session creation/update
- Batch event insertion
- Metrics upsert (create or update)
- Transaction management
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from schillinger.models.sqlalchemy import (
    ParameterChangeEvent,
    UIControlMetrics,
    UIInteractionEvent,
    UISession,
)


class TelemetryUploadService:
    """
    Service for handling telemetry upload operations.

    Provides methods for:
    - Creating sessions
    - Inserting interaction events in batches
    - Upserting control metrics
    - Inserting parameter change events
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize the service with a database session.

        Args:
            session: Async SQLAlchemy session
        """
        self.session = session

    async def create_session(self, session_data: dict) -> UISession:
        """
        Create a new UI session.

        Args:
            session_data: Dictionary with session fields

        Returns:
            Created UISession instance
        """
        # Convert Unix timestamp (ms) to datetime
        start_time = self._ms_to_datetime(session_data["start_time"])
        end_time = (
            self._ms_to_datetime(session_data["end_time"])
            if session_data.get("end_time")
            else None
        )

        db_session = UISession(
            session_id=session_data["session_id"],
            start_time=start_time,
            end_time=end_time,
            time_to_first_sound_ms=session_data.get("time_to_first_sound_ms", 0),
            focus_changes=session_data.get("focus_changes", 0),
            control_switches_per_min=session_data.get("control_switches_per_min", 0.0),
            dead_interactions=session_data.get("dead_interactions", 0),
        )

        self.session.add(db_session)
        await self.session.flush()

        return db_session

    async def batch_insert_interaction_events(
        self,
        events_data: List[dict],
    ) -> List[UIInteractionEvent]:
        """
        Batch insert UI interaction events.

        Args:
            events_data: List of event dictionaries

        Returns:
            List of created UIInteractionEvent instances
        """
        if not events_data:
            return []

        events = [
            UIInteractionEvent(
                event_id=event_data["event_id"],
                session_id=event_data["session_id"],
                control_id=event_data["control_id"],
                delta=event_data["delta"],
                duration_ms=event_data["duration_ms"],
                reversed=int(event_data.get("reversed", False)),
                abandoned=int(event_data.get("abandoned", False)),
                timestamp_ms=event_data["timestamp_ms"],
            )
            for event_data in events_data
        ]

        self.session.add_all(events)
        await self.session.flush()

        return events

    async def upsert_control_metrics(
        self,
        metrics_data: List[dict],
    ) -> List[UIControlMetrics]:
        """
        Upsert control metrics (create or update).

        If metrics exist for the session/control combination, update them.
        Otherwise, create new metrics.

        Args:
            metrics_data: List of metrics dictionaries

        Returns:
            List of created/updated UIControlMetrics instances
        """
        if not metrics_data:
            return []

        result = []

        for metrics_dict in metrics_data:
            # Check if metrics already exist
            stmt = select(UIControlMetrics).where(
                UIControlMetrics.session_id == metrics_dict["session_id"],
                UIControlMetrics.control_id == metrics_dict["control_id"],
            )
            existing = await self.session.execute(stmt)
            existing_metrics = existing.scalar_one_or_none()

            if existing_metrics:
                # Update existing metrics
                existing_metrics.interaction_count = metrics_dict.get(
                    "interaction_count", 0
                )
                existing_metrics.avg_adjust_time_ms = metrics_dict.get(
                    "avg_adjust_time_ms", 0.0
                )
                existing_metrics.overshoot_rate = metrics_dict.get("overshoot_rate", 0.0)
                existing_metrics.micro_adjust_count = metrics_dict.get(
                    "micro_adjust_count", 0
                )
                existing_metrics.undo_rate = metrics_dict.get("undo_rate", 0.0)
                existing_metrics.abandon_rate = metrics_dict.get("abandon_rate", 0.0)
                result.append(existing_metrics)
            else:
                # Create new metrics
                new_metrics = UIControlMetrics(
                    session_id=metrics_dict["session_id"],
                    control_id=metrics_dict["control_id"],
                    interaction_count=metrics_dict.get("interaction_count", 0),
                    avg_adjust_time_ms=metrics_dict.get("avg_adjust_time_ms", 0.0),
                    overshoot_rate=metrics_dict.get("overshoot_rate", 0.0),
                    micro_adjust_count=metrics_dict.get("micro_adjust_count", 0),
                    undo_rate=metrics_dict.get("undo_rate", 0.0),
                    abandon_rate=metrics_dict.get("abandon_rate", 0.0),
                )
                self.session.add(new_metrics)
                result.append(new_metrics)

        await self.session.flush()
        return result

    async def batch_insert_parameter_events(
        self,
        events_data: List[dict],
    ) -> List[ParameterChangeEvent]:
        """
        Batch insert parameter change events.

        Args:
            events_data: List of event dictionaries

        Returns:
            List of created ParameterChangeEvent instances
        """
        if not events_data:
            return []

        events = [
            ParameterChangeEvent(
                event_id=event_data["event_id"],
                parameter_id=event_data["parameter_id"],
                previous_value=event_data["previous_value"],
                new_value=event_data["new_value"],
                delta=event_data["delta"],
                is_undo=int(event_data.get("is_undo", False)),
                duration_ms=event_data.get("duration_ms", 0),
                timestamp_ms=event_data["timestamp_ms"],
            )
            for event_data in events_data
        ]

        self.session.add_all(events)
        await self.session.flush()

        return events

    @staticmethod
    def _ms_to_datetime(timestamp_ms: int) -> Optional[datetime]:
        """
        Convert Unix timestamp (milliseconds) to datetime.

        Args:
            timestamp_ms: Unix timestamp in milliseconds

        Returns:
            datetime object or None if timestamp_ms is 0
        """
        if timestamp_ms == 0:
            return None

        return datetime.fromtimestamp(timestamp_ms / 1000.0)
