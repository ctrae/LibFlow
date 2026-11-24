from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Literal
from uuid import UUID

from pydantic import BaseModel

from app.library.models import BagClaimStatus, SessionStatus

if TYPE_CHECKING:
    from app.library.models import BagClaim, LibrarySession, Report, StaffProfile


class StaffProfileResponse(BaseModel):
    user_id: UUID
    email: str
    user_type: str
    full_name: str | None = None
    is_approved: bool

    @classmethod
    def from_domain(cls, profile: StaffProfile) -> StaffProfileResponse:
        return cls(
            user_id=profile.user_id,
            email=profile.email,
            user_type=profile.user_type,
            full_name=profile.full_name,
            is_approved=profile.is_approved,
        )


class LibrarySessionResponse(BaseModel):
    id: UUID
    name: str
    email: str
    student_id: str
    short_code: str
    duration_minutes: int
    baggage_info: str
    zone: Literal["Main section", "Basement"] | None
    status: SessionStatus
    created_at: datetime
    expires_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, session: LibrarySession) -> LibrarySessionResponse:
        zone = None
        if session.zone is not None:
            zone = "Main section" if session.zone.value == "Main" else "Basement"
        return cls(
            id=session.session_id,
            name=session.name,
            email=session.email,
            student_id=str(session.student_id),
            short_code=session.short_code,
            duration_minutes=session.duration_minutes,
            baggage_info=session.baggage_info,
            zone=zone,
            status=session.session_status,
            created_at=session.created_at,
            expires_at=session.expires_at,
            updated_at=session.updated_at,
        )


class BagClaimResponse(BaseModel):
    session_id: UUID
    bag_tag: str
    baggage_info: str
    status: BagClaimStatus
    created_at: datetime
    verified_at: datetime | None

    @classmethod
    def from_domain(cls, claim: BagClaim) -> BagClaimResponse:
        return cls(
            session_id=claim.session_id,
            bag_tag=claim.bag_tag,
            baggage_info=claim.baggage_info,
            status=claim.status,
            created_at=claim.created_at,
            verified_at=claim.verified_at,
        )


class ReportResponse(BaseModel):
    report_id: UUID
    start_date: date
    end_date: date
    total_occupancy: int
    peak_hour: int

    @classmethod
    def from_domain(cls, report: Report) -> ReportResponse:
        return cls(
            report_id=report.report_id,
            start_date=report.start_date,
            end_date=report.end_date,
            total_occupancy=report.total_occupancy,
            peak_hour=report.peak_hour,
        )
