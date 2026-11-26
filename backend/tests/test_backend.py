"""Backend tests: business rules, validation and staff access control.

Run from the backend folder:  pytest
No database is needed. The repository is replaced by an in-memory fake.
"""

from datetime import date, datetime, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from types import SimpleNamespace

from app.core import auth
from app.core.config import Settings
from app.library.router import get_service
from app.library.schemas import CheckInRequest
from app.library.service import LibraryService
from main import app

# 10:00 and 20:00 Jamaica time (UTC-5) on a weekday
OPEN_TIME = datetime(2026, 11, 25, 15, 0, tzinfo=timezone.utc)
CLOSED_TIME = datetime(2026, 11, 26, 1, 0, tzinfo=timezone.utc)


class FakeRepository:
    def __init__(self):
        self.sessions = []
        self.rpc_calls = []

    def rpc(self, function_name, params):
        self.rpc_calls.append((function_name, params))

        responses = {
            "report_hourly_occupancy": [
                {
                    "hour_label": "8:30 AM",
                    "students_present": 2,
                    "check_ins": 1,
                    "check_outs": 0,
                }
            ],
            "report_daily_totals": [
                {
                    "visit_date": "2026-11-20",
                    "total_visits": 1,
                    "unique_students": 1,
                }
            ],
            "report_average_stay": [
                {
                    "avg_stay_minutes": 5.1,
                    "completed_visits": 1,
                }
            ],
            "report_total_checkouts": [
                {"total_checkouts": 1}
            ],
        }

        return SimpleNamespace(data=responses[function_name])

    def find_active_session(self, student_id):
        return next(
            (s for s in self.sessions if s["student_id"] == student_id and s["status"] == "active"),
            None,
        )

    def create_session(self, payload):
        row = {**payload, "id": f"s{len(self.sessions) + 1}"}
        self.sessions.append(row)
        return row

    def count_active_sessions(self):
        return sum(1 for s in self.sessions if s["status"] == "active")

    def list_active_bags(self):
        return [
            {k: s[k] for k in ("id", "student_id", "bag_number", "status", "check_in")}
            for s in self.sessions
            if s["status"] == "active" and s.get("bag_number")
        ]


def make_settings(**overrides):
    return Settings(
        supabase_url="http://x", supabase_service_role_key="k", _env_file=None, **overrides
    )


def make_service(**setting_overrides):
    return LibraryService(FakeRepository(), make_settings(**setting_overrides))


def test_settings_accept_frontend_origins_alias(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "http://x")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "k")
    monkeypatch.setenv("FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

    settings = Settings(_env_file=None)

    assert settings.frontend_url == "http://localhost:3000,http://127.0.0.1:3000"


def valid_request(**overrides):
    data = dict(student_id="620123456", student_email="a.b@mymona.uwi.edu", allotted_minutes=30)
    data.update(overrides)
    return CheckInRequest(**data)


# ------------------------------ validation ------------------------------


@pytest.mark.parametrize("minutes", [15, 30, 45, 60, 90, 480])
def test_duration_accepts_15_to_480(minutes):
    assert valid_request(allotted_minutes=minutes).allotted_minutes == minutes


@pytest.mark.parametrize("minutes", [0, 14, 481, 1000])
def test_duration_rejects_out_of_range(minutes):
    with pytest.raises(ValidationError):
        valid_request(allotted_minutes=minutes)


@pytest.mark.parametrize("email", ["a@gmail.com", "a@uwi.edu", "not-an-email"])
def test_rejects_non_mymona_email(email):
    with pytest.raises(ValidationError):
        valid_request(student_email=email)


@pytest.mark.parametrize("student_id", ["12345678", "1234567890", "12345678a"])
def test_rejects_bad_student_id(student_id):
    with pytest.raises(ValidationError):
        valid_request(student_id=student_id)


# ------------------------------ check-in rules ------------------------------


def test_check_in_creates_active_session():
    svc = make_service()
    result = svc.check_in(valid_request(), now=OPEN_TIME)
    assert result["status"] == "active"
    assert svc.occupancy() == {"occupancy": 1}


def test_first_check_in_works_when_no_session_exists():
    # Regression: the lookup for an existing session returns None here.
    svc = make_service()
    assert svc.repository.find_active_session("620123456") is None
    assert svc.check_in(valid_request(), now=OPEN_TIME)["student_id"] == "620123456"


def test_duplicate_check_in_is_rejected():
    svc = make_service()
    svc.check_in(valid_request(), now=OPEN_TIME)
    with pytest.raises(HTTPException) as err:
        svc.check_in(valid_request(), now=OPEN_TIME)
    assert err.value.status_code == 409


def test_check_in_rejected_outside_opening_hours():
    svc = make_service()
    with pytest.raises(HTTPException) as err:
        svc.check_in(valid_request(), now=CLOSED_TIME)
    assert err.value.status_code == 403
    assert "opening hours" in err.value.detail
    assert svc.occupancy() == {"occupancy": 0}


def test_check_in_allowed_outside_hours_when_switch_is_off():
    svc = make_service(enforce_opening_hours=False)
    assert svc.check_in(valid_request(), now=CLOSED_TIME)["status"] == "active"


def test_opening_boundaries():
    svc = make_service()
    # 08:30 local = 13:30 UTC (open); 08:29 = 13:29 (closed); 18:00 = 23:00 (closed)
    assert svc.is_library_open(datetime(2026, 11, 25, 13, 30, tzinfo=timezone.utc))
    assert not svc.is_library_open(datetime(2026, 11, 25, 13, 29, tzinfo=timezone.utc))
    assert svc.is_library_open(datetime(2026, 11, 25, 22, 59, tzinfo=timezone.utc))
    assert not svc.is_library_open(datetime(2026, 11, 25, 23, 0, tzinfo=timezone.utc))


# ------------------------------ staff access ------------------------------

STAFF_ROUTES = [
    ("get", "/library/occupancy"),
    ("get", "/library/sessions"),
    ("get", "/library/students/620123456/sessions"),
    ("patch", "/library/sessions/abc/status"),
    ("post", "/library/sessions/expire-overdue"),
    ("get", "/library/bags"),
    ("patch", "/library/sessions/abc/bag"),
    ("get", "/library/events"),
    ("get", "/library/analytics/hourly?date=2026-11-25"),
    ("get", "/library/analytics/daily?start=2026-11-01&end=2026-11-25"),
    ("get", "/library/analytics/average-stay?start=2026-11-01&end=2026-11-25"),
    ("get", "/library/analytics/total-checkouts?start=2026-11-01&end=2026-11-25"),
    ("post", "/library/daily-totals/2026-11-25"),
    ("get", "/library/staff"),
    ("post", "/library/staff"),
    ("delete", "/library/staff/some-user"),
]


@pytest.fixture
def client():
    app.dependency_overrides.clear()
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.mark.parametrize("method,path", STAFF_ROUTES)
def test_staff_routes_require_sign_in(client, method, path):
    response = getattr(client, method)(path)
    assert response.status_code == 401


@pytest.mark.parametrize("method,path", STAFF_ROUTES)
def test_staff_routes_reject_signed_in_non_staff(client, monkeypatch, method, path):
    app.dependency_overrides[auth.get_current_user_id] = lambda: "u1"
    monkeypatch.setattr(auth, "_load_staff", lambda user_id: None)
    response = getattr(client, method)(path, headers={"Authorization": "Bearer t"})
    assert response.status_code == 403


def test_staff_member_can_read_occupancy(client, monkeypatch):
    app.dependency_overrides[auth.get_current_user_id] = lambda: "u1"
    monkeypatch.setattr(auth, "_load_staff", lambda user_id: {"role": "library_staff"})
    app.dependency_overrides[get_service] = lambda: make_service()
    response = client.get("/library/occupancy", headers={"Authorization": "Bearer t"})
    assert response.status_code == 200
    assert response.json() == {"occupancy": 0}

def test_library_staff_can_read_analytics_reports(client, monkeypatch):
    app.dependency_overrides[auth.get_current_user_id] = lambda: "u1"
    monkeypatch.setattr(auth, "_load_staff", lambda user_id: {"role": "library_staff"})

    svc = make_service()
    app.dependency_overrides[get_service] = lambda: svc
    headers = {"Authorization": "Bearer t"}

    hourly = client.get(
        "/library/analytics/hourly?date=2026-11-20",
        headers=headers,
    )
    daily = client.get(
        "/library/analytics/daily?start=2026-11-17&end=2026-11-23",
        headers=headers,
    )
    average = client.get(
        "/library/analytics/average-stay?start=2026-11-17&end=2026-11-23",
        headers=headers,
    )
    checkouts = client.get(
        "/library/analytics/total-checkouts?start=2026-11-17&end=2026-11-23",
        headers=headers,
    )

    assert hourly.status_code == 200
    assert hourly.json() == [
        {
            "hour_label": "8:30 AM",
            "students_present": 2,
            "check_ins": 1,
            "check_outs": 0,
        }
    ]

    assert daily.status_code == 200
    assert daily.json() == [
        {
            "visit_date": "2026-11-20",
            "total_visits": 1,
            "unique_students": 1,
        }
    ]

    assert average.status_code == 200
    assert average.json() == {
        "avg_stay_minutes": 5.1,
        "completed_visits": 1,
    }

    assert checkouts.status_code == 200
    assert checkouts.json() == {"total_checkouts": 1}

    assert svc.repository.rpc_calls == [
        ("report_hourly_occupancy", {"p_date": "2026-11-20"}),
        ("report_daily_totals", {"p_start": "2026-11-17", "p_end": "2026-11-23"}),
        ("report_average_stay", {"p_start": "2026-11-17", "p_end": "2026-11-23"}),
        ("report_total_checkouts", {"p_start": "2026-11-17", "p_end": "2026-11-23"}),
    ]

def test_library_staff_cannot_manage_staff_list(client, monkeypatch):
    app.dependency_overrides[auth.get_current_user_id] = lambda: "u1"
    monkeypatch.setattr(auth, "_load_staff", lambda user_id: {"role": "library_staff"})
    response = client.get("/library/staff", headers={"Authorization": "Bearer t"})
    assert response.status_code == 403


def test_head_librarian_passes_head_check(client, monkeypatch):
    app.dependency_overrides[auth.get_current_user_id] = lambda: "u1"
    monkeypatch.setattr(auth, "_load_staff", lambda user_id: {"role": "head_librarian"})
    staff = auth.require_staff(user_id="u1")
    assert auth.require_head_librarian(staff)["role"] == "head_librarian"


def test_bad_token_is_rejected(client, monkeypatch):
    class FakeAuth:
        def get_user(self, token):
            raise RuntimeError("invalid jwt")

    class FakeClient:
        auth = FakeAuth()

    monkeypatch.setattr(auth, "get_supabase", lambda: FakeClient())
    response = client.get("/library/occupancy", headers={"Authorization": "Bearer nope"})
    assert response.status_code == 401


def test_malformed_authorization_header(client):
    response = client.get("/library/occupancy", headers={"Authorization": "Token abc"})
    assert response.status_code == 401


# ------------------------------ public routes ------------------------------


def test_check_in_route_is_public_and_validates(client):
    app.dependency_overrides[get_service] = lambda: make_service(enforce_opening_hours=False)
    ok = client.post(
        "/library/check-in",
        json={"student_id": "620123456", "student_email": "a.b@mymona.uwi.edu", "allotted_minutes": 90},
    )
    assert ok.status_code == 201
    bad = client.post(
        "/library/check-in",
        json={"student_id": "620123456", "student_email": "a@gmail.com", "allotted_minutes": 90},
    )
    assert bad.status_code == 422


def test_health_is_public(client):
    assert client.get("/health").status_code == 200


# ------------------------------ bag list ------------------------------


def test_bag_list_matches_api_shape(client, monkeypatch):
    # Regression: the query returns `id`, the API response requires `session_id`.
    svc = make_service(enforce_opening_hours=False)
    svc.check_in(valid_request(bag_number="B-12"), now=OPEN_TIME)
    app.dependency_overrides[auth.get_current_user_id] = lambda: "u1"
    monkeypatch.setattr(auth, "_load_staff", lambda user_id: {"role": "library_staff"})
    app.dependency_overrides[get_service] = lambda: svc
    response = client.get("/library/bags", headers={"Authorization": "Bearer t"})
    assert response.status_code == 200
    assert response.json()[0]["session_id"] == "s1"
    assert response.json()[0]["bag_number"] == "B-12"

# ------------------------- analytics date validation -------------------------


def test_report_range_accepts_past_dates():
    svc = make_service()
    svc._validate_report_range(date(2026, 11, 1), date(2026, 11, 20))


def test_report_range_rejects_future_dates():
    svc = make_service()

    with pytest.raises(HTTPException) as exc:
        svc._validate_report_range(date(2099, 1, 1), date(2099, 1, 1))

    assert exc.value.status_code == 400
    assert exc.value.detail == "Reports can only be generated for past or current dates."


def test_report_range_rejects_end_before_start():
    svc = make_service()

    with pytest.raises(HTTPException) as exc:
        svc._validate_report_range(date(2026, 11, 20), date(2026, 11, 1))

    assert exc.value.status_code == 400
    assert exc.value.detail == "End date must be on or after start date."
