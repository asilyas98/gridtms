const { json } = require('./_shared.cjs');

const REQUIRED_TABLES = [
  'tms_customers', 'tms_locations', 'tms_drivers', 'tms_trucks', 'tms_loads',
  'tms_invoices', 'tms_settlements', 'tms_recurring_rules',
  'tms_compliance_events', 'tms_company_settings',
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return json(503, {
      status: 'configuration_required',
      backend: 'unavailable',
      detail: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for Netlify Functions.',
    });
  }

  const checks = await Promise.all(REQUIRED_TABLES.map(async (table) => {
    try {
      const response = await fetch(`${url}/rest/v1/${table}?select=id,owner_id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!response.ok) return { table, ok: false, error: (await response.text()).slice(0, 300) };
      return { table, ok: true };
    } catch (error) {
      return { table, ok: false, error: String(error?.message || error).slice(0, 300) };
    }
  }));
  const failed = checks.filter((check) => !check.ok);
  return json(failed.length ? 503 : 200, {
    status: failed.length ? 'migration_required' : 'ok',
    release: '1.0.5-backend-sync',
    platform: 'netlify-functions',
    backend: failed.length ? 'unavailable' : 'ready',
    tables: checks,
    ...(failed.length ? { detail: 'Run frontend/src/schema/gridtms_backend_setup.sql in Supabase SQL Editor.' } : {}),
  });
};
