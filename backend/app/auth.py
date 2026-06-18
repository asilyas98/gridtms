from __future__ import annotations

from typing import Any
import requests
from fastapi import Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.settings import settings
from app.verification import CarrierVerifyRequest, verify_carrier, lookup_manual_verified_carrier, normalize_dot, normalize_mc


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    legal_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=7)
    dot_number: str = Field(..., min_length=5)
    mc_number: str = Field(..., min_length=4)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def _supabase_required():
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=500, detail="Supabase URL/anon key is missing.")


def _service_role_required():
    _supabase_required()
    if not settings.supabase_service_role_key or "REPLACE_WITH" in settings.supabase_service_role_key:
        raise HTTPException(status_code=500, detail="SUPABASE_SERVICE_ROLE_KEY is missing or still has a placeholder.")


def admin_create_user(payload: RegisterRequest, verification: dict) -> dict:
    _service_role_required()
    response = requests.post(
        f"{settings.supabase_url}/auth/v1/admin/users",
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        },
        json={
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": payload.full_name,
                "legal_name": verification.get("legal_name") or payload.legal_name,
                "phone": payload.phone,
                "dot_number": verification.get("dot_number"),
                "mc_number": verification.get("mc_number"),
                "carrier_verified": True,
                "carrier_verified_source": verification.get("source"),
                "authority_status": verification.get("authority_status"),
                "carrier_verified_at": verification.get("verified_at"),
                "app": "Grid TMS",
            },
        },
        timeout=20,
    )
    data = response.json() if response.content else {}
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=data.get("msg") or data.get("message") or data.get("error_description") or "Supabase Auth user creation failed.")
    return data


def password_login(payload: LoginRequest) -> dict:
    _supabase_required()
    response = requests.post(
        f"{settings.supabase_url}/auth/v1/token?grant_type=password",
        headers={"apikey": settings.supabase_anon_key, "Content-Type": "application/json"},
        json={"email": payload.email, "password": payload.password},
        timeout=20,
    )
    data = response.json() if response.content else {}
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail=data.get("error_description") or data.get("msg") or "Invalid email or password.")

    user = data.get("user") or {}
    enforce_verified_user(user)
    return data


def get_supabase_user_from_token(token: str) -> dict:
    _supabase_required()
    response = requests.get(
        f"{settings.supabase_url}/auth/v1/user",
        headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"},
        timeout=20,
    )
    data = response.json() if response.content else {}
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Invalid or expired auth token.")
    return data


def enforce_verified_user(user: dict) -> None:
    if not settings.require_carrier_verification:
        return

    metadata = user.get("user_metadata") or {}
    if not metadata.get("carrier_verified"):
        raise HTTPException(status_code=403, detail="Carrier account is not verified. DOT/MC verification is required.")

    try:
        dot = normalize_dot(str(metadata.get("dot_number") or ""))
        mc = normalize_mc(str(metadata.get("mc_number") or ""))
    except Exception:
        raise HTTPException(status_code=403, detail="Carrier account has invalid DOT/MC metadata.")

    carrier = lookup_manual_verified_carrier(dot, mc)
    if not carrier:
        raise HTTPException(status_code=403, detail="Carrier verification no longer exists or is inactive. Contact admin.")


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization: Bearer token.")
    token = authorization.replace("Bearer ", "", 1).strip()
    user = get_supabase_user_from_token(token)
    enforce_verified_user(user)
    return user


def register_user(payload: RegisterRequest) -> dict:
    verification = verify_carrier(
        CarrierVerifyRequest(
            legal_name=payload.legal_name,
            phone=payload.phone,
            dot_number=payload.dot_number,
            mc_number=payload.mc_number,
        )
    )
    if not verification.verified:
        raise HTTPException(status_code=403, detail=verification.message)
    user = admin_create_user(payload, verification.model_dump())
    return {"user": user, "carrier_verification": verification.model_dump()}
