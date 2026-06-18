# GridTMS Anas V3 + Secure Backend

This ZIP includes the original `gridtms-Anas-V3` frontend code and a separate secure FastAPI backend.

## What is included

```text
frontend/   # original GridTMS frontend from gridtms-Anas-V3.zip
backend/    # secure FastAPI backend
              - carrier DOT/MC verification
              - Supabase Auth register/login
              - protected GridTMS CRUD endpoints
              - generic endpoints for customers, loads, locations, drivers, trucks, trailers, invoices, settlements, etc.
docs/       # Supabase SQL schema for the backend tables
```

The frontend was kept intact. I added an optional helper file at:

```text
frontend/src/lib/backendApi.ts
```

Use that file when you are ready to replace direct `supabase.from(...)` calls in `frontend/src/context/DataContext.tsx` with calls to the backend.

## Supabase setup

Run this once in Supabase SQL Editor:

```text
docs/supabase_secure_backend_schema.sql
```

This creates the GridTMS tables and the `verified_carriers` table.

The schema seeds a demo verified carrier:

```text
Legal name: Ahmed Trucking LLC
DOT: 23412312
MC: MC-2341234
Phone: 248-555-0101
```

## Backend env

Edit:

```text
backend/.env
```

Fill these values:

```env
SUPABASE_DB_URL=postgresql://postgres.ntvjqhacuvcqdfpkwpgx:YOUR_PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://ntvjqhacuvcqdfpkwpgx.supabase.co
SUPABASE_ANON_KEY=your_publishable_or_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_secret_service_role_key
```

The service role key stays only in the backend. Never put it in the frontend.

## Run backend

From the project root:

```powershell
cd backend

docker build -t gridtms-secure-backend .

docker run --rm --env-file .env `
  -p 8081:8080 `
  gridtms-secure-backend
```

Open:

```text
http://localhost:8081/docs
```

## Run frontend

Open a second terminal from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the HTTP URL it prints, usually:

```text
http://localhost:5173
```

## Secure auth flow

The backend provides:

```text
POST /carrier/verify
POST /auth/register
POST /auth/login
GET  /auth/me
GET  /bootstrap
GET/POST/PUT/PATCH/DELETE /{table}
```

Register only succeeds after DOT + MC verification passes against `verified_carriers`.
Login re-checks carrier verification before returning a session.

## How to wire the original frontend to the backend

The existing frontend currently has central data functions in:

```text
frontend/src/context/DataContext.tsx
```

Many of those functions use:

```ts
supabase.from('customers')...
supabase.from('loads')...
```

To route through the secure backend instead, import:

```ts
import { backendFetch } from '../lib/backendApi';
```

Then replace direct Supabase calls with:

```ts
await backendFetch('/customers', {
  method: 'POST',
  body: JSON.stringify({ data: customerPayload }),
});
```

For loading all initial data:

```ts
const data = await backendFetch('/bootstrap');
setCustomers(data.customers || []);
setLoads(data.loads || []);
setLocations(data.locations || []);
```

The backend expects generic create/update payloads in this format:

```json
{ "data": { "name": "Target Corp" } }
```
