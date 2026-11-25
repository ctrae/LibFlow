import secrets
from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException

from app.core.config import Settings, get_settings
from app.library.repository import LibraryRepository
from app.library.schemas import (
    CheckInRequest,
    CheckOutRequest,
    StatusUpdateRequest,
)


class LibraryService:
    """LIBFLOW business rules. No direct database calls live here."""

    def __init__(self, repository: LibraryRepository, settings: Settings | None = None):
        self.repository = repository
        self.settings = settings or get_settings()

    def is_library_open(self, now_utc: datetime) -> bool:
        """True if check-in is allowed at this moment (SR-01: opening hours only)."""
        s = self.settings
        if not s.enforce_opening_hours:
            return True
        local = now_utc.astimezone(timezone(timedelta(hours=s.library_utc_offset_hours)))
        opens = time.fromisoformat(s.library_open_time)
        closes = time.fromisoformat(s.library_close_time)
        return opens <= local.time() < closes

    def check_in(self, request: CheckInRequest, now: datetime | None = None, staff_override: bool = False):
        """Register a visit. `staff_override` (staff route only) skips the
        opening-hours rule; the one-active-session and bag rules still apply."""
        now = now or datetime.now(timezone.utc)

        if not staff_override and not self.is_library_open(now):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Check-in is only available during library opening hours "
                    f"({self.settings.library_open_time} to {self.settings.library_close_time})."
                ),
            )

        if self.repository.find_active_session(request.student_id):
            raise HTTPException(
                status_code=409,
                detail="Student already has an active library session.",
            )

        expires_at = now + timedelta(minutes=request.allotted_minutes)
        # Bag check is for the Main section only; Basement students keep their bags.
        wants_bag = request.zone == "Main" and (request.checking_bag or bool(request.bag_number))
        tried: set[str] = set()

        # Two students checking in at once can draw the same free bag; the
        # database's unique index rejects the second, so draw again.
        for attempt in range(3):
            bag_number = self.pick_free_bag_number(exclude=tried) if wants_bag else None
            try:
                session = self.repository.create_session(
                    {
                        "student_id": request.student_id,
                        "student_email": str(request.student_email).lower(),
                        "check_in": now.isoformat(),
                        "allotted_minutes": request.allotted_minutes,
                        "zone": request.zone,
                        "bag_number": bag_number,
                        "visit_reason": request.visit_reason,
                        "status": "active",
                    }
                )
                break
            except Exception as exc:
                if bag_number and attempt < 2:
                    tried.add(bag_number)
                    continue
                # The database unique indexes remain the final race-condition guard.
                raise HTTPException(
                    status_code=409,
                    detail=f"Could not create session. It may conflict with an active session or bag: {exc}",
                ) from exc

        return {
            "session_id": session["id"],
            "student_id": session["student_id"],
            "check_in": session["check_in"],
            "expires_at": expires_at,
            "status": "active",
            "bag_number": session.get("bag_number"),
        }

    def pick_free_bag_number(self, exclude: set[str] = frozenset()) -> str:
        """A random bag tag (BAG-001 … BAG-<bag_count>) not held by an active session."""
        held = {b["bag_number"] for b in self.repository.list_active_bags()} | set(exclude)
        free = [
            tag
            for n in range(1, self.settings.bag_count + 1)
            if (tag := f"BAG-{n:03d}") not in held
        ]
        if not free:
            raise HTTPException(
                status_code=409,
                detail=(
                    "All bag numbers for the Main section are in use. "
                    "Please check in to the Basement instead."
                ),
            )
        return secrets.choice(free)

    def checkout(self, session_id: str):
        session = self.repository.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")
        if session["status"] != "active":
            raise HTTPException(status_code=409, detail="Session is no longer active.")

        now = datetime.now(timezone.utc).isoformat()
        updated = self.repository.update_session(
            session_id,
            {"check_out": now, "status": "exited"},
        )
        if not updated:
            raise HTTPException(status_code=409, detail="Session could not be checked out.")

        return {
            "session_id": updated["id"],
            "student_id": updated["student_id"],
            "check_out": updated["check_out"],
            "status": "exited",
        }

    def checkout_by_student(self, request: CheckOutRequest):
        if not request.student_id or not request.student_email:
            raise HTTPException(
                status_code=400,
                detail="student_id and student_email are required for student checkout.",
            )

        result = self.repository.rpc(
            "student_check_out",
            {
                "p_student_id": request.student_id,
                "p_email": str(request.student_email).lower(),
            },
        )
        if result.data is not True:
            raise HTTPException(
                status_code=404,
                detail="No matching active session was found.",
            )

        # The RPC has closed the active session, so fetch recent rows instead.
        recent = self.repository.get_student_active_or_recent(request.student_id, limit=1)
        if not recent:
            raise HTTPException(status_code=404, detail="Checkout completed but session could not be read.")

        closed = recent[0]
        return {
            "session_id": closed["id"],
            "student_id": closed["student_id"],
            "check_out": closed["check_out"],
            "status": "exited",
        }

    def get_session(self, session_id: str):
        session = self.repository.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")
        return session

    def get_sessions(self, status: str | None = None):
        if status and status not in {"active", "exited", "expired"}:
            raise HTTPException(status_code=400, detail="Invalid session status.")
        return self.repository.list_sessions(status)

    def occupancy(self):
        return {"occupancy": self.repository.count_active_sessions()}

    def update_status(self, session_id: str, request: StatusUpdateRequest):
        session = self.repository.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")

        payload = {"status": request.status}
        if request.status == "exited" and not session.get("check_out"):
            payload["check_out"] = datetime.now(timezone.utc).isoformat()

        updated = self.repository.update_session(session_id, payload)
        if not updated:
            raise HTTPException(status_code=409, detail="Session status could not be updated.")

        return {
            "session_id": updated["id"],
            "status": updated["status"],
            "updated": True,
        }

    def expire_overdue(self):
        result = self.repository.rpc("expire_overdue_sessions")
        return {"expired_count": int(result.data or 0)}

    def get_active_bags(self):
        # Sessions use `id`; the API exposes it as `session_id`.
        return [
            {**row, "session_id": row["id"]}
            for row in self.repository.list_active_bags()
        ]

    def update_bag(self, session_id: str, bag_number: str | None):
        session = self.repository.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")
        if session["status"] != "active":
            raise HTTPException(status_code=409, detail="Only active sessions can have a bag assigned.")
        if bag_number and session.get("zone") == "Basement":
            raise HTTPException(status_code=409, detail="Basement students keep their bags; bag check is for the Main section only.")

        try:
            updated = self.repository.update_session(
                session_id,
                {"bag_number": bag_number},
            )
        except Exception as exc:
            raise HTTPException(
                status_code=409,
                detail=f"Bag number is already in use or invalid: {exc}",
            ) from exc

        return {
            "session_id": updated["id"],
            "student_id": updated["student_id"],
            "bag_number": updated["bag_number"],
            "status": updated["status"],
        }

    def get_events(self, session_id: str | None = None):
        if session_id and not self.repository.get_session(session_id):
            raise HTTPException(status_code=404, detail="Session not found.")
        return self.repository.list_events(session_id)

    def hourly_occupancy(self, report_date: date):
        result = self.repository.rpc(
            "report_hourly_occupancy",
            {"p_date": report_date.isoformat()},
        )
        return result.data or []

    def daily_totals(self, start: date, end: date):
        if end < start:
            raise HTTPException(status_code=400, detail="End date must be on or after start date.")
        result = self.repository.rpc(
            "report_daily_totals",
            {"p_start": start.isoformat(), "p_end": end.isoformat()},
        )
        return result.data or []

    def average_stay(self, start: date, end: date):
        if end < start:
            raise HTTPException(status_code=400, detail="End date must be on or after start date.")
        result = self.repository.rpc(
            "report_average_stay",
            {"p_start": start.isoformat(), "p_end": end.isoformat()},
        )
        rows = result.data or []
        row = rows[0] if rows else {"avg_stay_minutes": 0, "completed_visits": 0}
        return row

    def save_daily_total(self, report_date: date):
        result = self.repository.rpc(
            "save_daily_total",
            {"p_day": report_date.isoformat()},
        )
        return result.data

    def list_staff(self):
        return self.repository.list_staff()

    def add_staff(self, user_id: str, role: str):
        try:
            return self.repository.add_staff(user_id, role)
        except Exception as exc:
            raise HTTPException(status_code=409, detail=f"Could not add staff member: {exc}") from exc

    def remove_staff(self, user_id: str):
        self.repository.remove_staff(user_id)
        return {"removed": True, "user_id": user_id}

    def student_history(self, student_id: str):
        if not student_id.isdigit() or len(student_id) != 9:
            raise HTTPException(status_code=400, detail="Student ID must contain exactly 9 digits.")
        return self.repository.get_student_active_or_recent(student_id, limit=50)
