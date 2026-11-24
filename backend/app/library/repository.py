from __future__ import annotations

from typing import Protocol
from uuid import UUID

from app.library.models import LibrarySession, SessionStatus, Zone


class LibraryRepository(Protocol):
    async def authenticate_approved_staff(self) -> None: ...

    async def list_sessions(self) -> list[LibrarySession]: ...

    async def update_session_status(
        self,
        session_id: UUID,
        zone: Zone,
        status: SessionStatus,
    ) -> LibrarySession: ...
