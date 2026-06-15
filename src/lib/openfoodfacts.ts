/**
 * Open Food Facts integration.
 *
 * OFF nutriments are reported per 100 g. We store every imported food on a
 * fixed 100 g basis (serving_amount = 100, serving_unit = 'g') using the
 * _100g values directly — no per-portion conversion. Logging then works in
 * multiples of 100 g (e.g. 1.5 servings = 150 g).
 *
 * OFF asks API consumers to send a descriptive User-Agent identifying the app.
 */
import { round } from './macros'

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'

const USER_AGENT = 'MacroTrack/0.1 (daily macros tracker; +https://github.com/macrotrack)'

/** A food normalized to a single serving — ready to upsert into `foods`. */
export interface OffFood {
  off_id: string
  name: string
  brand: string | null
  serving_amount: number
  serving_unit: string
  carbs_g: number
  protein_g: number
  fats_g: number
}

interface OffProduct {
  code?: string
  product_name?: string
  brands?: string
  nutriments?: Record<string, number | string | undefined>
}

function num(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Normalize one OFF product to per-serving macros.
 * Returns null when any of the three macros is missing (we skip those).
 */
export function normalizeProduct(p: OffProduct): OffFood | null {
  const code = p.code
  const carbs100 = num(p.nutriments?.carbohydrates_100g)
  const protein100 = num(p.nutriments?.proteins_100g)
  const fat100 = num(p.nutriments?.fat_100g)

  if (!code || carbs100 === null || protein100 === null || fat100 === null) {
    return null
  }

  const name = (p.product_name || '').trim()
  if (!name) return null

  // Everything is stored on a fixed 100 g basis using the _100g values.
  return {
    off_id: code,
    name,
    brand: p.brands ? p.brands.split(',')[0].trim() : null,
    serving_amount: 100,
    serving_unit: 'g',
    carbs_g: round(carbs100),
    protein_g: round(protein100),
    fats_g: round(fat100),
  }
}

/** Live OFF text search. Returns normalized, de-duplicated, macro-complete foods. */
export async function searchOpenFoodFacts(
  query: string,
  signal?: AbortSignal,
): Promise<OffFood[]> {
  const q = query.trim()
  if (!q) return []

  const params = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    fields: 'code,product_name,brands,nutriments',
  })

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    signal,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Open Food Facts search failed (${res.status})`)

  const data = (await res.json()) as { products?: OffProduct[] }
  const seen = new Set<string>()
  const out: OffFood[] = []
  for (const p of data.products ?? []) {
    const food = normalizeProduct(p)
    if (food && !seen.has(food.off_id)) {
      seen.add(food.off_id)
      out.push(food)
    }
  }
  return out
}

/** Barcode lookup via the OFF v2 product endpoint. */
export async function lookupBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<OffFood | null> {
  const code = barcode.trim()
  if (!code) return null

  const params = new URLSearchParams({
    fields: 'code,product_name,brands,nutriments',
  })
  const res = await fetch(`${PRODUCT_URL}/${encodeURIComponent(code)}.json?${params}`, {
    signal,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Open Food Facts lookup failed (${res.status})`)

  const data = (await res.json()) as { status?: number; product?: OffProduct }
  if (data.status !== 1 || !data.product) return null
  return normalizeProduct(data.product)
}
