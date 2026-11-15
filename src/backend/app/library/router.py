from __future__ import annotations

from datetime import datetime, timedelta, timezone
from enum import Enum
from secrets import choice
from string import ascii_uppercase, digits
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

router = APIRouter(prefix="/library", tags=["library"])


class Zone(str, Enum):
    main = "Main section"
    basement = "Basement"


class SessionStatus(str, Enum):
    active = "active"
    exited = "exited"
    expired = "expired"


class RegistrationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str
    student_id: str = Field(min_length=4, max_length=32)
    duration_minutes: int
    baggage_info: str = Field(default="No bag declared", max_length=240)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized.endswith("@mymona.uwi.edu"):
            raise ValueError("Use your @mymona.uwi.edu email address")
        return normalized

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, value: int) -> int:
        if value not in (15, 30, 45, 60):
            raise ValueError("Duration must be 15, 30, 45, or 60 minutes")
        return value


class StatusUpdate(BaseModel):
    zone: Zone
    status: SessionStatus


class LibrarySession(BaseModel):
    id: UUID
    name: str
    email: str
    student_id: str
    short_code: str
    duration_minutes: int
    baggage_info: str
    zone: Zone | None = None
    status: SessionStatus = SessionStatus.active
    created_at: datetime
    expires_at: datetime
    updated_at: datetime


sessions: dict[UUID, LibrarySession] = {}


def make_short_code() -> str:
    alphabet = ascii_uppercase + digits
    while True:
        code = "".join(choice(alphabet) for _ in range(4))
        if all(session.short_code != code for session in sessions.values()):
            return code


def refresh_expired(session: LibrarySession) -> LibrarySession:
    if session.status == SessionStatus.active and session.expires_at <= datetime.now(timezone.utc):
        session.status = SessionStatus.expired
        session.updated_at = datetime.now(timezone.utc)
    return session


@router.post("/registrations", response_model=LibrarySession, status_code=status.HTTP_201_CREATED)
def register_student(payload: RegistrationCreate) -> LibrarySession:
    now = datetime.now(timezone.utc)
    session = LibrarySession(
        id=uuid4(),
        name=payload.name.strip(),
        email=payload.email,
        student_id=payload.student_id.strip(),
        short_code=make_short_code(),
        duration_minutes=payload.duration_minutes,
        baggage_info=payload.baggage_info.strip() or "No bag declared",
        created_at=now,
        expires_at=now + timedelta(minutes=payload.duration_minutes),
        updated_at=now,
    )
    sessions[session.id] = session
    return session


@router.get("/students/{short_code}", response_model=LibrarySession)
def get_student_status(short_code: str) -> LibrarySession:
    for session in sessions.values():
        if session.short_code == short_code.upper():
            return refresh_expired(session)
    raise HTTPException(status_code=404, detail="Student access code not found")


@router.get("/admin/sessions", response_model=list[LibrarySession])
def list_sessions() -> list[LibrarySession]:
    return [refresh_expired(session) for session in sorted(sessions.values(), key=lambda item: item.created_at, reverse=True)]


@router.post("/admin/sessions/{session_id}/status", response_model=LibrarySession)
def update_session_status(session_id: UUID, payload: StatusUpdate) -> LibrarySession:
    session = sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    session.zone = payload.zone
    session.status = payload.status
    session.updated_at = datetime.now(timezone.utc)
    return refresh_expired(session)


@router.get("/admin/notifications", response_model=list[LibrarySession])
def expired_notifications() -> list[LibrarySession]:
    return [session for session in list_sessions() if session.status == SessionStatus.expired]
