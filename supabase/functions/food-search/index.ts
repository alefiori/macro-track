// Unified server-side proxy for all external food data requests.
//
// Why this exists: the app calls food APIs directly from the browser. Some of
// those APIs can't be called client-side — Search-a-licious (Open Food Facts'
// better search) serves no CORS headers, and the USDA key must not ship in the
// browser bundle. This function runs every external lookup server-side (no CORS
// enforcement, secrets stay here), normalizes results to the app's ExternalFood
// shape, and returns them with CORS headers the browser accepts.
//
// Two modes (GET query params):
//   ?q=milk&lang=en     -> text search, fans out to every source, merged+deduped
//   ?barcode=3017620...  -> single-product lookup (Open Food Facts only)
//
// Adding a new source: write a `SearchFn` that returns ExternalFood[] and add it
// to the SOURCES array below. Read any API key via Deno.env.get(...). Nothing
// else (client, other sources) needs to change.
//
// Deploy:  supabase functions deploy food-search
//          supabase secrets set USDA_API_KEY=...   (optional; defaults to DEMO_KEY)
// Local:   supabase functions serve food-search

const OFF_SEARCH_URL = 'https://search.openfoodfacts.org/search'
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'
const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

const USER_AGENT = 'MacroTrack/0.1 (daily macros tracker; +https://github.com/macrotrack)'
const DEFAULT_LANG = 'en'
const PAGE_SIZE = '20'
const USDA_API_KEY = Deno.env.get('USDA_API_KEY') || 'DEMO_KEY'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

// Mirrors src/lib/foodSources.ts ExternalFood (kept in sync intentionally; the
// Deno runtime can't import from the app's src/).
type ExternalSource = 'openfoodfacts' | 'usda'
interface ExternalFood {
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

type SearchFn = (q: string, lang: string, signal: AbortSignal) => Promise<ExternalFood[]>

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Mirrors src/lib/macros.ts round(). */
function round(n: number, decimals = 1): number {
  const f = 10 ** decimals
  return Math.round((n + Number.EPSILON) * f) / f
}

function num(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** De-duplicate by externalId, preserving order. */
function dedupe(foods: ExternalFood[]): ExternalFood[] {
  const seen = new Set<string>()
  const out: ExternalFood[] = []
  for (const f of foods) {
    const key = `${f.source}:${f.externalId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
}

// ---------------------------------------------------------------------------
// Open Food Facts (Search-a-licious for text, v2 product for barcode)
// ---------------------------------------------------------------------------

interface OffProduct {
  code?: string
  product_name?: string
  // Search-a-licious returns brands as an array; the v2 product API returns a
  // comma-separated string. Accept both.
  brands?: string | string[]
  nutriments?: Record<string, number | string | undefined>
  [key: string]: unknown
}

function offLocalizedName(p: OffProduct, lang: string): string {
  const localized = p[`product_name_${lang}`]
  return (typeof localized === 'string' ? localized : p.product_name || '').trim()
}

/** First brand from either an array (Search-a-licious) or a comma-separated string (v2). */
function offBrand(brands: string | string[] | undefined): string | null {
  if (Array.isArray(brands)) {
    const first = brands.find((b) => typeof b === 'string' && b.trim())
    return first ? first.trim() : null
  }
  if (typeof brands === 'string' && brands.trim()) return brands.split(',')[0].trim()
  return null
}

function offFields(lang: string): string {
  return `code,product_name,product_name_${lang},brands,nutriments`
}

/** Normalize one OFF product to a fixed 100 g basis. Null if any macro/code/name missing. */
function normalizeOff(p: OffProduct, lang: string): ExternalFood | null {
  const code = p.code
  const carbs100 = num(p.nutriments?.carbohydrates_100g)
  const protein100 = num(p.nutriments?.proteins_100g)
  const fat100 = num(p.nutriments?.fat_100g)
  if (!code || carbs100 === null || protein100 === null || fat100 === null) return null

  const name = offLocalizedName(p, lang)
  if (!name) return null

  return {
    source: 'openfoodfacts',
    externalId: code,
    name,
    brand: offBrand(p.brands),
    serving_amount: 100,
    serving_unit: 'g',
    carbs_g: round(carbs100),
    protein_g: round(protein100),
    fats_g: round(fat100),
  }
}

const searchOpenFoodFacts: SearchFn = async (q, lang, signal) => {
  const params = new URLSearchParams({
    q,
    page_size: PAGE_SIZE,
    langs: lang,
    fields: offFields(lang),
  })
  const res = await fetch(`${OFF_SEARCH_URL}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal,
  })
  if (!res.ok) throw new Error(`Open Food Facts search failed (${res.status})`)
  const data = (await res.json()) as { hits?: OffProduct[] }
  return (data.hits ?? []).map((p) => normalizeOff(p, lang)).filter((f): f is ExternalFood => !!f)
}

async function lookupOffBarcode(
  code: string,
  lang: string,
  signal: AbortSignal,
): Promise<ExternalFood | null> {
  const params = new URLSearchParams({ lc: lang, fields: offFields(lang) })
  const res = await fetch(
    `${OFF_PRODUCT_URL}/${encodeURIComponent(code)}.json?${params.toString()}`,
    { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal },
  )
  if (!res.ok) throw new Error(`Open Food Facts lookup failed (${res.status})`)
  const data = (await res.json()) as { status?: number; product?: OffProduct }
  if (data.status !== 1 || !data.product) return null
  return normalizeOff(data.product, lang)
}

// ---------------------------------------------------------------------------
// USDA FoodData Central
// ---------------------------------------------------------------------------

interface FdcNutrient {
  nutrientNumber?: string
  value?: number
}
interface FdcFood {
  fdcId?: number
  description?: string
  brandName?: string
  brandOwner?: string
  foodNutrients?: FdcNutrient[]
}

// Standard FDC nutrient numbers: 203 protein, 204 fat, 205 carbohydrate.
const FDC_NUTRIENT = { protein: '203', fat: '204', carbs: '205' }

function fdcNutrient(nutrients: FdcNutrient[], number: string): number | null {
  const n = nutrients.find((x) => x.nutrientNumber === number)
  if (!n || typeof n.value !== 'number' || !Number.isFinite(n.value)) return null
  return n.value
}

function normalizeFdc(f: FdcFood): ExternalFood | null {
  const id = f.fdcId
  const name = (f.description || '').trim()
  if (!id || !name) return null

  const nutrients = f.foodNutrients ?? []
  const carbs = fdcNutrient(nutrients, FDC_NUTRIENT.carbs)
  const protein = fdcNutrient(nutrients, FDC_NUTRIENT.protein)
  const fat = fdcNutrient(nutrients, FDC_NUTRIENT.fat)
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

const searchUsda: SearchFn = async (q, _lang, signal) => {
  const params = new URLSearchParams({
    api_key: USDA_API_KEY,
    query: q,
    pageSize: PAGE_SIZE,
    // Prioritize whole foods + common branded items; complements OFF coverage.
    dataType: 'Foundation,SR Legacy,Branded,Survey (FNDDS)',
  })
  const res = await fetch(`${USDA_SEARCH_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) throw new Error(`USDA search failed (${res.status})`)
  const data = (await res.json()) as { foods?: FdcFood[] }
  return (data.foods ?? []).map(normalizeFdc).filter((f): f is ExternalFood => !!f)
}

// ---------------------------------------------------------------------------
// Source registry — add new sources here.
// ---------------------------------------------------------------------------

const SOURCES: { name: string; search: SearchFn }[] = [
  { name: 'openfoodfacts', search: searchOpenFoodFacts },
  { name: 'usda', search: searchUsda },
]

/** Run every source in parallel; a failing source degrades to [] (never the whole search). */
async function searchAllSources(q: string, lang: string, signal: AbortSignal): Promise<ExternalFood[]> {
  const settled = await Promise.allSettled(SOURCES.map((s) => s.search(q, lang, signal)))
  const merged: ExternalFood[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') merged.push(...r.value)
  }
  return dedupe(merged)
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const url = new URL(req.url)
    const lang = (url.searchParams.get('lang') ?? DEFAULT_LANG).trim() || DEFAULT_LANG
    const barcode = (url.searchParams.get('barcode') ?? '').trim()

    if (barcode) {
      const food = await lookupOffBarcode(barcode, lang, req.signal)
      return json(food ? [food] : [], 200)
    }

    const q = (url.searchParams.get('q') ?? '').trim()
    if (!q) return json([], 200)

    return json(await searchAllSources(q, lang, req.signal), 200)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return new Response(null, { status: 499, headers: CORS_HEADERS })
    }
    return json({ error: err instanceof Error ? err.message : 'Search failed.' }, 500)
  }
})
