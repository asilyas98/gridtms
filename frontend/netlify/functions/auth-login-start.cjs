const { json, bodyJson, makeAuthResult } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  const username = String(body.email || body.username || '').trim().toLowerCase();
  if (username === 'demo' && String(body.password || '') === 'demo') {
    return json(200, { ...makeAuthResult(), direct_login: true });
  }
  return json(400, { detail: 'Netlify demo backend is running. Use username demo and password demo, or configure real Supabase server functions later.' });
};
