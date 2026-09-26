import type { Food, FoodPortion, FoodSearchItem, Nutrition } from '../src/domain/types';
import { type Env, now, ServiceError } from './types';

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  brands?: string | string[];
  nutriments?: Record<string, unknown>;
  serving_size?: string;
  serving_quantity?: number | string;
};

type FatSecretSearchFood = {
  food_id: string;
  food_name: string;
  brand_name?: string;
  food_type?: string;
  food_url?: string;
  food_description?: string;
};

type FatSecretServing = {
  serving_id: string;
  serving_description: string;
  metric_serving_amount?: string | number;
  metric_serving_unit?: string;
  is_default?: string | number;
  calories?: string | number;
  carbohydrate?: string | number;
  protein?: string | number;
  fat?: string | number;
};

type FatSecretFood = FatSecretSearchFood & {
  servings?: { serving?: FatSecretServing | FatSecretServing[] };
};

const numeric = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function numberValue(value: unknown) {
  if (numeric(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return numeric(parsed) ? parsed : null;
}

function asArray<T>(value?: T | T[]): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function brandName(brands: OpenFoodFactsProduct['brands']) {
  return Array.isArray(brands) ? brands.filter(Boolean).join(', ') : brands?.trim() || undefined;
}

function servingNutrition(serving: FatSecretServing): Nutrition {
  return {
    calories: numberValue(serving.calories) ?? 0,
    protein: numberValue(serving.protein) ?? 0,
    carbs: numberValue(serving.carbohydrate) ?? 0,
    fat: numberValue(serving.fat) ?? 0,
  };
}

function servingGrams(serving: FatSecretServing) {
  const amount = numberValue(serving.metric_serving_amount);
  if (!amount) return 0;
  if (serving.metric_serving_unit === 'g') return amount;
  if (serving.metric_serving_unit === 'oz') return amount * 28.349523125;
  return 0;
}

export function normalizeFatSecretFood(raw: FatSecretFood): Food {
  const servings = asArray(raw.servings?.serving);
  if (!servings.length)
    throw new ServiceError('This food does not have serving information.', 404);
  const portions: FoodPortion[] = servings.map((serving) => ({
    id: `fs-serving:${serving.serving_id}`,
    label: serving.serving_description,
    grams: servingGrams(serving),
    nutrition: servingNutrition(serving),
  }));
  const base = servings.find((serving) => servingGrams(serving) > 0);
  const grams = base ? servingGrams(base) : 0;
  const nutrition = base ? servingNutrition(base) : { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const per100g = Object.fromEntries(
    Object.entries(nutrition).map(([key, value]) => [key, grams ? (value! / grams) * 100 : 0]),
  ) as Nutrition;
  const defaultServing = servings.find((serving) => Number(serving.is_default) === 1) ?? servings[0];
  return {
    id: `fs:${raw.food_id}`,
    name: raw.food_name,
    brand: raw.brand_name,
    per100g,
    portions,
    defaultPortionId: `fs-serving:${defaultServing.serving_id}`,
  };
}

// Open Food Facts remains the barcode provider and reports nutrition per 100 g.
export function normalizeOpenFoodFacts(raw: OpenFoodFactsProduct): Food {
  const nutriments = raw.nutriments ?? {};
  const per100g: Nutrition = {
    calories: numberValue(nutriments['energy-kcal_100g']) ?? 0,
    protein: numberValue(nutriments.proteins_100g) ?? 0,
    carbs: numberValue(nutriments.carbohydrates_100g) ?? 0,
    fat: numberValue(nutriments.fat_100g) ?? 0,
  };
  const portions: FoodPortion[] = [{ id: 'grams', label: '1 gram', grams: 1 }];
  const servingGrams = numberValue(raw.serving_quantity);
  if (servingGrams && servingGrams > 0) {
    portions.push({
      id: 'serving',
      label: raw.serving_size?.trim() || '1 serving',
      grams: servingGrams,
    });
  }
  return {
    id: `off:${raw.code ?? ''}`,
    name: raw.product_name?.trim() || 'Unnamed food',
    brand: brandName(raw.brands),
    per100g,
    portions,
    defaultPortionId: portions.length > 1 ? 'serving' : 'grams',
  };
}

const openFoodFactsFields =
  'code,product_name,brands,nutriments,serving_size,serving_quantity';
const openFoodFactsUserAgent = (env: Env) =>
  env.OPEN_FOOD_FACTS_USER_AGENT || 'Growth/1.0 (https://growth-journal.tlegeneral.workers.dev)';

async function openFoodFacts(url: URL, env: Env) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': openFoodFactsUserAgent(env) },
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 429)
    throw new ServiceError(
      'Barcode lookup has reached its request limit. Please try again later.',
      429,
      60,
    );
  if (response.status === 404)
    throw new ServiceError('No food was found for that barcode.', 404);
  if (!response.ok)
    throw new ServiceError('Barcode lookup is temporarily unavailable. Please try again.', 502);
  return response.json();
}

let fatSecretToken: { value: string; expiresAt: number } | null = null;

export function fatSecretConfigured(env: Env) {
  return !!(env.FATSECRET_CLIENT_ID && env.FATSECRET_CLIENT_SECRET);
}

export function mapFatSecretSearchFoods(foods: FatSecretSearchFood[]): FoodSearchItem[] {
  return foods.map((food) => ({
    id: `fs:${food.food_id}`,
    name: food.food_name,
    brand: food.brand_name,
  }));
}

async function accessToken(env: Env, force = false) {
  if (!fatSecretConfigured(env))
    throw new ServiceError('Food search is not configured.', 503);
  if (!force && fatSecretToken && fatSecretToken.expiresAt > now() + 60)
    return fatSecretToken.value;
  const credentials = btoa(`${env.FATSECRET_CLIENT_ID}:${env.FATSECRET_CLIENT_SECRET}`);
  const response = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'basic' }),
    signal: AbortSignal.timeout(15_000),
  });
  const result = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!response.ok || !result.access_token)
    throw new ServiceError('Food search authentication failed.', 502);
  fatSecretToken = {
    value: result.access_token,
    expiresAt: now() + Math.max(60, Number(result.expires_in) || 3600),
  };
  return fatSecretToken.value;
}

async function fatSecretGet<T>(path: string, params: Record<string, string>, env: Env): Promise<T> {
  const request = async (forceToken = false) => {
    const url = new URL(`https://platform.fatsecret.com${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set('format', 'json');
    return fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${await accessToken(env, forceToken)}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
  };
  let response = await request();
  if (response.status === 401) {
    fatSecretToken = null;
    response = await request(true);
  }
  if (response.status === 429)
    throw new ServiceError(
      'Food search has reached its request limit. Please try again later.',
      429,
      60,
    );
  const result = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!response.ok || result.error)
    throw new ServiceError(
      result.error?.message || 'Food search is temporarily unavailable. Please try again.',
      502,
    );
  return result;
}

async function cached<T>(key: string, env: Env, load: () => Promise<T>): Promise<T> {
  const cache = await env.DB.prepare(
    'SELECT data FROM food_cache WHERE cache_key = ? AND expires_at > ?',
  )
    .bind(key, now())
    .first<{ data: string }>();
  if (cache) return JSON.parse(cache.data) as T;
  const data = await load();
  await env.DB.prepare(
    'INSERT INTO food_cache (cache_key, data, expires_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET data=excluded.data, expires_at=excluded.expires_at',
  )
    .bind(key, JSON.stringify(data), now() + 86400)
    .run();
  return data;
}

export function searchFoods(query: string, page: number, env: Env) {
  return cached(`search:fatsecret:v1:${page}:${query}`, env, async () => {
    const result = await fatSecretGet<{
      foods?: {
        food?: FatSecretSearchFood | FatSecretSearchFood[];
        max_results?: string | number;
        total_results?: string | number;
        page_number?: string | number;
      };
    }>(
      '/rest/foods/search/v1',
      { search_expression: query, page_number: String(page - 1), max_results: '10' },
      env,
    );
    const foods = asArray(result.foods?.food);
    const total = Number(result.foods?.total_results ?? foods.length);
    const maxResults = Number(result.foods?.max_results ?? 10);
    const pageNumber = Number(result.foods?.page_number ?? page - 1);
    return {
      // Preserve FatSecret's rows, names, duplicates, and relevance order exactly.
      foods: mapFatSecretSearchFoods(foods),
      hasMore: (pageNumber + 1) * maxResults < total,
    };
  });
}

async function fatSecretFoodDetail(id: string, env: Env) {
  const foodId = id.slice('fs:'.length);
  if (!/^\d+$/.test(foodId))
    throw new ServiceError('This food is no longer available. Please search again.', 404);
  return cached(`food-detail:fatsecret:v2:${foodId}`, env, async () => {
    const result = await fatSecretGet<{ food?: FatSecretFood }>(
      '/rest/food/v2',
      { food_id: foodId },
      env,
    );
    if (!result.food?.food_id)
      throw new ServiceError('This food is no longer available. Please search again.', 404);
    return normalizeFatSecretFood(result.food);
  });
}

async function openFoodFactsBarcodeDetail(id: string, env: Env) {
  const code = id.slice('off:'.length);
  if (!/^\d+$/.test(code)) throw new ServiceError('No food was found for that barcode.', 404);
  return cached(`food-detail:off:v4:${code}`, env, async () => {
    const url = new URL(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
    );
    url.searchParams.set('fields', openFoodFactsFields);
    const result = (await openFoodFacts(url, env)) as {
      status?: number;
      product?: OpenFoodFactsProduct;
    };
    if (result.status !== 1 || !result.product?.code)
      throw new ServiceError('No food was found for that barcode.', 404);
    return normalizeOpenFoodFacts(result.product);
  });
}

export function foodDetail(id: string, env: Env) {
  if (id.startsWith('fs:')) return fatSecretFoodDetail(id, env);
  if (id.startsWith('off:')) return openFoodFactsBarcodeDetail(id, env);
  throw new ServiceError('This food is no longer available. Please search again.', 404);
}
