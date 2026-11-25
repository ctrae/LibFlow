from datetime import date
from functools import lru_cache

from fastapi import APIRouter, Depends, Query

from app.core.auth import require_head_librarian, require_staff
from app.database.supabase import get_supabase
from app.library.repository import LibraryRepository
from app.library.schemas import (
    AverageStayResponse,
    BagResponse,
    BagUpdateRequest,
    CheckInRequest,
    CheckInResponse,
    CheckOutRequest,
    CheckOutResponse,
    DailyTotalsRow,
    HourlyOccupancyRow,
    OccupancyResponse,
    SaveDailyTotalResponse,
    SessionEventResponse,
    SessionResponse,
    StaffCreateRequest,
    StaffResponse,
    StatusUpdateRequest,
    StatusUpdateResponse,
)
from app.library.service import LibraryService


router = APIRouter(prefix="/library", tags=["Library"])


@lru_cache
def get_repository() -> LibraryRepository:
    return LibraryRepository(get_supabase())


def get_service() -> LibraryService:
    return LibraryService(get_repository())


# ------------------------- Student / Sessions -------------------------


@router.post("/check-in", response_model=CheckInResponse, status_code=201)
def check_in(request: CheckInRequest, service: LibraryService = Depends(get_service)):
    return service.check_in(request)


@router.post("/check-out/{session_id}", response_model=CheckOutResponse)
def check_out(session_id: str, service: LibraryService = Depends(get_service)):
    return service.checkout(session_id)


@router.post("/student/check-out", response_model=CheckOutResponse)
def student_check_out(request: CheckOutRequest, service: LibraryService = Depends(get_service)):
    return service.checkout_by_student(request)


@router.get("/sessions/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, service: LibraryService = Depends(get_service)):
    return service.get_session(session_id)


@router.get("/sessions", response_model=list[SessionResponse], dependencies=[Depends(require_staff)])
def get_sessions(
    status: str | None = Query(default=None),
    service: LibraryService = Depends(get_service),
):
    return service.get_sessions(status)


@router.get("/students/{student_id}/sessions", response_model=list[SessionResponse], dependencies=[Depends(require_staff)])
def student_history(student_id: str, service: LibraryService = Depends(get_service)):
    return service.student_history(student_id)


# ----------------------------- Occupancy ------------------------------


@router.get("/occupancy", response_model=OccupancyResponse, dependencies=[Depends(require_staff)])
def occupancy(service: LibraryService = Depends(get_service)):
    return service.occupancy()


# ----------------------------- Overrides ------------------------------


@router.patch("/sessions/{session_id}/status", response_model=StatusUpdateResponse, dependencies=[Depends(require_staff)])
def update_status(
    session_id: str,
    request: StatusUpdateRequest,
    service: LibraryService = Depends(get_service),
):
    return service.update_status(session_id, request)


@router.post("/sessions/expire-overdue", dependencies=[Depends(require_staff)])
def expire_overdue(service: LibraryService = Depends(get_service)):
    return service.expire_overdue()


# ----------------------------- Bag Check ------------------------------


@router.get("/bags", response_model=list[BagResponse], dependencies=[Depends(require_staff)])
def active_bags(service: LibraryService = Depends(get_service)):
    return service.get_active_bags()


@router.patch("/sessions/{session_id}/bag", response_model=BagResponse, dependencies=[Depends(require_staff)])
def update_bag(
    session_id: str,
    request: BagUpdateRequest,
    service: LibraryService = Depends(get_service),
):
    return service.update_bag(session_id, request.bag_number)


# ------------------------------- Audit --------------------------------


@router.get("/events", response_model=list[SessionEventResponse], dependencies=[Depends(require_staff)])
def events(
    session_id: str | None = Query(default=None),
    service: LibraryService = Depends(get_service),
):
    return service.get_events(session_id)


# ----------------------------- Analytics ------------------------------


@router.get("/analytics/hourly", response_model=list[HourlyOccupancyRow], dependencies=[Depends(require_staff)])
def hourly_analytics(
    report_date: date = Query(..., alias="date"),
    service: LibraryService = Depends(get_service),
):
    return service.hourly_occupancy(report_date)


@router.get("/analytics/daily", response_model=list[DailyTotalsRow], dependencies=[Depends(require_staff)])
def daily_analytics(
    start: date,
    end: date,
    service: LibraryService = Depends(get_service),
):
    return service.daily_totals(start, end)


@router.get("/analytics/average-stay", response_model=AverageStayResponse, dependencies=[Depends(require_staff)])
def average_stay(
    start: date,
    end: date,
    service: LibraryService = Depends(get_service),
):
    return service.average_stay(start, end)


# ------------------------- Daily Visit Totals -------------------------


@router.post("/daily-totals/{report_date}", response_model=SaveDailyTotalResponse, dependencies=[Depends(require_staff)])
def save_daily_total(
    report_date: date,
    service: LibraryService = Depends(get_service),
):
    return service.save_daily_total(report_date)


# ------------------------------- Staff --------------------------------
# Head librarians only. Sign in as a head librarian to manage the staff list.


@router.get("/staff", response_model=list[StaffResponse], dependencies=[Depends(require_head_librarian)])
def list_staff(service: LibraryService = Depends(get_service)):
    return service.list_staff()


@router.post("/staff", response_model=StaffResponse, status_code=201, dependencies=[Depends(require_head_librarian)])
def add_staff(
    request: StaffCreateRequest,
    service: LibraryService = Depends(get_service),
):
    return service.add_staff(request.user_id, request.role)


@router.delete("/staff/{user_id}", dependencies=[Depends(require_head_librarian)])
def remove_staff(user_id: str, service: LibraryService = Depends(get_service)):
    return service.remove_staff(user_id)


@router.get("/health")
def library_health():
    return {"status": "ok", "service": "library"}
