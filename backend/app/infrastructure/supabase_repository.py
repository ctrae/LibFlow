from __future__ import annotations

from typing import Any
from uuid import UUID

import httpx

from app.core.config import Settings
from app.library.errors import (
    AuthenticationError,
    AuthorizationError,
    SessionNotFoundError,
    SupabaseServiceError,
)
from app.library.models import LibrarySession, StaffProfile


class SupabaseLibraryRepository:
    def __init__(
        self,
        settings: Settings,
        access_token: str,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._settings = settings
        self._access_token = access_token
        self._transport = transport
        self.staff_profile: StaffProfile | None = None

    async def authenticate_user(self) -> StaffProfile:
        user = await self._request("GET", "/auth/v1/user", authentication=True)
        user_id = user.get("id")
        if not user_id:
            raise AuthenticationError("The Supabase access token is invalid.")

        profiles = await self._request(
            "GET",
            "/rest/v1/users",
            params={
                "select": "user_id,email,full_name,user_type,is_approved",
                "auth_user_id": f"eq.{user_id}",
                "limit": "1",
            },
        )
        if not profiles:
            raise AuthorizationError("An approved library staff account is required.")

        profile_data = profiles[0]
        if profile_data.get("user_type") == "LibraryStaff":
            profile_data["user_type"] = "Library Staff"
        elif profile_data.get("user_type") == "HeadLibrarian":
            profile_data["user_type"] = "Head Librarian"
        self.staff_profile = StaffProfile.model_validate(profile_data)
        return self.staff_profile

    async def authenticate_approved_staff(self) -> None:
        profile = self.staff_profile or await self.authenticate_user()
        if (
            profile.user_type not in {"Head Librarian", "Library Staff"}
            or not profile.is_approved
        ):
            raise AuthorizationError("An approved library staff account is required.")

    async def list_sessions(self) -> list[LibrarySession]:
        rows = await self._request(
            "GET",
            "/rest/v1/library_sessions",
            params={
                "select": (
                    "id,user_id,name,email,student_id,short_code,duration_minutes,"
                    "baggage_info,zone,status,created_at,expires_at,updated_at"
                ),
                "order": "created_at.desc",
            },
        )
        return [LibrarySession.model_validate(row).auto_timeout() for row in rows]

    async def update_session_status(
        self,
        session_id: UUID,
        zone: str,
        status: str,
    ) -> LibrarySession:
        result = await self._request(
            "POST",
            "/rest/v1/rpc/update_library_session_status",
            json={
                "p_session_id": str(session_id),
                "p_zone": zone,
                "p_status": status,
            },
        )
        if isinstance(result, list):
            if not result:
                raise SessionNotFoundError("Library session not found.")
            result = result[0]
        if not isinstance(result, dict):
            raise SupabaseServiceError("Supabase returned an invalid session response.")
        return LibrarySession.model_validate(result).auto_timeout()

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json: dict[str, str] | None = None,
        authentication: bool = False,
    ) -> Any:
        headers = {
            "apikey": self._settings.supabase_publishable_key,
            "Authorization": f"Bearer {self._access_token}",
        }
        try:
            async with httpx.AsyncClient(
                base_url=self._settings.supabase_url,
                headers=headers,
                transport=self._transport,
                timeout=10.0,
            ) as client:
                response = await client.request(method, path, params=params, json=json)
        except httpx.HTTPError as error:
            raise SupabaseServiceError("Unable to reach Supabase.") from error

        if authentication and response.status_code in {401, 403}:
            raise AuthenticationError("The Supabase access token is invalid or expired.")
        if response.status_code == 401:
            raise AuthenticationError("The Supabase access token is invalid or expired.")
        if response.status_code == 403:
            raise AuthorizationError("Supabase denied access to this resource.")
        if response.status_code == 400 and path.endswith("update_library_session_status"):
            try:
                error_payload = response.json()
                message = (
                    error_payload.get("message")
                    if isinstance(error_payload, dict)
                    else None
                )
            except ValueError:
                message = None
            if message == "Library session not found.":
                raise SessionNotFoundError(message)
            if message == "An approved library staff account is required.":
                raise AuthorizationError(message)
        if response.status_code == 404 and path.endswith("update_library_session_status"):
            raise SessionNotFoundError("Library session not found.")
        if response.is_error:
            raise SupabaseServiceError(
                f"Supabase request failed with status {response.status_code}."
            )
        if response.status_code == 204 or not response.content:
            return None

        try:
            return response.json()
        except ValueError as error:
            raise SupabaseServiceError("Supabase returned an invalid response.") from error
