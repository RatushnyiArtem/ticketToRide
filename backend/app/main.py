from fastapi import FastAPI

from ticketToRide.backend.app.api.router import api_router
from ticketToRide.backend.app.core.config import settings
from ticketToRide.backend.app.db.session import init_db

app = FastAPI(title=settings.app_name, version=settings.app_version)
app.include_router(api_router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health", tags=["health"])
def healthcheck():
    return {"status": "ok"}

