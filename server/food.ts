import type { Food, FoodPortion, FoodSearchItem, Nutrition } from '../src/domain/types';
import { type Env, now, ServiceError } from './types';

type CommunityFoodRow = {
  id: string;
  creator_account_id: string | null;
  name: string;
  brand: string | null;
  serving_label: string;
  serving_grams: number;
  nutrition: string;
  created_at: number;
  updated_at: number;
};

export type CommunityFoodInput = {
  name?: unknown;
  brand?: unknown;
  servingLabel?: unknown;
  servingGrams?: unknown;
  calories?: unknown;
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
};

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
  env.OPEN_FOOD_FACTS_USER_AGENT || 'Growth/1.0 (https://growth-journal.com)';

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
  return !!(
    (env.FATSECRET_PROXY_URL && env.FATSECRET_PROXY_SECRET) ||
    (env.FATSECRET_CLIENT_ID && env.FATSECRET_CLIENT_SECRET)
  );
}

export function mapFatSecretSearchFoods(foods: FatSecretSearchFood[]): FoodSearchItem[] {
  return foods.map((food) => ({
    id: `fs:${food.food_id}`,
    name: food.food_name,
    brand: food.brand_name,
  }));
}

const cleanText = (value: unknown, label: string, maximum: number, required = true) => {
  if (typeof value !== 'string') throw new ServiceError(`Enter a valid ${label}.`);
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if ((required && !cleaned) || cleaned.length > maximum)
    throw new ServiceError(`Enter a ${label} up to ${maximum} characters.`);
  return cleaned;
};

const requiredNumber = (value: unknown, label: string, maximum: number, allowZero = true) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < (allowZero ? 0 : Number.EPSILON) || parsed > maximum)
    throw new ServiceError(`Enter a valid ${label}.`);
  return parsed;
};

function communityFood(row: CommunityFoodRow): Food {
  const servingNutrition = JSON.parse(row.nutrition) as Nutrition;
  const per100g = Object.fromEntries(
    Object.entries(servingNutrition).map(([key, value]) => [
      key,
      value === null ? null : (value / row.serving_grams) * 100,
    ]),
  ) as Nutrition;
  return {
    id: `community:${row.id}`,
    name: row.name,
    brand: row.brand || undefined,
    per100g,
    portions: [
      { id: 'grams', label: '1 gram', grams: 1 },
      {
        id: 'serving',
        label: row.serving_label,
        grams: row.serving_grams,
        nutrition: servingNutrition,
      },
    ],
    defaultPortionId: 'serving',
  };
}

export async function createCommunityFood(
  input: CommunityFoodInput,
  accountId: string,
  env: Env,
) {
  const name = cleanText(input.name, 'food name', 120);
  const brand = cleanText(input.brand ?? '', 'brand', 80, false);
  const servingLabel = cleanText(input.servingLabel, 'serving description', 80);
  const servingGrams = requiredNumber(input.servingGrams, 'serving weight', 100_000, false);
  const nutrition: Nutrition = {
    calories: requiredNumber(input.calories, 'calories', 100_000),
    protein: requiredNumber(input.protein, 'protein', 10_000),
    carbs: requiredNumber(input.carbs, 'carbohydrates', 10_000),
    fat: requiredNumber(input.fat, 'fat', 10_000),
  };
  const id = crypto.randomUUID();
  const timestamp = now();
  await env.DB.prepare(
    `INSERT INTO community_foods
      (id,creator_account_id,name,brand,serving_label,serving_grams,nutrition,search_text,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      id,
      accountId,
      name,
      brand || null,
      servingLabel,
      servingGrams,
      JSON.stringify(nutrition),
      `${name} ${brand}`.toLocaleLowerCase(),
      timestamp,
      timestamp,
    )
    .run();
  return communityFood({
    id,
    creator_account_id: accountId,
    name,
    brand: brand || null,
    serving_label: servingLabel,
    serving_grams: servingGrams,
    nutrition: JSON.stringify(nutrition),
    created_at: timestamp,
    updated_at: timestamp,
  });
}

export async function communityFoodsForAccount(accountId: string, env: Env) {
  const result = await env.DB.prepare(
    'SELECT * FROM community_foods WHERE creator_account_id=? ORDER BY updated_at DESC LIMIT 200',
  )
    .bind(accountId)
    .all<CommunityFoodRow>();
  return result.results.map(communityFood);
}

export async function deleteCommunityFood(id: string, accountId: string, env: Env) {
  const result = await env.DB.prepare(
    'DELETE FROM community_foods WHERE id=? AND creator_account_id=?',
  )
    .bind(id, accountId)
    .run();
  if (!result.meta.changes) throw new ServiceError('Food not found.', 404);
}

async function communitySearch(query: string, accountId: string | null, env: Env) {
  const pattern = `%${query.toLocaleLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
  const result = await env.DB.prepare(
    // Creator ownership affects ranking only; every matching contribution remains public.
    `SELECT * FROM community_foods
     WHERE search_text LIKE ? ESCAPE '\\'
     ORDER BY CASE WHEN creator_account_id=? THEN 0 ELSE 1 END, updated_at DESC
     LIMIT 10`,
  )
    .bind(pattern, accountId ?? '')
    .all<CommunityFoodRow>();
  return result.results.map((row) => ({
    id: `community:${row.id}`,
    name: row.name,
    brand: row.brand || undefined,
    source: 'community' as const,
    createdByYou: !!accountId && row.creator_account_id === accountId,
  }));
}

function searchRelevance(food: FoodSearchItem, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  const name = food.name.trim().toLocaleLowerCase();
  const combined = `${name} ${food.brand ?? ''}`.trim().toLocaleLowerCase();
  if (name === needle) return 0;
  if (name.startsWith(needle)) return 1;
  if (name.split(/\s+/).some((word) => word.startsWith(needle))) return 2;
  if (combined.includes(needle)) return 3;
  return 4;
}

function mergeFoodSearch(
  community: FoodSearchItem[],
  provider: FoodSearchItem[],
  query: string,
) {
  const createdByYou = community.filter((food) => food.createdByYou);
  const publicMatches = [...provider, ...community.filter((food) => !food.createdByYou)];
  // Stable relevance sorting keeps provider order and prevents another user's food from being promoted.
  publicMatches.sort((left, right) => searchRelevance(left, query) - searchRelevance(right, query));
  return [...createdByYou, ...publicMatches];
}

async function accessToken(env: Env, force = false) {
  if (!env.FATSECRET_CLIENT_ID || !env.FATSECRET_CLIENT_SECRET)
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
    const viaProxy = !!(env.FATSECRET_PROXY_URL && env.FATSECRET_PROXY_SECRET);
    const url = new URL(path, viaProxy ? env.FATSECRET_PROXY_URL : 'https://platform.fatsecret.com');
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set('format', 'json');
    return fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: viaProxy
          ? `Bearer ${env.FATSECRET_PROXY_SECRET}`
          : `Bearer ${await accessToken(env, forceToken)}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
  };
  const requestWithRetry = async (forceToken = false) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await request(forceToken);
        if (response.status < 500 || attempt === 1) return response;
      } catch (error) {
        lastError = error;
        if (attempt === 1) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new ServiceError(
      lastError instanceof Error && lastError.name === 'TimeoutError'
        ? 'Food search timed out. Please try again.'
        : 'Food search is temporarily unavailable. Please try again.',
      502,
    );
  };
  let response = await requestWithRetry();
  if (response.status === 401) {
    fatSecretToken = null;
    response = await requestWithRetry(true);
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

export async function searchFoods(query: string, page: number, env: Env, accountId: string | null) {
  // Community matches augment FatSecret instead of changing its cached data or result order.
  const community = page === 1 ? await communitySearch(query, accountId, env) : [];
  const provider = await cached(`search:fatsecret:v1:${page}:${query}`, env, async () => {
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
  return { foods: mergeFoodSearch(community, provider.foods, query), hasMore: provider.hasMore };
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
  if (id.startsWith('community:')) {
    const communityId = id.slice('community:'.length);
    if (!/^[0-9a-f-]{36}$/i.test(communityId))
      throw new ServiceError('This community food is no longer available.', 404);
    return env.DB.prepare('SELECT * FROM community_foods WHERE id=?')
      .bind(communityId)
      .first<CommunityFoodRow>()
      .then((row) => {
        if (!row) throw new ServiceError('This community food is no longer available.', 404);
        return communityFood(row);
      });
  }
  throw new ServiceError('This food is no longer available. Please search again.', 404);
}
