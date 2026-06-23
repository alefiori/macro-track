import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Plan } from '@/lib/database.types'

interface PlanValue {
  /** The user's current plan. Defaults to 'free' until the row loads. */
  plan: Plan
  /** Convenience flag: true only for an active premium subscription. */
  isPremium: boolean
  loading: boolean
  /**
   * Re-fetch the subscription row from the server. Call after returning from
   * Stripe Checkout — the webhook may take a moment to flip the plan, so the
   * billing UI polls this a few times.
   */
  refresh: () => Promise<void>
}

const PlanContext = createContext<PlanValue | undefined>(undefined)

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()
    // Absent row (e.g. trigger lag) is treated as free, never an error to the UI.
    setPlan(data?.plan === 'premium' ? 'premium' : 'free')
  }, [user])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user, refresh])

  return (
    <PlanContext.Provider value={{ plan, isPremium: plan === 'premium', loading, refresh }}>
      {children}
    </PlanContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlan(): PlanValue {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used within a PlanProvider')
  return ctx
}
