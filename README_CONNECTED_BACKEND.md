# Grid TMS + Supabase Backend Connected Build

This build keeps the Grid TMS frontend design, but connects the core buttons/actions to a FastAPI backend that writes to Supabase Postgres.

Connected actions include:
- Create / edit / delete customers -> `tms_customers`
- Create / update / delete loads -> `tms_loads`
- Create / edit / delete locations -> `tms_locations`
- Add / update drivers and units -> `tms_drivers`, `tms_trucks`
- Generate invoices -> `tms_invoices`
- Update invoice/payment/customer credit values -> persisted via backend
- Recurring pay rules -> `tms_recurring_rules`
- DOT audit package generation -> `tms_compliance_events`
- ACH payout events -> `tms_compliance_events`

## 1. Run Supabase SQL

Open Supabase SQL Editor and run:

```sql
-- paste docs/supabase_schema.sql here
```

This creates the `tms_*` tables and `verified_carriers`.

## 2. Backend setup

Edit `backend/.env` and replace `REPLACE_WITH_YOUR_DB_PASSWORD` in `SUPABASE_DB_URL` with your Supabase DB password.

Use the pooler username format:

```env
SUPABASE_DB_URL=postgresql://postgres.ntvjqhacuvcqdfpkwpgx:YOUR_PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres
```

Then run:

```powershell
cd backend

docker build -t truckingai-backend .

docker run --rm --env-file .env `
  -p 8081:8080 `
  truckingai-backend
```

Open:

```text
http://localhost:8081/docs
```

## 3. Frontend setup

In a second terminal:

```powershell
npm install
npm run dev
```

Open the Vite URL it prints, usually:

```text
http://localhost:5173
```

## 4. Verify Supabase rows

After creating a load/customer/location/invoice, run:

```sql
select * from tms_loads order by updated_at desc;
select * from tms_customers order by updated_at desc;
select * from tms_locations order by updated_at desc;
select * from tms_invoices order by updated_at desc;
select * from tms_compliance_events order by updated_at desc;
```

## Notes

The frontend uses optimistic UI updates. If the backend is off, the UI still changes locally, but it will not persist to Supabase. Keep the backend terminal running while testing connected buttons.
