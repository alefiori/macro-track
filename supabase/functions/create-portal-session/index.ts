// Creates a Stripe Billing Portal session so a premium user can manage or
// cancel their subscription, and returns its URL for the browser to redirect to.
//
// Request (POST, authenticated): { "origin": "https://app.example.com" }
// Response: { "url": "https://billing.stripe.com/..." }
//
// Deploy: supabase functions deploy create-portal-session

import { CORS_HEADERS, json } from '../_shared/cors.ts'
import { adminClient, getUser, stripe } from '../_shared/clients.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const user = await getUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const body = (await req.json().catch(() => ({}))) as { origin?: string }
    const origin = body.origin || Deno.env.get('APP_URL') || ''

    const { data: sub } = await adminClient()
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const customerId = sub?.stripe_customer_id as string | null
    if (!customerId) return json({ error: 'No billing account found' }, 400)

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    })

    return json({ url: session.url }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Portal failed' }, 500)
  }
})
