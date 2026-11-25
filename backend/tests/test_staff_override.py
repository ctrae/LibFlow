"""Staff override check-in: staff can register a visit outside opening hours.

Run from the backend folder:  pytest
Reuses the in-memory fake repository and helpers from test_backend.py.
"""

import pytest
from fastapi import HTTPException

from app.core import auth
from app.library.router import get_service
from main import app
from tests.test_backend import CLOSED_TIME, client, make_service, valid_request  # noqa: F401

STAFF_CHECK_IN_BODY = {
    "student_id": "620123456",
    "student_email": "a.b@mymona.uwi.edu",
    "allotted_minutes": 90,
}


def test_staff_override_allows_check_in_outside_opening_hours():
    svc = make_service()
    result = svc.check_in(valid_request(), now=CLOSED_TIME, staff_override=True)
    assert result["status"] == "active"
    assert svc.occupancy() == {"occupancy": 1}


def test_staff_override_still_rejects_duplicate_session():
    svc = make_service()
    svc.check_in(valid_request(), now=CLOSED_TIME, staff_override=True)
    with pytest.raises(HTTPException) as err:
        svc.check_in(valid_request(), now=CLOSED_TIME, staff_override=True)
    assert err.value.status_code == 409


def test_staff_check_in_route_requires_sign_in(client):  # noqa: F811
    response = client.post("/library/staff/check-in", json=STAFF_CHECK_IN_BODY)
    assert response.status_code == 401


def test_staff_check_in_route_rejects_non_staff(client, monkeypatch):  # noqa: F811
    app.dependency_overrides[auth.get_current_user_id] = lambda: "u1"
    monkeypatch.setattr(auth, "_load_staff", lambda user_id: None)
    response = client.post(
        "/library/staff/check-in", json=STAFF_CHECK_IN_BODY, headers={"Authorization": "Bearer t"}
    )
    assert response.status_code == 403


def test_staff_check_in_route_skips_opening_hours(client, monkeypatch):  # noqa: F811
    # Force "closed" so only the override lets this through, whatever time the tests run.
    app.dependency_overrides[auth.get_current_user_id] = lambda: "u1"
    monkeypatch.setattr(auth, "_load_staff", lambda user_id: {"role": "library_staff"})
    svc = make_service()
    monkeypatch.setattr(svc, "is_library_open", lambda now: False)
    app.dependency_overrides[get_service] = lambda: svc
    response = client.post(
        "/library/staff/check-in", json=STAFF_CHECK_IN_BODY, headers={"Authorization": "Bearer t"}
    )
    assert response.status_code == 201
    assert response.json()["status"] == "active"
