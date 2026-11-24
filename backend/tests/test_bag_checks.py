import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.library.errors import SessionNotFoundError
from app.library.models import LibrarySession, SessionStatus, Student, Zone
from app.library.router import get_repository
from app.library.service import BagCheckService
from app.main import app


def make_session(
    baggage_info: str,
    status: SessionStatus = SessionStatus.active,
) -> LibrarySession:
    now = datetime.now(timezone.utc)
    return LibrarySession(
        session_id=uuid4(),
        user_id=uuid4(),
        student_id=12345678,
        short_code="AB12",
        checkin_time=now,
        duration_minutes=60,
        allotted_time=60,
        bag_amount=int(baggage_info.strip().casefold() != "no bag declared"),
        session_status=status,
        name="Student Example",
        email="student@mymona.uwi.edu",
        baggage_info=baggage_info,
        zone=Zone.main,
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
        zone: Zone,
        status: SessionStatus,
    ) -> LibrarySession:
        self.status_updates.append((str(session_id), zone.value, status.value))
        session = next(item for item in self.sessions if item.session_id == session_id)
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

    verified = asyncio.run(
        BagCheckService(repository).verify_handoff(session.session_id)
    )

    assert verified.session_status == SessionStatus.exited
    assert repository.status_updates == [
        (str(session.session_id), "Main", "exited")
    ]


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
        verify = client.post(
            f"/library/admin/bag-claims/{session.session_id}/verify"
        )
    finally:
        app.dependency_overrides.clear()

    assert claims.status_code == 200
    assert claims.json()[0]["baggage_info"] == "Black backpack"
    assert claims.json()[0]["zone"] == "Main section"
    assert verify.status_code == 200
    assert verify.json()["status"] == "exited"


def test_domain_names_and_methods_match_session_and_user_classes() -> None:
    now = datetime.now(timezone.utc)
    student = Student(
        user_id=uuid4(),
        email="student@mymona.uwi.edu",
        full_name="Student Example",
        student_id=12345678,
        student_email_address="student@mymona.uwi.edu",
        stay_duration=60,
        short_code="AB12",
    )
    session = LibrarySession.create_session(
        user_id=student.user_id,
        student_id=student.student_id,
        short_code=student.short_code,
        duration_minutes=student.stay_duration,
        name=student.full_name,
        email=student.student_email_address,
        at=now,
    )

    student.register_visit(session)

    assert student.active_session_id == session.session_id
    assert student.view_status(session) == SessionStatus.active
    assert session.get_session() is session
