from fastapi.testclient import TestClient

from app.library.router import bag_claims, sessions
from app.main import app

client = TestClient(app)


def setup_function() -> None:
    sessions.clear()
    bag_claims.clear()


def register(baggage_info: str) -> dict:
    response = client.post(
        "/library/registrations",
        json={
            "name": "Student Example",
            "email": "student@mymona.uwi.edu",
            "student_id": "12345678",
            "duration_minutes": 60,
            "baggage_info": baggage_info,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_registration_creates_claim_and_verification_closes_session() -> None:
    session = register("Black backpack")

    claims_response = client.get("/library/admin/bag-claims")
    assert claims_response.status_code == 200
    claim = claims_response.json()[0]
    assert claim["bag_tag"]
    assert claim["status"] == "pending"
    assert claim["baggage_info"] == "Black backpack"

    verify_response = client.post(
        f"/library/admin/bag-claims/{session['id']}/verify",
    )
    assert verify_response.status_code == 200
    assert verify_response.json()["status"] == "verified"

    sessions_response = client.get("/library/admin/sessions")
    assert sessions_response.json()[0]["status"] == "exited"


def test_registration_without_bag_does_not_create_claim() -> None:
    register("No bag declared")

    response = client.get("/library/admin/bag-claims")

    assert response.status_code == 200
    assert response.json() == []


def test_registration_rejects_non_numeric_student_id() -> None:
    response = client.post(
        "/library/registrations",
        json={
            "name": "Student Example",
            "email": "student@mymona.uwi.edu",
            "student_id": "A123",
            "duration_minutes": 60,
            "baggage_info": "Backpack",
        },
    )

    assert response.status_code == 422
