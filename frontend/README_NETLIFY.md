# GridTMS Netlify Build

This folder is Netlify-ready.

## Deploy settings in Netlify

Use these settings when importing the project:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `frontend/dist`
- Functions directory: `frontend/netlify/functions`

The `netlify.toml` file already defines these for a project whose Netlify base directory is `frontend`.

## Demo login

Username: `demo`
Password: `demo`

## Chatbot

The AI chatbot works through a Netlify Function:

- Frontend route: `POST /chat`
- Netlify function: `netlify/functions/chat.cjs`

So on Netlify it does not need Docker or the local FastAPI server for demo mode.

## Real Supabase mode

The current Netlify functions are safe demo/serverless functions. For real business verification and real Supabase writes, add these environment variables in Netlify:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Then expand the Netlify functions to query your actual Supabase tables. Do not put the service-role key in frontend `.env` files.
