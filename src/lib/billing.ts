/**
 * Client for the Stripe billing Edge Functions. Both calls are authenticated
 * with the user's Supabase JWT and return a URL the browser redirects to —
 * Checkout for upgrading, the Billing Portal for managing an existing plan.
 * See supabase/functions/create-checkout-session and create-portal-session.
 */
import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export type BillingPlan = 'monthly' | 'annual'

async function callBilling(fn: string, body: Record<string, unknown>): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ origin: window.location.origin, ...body }),
  })
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !data.url) throw new Error(data.error || `Request failed (${res.status})`)
  return data.url
}

/** Start a subscription checkout; resolves to the Stripe Checkout URL. */
export function createCheckoutSession(plan: BillingPlan): Promise<string> {
  return callBilling('create-checkout-session', { plan })
}

/** Open the Stripe Billing Portal; resolves to the portal URL. */
export function createPortalSession(): Promise<string> {
  return callBilling('create-portal-session', {})
}
