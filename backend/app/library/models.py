from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta, timezone
from enum import Enum
from secrets import choice
from string import ascii_uppercase, digits
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class Zone(str, Enum):
    main = "Main"
    basement = "Basement"


class StaffZone(str, Enum):
    bag_staff = "Bag Staff"
    security = "Security"


class SessionStatus(str, Enum):
    active = "active"
    exited = "exited"
    expired = "expired"


class BagClaimStatus(str, Enum):
    pending = "pending"
    verified = "verified"


class User(BaseModel):
    model_config = ConfigDict(validate_assignment=True)

    user_id: UUID = Field(default_factory=uuid4)
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active_session_id: UUID | None = None

    def login(self, session_id: UUID) -> None:
        self.update_active_session(session_id)

    def logout(self) -> None:
        self.update_active_session(None)

    def update_active_session(self, session_id: UUID | None) -> None:
        self.active_session_id = session_id


class Student(User):
    full_name: str
    student_id: int
    student_email_address: str
    stay_duration: int = Field(gt=0)
    baggage_info: str = "No bag declared"
    short_code: str
    status: SessionStatus = SessionStatus.active

    def register_visit(self, session: LibrarySession) -> LibrarySession:
        if session.user_id != self.user_id or session.student_id != self.student_id:
            raise ValueError("The session must belong to this student.")
        self.login(session.session_id)
        return session

    def view_status(self, session: LibrarySession) -> SessionStatus:
        if session.user_id != self.user_id:
            raise ValueError("The session must belong to this student.")
        return session.session_status


class AuthorizedUser(User):
    staff_id: int
    department: str

    def view_occupancy(self, sessions: list[LibrarySession]) -> int:
        return sum(
            session.session_status == SessionStatus.active
            for session in sessions
        )

    def process_override(
        self,
        session: LibrarySession,
        zone: Zone,
        status: SessionStatus,
        at: datetime | None = None,
    ) -> LibrarySession:
        session.update_status(zone, status, at)
        return session

    def view_bag_status(self, claim: BagClaim) -> BagClaimStatus:
        return claim.get_status()

    def update_bag_status(
        self,
        claim: BagClaim,
        status: BagClaimStatus,
        at: datetime | None = None,
    ) -> BagClaim:
        claim.set_status(status, at)
        return claim

    def manual_check_in(self, session: LibrarySession) -> LibrarySession:
        session.update_status(session.zone or Zone.main, SessionStatus.active)
        self.update_active_session(session.session_id)
        return session

    def manual_check_out(self, session: LibrarySession) -> LibrarySession:
        session.close_session()
        self.update_active_session(None)
        return session


class HeadLibrarian(AuthorizedUser):
    def generate_report(
        self,
        sessions: list[LibrarySession],
        start_date: date,
        end_date: date,
    ) -> Report:
        return Report.generate_report(sessions, start_date, end_date)


class LibraryStaff(AuthorizedUser):
    assigned_zone: StaffZone


class StaffProfile(BaseModel):
    user_id: UUID
    email: str
    user_type: str
    full_name: str | None = None
    is_approved: bool


class LibrarySession(BaseModel):
    model_config = ConfigDict(validate_assignment=True, extra="ignore")

    session_id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    student_id: int
    short_code: str
    checkin_time: datetime
    checkout_time: datetime | None = None
    duration_minutes: int = Field(gt=0)
    allotted_time: int = Field(gt=0)
    bag_amount: int = Field(default=0, ge=0)
    zone: Zone | None = None
    session_status: SessionStatus = SessionStatus.active
    name: str
    email: str
    baggage_info: str = "No bag declared"
    created_at: datetime
    expires_at: datetime
    updated_at: datetime

    @classmethod
    def create_session(
        cls,
        *,
        user_id: UUID,
        student_id: int,
        short_code: str,
        duration_minutes: int,
        name: str,
        email: str,
        baggage_info: str = "No bag declared",
        zone: Zone | None = None,
        bag_amount: int = 0,
        at: datetime | None = None,
    ) -> LibrarySession:
        now = at or datetime.now(timezone.utc)
        return cls(
            user_id=user_id,
            student_id=student_id,
            short_code=short_code,
            checkin_time=now,
            duration_minutes=duration_minutes,
            allotted_time=duration_minutes,
            bag_amount=bag_amount,
            zone=zone,
            name=name,
            email=email,
            baggage_info=baggage_info,
            created_at=now,
            expires_at=now + timedelta(minutes=duration_minutes),
            updated_at=now,
        )

    def update_status(
        self,
        zone: Zone,
        status: SessionStatus,
        at: datetime | None = None,
    ) -> LibrarySession:
        now = at or datetime.now(timezone.utc)
        self.zone = zone
        self.session_status = status
        self.updated_at = now
        if status == SessionStatus.exited:
            self.checkout_time = now
        else:
            self.checkout_time = None
        return self

    def close_session(self, at: datetime | None = None) -> LibrarySession:
        return self.update_status(
            self.zone or Zone.main,
            SessionStatus.exited,
            at,
        )

    def get_session(self) -> LibrarySession:
        return self

    def auto_timeout(self, at: datetime | None = None) -> LibrarySession:
        now = at or datetime.now(timezone.utc)
        if self.session_status == SessionStatus.active and self.expires_at <= now:
            self.session_status = SessionStatus.expired
            self.updated_at = now
        return self


class BagClaim(BaseModel):
    model_config = ConfigDict(validate_assignment=True)

    session_id: UUID
    bag_tag: str = Field(default_factory=lambda: BagClaim.generate_bag_tag())
    baggage_info: str
    status: BagClaimStatus = BagClaimStatus.pending
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified_at: datetime | None = None

    @staticmethod
    def generate_bag_tag() -> str:
        alphabet = ascii_uppercase + digits
        return "".join(choice(alphabet) for _ in range(8))

    def get_status(self) -> BagClaimStatus:
        return self.status

    def set_status(
        self,
        status: BagClaimStatus,
        at: datetime | None = None,
    ) -> BagClaim:
        self.status = status
        self.verified_at = (
            (at or datetime.now(timezone.utc))
            if status == BagClaimStatus.verified
            else None
        )
        return self


class Report(BaseModel):
    model_config = ConfigDict(validate_assignment=True)

    report_id: UUID = Field(default_factory=uuid4)
    start_date: date
    end_date: date
    total_occupancy: int = Field(default=0, ge=0)
    peak_hour: int = Field(default=0, ge=0, le=23)

    @classmethod
    def generate_report(
        cls,
        sessions: list[LibrarySession],
        start_date: date,
        end_date: date,
    ) -> Report:
        report = cls(start_date=start_date, end_date=end_date)
        selected = report._sessions_in_range(sessions)
        report.total_occupancy = len(selected)
        hourly_visits = report.calculate_hourly_visits(selected)
        if hourly_visits:
            report.peak_hour = min(
                hourly_visits,
                key=lambda hour: (-hourly_visits[hour], hour),
            )
        return report

    def get_peak_hour(self) -> int:
        return self.peak_hour

    def get_total_occupancy(self) -> int:
        return self.total_occupancy

    def calculate_hourly_visits(
        self,
        sessions: list[LibrarySession],
    ) -> dict[int, int]:
        return dict(Counter(session.checkin_time.hour for session in sessions))

    def calculate_average_stay_time(
        self,
        sessions: list[LibrarySession],
    ) -> float:
        durations = [
            (session.checkout_time - session.checkin_time).total_seconds() / 60
            for session in sessions
            if session.checkout_time is not None
        ]
        return sum(durations) / len(durations) if durations else 0.0

    def _sessions_in_range(
        self,
        sessions: list[LibrarySession],
    ) -> list[LibrarySession]:
        return [
            session
            for session in sessions
            if self.start_date <= session.checkin_time.date() <= self.end_date
        ]
