from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.db import fetch_all
from app.settings import settings


DEMO_CHAT_CONTEXT = {
    "customers": [
        {"name": "Target Corp", "company": "Target Corp", "email": "ap@target.demo", "phone": "612-304-6073", "status": "active", "notes": "High-volume shipper; prefers email PDF invoices."},
        {"name": "Amazon Logistics", "company": "Amazon Logistics", "email": "billing@amazon.demo", "phone": "206-266-1000", "status": "active", "notes": "Frequent dry van lanes."},
        {"name": "Midwest Goods Inc", "company": "Midwest Goods Inc", "email": "accounting@mwg.demo", "phone": "312-555-0199", "status": "on hold", "notes": "Credit utilization over limit."},
    ],
    "loads": [
        {"load_number": "LD-004521", "customer": "Target Corp", "origin": "Chicago Terminal", "destination": "Target Columbus DC", "status": "Invoiced", "driver": "Marcus Williams", "equipment": "Dry Van 53'", "miles": 368.2, "rate": 1039.78},
        {"load_number": "LD-004520", "customer": "Amazon Logistics", "origin": "Walmart DC #6029", "destination": "Target Columbus DC", "status": "Paid", "driver": "Sarah Peterson", "equipment": "Dry Van 53'", "miles": 512, "rate": 1247.50},
        {"load_number": "LD-004523", "customer": "Midwest Goods Inc", "origin": "Chicago Terminal", "destination": "Walmart DC #6029", "status": "Created", "driver": None, "equipment": "Dry Van 53'", "miles": 650, "rate": 1450.00},
    ],
    "invoices": [
        {"invoice_number": "INV-1001", "load_number": "LD-004521", "customer": "Target Corp", "amount": 1039.78, "status": "open", "due_date": "2026-05-30"},
        {"invoice_number": "INV-1002", "load_number": "LD-004520", "customer": "Amazon Logistics", "amount": 1247.50, "status": "paid", "due_date": "2026-05-28"},
    ],
    "locations": [
        {"name": "Chicago Terminal", "city": "Chicago", "state": "IL", "location_type": "terminal"},
        {"name": "Target Columbus DC", "city": "Columbus", "state": "OH", "location_type": "consignee"},
    ],
    "settlements": [
        {"driver": "Marcus Williams", "load_number": "LD-004521", "gross_pay": 725, "deductions": 85, "net_pay": 640, "status": "draft"},
    ],
    "compliance_events": [
        {"event_type": "audit", "title": "DOT audit readiness", "description": "Demo compliance score is 95%.", "status": "ready"},
    ],
}


def _safe_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _clean_rows(rows: list[dict], max_rows: int = 8) -> list[dict]:
    cleaned: list[dict] = []
    for row in rows[:max_rows]:
        cleaned.append({key: _safe_value(value) for key, value in row.items() if key not in {"business_account_id", "updated_at"}})
    return cleaned


def _load_business_context(business_id: str) -> dict[str, list[dict]]:
    """Small protected snapshot for the AI assistant. Every query is scoped to the logged-in business."""
    context: dict[str, list[dict]] = {}
    tables = {
        "customers": "select id, name, company, email, phone, customer_type, status, notes, created_at from customers where business_account_id = %s order by created_at desc limit 10",
        "loads": "select id, load_number, customer, origin, destination, status, pickup_date, delivery_date, driver, truck, equipment, miles, rate, notes, created_at from loads where business_account_id = %s order by created_at desc limit 12",
        "invoices": "select id, invoice_number, load_number, customer, amount, status, due_date, notes, created_at from invoices where business_account_id = %s order by created_at desc limit 10",
        "locations": "select id, name, address, city, state, zip, location_type, contact_name, phone, notes, created_at from locations where business_account_id = %s order by created_at desc limit 8",
        "settlements": "select id, driver, load_number, gross_pay, deductions, net_pay, status, notes, created_at from settlements where business_account_id = %s order by created_at desc limit 8",
        "compliance_events": "select id, event_type, title, description, status, payload, created_at from compliance_events where business_account_id = %s order by created_at desc limit 8",
    }

    for name, sql in tables.items():
        try:
            context[name] = _clean_rows(fetch_all(sql, (business_id,)))
        except Exception as exc:
            context[name] = [{"error": f"Could not load {name}: {exc}"}]
    return context


def _format_context(context: dict[str, list[dict]]) -> str:
    lines: list[str] = []
    for name, rows in context.items():
        lines.append(f"\n{name.upper()} ({len(rows)} shown)")
        if not rows:
            lines.append("- none yet")
            continue
        for row in rows:
            short = ", ".join(f"{key}={value}" for key, value in row.items() if value not in [None, ""])
            lines.append(f"- {short}")
    return "\n".join(lines)


def _local_data_answer(message: str, business_name: str, context: dict[str, list[dict]]) -> str:
    msg = message.lower()

    if not any(context.values()):
        return (
            f"I checked the protected GridTMS data for {business_name}, but there are no customer, load, invoice, location, settlement, or compliance records saved yet.\n\n"
            "Create a customer or load first, then ask me questions like: 'Who are my top customers?' or 'Which loads need invoices?'"
        )

    if "customer" in msg or "client" in msg:
        customers = context.get("customers", [])
        if not customers:
            return "I do not see any saved customers for this verified business account yet."
        bullets = []
        for c in customers:
            label = c.get("company") or c.get("name") or "Unnamed customer"
            contact = c.get("email") or c.get("phone") or "no contact saved"
            status = c.get("status") or "unknown status"
            bullets.append(f"- {label}: {status}, {contact}")
        return "Here are the saved customers I found:\n" + "\n".join(bullets)

    if "invoice" in msg or "revenue" in msg or "money" in msg or "paid" in msg:
        invoices = context.get("invoices", [])
        loads = context.get("loads", [])
        total_invoices = sum(float(i.get("amount") or 0) for i in invoices if isinstance(i, dict))
        total_load_rates = sum(float(l.get("rate") or 0) for l in loads if isinstance(l, dict))
        open_items = [i for i in invoices if str(i.get("status") or "").lower() not in {"paid", "closed"}]
        return (
            f"For {business_name}, I found ${total_invoices:,.2f} in saved invoices and ${total_load_rates:,.2f} in recent load rates.\n"
            f"Open/unpaid invoice count: {len(open_items)}.\n\n"
            "Ask me for a specific customer or load number if you want a narrower breakdown."
        )

    if "load" in msg or "dispatch" in msg or "driver" in msg:
        loads = context.get("loads", [])
        if not loads:
            return "I do not see any saved loads for this verified business account yet."
        bullets = []
        for l in loads[:8]:
            number = l.get("load_number") or "unnumbered load"
            customer = l.get("customer") or "unknown customer"
            route = f"{l.get('origin') or '?'} → {l.get('destination') or '?'}"
            status = l.get("status") or "unknown status"
            bullets.append(f"- {number}: {customer}, {route}, status {status}")
        return "Here are the recent loads I found:\n" + "\n".join(bullets)

    if "compliance" in msg or "audit" in msg or "dot" in msg:
        items = context.get("compliance_events", [])
        if not items:
            return "I do not see saved compliance events yet. The account itself is business-verified, but no compliance audit items have been created."
        bullets = [f"- {i.get('title') or i.get('event_type')}: {i.get('status') or 'open'}" for i in items[:8]]
        return "Compliance items I found:\n" + "\n".join(bullets)

    return (
        f"I can answer using the protected GridTMS data for {business_name}.\n\n"
        f"Current data snapshot:\n{_format_context(context)}\n\n"
        "Ask about a specific customer, load, invoice, revenue, settlement, or compliance item and I will narrow it down."
    )


def generate_chat_answer(message: str, business: dict | None = None) -> str:
    """Bedrock-enabled data assistant with a deterministic local fallback."""
    business_name = business.get("legal_name") if business else "this carrier account"
    business_id = str(business.get("id")) if business and business.get("id") else ""
    if business_id == settings.demo_business_id:
        context = DEMO_CHAT_CONTEXT
    else:
        context = _load_business_context(business_id) if business_id else {}
    context_text = _format_context(context)

    if not settings.use_aws:
        return _local_data_answer(message, business_name, context)

    try:
        import boto3

        client = boto3.client("bedrock-runtime", region_name=settings.aws_region)
        system_prompt = (
            "You are GridTMS AI, a concise operations assistant for a trucking TMS. "
            "You are allowed to answer only from the protected database context provided below. "
            "Do not invent records. If the context does not include the answer, say what data is missing. "
            "Be useful and operational: summarize customers, loads, invoices, settlements, locations, dispatch, and compliance."
        )
        response = client.converse(
            modelId=settings.bedrock_llm_model,
            system=[{"text": system_prompt}],
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "text": (
                                f"Business: {business_name}\n"
                                f"Protected GridTMS data context:\n{context_text}\n\n"
                                f"Question: {message}"
                            ),
                        }
                    ],
                }
            ],
            inferenceConfig={"maxTokens": 800, "temperature": 0.2},
        )
        return response["output"]["message"]["content"][0]["text"]
    except Exception as exc:
        fallback = _local_data_answer(message, business_name, context)
        return (
            "GridTMS AI could not reach Bedrock right now, so I used the local data-aware fallback.\n\n"
            f"{fallback}\n\n"
            f"Bedrock error: {exc}"
        )
