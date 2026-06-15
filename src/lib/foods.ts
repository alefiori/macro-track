import { supabase } from './supabase'
import type { Food, MealKey } from './database.types'
import type { OffFood } from './openfoodfacts'

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Not authenticated.')
  return data.user.id
}

/**
 * Ensure an Open Food Facts product exists as a local `foods` row and return it.
 * De-duplicates on off_id: if it already exists we reuse it, so logs always
 * reference a stable local food.
 */
export async function upsertOffFood(off: OffFood): Promise<Food> {
  const userId = await currentUserId()

  // Re-use an existing imported row if present (avoids partial-index upsert quirks).
  const { data: existing, error: selErr } = await supabase
    .from('foods')
    .select('*')
    .eq('off_id', off.off_id)
    .limit(1)
    .maybeSingle()
  if (selErr) throw new Error(selErr.message)
  if (existing) return existing as Food

  const { data, error } = await supabase
    .from('foods')
    .insert({
      user_id: userId,
      name: off.name,
      brand: off.brand,
      serving_amount: off.serving_amount,
      serving_unit: off.serving_unit,
      carbs_g: off.carbs_g,
      protein_g: off.protein_g,
      fats_g: off.fats_g,
      source: 'openfoodfacts',
      off_id: off.off_id,
      is_custom: false,
    })
    .select('*')
    .single()

  // If a concurrent insert won the race, fall back to the existing row.
  if (error) {
    const { data: raced } = await supabase
      .from('foods')
      .select('*')
      .eq('off_id', off.off_id)
      .limit(1)
      .maybeSingle()
    if (raced) return raced as Food
    throw new Error(error.message)
  }
  return data as Food
}

export interface NewCustomFood {
  name: string
  brand?: string | null
  serving_amount: number
  serving_unit: string
  carbs_g: number
  protein_g: number
  fats_g: number
}

export async function createCustomFood(input: NewCustomFood): Promise<Food> {
  const userId = await currentUserId()
  const { data, error } = await supabase
    .from('foods')
    .insert({
      user_id: userId,
      name: input.name,
      brand: input.brand ?? null,
      serving_amount: input.serving_amount,
      serving_unit: input.serving_unit,
      carbs_g: input.carbs_g,
      protein_g: input.protein_g,
      fats_g: input.fats_g,
      source: 'custom',
      off_id: null,
      is_custom: true,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Food
}

export async function logFoodEntry(params: {
  foodId: string
  date: string
  meal: MealKey
  servings: number
}): Promise<void> {
  const userId = await currentUserId()
  const { error } = await supabase.from('food_logs').insert({
    user_id: userId,
    food_id: params.foodId,
    log_date: params.date,
    meal: params.meal,
    servings: params.servings,
  })
  if (error) throw new Error(error.message)
}

export async function updateLogServings(id: string, servings: number): Promise<void> {
  const { error } = await supabase.from('food_logs').update({ servings }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteFoodLog(id: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteFood(id: string): Promise<void> {
  const { error } = await supabase.from('foods').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
