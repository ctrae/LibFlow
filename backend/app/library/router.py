from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.infrastructure.supabase_repository import SupabaseLibraryRepository
from app.library.models import LibrarySession, StaffProfile
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


@router.get("/profile", response_model=StaffProfile)
async def get_current_profile(
    repository: Annotated[
        SupabaseLibraryRepository,
        Depends(get_authenticated_repository),
    ],
) -> StaffProfile:
    if repository.staff_profile is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to load the signed-in profile.",
        )
    return repository.staff_profile


@router.get("/admin/bag-claims", response_model=list[LibrarySession])
async def list_bag_claims(
    service: Annotated[BagCheckService, Depends(get_bag_check_service)],
) -> list[LibrarySession]:
    return await service.list_bag_claims()


@router.post("/admin/bag-claims/{session_id}/verify", response_model=LibrarySession)
async def verify_bag_claim(
    session_id: UUID,
    service: Annotated[BagCheckService, Depends(get_bag_check_service)],
) -> LibrarySession:
    return await service.verify_handoff(session_id)
