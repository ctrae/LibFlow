from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter

from .models import (
    CampusBuzzSummary,
    CampusEvent,
    CampusMapPoint,
    EventAudience,
    EventCategory,
    EventStatus,
    FreeSlot,
    ScheduleBlock,
)

router = APIRouter(prefix="/campus", tags=["campus"])


def build_demo_events() -> list[CampusEvent]:
    now = datetime.utcnow()
    return [
        CampusEvent(
            id="evt-101",
            title="AI & Data Science Seminar",
            category=EventCategory.academic,
            description="Guest lecture on machine learning workflows and campus research collaboration.",
            building="Computing & Informatics Centre",
            room="CPGR 1",
            floor=2,
            start_time=now - timedelta(minutes=30),
            end_time=now + timedelta(minutes=60),
            tags=["ai", "research", "career"],
            audience=EventAudience.students,
            status=EventStatus.happening_now,
            buzz_score=88,
            organizer="Computer Science Society",
            majors=["Computer Science", "Data Science"],
        ),
        CampusEvent(
            id="evt-102",
            title="Startup Mixer",
            category=EventCategory.career,
            description="Meet founders and alumni for internships and startup opportunities.",
            building="Innovation Hub",
            room="Room 3",
            floor=1,
            start_time=now + timedelta(hours=2),
            end_time=now + timedelta(hours=4),
            tags=["career", "networking"],
            audience=EventAudience.all_students,
            status=EventStatus.published,
            buzz_score=74,
            organizer="Career Services",
            majors=["Business", "Computer Science", "Engineering"],
        ),
        CampusEvent(
            id="evt-103",
            title="Free Pizza Social",
            category=EventCategory.food,
            description="Casual meet-up with free food and club signups.",
            building="Student Center",
            room="Atrium",
            floor=0,
            start_time=now - timedelta(minutes=10),
            end_time=now + timedelta(minutes=40),
            tags=["social", "food"],
            audience=EventAudience.all_students,
            status=EventStatus.happening_now,
            buzz_score=92,
            is_free_food=True,
            organizer="Student Union",
            majors=["All"],
        ),
        CampusEvent(
            id="evt-104",
            title="Campus Run Club",
            category=EventCategory.sport,
            description="A social fitness session for campus runners and new members.",
            building="Sports Centre",
            room="Track 2",
            floor=1,
            start_time=now + timedelta(hours=1),
            end_time=now + timedelta(hours=3),
            tags=["wellness", "fitness"],
            audience=EventAudience.students,
            status=EventStatus.published,
            buzz_score=69,
            organizer="Student Athletics",
            majors=["All"],
        ),
    ]


@router.get("/events", response_model=list[CampusEvent])
async def list_events(
    category: EventCategory | None = None,
    major: str | None = None,
    happening_now: bool = False,
) -> list[CampusEvent]:
    events = build_demo_events()

    if category is not None:
        events = [event for event in events if event.category == category]
    if major:
        events = [event for event in events if major in event.majors or "All" in event.majors]
    if happening_now:
        events = [event for event in events if event.status == EventStatus.happening_now]

    return events


@router.get("/schedule", response_model=list[ScheduleBlock])
async def get_schedule() -> list[ScheduleBlock]:
    now = datetime.utcnow()
    return [
        ScheduleBlock(
            id="sched-1",
            user_id="student-42",
            title="CS Seminar",
            start_time=now.replace(hour=9, minute=0, second=0, microsecond=0),
            end_time=now.replace(hour=10, minute=0, second=0, microsecond=0),
            location="CPGR 1",
            source="calendar",
        ),
        ScheduleBlock(
            id="sched-2",
            user_id="student-42",
            title="Career Mixer",
            start_time=now.replace(hour=14, minute=30, second=0, microsecond=0),
            end_time=now.replace(hour=16, minute=0, second=0, microsecond=0),
            location="Innovation Hub",
            source="calendar",
        ),
    ]


@router.get("/free-slots", response_model=list[FreeSlot])
async def free_slots(user_schedule: list[ScheduleBlock] | None = None) -> list[FreeSlot]:
    return [
        FreeSlot(
            time="Today, 2:00 PM - 4:00 PM",
            label="Open for club activities",
            category="social",
            location="Student Center",
        ),
        FreeSlot(
            time="Tomorrow, 11:00 AM - 1:00 PM",
            label="Free for career fair",
            category="career",
            location="Innovation Hub",
        ),
        FreeSlot(
            time="Today, 6:00 PM - 7:00 PM",
            label="Open for sports practice",
            category="sport",
            location="Sports Centre",
        ),
    ]


@router.get("/buzz", response_model=CampusBuzzSummary)
async def buzz() -> CampusBuzzSummary:
    return CampusBuzzSummary(
        active_events=5,
        checkins=214,
        status="high",
        peak_building="Student Center",
    )


@router.get("/map-points", response_model=list[CampusMapPoint])
async def map_points() -> list[CampusMapPoint]:
    return [
        CampusMapPoint(
            id="map-1",
            name="Student Center",
            building_code="SC",
            latitude=17.9713,
            longitude=-76.7975,
            floor=0,
        ),
        CampusMapPoint(
            id="map-2",
            name="Computing & Informatics Centre",
            building_code="CIC",
            latitude=17.9721,
            longitude=-76.7968,
            floor=2,
        ),
        CampusMapPoint(
            id="map-3",
            name="Innovation Hub",
            building_code="IH",
            latitude=17.9716,
            longitude=-76.7959,
            floor=1,
        ),
    ]
