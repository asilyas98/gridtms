# Link GridTMS and the Driver Cockpit

## 1. Update Supabase

Run these files in the Supabase SQL Editor, in order:

1. `frontend/src/schema/gridtms_backend_setup.sql`
2. `frontend/src/schema/platform_extensions_migration.sql`

Both scripts are safe to run again. The second script creates and updates the
owner-scoped `tms_driver_accounts` mapping used by the separate Driver Cockpit.

## 2. Configure the main GridTMS Netlify site

Add these environment variables to the main `gridtms.ai` Netlify project:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The service-role key is server-only. Never add it to the Driver Cockpit ZIP or
to a browser-side variable.

Deploy the main GridTMS ZIP first. Confirm that this URL returns a JSON error
instead of an HTML 404 page:

`https://gridtms.ai/driver-portal/session`

A `401` response is expected when no token is supplied and confirms the
function is deployed.

## 3. Deploy the Driver Cockpit

Deploy the separate Driver Cockpit ZIP to its own Netlify site. Its `config.js`
already points to `https://gridtms.ai`. Change that value only if the main
carrier application uses another domain.

## 4. Provision a driver

1. Sign in to the main GridTMS carrier application.
2. Open Asset Management → Driver Portal.
3. Select **Provision Driver Pass**.
4. Choose an existing saved driver and enter a unique email plus a temporary
   password of at least eight characters.
5. Use those credentials on the separate Driver Cockpit site.

Creating a driver roster record does not automatically create a login. The
Provision Driver Pass action creates the Supabase Auth user and securely maps
that login to the correct carrier and driver.
