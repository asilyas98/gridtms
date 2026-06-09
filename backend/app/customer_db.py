from __future__ import annotations

from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor

from app.settings import config


def get_connection():
    if not config.supabase_db_url:
        raise RuntimeError("SUPABASE_DB_URL is missing")
    return psycopg2.connect(config.supabase_db_url)


def search_customers(query: str, limit: int = 10) -> list[dict[str, Any]]:
    q = (query or "").strip()
    if not q:
        return []

    pattern = f"%{q}%"
    sql = """
    select id, full_name, email, phone, company, customer_type, status, created_at
    from customers
    where full_name ilike %s
       or email ilike %s
       or company ilike %s
       or phone ilike %s
    order by created_at desc
    limit %s;
    """

    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (pattern, pattern, pattern, pattern, limit))
            return [dict(row) for row in cur.fetchall()]


def get_customer_profile(customer_id: str) -> dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                select id, full_name, email, phone, company, customer_type, status, created_at
                from customers
                where id = %s;
                """,
                (customer_id,),
            )
            customer = cur.fetchone()

            cur.execute(
                """
                select id, shipment_number, origin, destination, status, pickup_date,
                       delivery_date, notes, created_at
                from shipments
                where customer_id = %s
                order by created_at desc;
                """,
                (customer_id,),
            )
            shipments = cur.fetchall()

            cur.execute(
                """
                select id, note, created_at
                from customer_notes
                where customer_id = %s
                order by created_at desc;
                """,
                (customer_id,),
            )
            notes = cur.fetchall()

    return {
        "customer": dict(customer) if customer else None,
        "shipments": [dict(row) for row in shipments],
        "notes": [dict(row) for row in notes],
    }
