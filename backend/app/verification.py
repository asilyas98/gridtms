from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
import string
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any

import requests
from fastapi import HTTPException

from app.db import execute, execute_returning, fetch_one
from app.settings import settings


ACTIVE_AUTHORITY_STATUSES = {"ACTIVE", "AUTHORIZED", "AUTHORIZED FOR PROPERTY"}


def normalize_dot(value: str) -> str:
    cleaned = value.upper().replace("USDOT", "").replace("DOT", "").strip()
    cleaned = "".join(ch for ch in cleaned if ch.isdigit())
    return cleaned


def normalize_mc(value: str) -> str:
    cleaned = value.upper().replace("MC-", "").replace("MC", "").strip()
    cleaned = "".join(ch for ch in cleaned if ch.isdigit())
    return f"MC-{cleaned}" if cleaned else ""


def normalize_business_number(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.upper().replace("EIN", "").replace("-", "").replace(" ", "").strip()
    return cleaned or None


def normalize_generic_number(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"[^A-Z0-9]", "", value.upper())
    return cleaned or None


def normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits or None


def normalize_name(value: str) -> str:
    value = value.upper().strip()
    remove = [",", ".", " LLC", " L.L.C", " INC", " INCORPORATED", " CORP", " CORPORATION", " CO", " COMPANY"]
    for token in remove:
        value = value.replace(token, "")
    return " ".join(value.split())


def normalize_address_piece(value: str | None) -> str:
    if not value:
        return ""
    value = value.upper().strip()
    replacements = {
        " STREET": " ST", " ST.": " ST", " AVENUE": " AVE", " AVE.": " AVE",
        " ROAD": " RD", " RD.": " RD", " DRIVE": " DR", " DR.": " DR",
        " LANE": " LN", " LANE.": " LN", " BOULEVARD": " BLVD", " BLVD.": " BLVD",
        " NORTH": " N", " SOUTH": " S", " EAST": " E", " WEST": " W",
    }
    for old, new in replacements.items():
        value = value.replace(old, new)
    value = re.sub(r"[^A-Z0-9 ]", " ", value)
    return " ".join(value.split())


def name_match_score(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize_name(a), normalize_name(b)).ratio()


def text_match_score(a: str | None, b: str | None) -> float:
    return SequenceMatcher(None, normalize_address_piece(a), normalize_address_piece(b)).ratio()


def validate_number_formats(
    dot_number: str,
    mc_number: str,
    business_verification_number: str | None = None,
    state_registration_number: str | None = None,
    truck_registration_number: str | None = None,
) -> tuple[str, str, str | None, str | None, str | None]:
    dot = normalize_dot(dot_number)
    mc = normalize_mc(mc_number)
    biz = normalize_business_number(business_verification_number)
    state_reg = normalize_generic_number(state_registration_number)
    truck_reg = normalize_generic_number(truck_registration_number)

    if not dot.isdigit() or len(dot) < 5 or len(dot) > 9:
        raise HTTPException(status_code=400, detail="DOT number must be 5 to 9 digits.")

    mc_digits = mc.replace("MC-", "")
    if not mc_digits.isdigit() or len(mc_digits) < 5 or len(mc_digits) > 9:
        raise HTTPException(status_code=400, detail="MC number must be 5 to 9 digits, optionally prefixed with MC-.")

    if biz and len(biz) > 20:
        raise HTTPException(status_code=400, detail="Business verification number looks too long.")

    if state_reg and len(state_reg) > 30:
        raise HTTPException(status_code=400, detail="State business registration number looks too long.")

    if truck_reg and len(truck_reg) > 30:
        raise HTTPException(status_code=400, detail="Truck registration number looks too long.")

    return dot, mc, biz, state_reg, truck_reg


def lookup_verified_business(dot: str, mc: str) -> dict | None:
    return fetch_one(
        """
        select *
        from verified_businesses
        where dot_number = %s
          and upper(mc_number) = upper(%s)
          and verification_status = 'verified'
        limit 1;
        """,
        (dot, mc),
    )


def call_provider(
    company_name: str,
    dot: str,
    mc: str,
    business_verification_number: str | None,
    phone: str | None,
    registered_address: str | None,
    registered_city: str | None,
    registered_state: str | None,
    registered_zip: str | None,
    state_registration_number: str | None,
    truck_registration_number: str | None,
) -> dict | None:
    """
    Optional live provider integration.

    Manual mode checks only the `verified_businesses` table. Provider mode can call a real DOT/FMCSA,
    KYB, or trucking-compliance API that returns the verified legal carrier data. The backend then still
    compares every returned field before account creation.
    """
    if settings.business_verification_mode != "provider" or not settings.dot_provider_api_url:
        return None

    headers = {"Content-Type": "application/json"}
    if settings.dot_provider_api_key:
        headers["Authorization"] = f"Bearer {settings.dot_provider_api_key}"

    response = requests.post(
        settings.dot_provider_api_url,
        headers=headers,
        json={
            "company_name": company_name,
            "dot_number": dot,
            "mc_number": mc,
            "business_verification_number": business_verification_number,
            "phone": phone,
            "registered_address": registered_address,
            "registered_city": registered_city,
            "registered_state": registered_state,
            "registered_zip": registered_zip,
            "state_registration_number": state_registration_number,
            "truck_registration_number": truck_registration_number,
        },
        timeout=15,
    )

    if response.status_code >= 400:
        return None

    data = response.json()
    if not data.get("verified"):
        return None

    return data


def upsert_provider_verified_business(provider_data: dict) -> dict:
    legal_name = provider_data.get("legal_name") or provider_data.get("company_name")
    dot = normalize_dot(str(provider_data.get("dot_number") or ""))
    mc = normalize_mc(str(provider_data.get("mc_number") or ""))
    phone = provider_data.get("phone")
    business_number = normalize_business_number(provider_data.get("business_verification_number"))
    authority_status = (provider_data.get("authority_status") or "ACTIVE").upper()

    return execute_returning(
        """
        insert into verified_businesses (
            legal_name, dba_name, dot_number, mc_number, business_verification_number,
            phone, registered_address, registered_city, registered_state, registered_zip,
            state_registration_number, truck_registration_number,
            authority_status, verification_status, source, source_payload, verified_at
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'verified', 'provider', %s::jsonb, now())
        on conflict (dot_number, mc_number)
        do update set
          legal_name = excluded.legal_name,
          dba_name = excluded.dba_name,
          business_verification_number = excluded.business_verification_number,
          phone = excluded.phone,
          registered_address = excluded.registered_address,
          registered_city = excluded.registered_city,
          registered_state = excluded.registered_state,
          registered_zip = excluded.registered_zip,
          state_registration_number = excluded.state_registration_number,
          truck_registration_number = excluded.truck_registration_number,
          authority_status = excluded.authority_status,
          verification_status = 'verified',
          source = 'provider',
          source_payload = excluded.source_payload,
          verified_at = now(),
          updated_at = now()
        returning *;
        """,
        (
            legal_name,
            provider_data.get("dba_name"),
            dot,
            mc,
            business_number,
            phone,
            provider_data.get("registered_address"),
            provider_data.get("registered_city"),
            provider_data.get("registered_state"),
            provider_data.get("registered_zip"),
            normalize_generic_number(provider_data.get("state_registration_number")),
            normalize_generic_number(provider_data.get("truck_registration_number")),
            authority_status,
            json.dumps(provider_data),
        ),
    )


def fail(message: str, dot: str, mc: str, **extra: Any) -> dict:
    return {"verified": False, "message": message, "dot_number": dot, "mc_number": mc, **extra}


def compare_business_record(
    carrier: dict,
    company_name: str,
    dot: str,
    mc: str,
    biz: str,
    phone: str | None,
    registered_address: str | None,
    registered_city: str | None,
    registered_state: str | None,
    registered_zip: str | None,
    state_registration_number: str | None,
    truck_registration_number: str | None,
) -> dict:
    legal_name = carrier.get("legal_name") or ""
    score = name_match_score(company_name, legal_name)
    if score < 0.72:
        return fail(
            f"LLC/legal name does not match the verified carrier record for DOT {dot} / {mc}.",
            dot,
            mc,
            matched_legal_name=legal_name,
            name_match_score=round(score, 3),
        )

    stored_phone = normalize_phone(carrier.get("phone"))
    input_phone = normalize_phone(phone)
    if stored_phone and input_phone and stored_phone != input_phone:
        return fail("Phone number does not match the verified carrier record.", dot, mc)

    stored_address = carrier.get("registered_address")
    if stored_address:
        address_score = text_match_score(registered_address, stored_address)
        if address_score < 0.72:
            return fail(
                "Registered business address does not match the verified carrier record.",
                dot,
                mc,
                matched_registered_address=stored_address,
                address_match_score=round(address_score, 3),
            )

    if carrier.get("registered_city") and normalize_address_piece(registered_city) != normalize_address_piece(carrier.get("registered_city")):
        return fail("Registered business city does not match the verified carrier record.", dot, mc)

    if carrier.get("registered_state") and normalize_address_piece(registered_state) != normalize_address_piece(carrier.get("registered_state")):
        return fail("Registered business state does not match the verified carrier record.", dot, mc)

    stored_zip = normalize_generic_number(carrier.get("registered_zip"))
    input_zip = normalize_generic_number(registered_zip)
    if stored_zip and input_zip and stored_zip[:5] != input_zip[:5]:
        return fail("Registered business ZIP/postal code does not match the verified carrier record.", dot, mc)

    if str(carrier.get("authority_status") or "").upper() not in ACTIVE_AUTHORITY_STATUSES:
        return fail(
            "Carrier is found, but operating authority/status is not active.",
            dot,
            mc,
            authority_status=carrier.get("authority_status"),
        )

    return {
        "verified": True,
        "message": "Business verified.",
        "business_id": str(carrier.get("id")),
        "legal_name": legal_name,
        "dba_name": carrier.get("dba_name"),
        "dot_number": dot,
        "mc_number": mc,
        "business_verification_number": carrier.get("business_verification_number") or biz,
        "phone": carrier.get("phone") or phone,
        "registered_address": carrier.get("registered_address") or registered_address,
        "registered_city": carrier.get("registered_city") or registered_city,
        "registered_state": carrier.get("registered_state") or registered_state,
        "registered_zip": carrier.get("registered_zip") or registered_zip,
        "state_registration_number": carrier.get("state_registration_number") or state_registration_number,
        "truck_registration_number": carrier.get("truck_registration_number") or truck_registration_number,
        "authority_status": carrier.get("authority_status"),
        "verification_status": carrier.get("verification_status"),
        "source": carrier.get("source"),
        "name_match_score": round(score, 3),
    }


def verify_business(
    company_name: str,
    dot_number: str,
    mc_number: str,
    business_verification_number: str | None = None,
    phone: str | None = None,
    registered_address: str | None = None,
    registered_city: str | None = None,
    registered_state: str | None = None,
    registered_zip: str | None = None,
    state_registration_number: str | None = None,
    truck_registration_number: str | None = None,
) -> dict:
    dot, mc, biz, state_reg, truck_reg = validate_number_formats(
        dot_number,
        mc_number,
        business_verification_number,
        state_registration_number,
        truck_registration_number,
    )

    if not company_name or len(company_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Legal LLC/company name is required.")

    if not registered_address or not registered_city or not registered_state or not registered_zip:
        raise HTTPException(status_code=400, detail="Registered business address, city, state, and ZIP are required for verification.")

    carrier = lookup_verified_business(dot, mc)

    if not carrier:
        provider_data = call_provider(
            company_name, dot, mc, biz, phone,
            registered_address, registered_city, registered_state, registered_zip,
            state_reg, truck_reg,
        )
        if provider_data:
            carrier = upsert_provider_verified_business(provider_data)

    if not carrier:
        return fail(
            "Business could not be verified. DOT, MC, LLC/legal name, address, and phone must belong to the same active carrier.",
            dot,
            mc,
        )

    return compare_business_record(
        carrier=carrier,
        company_name=company_name,
        dot=dot,
        mc=mc,
        biz=biz,
        phone=phone,
        registered_address=registered_address,
        registered_city=registered_city,
        registered_state=registered_state,
        registered_zip=registered_zip,
        state_registration_number=state_reg,
        truck_registration_number=truck_reg,
    )


def generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def hash_otp(otp: str) -> str:
    secret = settings.supabase_service_role_key or settings.supabase_anon_key or "local-dev-secret"
    return hmac.new(secret.encode(), otp.encode(), hashlib.sha256).hexdigest()


def create_otp_challenge(email: str, phone: str, purpose: str, payload: dict[str, Any] | None = None) -> dict:
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expiry_minutes)

    row = execute_returning(
        """
        insert into auth_otp_challenges (email, phone, purpose, otp_hash, payload, expires_at)
        values (%s, %s, %s, %s, %s::jsonb, %s)
        returning id, email, phone, purpose, expires_at, created_at;
        """,
        (email.lower().strip(), phone.strip(), purpose, hash_otp(otp), json.dumps(payload or {}), expires_at.isoformat()),
    )

    send_otp(phone, otp)
    row["dev_otp"] = otp if settings.otp_mode == "dev" else None
    return row


def send_otp(phone: str, otp: str) -> None:
    if settings.otp_mode != "twilio":
        print(f"[DEV OTP] {phone}: {otp}")
        return

    if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_phone):
        raise HTTPException(status_code=500, detail="Twilio OTP mode selected but Twilio env vars are missing.")

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    response = requests.post(
        url,
        auth=(settings.twilio_account_sid, settings.twilio_auth_token),
        data={
            "To": phone,
            "From": settings.twilio_from_phone,
            "Body": f"Your GridTMS verification code is {otp}. It expires in {settings.otp_expiry_minutes} minutes.",
        },
        timeout=10,
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=500, detail="Failed to send verification code.")


def verify_otp_challenge(challenge_id: str, otp: str, purpose: str) -> dict:
    row = fetch_one(
        """
        select *
        from auth_otp_challenges
        where id = %s
          and purpose = %s
          and consumed_at is null
        limit 1;
        """,
        (challenge_id, purpose),
    )

    if not row:
        raise HTTPException(status_code=400, detail="Invalid or already used verification challenge.")

    expires_at = row.get("expires_at")
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired.")

    if hash_otp(otp.strip()) != row.get("otp_hash"):
        raise HTTPException(status_code=400, detail="Incorrect verification code.")

    execute("update auth_otp_challenges set consumed_at = now() where id = %s", (challenge_id,))
    return row
