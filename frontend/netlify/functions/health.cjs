const { json } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  return json(200, { status: 'ok', platform: 'netlify-functions', ai_chat: 'ready', demo_login: 'demo/demo' });
};
