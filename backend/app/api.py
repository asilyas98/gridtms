from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from app.chat import generate_chat_answer
from app.settings import settings
from app.supabase_auth import (
    create_business_account,
    get_demo_auth_result,
    require_current_user,
    supabase_admin_create_user,
    supabase_login,
)
from app.tms import TABLES, bootstrap, create_resource, list_resource
from app.verification import create_otp_challenge, verify_business, verify_otp_challenge

app = FastAPI(title="GridTMS Secure Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BusinessVerifyRequest(BaseModel):
    legal_name: str = Field(..., min_length=2)
    registered_address: str = Field(..., min_length=3)
    registered_city: str = Field(..., min_length=2)
    registered_state: str = Field(..., min_length=2)
    registered_zip: str = Field(..., min_length=3)
    dot_number: str = Field(..., min_length=5)
    mc_number: str = Field(..., min_length=5)
    phone: str | None = None


class RegisterStartRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=8)
    legal_name: str = Field(..., min_length=2)
    registered_address: str = Field(..., min_length=3)
    registered_city: str = Field(..., min_length=2)
    registered_state: str = Field(..., min_length=2)
    registered_zip: str = Field(..., min_length=3)
    phone: str = Field(..., min_length=7)
    dot_number: str = Field(..., min_length=5)
    mc_number: str = Field(..., min_length=5)


class RegisterCompleteRequest(BaseModel):
    challenge_id: str
    otp_code: str


class LoginStartRequest(BaseModel):
    email: str
    password: str


class LoginCompleteRequest(BaseModel):
    challenge_id: str
    otp_code: str


class DemoLoginRequest(BaseModel):
    username: str
    password: str


class ChatRequest(BaseModel):
    message: str


class GenericCreateRequest(BaseModel):
    data: dict[str, Any]


@app.get("/")
def root():
    return {
        "status": "ok",
        "name": "GridTMS Secure Backend",
        "routes": [
            "POST /business/verify",
            "POST /auth/register/start",
            "POST /auth/register/complete",
            "POST /auth/login/start",
            "POST /auth/login/complete",
            "POST /chat",
            "GET /bootstrap",
            "GET/POST /{resource}",
        ],
    }


@app.post("/business/verify")
def business_verify(payload: BusinessVerifyRequest):
    return verify_business(
        company_name=payload.legal_name,
        dot_number=payload.dot_number,
        mc_number=payload.mc_number,
        phone=payload.phone,
        registered_address=payload.registered_address,
        registered_city=payload.registered_city,
        registered_state=payload.registered_state,
        registered_zip=payload.registered_zip,
    )


@app.post("/auth/register/start")
def register_start(payload: RegisterStartRequest):
    verified = verify_business(
        company_name=payload.legal_name,
        dot_number=payload.dot_number,
        mc_number=payload.mc_number,
        phone=payload.phone,
        registered_address=payload.registered_address,
        registered_city=payload.registered_city,
        registered_state=payload.registered_state,
        registered_zip=payload.registered_zip,
    )

    if not verified.get("verified"):
        raise HTTPException(status_code=403, detail=verified.get("message", "Business verification failed."))

    challenge = create_otp_challenge(
        email=str(payload.email),
        phone=payload.phone,
        purpose="register",
        payload={
            "full_name": payload.full_name,
            "email": str(payload.email),
            "password": payload.password,
            "legal_name": payload.legal_name,
            "phone": payload.phone,
            "registered_address": payload.registered_address,
            "registered_city": payload.registered_city,
            "registered_state": payload.registered_state,
            "registered_zip": payload.registered_zip,
            "dot_number": verified.get("dot_number"),
            "mc_number": verified.get("mc_number"),
            "verified": verified,
        },
    )

    return {
        "message": "Business verified. Enter the 2-step verification code sent to the phone number.",
        "challenge_id": str(challenge["id"]),
        "expires_at": challenge["expires_at"],
        "dev_otp": challenge.get("dev_otp"),
    }


@app.post("/auth/register/complete")
def register_complete(payload: RegisterCompleteRequest):
    challenge = verify_otp_challenge(payload.challenge_id, payload.otp_code, purpose="register")
    registration = challenge.get("payload") or {}
    verified = registration.get("verified") or {}

    user = supabase_admin_create_user(
        email=registration["email"],
        password=registration["password"],
        metadata={
            "full_name": registration.get("full_name"),
            "legal_name": verified.get("legal_name"),
            "phone": registration.get("phone"),
            "registered_address": verified.get("registered_address"),
            "registered_city": verified.get("registered_city"),
            "registered_state": verified.get("registered_state"),
            "registered_zip": verified.get("registered_zip"),
            "dot_number": verified.get("dot_number"),
            "mc_number": verified.get("mc_number"),
            "business_verified": True,
            "two_step_verified": True,
            "authority_status": verified.get("authority_status"),
            "verification_source": verified.get("source"),
        },
    )

    account = create_business_account(
        user_id=user["id"],
        email=registration["email"],
        verified=verified,
        phone=registration.get("phone"),
        business_verification_number=None,
        registered_address=verified.get("registered_address"),
        registered_city=verified.get("registered_city"),
        registered_state=verified.get("registered_state"),
        registered_zip=verified.get("registered_zip"),
    )

    return {"message": "Account created and verified.", "user": user, "business_account": account}


@app.post("/auth/demo-login")
def demo_login(payload: DemoLoginRequest):
    if not settings.demo_login_enabled:
        raise HTTPException(status_code=403, detail="Demo login is disabled.")

    username_ok = payload.username.strip().lower() == settings.demo_username.lower()
    password_ok = payload.password == settings.demo_password
    if not username_ok or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid demo username or password.")

    return get_demo_auth_result()


@app.post("/auth/login/start")
def login_start(payload: LoginStartRequest):
    if settings.demo_login_enabled and payload.email.strip().lower() == settings.demo_username.lower() and payload.password == settings.demo_password:
        return {**get_demo_auth_result(), "direct_login": True}

    auth_result = supabase_login(str(payload.email), payload.password)
    user = auth_result.get("user") or {}
    metadata = user.get("user_metadata") or {}

    verified = verify_business(
        company_name=metadata.get("legal_name") or metadata.get("full_name") or "",
        dot_number=metadata.get("dot_number") or "",
        mc_number=metadata.get("mc_number") or "",
        phone=metadata.get("phone"),
        registered_address=metadata.get("registered_address"),
        registered_city=metadata.get("registered_city"),
        registered_state=metadata.get("registered_state"),
        registered_zip=metadata.get("registered_zip"),
    )
    if not verified.get("verified"):
        raise HTTPException(status_code=403, detail="Login blocked because business verification failed.")

    challenge = create_otp_challenge(
        email=str(payload.email),
        phone=metadata.get("phone") or "",
        purpose="login",
        payload={"auth_result": auth_result},
    )

    return {
        "message": "Enter the 2-step verification code sent to your phone.",
        "challenge_id": str(challenge["id"]),
        "expires_at": challenge["expires_at"],
        "dev_otp": challenge.get("dev_otp"),
    }


@app.post("/auth/login/complete")
def login_complete(payload: LoginCompleteRequest):
    challenge = verify_otp_challenge(payload.challenge_id, payload.otp_code, purpose="login")
    auth_result = (challenge.get("payload") or {}).get("auth_result")
    if not auth_result:
        raise HTTPException(status_code=400, detail="Login challenge missing session payload.")
    return auth_result




@app.get("/auth/me")
def auth_me(current=Depends(require_current_user)):
    return {"user": current["user"], "business": current["business"]}


@app.post("/auth/logout")
def auth_logout():
    # Supabase access tokens are stateless on the API side.
    # The frontend clears its saved token; this endpoint exists for a clean button target.
    return {"message": "Logged out. Clear the browser session token."}


@app.post("/chat")
def chat(payload: ChatRequest, current=Depends(require_current_user)):
    answer = generate_chat_answer(payload.message, business=current["business"])
    return {"answer": answer}


@app.get("/bootstrap")
def get_bootstrap(current=Depends(require_current_user)):
    return bootstrap(str(current["business"]["id"]))


@app.get("/{resource}")
def list_any_resource(resource: str, current=Depends(require_current_user)):
    if resource not in TABLES:
        raise HTTPException(status_code=404, detail="Unknown resource.")
    return {resource: list_resource(resource, str(current["business"]["id"]))}


@app.post("/{resource}")
def create_any_resource(resource: str, payload: GenericCreateRequest, current=Depends(require_current_user)):
    if resource not in TABLES:
        raise HTTPException(status_code=404, detail="Unknown resource.")
    created = create_resource(resource, str(current["business"]["id"]), payload.data)
    return {resource[:-1] if resource.endswith("s") else resource: created}
