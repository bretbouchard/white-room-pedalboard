"""
Pydantic models for telemetry API requests and responses.

Request models:
- UISessionCreate: Session creation/upload
- UIInteractionEventCreate: Interaction event upload
- UIControlMetricsCreate: Control metrics upload
- ParameterChangeEventCreate: Parameter change event upload

Response models:
- TelemetryUploadResponse: Upload confirmation
- TelemetryBatchResponse: Batch upload status
"""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ============================================================================
# Request Models - UI Telemetry
# ============================================================================


class UISessionCreate(BaseModel):
    """Request model for creating/uploading a UI session."""

    session_id: uuid.UUID
    start_time: int = Field(..., description="Start time as Unix timestamp (ms)")
    end_time: Optional[int] = Field(None, description="End time as Unix timestamp (ms)")
    time_to_first_sound_ms: int = Field(0, ge=0)
    focus_changes: int = Field(0, ge=0)
    control_switches_per_min: float = Field(0.0, ge=0.0)
    dead_interactions: int = Field(0, ge=0)


class UIInteractionEventCreate(BaseModel):
    """Request model for uploading a UI interaction event."""

    event_id: uuid.UUID
    session_id: uuid.UUID
    control_id: str = Field(..., min_length=1, max_length=255)
    delta: float
    duration_ms: int = Field(..., ge=0)
    reversed: bool = False
    abandoned: bool = False
    timestamp_ms: int


class UIControlMetricsCreate(BaseModel):
    """Request model for uploading control metrics."""

    session_id: uuid.UUID
    control_id: str = Field(..., min_length=1, max_length=255)
    interaction_count: int = Field(0, ge=0)
    avg_adjust_time_ms: float = Field(0.0, ge=0.0)
    overshoot_rate: float = Field(0.0, ge=0.0, le=1.0)
    micro_adjust_count: int = Field(0, ge=0)
    undo_rate: float = Field(0.0, ge=0.0, le=1.0)
    abandon_rate: float = Field(0.0, ge=0.0, le=1.0)


# ============================================================================
# Request Models - Parameter Telemetry
# ============================================================================


class ParameterChangeEventCreate(BaseModel):
    """Request model for uploading a parameter change event."""

    event_id: uuid.UUID
    parameter_id: str = Field(..., min_length=1, max_length=255)
    previous_value: float
    new_value: float
    delta: float = Field(..., ge=0.0)
    is_undo: bool = False
    duration_ms: int = Field(0, ge=0)
    timestamp_ms: int


# ============================================================================
# Batch Request Models
# ============================================================================


class UITelemetryBatchUpload(BaseModel):
    """Batch upload request for UI telemetry data."""

    session: Optional[UISessionCreate] = None
    interaction_events: List[UIInteractionEventCreate] = Field(default_factory=list)
    control_metrics: List[UIControlMetricsCreate] = Field(default_factory=list)


class ParameterTelemetryBatchUpload(BaseModel):
    """Batch upload request for parameter telemetry data."""

    events: List[ParameterChangeEventCreate] = Field(..., min_items=1)


# ============================================================================
# Combined Upload Request
# ============================================================================


class TelemetryUploadRequest(BaseModel):
    """
    Combined telemetry upload request.

    Supports uploading both UI telemetry and parameter telemetry
    in a single request.
    """

    ui_telemetry: Optional[UITelemetryBatchUpload] = None
    parameter_telemetry: Optional[ParameterTelemetryBatchUpload] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "ui_telemetry": {
                        "session": {
                            "session_id": "123e4567-e89b-12d3-a456-426614174000",
                            "start_time": 1705123456789,
                            "time_to_first_sound_ms": 1250,
                            "focus_changes": 5,
                            "control_switches_per_min": 2.5,
                            "dead_interactions": 1,
                        },
                        "interaction_events": [
                            {
                                "event_id": "223e4567-e89b-12d3-a456-426614174001",
                                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                                "control_id": "filter.cutoff",
                                "delta": 0.25,
                                "duration_ms": 1500,
                                "reversed": True,
                                "abandoned": False,
                                "timestamp_ms": 1705123458000,
                            }
                        ],
                        "control_metrics": [
                            {
                                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                                "control_id": "filter.cutoff",
                                "interaction_count": 5,
                                "avg_adjust_time_ms": 1200.0,
                                "overshoot_rate": 0.4,
                                "micro_adjust_count": 2,
                                "undo_rate": 0.0,
                                "abandon_rate": 0.2,
                            }
                        ],
                    },
                    "parameter_telemetry": {
                        "events": [
                            {
                                "event_id": "323e4567-e89b-12d3-a456-426614174002",
                                "parameter_id": "op1_ratio",
                                "previous_value": 1.0,
                                "new_value": 1.5,
                                "delta": 0.5,
                                "is_undo": False,
                                "duration_ms": 0,
                                "timestamp_ms": 1705123460000,
                            }
                        ],
                    },
                }
            ]
        }
    }


# ============================================================================
# Response Models
# ============================================================================


class TelemetryUploadStats(BaseModel):
    """Statistics for telemetry upload."""

    sessions_created: int = 0
    interaction_events_created: int = 0
    control_metrics_upserted: int = 0
    parameter_events_created: int = 0
    total_records: int = 0


class TelemetryUploadResponse(BaseModel):
    """Response model for telemetry upload."""

    success: bool
    message: str
    stats: TelemetryUploadStats
    upload_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class TelemetryErrorResponse(BaseModel):
    """Response model for telemetry upload errors."""

    success: bool = False
    message: str
    errors: List[str] = Field(default_factory=list)
    upload_id: Optional[uuid.UUID] = None


# ============================================================================
# Query Parameters
# ============================================================================


class TelemetryQueryParams(BaseModel):
    """Query parameters for telemetry retrieval."""

    session_id: Optional[uuid.UUID] = None
    control_id: Optional[str] = None
    parameter_id: Optional[str] = None
    limit: int = Field(100, ge=1, le=1000)
    offset: int = Field(0, ge=0)
    start_time: Optional[int] = None
    end_time: Optional[int] = None
