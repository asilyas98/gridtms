const { json, bodyJson, refreshSupabaseSession } = require('./_shared.cjs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { detail: 'Method not allowed.' });

  try {
    const body = await bodyJson(event);
    const authResult = await refreshSupabaseSession(body.refresh_token);
    return json(200, authResult);
  } catch (error) {
    return json(401, { detail: error.message || 'Your session expired. Please log in again.' });
  }
};
