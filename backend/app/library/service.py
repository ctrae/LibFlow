from __future__ import annotations

from uuid import UUID

from app.library.errors import SessionNotFoundError
from app.library.models import LibrarySession
from app.library.repository import LibraryRepository


class BagCheckService:
    def __init__(self, repository: LibraryRepository) -> None:
        self._repository = repository

    async def list_bag_claims(self) -> list[LibrarySession]:
        sessions = await self._repository.list_sessions()
        return [
            session
            for session in sessions
            if session.baggage_info.strip().casefold() != "no bag declared"
        ]

    async def verify_handoff(self, session_id: UUID) -> LibrarySession:
        claims = await self.list_bag_claims()
        session = next((claim for claim in claims if claim.id == session_id), None)
        if session is None:
            raise SessionNotFoundError("Bag claim not found.")
        if session.status == "exited":
            return session

        return await self._repository.update_session_status(
            session_id=session.id,
            zone=session.zone or "Main section",
            status="exited",
        )
