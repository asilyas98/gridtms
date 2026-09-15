const { json, bodyJson, requireDemoAuth } = require('./_shared.cjs');

const TABLES = {
  customers: 'tms_customers',
  loads: 'tms_loads',
  locations: 'tms_locations',
  drivers: 'tms_drivers',
  trucks: 'tms_trucks',
  invoices: 'tms_invoices',
  settlements: 'tms_settlements',
  'recurring-rules': 'tms_recurring_rules',
  compliance: 'tms_compliance_events',
};

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify.');
  return { url: url.replace(/\/$/, ''), key };
}

async function supabaseFetch(path, options = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.message || data?.details || text || `Supabase ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function parseApiPath(event) {
  let path = event.path || '';
  path = path.replace(/^\/\.netlify\/functions\/api/, '');
  path = path.replace(/^\/api/, '');
  path = path.replace(/^\//, '');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return parts;
}

async function listRows(resource) {
  const table = TABLES[resource];
  if (!table) throw new Error(`Unknown API resource: ${resource}`);
  let order = 'created_at.desc';
  if (['customers', 'loads', 'locations', 'drivers', 'trucks', 'invoices', 'settlements', 'recurring-rules'].includes(resource)) {
    order = 'updated_at.desc.nullslast,created_at.desc';
  }
  return supabaseFetch(`${table}?select=*&order=${encodeURIComponent(order)}`);
}

async function createRow(resource, payload) {
  const table = TABLES[resource];
  if (!table) throw new Error(`Unknown API resource: ${resource}`);
  const rows = await supabaseFetch(table, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function updateRow(resource, id, payload) {
  const table = TABLES[resource];
  if (!table) throw new Error(`Unknown API resource: ${resource}`);
  const rows = await supabaseFetch(`${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...(payload || {}), updated_at: new Date().toISOString() }),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function deleteRow(resource, id) {
  const table = TABLES[resource];
  if (!table) throw new Error(`Unknown API resource: ${resource}`);
  await supabaseFetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  return { ok: true, id };
}

async function bootstrap() {
  const resources = ['customers', 'loads', 'locations', 'drivers', 'trucks', 'invoices', 'settlements', 'recurring-rules', 'compliance'];
  const results = await Promise.all(resources.map(async (resource) => {
    try {
      return { resource, rows: await listRows(resource), error: null };
    } catch (error) {
      console.error(`Bootstrap could not load ${resource}:`, error);
      return { resource, rows: [], error: String(error?.message || error) };
    }
  }));
  const byResource = Object.fromEntries(results.map(result => [result.resource, result.rows]));
  const errors = Object.fromEntries(results.filter(result => result.error).map(result => [result.resource, result.error]));
  return {
    customers: byResource.customers,
    loads: byResource.loads,
    locations: byResource.locations,
    drivers: byResource.drivers,
    trucks: byResource.trucks,
    invoices: byResource.invoices,
    settlements: byResource.settlements,
    recurringRules: byResource['recurring-rules'],
    complianceEvents: byResource.compliance,
    errors,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (!requireDemoAuth(event)) return json(401, { detail: 'Login required. Use demo/demo first.' });

  try {
    const parts = parseApiPath(event);
    const resource = parts[0] || 'bootstrap';
    const id = parts[1];

    if (resource === 'bootstrap' && event.httpMethod === 'GET') {
      return json(200, await bootstrap());
    }

    if (!TABLES[resource]) {
      return json(404, { detail: `API resource not found: ${resource}` });
    }

    if (event.httpMethod === 'GET') {
      if (id) {
        const table = TABLES[resource];
        const rows = await supabaseFetch(`${table}?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
        return json(200, Array.isArray(rows) ? rows[0] || null : rows);
      }
      return json(200, await listRows(resource));
    }

    if (event.httpMethod === 'POST') {
      return json(200, await createRow(resource, await bodyJson(event)));
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
      if (!id) return json(400, { detail: 'Record id is required for update.' });
      return json(200, await updateRow(resource, id, await bodyJson(event)));
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return json(400, { detail: 'Record id is required for delete.' });
      return json(200, await deleteRow(resource, id));
    }

    return json(405, { detail: `Method not allowed: ${event.httpMethod}` });
  } catch (error) {
    return json(500, { detail: String(error?.message || error) });
  }
};
