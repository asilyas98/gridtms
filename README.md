# GridTMS integrated package — one-terminal local backend fixed

This build has TWO backend options:

1. **Easy local mode**: run only the frontend server. It includes a same-origin Express backend for demo login, business verification testing, and AI chat.

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Use demo login:

```text
username: demo
password: demo
```

The AI chatbot works in this mode because `/chat` is handled by the same Express server. No Docker required for demo chat.

2. **Real Supabase/FastAPI mode**: run `backend/` separately and set `frontend/.env` to `VITE_API_BASE_URL=http://localhost:8081`. This is for real Supabase service-role account creation.


# GridTMS Integrated Fullstack

This package includes both systems in one folder:

- `frontend/` — your GridTMS React/Vite UI
- `backend/` — FastAPI secure backend with:
  - business verification before account creation
  - DOT number + MC number + business verification number checks
  - LLC/legal name matching
  - 2-step verification
  - Supabase Auth account creation/login
  - protected AI chatbot endpoint
  - protected TMS API routes
- `docs/supabase_secure_business_schema.sql` — run once in Supabase

## 1) Run the Supabase SQL once

Open Supabase SQL Editor and run:

```text
docs/supabase_secure_business_schema.sql
```

This creates the backend tables and seeds one local-test verified business:

```text
Legal name: Ahmed Trucking LLC
DOT: 23412312
MC: MC-2341234
Business verification number: EIN1234
Phone: 248-555-0101
```

## 2) Fill backend private values

Open:

```text
backend/.env
```

These public values are already filled:

```env
SUPABASE_URL=https://ntvjqhacuvcqdfpkwpgx.supabase.co
SUPABASE_ANON_KEY=sb_publishable_UCkcr8z9sI96dTwx4TYbSw_9EjQSkub
```

You still must replace these placeholders:

```env
SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_SUPABASE_SERVICE_ROLE_OR_SECRET_KEY
SUPABASE_DB_URL=postgresql://postgres.ntvjqhacuvcqdfpkwpgx:REPLACE_WITH_YOUR_DB_PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres
```

The service role key and database password are private backend-only values. Do not put them inside the frontend.

## 3) Run backend

From the root folder:

```powershell
.\start-backend.ps1
```

Or manually:

```powershell
cd backend
docker build -t gridtms-secure-backend .
docker run --rm --env-file .env -p 8081:8080 gridtms-secure-backend
```

Open:

```text
http://localhost:8081/docs
```

## 4) Run frontend

Open a second terminal from the root folder:

```powershell
.\start-frontend.ps1
```

Or manually:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL, usually:

```text
http://localhost:5173
```

## 5) Local account test flow

Use Create Account with:

```text
Legal name: Ahmed Trucking LLC
DOT: 23412312
MC: MC-2341234
Business verification number: EIN1234
Phone: 248-555-0101
```

Because `OTP_MODE=dev`, the backend returns the OTP code in the response and the frontend displays it for local testing. For production SMS, set `OTP_MODE=twilio` and fill the Twilio values in `backend/.env`.

## 6) AI chatbot

The orange chatbot button appears after login. It calls the protected backend route:

```text
POST /chat
```

By default `USE_AWS=false`, so it gives a local fallback answer. To use AWS Bedrock, set `USE_AWS=true` and configure AWS credentials or an ECS task role.

## Update: logout/login + data-aware AI assistant

This version fixes the sidebar logout button and auth state refresh:

- Sidebar logout clears the saved GridTMS access token and returns the app to the login screen.
- The auth gate listens for login/logout changes, so the UI updates immediately.
- The backend exposes `GET /auth/me` and `POST /auth/logout` for testing/clean API behavior.

A second AI assistant location was added:

- Sidebar item: **AI Assistant**
- Header `?` icon opens the AI Assistant page
- Floating chat button remains available
- `/chat` now loads protected Supabase data for the logged-in verified business: customers, loads, invoices, locations, settlements, and compliance events.

If `USE_AWS=false`, the assistant still answers with a local data-aware fallback. If `USE_AWS=true`, it sends the protected business-scoped data context to Bedrock.

## Update: streamlined business verification

Account creation now verifies these before it creates a Supabase Auth user:

- Legal LLC / company name
- Registered business street address
- Registered city, state, and ZIP
- Phone number, when the verified record has one
- DOT / USDOT number
- MC number
- Active operating authority/status

The local-test verified business is now:

```text
Legal name: Ahmed Trucking LLC
DOT: 23412312
MC: MC-2341234
Registered address: 123 Grid Logistics Way
City: Troy
State: MI
ZIP: 48083
Phone: 248-555-0101
```

Important: in `BUSINESS_VERIFICATION_MODE=manual`, verification checks your Supabase `verified_businesses` table. For true live FMCSA/KYB verification, set `BUSINESS_VERIFICATION_MODE=provider` and add a real provider URL/API key in `backend/.env`.

## Demo login

For local testing you can log in without creating a real account:

- Username: `demo`
- Password: `demo`

The demo account bypasses 2-step verification and uses a local demo token. Set `DEMO_LOGIN_ENABLED=false` in `backend/.env` before production. If you run `docs/supabase_secure_business_schema.sql`, demo customer/load/invoice rows are seeded for the AI assistant.
