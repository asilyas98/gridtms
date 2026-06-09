from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import Json, RealDictCursor
from pydantic import BaseModel, Field

from app.settings import config

app = FastAPI(title="Grid TMS Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

COLLECTION_TABLES = {
    "loads": "tms_loads",
    "customers": "tms_customers",
    "locations": "tms_locations",
    "drivers": "tms_drivers",
    "trucks": "tms_trucks",
    "invoices": "tms_invoices",
    "settlements": "tms_settlements",
    "compliance_events": "tms_compliance_events",
    "recurring_rules": "tms_recurring_rules",
}


class TmsRecordIn(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)


class CarrierVerifyRequest(BaseModel):
    company_name: str
    dot_number: str
    mc_number: str


def get_connection():
    if not config.supabase_db_url:
        raise HTTPException(status_code=500, detail="SUPABASE_DB_URL is missing in backend/.env")
    return psycopg2.connect(config.supabase_db_url)


def ensure_collection(collection: str) -> str:
    table = COLLECTION_TABLES.get(collection)
    if not table:
        raise HTTPException(status_code=404, detail=f"Unknown collection: {collection}")
    return table


def json_safe(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    return value


def row_to_record(row: dict[str, Any]) -> dict[str, Any]:
    data = row.get("data") or {}
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}
    data.setdefault("id", row.get("record_id"))
    data["_synced_at"] = json_safe(row.get("updated_at"))
    return json_safe(data)


def extract_summary(collection: str, record_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Optional summary columns make rows easier to read inside Supabase."""
    if collection == "loads":
        return {
            "load_number": data.get("loadNumber") or data.get("load_number"),
            "customer_id": data.get("customerId") or data.get("customer_id"),
            "status": data.get("status"),
        }
    if collection == "customers":
        return {
            "name": data.get("name") or data.get("full_name") or data.get("company"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "status": data.get("status"),
        }
    if collection == "locations":
        return {
            "name": data.get("name"),
            "type": data.get("type"),
        }
    if collection == "drivers":
        return {"name": data.get("name")}
    if collection == "trucks":
        return {"unit_number": data.get("unitNumber") or data.get("unit_number")}
    if collection == "invoices":
        return {
            "invoice_number": data.get("invoiceNumber") or data.get("invoice_number"),
            "load_id": data.get("loadId") or data.get("load_id"),
            "customer_id": data.get("customerId") or data.get("customer_id"),
            "status": data.get("status"),
            "amount": data.get("amount"),
        }
    if collection == "settlements":
        return {
            "settlement_number": data.get("settlementNumber") or data.get("settlement_number"),
            "driver_id": data.get("driverId") or data.get("driver_id"),
            "status": data.get("status"),
            "net_pay": data.get("netPay") or data.get("net_pay"),
        }
    return {}


def upsert_record(collection: str, data: dict[str, Any]) -> dict[str, Any]:
    table = ensure_collection(collection)
    record_id = str(data.get("id") or data.get("record_id") or "").strip()
    if not record_id:
        raise HTTPException(status_code=400, detail="Record data must include an id")

    summary = extract_summary(collection, record_id, data)
    columns = ["record_id", "data"] + list(summary.keys())
    values = [record_id, Json(json_safe(data))] + list(summary.values())
    placeholders = ", ".join(["%s"] * len(columns))
    update_assignments = ", ".join([f"{c}=excluded.{c}" for c in columns if c != "record_id"] + ["updated_at=now()"])

    sql = f"""
    insert into {table} ({', '.join(columns)})
    values ({placeholders})
    on conflict (record_id) do update set {update_assignments}
    returning record_id, data, created_at, updated_at;
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, values)
            row = cur.fetchone()
            conn.commit()
    return row_to_record(dict(row))


def patch_record(collection: str, record_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    existing = get_record(collection, record_id)
    merged = {**existing, **updates, "id": record_id}
    return upsert_record(collection, merged)


def get_record(collection: str, record_id: str) -> dict[str, Any]:
    table = ensure_collection(collection)
    sql = f"select record_id, data, created_at, updated_at from {table} where record_id=%s limit 1;"
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (record_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"{collection} record not found")
    return row_to_record(dict(row))


def list_records(collection: str) -> list[dict[str, Any]]:
    table = ensure_collection(collection)
    sql = f"select record_id, data, created_at, updated_at from {table} order by updated_at desc;"
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    return [row_to_record(dict(row)) for row in rows]


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Grid TMS backend is running",
        "collections": list(COLLECTION_TABLES.keys()),
    }


@app.get("/health")
def health():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("select 1")
            cur.fetchone()
    return {"status": "ok", "database": "connected"}


@app.get("/tms/snapshot")
def snapshot():
    return {collection: list_records(collection) for collection in COLLECTION_TABLES}


@app.get("/tms/{collection}")
def get_collection(collection: str):
    return {collection: list_records(collection)}


@app.post("/tms/{collection}")
def create_or_replace_record(collection: str, payload: TmsRecordIn):
    return {"record": upsert_record(collection, payload.data)}


@app.patch("/tms/{collection}/{record_id}")
def update_record(collection: str, record_id: str, payload: TmsRecordIn):
    return {"record": patch_record(collection, record_id, payload.data)}


@app.delete("/tms/{collection}/{record_id}")
def delete_record(collection: str, record_id: str):
    table = ensure_collection(collection)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"delete from {table} where record_id=%s", (record_id,))
            conn.commit()
    return {"status": "deleted", "collection": collection, "id": record_id}


@app.post("/carrier/verify")
def verify_carrier(payload: CarrierVerifyRequest):
    # Starter mode: verify against your Supabase verified_carriers table.
    dot = ''.join(ch for ch in payload.dot_number if ch.isdigit())
    mc = ''.join(ch for ch in payload.mc_number if ch.isdigit())
    if not dot or not mc:
        raise HTTPException(status_code=400, detail="DOT and MC must contain numbers")
    sql = """
    select legal_name, dot_number, mc_number, authority_status, verification_status, source, verified_at
    from verified_carriers
    where dot_number=%s and mc_number=%s and verification_status='verified'
    limit 1;
    """
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, (dot, mc))
                row = cur.fetchone()
    except psycopg2.errors.UndefinedTable:
        raise HTTPException(status_code=500, detail="verified_carriers table missing. Run docs/supabase_schema.sql")
    if not row:
        return {"verified": False, "message": "DOT/MC could not be verified."}
    return {"verified": True, "carrier": json_safe(dict(row))}


@app.post("/compliance/audit-packages")
def create_audit_package(payload: TmsRecordIn):
    record = payload.data or {}
    record.setdefault("id", f"audit-{int(datetime.utcnow().timestamp())}")
    record.setdefault("type", "DOT_AUDIT_PACKAGE")
    record.setdefault("status", "generated")
    record.setdefault("createdAt", datetime.utcnow().isoformat())
    saved = upsert_record("compliance_events", record)
    return {"audit_package": saved}


@app.post("/settlements/{settlement_id}/pay")
def pay_settlement(settlement_id: str):
    record = patch_record("settlements", settlement_id, {"status": "PAID", "paidAt": datetime.utcnow().isoformat()})
    return {"settlement": record}


@app.post("/chat")
def chat(payload: dict[str, Any]):
    message = str(payload.get("message") or "")
    return {"answer": f"Grid TMS received your question: {message}. This build focuses on connected Supabase CRUD buttons."}
