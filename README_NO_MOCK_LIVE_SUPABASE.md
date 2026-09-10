# GridTMS Netlify Live Supabase Build — No Mock Data

This build removes the frontend mock arrays from the main data context.

The UI starts empty and loads live records from Supabase through Netlify Functions:

- `/api/bootstrap`
- `/api/customers`
- `/api/loads`
- `/api/locations`
- `/api/drivers`
- `/api/trucks`
- `/api/invoices`
- `/api/settlements`
- `/api/recurring-rules`
- `/chat`

## Required Supabase SQL

Run this once in Supabase SQL Editor:

```text
docs/supabase_no_mock_live_schema.sql
```

That creates empty app tables:

- `tms_customers`
- `tms_loads`
- `tms_locations`
- `tms_drivers`
- `tms_trucks`
- `tms_invoices`
- `tms_settlements`
- `tms_recurring_rules`
- `tms_compliance_events`

It only seeds `verified_businesses` and `verified_carriers` so account verification/demo login can still work.

## Netlify settings

Remove `@netlify/plugin-nextjs` if it is enabled.

Use:

```text
Base directory: frontend
Build command: npm run build
Publish directory: dist
Functions directory: netlify/functions
```

## Environment variables

Set these in Netlify → Site configuration → Environment variables:

```env
SUPABASE_URL=https://ntvjqhacuvcqdfpkwpgx.supabase.co
SUPABASE_ANON_KEY=sb_publishable_UCkcr8z9sI96dTwx4TYbSw_9EjQSkub
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

AI_PROVIDER=openai
AI_CHATBOT_ENABLED=true
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4o-mini

DEMO_LOGIN_ENABLED=true
DEMO_USERNAME=demo
DEMO_PASSWORD=demo

OTP_MODE=dev
OTP_TEST_CODE=123456
OTP_EXPIRATION_MINUTES=10
```

## Deploy with Netlify CLI

From the `frontend` folder:

```powershell
npm install
npm run build
npx netlify deploy --prod --dir=dist --functions=netlify/functions
```

## Expected behavior

After running the SQL, the UI should show no customers/loads/drivers/trucks/invoices until you create them.

When you create records from the UI, they are saved into Supabase and loaded again on refresh.

The AI chatbot answers from live Supabase rows only. If tables are empty, it will say you have 0 saved records.
