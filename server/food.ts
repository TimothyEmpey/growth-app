import type { Food, FoodPortion, FoodSearchItem, Nutrition } from '../src/domain/types';
import { type Env, now, ServiceError } from './types';

type Nutrient = {
  nutrient?: { id: number; unitName?: string };
  nutrientId?: number;
  amount?: number;
  value?: number;
};
type USDAFood = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  foodNutrients?: Nutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  labelNutrients?: Record<string, { value?: number }>;
  foodPortions?: {
    id?: number;
    amount?: number;
    gramWeight?: number;
    modifier?: string;
    portionDescription?: string;
    measureUnit?: { name: string };
  }[];
};
const numeric = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
// Convert USDA records to per-100g nutrition and portions with known gram equivalents.
export function normalizeFood(raw: USDAFood): Food {
  const nutrients = raw.foodNutrients ?? [];
  const get = (...ids: number[]) => {
    for (const id of ids) {
      const nutrient = nutrients.find(
        (n) => (n.nutrient?.id ?? n.nutrientId) === id && numeric(n.amount ?? n.value),
      );
      if (nutrient) return (nutrient.amount ?? nutrient.value)!;
    }
    return null;
  };
  const per100g: Nutrition = {
    calories: get(1008, 2048, 2047),
    protein: get(1003),
    carbs: get(1005),
    fat: get(1004),
  };
  const portions: FoodPortion[] = [{ id: 'grams', label: '1 gram', grams: 1 }];
  const unit = raw.servingSizeUnit?.toLowerCase();
  // Volume servings need a supplied gram weight; no density is inferred for ml or fluid ounces.
  const factor = unit === 'g' || unit === 'grm' ? 1 : unit === 'oz' ? 28.349523125 : 0;
  if (numeric(raw.servingSize) && raw.servingSize > 0 && factor) {
    const grams = raw.servingSize * factor;
    portions.push({
      id: 'serving',
      label: `${raw.householdServingFullText || '1 serving'} (${Number(grams.toFixed(2))} g)`,
      grams,
    });
    for (const [key, label] of [
      ['calories', 'calories'],
      ['protein', 'protein'],
      ['carbs', 'carbohydrates'],
      ['fat', 'fat'],
    ] as const) {
      const value = raw.labelNutrients?.[label]?.value;
      if (per100g[key] === null && numeric(value)) per100g[key] = (value * 100) / grams;
    }
  }
  for (const [index, portion] of (raw.foodPortions ?? []).entries()) {
    if (!numeric(portion.gramWeight) || portion.gramWeight <= 0) continue;
    const measure = portion.measureUnit?.name !== 'undetermined' ? portion.measureUnit?.name : '';
    const label =
      portion.portionDescription ||
      `${portion.amount ?? 1} ${measure || portion.modifier || 'portion'}${measure && portion.modifier ? `, ${portion.modifier}` : ''}`;
    portions.push({
      id: `portion-${portion.id ?? index}`,
      label: `${label} (${portion.gramWeight} g)`,
      grams: portion.gramWeight,
    });
  }
  return {
    id: String(raw.fdcId),
    name: raw.description,
    brand: raw.brandName ?? raw.brandOwner,
    per100g,
    portions,
  };
}
export function hasMacroData(raw: USDAFood) {
  const { protein, carbs, fat } = normalizeFood(raw).per100g;
  return [protein, carbs, fat].some((value) => value !== null);
}
function searchTerms(query: string) {
  return [...new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];
}
export function searchTermScore(raw: USDAFood, query: string) {
  const terms = searchTerms(query);
  const searchable = [raw.description, raw.brandName, raw.brandOwner]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  return terms.filter((term) => searchable.includes(term)).length;
}
export function matchesSearchTerms(raw: USDAFood, query: string) {
  const terms = searchTerms(query);
  return searchTermScore(raw, query) >= Math.ceil(terms.length / 2);
}
export async function usda(path: string, env: Env) {
  if (!env.USDA_API_KEY)
    throw new ServiceError(
      'Food search is ready to configure. Add a USDA FoodData Central API key using the setup guide.',
      503,
    );
  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/${path}${path.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(env.USDA_API_KEY)}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (response.status === 429)
    throw new ServiceError(
      'Food search has reached its request limit. You can still use your recent foods. Please try again later.',
      429,
      3600,
    );
  if (response.status === 404)
    throw new ServiceError('This food is no longer available. Please search again.', 404);
  if (!response.ok)
    throw new ServiceError('Food search is temporarily unavailable. Please try again.', 502);
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
  return cached(`search:v6:${query.toLowerCase()}:${page}`, env, async () => {
    const searchPath = `foods/search?query=${encodeURIComponent(query)}&pageSize=20&pageNumber=${page}`;
    const [all, nutritionComplete] = (await Promise.all([
      usda(searchPath, env),
      usda(
        `${searchPath}&dataType=${encodeURIComponent('Foundation,Survey (FNDDS),SR Legacy')}`,
        env,
      ),
    ])) as { foods: USDAFood[]; totalPages: number }[];
    const summaries = [
      ...new Map(
        [...all.foods, ...nutritionComplete.foods].map((food) => [food.fdcId, food]),
      ).values(),
    ];
    const batches = Array.from({ length: Math.ceil(summaries.length / 20) }, (_, index) =>
      summaries.slice(index * 20, index * 20 + 20).map((food) => food.fdcId),
    );
    const detailed = (
      await Promise.all(
        batches.map(
          async (ids) =>
            (await usda(`foods?fdcIds=${encodeURIComponent(ids.join(','))}`, env)) as USDAFood[],
        ),
      )
    ).flat();
    const minimumTermMatches = Math.ceil(searchTerms(query).length / 2);
    return {
      foods: detailed
        .map((food) => ({ food, score: searchTermScore(food, query) }))
        .filter(({ food, score }) => hasMacroData(food) && score >= minimumTermMatches)
        .sort((a, b) => b.score - a.score)
        .map(({ food }): FoodSearchItem => ({
          id: String(food.fdcId),
          name: food.description,
          brand: food.brandName ?? food.brandOwner,
        }))
        .slice(0, 20),
      hasMore: all.totalPages > page || nutritionComplete.totalPages > page,
    };
  });
}
export function foodDetail(id: string, env: Env) {
  return cached(`food:${id}`, env, async () =>
    normalizeFood((await usda(`food/${id}`, env)) as USDAFood),
  );
}
