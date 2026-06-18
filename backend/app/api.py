from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.auth import LoginRequest, RegisterRequest, get_current_user, password_login, register_user
from app.settings import settings
from app.verification import CarrierVerifyRequest, verify_carrier
from app.tms import GenericPayload, bootstrap, create_row, get_row, list_rows, soft_delete_row, update_row

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    app: str
    env: str


@app.get("/", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", app=settings.app_name, env=settings.app_env)


# -----------------------------
# Auth + carrier verification
# -----------------------------

@app.post("/carrier/verify")
def carrier_verify(payload: CarrierVerifyRequest):
    """
    Public pre-signup verification.
    In manual mode this checks verified_carriers in Supabase.
    In provider mode it can call DOT_PROVIDER_API_URL, then saves the verified result.
    """
    return verify_carrier(payload).model_dump()


@app.post("/auth/register")
def auth_register(payload: RegisterRequest):
    """
    Creates a Supabase Auth user only after DOT/MC carrier verification passes.
    Requires SUPABASE_SERVICE_ROLE_KEY in backend .env.
    """
    return register_user(payload)


@app.post("/auth/login")
def auth_login(payload: LoginRequest):
    """
    Logs in through Supabase Auth, then re-checks carrier verification before returning the session.
    """
    return password_login(payload)


@app.get("/auth/me")
def auth_me(user=Depends(get_current_user)):
    return {"user": user}


# -----------------------------
# Grid TMS data endpoints
# -----------------------------

@app.get("/bootstrap")
def get_bootstrap(user=Depends(get_current_user)):
    return bootstrap()


@app.get("/{table}")
def get_table(table: str, limit: int = 250, user=Depends(get_current_user)):
    return {table: list_rows(table, limit)}


@app.get("/{table}/{item_id}")
def get_item(table: str, item_id: str, user=Depends(get_current_user)):
    return {"data": get_row(table, item_id)}


@app.post("/{table}")
def create_item(table: str, payload: GenericPayload, user=Depends(get_current_user)):
    return {"data": create_row(table, payload.data)}


@app.put("/{table}/{item_id}")
def update_item(table: str, item_id: str, payload: GenericPayload, user=Depends(get_current_user)):
    return {"data": update_row(table, item_id, payload.data)}


@app.patch("/{table}/{item_id}")
def patch_item(table: str, item_id: str, payload: GenericPayload, user=Depends(get_current_user)):
    return {"data": update_row(table, item_id, payload.data)}


@app.delete("/{table}/{item_id}")
def delete_item(table: str, item_id: str, user=Depends(get_current_user)):
    return {"data": soft_delete_row(table, item_id)}
