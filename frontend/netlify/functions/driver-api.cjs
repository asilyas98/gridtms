const { json, bodyJson, getAuthenticatedUser } = require('./_shared.cjs');
const { config, rest } = require('./_server-data.cjs');

const digits = value => String(value || '').replace(/\D/g, '');
const safe = value => String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_');

function route(event) {
  return String(event.path || '').replace(/^\/\.netlify\/functions\/driver-api/, '').replace(/^\/driver/, '').split('/').filter(Boolean);
}

async function mappingFor(authUserId) {
  const rows = await rest(`tms_driver_accounts?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=*&limit=1`);
  return rows?.[0] || null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const user = await getAuthenticatedUser(event);
  if (!user) return json(401, { detail: 'A valid Supabase driver login is required.' });
  try {
    const parts = route(event);
    const body = await bodyJson(event);

    if (parts[0] === 'connect' && event.httpMethod === 'POST') {
      const phone = digits(user.phone || body.phone);
      const dot = digits(body.dot_number);
      if (!phone || !dot) return json(400, { detail: 'The authenticated phone number and company DOT number are required.' });
      const companies = await rest('tms_company_settings?select=owner_id,dot_number');
      const company = companies.find(row => digits(row.dot_number) === dot);
      if (!company) return json(404, { detail: 'No GridTMS company matches that DOT number.' });
      const drivers = await rest(`tms_drivers?owner_id=eq.${encodeURIComponent(company.owner_id)}&select=*&limit=1000`);
      const driver = drivers.find(row => digits(row.phone) === phone);
      if (!driver) return json(403, { detail: 'Your verified phone number is not attached to a driver in this carrier account.' });
      const rows = await rest('tms_driver_accounts?on_conflict=auth_user_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ auth_user_id: user.id, owner_id: company.owner_id, driver_id: driver.id, updated_at: new Date().toISOString() }),
      });
      return json(200, { connected: true, driver, connection: rows?.[0] });
    }

    const mapping = await mappingFor(user.id);
    if (!mapping) return json(403, { detail: 'Connect this driver login to a carrier using POST /driver/connect first.' });

    if (parts[0] === 'profile' && event.httpMethod === 'GET') {
      const rows = await rest(`tms_drivers?id=eq.${encodeURIComponent(mapping.driver_id)}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}&select=*&limit=1`);
      return json(200, rows?.[0] || null);
    }
    if (parts[0] === 'loads' && !parts[1] && event.httpMethod === 'GET') {
      const rows = await rest(`tms_loads?owner_id=eq.${encodeURIComponent(mapping.owner_id)}&driver_id=eq.${encodeURIComponent(mapping.driver_id)}&select=*&order=updated_at.desc`);
      return json(200, rows);
    }
    if (parts[0] === 'telemetry' && event.httpMethod === 'PATCH') {
      const allowed = {
        current_location: body.current_location,
        hos_duty_status: body.hos_duty_status,
        updated_at: new Date().toISOString(),
      };
      const rows = await rest(`tms_drivers?id=eq.${encodeURIComponent(mapping.driver_id)}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}`, { method: 'PATCH', body: JSON.stringify(allowed) });
      return json(200, rows?.[0] || null);
    }
    if (parts[0] === 'loads' && parts[1] && event.httpMethod === 'PATCH') {
      const allowedStatuses = ['Dispatched', 'In Transit', 'At Pickup', 'Loaded', 'At Delivery', 'Delivered'];
      if (!allowedStatuses.includes(body.status)) return json(400, { detail: 'Invalid driver load status.' });
      const rows = await rest(`tms_loads?id=eq.${encodeURIComponent(parts[1])}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}&driver_id=eq.${encodeURIComponent(mapping.driver_id)}`, {
        method: 'PATCH', body: JSON.stringify({ status: body.status, updated_at: new Date().toISOString() }),
      });
      if (!rows?.[0]) return json(404, { detail: 'Assigned load not found.' });
      return json(200, rows[0]);
    }
    if (parts[0] === 'loads' && parts[1] && parts[2] === 'document' && event.httpMethod === 'POST') {
      const bytes = Buffer.from(String(body.data_base64 || ''), 'base64');
      if (!bytes.length || bytes.length > 4 * 1024 * 1024) return json(400, { detail: 'Document must be between 1 byte and 4 MB.' });
      const loads = await rest(`tms_loads?id=eq.${encodeURIComponent(parts[1])}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}&driver_id=eq.${encodeURIComponent(mapping.driver_id)}&select=*&limit=1`);
      const load = loads?.[0];
      if (!load) return json(404, { detail: 'Assigned load not found.' });
      const { url, key } = config();
      const objectPath = `${mapping.owner_id}/driver/${safe(mapping.driver_id)}/${Date.now()}_${safe(body.file_name || 'document')}`;
      const upload = await fetch(`${url}/storage/v1/object/documents/${objectPath}`, {
        method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': body.content_type || 'application/octet-stream', 'x-upsert': 'false' }, body: bytes,
      });
      if (!upload.ok) throw new Error(await upload.text());
      const sign = await fetch(`${url}/storage/v1/object/sign/documents/${objectPath}`, {
        method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 31536000 }),
      });
      const signed = await sign.json();
      if (!sign.ok) throw new Error(signed.message || 'Unable to sign uploaded document.');
      const documentUrl = String(signed.signedURL || signed.signedUrl || '');
      const doc = { id: `driver-${Date.now()}`, name: body.file_name || 'Driver document', type: body.document_type || 'POD', date: new Date().toISOString(), url: documentUrl.startsWith('http') ? documentUrl : `${url}/storage/v1${documentUrl}`, path: objectPath };
      const documents = [...(load.documents || []), doc];
      const patch = { documents, updated_at: new Date().toISOString(), ...(body.document_type === 'POD' ? { status: 'Delivered' } : {}) };
      const rows = await rest(`tms_loads?id=eq.${encodeURIComponent(load.id)}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
      return json(200, { document: doc, load: rows?.[0] });
    }
    return json(404, { detail: 'Driver API route not found.' });
  } catch (error) {
    return json(500, { detail: error.message || 'Driver API request failed.' });
  }
};
