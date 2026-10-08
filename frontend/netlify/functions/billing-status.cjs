const { json, getAuthenticatedUser } = require('./_shared.cjs');
const { rest } = require('./_server-data.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const user = await getAuthenticatedUser(event);
  if (!user) return json(401, { detail: 'Sign in required.' });
  try {
    const rows = await rest(`tms_billing_accounts?owner_id=eq.${encodeURIComponent(user.id)}&select=status,current_period_end,cancel_at_period_end&limit=1`);
    return json(200, rows?.[0] || { status: 'none' });
  } catch (error) { return json(500, { detail: error.message }); }
};
