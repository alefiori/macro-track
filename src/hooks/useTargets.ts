import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MacroTarget } from '@/lib/database.types'

interface State {
  /** Targets keyed by day_of_week (0–6). */
  byDay: Record<number, MacroTarget>
  loading: boolean
  error: string | null
}

/** Loads the current user's weekly macro targets. */
export function useTargets() {
  const [state, setState] = useState<State>({ byDay: {}, loading: true, error: null })

  const fetchTargets = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    const { data, error } = await supabase.from('macro_targets').select('*')
    if (error) {
      setState({ byDay: {}, loading: false, error: error.message })
      return
    }
    const byDay: Record<number, MacroTarget> = {}
    for (const t of data ?? []) byDay[t.day_of_week] = t
    setState({ byDay, loading: false, error: null })
  }, [])

  useEffect(() => {
    fetchTargets()
  }, [fetchTargets])

  return { ...state, refetch: fetchTargets }
}
