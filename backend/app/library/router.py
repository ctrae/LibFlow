from __future__ import annotations

from datetime import datetime, timedelta, timezone
from secrets import choice
from string import ascii_uppercase, digits
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.library.models import (
    BagClaim,
    BagClaimStatus,
    LibrarySession,
    SessionStatus,
    Student,
    Zone,
)

router = APIRouter(prefix="/library", tags=["library"])

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

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.isdecimal():
            raise ValueError("Student ID must contain only digits")
        return normalized


class StatusUpdate(BaseModel):
    zone: Zone
    status: SessionStatus


sessions: dict[UUID, LibrarySession] = {}
bag_claims: dict[UUID, BagClaim] = {}


def make_short_code() -> str:
    alphabet = ascii_uppercase + digits
    while True:
        code = "".join(choice(alphabet) for _ in range(4))
        if all(session.short_code != code for session in sessions.values()):
            return code


def refresh_expired(session: LibrarySession) -> LibrarySession:
    return session.auto_timeout(datetime.now(timezone.utc))


@router.post("/registrations", response_model=LibrarySession, status_code=status.HTTP_201_CREATED)
def register_student(payload: RegistrationCreate) -> LibrarySession:
    now = datetime.now(timezone.utc)
    student = Student(
        email=payload.email,
        full_name=payload.name.strip(),
        student_id=int(payload.student_id),
        student_email_address=payload.email,
        stay_duration=payload.duration_minutes,
        baggage_info=payload.baggage_info.strip() or "No bag declared",
        short_code=make_short_code(),
    )
    session = LibrarySession(
        id=uuid4(),
        user_id=student.user_id,
        name=student.full_name,
        email=student.student_email_address,
        student_id=str(student.student_id),
        short_code=student.short_code,
        duration_minutes=student.stay_duration,
        allotted_time=student.stay_duration,
        bag_amount=int(student.baggage_info.lower() != "no bag declared"),
        baggage_info=student.baggage_info,
        created_at=now,
        checkin_time=now,
        expires_at=now + timedelta(minutes=student.stay_duration),
        updated_at=now,
    )
    sessions[session.id] = session
    if session.baggage_info.lower() != "no bag declared":
        bag_claims[session.id] = BagClaim.for_session(session)
    return session


@router.get("/admin/sessions", response_model=list[LibrarySession])
def list_sessions() -> list[LibrarySession]:
    return [refresh_expired(session) for session in sorted(sessions.values(), key=lambda item: item.created_at, reverse=True)]


@router.post("/admin/sessions/{session_id}/status", response_model=LibrarySession)
def update_session_status(session_id: UUID, payload: StatusUpdate) -> LibrarySession:
    session = sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    session.update_status(payload.zone, payload.status, datetime.now(timezone.utc))
    bag_claim = bag_claims.get(session_id)
    if bag_claim:
        bag_claim.zone = session.zone
        if session.status == SessionStatus.exited:
            bag_claim.set_status(BagClaimStatus.verified)
    return session


@router.get("/admin/bag-claims", response_model=list[BagClaim])
def list_bag_claims() -> list[BagClaim]:
    for session in sessions.values():
        refresh_expired(session)
        claim = bag_claims.get(session.id)
        if claim:
            claim.zone = session.zone
            if session.status == SessionStatus.exited:
                claim.set_status(BagClaimStatus.verified, session.checkout_time)
    return sorted(bag_claims.values(), key=lambda claim: claim.created_at, reverse=True)


@router.post(
    "/admin/bag-claims/{session_id}/verify",
    response_model=BagClaim,
)
def verify_bag_claim(session_id: UUID) -> BagClaim:
    session = sessions.get(session_id)
    bag_claim = bag_claims.get(session_id)
    if session is None or bag_claim is None:
        raise HTTPException(status_code=404, detail="Bag claim not found")

    now = datetime.now(timezone.utc)
    session.update_status(session.zone or Zone.main, SessionStatus.exited, now)
    bag_claim.set_status(BagClaimStatus.verified, now)
    return bag_claim
