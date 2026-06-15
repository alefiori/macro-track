import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppShell } from '@/context/AppShellContext'
import { useTargets } from '@/hooks/useTargets'
import { useFoodLogs } from '@/hooks/useFoodLogs'
import { Icon } from '@/components/ui/Icon'
import { Spinner, LoadingBlock } from '@/components/ui/Spinner'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { SourceTag } from '@/components/ui/SourceTag'
import { MACROS, MEALS } from '@/lib/constants'
import {
  calories,
  caloriesForServings,
  scaleMacros,
  sumMacros,
  remaining,
  round,
  type MacroGrams,
} from '@/lib/macros'
import { addDays, dayOfWeek, formatLong, isToday, todayISO } from '@/lib/date'
import { deleteFoodLog, updateLogServings } from '@/lib/foods'
import type { FoodLogWithFood } from '@/lib/database.types'

const ZERO: MacroGrams = { carbs_g: 0, protein_g: 0, fats_g: 0 }

export default function Dashboard() {
  const { selectedDate, setSelectedDate, openAddFood, foodLogVersion, bumpFoodLogVersion } =
    useAppShell()
  const { byDay, loading: targetsLoading } = useTargets()
  const { logs, loading: logsLoading, error } = useFoodLogs(selectedDate, foodLogVersion)

  const target = byDay[dayOfWeek(selectedDate)]
  const targetMacros: MacroGrams = target
    ? { carbs_g: target.carbs_g, protein_g: target.protein_g, fats_g: target.fats_g }
    : ZERO

  const consumed = useMemo(
    () => sumMacros(logs.map((l) => scaleMacros(l.food, l.servings))),
    [logs],
  )

  const consumedKcal = calories(consumed)
  const goalKcal = calories(targetMacros)
  const remainingKcal = Math.max(0, Math.round(goalKcal - consumedKcal))
  const hasTarget = Boolean(target)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-lg px-container-margin-mobile py-lg md:px-container-margin-desktop md:py-xl">
      {/* Date selector */}
      <header className="flex items-center justify-between rounded-2xl bg-surface-container-lowest p-md shadow-card">
        <div>
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:font-headline-lg md:text-headline-lg">
            {isToday(selectedDate) ? 'Today' : formatLong(selectedDate).split(',')[0]}
          </h2>
          <p className="mt-1 font-label-md text-label-md font-normal text-on-surface-variant">
            {formatLong(selectedDate)}
          </p>
        </div>
        <div className="flex items-center gap-sm rounded-full bg-surface-container-low p-1">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="flex items-center justify-center rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
            aria-label="Previous day"
          >
            <Icon name="chevron_left" />
          </button>
          <button
            onClick={() => setSelectedDate(todayISO())}
            className="px-3 font-label-md text-label-md text-primary"
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="flex items-center justify-center rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
            aria-label="Next day"
          >
            <Icon name="chevron_right" />
          </button>
        </div>
      </header>

      {targetsLoading ? (
        <LoadingBlock label="Loading your targets…" />
      ) : (
        <>
          {!hasTarget && (
            <div className="flex flex-col items-start gap-sm rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-lowest p-lg shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-sm text-on-surface-variant">
                <Icon name="info" className="text-primary" />
                <p className="font-body-md text-body-md">
                  No macro target set for this day yet.
                </p>
              </div>
              <Link
                to="/targets"
                className="rounded-full bg-primary-container/10 px-4 py-2 font-label-md text-label-md text-primary transition-colors hover:bg-primary-container/20"
              >
                Set weekly targets
              </Link>
            </div>
          )}

          {/* Macro rings */}
          <section className="grid grid-cols-1 gap-lg md:grid-cols-3">
            {MACROS.map((m) => {
              const c = consumed[m.field]
              const t = targetMacros[m.field]
              return (
                <div
                  key={m.key}
                  className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-surface-container-lowest p-lg shadow-card"
                >
                  <div
                    className="absolute right-4 top-4 rounded-full p-2"
                    style={{ color: m.color, backgroundColor: m.tint }}
                  >
                    <Icon name={m.icon} className="text-sm" />
                  </div>
                  <h3 className="mb-6 self-start font-label-md text-label-md text-on-surface-variant">
                    {m.label}
                  </h3>
                  <ProgressRing
                    consumed={c}
                    target={t}
                    color={m.color}
                    trackColor={m.tint}
                    size={120}
                  >
                    <span className="font-headline-md text-headline-md text-on-surface">
                      {round(c)}
                      <span className="text-sm font-normal text-on-surface-variant">g</span>
                    </span>
                    <span className="mt-1 w-12 border-t border-outline-variant pt-1 text-center text-xs text-on-surface-variant">
                      {round(t)}g
                    </span>
                  </ProgressRing>
                  <div className="mt-4 text-center">
                    <p className="font-label-md text-label-md text-on-surface">
                      <span style={{ color: m.color }}>{remaining(t, c)}g</span> remaining
                    </p>
                  </div>
                </div>
              )
            })}
          </section>

          {/* Food log + calorie summary */}
          <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
            <div className="flex flex-col gap-lg lg:col-span-2">
              {error && (
                <p className="rounded-2xl bg-error-container px-md py-sm font-label-md text-label-md text-on-error-container">
                  {error}
                </p>
              )}
              {logsLoading ? (
                <LoadingBlock label="Loading meals…" />
              ) : (
                MEALS.map((meal) => (
                  <MealCard
                    key={meal.key}
                    label={meal.label}
                    icon={meal.icon}
                    logs={logs.filter((l) => l.meal === meal.key)}
                    onAdd={() => openAddFood({ meal: meal.key })}
                    onChanged={bumpFoodLogVersion}
                  />
                ))
              )}
            </div>

            {/* Calorie summary */}
            <div className="flex flex-col gap-lg lg:col-span-1">
              <div className="relative overflow-hidden rounded-2xl bg-primary p-lg text-on-primary shadow-sm">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <h3 className="relative z-10 mb-xl font-headline-md text-headline-md">Calories</h3>
                <div className="relative z-10 mb-lg flex flex-col items-center justify-center">
                  <div className="flex h-[160px] w-[160px] items-center justify-center rounded-full border-4 border-white/20 bg-white/10">
                    <div className="text-center">
                      <span className="block font-data-display text-data-display leading-none">
                        {Math.round(consumedKcal).toLocaleString()}
                      </span>
                      <span className="mt-1 block font-label-md text-label-md uppercase tracking-widest opacity-80">
                        Consumed
                      </span>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 flex items-center justify-between rounded-xl bg-black/10 p-md backdrop-blur-sm">
                  <div className="text-center">
                    <span className="block text-sm opacity-80">Goal</span>
                    <span className="font-label-md text-label-md">
                      {Math.round(goalKcal).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                  <div className="text-center">
                    <span className="block text-sm opacity-80">Remaining</span>
                    <span className="font-label-md text-label-md">
                      {remainingKcal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MealCard({
  label,
  icon,
  logs,
  onAdd,
  onChanged,
}: {
  label: string
  icon: string
  logs: FoodLogWithFood[]
  onAdd: () => void
  onChanged: () => void
}) {
  const mealKcal = logs.reduce((sum, l) => sum + caloriesForServings(l.food, l.servings), 0)
  const empty = logs.length === 0

  return (
    <div
      className={`rounded-2xl bg-surface-container-lowest p-md shadow-card md:p-lg ${
        empty ? 'border border-dashed border-outline-variant/50' : ''
      }`}
    >
      <div className="mb-md flex items-center justify-between border-b border-surface-container-high pb-sm">
        <div className="flex items-center gap-sm">
          <Icon name={icon} className={empty ? 'text-on-surface-variant' : 'text-primary'} />
          <h3
            className={`font-headline-md text-headline-md ${
              empty ? 'text-on-surface-variant' : 'text-on-surface'
            }`}
          >
            {label}
          </h3>
        </div>
        <span className="font-label-md text-label-md text-on-surface-variant">
          {Math.round(mealKcal)} kcal
        </span>
      </div>

      {empty ? (
        <div className="flex flex-col items-center gap-sm py-xl text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
            <Icon name="restaurant" />
          </div>
          <p className="text-sm text-on-surface-variant">No items logged yet</p>
          <button
            onClick={onAdd}
            className="mt-2 rounded-xl bg-primary-container/10 px-4 py-2 font-label-md text-label-md text-primary transition-colors hover:bg-primary-container/20"
          >
            Add {label}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {logs.map((log) => (
            <FoodLogRow key={log.id} log={log} onChanged={onChanged} />
          ))}
          <button
            onClick={onAdd}
            className="mt-sm flex w-full items-center justify-center gap-xs rounded-xl py-2 font-label-md text-label-md text-primary transition-colors hover:bg-primary-container/10"
          >
            <Icon name="add_circle" className="text-sm" /> Add {label} Item
          </button>
        </div>
      )}
    </div>
  )
}

/** Dominant-macro color for the leading dot. */
function dominantColor(m: MacroGrams): string {
  const entries = MACROS.map((meta) => ({ meta, val: m[meta.field] }))
  entries.sort((a, b) => b.val - a.val)
  return entries[0].val > 0 ? entries[0].meta.color : '#bcc9c6'
}

function FoodLogRow({ log, onChanged }: { log: FoodLogWithFood; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [servings, setServings] = useState(log.servings)
  const [busy, setBusy] = useState(false)

  const scaled = scaleMacros(log.food, log.servings)
  const kcal = caloriesForServings(log.food, log.servings)

  async function save() {
    setBusy(true)
    try {
      await updateLogServings(log.id, servings)
      setEditing(false)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await deleteFoodLog(log.id)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="group flex items-center justify-between gap-md rounded-xl border border-transparent p-sm transition-colors hover:border-surface-variant hover:bg-surface-container-low">
      <div className="flex min-w-0 items-center gap-md">
        <div
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dominantColor(scaled) }}
        />
        <div className="min-w-0">
          <p className="truncate font-label-md text-label-md text-on-surface">{log.food.name}</p>
          <p className="flex items-center gap-2 truncate text-sm text-on-surface-variant">
            {log.servings} × {log.food.serving_amount} {log.food.serving_unit}
            {log.food.source === 'openfoodfacts' && <SourceTag />}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-md">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={servings}
              onChange={(e) => setServings(Math.max(0.25, parseFloat(e.target.value) || 0.25))}
              className="h-9 w-20 rounded-lg border border-outline-variant bg-surface px-2 text-center font-body-md text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={save}
              disabled={busy}
              className="rounded-full p-1 text-primary hover:bg-primary-container/10"
              aria-label="Save"
            >
              {busy ? <Spinner className="h-4 w-4" /> : <Icon name="check" className="text-sm" />}
            </button>
            <button
              onClick={() => {
                setServings(log.servings)
                setEditing(false)
              }}
              className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high"
              aria-label="Cancel"
            >
              <Icon name="close" className="text-sm" />
            </button>
          </div>
        ) : (
          <>
            <div className="hidden items-center gap-sm text-xs text-on-surface-variant sm:flex">
              {MACROS.map((m) => (
                <span key={m.key} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                  {round(scaled[m.field])}g
                </span>
              ))}
            </div>
            <span className="w-16 text-right font-label-md text-label-md text-on-surface">
              {Math.round(kcal)} kcal
            </span>
            <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => setEditing(true)}
                className="p-1 text-on-surface-variant hover:text-primary"
                aria-label="Edit"
              >
                <Icon name="edit" className="text-sm" />
              </button>
              <button
                onClick={remove}
                disabled={busy}
                className="p-1 text-on-surface-variant hover:text-error"
                aria-label="Delete"
              >
                <Icon name="delete" className="text-sm" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
