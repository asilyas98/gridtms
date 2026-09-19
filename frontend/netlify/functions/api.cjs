const { json, bodyJson, getAuthenticatedUser } = require('./_shared.cjs');

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
  'company-settings': 'tms_company_settings',
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

async function listRows(resource, ownerId) {
  const table = TABLES[resource];
  if (!table) throw new Error(`Unknown API resource: ${resource}`);
  let order = 'created_at.desc';
  if (['customers', 'loads', 'locations', 'drivers', 'trucks', 'invoices', 'settlements', 'recurring-rules'].includes(resource)) {
    order = 'updated_at.desc.nullslast,created_at.desc';
  }
  return supabaseFetch(`${table}?select=*&owner_id=eq.${encodeURIComponent(ownerId)}&order=${encodeURIComponent(order)}`);
}

async function createRow(resource, payload, ownerId) {
  const table = TABLES[resource];
  if (!table) throw new Error(`Unknown API resource: ${resource}`);
  const scopedPayload = {
    ...(payload || {}),
    ...(resource === 'company-settings' ? { id: ownerId } : {}),
    owner_id: ownerId,
  };
  const rows = await supabaseFetch(table, {
    method: 'POST',
    ...(resource === 'company-settings' ? { headers: { Prefer: 'resolution=merge-duplicates,return=representation' } } : {}),
    body: JSON.stringify(scopedPayload),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function updateRow(resource, id, payload, ownerId) {
  const table = TABLES[resource];
  if (!table) throw new Error(`Unknown API resource: ${resource}`);
  const { owner_id: _ignoredOwner, ...safePayload } = payload || {};
  const rows = await supabaseFetch(`${table}?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...safePayload, updated_at: new Date().toISOString() }),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function deleteRow(resource, id, ownerId) {
  const table = TABLES[resource];
  if (!table) throw new Error(`Unknown API resource: ${resource}`);
  await supabaseFetch(`${table}?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}`, { method: 'DELETE' });
  return { ok: true, id };
}

async function ensureCompanySettings(user) {
  if (!user?.id || user.id === 'demo-user') return;
  const existing = await listRows('company-settings', user.id);
  if (Array.isArray(existing) && existing.length > 0) return;
  const metadata = user.user_metadata || {};
  const address = [metadata.registered_address, metadata.registered_city, metadata.registered_state, metadata.registered_zip]
    .filter(Boolean)
    .join(', ');
  await createRow('company-settings', {
    carrier_name: metadata.legal_name || '',
    dot_number: metadata.dot_number || '',
    mc_number: metadata.mc_number || '',
    address,
  }, user.id);
}

async function bootstrap(user) {
  await ensureCompanySettings(user);
  const resources = ['customers', 'loads', 'locations', 'drivers', 'trucks', 'invoices', 'settlements', 'recurring-rules', 'compliance', 'company-settings'];
  const results = await Promise.all(resources.map(async (resource) => {
    try {
      return { resource, rows: await listRows(resource, user.id), error: null };
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
    companySettings: byResource['company-settings']?.[0] || null,
    errors,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const user = await getAuthenticatedUser(event);
  if (!user) return json(401, { detail: 'A valid GridTMS login is required.' });

  try {
    const parts = parseApiPath(event);
    const resource = parts[0] || 'bootstrap';
    const id = parts[1];

    if (resource === 'bootstrap' && event.httpMethod === 'GET') {
      return json(200, await bootstrap(user));
    }

    if (!TABLES[resource]) {
      return json(404, { detail: `API resource not found: ${resource}` });
    }

    if (event.httpMethod === 'GET') {
      if (id) {
        const table = TABLES[resource];
        const rows = await supabaseFetch(`${table}?select=*&id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&limit=1`);
        return json(200, Array.isArray(rows) ? rows[0] || null : rows);
      }
      return json(200, await listRows(resource, user.id));
    }

    if (event.httpMethod === 'POST') {
      return json(200, await createRow(resource, await bodyJson(event), user.id));
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
      if (!id) return json(400, { detail: 'Record id is required for update.' });
      return json(200, await updateRow(resource, id, await bodyJson(event), user.id));
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return json(400, { detail: 'Record id is required for delete.' });
      return json(200, await deleteRow(resource, id, user.id));
    }

    return json(405, { detail: `Method not allowed: ${event.httpMethod}` });
  } catch (error) {
    return json(500, { detail: String(error?.message || error) });
  }
};
