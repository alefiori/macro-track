// Shared Stripe + Supabase client construction for the billing functions.
import Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

/** Stripe client. Uses the Fetch HTTP client + SubtleCrypto, required on Deno. */
export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

/** SubtleCrypto provider for async webhook signature verification on Deno. */
export const cryptoProvider = Stripe.createSubtleCryptoProvider()

/**
 * Service-role Supabase client — bypasses RLS. Use ONLY in the webhook to write
 * subscription rows. Never expose the service-role key to the browser.
 */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )
}

/**
 * Resolve the calling user from the request's Authorization header (the
 * Supabase JWT the browser sends). Returns null when unauthenticated.
 */
export async function getUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  )
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? undefined }
}
