from __future__ import annotations

from decimal import Decimal
from datetime import date, datetime
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException

from app.settings import settings


def get_connection():
    if not settings.supabase_db_url or "REPLACE_WITH" in settings.supabase_db_url:
        raise HTTPException(status_code=500, detail="SUPABASE_DB_URL is missing or still contains REPLACE_WITH placeholder.")
    try:
        return psycopg2.connect(settings.supabase_db_url)
    except psycopg2.OperationalError as exc:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(exc).splitlines()[0]}")


def to_jsonable(value: Any) -> Any:
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
    return to_jsonable([dict(r) for r in rows])


def fetch_one(sql: str, params: tuple = ()) -> dict | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
    return to_jsonable(dict(row)) if row else None


def execute_returning(sql: str, params: tuple = ()) -> dict:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            conn.commit()
    return to_jsonable(dict(row))


def execute(sql: str, params: tuple = ()) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()


def clean_optional(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    return value
