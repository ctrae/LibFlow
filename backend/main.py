from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.library.router import router as library_router


settings = get_settings()

app = FastAPI(
    title="LIBFLOW API",
    version="2.0.0",
    description="FastAPI backend for the LIBFLOW library occupancy and visit-tracking system.",
)

origins = [
    origin.strip()
    for origin in settings.frontend_url.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(library_router)


@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "service": "libflow-api",
        "version": "2.0.0",
    }
