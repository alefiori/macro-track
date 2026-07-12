import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { FoodLogWithFood } from '@/lib/database.types'

interface State {
  logs: FoodLogWithFood[]
  loading: boolean
  error: string | null
}

/** Fetches the current user's food logs (joined with foods) for one date. */
export function useFoodLogs(date: string, version: number) {
  const [state, setState] = useState<State>({ logs: [], loading: true, error: null })

  const fetchLogs = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    const { data, error } = await supabase
      .from('food_logs')
      .select('*, food:foods(*)')
      .eq('log_date', date)
      .order('created_at', { ascending: true })

    if (error) {
      setState({ logs: [], loading: false, error: error.message })
      return
    }
    // Defensive: if a joined food ever becomes unreadable (e.g. unshared out
    // from under us), the join yields a null food — drop those rather than
    // letting every consumer crash on `log.food.name`.
    const logs = ((data as unknown as FoodLogWithFood[]) ?? []).filter((l) => l.food != null)
    setState({ logs, loading: false, error: null })
  }, [date])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs, version])

  return { ...state, refetch: fetchLogs }
}
