from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from secrets import choice
from string import ascii_uppercase, digits
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class Zone(str, Enum):
    main = "Main section"
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
        self.active_session_id = session_id

    def logout(self) -> None:
        self.active_session_id = None

    def update_active_session(self, session_id: UUID | None) -> None:
        self.active_session_id = session_id


class Student(User):
    full_name: str
    student_id: int
    student_email_address: str
    stay_duration: int
    baggage_info: str = "No bag declared"
    short_code: str
    status: SessionStatus = SessionStatus.active


class AuthorizedUser(User):
    staff_id: int
    department: str


class LibraryStaff(AuthorizedUser):
    assigned_zone: StaffZone


class LibrarySession(BaseModel):
    model_config = ConfigDict(validate_assignment=True)

    id: UUID
    user_id: UUID
    name: str
    email: str
    student_id: str
    short_code: str
    duration_minutes: int
    allotted_time: int
    bag_amount: int
    baggage_info: str
    zone: Zone | None = None
    status: SessionStatus = SessionStatus.active
    created_at: datetime
    checkin_time: datetime
    checkout_time: datetime | None = None
    expires_at: datetime
    updated_at: datetime

    def update_status(self, zone: Zone, status: SessionStatus, at: datetime) -> None:
        self.zone = zone
        self.status = status
        self.checkout_time = at if status == SessionStatus.exited else None
        self.updated_at = at

    def close_session(self, at: datetime) -> None:
        self.status = SessionStatus.exited
        self.checkout_time = at
        self.updated_at = at

    def auto_timeout(self, at: datetime) -> LibrarySession:
        if self.status == SessionStatus.active and self.expires_at <= at:
            self.status = SessionStatus.expired
            self.checkout_time = at
            self.updated_at = at
        return self


class BagClaim(BaseModel):
    model_config = ConfigDict(validate_assignment=True)

    session_id: UUID
    bag_tag: str
    student_name: str
    student_id: str
    baggage_info: str
    zone: Zone | None = None
    status: BagClaimStatus = BagClaimStatus.pending
    created_at: datetime
    verified_at: datetime | None = None

    @classmethod
    def generate_bag_tag(cls) -> str:
        alphabet = ascii_uppercase + digits
        return "".join(choice(alphabet) for _ in range(8))

    @classmethod
    def for_session(cls, session: LibrarySession) -> BagClaim:
        return cls(
            session_id=session.id,
            bag_tag=cls.generate_bag_tag(),
            student_name=session.name,
            student_id=session.student_id,
            baggage_info=session.baggage_info,
            zone=session.zone,
            created_at=session.created_at,
        )

    def get_status(self) -> BagClaimStatus:
        return self.status

    def set_status(
        self,
        status: BagClaimStatus,
        at: datetime | None = None,
    ) -> None:
        self.status = status
        self.verified_at = (
            at or datetime.now(timezone.utc)
            if status == BagClaimStatus.verified
            else None
        )
