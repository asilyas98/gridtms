from __future__ import annotations

import uuid
from typing import Any
from fastapi import HTTPException
from pydantic import BaseModel, Field
from psycopg2 import sql

from app.db import fetch_all, fetch_one, execute_returning, execute, clean_optional

# Tables from gridtms-Anas-V3 frontend schema that are safe to expose through generic CRUD.
ALLOWED_TABLES = {
    "customers",
    "locations",
    "loads",
    "drivers",
    "trucks",
    "trailers",
    "invoices",
    "settlements",
    "recurring_rules",
    "load_activity_logs",
    "load_board_listings",
    "load_stops",
    "driver_settlements",
    "audit_log",
    "verified_carriers",
}

LIST_DEFAULT_LIMIT = 250


class GenericPayload(BaseModel):
    data: dict[str, Any]


class BulkBootstrapResponse(BaseModel):
    customers: list[dict] = []
    locations: list[dict] = []
    loads: list[dict] = []
    drivers: list[dict] = []
    trucks: list[dict] = []
    trailers: list[dict] = []
    invoices: list[dict] = []
    settlements: list[dict] = []
    recurring_rules: list[dict] = []
    verified_carriers: list[dict] = []


def _table_guard(table: str) -> str:
    if table not in ALLOWED_TABLES:
        raise HTTPException(status_code=404, detail=f"Table '{table}' is not exposed by the API.")
    return table


def _generate_id(prefix: str = "id") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _clean_payload(data: dict[str, Any], default_id_prefix: str) -> dict[str, Any]:
    cleaned = {k: clean_optional(v) for k, v in data.items() if k not in {"created_at", "updated_at", "deleted_at"}}
    if not cleaned.get("id"):
        cleaned["id"] = _generate_id(default_id_prefix)
    return cleaned


def list_table(table: str, limit: int = LIST_DEFAULT_LIMIT) -> list[dict]:
    _table_guard(table)
    query = sql.SQL("select * from {} where deleted_at is null order by updated_at desc nulls last, created_at desc nulls last limit %s").format(sql.Identifier(table))
    return fetch_all(query.as_string(__import__('psycopg2').connect('')), (limit,))

# psycopg2.sql needs a connection to render safely. Use string guards instead because table names are whitelisted.
def list_rows(table: str, limit: int = LIST_DEFAULT_LIMIT) -> list[dict]:
    _table_guard(table)
    return fetch_all(f"select * from {table} where deleted_at is null order by updated_at desc nulls last, created_at desc nulls last limit %s", (limit,))


def get_row(table: str, item_id: str) -> dict:
    _table_guard(table)
    row = fetch_one(f"select * from {table} where id = %s and deleted_at is null limit 1", (item_id,))
    if not row:
        raise HTTPException(status_code=404, detail=f"{table} row not found.")
    return row


def create_row(table: str, data: dict[str, Any]) -> dict:
    _table_guard(table)
    payload = _clean_payload(data, table.rstrip("s"))
    columns = list(payload.keys())
    placeholders = ",".join(["%s"] * len(columns))
    colnames = ",".join(columns)
    values = tuple(payload[c] for c in columns)
    return execute_returning(f"insert into {table} ({colnames}) values ({placeholders}) returning *", values)


def update_row(table: str, item_id: str, data: dict[str, Any]) -> dict:
    _table_guard(table)
    payload = {k: clean_optional(v) for k, v in data.items() if k not in {"id", "created_at", "updated_at", "deleted_at"}}
    if not payload:
        return get_row(table, item_id)
    set_clause = ",".join([f"{k} = %s" for k in payload.keys()])
    values = tuple(payload.values()) + (item_id,)
    return execute_returning(f"update {table} set {set_clause}, updated_at = now() where id = %s returning *", values)


def soft_delete_row(table: str, item_id: str) -> dict:
    _table_guard(table)
    return execute_returning(f"update {table} set deleted_at = now(), updated_at = now() where id = %s returning *", (item_id,))


def bootstrap() -> dict:
    tables = ["customers", "locations", "loads", "drivers", "trucks", "trailers", "invoices", "settlements", "recurring_rules", "verified_carriers"]
    result: dict[str, list[dict]] = {}
    for table in tables:
        try:
            result[table] = list_rows(table, 500)
        except Exception:
            result[table] = []
    return result
