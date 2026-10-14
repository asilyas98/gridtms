const { json, bodyJson, makeAuthResult } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  if (String(body.username || body.email || '').trim().toLowerCase() !== 'demo' || String(body.password || '') !== 'demo') {
    return json(401, { detail: 'Invalid demo username or password.' });
  }
  return json(200, makeAuthResult());
};
