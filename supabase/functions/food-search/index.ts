// Unified server-side proxy for all external food data requests.
//
// Why this exists: the app calls food APIs directly from the browser. Some of
// those APIs can't be called client-side — Open Food Facts serves no CORS
// headers on its search endpoint, and the USDA key must not ship in the browser
// bundle. This function runs every external lookup server-side (no CORS
// enforcement, secrets stay here), normalizes results to the app's ExternalFood
// shape, and returns them with CORS headers the browser accepts.
//
// Two modes (GET query params):
//   ?q=milk&lang=en     -> text search, fans out to every source, merged+deduped
//   ?barcode=3017620...  -> single-product lookup (Open Food Facts, falling
//                           back to Edamam UPC lookup when OFF has no match)
//
// Adding a new source: write a `SearchFn` that returns ExternalFood[] and add it
// to the SOURCES array below. Read any API key via Deno.env.get(...). Nothing
// else (client, other sources) needs to change.
//
// Deploy:  supabase functions deploy food-search
//          supabase secrets set USDA_API_KEY=...   (optional; defaults to DEMO_KEY)
//          supabase secrets set EDAMAM_APP_ID=... EDAMAM_APP_KEY=...   (optional;
//          Edamam is skipped when unset — https://developer.edamam.com/food-database-api)
// Local:   supabase functions serve food-search

// Text search uses the legacy CGI search endpoint. The newer Search-a-licious
// host (search.openfoodfacts.org) was previously used here but now returns 502
// for anonymous traffic, so it can no longer be relied on.
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'
const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'
const EDAMAM_PARSER_URL = 'https://api.edamam.com/api/food-database/v2/parser'

const USER_AGENT = 'MacroTrack/0.1 (daily macros tracker; +https://github.com/macrotrack)'
const DEFAULT_LANG = 'en'
const PAGE_SIZE = '20'
const USDA_API_KEY = Deno.env.get('USDA_API_KEY') || 'DEMO_KEY'
const EDAMAM_APP_ID = Deno.env.get('EDAMAM_APP_ID') || ''
const EDAMAM_APP_KEY = Deno.env.get('EDAMAM_APP_KEY') || ''

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

// Mirrors src/lib/foodSources.ts ExternalFood (kept in sync intentionally; the
// Deno runtime can't import from the app's src/).
type ExternalSource = 'openfoodfacts' | 'usda' | 'edamam'
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
// Open Food Facts (legacy CGI search for text, v2 product for barcode)
// ---------------------------------------------------------------------------

interface OffProduct {
  code?: string
  product_name?: string
  // The CGI search and v2 product APIs return brands as a comma-separated
  // string; Search-a-licious returned an array. Accept both.
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
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: PAGE_SIZE,
    lc: lang,
    fields: offFields(lang),
  })
  const res = await fetch(`${OFF_SEARCH_URL}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal,
  })
  // Under load OFF answers anonymous search traffic with a 503 HTML page;
  // gating on res.ok keeps us from trying to JSON-parse it (the failure then
  // degrades this source to [] upstream rather than sinking the whole search).
  if (!res.ok) throw new Error(`Open Food Facts search failed (${res.status})`)
  const data = (await res.json()) as { products?: OffProduct[] }
  return (data.products ?? []).map((p) => normalizeOff(p, lang)).filter((f): f is ExternalFood => !!f)
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
// Edamam Food Database (parser endpoint)
// ---------------------------------------------------------------------------

interface EdamamFood {
  foodId?: string
  label?: string
  brand?: string
  // Nutrients are per 100 g: ENERC_KCAL energy, PROCNT protein, FAT fat,
  // CHOCDF carbohydrate. Edamam omits keys it has no value for.
  nutrients?: Record<string, number | undefined>
}
interface EdamamHit {
  food?: EdamamFood
}

function edamamNutrient(f: EdamamFood, key: string): number | null {
  const v = f.nutrients?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function normalizeEdamam(f: EdamamFood | undefined): ExternalFood | null {
  if (!f) return null
  const id = (f.foodId || '').trim()
  const name = (f.label || '').trim()
  if (!id || !name) return null

  const carbs = edamamNutrient(f, 'CHOCDF')
  const protein = edamamNutrient(f, 'PROCNT')
  const fat = edamamNutrient(f, 'FAT')
  // Edamam omits zero-valued nutrients, so a missing macro on an otherwise
  // nutrition-bearing entry means 0 — but drop entries with no macro data at
  // all (e.g. bare parser matches without nutrition).
  if (carbs === null && protein === null && fat === null) return null

  return {
    source: 'edamam',
    externalId: id,
    name,
    brand: (f.brand || '').trim() || null,
    serving_amount: 100,
    serving_unit: 'g',
    carbs_g: round(carbs ?? 0),
    protein_g: round(protein ?? 0),
    fats_g: round(fat ?? 0),
  }
}

/** Call the parser endpoint with either `ingr` (text) or `upc` (barcode). */
async function edamamParse(
  query: Record<string, string>,
  signal: AbortSignal,
): Promise<ExternalFood[]> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) return [] // credentials not configured; skip
  const params = new URLSearchParams({
    app_id: EDAMAM_APP_ID,
    app_key: EDAMAM_APP_KEY,
    'nutrition-type': 'logging',
    ...query,
  })
  const res = await fetch(`${EDAMAM_PARSER_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  // Edamam answers 404 for an unknown UPC — a miss, not a failure.
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`Edamam search failed (${res.status})`)
  const data = (await res.json()) as { parsed?: EdamamHit[]; hints?: EdamamHit[] }
  // `parsed` holds exact matches, `hints` related ones; the same foodId can
  // appear in both — the shared dedupe() pass drops the repeats.
  return [...(data.parsed ?? []), ...(data.hints ?? [])]
    .map((h) => normalizeEdamam(h.food))
    .filter((f): f is ExternalFood => !!f)
    .slice(0, Number(PAGE_SIZE))
}

/** Text search via the parser endpoint. English-only, so `lang` is ignored. */
const searchEdamam: SearchFn = (q, _lang, signal) => edamamParse({ ingr: q }, signal)

async function lookupEdamamBarcode(
  code: string,
  signal: AbortSignal,
): Promise<ExternalFood | null> {
  const foods = await edamamParse({ upc: code }, signal)
  return foods[0] ?? null
}

// ---------------------------------------------------------------------------
// Source registry — add new sources here.
// ---------------------------------------------------------------------------

const SOURCES: { name: string; search: SearchFn }[] = [
  { name: 'openfoodfacts', search: searchOpenFoodFacts },
  { name: 'usda', search: searchUsda },
  { name: 'edamam', search: searchEdamam },
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
      // Open Food Facts first (richer, localized data), then Edamam's UPC
      // lookup for products OFF doesn't know. A source erroring (not just
      // missing the product) moves on to the next instead of failing the call.
      const lookups = [
        () => lookupOffBarcode(barcode, lang, req.signal),
        () => lookupEdamamBarcode(barcode, req.signal),
      ]
      for (const lookup of lookups) {
        try {
          const food = await lookup()
          if (food) return json([food], 200)
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') throw err
        }
      }
      return json([], 200)
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
