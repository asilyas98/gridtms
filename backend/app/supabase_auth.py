from __future__ import annotations

import requests
from fastapi import Header, HTTPException

from app.db import fetch_one, execute_returning
from app.settings import settings
from app.verification import verify_business


def _require_supabase_config() -> None:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=500, detail="Supabase Auth env vars are missing.")


def _require_service_role() -> None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=500, detail="SUPABASE_SERVICE_ROLE_KEY is required for server-side registration.")


def supabase_admin_create_user(email: str, password: str, metadata: dict) -> dict:
    _require_service_role()
    response = requests.post(
        f"{settings.supabase_url}/auth/v1/admin/users",
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        },
        json={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": metadata,
        },
        timeout=15,
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.json() if response.text else "Supabase user creation failed")
    return response.json()


def supabase_login(email: str, password: str) -> dict:
    _require_supabase_config()
    response = requests.post(
        f"{settings.supabase_url}/auth/v1/token?grant_type=password",
        headers={
            "apikey": settings.supabase_anon_key,
            "Content-Type": "application/json",
        },
        json={"email": email, "password": password},
        timeout=15,
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return response.json()


def get_supabase_user_from_token(token: str) -> dict:
    _require_supabase_config()
    response = requests.get(
        f"{settings.supabase_url}/auth/v1/user",
        headers={
            "apikey": settings.supabase_anon_key,
            "Authorization": f"Bearer {token}",
        },
        timeout=15,
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return response.json()



def get_demo_auth_result() -> dict:
    """Return a local demo session. This is for development/demo only."""
    return {
        "access_token": settings.demo_token,
        "token_type": "bearer",
        "expires_in": 60 * 60 * 24,
        "user": {
            "id": "demo-user",
            "email": "demo@gridtms.local",
            "user_metadata": {
                "full_name": "Demo Dispatcher",
                "legal_name": "Demo Trucking LLC",
                "phone": "248-555-0101",
                "registered_address": "123 Demo Logistics Way",
                "registered_city": "Troy",
                "registered_state": "MI",
                "registered_zip": "48083",
                "dot_number": "23412312",
                "mc_number": "MC-2341234",
                "business_verified": True,
                "two_step_verified": True,
                "demo": True,
            },
        },
        "session": {
            "access_token": settings.demo_token,
            "token_type": "bearer",
        },
    }


def get_demo_current_user() -> dict:
    """Current-user object for the demo token. The business id matches the SQL demo seed."""
    user = get_demo_auth_result()["user"]
    business = {
        "id": settings.demo_business_id,
        "auth_user_id": None,
        "email": "demo@gridtms.local",
        "legal_name": "Demo Trucking LLC",
        "dba_name": "GridTMS Demo Carrier",
        "phone": "248-555-0101",
        "registered_address": "123 Demo Logistics Way",
        "registered_city": "Troy",
        "registered_state": "MI",
        "registered_zip": "48083",
        "dot_number": "23412312",
        "mc_number": "MC-2341234",
        "authority_status": "ACTIVE",
        "verification_status": "verified",
        "source": "demo_login",
    }
    return {"user": user, "business": business}


def create_business_account(
    user_id: str,
    email: str,
    verified: dict,
    phone: str,
    business_verification_number: str | None,
    registered_address: str | None = None,
    registered_city: str | None = None,
    registered_state: str | None = None,
    registered_zip: str | None = None,
    state_registration_number: str | None = None,
    truck_registration_number: str | None = None,
) -> dict:
    return execute_returning(
        """
        insert into business_accounts (
          auth_user_id, email, legal_name, dba_name, phone,
          registered_address, registered_city, registered_state, registered_zip,
          dot_number, mc_number, business_verification_number,
          state_registration_number, truck_registration_number,
          authority_status, verification_status, source, verified_business_id, verified_at
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'verified', %s, %s, now())
        on conflict (auth_user_id)
        do update set
          email = excluded.email,
          legal_name = excluded.legal_name,
          dba_name = excluded.dba_name,
          phone = excluded.phone,
          registered_address = excluded.registered_address,
          registered_city = excluded.registered_city,
          registered_state = excluded.registered_state,
          registered_zip = excluded.registered_zip,
          dot_number = excluded.dot_number,
          mc_number = excluded.mc_number,
          business_verification_number = excluded.business_verification_number,
          state_registration_number = excluded.state_registration_number,
          truck_registration_number = excluded.truck_registration_number,
          authority_status = excluded.authority_status,
          verification_status = 'verified',
          source = excluded.source,
          verified_business_id = excluded.verified_business_id,
          verified_at = now(),
          updated_at = now()
        returning *;
        """,
        (
            user_id,
            email.lower().strip(),
            verified.get("legal_name"),
            verified.get("dba_name"),
            phone,
            verified.get("registered_address") or registered_address,
            verified.get("registered_city") or registered_city,
            verified.get("registered_state") or registered_state,
            verified.get("registered_zip") or registered_zip,
            verified.get("dot_number"),
            verified.get("mc_number"),
            verified.get("business_verification_number") or business_verification_number,
            verified.get("state_registration_number") or state_registration_number,
            verified.get("truck_registration_number") or truck_registration_number,
            verified.get("authority_status"),
            verified.get("source"),
            verified.get("business_id"),
        ),
    )


def get_business_account_for_user(user_id: str) -> dict | None:
    return fetch_one("select * from business_accounts where auth_user_id = %s limit 1", (user_id,))


def require_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization bearer token.")

    token = authorization.replace("Bearer ", "", 1).strip()
    if settings.demo_login_enabled and token == settings.demo_token:
        return get_demo_current_user()

    user = get_supabase_user_from_token(token)
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token.")

    account = get_business_account_for_user(user_id)
    if not account or account.get("verification_status") != "verified":
        raise HTTPException(status_code=403, detail="Business account is not verified.")

    recheck = verify_business(
        company_name=account.get("legal_name") or "",
        dot_number=account.get("dot_number") or "",
        mc_number=account.get("mc_number") or "",
        business_verification_number=account.get("business_verification_number"),
        phone=account.get("phone"),
        registered_address=account.get("registered_address"),
        registered_city=account.get("registered_city"),
        registered_state=account.get("registered_state"),
        registered_zip=account.get("registered_zip"),
        state_registration_number=account.get("state_registration_number"),
        truck_registration_number=account.get("truck_registration_number"),
    )
    if not recheck.get("verified"):
        raise HTTPException(status_code=403, detail="Business verification is no longer valid.")

    return {"user": user, "business": account}
