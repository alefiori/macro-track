// Creates a Stripe Checkout session for a premium subscription and returns its
// URL; the browser then redirects to it. Premium's only effect is removing ads.
//
// Request (POST, authenticated with the user's Supabase JWT):
//   { "plan": "monthly" | "annual", "origin": "https://app.example.com" }
// Response: { "url": "https://checkout.stripe.com/..." }
//
// Deploy:  supabase functions deploy create-checkout-session
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_... \
//            STRIPE_PRICE_MONTHLY=price_... STRIPE_PRICE_ANNUAL=price_...
//          (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
//           injected automatically by the platform.)

import { CORS_HEADERS, json } from '../_shared/cors.ts'
import { adminClient, getUser, stripe } from '../_shared/clients.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const user = await getUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const body = (await req.json().catch(() => ({}))) as { plan?: string; origin?: string }
    const priceId =
      body.plan === 'annual'
        ? Deno.env.get('STRIPE_PRICE_ANNUAL')
        : body.plan === 'monthly'
          ? Deno.env.get('STRIPE_PRICE_MONTHLY')
          : null
    if (!priceId) return json({ error: 'Invalid plan' }, 400)

    const origin = body.origin || Deno.env.get('APP_URL') || ''
    const admin = adminClient()

    // Reuse the user's Stripe customer if we've created one before, so they
    // don't accumulate duplicate customers across checkouts.
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let customerId = sub?.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await admin
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Lets the webhook map the subscription back to our user even if the
      // customer record were ever out of sync.
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}/profile?checkout=success`,
      cancel_url: `${origin}/profile?checkout=cancel`,
      allow_promotion_codes: true,
    })

    return json({ url: session.url }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Checkout failed' }, 500)
  }
})
