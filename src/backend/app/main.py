from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.backend.app.campus.router import router as campus_router
from src.backend.app.library.router import router as library_router

app = FastAPI(title="LibFlow API", version="0.1.0")
app.include_router(campus_router)
app.include_router(library_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
