import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.library.errors import SessionNotFoundError
from app.library.models import LibrarySession, SessionStatus, Zone
from app.library.router import get_repository
from app.library.service import BagCheckService
from app.main import app


def make_session(baggage_info: str, status: SessionStatus = SessionStatus.active) -> LibrarySession:
    now = datetime.now(timezone.utc)
    return LibrarySession(
        id=uuid4(),
        name="Student Example",
        email="student@mymona.uwi.edu",
        student_id="12345678",
        short_code="AB12",
        duration_minutes=60,
        baggage_info=baggage_info,
        zone=Zone.main,
        status=status,
        created_at=now,
        expires_at=now + timedelta(minutes=60),
        updated_at=now,
    )


class FakeLibraryRepository:
    def __init__(self, sessions: list[LibrarySession]) -> None:
        self.sessions = sessions
        self.status_updates: list[tuple[str, str, str]] = []

    async def authenticate_approved_staff(self) -> None:
        return None

    async def list_sessions(self) -> list[LibrarySession]:
        return self.sessions

    async def update_session_status(
        self,
        session_id,
        zone: str,
        status: str,
    ) -> LibrarySession:
        self.status_updates.append((str(session_id), zone, status))
        session = next(item for item in self.sessions if item.id == session_id)
        session.close_session()
        return session


def test_service_lists_only_sessions_with_declared_baggage() -> None:
    repository = FakeLibraryRepository(
        [make_session("Black backpack"), make_session(" No bag declared ")]
    )

    claims = asyncio.run(BagCheckService(repository).list_bag_claims())

    assert [claim.baggage_info for claim in claims] == ["Black backpack"]


def test_verifying_handoff_uses_repository_and_exits_session() -> None:
    session = make_session("Black backpack")
    repository = FakeLibraryRepository([session])

    verified = asyncio.run(BagCheckService(repository).verify_handoff(session.id))

    assert verified.status == SessionStatus.exited
    assert repository.status_updates == [(str(session.id), "Main section", "exited")]


def test_verifying_unknown_bag_claim_returns_not_found() -> None:
    service = BagCheckService(FakeLibraryRepository([]))

    with pytest.raises(SessionNotFoundError):
        asyncio.run(service.verify_handoff(uuid4()))


def test_api_lists_and_verifies_claims_through_service_dependency() -> None:
    session = make_session("Black backpack")
    repository = FakeLibraryRepository([session])
    app.dependency_overrides[get_repository] = lambda: repository

    try:
        client = TestClient(app)
        claims = client.get("/library/admin/bag-claims")
        verify = client.post(f"/library/admin/bag-claims/{session.id}/verify")
    finally:
        app.dependency_overrides.clear()

    assert claims.status_code == 200
    assert claims.json()[0]["baggage_info"] == "Black backpack"
    assert verify.status_code == 200
    assert verify.json()["status"] == "exited"
