const { json, bodyJson, requireDemoAuth, aiAnswerFromLiveData } = require('./_shared.cjs');

async function readTable(table, limit = 20) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return { table, rows: [], error: 'Supabase env missing' };

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(table)}?select=*&limit=${limit}`;
  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { table, rows: [], error: `${response.status} ${await response.text().catch(() => '')}`.slice(0, 240) };
    }
    const rows = await response.json();
    return { table, rows: Array.isArray(rows) ? rows : [], error: null };
  } catch (error) {
    return { table, rows: [], error: String(error?.message || error).slice(0, 240) };
  }
}

async function getSupabaseContext() {
  // Supports both the earlier schema you currently showed in Supabase and the newer tms_* schema if you run it later.
  const tables = [
    'customers',
    'shipments',
    'customer_notes',
    'verified_carriers',
    'tms_customers',
    'tms_loads',
    'tms_locations',
    'tms_drivers',
    'tms_trucks',
    'tms_invoices',
    'tms_settlements',
    'tms_compliance_events',
  ];
  const results = await Promise.all(tables.map((table) => readTable(table, 25)));
  const available = results.filter((r) => r.rows.length > 0);
  const missing = results.filter((r) => r.rows.length === 0 && r.error).map((r) => `${r.table}: ${r.error}`);
  return { available, missing };
}

function compactContext(context) {
  const data = {};
  for (const item of context.available) data[item.table] = item.rows;
  return JSON.stringify(data, null, 2).slice(0, 16000);
}

async function openAiAnswer(message, context) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || (process.env.AI_PROVIDER || 'demo').toLowerCase() !== 'openai') {
    return null;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const system = `You are GridTMS AI, a logistics/TMS assistant. Answer using only the provided GridTMS/Supabase data. If the data is missing, say exactly what is missing and suggest what table/record is needed. Keep answers concise and operational. Never reveal secrets or environment variables.`;
  const user = `User question: ${message}\n\nGridTMS data context from Supabase:\n${compactContext(context)}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI request failed: ${response.status} ${errorText.slice(0, 300)}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') {
    return json(200, {
      status: 'chat function is deployed',
      usage: 'POST JSON to this endpoint with { "message": "Who are my customers?" }',
      ai_provider: process.env.AI_PROVIDER || 'demo',
      supabase_configured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
      openai_configured: Boolean(process.env.OPENAI_API_KEY),
    });
  }

  if (!requireDemoAuth(event)) return json(401, { detail: 'Login required. Use demo/demo first.' });

  const body = await bodyJson(event);
  const message = body.message || body.question || '';
  if (!String(message).trim()) return json(400, { detail: 'Message is required.' });

  try {
    const context = await getSupabaseContext();
    const realAnswer = await openAiAnswer(message, context);
    if (realAnswer) {
      return json(200, {
        answer: realAnswer,
        mode: 'openai-supabase-netlify',
        data_tables_found: context.available.map((x) => x.table),
      });
    }
    return json(200, {
      answer: aiAnswerFromLiveData(message, context),
      mode: 'live-supabase-rules',
      note: 'Set AI_PROVIDER=openai and OPENAI_API_KEY in Netlify to use OpenAI language generation. This response used live Supabase rows only.',
    });
  } catch (error) {
    return json(200, {
      answer: `The Netlify chat function is deployed, but the live AI/Supabase call failed: ${String(error?.message || error).slice(0, 500)}.`,
      mode: 'backend-error',
    });
  }
};
