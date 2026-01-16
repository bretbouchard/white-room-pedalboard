"""
Minimal API smoke tests to verify the FastAPI app boots and core
public endpoints respond without requiring external services.
"""

import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    # Ensure we have a Clerk secret set so app initializes auth service,
    # but we only hit publicly-available endpoints here.
    os.environ.setdefault("CLERK_SECRET_KEY", "test_secret_key")
    from audio_agent.main import app

    with TestClient(app) as c:
        yield c


def test_health_endpoint(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert data["service"] == "audio-agent"
    assert "components" in data


def test_sync_status_endpoint(client: TestClient):
    r = client.get("/api/v1/sync-status")
    # This endpoint is configured as public via middleware exclusions
    assert r.status_code == 200
    data = r.json()
    assert "local_engine" in data
    assert "remote_sync" in data
