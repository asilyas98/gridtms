from __future__ import annotations

from typing import Any

from app.db import execute_returning, fetch_all
from app.settings import settings

TABLES = {
    "customers": "customers",
    "loads": "loads",
    "locations": "locations",
    "drivers": "drivers",
    "trucks": "trucks",
    "invoices": "invoices",
    "settlements": "settlements",
    "compliance_events": "compliance_events",
}

ALLOWED_COLUMNS = {
    "customers": ["name", "company", "email", "phone", "customer_type", "status", "notes"],
    "loads": ["load_number", "customer", "origin", "destination", "status", "pickup_date", "delivery_date", "driver", "truck", "equipment", "miles", "rate", "notes"],
    "locations": ["name", "address", "city", "state", "zip", "location_type", "contact_name", "phone", "notes"],
    "drivers": ["name", "phone", "email", "cdl_number", "status", "notes"],
    "trucks": ["unit_number", "truck_type", "vin", "plate", "status", "notes"],
    "invoices": ["invoice_number", "load_number", "customer", "amount", "status", "due_date", "notes"],
    "settlements": ["driver", "load_number", "gross_pay", "deductions", "net_pay", "status", "notes"],
    "compliance_events": ["event_type", "title", "description", "status", "payload"],
}


def list_resource(resource: str, business_id: str) -> list[dict]:
    if business_id == settings.demo_business_id:
        try:
            table = TABLES[resource]
            rows = fetch_all(
                f"select * from {table} where business_account_id = %s order by created_at desc limit 200",
                (business_id,),
            )
            if rows:
                return rows
        except Exception:
            pass
        return DEMO_BOOTSTRAP.get(resource, [])

    table = TABLES[resource]
    return fetch_all(
        f"select * from {table} where business_account_id = %s order by created_at desc limit 200",
        (business_id,),
    )


def create_resource(resource: str, business_id: str, data: dict[str, Any]) -> dict:
    table = TABLES[resource]
    allowed = ALLOWED_COLUMNS[resource]

    clean = {key: value for key, value in data.items() if key in allowed and value not in ["", None]}
    clean["business_account_id"] = business_id

    columns = list(clean.keys())
    placeholders = ", ".join(["%s"] * len(columns))
    col_sql = ", ".join(columns)
    values = tuple(clean[col] for col in columns)

    return execute_returning(
        f"insert into {table} ({col_sql}) values ({placeholders}) returning *",
        values,
    )


def bootstrap(business_id: str) -> dict:
    return {resource: list_resource(resource, business_id) for resource in TABLES.keys()}


DEMO_BOOTSTRAP = {
    "customers": [
        {"id": "demo-cust-1", "name": "Target Corp", "company": "Target Corp", "email": "ap@target.demo", "phone": "612-304-6073", "status": "active", "customer_type": "shipper"},
        {"id": "demo-cust-2", "name": "Amazon Logistics", "company": "Amazon Logistics", "email": "billing@amazon.demo", "phone": "206-266-1000", "status": "active", "customer_type": "shipper"},
    ],
    "loads": [
        {"id": "demo-load-1", "load_number": "LD-004521", "customer": "Target Corp", "origin": "Chicago Terminal", "destination": "Target Columbus DC", "status": "Invoiced", "driver": "Marcus Williams", "equipment": "Dry Van 53'", "miles": 368.2, "rate": 1039.78},
        {"id": "demo-load-2", "load_number": "LD-004520", "customer": "Amazon Logistics", "origin": "Walmart DC #6029", "destination": "Target Columbus DC", "status": "Paid", "driver": "Sarah Peterson", "equipment": "Dry Van 53'", "miles": 512, "rate": 1247.50},
    ],
    "locations": [
        {"id": "demo-loc-1", "name": "Chicago Terminal", "city": "Chicago", "state": "IL", "location_type": "terminal"},
        {"id": "demo-loc-2", "name": "Target Columbus DC", "city": "Columbus", "state": "OH", "location_type": "consignee"},
    ],
    "drivers": [
        {"id": "demo-driver-1", "name": "Marcus Williams", "status": "active"},
        {"id": "demo-driver-2", "name": "Sarah Peterson", "status": "active"},
    ],
    "trucks": [
        {"id": "demo-truck-1", "unit_number": "TR-1042", "truck_type": "sleeper", "status": "active"},
    ],
    "invoices": [
        {"id": "demo-inv-1", "invoice_number": "INV-1001", "load_number": "LD-004521", "customer": "Target Corp", "amount": 1039.78, "status": "open"},
    ],
    "settlements": [
        {"id": "demo-set-1", "driver": "Marcus Williams", "load_number": "LD-004521", "gross_pay": 725, "deductions": 85, "net_pay": 640, "status": "draft"},
    ],
    "compliance_events": [
        {"id": "demo-comp-1", "event_type": "audit", "title": "DOT audit readiness", "description": "Demo compliance score is 95%.", "status": "ready"},
    ],
}
