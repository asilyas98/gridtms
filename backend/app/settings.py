from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return ["*"]
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "GridTMS Secure Backend")
    app_env: str = os.getenv("APP_ENV", "local")
    cors_origins: list[str] = None

    supabase_db_url: str | None = os.getenv("SUPABASE_DB_URL")
    supabase_url: str | None = os.getenv("SUPABASE_URL")
    supabase_anon_key: str | None = os.getenv("SUPABASE_ANON_KEY")
    supabase_service_role_key: str | None = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    require_carrier_verification: bool = os.getenv("REQUIRE_CARRIER_VERIFICATION", "true").lower() == "true"
    carrier_verification_mode: str = os.getenv("CARRIER_VERIFICATION_MODE", "manual").lower()
    dot_provider_api_url: str | None = os.getenv("DOT_PROVIDER_API_URL") or None
    dot_provider_api_key: str | None = os.getenv("DOT_PROVIDER_API_KEY") or None

    def __post_init__(self):
        object.__setattr__(self, "cors_origins", _split_csv(os.getenv("CORS_ORIGINS")))


settings = Settings()
