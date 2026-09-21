from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class EventCategory(str, Enum):
    academic = "academic"
    club = "club"
    career = "career"
    sport = "sport"
    food = "food"
    social = "social"


class EventAudience(str, Enum):
    all_students = "all_students"
    students = "students"
    faculty = "faculty"
    major = "major"


class EventStatus(str, Enum):
    draft = "draft"
    published = "published"
    cancelled = "cancelled"
    happening_now = "happening_now"


class CampusEvent(BaseModel):
    id: str
    title: str
    category: EventCategory
    description: str
    building: str
    room: str | None = None
    floor: int | None = None
    start_time: datetime
    end_time: datetime
    tags: list[str] = Field(default_factory=list)
    audience: EventAudience = EventAudience.students
    status: EventStatus = EventStatus.published
    buzz_score: int = 0
    is_free_food: bool = False
    organizer: str | None = None
    majors: list[str] = Field(default_factory=list)


class ScheduleBlock(BaseModel):
    id: str
    user_id: str
    title: str
    start_time: datetime
    end_time: datetime
    location: str | None = None
    source: str = "upload"


class CampusMapPoint(BaseModel):
    id: str
    name: str
    building_code: str
    latitude: float
    longitude: float
    floor: int | None = None


class FreeSlot(BaseModel):
    time: str
    label: str
    category: str | None = None
    location: str | None = None


class CampusBuzzSummary(BaseModel):
    active_events: int
    checkins: int
    status: str
    peak_building: str | None = None
