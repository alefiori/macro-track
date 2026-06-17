/** Shared domain constants: meals, weekdays, and macro display metadata. */

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealMeta {
  key: MealKey
  icon: string // Material Symbols name
}

/** Display labels come from the i18n catalog under `meal.<key>`. */
export const MEALS: MealMeta[] = [
  { key: 'breakfast', icon: 'wb_sunny' },
  { key: 'lunch', icon: 'light_mode' },
  { key: 'dinner', icon: 'nights_stay' },
  { key: 'snack', icon: 'cookie' },
]

export type MacroKey = 'carbs' | 'protein' | 'fats'

export interface MacroMeta {
  key: MacroKey
  /** Display labels come from the i18n catalog under `macro.<key>`. */
  field: 'carbs_g' | 'protein_g' | 'fats_g'
  /** Bright accent for graphics only (rings, dots) — too light for text on white. */
  color: string
  /** Darkened accent that meets WCAG AA (≥4.5:1) as small text on the light surface. */
  textColor: string
  tint: string
  icon: string
}

/** Macro accent colors, used consistently everywhere (rings, dots, inputs). */
export const MACROS: MacroMeta[] = [
  { key: 'carbs', field: 'carbs_g', color: '#F59E0B', textColor: '#B45309', tint: '#FEF3C7', icon: 'bakery_dining' },
  { key: 'protein', field: 'protein_g', color: '#3B82F6', textColor: '#1D4ED8', tint: '#DBEAFE', icon: 'set_meal' },
  { key: 'fats', field: 'fats_g', color: '#EF4444', textColor: '#B91C1C', tint: '#FEE2E2', icon: 'water_drop' },
]

/** Weekday labels indexed by JS getDay() (0 = Sunday). */
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

/** Order used in the weekly-targets grid (Mon → Sun), with day_of_week index. */
export const TARGET_DAYS: { dow: number; short: string; long: string }[] = [
  { dow: 1, short: 'Mon', long: 'Monday' },
  { dow: 2, short: 'Tue', long: 'Tuesday' },
  { dow: 3, short: 'Wed', long: 'Wednesday' },
  { dow: 4, short: 'Thu', long: 'Thursday' },
  { dow: 5, short: 'Fri', long: 'Friday' },
  { dow: 6, short: 'Sat', long: 'Saturday' },
  { dow: 0, short: 'Sun', long: 'Sunday' },
]

export const SERVING_UNITS = ['g', 'ml', 'oz', 'cup', 'piece', 'tbsp', 'tsp', 'serving']

/**
 * Default language (ISO 639-1) for Open Food Facts results when no profile
 * preference is loaded. The selectable language list now lives in the i18n
 * module (`LOCALES`), since one preference drives both UI and OFF language.
 */
export const DEFAULT_OFF_LANGUAGE = 'en'
