from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Ticket to Ride API"
    app_version: str = "0.1.0"
    database_url: str = "sqlite:///./ticketstoride.db"
    auth_cookie_name: str = "ttr_auth_token"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    auth_cookie_max_age_seconds: int = 60 * 60 * 24 * 7

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

