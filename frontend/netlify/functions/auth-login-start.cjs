const { json, bodyJson, makeAuthResult, signInSupabasePassword } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  const username = String(body.email || body.username || '').trim().toLowerCase();
  if (username === 'demo' && String(body.password || '') === 'demo') {
    return json(200, { ...makeAuthResult(), direct_login: true });
  }
  try {
    const authResult = await signInSupabasePassword(username, body.password);
    return json(200, { ...authResult, direct_login: true });
  } catch (error) {
    return json(401, { detail: error.message || 'Invalid email or password.' });
  }
};
