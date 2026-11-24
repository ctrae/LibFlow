import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.library.errors import (
    AuthenticationError,
    AuthorizationError,
    SessionNotFoundError,
    SupabaseServiceError,
)
from app.library.router import router as bag_checks_router

app = FastAPI(title="LibFlow API", version="0.1.0")
app.include_router(bag_checks_router)

frontend_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:3000,http://localhost:5173",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(AuthenticationError)
async def authentication_error(_: Request, error: AuthenticationError) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"detail": str(error)},
        headers={"WWW-Authenticate": "Bearer"},
    )


@app.exception_handler(AuthorizationError)
async def authorization_error(_: Request, error: AuthorizationError) -> JSONResponse:
    return JSONResponse(status_code=403, content={"detail": str(error)})


@app.exception_handler(SessionNotFoundError)
async def not_found_error(_: Request, error: SessionNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(error)})


@app.exception_handler(SupabaseServiceError)
async def supabase_error(_: Request, error: SupabaseServiceError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": str(error)})


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
