import type { ExternalSource, FoodSource } from './database.types'

/**
 * A food from an external database (Open Food Facts, USDA FoodData Central),
 * normalized to a fixed 100 g basis so it maps cleanly onto our `foods` model.
 * `externalId` is stored in the `foods.off_id` column and de-duplicated per
 * source.
 */
export interface ExternalFood {
  source: ExternalSource
  externalId: string
  name: string
  brand: string | null
  serving_amount: number
  serving_unit: string
  carbs_g: number
  protein_g: number
  fats_g: number
}

/** Human-readable labels for each food source (used by the attribution tag). */
export const SOURCE_LABELS: Record<FoodSource, string> = {
  custom: 'Custom',
  openfoodfacts: 'Open Food Facts',
  usda: 'USDA',
}

/** Icon (Material Symbols) per source. */
export const SOURCE_ICONS: Record<FoodSource, string> = {
  custom: 'restaurant',
  openfoodfacts: 'public',
  usda: 'verified',
}
