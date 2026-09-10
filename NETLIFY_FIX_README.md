# GridTMS Netlify Functions Fix

Use this ZIP when the app loads but the chatbot returns `Request failed: 404`.

That 404 means Netlify deployed the frontend, but did not deploy the Functions backend.

## GitHub deploy settings

In Netlify:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

Or, if Netlify reads the root `netlify.toml`, it already has `base = "frontend"` configured.

## Required environment variables

Minimum demo:

```env
DEMO_LOGIN_ENABLED=true
DEMO_USERNAME=demo
DEMO_PASSWORD=demo
AI_PROVIDER=demo
AI_CHATBOT_ENABLED=true
```

Real OpenAI + Supabase chatbot:

```env
SUPABASE_URL=https://ntvjqhacuvcqdfpkwpgx.supabase.co
SUPABASE_ANON_KEY=sb_publishable_UCkcr8z9sI96dTwx4TYbSw_9EjQSkub
SUPABASE_SERVICE_ROLE_KEY=PASTE_SERVER_SIDE_SERVICE_ROLE_KEY
AI_PROVIDER=openai
AI_CHATBOT_ENABLED=true
OPENAI_API_KEY=PASTE_OPENAI_KEY
OPENAI_MODEL=gpt-4o-mini
DEMO_LOGIN_ENABLED=true
DEMO_USERNAME=demo
DEMO_PASSWORD=demo
OTP_MODE=dev
OTP_TEST_CODE=123456
OTP_EXPIRATION_MINUTES=10
```

## Test after deploy

Open these URLs:

- `https://YOUR-SITE.netlify.app/health`
- `https://YOUR-SITE.netlify.app/.netlify/functions/health`
- `https://YOUR-SITE.netlify.app/.netlify/functions/chat`

If those are 404, Functions are not deployed. Re-check the Netlify build settings above.
