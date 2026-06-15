import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { searchOpenFoodFacts, type OffFood } from '@/lib/openfoodfacts'
import type { Food } from '@/lib/database.types'
import { useDebounce } from './useDebounce'

export type SearchResult =
  | { kind: 'local'; id: string; food: Food }
  | { kind: 'off'; id: string; food: OffFood }

interface State {
  results: SearchResult[]
  loading: boolean
  error: string | null
}

/**
 * Searches the user's own foods (custom + previously imported) and merges them
 * with live Open Food Facts results. The query is debounced (~350ms). Local
 * matches come first; OFF rows already present locally (same off_id) are
 * de-duplicated out.
 */
export function useFoodSearch(query: string) {
  const debounced = useDebounce(query.trim(), 350)
  const [state, setState] = useState<State>({ results: [], loading: false, error: null })

  useEffect(() => {
    if (!debounced) {
      setState({ results: [], loading: false, error: null })
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))

    async function run() {
      try {
        const localPromise = supabase
          .from('foods')
          .select('*')
          .ilike('name', `%${debounced}%`)
          .order('created_at', { ascending: false })
          .limit(20)

        const offPromise = searchOpenFoodFacts(debounced, controller.signal).catch(() => [])

        const [{ data: localData, error: localErr }, offData] = await Promise.all([
          localPromise,
          offPromise,
        ])
        if (cancelled) return
        if (localErr) throw new Error(localErr.message)

        const local = (localData ?? []) as Food[]
        const localOffIds = new Set(local.map((f) => f.off_id).filter(Boolean) as string[])

        const results: SearchResult[] = [
          ...local.map((f) => ({ kind: 'local' as const, id: `local:${f.id}`, food: f })),
          ...offData
            .filter((f) => !localOffIds.has(f.off_id))
            .map((f) => ({ kind: 'off' as const, id: `off:${f.off_id}`, food: f })),
        ]

        setState({ results, loading: false, error: null })
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        setState({
          results: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Search failed.',
        })
      }
    }

    run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [debounced])

  return state
}
