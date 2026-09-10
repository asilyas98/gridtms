from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "local")
    cors_origins: list[str] = None  # type: ignore[assignment]

    supabase_url: str = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or ""
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_db_url: str = os.getenv("SUPABASE_DB_URL", "")

    business_verification_mode: str = os.getenv("BUSINESS_VERIFICATION_MODE", "manual")
    dot_provider_api_url: str = os.getenv("DOT_PROVIDER_API_URL", "")
    dot_provider_api_key: str = os.getenv("DOT_PROVIDER_API_KEY", "")

    otp_mode: str = os.getenv("OTP_MODE", "dev")
    otp_expiry_minutes: int = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))

    # Local/demo login. Keep true for development, set false in production.
    demo_login_enabled: bool = os.getenv("DEMO_LOGIN_ENABLED", "true").lower() == "true"
    demo_username: str = os.getenv("DEMO_USERNAME", "demo")
    demo_password: str = os.getenv("DEMO_PASSWORD", "demo")
    demo_token: str = os.getenv("DEMO_TOKEN", "gridtms-demo-token")
    demo_business_id: str = os.getenv("DEMO_BUSINESS_ID", "00000000-0000-0000-0000-000000000001")
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_from_phone: str = os.getenv("TWILIO_FROM_PHONE", "")

    use_aws: bool = os.getenv("USE_AWS", "false").lower() == "true"
    aws_region: str = os.getenv("AWS_REGION", "us-east-1")
    bedrock_llm_model: str = os.getenv("BEDROCK_LLM_MODEL", "us.amazon.nova-lite-v1:0")

    def __post_init__(self):
        object.__setattr__(self, "cors_origins", _split_csv(os.getenv("CORS_ORIGINS")) or ["*"])


settings = Settings()
