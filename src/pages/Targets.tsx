import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { useTargets } from '@/hooks/useTargets'
import { supabase } from '@/lib/supabase'
import { Icon } from '@/components/ui/Icon'
import { Spinner, LoadingBlock } from '@/components/ui/Spinner'
import { MACROS, TARGET_DAYS } from '@/lib/constants'
import { calories } from '@/lib/macros'
import type { TranslationKey } from '@/lib/i18n'

/** Map a JS day-of-week index (0 = Sunday) to its weekday translation key. */
const DOW_KEY: Record<number, TranslationKey> = {
  0: 'weekday.short.sun',
  1: 'weekday.short.mon',
  2: 'weekday.short.tue',
  3: 'weekday.short.wed',
  4: 'weekday.short.thu',
  5: 'weekday.short.fri',
  6: 'weekday.short.sat',
}

interface DayValues {
  carbs_g: number
  protein_g: number
  fats_g: number
}

type Values = Record<number, DayValues>

const EMPTY: DayValues = { carbs_g: 0, protein_g: 0, fats_g: 0 }

export default function Targets() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { byDay, loading, error, refetch } = useTargets()
  const [values, setValues] = useState<Values>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Seed editable state once targets load.
  useEffect(() => {
    const next: Values = {}
    for (const { dow } of TARGET_DAYS) {
      const t = byDay[dow]
      next[dow] = t
        ? { carbs_g: t.carbs_g, protein_g: t.protein_g, fats_g: t.fats_g }
        : { ...EMPTY }
    }
    setValues(next)
  }, [byDay])

  function setField(dow: number, field: keyof DayValues, raw: string) {
    const v = Math.max(0, parseFloat(raw) || 0)
    setValues((prev) => ({ ...prev, [dow]: { ...prev[dow], [field]: v } }))
    setSaved(false)
  }

  function copyToAll(sourceDow: number) {
    const src = values[sourceDow]
    if (!src) return
    const next: Values = {}
    for (const { dow } of TARGET_DAYS) next[dow] = { ...src }
    setValues(next)
    setSaved(false)
  }

  async function save() {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const rows = TARGET_DAYS.map(({ dow }) => ({
        user_id: user.id,
        day_of_week: dow,
        ...(values[dow] ?? EMPTY),
      }))
      const { error: upsertErr } = await supabase
        .from('macro_targets')
        .upsert(rows, { onConflict: 'user_id,day_of_week' })
      if (upsertErr) throw new Error(upsertErr.message)
      await refetch()
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('targets.couldNotSave'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="sticky top-[72px] z-20 flex flex-col justify-between gap-md border-b border-outline-variant/10 bg-surface-bright/80 px-container-margin-mobile py-lg backdrop-blur-sm md:flex-row md:items-end lg:top-0 lg:px-container-margin-desktop lg:py-xl">
        <div>
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface lg:font-headline-lg lg:text-headline-lg">
            {t('targets.title')}
          </h2>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            {t('targets.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <button
            onClick={() => copyToAll(1)}
            className="flex h-[48px] items-center justify-center gap-sm rounded-full bg-secondary-container px-lg font-label-md text-label-md text-on-secondary-container transition-all hover:bg-surface-container-high active:scale-95"
          >
            <Icon name="content_copy" className="text-[20px]" />
            <span className="hidden sm:inline">{t('targets.copyMonToAll')}</span>
            <span className="sm:hidden">{t('targets.copyMon')}</span>
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex h-[48px] items-center justify-center gap-sm rounded-full bg-primary px-lg font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-on-primary-fixed-variant hover:shadow-md active:scale-95 disabled:opacity-60"
          >
            {saving ? <Spinner className="h-4 w-4" /> : <Icon name="save" className="text-[20px]" />}
            {t('targets.saveTargets')}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] p-container-margin-mobile lg:p-container-margin-desktop">
        {(saveError || error) && (
          <p className="mb-md rounded-lg bg-error-container px-md py-sm font-label-md text-label-md text-on-error-container">
            {saveError ?? error}
          </p>
        )}
        {saved && (
          <p className="mb-md rounded-lg bg-primary-container/10 px-md py-sm font-label-md text-label-md text-primary">
            {t('targets.saved')}
          </p>
        )}

        {loading ? (
          <LoadingBlock label={t('targets.loading')} />
        ) : (
          <div className="grid grid-cols-1 items-start gap-md lg:grid-cols-7 lg:gap-sm">
            {TARGET_DAYS.map(({ dow }) => {
              const v = values[dow] ?? EMPTY
              const kcal = calories(v)
              const dayLabel = t(DOW_KEY[dow])
              return (
                <div
                  key={dow}
                  className="flex flex-col gap-md rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-md shadow-card transition-all hover:shadow-card-hover"
                >
                  <div className="flex items-center justify-between border-b border-outline-variant/10 pb-sm">
                    <h3
                      className={`font-headline-md text-headline-md ${
                        dow === 0 || dow === 6 ? 'text-on-surface-variant' : 'text-on-surface'
                      }`}
                    >
                      {dayLabel}
                    </h3>
                    <button
                      onClick={() => copyToAll(dow)}
                      aria-label={t('targets.copyDayToAll', { day: dayLabel })}
                      title={t('targets.copyDayToAll', { day: dayLabel })}
                      className="rounded-full p-1 text-outline-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                    >
                      <Icon name="content_copy" className="text-[18px]" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-sm">
                    {MACROS.map((m) => (
                      <div key={m.key} className="flex flex-col gap-xs">
                        <label
                          htmlFor={`target-${dow}-${m.key}`}
                          className="flex items-center gap-xs font-label-md text-label-md text-on-surface-variant"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: m.color }}
                          />
                          {t('targets.macroLabel', { macro: t(`macro.${m.key}`) })}
                        </label>
                        <input
                          id={`target-${dow}-${m.key}`}
                          type="number"
                          min={0}
                          placeholder="0"
                          value={v[m.field] || ''}
                          onChange={(e) => setField(dow, m.field, e.target.value)}
                          className="h-[48px] w-full rounded-lg border border-outline-variant/50 bg-surface px-md text-right font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-col items-center justify-center rounded-lg bg-surface-container-low p-sm pt-sm">
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      {t('targets.totalCalories')}
                    </span>
                    <div className="font-data-display text-[28px] font-bold leading-[36px] text-on-surface">
                      {Math.round(kcal)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
