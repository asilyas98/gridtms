const { json, bodyJson, getAuthenticatedUser } = require('./_shared.cjs');
const { config, rest } = require('./_server-data.cjs');

function route(event) {
  return String(event.path || '')
    .replace(/^\/\.netlify\/functions\/driver-portal/, '')
    .replace(/^\/driver-portal/, '')
    .split('/')
    .filter(Boolean);
}

function authConfig() {
  const { url } = config();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for driver provisioning.');
  if (!anonKey) throw new Error('SUPABASE_ANON_KEY is required for driver login.');
  return { url, serviceKey, anonKey };
}

async function authRequest(path, options = {}, admin = false) {
  const { url, serviceKey, anonKey } = authConfig();
  const key = admin ? serviceKey : anonKey;
  const response = await fetch(`${url}/auth/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(data.msg || data.message || data.error_description || `Supabase Auth returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function findAuthUserByEmail(email) {
  const result = await authRequest('admin/users?page=1&per_page=1000', { method: 'GET' }, true);
  return (result.users || []).find(user => String(user.email || '').toLowerCase() === email) || null;
}

async function sendDriverVerificationEmail(email) {
  await authRequest('otp', {
    method: 'POST',
    body: JSON.stringify({ email, create_user: false }),
  });
}

async function requireCarrier(event) {
  const user = await getAuthenticatedUser(event);
  if (!user) {
    const error = new Error('A valid GridTMS carrier login is required.');
    error.status = 401;
    throw error;
  }
  return user;
}

async function driverFor(ownerId, driverId) {
  const rows = await rest(`tms_drivers?id=eq.${encodeURIComponent(driverId)}&owner_id=eq.${encodeURIComponent(ownerId)}&select=*&limit=1`);
  return rows?.[0] || null;
}

async function mappingForAuthUser(authUserId) {
  const rows = await rest(`tms_driver_accounts?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=*&limit=1`);
  return rows?.[0] || null;
}

function addressFor(location) {
  return location ? [location.address || location.street, location.city, location.state, location.zip].filter(Boolean).join(', ') : '';
}

function normalizedStops(load, locationsById) {
  const existing = Array.isArray(load.stops) ? load.stops : [];
  const byId = new Map(existing.map(stop => [String(stop.id), stop]));
  const make = (id, type, locationId, scheduledAt, sequence) => {
    const previous = byId.get(id) || {};
    const location = locationsById.get(locationId);
    return {
      ...previous, id, sequence, type, locationId: locationId || previous.locationId || '',
      name: location?.name || previous.name || previous.locationName || type,
      locationName: location?.name || previous.locationName || previous.name || type,
      address: addressFor(location) || previous.address || '',
      scheduledAt: scheduledAt || previous.scheduledAt || '',
      status: previous.status || 'Pending',
      documents: Array.isArray(previous.documents) ? previous.documents.filter(document => !document.deletedAt) : [],
    };
  };
  const middle = existing.filter(stop => stop.type === 'Stop' || stop.type === 'Intermediate').map((stop, index) =>
    make(String(stop.id || `stop-${index + 1}`), 'Stop', stop.locationId || stop.location_id, stop.scheduledAt || stop.date, index + 2));
  return [
    make('pickup', 'Pickup', load.origin_id, load.pickup_date, 1),
    ...middle,
    make('delivery', 'Delivery', load.destination_id, load.delivery_date, middle.length + 2),
  ];
}

async function loadDriverSession(authUserId) {
  const mapping = await mappingForAuthUser(authUserId);
  if (!mapping) throw Object.assign(new Error('This login has not been provisioned for the Driver Cockpit.'), { status: 403 });
  if (mapping.portal_status === 'Suspended') throw Object.assign(new Error('Driver Cockpit access is suspended.'), { status: 403 });
  const driver = await driverFor(mapping.owner_id, mapping.driver_id);
  if (!driver) throw Object.assign(new Error('The linked driver profile no longer exists.'), { status: 404 });
  const [loads, locations, trucks, customers] = await Promise.all([
    rest(`tms_loads?owner_id=eq.${encodeURIComponent(mapping.owner_id)}&driver_id=eq.${encodeURIComponent(mapping.driver_id)}&sent_to_app=eq.true&select=*&order=updated_at.desc`),
    rest(`tms_locations?owner_id=eq.${encodeURIComponent(mapping.owner_id)}&select=*`),
    rest(`tms_trucks?owner_id=eq.${encodeURIComponent(mapping.owner_id)}&select=*`),
    rest(`tms_customers?owner_id=eq.${encodeURIComponent(mapping.owner_id)}&select=*`),
  ]);
  const locationsById = new Map((locations || []).map(location => [location.id, location]));
  const trucksById = new Map((trucks || []).map(truck => [truck.id, truck]));
  const customersById = new Map((customers || []).map(customer => [customer.id, customer]));
  const normalizedLoads = (loads || []).map(load => {
    const origin = locationsById.get(load.origin_id);
    const destination = locationsById.get(load.destination_id);
    const truck = trucksById.get(load.truck_id);
    const customer = customersById.get(load.customer_id);
    return {
      ...load,
      customer_name: load.customer_name || customer?.company_name || customer?.name || '',
      origin_name: load.origin || origin?.name || '',
      origin_address: addressFor(origin),
      destination_name: load.destination || destination?.name || '',
      destination_address: addressFor(destination),
      equipment_type: load.equipment_type || load.equipment || '',
      weight_lbs: Number(load.weight_lbs ?? load.weight ?? 0),
      truck_number: load.truck_number || truck?.unit_number || '',
      stops: normalizedStops(load, locationsById),
    };
  });
  const assignedTruck = trucksById.get(driver.truck_id);
  return {
    mapping,
    driver: {
      id: driver.id,
      name: driver.full_name || driver.name || 'Driver',
      email: driver.email || mapping.email,
      phone: driver.phone || '',
      assignedTruckUnit: assignedTruck?.unit_number || 'Unassigned',
      dotNumber: mapping.dot_number || '',
      hosAvailable: driver.hos_available || '',
      hosDutyStatus: driver.hos_duty_status || 'Off Duty',
    },
    loads: normalizedLoads,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const parts = route(event);
  const action = parts[0] || '';

  try {
    if (action === 'login' && event.httpMethod === 'POST') {
      const body = await bodyJson(event);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email || !password) return json(400, { detail: 'Email and password are required.' });
      const session = await authRequest('token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const mapping = await mappingForAuthUser(session.user.id);
      if (!mapping) return json(403, { detail: 'This login has not been provisioned for the Driver Cockpit.' });
      if (!mapping.email_verified) return json(200, { requiresEmailVerification: true, email });
      const cockpit = await loadDriverSession(session.user.id);
      await rest(`tms_driver_accounts?auth_user_id=eq.${encodeURIComponent(session.user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ last_active: new Date().toISOString(), updated_at: new Date().toISOString() }),
      });
      return json(200, {
        token: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in,
        driver: cockpit.driver,
        loads: cockpit.loads,
      });
    }

    if (action === 'verify-code' && event.httpMethod === 'POST') {
      const body = await bodyJson(event);
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();
      const password = String(body.password || '');
      if (!email || !/^\d{6,10}$/.test(code) || password.length < 8) return json(400, { detail: 'Email, Supabase verification code, and a password of at least 8 characters are required.' });
      let verification;
      try { verification = await authRequest('verify', { method: 'POST', body: JSON.stringify({ email, token: code, type: 'email' }) }); }
      catch { return json(400, { detail: 'Invalid or expired Supabase verification code.' }); }
      const authUser = verification.user || await findAuthUserByEmail(email);
      const mapping = authUser ? await mappingForAuthUser(authUser.id) : null;
      if (!mapping || mapping.email !== email) return json(400, { detail: 'This email is not linked to a pending Driver Cockpit account.' });
      await authRequest(`admin/users/${encodeURIComponent(authUser.id)}`, { method: 'PUT', body: JSON.stringify({ password, email_confirm: true }) }, true);
      await rest(`tms_driver_accounts?auth_user_id=eq.${encodeURIComponent(authUser.id)}`, { method: 'PATCH', body: JSON.stringify({ email_verified: true, portal_status: 'Active', verification_code: null, verification_expires_at: null, updated_at: new Date().toISOString() }) });
      const session = await authRequest('token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
      const cockpit = await loadDriverSession(authUser.id);
      return json(200, { token: session.access_token, refreshToken: session.refresh_token, expiresIn: session.expires_in, driver: cockpit.driver, loads: cockpit.loads });
    }

    if (action === 'request-code' && event.httpMethod === 'POST') {
      const body = await bodyJson(event);
      const email = String(body.email || '').trim().toLowerCase();
      const authUser = email ? await findAuthUserByEmail(email) : null;
      const mapping = authUser ? await mappingForAuthUser(authUser.id) : null;
      if (mapping && !mapping.email_verified) await sendDriverVerificationEmail(email);
      return json(200, { message: 'If a pending Driver Cockpit account exists, a new code was sent.' });
    }

    if (action === 'session' && event.httpMethod === 'GET') {
      const user = await getAuthenticatedUser(event);
      if (!user) return json(401, { detail: 'Driver session expired. Please log in again.' });
      return json(200, await loadDriverSession(user.id));
    }

    if (action === 'load-status' && event.httpMethod === 'PATCH') {
      const user = await getAuthenticatedUser(event);
      if (!user) return json(401, { detail: 'Driver session expired. Please log in again.' });
      const mapping = await mappingForAuthUser(user.id);
      if (!mapping || mapping.portal_status === 'Suspended') return json(403, { detail: 'Driver access is unavailable.' });
      const driver = await driverFor(mapping.owner_id, mapping.driver_id);
      const body = await bodyJson(event);
      const allowed = ['Dispatched', 'In Transit', 'At Pickup', 'Loaded', 'At Delivery', 'Delivered'];
      if (!allowed.includes(body.status)) return json(400, { detail: 'Invalid load status.' });
      const rows = await rest(`tms_loads?id=eq.${encodeURIComponent(body.loadId)}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}&driver_id=eq.${encodeURIComponent(mapping.driver_id)}&sent_to_app=eq.true`, {
        method: 'PATCH',
        body: JSON.stringify({ status: body.status, updated_at: new Date().toISOString() }),
      });
      if (!rows?.[0]) return json(404, { detail: 'Assigned load not found.' });
      return json(200, { load: rows[0] });
    }

    if (action === 'stop-status' && event.httpMethod === 'PATCH') {
      const user = await getAuthenticatedUser(event);
      if (!user) return json(401, { detail: 'Driver session expired. Please log in again.' });
      const mapping = await mappingForAuthUser(user.id);
      if (!mapping || mapping.portal_status === 'Suspended') return json(403, { detail: 'Driver access is unavailable.' });
      const body = await bodyJson(event);
      const allowed = ['Pending', 'En Route', 'Arrived', 'Service Started', 'Delivered'];
      if (!allowed.includes(body.status)) return json(400, { detail: 'Invalid stop status.' });
      const loads = await rest(`tms_loads?id=eq.${encodeURIComponent(body.loadId)}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}&driver_id=eq.${encodeURIComponent(mapping.driver_id)}&sent_to_app=eq.true&select=*&limit=1`);
      const load = loads?.[0];
      if (!load) return json(404, { detail: 'Assigned load not found.' });
      const stops = Array.isArray(load.stops) ? load.stops : [];
      const index = stops.findIndex(stop => String(stop.id) === String(body.stopId));
      if (index < 0) return json(404, { detail: 'Stop not found.' });
      if (stops.slice(0, index).some(stop => stop.status !== 'Delivered')) return json(409, { detail: 'Complete the previous stop first.' });
      stops[index] = { ...stops[index], status: body.status, statusUpdatedAt: new Date().toISOString() };
      const allDelivered = stops.length > 0 && stops.every(stop => stop.status === 'Delivered');
      const isPickup = stops[index].type === 'Pickup';
      const loadStatus = allDelivered
        ? 'Delivered'
        : body.status === 'Arrived' && isPickup
          ? 'At Pickup'
          : body.status === 'Service Started' && isPickup
            ? 'Loaded'
            : 'In Transit';
      const rows = await rest(`tms_loads?id=eq.${encodeURIComponent(load.id)}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}`, {
        method: 'PATCH', body: JSON.stringify({ stops, status: loadStatus, updated_at: new Date().toISOString() }),
      });
      return json(200, { load: rows?.[0] || { ...load, stops, status: loadStatus }, stops });
    }

    if (action === 'stop-document' && event.httpMethod === 'POST') {
      const user = await getAuthenticatedUser(event);
      if (!user) return json(401, { detail: 'Driver session expired. Please log in again.' });
      const mapping = await mappingForAuthUser(user.id);
      if (!mapping || mapping.portal_status === 'Suspended') return json(403, { detail: 'Driver access is unavailable.' });
      const driver = await driverFor(mapping.owner_id, mapping.driver_id);
      const body = await bodyJson(event);
      const loads = await rest(`tms_loads?id=eq.${encodeURIComponent(body.loadId)}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}&driver_id=eq.${encodeURIComponent(mapping.driver_id)}&sent_to_app=eq.true&select=*&limit=1`);
      const load = loads?.[0];
      if (!load) return json(404, { detail: 'Assigned load not found.' });
      const stops = Array.isArray(load.stops) ? load.stops : [];
      const index = stops.findIndex(stop => String(stop.id) === String(body.stopId));
      if (index < 0) return json(404, { detail: 'Stop not found.' });
      if (stops[index].status !== 'Delivered') return json(409, { detail: 'Mark this stop delivered before uploading documents.' });
      const bytes = Buffer.from(String(body.dataBase64 || ''), 'base64');
      if (!bytes.length || bytes.length > 6 * 1024 * 1024) return json(400, { detail: 'Select a file smaller than 6 MB.' });
      const { url, serviceKey } = authConfig();
      const clean = String(body.fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectPath = `${mapping.owner_id}/loads/${load.id}/${body.stopId}/${Date.now()}_${clean}`;
      const upload = await fetch(`${url}/storage/v1/object/documents/${objectPath}`, { method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': body.contentType || 'application/octet-stream', 'x-upsert': 'false' }, body: bytes });
      if (!upload.ok) throw new Error((await upload.text()) || 'Supabase Storage upload failed.');
      const signedResponse = await fetch(`${url}/storage/v1/object/sign/documents/${objectPath}`, { method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 31536000 }) });
      const signed = await signedResponse.json();
      const uploadedAt = new Date().toISOString();
      const document = { id: `stop-doc-${Date.now()}`, stopId: body.stopId, type: body.documentType || 'Other', name: clean, path: objectPath, url: String(signed.signedURL || signed.signedUrl || '').startsWith('http') ? (signed.signedURL || signed.signedUrl) : `${url}/storage/v1${signed.signedURL || signed.signedUrl}`, uploadedAt, date: uploadedAt, uploadedBy: mapping.driver_id, uploadedByName: driver.full_name || driver.name || mapping.email, uploadedByRole: 'Driver', driverDeleteUntil: new Date(Date.now() + 3600000).toISOString() };
      stops[index] = { ...stops[index], documents: [...(stops[index].documents || []), document] };
      const documents = [...(Array.isArray(load.documents) ? load.documents : []), document];
      const activityLog = [{ id: `log-${Date.now()}`, user: document.uploadedByName, action: `Document uploaded: ${clean} (${document.type}) for ${stops[index].type} stop`, date: new Date().toLocaleString('en-US'), type: 'document' }, ...(Array.isArray(load.activity_log) ? load.activity_log : [])];
      const rows = await rest(`tms_loads?id=eq.${encodeURIComponent(load.id)}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}`, { method: 'PATCH', body: JSON.stringify({ stops, documents, activity_log: activityLog, updated_at: new Date().toISOString() }) });
      return json(200, { load: rows?.[0] || { ...load, stops, documents }, document });
    }

    if (action === 'stop-document-delete' && event.httpMethod === 'DELETE') {
      const user = await getAuthenticatedUser(event);
      if (!user) return json(401, { detail: 'Driver session expired. Please log in again.' });
      const mapping = await mappingForAuthUser(user.id);
      if (!mapping || mapping.portal_status === 'Suspended') return json(403, { detail: 'Driver access is unavailable.' });
      const driver = await driverFor(mapping.owner_id, mapping.driver_id);
      const body = await bodyJson(event);
      const loads = await rest(`tms_loads?id=eq.${encodeURIComponent(body.loadId)}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}&driver_id=eq.${encodeURIComponent(mapping.driver_id)}&sent_to_app=eq.true&select=*&limit=1`);
      const load = loads?.[0];
      if (!load) return json(404, { detail: 'Assigned load not found.' });
      const stops = Array.isArray(load.stops) ? load.stops : [];
      const stopIndex = stops.findIndex(stop => String(stop.id) === String(body.stopId));
      if (stopIndex < 0) return json(404, { detail: 'Stop not found.' });
      const documentIndex = (stops[stopIndex].documents || []).findIndex(document => String(document.id) === String(body.documentId));
      if (documentIndex < 0) return json(404, { detail: 'Document not found.' });
      const document = stops[stopIndex].documents[documentIndex];
      if (String(document.uploadedBy) !== String(mapping.driver_id) || document.uploadedByRole !== 'Driver') return json(403, { detail: 'Drivers may delete only documents they uploaded.' });
      const deadline = new Date(document.driverDeleteUntil || new Date(document.uploadedAt).getTime() + 3600000);
      if (Date.now() > deadline.getTime()) return json(403, { detail: 'The one-hour driver deletion window has expired.' });
      const deletedAt = new Date().toISOString();
      const actorName = driver?.full_name || driver?.name || mapping.email;
      const deleted = { ...document, deletedAt, deletedBy: actorName, recoverUntil: new Date(Date.now() + 30 * 86400000).toISOString() };
      stops[stopIndex] = { ...stops[stopIndex], documents: stops[stopIndex].documents.map((item, index) => index === documentIndex ? deleted : item) };
      const documents = (Array.isArray(load.documents) ? load.documents : []).map(item => String(item.id) === String(document.id) ? deleted : item);
      const activityLog = [{ id: `log-${Date.now()}`, user: actorName, action: `Document deleted by driver: ${document.name} (${document.type}) from ${stops[stopIndex].type} stop`, date: new Date().toLocaleString('en-US'), type: 'document' }, ...(Array.isArray(load.activity_log) ? load.activity_log : [])];
      const rows = await rest(`tms_loads?id=eq.${encodeURIComponent(load.id)}&owner_id=eq.${encodeURIComponent(mapping.owner_id)}`, { method: 'PATCH', body: JSON.stringify({ stops, documents, activity_log: activityLog, updated_at: deletedAt }) });
      return json(200, { load: rows?.[0] || { ...load, stops, documents, activity_log: activityLog } });
    }

    const carrier = await requireCarrier(event);

    if (action === 'send-load' && event.httpMethod === 'POST') {
      const body = await bodyJson(event);
      const loadId = String(body.loadId || '');
      if (!loadId) return json(400, { detail: 'Load is required.' });

      const loads = await rest(`tms_loads?id=eq.${encodeURIComponent(loadId)}&owner_id=eq.${encodeURIComponent(carrier.id)}&select=*&limit=1`);
      const load = loads?.[0];
      if (!load) return json(404, { detail: 'Load was not found in this carrier account.' });
      if (!load.driver_id) return json(400, { detail: 'Assign a driver before sending the load to the Driver App.' });

      const accounts = await rest(`tms_driver_accounts?owner_id=eq.${encodeURIComponent(carrier.id)}&driver_id=eq.${encodeURIComponent(load.driver_id)}&select=portal_status&limit=1`);
      const account = accounts?.[0];
      if (!account) return json(409, { detail: 'Provision Driver App access for this driver before sending the load.' });
      if (account.portal_status === 'Suspended') return json(409, { detail: 'This driver’s Driver App access is suspended.' });

      const locations = await rest(`tms_locations?owner_id=eq.${encodeURIComponent(carrier.id)}&select=*`);
      const stops = normalizedStops(load, new Map((locations || []).map(location => [location.id, location])));
      const rows = await rest(`tms_loads?id=eq.${encodeURIComponent(loadId)}&owner_id=eq.${encodeURIComponent(carrier.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sent_to_app: true,
          stops,
          status: load.status === 'Created' ? 'Dispatched' : load.status,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!rows?.[0]) return json(500, { detail: 'The load could not be sent to the Driver App.' });
      return json(200, { load: rows[0], message: 'Load sent to Driver App.' });
    }

    if (action === 'list' && event.httpMethod === 'GET') {
      const mappings = await rest(`tms_driver_accounts?owner_id=eq.${encodeURIComponent(carrier.id)}&select=*&order=updated_at.desc`);
      const drivers = await rest(`tms_drivers?owner_id=eq.${encodeURIComponent(carrier.id)}&select=*`);
      const trucks = await rest(`tms_trucks?owner_id=eq.${encodeURIComponent(carrier.id)}&select=id,unit_number`);
      const byId = new Map((drivers || []).map(driver => [driver.id, driver]));
      const trucksById = new Map((trucks || []).map(truck => [truck.id, truck]));
      return json(200, {
        drivers: (mappings || []).map(mapping => {
          const driver = byId.get(mapping.driver_id) || {};
          return {
            id: mapping.auth_user_id,
            driverId: mapping.driver_id,
            driverName: driver.full_name || driver.name || 'Driver',
            email: mapping.email || driver.email || '',
            phone: driver.phone || '',
            dotNumber: mapping.dot_number || '',
            assignedTruckId: driver.truck_id || null,
            assignedTruckUnit: trucksById.get(driver.truck_id)?.unit_number || 'Unassigned',
            portalStatus: mapping.portal_status || 'Pending Verification',
            emailVerified: Boolean(mapping.email_verified),
            verificationCode: mapping.verification_code || '',
            verificationExpiresAt: mapping.verification_expires_at || null,
            lastActive: mapping.last_active || null,
            createdAt: mapping.created_at,
            updatedAt: mapping.updated_at,
          };
        }),
      });
    }

    if (action === 'remove' && event.httpMethod === 'DELETE') {
      const body = await bodyJson(event);
      const driverId = String(body.driverId || '');
      if (!driverId) return json(400, { detail: 'Driver is required.' });
      const mapping = (await rest(`tms_driver_accounts?owner_id=eq.${encodeURIComponent(carrier.id)}&driver_id=eq.${encodeURIComponent(driverId)}&select=*&limit=1`))?.[0];
      if (!mapping) return json(404, { detail: 'Provisioned driver account not found.' });

      await authRequest(`admin/users/${encodeURIComponent(mapping.auth_user_id)}`, { method: 'DELETE' }, true);
      await rest(`tms_driver_accounts?owner_id=eq.${encodeURIComponent(carrier.id)}&driver_id=eq.${encodeURIComponent(driverId)}`, { method: 'DELETE' });
      return json(200, { message: 'Driver App access removed. The fleet driver profile was kept.' });
    }

    if (action === 'provision' && event.httpMethod === 'POST') {
      const body = await bodyJson(event);
      const driverId = String(body.driverId || '');
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.temporaryPassword || '');
      if (!driverId || !email || password.length < 8) return json(400, { detail: 'Driver, email, and a password of at least 8 characters are required.' });
      const driver = await driverFor(carrier.id, driverId);
      if (!driver) return json(404, { detail: 'Driver does not exist in this carrier account.' });

      const existingMapping = (await rest(`tms_driver_accounts?owner_id=eq.${encodeURIComponent(carrier.id)}&driver_id=eq.${encodeURIComponent(driverId)}&select=*&limit=1`))?.[0];
      let authUser = await findAuthUserByEmail(email);
      if (authUser && (!existingMapping || existingMapping.auth_user_id !== authUser.id)) {
        return json(409, { detail: 'That email is already used by another account.' });
      }
      if (!authUser) {
        authUser = await authRequest('admin/users', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'driver', owner_id: carrier.id, driver_id: driverId },
          }),
        }, true);
      } else {
        authUser = await authRequest(`admin/users/${encodeURIComponent(authUser.id)}`, {
          method: 'PUT',
          body: JSON.stringify({ password, email_confirm: true }),
        }, true);
      }

      const settings = (await rest(`tms_company_settings?owner_id=eq.${encodeURIComponent(carrier.id)}&select=dot_number&limit=1`))?.[0];
      const rows = await rest('tms_driver_accounts?on_conflict=owner_id,driver_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          auth_user_id: authUser.id,
          owner_id: carrier.id,
          driver_id: driverId,
          email,
          dot_number: settings?.dot_number || '',
          portal_status: 'Pending Verification',
          email_verified: false,
          verification_code: null,
          verification_expires_at: null,
          updated_at: new Date().toISOString(),
        }),
      });
      await rest(`tms_drivers?id=eq.${encodeURIComponent(driverId)}&owner_id=eq.${encodeURIComponent(carrier.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ email, phone: body.phone || driver.phone || '', updated_at: new Date().toISOString() }),
      });
      await sendDriverVerificationEmail(email);
      return json(200, { account: rows?.[0], message: `Driver Cockpit verification code emailed to ${email}.` });
    }

    if (action === 'status' && event.httpMethod === 'PATCH') {
      const body = await bodyJson(event);
      const status = String(body.status || '');
      if (!['Active', 'Pending Verification', 'Suspended'].includes(status)) return json(400, { detail: 'Invalid portal status.' });
      const rows = await rest(`tms_driver_accounts?owner_id=eq.${encodeURIComponent(carrier.id)}&driver_id=eq.${encodeURIComponent(body.driverId)}`, {
        method: 'PATCH', body: JSON.stringify({ portal_status: status, updated_at: new Date().toISOString() }),
      });
      if (!rows?.[0]) return json(404, { detail: 'Provisioned driver account not found.' });
      return json(200, { account: rows[0] });
    }

    if (action === 'resend-code' && event.httpMethod === 'POST') {
      const body = await bodyJson(event);
      const rows = await rest(`tms_driver_accounts?owner_id=eq.${encodeURIComponent(carrier.id)}&driver_id=eq.${encodeURIComponent(body.driverId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_code: null, verification_expires_at: null, updated_at: new Date().toISOString() }),
      });
      if (!rows?.[0]) return json(404, { detail: 'Provision the driver account before generating a code.' });
      const mapping = rows[0];
      await sendDriverVerificationEmail(mapping.email);
      return json(200, { message: `New Supabase verification code emailed to ${mapping.email}.` });
    }

    if (action === 'reset-password' && event.httpMethod === 'POST') {
      const body = await bodyJson(event);
      const password = String(body.newPassword || '');
      if (password.length < 8) return json(400, { detail: 'Password must contain at least 8 characters.' });
      const mapping = (await rest(`tms_driver_accounts?owner_id=eq.${encodeURIComponent(carrier.id)}&driver_id=eq.${encodeURIComponent(body.driverId)}&select=*&limit=1`))?.[0];
      if (!mapping) return json(404, { detail: 'Provisioned driver account not found.' });
      await authRequest(`admin/users/${encodeURIComponent(mapping.auth_user_id)}`, {
        method: 'PUT', body: JSON.stringify({ password }),
      }, true);
      return json(200, { message: 'Driver password updated.' });
    }

    return json(404, { detail: 'Driver portal route not found.' });
  } catch (error) {
    console.error('Driver portal error:', error);
    const status = error.status === 400 || error.status === 401 || error.status === 403 || error.status === 404 || error.status === 409 ? error.status : 500;
    return json(status, { detail: error.message || 'Driver portal request failed.' });
  }
};
