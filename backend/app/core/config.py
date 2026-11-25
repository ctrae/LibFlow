from functools import lru_cache
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    frontend_url: str = Field(
        default="http://localhost:3000",
        validation_alias=AliasChoices("frontend_url", "FRONTEND_URL", "FRONTEND_ORIGINS"),
    )
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Check-in is only allowed while the library is open. Jamaica has no
    # daylight saving, so a fixed UTC offset is enough.
    # Set ENFORCE_OPENING_HOURS=false in .env to test or demo outside hours.
    enforce_opening_hours: bool = True
    library_open_time: str = "08:30"
    library_close_time: str = "20:00"
    library_utc_offset_hours: int = -5

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
