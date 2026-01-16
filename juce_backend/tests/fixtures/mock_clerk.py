"""Mock Clerk authentication for testing."""

import time
from typing import Any

from src.audio_agent.auth.clerk_auth import (
    ClerkAuthenticator,
    ClerkConfig,
    ClerkSession,
    ClerkUser,
)


class MockClerkUser(ClerkUser):
    """Mock Clerk user for testing."""

    def __init__(self, **data):
        super().__init__(**data)


class MockClerkSession(ClerkSession):
    """Mock Clerk session for testing."""

    def __init__(self, **data):
        super().__init__(**data)


class MockClerkAuthenticator(ClerkAuthenticator):
    """Mock Clerk authenticator for testing."""

    def __init__(self, config: ClerkConfig):
        super().__init__(config)
        self.mock_users: dict[str, MockClerkUser] = {
            "user_test123": MockClerkUser(
                id="user_test123",
                email_addresses=[
                    {"email_address": "test@example.com", "id": "email123"}
                ],
                username="testuser",
                first_name="Test",
                last_name="User",
                image_url=None,
                created_at=int(time.time()),
                updated_at=int(time.time()),
            )
        }
        self.mock_sessions: dict[str, MockClerkSession] = {}

    async def verify_session_token(self, session_token: str) -> MockClerkSession:
        """Mock session verification for testing."""
        # Return a mock session for any valid token
        if session_token and not session_token.startswith("invalid"):
            if session_token not in self.mock_sessions:
                current_time = int(time.time())
                session = MockClerkSession(
                    id="session_123",
                    user_id="user_test123",
                    status="active",
                    expire_at=current_time + 3600,  # 1 hour from now
                    abandon_at=current_time + 7200,  # 2 hours from now
                    created_at=current_time,
                    updated_at=current_time,
                )
                self.mock_sessions[session_token] = session

            return self.mock_sessions[session_token]
        else:
            from src.audio_agent.auth.exceptions import AuthenticationError

            raise AuthenticationError(
                "Session verification failed: Invalid token for testing"
            )

    async def get_user(self, user_id: str) -> MockClerkUser:
        """Mock get user for testing."""
        if user_id in self.mock_users:
            return self.mock_users[user_id]
        else:
            from src.audio_agent.auth.exceptions import UserNotFoundError

            raise UserNotFoundError(user_id)

    async def _get_jwks(self) -> dict[str, Any]:
        """Mock JWKS response for testing."""
        return {
            "keys": [
                {
                    "kid": "test_kid",
                    "kty": "RSA",
                    "use": "sig",
                    "alg": "RS256",
                    "n": "test_n",
                    "e": "AQAB",
                }
            ]
        }

    async def _get_session(self, session_id: str) -> dict[str, Any]:
        """Mock get session response for testing."""
        # Find session by ID
        for session in self.mock_sessions.values():
            if session.id == session_id:
                return {
                    "id": session.id,
                    "user_id": session.user_id,
                    "status": session.status,
                    "expire_at": session.expire_at,
                    "abandon_at": session.abandon_at,
                    "created_at": session.created_at,
                    "updated_at": session.updated_at,
                }

        raise Exception("Session not found")

    def add_mock_user(self, user_id: str, user_data: dict[str, Any]):
        """Add a mock user for testing."""
        self.mock_users[user_id] = MockClerkUser(**user_data)

    def add_mock_session(self, session_token: str, session_data: dict[str, Any]):
        """Add a mock session for testing."""
        self.mock_sessions[session_token] = MockClerkSession(**session_data)
