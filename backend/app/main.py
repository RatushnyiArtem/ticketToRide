from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.db.session import init_db

app = FastAPI(title=settings.app_name, version=settings.app_version)
app.include_router(api_router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health", tags=["health"])
def healthcheck():
    return {"status": "ok"}

