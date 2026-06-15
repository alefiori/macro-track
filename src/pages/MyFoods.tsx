import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Icon } from '@/components/ui/Icon'
import { LoadingBlock } from '@/components/ui/Spinner'
import { SourceTag } from '@/components/ui/SourceTag'
import { MACROS } from '@/lib/constants'
import { calories, round } from '@/lib/macros'
import { deleteFood, type CustomFoodPrefill } from '@/lib/foods'
import type { Food } from '@/lib/database.types'

/** Map an imported API food into prefill values for a brand-new custom copy. */
function toPrefill(food: Food): CustomFoodPrefill {
  return {
    name: food.name,
    brand: food.brand,
    serving_amount: food.serving_amount,
    serving_unit: food.serving_unit,
    carbs_g: food.carbs_g,
    protein_g: food.protein_g,
    fats_g: food.fats_g,
  }
}

export default function MyFoods() {
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const fetchFoods = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('foods')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setFoods((data as Food[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchFoods()
  }, [fetchFoods])

  async function handleDelete(food: Food) {
    if (!window.confirm(`Delete "${food.name}"? Logs that reference it will also be removed.`)) {
      return
    }
    // Optimistic removal.
    const prev = foods
    setFoods((f) => f.filter((x) => x.id !== food.id))
    try {
      await deleteFood(food.id)
    } catch (err) {
      setFoods(prev)
      setError(err instanceof Error ? err.message : 'Could not delete food.')
    }
  }

  const filtered = foods.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-lg px-container-margin-mobile py-lg md:px-container-margin-desktop md:py-xl">
      <div className="flex flex-col justify-between gap-md sm:flex-row sm:items-end">
        <div>
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:font-headline-lg md:text-headline-lg">
            My Foods
          </h2>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            Your custom foods and items imported from Open Food Facts.
          </p>
        </div>
        <Link
          to="/foods/new"
          className="flex h-[48px] items-center justify-center gap-sm rounded-full bg-primary px-lg font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-on-primary-fixed-variant hover:shadow-md active:scale-95"
        >
          <Icon name="add" />
          Create custom food
        </Link>
      </div>

      <div className="relative rounded-xl bg-surface-container-lowest p-2 shadow-card">
        <Icon
          name="search"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter your foods…"
          className="h-[48px] w-full rounded-lg border-none bg-transparent pl-[40px] pr-4 font-body-md text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-error-container px-md py-sm font-label-md text-label-md text-on-error-container">
          {error}
        </p>
      )}

      {loading ? (
        <LoadingBlock label="Loading your foods…" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-2xl bg-surface-container-lowest py-2xl text-center shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
            <Icon name="restaurant_menu" />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {foods.length === 0 ? 'No foods yet.' : 'No foods match your filter.'}
          </p>
          {foods.length === 0 && (
            <Link
              to="/foods/new"
              className="mt-2 rounded-full bg-primary-container/10 px-4 py-2 font-label-md text-label-md text-primary transition-colors hover:bg-primary-container/20"
            >
              Create your first food
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card">
          <div className="flex flex-col gap-xs p-sm">
            {filtered.map((food) => (
              <div
                key={food.id}
                className="group flex items-center justify-between gap-sm rounded-xl border border-transparent p-md transition-colors hover:bg-surface-container-low"
              >
                <div className="flex min-w-0 items-center gap-md">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      food.is_custom
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-high text-secondary'
                    }`}
                  >
                    <Icon name={food.is_custom ? 'restaurant' : 'public'} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-label-md text-label-md text-on-surface">{food.name}</h3>
                    <p className="flex items-center gap-2 truncate text-sm text-on-surface-variant">
                      {food.brand ? `${food.brand} • ` : ''}
                      {food.serving_amount} {food.serving_unit}
                      {food.source !== 'custom' && <SourceTag source={food.source} />}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 font-label-md text-sm text-secondary">
                  <span className="flex flex-col items-center">
                    <b>{Math.round(calories(food))}</b>
                    <span className="text-xs font-normal text-on-surface-variant">kcal</span>
                  </span>
                  {MACROS.map((m) => (
                    <span key={m.key} className="hidden flex-col items-center sm:flex" style={{ color: m.color }}>
                      <b>{round(food[m.field])}g</b>
                      <span className="text-xs font-normal text-on-surface-variant">{m.label[0]}</span>
                    </span>
                  ))}
                  <div className="flex items-center opacity-0 transition-all group-hover:opacity-100">
                    {food.is_custom ? (
                      <Link
                        to={`/foods/${food.id}/edit`}
                        className="rounded-full p-1 text-on-surface-variant transition-colors hover:text-primary"
                        aria-label={`Edit ${food.name}`}
                      >
                        <Icon name="edit" className="text-[20px]" />
                      </Link>
                    ) : (
                      // API foods are never edited in place — copy into a new custom food.
                      <Link
                        to="/foods/new"
                        state={{ prefill: toPrefill(food) }}
                        className="rounded-full p-1 text-on-surface-variant transition-colors hover:text-primary"
                        aria-label={`Edit ${food.name} and save as a custom food`}
                        title="Edit & save as custom"
                      >
                        <Icon name="edit" className="text-[20px]" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(food)}
                      className="rounded-full p-1 text-on-surface-variant transition-colors hover:text-error"
                      aria-label={`Delete ${food.name}`}
                    >
                      <Icon name="delete" className="text-[20px]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
