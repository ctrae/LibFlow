from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


Zone = Literal["Main", "Basement"]
SessionStatus = Literal["active", "exited", "expired"]
StaffRole = Literal["library_staff", "head_librarian"]


class CheckInRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    student_id: str = Field(min_length=9, max_length=9)
    student_email: EmailStr
    allotted_minutes: int = Field(ge=15, le=480)
    zone: Zone = "Main"
    bag_number: str | None = Field(default=None, max_length=50)
    visit_reason: str | None = Field(default=None, max_length=100)

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("Student ID must contain exactly 9 digits.")
        return value

    @field_validator("student_email")
    @classmethod
    def validate_uwi_email(cls, value: EmailStr) -> EmailStr:
        email = str(value).lower()
        if not email.endswith("@mymona.uwi.edu"):
            raise ValueError("A valid @mymona.uwi.edu email is required.")
        return value


class CheckInResponse(BaseModel):
    session_id: str
    student_id: str
    check_in: datetime
    expires_at: datetime
    status: Literal["active"]


class CheckOutRequest(BaseModel):
    student_id: str | None = Field(default=None, min_length=9, max_length=9)
    student_email: EmailStr | None = None

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, value: str | None) -> str | None:
        if value is not None and not value.isdigit():
            raise ValueError("Student ID must contain exactly 9 digits.")
        return value


class CheckOutResponse(BaseModel):
    session_id: str
    student_id: str
    check_out: datetime
    status: Literal["exited"]

class ExtendStayRequest(BaseModel):
    extension_minutes: int = Field(
        ge=15,
        le=60,
    )


class ExtendStayResponse(BaseModel):
    session_id: str
    student_id: str
    extension_minutes: int
    allotted_minutes: int
    expires_at: datetime
    status: Literal["active"]

class SessionResponse(BaseModel):
    id: str
    student_id: str
    student_email: str
    check_in: datetime
    check_out: datetime | None = None
    expires_at: datetime
    allotted_minutes: int
    zone: str | None = None
    bag_number: str | None = None
    visit_reason: str | None = None
    status: SessionStatus



class OccupancyResponse(BaseModel):
    occupancy: int


class StatusUpdateRequest(BaseModel):
    status: SessionStatus


class StatusUpdateResponse(BaseModel):
    session_id: str
    status: SessionStatus
    updated: bool


class BagUpdateRequest(BaseModel):
    bag_number: str | None = Field(default=None, max_length=50)


class BagResponse(BaseModel):
    session_id: str
    student_id: str
    bag_number: str | None
    status: SessionStatus


class SessionEventResponse(BaseModel):
    id: int
    session_id: str
    event_status: SessionStatus
    created_at: datetime


class HourlyOccupancyRow(BaseModel):
    hour_label: str
    students_present: int
    check_ins: int
    check_outs: int


class DailyTotalsRow(BaseModel):
    visit_date: date
    total_visits: int
    unique_students: int


class AverageStayResponse(BaseModel):
    avg_stay_minutes: float
    completed_visits: int


class SaveDailyTotalResponse(BaseModel):
    day: date
    total_visits: int
    unique_students: int
    saved_at: datetime
    saved_by: str | None = None


class MeResponse(BaseModel):
    user_id: str
    role: StaffRole


class StaffResponse(BaseModel):
    user_id: str
    role: StaffRole
    created_at: datetime


class StaffCreateRequest(BaseModel):
    user_id: str
    role: StaffRole = "library_staff"
