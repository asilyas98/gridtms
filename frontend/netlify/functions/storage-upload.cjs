const { json, bodyJson, getAuthenticatedUser } = require('./_shared.cjs');

const MAX_FILE_BYTES = 4 * 1024 * 1024;

function safeSegment(value, fallback) {
  const cleaned = String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
  return cleaned || fallback;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { detail: 'Method not allowed.' });

  const user = await getAuthenticatedUser(event);
  if (!user) return json(401, { detail: 'A valid GridTMS login is required.' });

  const DEFAULT_URL = 'https://durwofqudkmhxdxdfonl.supabase.co';
  const DEFAULT_KEY = 'sb_publishable_y-SvA_EmxZH_qrW8oGPM1g_kM472V6A';
  const url = String(process.env.SUPABASE_URL || DEFAULT_URL).replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_KEY;
  if (!url || !key) return json(503, { detail: 'Supabase Storage is not configured for Netlify Functions.' });

  try {
    const body = await bodyJson(event);
    const folder = safeSegment(body.folder, 'general');
    const fileName = safeSegment(body.file_name, `document_${Date.now()}`);
    const bytes = Buffer.from(String(body.data_base64 || ''), 'base64');
    if (!bytes.length) return json(400, { detail: 'The uploaded file is empty.' });
    if (bytes.length > MAX_FILE_BYTES) return json(413, { detail: 'Files must be 4 MB or smaller.' });

    const objectPath = `${safeSegment(user.id, 'user')}/${folder}/${Date.now()}_${fileName}`;
    const response = await fetch(`${url}/storage/v1/object/documents/${objectPath}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': String(body.content_type || 'application/octet-stream'),
        'x-upsert': 'false',
      },
      body: bytes,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || `Supabase Storage returned HTTP ${response.status}.`);
    }

    // The documents bucket is private. Return a signed URL instead of exposing
    // a public bucket URL. The object path itself is permanently namespaced by
    // the authenticated user's UUID.
    const signedResponse = await fetch(`${url}/storage/v1/object/sign/documents/${objectPath}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 31536000 }),
    });
    if (!signedResponse.ok) {
      const detail = await signedResponse.text().catch(() => '');
      throw new Error(detail || `Supabase could not create a private document link (HTTP ${signedResponse.status}).`);
    }
    const signed = await signedResponse.json();
    const signedPath = signed.signedURL || signed.signedUrl;
    if (!signedPath) throw new Error('Supabase did not return a private document link.');

    return json(200, {
      path: objectPath,
      public_url: signedPath.startsWith('http') ? signedPath : `${url}/storage/v1${signedPath}`,
    });
  } catch (error) {
    return json(500, { detail: error.message || 'The document could not be uploaded.' });
  }
};
