from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

import requests
from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.db import fetch_one, execute_returning
from app.settings import settings


class CarrierVerifyRequest(BaseModel):
    legal_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=7)
    dot_number: str = Field(..., min_length=3)
    mc_number: str = Field(..., min_length=3)


class CarrierVerificationResult(BaseModel):
    verified: bool
    message: str
    legal_name: str | None = None
    dot_number: str | None = None
    mc_number: str | None = None
    phone: str | None = None
    authority_status: str | None = None
    verification_status: str | None = None
    source: str | None = None
    verified_at: str | None = None


def normalize_dot(dot_number: str) -> str:
    dot = re.sub(r"[^0-9]", "", dot_number or "")
    if not dot.isdigit() or len(dot) < 5 or len(dot) > 9:
        raise HTTPException(status_code=400, detail="DOT number must be 5-9 digits.")
    return dot


def normalize_mc(mc_number: str) -> str:
    mc = (mc_number or "").upper().replace("MC-", "").replace("MC", "")
    mc = re.sub(r"[^0-9]", "", mc)
    if not mc.isdigit() or len(mc) < 4 or len(mc) > 9:
        raise HTTPException(status_code=400, detail="MC number must be 4-9 digits, with or without MC- prefix.")
    return f"MC-{mc}"


def _name_similarity(a: str, b: str) -> bool:
    def norm(s: str) -> set[str]:
        words = re.sub(r"[^A-Z0-9 ]", " ", (s or "").upper()).split()
        ignore = {"LLC", "INC", "CO", "CORP", "CORPORATION", "LTD", "THE", "TRANSPORT", "TRUCKING"}
        return {w for w in words if w not in ignore}
    aw = norm(a)
    bw = norm(b)
    if not aw or not bw:
        return False
    return bool(aw & bw) or a.strip().upper() == b.strip().upper()


def lookup_manual_verified_carrier(dot: str, mc: str) -> dict | None:
    return fetch_one(
        """
        select *
        from verified_carriers
        where dot_number = %s
          and upper(mc_number) = upper(%s)
          and lower(verification_status) = 'verified'
          and upper(authority_status) in ('ACTIVE', 'AUTHORIZED', 'CURRENT')
        limit 1;
        """,
        (dot, mc),
    )


def call_external_provider(payload: CarrierVerifyRequest, dot: str, mc: str) -> dict | None:
    """
    Optional provider hook. Put your paid/official carrier API URL/key in .env.
    Expected provider response can be mapped from common field names.
    """
    if not settings.dot_provider_api_url or not settings.dot_provider_api_key:
        return None

    response = requests.post(
        settings.dot_provider_api_url,
        headers={
            "Authorization": f"Bearer {settings.dot_provider_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "dot_number": dot,
            "mc_number": mc,
            "legal_name": payload.legal_name,
            "phone": payload.phone,
        },
        timeout=20,
    )
    if response.status_code >= 400:
        return None

    data = response.json()
    legal_name = data.get("legal_name") or data.get("name") or data.get("carrierName")
    authority_status = data.get("authority_status") or data.get("status") or data.get("operatingStatus")
    verified = bool(data.get("verified")) or str(authority_status or "").upper() in {"ACTIVE", "AUTHORIZED", "CURRENT"}
    provider_dot = normalize_dot(str(data.get("dot_number") or data.get("dotNumber") or dot))
    provider_mc = normalize_mc(str(data.get("mc_number") or data.get("mcNumber") or mc))

    if not verified or provider_dot != dot or provider_mc != mc:
        return None
    if legal_name and not _name_similarity(payload.legal_name, legal_name):
        return None

    return {
        "legal_name": legal_name or payload.legal_name,
        "phone": data.get("phone") or payload.phone,
        "dot_number": dot,
        "mc_number": mc,
        "authority_status": authority_status or "ACTIVE",
        "verification_status": "verified",
        "source": "external_provider",
        "source_payload": data,
    }


def upsert_verified_carrier(carrier: dict) -> dict:
    return execute_returning(
        """
        insert into verified_carriers (
          legal_name, phone, dot_number, mc_number, authority_status,
          verification_status, source, source_payload, verified_at
        ) values (%s,%s,%s,%s,%s,%s,%s,%s::jsonb,now())
        on conflict (dot_number, mc_number)
        do update set
          legal_name = excluded.legal_name,
          phone = excluded.phone,
          authority_status = excluded.authority_status,
          verification_status = excluded.verification_status,
          source = excluded.source,
          source_payload = excluded.source_payload,
          verified_at = now(),
          updated_at = now()
        returning *;
        """,
        (
            carrier.get("legal_name"),
            carrier.get("phone"),
            carrier.get("dot_number"),
            carrier.get("mc_number"),
            carrier.get("authority_status"),
            carrier.get("verification_status"),
            carrier.get("source"),
            __import__("json").dumps(carrier.get("source_payload") or {}),
        ),
    )


def verify_carrier(payload: CarrierVerifyRequest) -> CarrierVerificationResult:
    dot = normalize_dot(payload.dot_number)
    mc = normalize_mc(payload.mc_number)

    carrier = lookup_manual_verified_carrier(dot, mc)
    if carrier:
        if not _name_similarity(payload.legal_name, carrier.get("legal_name") or ""):
            return CarrierVerificationResult(
                verified=False,
                message="DOT/MC exists, but the legal name does not match the verified carrier record.",
                dot_number=dot,
                mc_number=mc,
                source="manual_verified_carriers",
            )
        return CarrierVerificationResult(
            verified=True,
            message="Carrier verified.",
            legal_name=carrier.get("legal_name"),
            phone=carrier.get("phone"),
            dot_number=dot,
            mc_number=mc,
            authority_status=carrier.get("authority_status"),
            verification_status=carrier.get("verification_status"),
            source=carrier.get("source") or "manual_verified_carriers",
            verified_at=str(carrier.get("verified_at") or datetime.now(timezone.utc).isoformat()),
        )

    if settings.carrier_verification_mode == "provider":
        provider_carrier = call_external_provider(payload, dot, mc)
        if provider_carrier:
            saved = upsert_verified_carrier(provider_carrier)
            return CarrierVerificationResult(
                verified=True,
                message="Carrier verified by provider.",
                legal_name=saved.get("legal_name"),
                phone=saved.get("phone"),
                dot_number=dot,
                mc_number=mc,
                authority_status=saved.get("authority_status"),
                verification_status=saved.get("verification_status"),
                source=saved.get("source"),
                verified_at=str(saved.get("verified_at")),
            )

    return CarrierVerificationResult(
        verified=False,
        message="DOT/MC could not be verified. The DOT and MC must belong to the same active carrier in verified_carriers or your connected provider.",
        dot_number=dot,
        mc_number=mc,
        source=settings.carrier_verification_mode,
    )
