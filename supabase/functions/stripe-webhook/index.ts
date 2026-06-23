// Stripe webhook — the single source of truth for the subscriptions table.
// Stripe POSTs subscription lifecycle events here; we verify the signature and
// flip the user's plan accordingly. This is the ONLY place plan/status is
// written (with the service-role key, bypassing RLS), so the client can never
// grant itself premium.
//
// IMPORTANT: deploy WITHOUT JWT verification — Stripe sends no Supabase JWT:
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...
//
// Configure the endpoint in the Stripe dashboard (Developers → Webhooks):
//   URL: https://<project-ref>.functions.supabase.co/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.updated,
//           customer.subscription.deleted

import type Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext'
import { adminClient, cryptoProvider, stripe } from '../_shared/clients.ts'

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

/** active/trialing subscriptions get premium; everything else falls back to free. */
function planForStatus(status: string): 'free' | 'premium' {
  return status === 'active' || status === 'trialing' ? 'premium' : 'free'
}

/** Sync our row from a Stripe Subscription object. */
async function syncSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.user_id
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const update = {
    plan: planForStatus(sub.status),
    status: sub.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
  }

  const admin = adminClient()
  // Prefer the user_id we stamped into metadata; fall back to the customer id
  // (set at checkout) so we still match if metadata is ever missing.
  if (userId) {
    await admin.from('subscriptions').update(update).eq('user_id', userId)
  } else {
    await admin.from('subscriptions').update(update).eq('stripe_customer_id', customerId)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  const payload = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      WEBHOOK_SECRET,
      undefined,
      cryptoProvider,
    )
  } catch (err) {
    return new Response(
      `Signature verification failed: ${err instanceof Error ? err.message : 'unknown'}`,
      { status: 400 },
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Pull the full subscription so we have status + period end in one place.
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          // Carry the user mapping from the session if the sub lacks it.
          if (!sub.metadata?.user_id && session.client_reference_id) {
            sub.metadata = { ...sub.metadata, user_id: session.client_reference_id }
          }
          await syncSubscription(sub)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      }
      default:
        break
    }
  } catch (err) {
    // Return 500 so Stripe retries; the event itself was valid.
    return new Response(`Handler error: ${err instanceof Error ? err.message : 'unknown'}`, {
      status: 500,
    })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
