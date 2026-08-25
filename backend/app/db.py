from __future__ import annotations

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException

from app.settings import settings


def get_connection():
    if not settings.supabase_db_url:
        raise HTTPException(status_code=500, detail="SUPABASE_DB_URL is missing")
    return psycopg2.connect(settings.supabase_db_url)


def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(row) for row in cur.fetchall()]


def fetch_one(sql: str, params: tuple = ()) -> dict | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None


def execute_returning(sql: str, params: tuple = ()) -> dict:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            conn.commit()
            if not row:
                raise HTTPException(status_code=500, detail="Database did not return a row")
            return dict(row)


def execute(sql: str, params: tuple = ()) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
