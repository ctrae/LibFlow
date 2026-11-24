import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx
import pytest

from app.core.config import Settings
from app.infrastructure.supabase_repository import SupabaseLibraryRepository
from app.library.errors import SessionNotFoundError


class SupabaseMockTransport(httpx.AsyncBaseTransport):
    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []
        self.session_id = str(uuid4())
        self.staff_id = str(uuid4())
        self.student_id = str(uuid4())

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.path == "/auth/v1/user":
            payload = {
                "id": self.staff_id,
                "email": "staff@mymona.uwi.edu",
                "user_metadata": {"full_name": "Staff Example"},
            }
        elif request.url.path == "/rest/v1/users":
            payload = [
                {
                    "user_id": self.staff_id,
                    "email": "staff@mymona.uwi.edu",
                    "full_name": "Staff Example",
                    "user_type": "LibraryStaff",
                    "is_approved": True,
                }
            ]
        elif request.url.path == "/rest/v1/library_sessions":
            now = datetime.now(timezone.utc)
            payload = [
                {
                    "id": self.session_id,
                    "user_id": self.student_id,
                    "name": "Student Example",
                    "email": "student@mymona.uwi.edu",
                    "student_id": "12345678",
                    "short_code": "AB12",
                    "duration_minutes": 60,
                    "baggage_info": "Backpack",
                    "zone": "Main section",
                    "status": "active",
                    "created_at": now.isoformat(),
                    "expires_at": (now + timedelta(minutes=60)).isoformat(),
                    "updated_at": now.isoformat(),
                }
            ]
        else:
            return httpx.Response(404, request=request)

        return httpx.Response(200, json=payload, request=request)

    async def aclose(self) -> None:
        return None


class MissingSessionTransport(httpx.AsyncBaseTransport):
    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            json={"message": "Library session not found."},
            request=request,
        )

    async def aclose(self) -> None:
        return None


def test_repository_authenticates_staff_and_reads_supabase_rows() -> None:
    transport = SupabaseMockTransport()
    repository = SupabaseLibraryRepository(
        Settings(
            supabase_url="https://project.supabase.co",
            supabase_publishable_key="publishable-key",
            frontend_origins=("http://localhost:3000",),
        ),
        access_token="user-access-token",
        transport=transport,
    )

    async def run() -> None:
        await repository.authenticate_approved_staff()
        sessions = await repository.list_sessions()
        assert repository.staff_profile is not None
        assert repository.staff_profile.full_name == "Staff Example"
        assert sessions[0].baggage_info == "Backpack"

    asyncio.run(run())

    assert [request.url.path for request in transport.requests] == [
        "/auth/v1/user",
        "/rest/v1/users",
        "/rest/v1/library_sessions",
    ]
    assert all(
        request.headers["authorization"] == "Bearer user-access-token"
        for request in transport.requests
    )


def test_repository_translates_missing_session_rpc_error() -> None:
    repository = SupabaseLibraryRepository(
        Settings(
            supabase_url="https://project.supabase.co",
            supabase_publishable_key="publishable-key",
            frontend_origins=("http://localhost:3000",),
        ),
        access_token="user-access-token",
        transport=MissingSessionTransport(),
    )

    with pytest.raises(SessionNotFoundError):
        asyncio.run(
            repository.update_session_status(
                session_id=uuid4(),
                zone="Main section",
                status="exited",
            )
        )
