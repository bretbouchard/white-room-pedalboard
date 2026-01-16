"""
FastAPI routes for telemetry upload and retrieval.

Endpoints:
- POST /v1/telemetry/upload - Upload telemetry data (batch)
- GET /v1/telemetry/sessions - List sessions
- GET /v1/telemetry/sessions/{session_id} - Get session details
- GET /v1/telemetry/health - Health check
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from schillinger.api.v1.telemetry.models import (
    TelemetryUploadRequest,
    TelemetryUploadResponse,
    TelemetryUploadStats,
    UISessionCreate,
)
from schillinger.api.v1.telemetry.service import TelemetryUploadService
from schillinger.db.session import get_async_session

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


# ============================================================================
# Upload Endpoints
# ============================================================================


@router.post("/upload", response_model=TelemetryUploadResponse)
async def upload_telemetry(
    request: TelemetryUploadRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Upload telemetry data from Swift frontend or JUCE backend.

    Accepts batch uploads of:
    - UI sessions (session-level metrics)
    - UI interaction events (raw gesture data)
    - UI control metrics (per-control aggregates)
    - Parameter change events (JUCE audio thread data)

    Returns:
        Upload confirmation with statistics
    """
    service = TelemetryUploadService(session)
    stats = TelemetryUploadStats()

    try:
        # Process UI telemetry
        if request.ui_telemetry is not None:
            ui_telemetry = request.ui_telemetry

            # Create session if provided
            if ui_telemetry.session is not None:
                await service.create_session(ui_telemetry.session.model_dump())
                stats.sessions_created += 1

            # Insert interaction events
            if ui_telemetry.interaction_events:
                events = [
                    event.model_dump()
                    for event in ui_telemetry.interaction_events
                ]
                await service.batch_insert_interaction_events(events)
                stats.interaction_events_created += len(events)

            # Upsert control metrics
            if ui_telemetry.control_metrics:
                metrics = [
                    metric.model_dump()
                    for metric in ui_telemetry.control_metrics
                ]
                await service.upsert_control_metrics(metrics)
                stats.control_metrics_upserted += len(metrics)

        # Process parameter telemetry
        if request.parameter_telemetry is not None:
            events = [
                event.model_dump()
                for event in request.parameter_telemetry.events
            ]
            await service.batch_insert_parameter_events(events)
            stats.parameter_events_created += len(events)

        # Calculate total
        stats.total_records = (
            stats.sessions_created
            + stats.interaction_events_created
            + stats.control_metrics_upserted
            + stats.parameter_events_created
        )

        return TelemetryUploadResponse(
            success=True,
            message=f"Successfully uploaded {stats.total_records} telemetry records",
            stats=stats,
        )

    except Exception as e:
        # Rollback happens automatically via dependency injection
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload telemetry: {str(e)}",
        ) from e


@router.post(
    "/upload/ui",
    response_model=TelemetryUploadResponse,
    summary="Upload UI telemetry data",
)
async def upload_ui_telemetry(
    session_data: Optional[UISessionCreate] = None,
    interaction_events: List[dict] = [],
    control_metrics: List[dict] = [],
    session: AsyncSession = Depends(get_async_session),
):
    """
    Upload UI telemetry data (simplified endpoint).

    This is a convenience endpoint for uploading UI telemetry without
    needing to structure the full request body.
    """
    service = TelemetryUploadService(session)
    stats = TelemetryUploadStats()

    try:
        # Create session
        if session_data is not None:
            await service.create_session(session_data.model_dump())
            stats.sessions_created += 1

        # Insert events
        if interaction_events:
            await service.batch_insert_interaction_events(interaction_events)
            stats.interaction_events_created += len(interaction_events)

        # Upsert metrics
        if control_metrics:
            await service.upsert_control_metrics(control_metrics)
            stats.control_metrics_upserted += len(control_metrics)

        stats.total_records = (
            stats.sessions_created
            + stats.interaction_events_created
            + stats.control_metrics_upserted
        )

        return TelemetryUploadResponse(
            success=True,
            message=f"Successfully uploaded {stats.total_records} UI telemetry records",
            stats=stats,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload UI telemetry: {str(e)}",
        ) from e


# ============================================================================
# Query Endpoints
# ============================================================================


@router.get(
    "/sessions",
    summary="List telemetry sessions",
)
async def list_sessions(
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_async_session),
):
    """
    List telemetry sessions with pagination.

    Args:
        limit: Maximum number of sessions to return
        offset: Number of sessions to skip

    Returns:
        List of sessions
    """
    from sqlalchemy import select

    from schillinger.models.sqlalchemy import UISession

    stmt = select(UISession).order_by(UISession.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(stmt)
    sessions = result.scalars().all()

    return {
        "sessions": sessions,
        "count": len(sessions),
        "limit": limit,
        "offset": offset,
    }


@router.get(
    "/sessions/{session_id}",
    summary="Get session details",
)
async def get_session(
    session_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get detailed information about a specific session.

    Args:
        session_id: Session UUID

    Returns:
        Session details with interaction events and control metrics
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from schillinger.models.sqlalchemy import UISession

    stmt = (
        select(UISession)
        .where(UISession.session_id == session_id)
        .options(
            selectinload(UISession.interaction_events),
            selectinload(UISession.control_metrics),
        )
    )
    result = await session.execute(stmt)
    db_session = result.scalar_one_or_none()

    if db_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    return {
        "session": db_session,
        "interaction_events": db_session.interaction_events,
        "control_metrics": db_session.control_metrics,
    }


@router.get(
    "/sessions/{session_id}/events",
    summary="Get session interaction events",
)
async def get_session_events(
    session_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all interaction events for a specific session.

    Args:
        session_id: Session UUID

    Returns:
        List of interaction events
    """
    from sqlalchemy import select

    from schillinger.models.sqlalchemy import UIInteractionEvent

    # First check if session exists
    from schillinger.models.sqlalchemy import UISession

    session_check_stmt = select(UISession).where(UISession.session_id == session_id)
    session_check_result = await session.execute(session_check_stmt)
    if session_check_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    # Get events
    events_stmt = (
        select(UIInteractionEvent)
        .where(UIInteractionEvent.session_id == str(session_id))
        .order_by(UIInteractionEvent.timestamp_ms)
    )
    events_result = await session.execute(events_stmt)
    events = events_result.scalars().all()

    return events


@router.get(
    "/metrics/control",
    summary="Get aggregated control metrics",
)
async def get_control_metrics(
    limit: int = 20,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get aggregated metrics per control across all sessions.

    Args:
        limit: Maximum number of controls to return

    Returns:
        List of control metrics sorted by interaction count
    """
    from sqlalchemy import func, select

    from schillinger.models.sqlalchemy import UIControlMetrics

    # Aggregate metrics by control_id across all sessions
    stmt = (
        select(
            UIControlMetrics.control_id,
            func.sum(UIControlMetrics.interaction_count).label("total_interactions"),
            func.avg(UIControlMetrics.avg_adjust_time_ms).label("avg_duration_ms"),
            func.avg(UIControlMetrics.overshoot_rate).label("overshoot_rate"),
            func.avg(UIControlMetrics.abandon_rate).label("abandon_rate"),
            func.sum(UIControlMetrics.micro_adjust_count).label("total_micro_adjusts"),
            func.count().label("sessions_count"),
        )
        .group_by(UIControlMetrics.control_id)
        .order_by(func.sum(UIControlMetrics.interaction_count).desc())
        .limit(limit)
    )

    result = await session.execute(stmt)
    rows = result.all()

    metrics = []
    for row in rows:
        metrics.append({
            "control_id": row.control_id,
            "total_interactions": row.total_interactions,
            "avg_duration_ms": float(row.avg_duration_ms) if row.avg_duration_ms else 0,
            "avg_delta": 0,  # Would need to calculate from interaction events
            "overshoot_rate": float(row.overshoot_rate) if row.overshoot_rate else 0,
            "abandon_rate": float(row.abandon_rate) if row.abandon_rate else 0,
            "micro_adjust_rate": (
                float(row.total_micro_adjusts) / row.total_interactions
                if row.total_interactions > 0
                else 0
            ),
            "sessions_count": row.sessions_count,
        })

    return metrics


@router.get(
    "/dashboard/summary",
    summary="Get dashboard summary data",
)
async def get_dashboard_summary(
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get summary data for the telemetry dashboard.

    Returns:
        Dashboard summary including total sessions, interactions, averages,
        top controls, and recent sessions
    """
    from sqlalchemy import func, select

    from schillinger.models.sqlalchemy import UISession, UIControlMetrics

    # Total sessions
    sessions_count_stmt = select(func.count(UISession.session_id))
    sessions_count_result = await session.execute(sessions_count_stmt)
    total_sessions = sessions_count_result.scalar() or 0

    # Total interactions (sum from all control metrics)
    interactions_stmt = select(func.sum(UIControlMetrics.interaction_count))
    interactions_result = await session.execute(interactions_stmt)
    total_interactions = interactions_result.scalar() or 0

    # Average session duration (estimated from time_to_first_sound)
    duration_stmt = select(func.avg(UISession.time_to_first_sound_ms))
    duration_result = await session.execute(duration_stmt)
    avg_duration = duration_result.scalar() or 0

    # Average time to first sound
    first_sound_stmt = select(func.avg(UISession.time_to_first_sound_ms))
    first_sound_result = await session.execute(first_sound_stmt)
    avg_first_sound = first_sound_result.scalar() or 0

    # Top controls by interaction count
    top_controls_stmt = (
        select(
            UIControlMetrics.control_id,
            func.sum(UIControlMetrics.interaction_count).label("total_interactions"),
            func.avg(UIControlMetrics.avg_adjust_time_ms).label("avg_duration_ms"),
            func.avg(UIControlMetrics.overshoot_rate).label("overshoot_rate"),
            func.avg(UIControlMetrics.abandon_rate).label("abandon_rate"),
            func.sum(UIControlMetrics.micro_adjust_count).label("total_micro_adjusts"),
            func.count().label("sessions_count"),
        )
        .group_by(UIControlMetrics.control_id)
        .order_by(func.sum(UIControlMetrics.interaction_count).desc())
        .limit(10)
    )
    top_controls_result = await session.execute(top_controls_stmt)
    top_controls_rows = top_controls_result.all()

    top_controls = []
    for row in top_controls_rows:
        top_controls.append({
            "control_id": row.control_id,
            "total_interactions": row.total_interactions,
            "avg_duration_ms": float(row.avg_duration_ms) if row.avg_duration_ms else 0,
            "avg_delta": 0,
            "overshoot_rate": float(row.overshoot_rate) if row.overshoot_rate else 0,
            "abandon_rate": float(row.abandon_rate) if row.abandon_rate else 0,
            "micro_adjust_rate": (
                float(row.total_micro_adjusts) / row.total_interactions
                if row.total_interactions > 0
                else 0
            ),
            "sessions_count": row.sessions_count,
        })

    # Recent sessions
    recent_sessions_stmt = (
        select(UISession)
        .order_by(UISession.created_at.desc())
        .limit(10)
    )
    recent_sessions_result = await session.execute(recent_sessions_stmt)
    recent_sessions = recent_sessions_result.scalars().all()

    return {
        "total_sessions": total_sessions,
        "total_interactions": total_interactions,
        "avg_session_duration_ms": avg_duration,
        "avg_time_to_first_sound_ms": avg_first_sound,
        "top_controls": top_controls,
        "recent_sessions": recent_sessions,
    }


# ============================================================================
# Health Check
# ============================================================================


@router.get("/health", summary="Telemetry service health check")
async def health_check():
    """
    Health check endpoint for telemetry service.

    Returns:
        Health status
    """
    return {
        "status": "healthy",
        "service": "telemetry",
        "version": "1.0.0",
    }
