import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Spinner } from '@/components/ui/Spinner'
import { useAppShell } from '@/context/AppShellContext'
import { MACROS, SERVING_UNITS, MEALS, type MealKey } from '@/lib/constants'
import { calories } from '@/lib/macros'
import { createCustomFood, logFoodEntry } from '@/lib/foods'

const fieldClass =
  'w-full min-h-[48px] rounded-lg border border-outline-variant bg-surface-bright px-4 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors'

export default function CreateCustomFood() {
  const navigate = useNavigate()
  const { selectedDate, bumpFoodLogVersion } = useAppShell()

  const [name, setName] = useState('')
  const [servingAmount, setServingAmount] = useState('1')
  const [servingUnit, setServingUnit] = useState('g')
  const [carbs, setCarbs] = useState('0')
  const [protein, setProtein] = useState('0')
  const [fats, setFats] = useState('0')
  const [meal, setMeal] = useState<MealKey>('breakfast')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const macros = useMemo(
    () => ({
      carbs_g: parseFloat(carbs) || 0,
      protein_g: parseFloat(protein) || 0,
      fats_g: parseFloat(fats) || 0,
    }),
    [carbs, protein, fats],
  )
  const kcal = calories(macros)
  const setters = { carbs_g: setCarbs, protein_g: setProtein, fats_g: setFats }
  const valueOf = { carbs_g: carbs, protein_g: protein, fats_g: fats }

  function validate(): string | null {
    if (!name.trim()) return 'Please enter a food name.'
    if (!(parseFloat(servingAmount) > 0)) return 'Serving amount must be greater than 0.'
    return null
  }

  async function save(addToday: boolean) {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const food = await createCustomFood({
        name: name.trim(),
        serving_amount: parseFloat(servingAmount),
        serving_unit: servingUnit,
        carbs_g: macros.carbs_g,
        protein_g: macros.protein_g,
        fats_g: macros.fats_g,
      })
      if (addToday) {
        await logFoodEntry({ foodId: food.id, date: selectedDate, meal, servings: 1 })
        bumpFoodLogVersion()
        navigate('/')
      } else {
        navigate('/foods')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save food.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col px-container-margin-mobile py-lg pb-32 md:px-container-margin-desktop">
      <div className="mb-lg flex items-center gap-sm">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full p-2 transition-colors hover:bg-surface-container-low"
        >
          <Icon name="arrow_back" className="text-on-surface-variant" />
        </button>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface md:font-headline-lg md:text-headline-lg">
          Create Custom Food
        </h1>
      </div>

      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-surface-container-lowest p-5 shadow-card md:p-[20px]">
        <form className="flex flex-col gap-lg" onSubmit={(e) => e.preventDefault()}>
          {error && (
            <p className="rounded-lg bg-error-container px-md py-sm font-label-md text-label-md text-on-error-container">
              {error}
            </p>
          )}

          {/* Food details */}
          <div className="flex flex-col gap-md">
            <h2 className="font-headline-md text-headline-md font-bold text-primary">Food Details</h2>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="foodName">
                Food Name
              </label>
              <input
                id="foodName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Homemade Almond Butter"
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-md md:flex-row">
              <div className="flex flex-1 flex-col gap-2">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="servingAmount">
                  Serving Amount
                </label>
                <input
                  id="servingAmount"
                  type="number"
                  min={0}
                  step="any"
                  value={servingAmount}
                  onChange={(e) => setServingAmount(e.target.value)}
                  placeholder="1"
                  className={fieldClass}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="servingUnit">
                  Serving Unit
                </label>
                <select
                  id="servingUnit"
                  value={servingUnit}
                  onChange={(e) => setServingUnit(e.target.value)}
                  className={fieldClass}
                >
                  {SERVING_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-surface-container-highest" />

          {/* Macros */}
          <div className="flex flex-col gap-md">
            <div className="flex items-end justify-between">
              <h2 className="font-headline-md text-headline-md font-bold text-primary">
                Macros (per serving)
              </h2>
              <div className="flex flex-col items-end">
                <span className="font-label-md text-label-md text-on-surface-variant">Est. Calories</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-data-display text-data-display font-extrabold text-on-surface">
                    {Math.round(kcal)}
                  </span>
                  <span className="font-body-md text-body-md text-on-surface-variant">kcal</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-md md:grid-cols-3">
              {MACROS.map((m) => (
                <div key={m.key} className="flex flex-col gap-2">
                  <label
                    className="flex items-center gap-2 font-label-md text-label-md"
                    style={{ color: m.color }}
                    htmlFor={`${m.key}Input`}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.label} (g)
                  </label>
                  <input
                    id={`${m.key}Input`}
                    type="number"
                    min={0}
                    step="any"
                    value={valueOf[m.field]}
                    onChange={(e) => setters[m.field](e.target.value)}
                    onFocus={(e) => e.target.value === '0' && e.target.select()}
                    className="min-h-[48px] w-full rounded-lg border border-outline-variant bg-surface-bright px-4 py-3 font-body-md text-body-md text-on-surface outline-none transition-colors"
                    style={{ caretColor: m.color }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Meal (used when adding to today) */}
          <div className="flex flex-col gap-2">
            <label className="font-label-md text-label-md text-on-surface-variant">
              Meal (if adding to today)
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MEALS.map((mm) => (
                <button
                  key={mm.key}
                  type="button"
                  onClick={() => setMeal(mm.key)}
                  className={`rounded-lg border py-2 font-label-md text-label-md transition-colors ${
                    meal === mm.key
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {mm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-md flex flex-col gap-sm sm:flex-row">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={busy}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-primary font-label-md text-label-md font-semibold text-on-primary shadow-sm transition-all hover:bg-on-primary-fixed-variant hover:shadow-md active:scale-95 disabled:opacity-60"
            >
              {busy ? <Spinner className="h-4 w-4" /> : <Icon name="save" className="text-[20px]" />}
              Save Food
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={busy}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-primary-container/20 font-label-md text-label-md font-semibold text-primary transition-all hover:bg-primary-container/30 active:scale-95 disabled:opacity-60"
            >
              <Icon name="add_task" className="text-[20px]" />
              Save &amp; Add Today
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
