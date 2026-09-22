import { defaultPreferences, emptyProfile, normalizePreferences } from './account';
import type { DateKey, Food, Journal, LiftRecord, Nutrition, Period, WeightEntry } from './types';

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
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  return parseDate(date.slice(0, 10)).toLocaleDateString('en-US', options);
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
export function putWeight(weights: WeightEntry[], entry: WeightEntry): WeightEntry[] {
  if (!validDate(entry.date)) throw new Error('Choose a valid date, today or earlier.');
  positive(entry.pounds);
  // Replace both the edited record and any record occupying its new date.
  return [...weights.filter((w) => w.id !== entry.id && w.date !== entry.date), entry].sort(
    (a, b) => a.date.localeCompare(b.date),
  );
}
export function nutritionFor(food: Food, portionId: string, quantity: number): Nutrition {
  positive(quantity);
  const portion = food.portions.find((p) => p.id === portionId);
  if (!portion || !Number.isFinite(portion.grams) || portion.grams <= 0)
    throw new Error('Select a serving size.');
  // All portions have a known gram weight; preserve precision until the UI formats the result.
  const multiplier = (portion.grams * quantity) / 100;
  return Object.fromEntries(
    nutritionKeys.map((key) => [
      key,
      food.per100g[key] === null ? null : food.per100g[key]! * multiplier,
    ]),
  ) as Nutrition;
}
export function sumNutrition(items: Nutrition[]): Nutrition {
  // An unknown nutrient makes that nutrient's total unknown, rather than understating it.
  const total = emptyNutrition();
  for (const item of items)
    for (const key of nutritionKeys)
      total[key] = total[key] === null || item[key] === null ? null : total[key]! + item[key]!;
  return total;
}
export function emptyJournal(): Journal {
  return {
    version: 1,
    weights: [],
    lifts: [],
    meals: [],
    foods: [],
    goals: {},
    preferences: { ...defaultPreferences },
    profile: emptyProfile(),
    exercises: [
      { id: 'squat', name: 'Squat' },
      { id: 'bench', name: 'Bench press' },
      { id: 'deadlift', name: 'Deadlift' },
      { id: 'overhead', name: 'Overhead press' },
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
    preferences: normalizePreferences(journal.preferences),
    profile: { ...emptyProfile(), ...journal.profile },
  };
}
