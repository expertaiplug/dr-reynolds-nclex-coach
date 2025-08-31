const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Creates a Stripe Billing Portal session so customers can manage/cancel.
 * Minimal flow: finds customer by email. In production, authenticate users
 * and map your userId -> stripeCustomerId stored after checkout.
 */
exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    // find the Stripe customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No Stripe customer found for that email' })
      };
    }
    const customerId = customers.data[0].id;

    const origin = new URL(event.headers.origin || 'https://drreynoldscoach.netlify.app').origin;
    const returnUrl = process.env.RETURN_URL || origin;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ url: session.url })
    };
