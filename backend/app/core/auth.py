"""Staff authentication for the LIBFLOW API.

Staff sign in with Supabase Auth in the frontend and send the resulting access
token as `Authorization: Bearer <token>`. The API checks the token with
Supabase and then confirms the user is listed in the `staff` table.

Students are not logged in, so the student routes (check-in, check-out) do not
use these dependencies.
"""

import logging

from fastapi import Depends, Header, HTTPException
from supabase_auth.errors import AuthApiError

from app.database.supabase import get_supabase
from app.library.repository import LibraryRepository


logger = logging.getLogger("uvicorn.error")


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """Return the Supabase user id for a valid bearer token, or raise 401."""
    if not authorization:
        raise _unauthorized("Sign in required.")

    scheme, _, token = authorization.partition(" ")
    token = token.strip()
    if scheme.lower() != "bearer" or not token:
        raise _unauthorized("Sign in required.")

    # Only a rejected token means "signed out". A network hiccup or Supabase
    # outage must not return 401, or the frontend sends staff to the login page.
    try:
        response = get_supabase().auth.get_user(token)
        user = response.user if response else None
    except AuthApiError as error:
        logger.warning("Supabase rejected staff token: %s %s", error.status, error)
        if error.status and error.status >= 500:
            raise HTTPException(status_code=503, detail="Sign-in service unavailable. Please try again.")
        user = None
    except Exception:
        logger.exception("Could not verify staff token with Supabase")
        raise HTTPException(status_code=503, detail="Sign-in service unavailable. Please try again.")

    if user is None:
        raise _unauthorized("Your session has expired. Please sign in again.")
    return str(user.id)


def _load_staff(user_id: str):
    return LibraryRepository(get_supabase()).get_staff_member(user_id)


def require_staff(user_id: str = Depends(get_current_user_id)) -> dict:
    """Allow library staff and head librarians. Raises 403 for anyone else."""
    member = _load_staff(user_id)
    if not member:
        raise HTTPException(status_code=403, detail="Staff access only.")
    return {"user_id": user_id, "role": member["role"]}


def require_head_librarian(staff: dict = Depends(require_staff)) -> dict:
    """Allow head librarians only (used for managing the staff list)."""
    if staff["role"] != "head_librarian":
        raise HTTPException(status_code=403, detail="Head librarian access only.")
    return staff
