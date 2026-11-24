from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from app.library.errors import SupabaseServiceError


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_publishable_key: str
    frontend_origins: tuple[str, ...]


@lru_cache
def get_settings() -> Settings:
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    if not supabase_url or not publishable_key:
        raise SupabaseServiceError(
            "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY before starting the backend."
        )

    origins = os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://localhost:5173",
    )
    return Settings(
        supabase_url=supabase_url,
        supabase_publishable_key=publishable_key,
        frontend_origins=tuple(origin.strip() for origin in origins.split(",") if origin.strip()),
    )
