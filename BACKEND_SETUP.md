# GridTMS backend setup

1. Open the Supabase project used by Netlify.
2. Open **SQL Editor → New query**.
3. Paste and run the complete contents of:
   `SUPABASE_STORAGE_SETUP.sql` (for Storage bucket & RLS policies)
   followed by:
   `frontend/src/schema/gridtms_backend_setup.sql` (for tables and indexes)
4. In Supabase, open **Storage**:
   - Verify the `documents` bucket exists and has the **Public** badge.
5. In Netlify (or your hosting environment), confirm these variables are available:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Trigger a new deploy or restart the app.
7. Open `/health` or check the app status.

The backend is ready when `/health` returns:

```json
{"status":"ok","backend":"ready"}
```

If you were already logged in before deploying this version, log out and log
back in once. This stores the refresh token needed to keep saves working after
the one-hour Supabase access token expires.
