from __future__ import annotations

from uuid import UUID

from app.library.errors import SessionNotFoundError
from app.library.models import LibrarySession, SessionStatus, Zone
from app.library.repository import LibraryRepository


class BagCheckService:
    def __init__(self, repository: LibraryRepository) -> None:
        self._repository = repository

    async def list_bag_claims(self) -> list[LibrarySession]:
        sessions = await self._repository.list_sessions()
        return [
            session
            for session in sessions
            if (
                session.bag_amount > 0
                or session.baggage_info.strip().casefold() != "no bag declared"
            )
        ]

    async def verify_handoff(self, session_id: UUID) -> LibrarySession:
        claims = await self.list_bag_claims()
        session = next(
            (claim for claim in claims if claim.session_id == session_id),
            None,
        )
        if session is None:
            raise SessionNotFoundError("Bag claim not found.")
        if session.session_status == SessionStatus.exited:
            return session

        return await self._repository.update_session_status(
            session_id=session.session_id,
            zone=session.zone or Zone.main,
            status=SessionStatus.exited,
        )
