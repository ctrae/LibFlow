from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.infrastructure.supabase_repository import SupabaseLibraryRepository
from app.library.schemas import LibrarySessionResponse, StaffProfileResponse
from app.library.service import BagCheckService

router = APIRouter(prefix="/library", tags=["bag checks"])
bearer_scheme = HTTPBearer(auto_error=False)


async def get_authenticated_repository(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SupabaseLibraryRepository:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A Supabase access token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    repository = SupabaseLibraryRepository(settings, credentials.credentials)
    await repository.authenticate_user()
    return repository


async def get_repository(
    repository: Annotated[
        SupabaseLibraryRepository,
        Depends(get_authenticated_repository),
    ],
) -> SupabaseLibraryRepository:
    await repository.authenticate_approved_staff()
    return repository


def get_bag_check_service(
    repository: Annotated[SupabaseLibraryRepository, Depends(get_repository)],
) -> BagCheckService:
    return BagCheckService(repository)


@router.get("/profile", response_model=StaffProfileResponse)
async def get_current_profile(
    repository: Annotated[
        SupabaseLibraryRepository,
        Depends(get_authenticated_repository),
    ],
) -> StaffProfileResponse:
    if repository.staff_profile is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to load the signed-in profile.",
        )
    return StaffProfileResponse.from_domain(repository.staff_profile)


@router.get("/admin/bag-claims", response_model=list[LibrarySessionResponse])
async def list_bag_claims(
    service: Annotated[BagCheckService, Depends(get_bag_check_service)],
) -> list[LibrarySessionResponse]:
    sessions = await service.list_bag_claims()
    return [LibrarySessionResponse.from_domain(session) for session in sessions]


@router.post(
    "/admin/bag-claims/{session_id}/verify",
    response_model=LibrarySessionResponse,
)
async def verify_bag_claim(
    session_id: UUID,
    service: Annotated[BagCheckService, Depends(get_bag_check_service)],
) -> LibrarySessionResponse:
    session = await service.verify_handoff(session_id)
    return LibrarySessionResponse.from_domain(session)
