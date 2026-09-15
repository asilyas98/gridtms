# GridTMS Netlify Build

This project is Netlify-ready. The root `netlify.toml` is the recommended
configuration and works without setting a Netlify base directory.

## Deploy settings in Netlify

Use these settings when importing the project:

- Base directory: leave blank
- Build command: `npm run build`
- Publish directory: `frontend/dist`
- Functions directory: `frontend/netlify/functions`

The root `netlify.toml` defines these settings and also prevents false-positive
secret-scan failures for the public Supabase URL and anonymous/publishable key.
Secret scanning remains enabled for private values such as
`SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY`.

If the Netlify project already has a `SECRETS_SCAN_OMIT_KEYS` environment
variable, either remove it and let `netlify.toml` provide the value, or make
sure its comma-separated value includes `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`.

## Demo login

Username: `demo`
Password: `demo`

## Chatbot

The AI chatbot works through a Netlify Function:

- Frontend route: `POST /chat`
- Netlify function: `netlify/functions/chat.cjs`

So on Netlify it does not need Docker or the local FastAPI server for demo mode.

## Live FMCSA business verification

Add `FMCSA_WEB_KEY` as a server-only Netlify environment variable. Registration
looks up the entered USDOT number using FMCSA QCMobile, confirms the carrier is
allowed to operate, and compares the legal name, MC number, physical address,
city, state, ZIP, and phone. A successful result is cached in Supabase when
`SUPABASE_SERVICE_ROLE_KEY` is configured. Cached Supabase data is used only if
FMCSA is temporarily unavailable.

Do not prefix `FMCSA_WEB_KEY` with `VITE_` and do not place its value in source
files.

Run `src/schema/fmcsa_verification_migration.sql` once in Supabase SQL Editor
to create the non-destructive verification cache used when FMCSA is temporarily
unavailable.

## Real Supabase mode

Before using Asset Management, open Supabase **SQL Editor** and run:

`src/schema/asset_management_migration.sql`

This creates/updates the `tms_drivers` and `tms_trucks` columns used by the API,
and prepares the `documents/assets` Storage location for compliance files.

Before using Location Management, also run:

`src/schema/location_management_migration.sql`

This non-destructively aligns `tms_locations` with every field in the location
form and enables uploads under `documents/locations`.

The current Netlify functions are safe demo/serverless functions. For real business verification and real Supabase writes, add these environment variables in Netlify:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Then expand the Netlify functions to query your actual Supabase tables. Do not put the service-role key in frontend `.env` files.

## Signup email and SMS

The Netlify registration functions send the same one-time verification code by
email (Resend) and SMS (Twilio), followed by welcome notifications after the
code is verified. Add these server-only environment variables in Netlify:

- `OTP_MODE=live`
- `OTP_EXPIRY_MINUTES=10`
- `OTP_SIGNING_SECRET` (a long random value)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_PHONE` (an E.164 Twilio number, such as `+12485550101`)
- `RESEND_API_KEY`
- `SIGNUP_FROM_EMAIL` (a sender on a domain verified in Resend)

Do not prefix any of these private values with `VITE_`. For local testing,
leave `OTP_MODE=dev`; the UI will display the test code instead of contacting
Twilio and Resend.
