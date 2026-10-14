const Stripe = require('stripe');
const { json, bodyJson, getAuthenticatedUser } = require('./_shared.cjs');
const { rest } = require('./_server-data.cjs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  if (event.httpMethod !== 'POST') return json(405, { detail: 'Method not allowed.' });
  const user = await getAuthenticatedUser(event);
  if (!user) return json(401, { detail: 'Sign in before starting payment.' });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return json(503, { detail: 'Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Netlify.' });
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = await bodyJson(event);
    const existing = await rest(`tms_billing_accounts?owner_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);
    let customerId = existing?.[0]?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.user_metadata?.legal_name || user.user_metadata?.full_name || undefined,
        metadata: { owner_id: user.id },
      });
      customerId = customer.id;
      await rest('tms_billing_accounts?on_conflict=owner_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ owner_id: user.id, stripe_customer_id: customerId, status: 'incomplete' }),
      });
    }
    const origin = String(body.origin || event.headers.origin || 'https://gridtms.ai').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { owner_id: user.id },
      subscription_data: { metadata: { owner_id: user.id } },
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/?billing=cancelled`,
    });
    return json(200, { url: session.url });
  } catch (error) {
    return json(500, { detail: error.message || 'Stripe Checkout could not be created.' });
  }
};
