/**
 * USDA FoodData Central integration.
 *
 * FoodData Central reports nutrients per 100 g (for Foundation / SR Legacy /
 * Survey foods, and per-100g values for Branded foods too), which matches our
 * fixed 100 g storage basis. We read the macro nutrients by their standard
 * nutrient numbers (203 protein, 204 fat, 205 carbohydrate by difference).
 *
 * The API requires a free api.data.gov key. Set VITE_USDA_API_KEY in .env;
 * the shared 'DEMO_KEY' is used as a fallback but is heavily rate-limited.
 */
import { round } from './macros'
import { fetchWithRetry } from './retry'
import type { ExternalFood } from './foodSources'

const SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

const API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY'

// Standard FDC nutrient numbers.
const NUTRIENT = { protein: '203', fat: '204', carbs: '205' } as const

interface FdcNutrient {
  nutrientNumber?: string
  unitName?: string
  value?: number
}

interface FdcFood {
  fdcId?: number
  description?: string
  brandName?: string
  brandOwner?: string
  foodNutrients?: FdcNutrient[]
}

function nutrientValue(nutrients: FdcNutrient[], number: string): number | null {
  const n = nutrients.find((x) => x.nutrientNumber === number)
  if (!n || typeof n.value !== 'number' || !Number.isFinite(n.value)) return null
  return n.value
}

/** Normalize one FDC food to our 100 g basis. Null if any macro is missing. */
export function normalizeFdcFood(f: FdcFood): ExternalFood | null {
  const id = f.fdcId
  const name = (f.description || '').trim()
  if (!id || !name) return null

  const nutrients = f.foodNutrients ?? []
  const carbs = nutrientValue(nutrients, NUTRIENT.carbs)
  const protein = nutrientValue(nutrients, NUTRIENT.protein)
  const fat = nutrientValue(nutrients, NUTRIENT.fat)
  if (carbs === null || protein === null || fat === null) return null

  // FDC descriptions are often ALL CAPS for branded items; present nicely.
  const prettyName = name === name.toUpperCase() ? toTitleCase(name) : name

  return {
    source: 'usda',
    externalId: String(id),
    name: prettyName,
    brand: (f.brandName || f.brandOwner || '').trim() || null,
    serving_amount: 100,
    serving_unit: 'g',
    carbs_g: round(carbs),
    protein_g: round(protein),
    fats_g: round(fat),
  }
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** Live FoodData Central search, normalized + de-duplicated + macro-complete. */
export async function searchUsda(query: string, signal?: AbortSignal): Promise<ExternalFood[]> {
  const q = query.trim()
  if (!q) return []

  const params = new URLSearchParams({
    api_key: API_KEY,
    query: q,
    pageSize: '20',
    // Prioritize whole foods + common branded items; complements OFF coverage.
    dataType: 'Foundation,SR Legacy,Branded,Survey (FNDDS)',
  })

  const res = await fetchWithRetry(
    `${SEARCH_URL}?${params.toString()}`,
    { headers: { Accept: 'application/json' } },
    { signal },
  )
  if (!res.ok) throw new Error(`USDA search failed (${res.status})`)

  const data = (await res.json()) as { foods?: FdcFood[] }
  const seen = new Set<string>()
  const out: ExternalFood[] = []
  for (const f of data.foods ?? []) {
    const food = normalizeFdcFood(f)
    if (food && !seen.has(food.externalId)) {
      seen.add(food.externalId)
      out.push(food)
    }
  }
  return out
}
