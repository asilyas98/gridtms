const Stripe = require('stripe');
const { json, bodyJson, getAuthenticatedUser } = require('./_shared.cjs');
const { rest } = require('./_server-data.cjs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { detail: 'Method not allowed.' });
  const user = await getAuthenticatedUser(event);
  if (!user) return json(401, { detail: 'Sign in before managing billing.' });
  try {
    const rows = await rest(`tms_billing_accounts?owner_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);
    if (!rows?.[0]?.stripe_customer_id) return json(404, { detail: 'No Stripe billing account exists yet.' });
    const body = await bodyJson(event);
    const origin = String(body.origin || event.headers.origin || 'https://gridtms.ai').replace(/\/$/, '');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.billingPortal.sessions.create({ customer: rows[0].stripe_customer_id, return_url: origin });
    return json(200, { url: session.url });
  } catch (error) {
    return json(500, { detail: error.message || 'Stripe Billing Portal could not be opened.' });
  }
};
