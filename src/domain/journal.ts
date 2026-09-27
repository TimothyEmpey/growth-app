import { defaultPreferences, emptyProfile, normalizePreferences } from './account';
import type {
  DateKey,
  Exercise,
  Food,
  Journal,
  LiftRecord,
  Nutrition,
  Period,
  RepCount,
  RepFilter,
  WeightEntry,
} from './types';

export const nutritionKeys = ['calories', 'protein', 'carbs', 'fat'] as const;
export const emptyNutrition = (): Nutrition => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
export function formatFoodLabel(value: string) {
  const letters = value.match(/\p{L}/gu);
  if (!letters?.length || letters.some((letter) => letter !== letter.toLocaleUpperCase()))
    return value;
  return value.toLocaleLowerCase().replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase());
}
export function today(date = new Date()): DateKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseDate(value: DateKey): Date {
  // Construct local noon explicitly; parsing YYYY-MM-DD directly would interpret it as UTC.
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function shiftDay(value: DateKey, days: number): DateKey {
  const d = parseDate(value);
  d.setDate(d.getDate() + days);
  return today(d);
}
export function periodStart(period: Period, end = today()): DateKey {
  // Rolling calendar-day windows include the selected end date.
  return period === 'All'
    ? '0001-01-01'
    : shiftDay(end, -({ Week: 7, Month: 30, Year: 365 }[period] - 1));
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    today(parseDate(value)) === value &&
    value <= today() &&
    value >= '1900-01-01'
  );
}
export function positive(value: string | number): number {
  const parsed = typeof value === 'string' ? Number(value.trim()) : value;
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('Enter a number greater than zero.');
  return parsed;
}
export function positiveAtMost(value: string | number, max: number, label = 'number'): number {
  const parsed = positive(value);
  if (parsed > max) throw new Error(`Enter a ${label} no greater than ${max}.`);
  return parsed;
}
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  return parseDate(date.slice(0, 10)).toLocaleDateString('en-US', options);
}
export function formatServingAmount(quantity: number, label: string): string {
  const concise = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const match = concise.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (!match) return `${quantity} ${concise}`;
  const amount = Number((quantity * Number(match[1])).toFixed(2));
  let description = match[2];
  if (amount !== 1 && /^(gram|ounce|cup|tablespoon|teaspoon)$/i.test(description))
    description += 's';
  return `${amount} ${description}`;
}
export function withOunceFallback(food: Food): Food {
  if (food.portions.length !== 1 || food.portions[0].id !== 'grams') return food;
  return {
    ...food,
    portions: [...food.portions, { id: 'ounce', label: '1 ounce (28.35 g)', grams: 28.349523125 }],
  };
}
export function pace(seconds: number, meters: number, units: 'us' | 'metric' = 'us'): string {
  if (meters <= 0 || seconds <= 0) return '—';
  const sec = Math.round(seconds / (meters / (units === 'metric' ? 1000 : 1609.344)));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
export function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m ${Math.floor(seconds % 60)}s`;
}
// The newest performance date defines the current max, even when its weight is lower.
export function sortLifts(records: LiftRecord[]): LiftRecord[] {
  return [...records].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt || b.id.localeCompare(a.id),
  );
}
export const REP_COUNTS: RepCount[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export function liftReps(record: LiftRecord): RepCount {
  return REP_COUNTS.includes(record.reps as RepCount) ? (record.reps as RepCount) : 1;
}
export function exerciseRepFilter(exercise?: Exercise): RepFilter {
  const filter = exercise?.repFilter;
  return filter === 'all' || REP_COUNTS.includes(filter as RepCount) ? filter! : 1;
}
export function liftsForRep(records: LiftRecord[], filter: RepFilter): LiftRecord[] {
  return sortLifts(
    filter === 'all' ? records : records.filter((record) => liftReps(record) === filter),
  );
}
export function putWeight(weights: WeightEntry[], entry: WeightEntry): WeightEntry[] {
  if (!validDate(entry.date)) throw new Error('Choose a valid date, today or earlier.');
  positiveAtMost(entry.pounds, 1433, 'weight');
  // Replace both the edited record and any record occupying its new date.
  return [...weights.filter((w) => w.id !== entry.id && w.date !== entry.date), entry].sort(
    (a, b) => a.date.localeCompare(b.date),
  );
}
export function nutritionFor(food: Food, portionId: string, quantity: number): Nutrition {
  positive(quantity);
  const portion = food.portions.find((p) => p.id === portionId);
  if (!portion) throw new Error('Select a serving size.');
  if (portion.nutrition)
    return Object.fromEntries(
      nutritionKeys.map((key) => [key, (portion.nutrition![key] ?? 0) * quantity]),
    ) as Nutrition;
  if (!Number.isFinite(portion.grams) || portion.grams <= 0)
    throw new Error('Select a serving size.');
  // All portions have a known gram weight; preserve precision until the UI formats the result.
  const multiplier = (portion.grams * quantity) / 100;
  return Object.fromEntries(
    nutritionKeys.map((key) => [key, (food.per100g[key] ?? 0) * multiplier]),
  ) as Nutrition;
}
export function sumNutrition(items: Nutrition[]): Nutrition {
  const total = emptyNutrition();
  for (const item of items)
    for (const key of nutritionKeys) total[key] = (total[key] ?? 0) + (item[key] ?? 0);
  return total;
}
export function emptyJournal(): Journal {
  return {
    version: 1,
    weights: [],
    lifts: [],
    meals: [],
    foods: [],
    goals: { protein: 100, carbs: 100, fat: 100 },
    preferences: { ...defaultPreferences },
    profile: emptyProfile(),
    exercises: [
      { id: 'squat', name: 'Squat', repFilter: 1 },
      { id: 'bench', name: 'Bench press', repFilter: 1 },
      { id: 'deadlift', name: 'Deadlift', repFilter: 1 },
      { id: 'overhead', name: 'Overhead press', repFilter: 1 },
    ],
  };
}
export function migrateJournal(value: unknown): Journal {
  if (value === null || value === undefined) return emptyJournal();
  if (typeof value !== 'object' || !('version' in value) || value.version !== 1)
    throw new Error(
      'This journal uses an unsupported storage version. Your data has not been changed.',
    );
  const journal = value as Journal;
  if (
    !['weights', 'exercises', 'lifts', 'meals', 'foods'].every((key) =>
      Array.isArray(journal[key as keyof Journal]),
    ) ||
    !journal.goals ||
    typeof journal.goals !== 'object'
  )
    throw new Error('Your journal could not be read. Your stored data has not been changed.');
  return {
    ...journal,
    exercises: journal.exercises.map((exercise) => ({
      ...exercise,
      repFilter: exerciseRepFilter(exercise),
    })),
    lifts: journal.lifts.map((record) => ({ ...record, reps: liftReps(record) })),
    foods: journal.foods.map((food) => ({
      ...food,
      per100g: Object.fromEntries(
        nutritionKeys.map((key) => [key, food.per100g[key] ?? 0]),
      ) as Nutrition,
    })),
    meals: journal.meals.map((entry) => ({
      ...entry,
      food: {
        ...entry.food,
        per100g: Object.fromEntries(
          nutritionKeys.map((key) => [key, entry.food.per100g[key] ?? 0]),
        ) as Nutrition,
      },
      nutrition: Object.fromEntries(
        nutritionKeys.map((key) => [key, entry.nutrition[key] ?? 0]),
      ) as Nutrition,
    })),
    preferences: normalizePreferences(journal.preferences),
    profile: { ...emptyProfile(), ...journal.profile },
  };
}
