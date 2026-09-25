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

const numeric = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function numberValue(value: unknown) {
  if (numeric(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return numeric(parsed) ? parsed : null;
}

function brandName(brands: OpenFoodFactsProduct['brands']) {
  return Array.isArray(brands) ? brands.filter(Boolean).join(', ') : brands?.trim() || undefined;
}

function normalizedName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function uniqueFoodNames<T extends { product_name?: string }>(foods: T[]) {
  const seen = new Set<string>();
  return foods.filter((food) => {
    const name = food.product_name && normalizedName(food.product_name);
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

// Open Food Facts normalizes these fields to a consistent per-100g basis.
export function normalizeFood(raw: OpenFoodFactsProduct): Food {
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
      // Keep the label exactly as it appears in the source; grams are only for math.
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
  };
}

export function hasMacroData(raw: OpenFoodFactsProduct) {
  const nutriments = raw.nutriments ?? {};
  return [nutriments.proteins_100g, nutriments.carbohydrates_100g, nutriments.fat_100g].some(
    (value) => numberValue(value) !== null,
  );
}

const fields = 'code,product_name,brands,nutriments,serving_size,serving_quantity';
const userAgent = (env: Env) =>
  env.OPEN_FOOD_FACTS_USER_AGENT || 'Growth/1.0 (https://growth-journal.tlegeneral.workers.dev)';

async function openFoodFacts(url: URL, env: Env, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', 'User-Agent': userAgent(env), ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 429)
    throw new ServiceError(
      'Food search has reached its request limit. You can still use your recent foods. Please try again later.',
      429,
      60,
    );
  if (response.status === 404) throw new ServiceError('This food is no longer available. Please search again.', 404);
  if (!response.ok) throw new ServiceError('Food search is temporarily unavailable. Please try again.', 502);
  return response.json();
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
  return cached(`search:off:v3:${query.toLowerCase()}`, env, async () => {
    const url = new URL('https://search.openfoodfacts.org/search');
    const result = (await openFoodFacts(url, env, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: query,
        page: 1,
        // A wider candidate set lets us omit missing-macro and duplicate-name results.
        page_size: 50,
        fields: fields.split(','),
        langs: ['en'],
        // Exact multi-word matches are promoted ahead of looser token matches.
        boost_phrase: true,
      }),
    })) as { hits?: OpenFoodFactsProduct[] };
    const foods = uniqueFoodNames(
      (result.hits ?? []).filter(
        (food) => Boolean(food.code && food.product_name) && hasMacroData(food),
      ),
    ).slice(0, 10);
    return {
      foods: foods.map((food): FoodSearchItem => ({
        id: `off:${food.code}`,
        name: food.product_name!,
        brand: brandName(food.brands),
      })),
      hasMore: false,
    };
  });
}

export function foodDetail(id: string, env: Env) {
  // Search hits are intentionally never reused here: detail records carry servings.
  return cached(`food-detail:${id}`, env, async () => {
    const code = id.startsWith('off:') ? id.slice('off:'.length) : '';
    if (!/^\d+$/.test(code)) throw new ServiceError('This food is no longer available. Please search again.', 404);
    const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    url.searchParams.set('fields', fields);
    const result = (await openFoodFacts(url, env)) as { status?: number; product?: OpenFoodFactsProduct };
    if (result.status !== 1 || !result.product?.code) throw new ServiceError('This food is no longer available. Please search again.', 404);
    if (!hasMacroData(result.product)) throw new ServiceError('This food does not have nutrition data.', 404);
    return normalizeFood(result.product);
  });
}
