/** Shared domain constants: meals, weekdays, and macro display metadata. */

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealMeta {
  key: MealKey
  label: string
  icon: string // Material Symbols name
}

export const MEALS: MealMeta[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'wb_sunny' },
  { key: 'lunch', label: 'Lunch', icon: 'light_mode' },
  { key: 'dinner', label: 'Dinner', icon: 'nights_stay' },
  { key: 'snack', label: 'Snack', icon: 'cookie' },
]

export type MacroKey = 'carbs' | 'protein' | 'fats'

export interface MacroMeta {
  key: MacroKey
  label: string
  field: 'carbs_g' | 'protein_g' | 'fats_g'
  color: string
  tint: string
  icon: string
}

/** Macro accent colors, used consistently everywhere (rings, dots, inputs). */
export const MACROS: MacroMeta[] = [
  { key: 'carbs', label: 'Carbs', field: 'carbs_g', color: '#F59E0B', tint: '#FEF3C7', icon: 'bakery_dining' },
  { key: 'protein', label: 'Protein', field: 'protein_g', color: '#3B82F6', tint: '#DBEAFE', icon: 'set_meal' },
  { key: 'fats', label: 'Fats', field: 'fats_g', color: '#8B5CF6', tint: '#EDE9FE', icon: 'water_drop' },
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
 * Languages selectable for Open Food Facts results (ISO 639-1). Used both for
 * the OFF `lc` query param and to prefer the localized product name. Keep this
 * list in sync with the off_language check constraint in the profiles table.
 */
export interface OffLanguage {
  code: string
  label: string
}

export const OFF_LANGUAGES: OffLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
]

export const DEFAULT_OFF_LANGUAGE = 'en'
