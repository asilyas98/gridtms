# GridTMS backend setup

1. Open the Supabase project used by Netlify.
2. Open **SQL Editor → New query**.
3. Paste and run `frontend/src/schema/gridtms_backend_setup.sql`, followed by
   `frontend/src/schema/platform_extensions_migration.sql`.
4. In Supabase, open **Storage**:
   - Verify the `documents` bucket exists and is **Private**.
5. In Netlify (or your hosting environment), confirm these variables are available:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY` and optionally `LLAMAINDEX_MODEL`
   - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`
6. In Stripe, create a recurring Price, put its `price_...` ID in
   `STRIPE_PRICE_ID`, and add a webhook endpoint at
   `https://gridtms.ai/stripe/webhook`. Subscribe it to
   `checkout.session.completed` and all `customer.subscription.*` events.
7. Trigger a new deploy or restart the app.
8. Open `/health` or check the app status.

The backend is ready when `/health` returns:

```json
{"status":"ok","backend":"ready"}
```

If you were already logged in before deploying this version, log out and log
back in once. This stores the refresh token needed to keep saves working after
the one-hour Supabase access token expires.
