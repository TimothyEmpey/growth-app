import { describe, expect, test } from 'bun:test';
import {
  emptyJournal,
  exerciseRepFilter,
  formatFoodLabel,
  formatServingAmount,
  formatDate,
  migrateJournal,
  liftsForRep,
  nutritionFor,
  pace,
  periodStart,
  positive,
  positiveAtMost,
  putWeight,
  importHealthWeights,
  shiftDay,
  sortLifts,
  sumNutrition,
  today,
  validDate,
  withOunceFallback,
  weightsForChart,
} from '../src/domain/journal';
import { sanitizeNumericInput } from '../src/domain/input';
import type { Food } from '../src/domain/types';
import {
  mapFatSecretSearchFoods,
  normalizeFatSecretFood,
  normalizeOpenFoodFacts,
} from '../server/food';

const food: Food = {
  id: '123',
  name: 'Oats',
  per100g: { calories: 380, protein: 13, carbs: 68, fat: 7 },
  portions: [
    { id: 'grams', label: '1 gram', grams: 1 },
    { id: 'cup', label: '1 cup', grams: 80 },
  ],
};
describe('journal dates and records', () => {
  test('new journals start with 100 gram macro goals and no calorie goal', () => {
    expect(emptyJournal().goals).toEqual({ protein: 100, carbs: 100, fat: 100 });
  });

  test('calendar days survive leap days, month boundaries, and local parsing', () => {
    expect(shiftDay('2024-03-01', -1)).toBe('2024-02-29');
    expect(shiftDay('2024-12-31', 1)).toBe('2025-01-01');
    expect(validDate('2024-02-30')).toBe(false);
    expect(formatDate('2024-01-01')).toContain('Jan 1');
    expect(today(new Date(2024, 0, 1, 0, 1))).toBe('2024-01-01');
    expect(periodStart('Week', '2024-03-03')).toBe('2024-02-26');
    expect(periodStart('Month', '2024-03-01')).toBe('2024-02-01');
    expect(periodStart('Year', '2024-12-31')).toBe('2024-01-02');
    expect(periodStart('All')).toBe('0001-01-01');
  });
  test('one weigh-in per date, edits move dates without leaving stale entries', () => {
    let entries = putWeight([], { id: 'a', date: '2024-01-01', pounds: 180 });
    entries = putWeight(entries, { id: 'b', date: '2024-01-01', pounds: 179 });
    expect(entries).toHaveLength(1);
    expect(entries[0].pounds).toBe(179);
    entries = putWeight(entries, { id: 'b', date: '2024-01-02', pounds: 178 });
    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe('2024-01-02');
    expect(() => putWeight(entries, { id: 'c', date: '2999-01-01', pounds: 180 })).toThrow();
  });
  test('Apple Health imports the latest daily weight without replacing manual entries', () => {
    const existing = [{ id: 'manual', date: '2024-01-01', pounds: 180 }];
    const result = importHealthWeights(existing, [
      { id: 'apple-health:a', date: '2024-01-01', pounds: 179, timestamp: 1 },
      { id: 'apple-health:b', date: '2024-01-02', pounds: 178, timestamp: 2 },
      { id: 'apple-health:c', date: '2024-01-02', pounds: 177, timestamp: 3 },
    ]);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.weights).toEqual([
      existing[0],
      { id: 'apple-health:c', date: '2024-01-02', pounds: 177, timestamp: 3 },
    ]);
  });
  test('weight chart aggregation averages weeks, months, and years without changing entries', () => {
    const entries = [
      { id: 'first', date: '2024-01-01', pounds: 180 },
      { id: 'same-week', date: '2024-01-03', pounds: 178 },
      { id: 'next-week', date: '2024-01-08', pounds: 177 },
      { id: 'next-month', date: '2024-02-02', pounds: 176 },
      { id: 'next-year', date: '2025-01-02', pounds: 175 },
    ];
    expect(weightsForChart(entries, 'Week').map((entry) => entry.pounds)).toEqual([
      180, 178, 177, 176, 175,
    ]);
    expect(weightsForChart(entries, 'Month').map((entry) => entry.pounds)).toEqual([
      179, 177, 176, 175,
    ]);
    const yearlyView = weightsForChart(entries, 'Year');
    expect(yearlyView).toHaveLength(3);
    expect(yearlyView[0].pounds).toBeCloseTo(178.33, 2);
    expect(yearlyView.slice(1).map((entry) => entry.pounds)).toEqual([176, 175]);
    expect(weightsForChart(entries, 'All').map((entry) => entry.pounds)).toEqual([177.75, 175]);
    expect(entries[0]).toEqual({ id: 'first', date: '2024-01-01', pounds: 180 });
  });
  test('latest dated max wins, with backdates and same-day corrections', () => {
    const records = [
      { id: 'old', exerciseId: 'bench', date: '2024-01-01', pounds: 250, createdAt: 4 },
      { id: 'new', exerciseId: 'bench', date: '2024-02-01', pounds: 225, createdAt: 2 },
      { id: 'tie', exerciseId: 'bench', date: '2024-02-01', pounds: 230, createdAt: 3 },
    ];
    expect(sortLifts(records).map((r) => r.id)).toEqual(['tie', 'new', 'old']);
    expect(sortLifts(records.filter((r) => r.id !== 'tie'))[0].pounds).toBe(225);
  });
  test('rep maxes migrate safely and filter each exercise history independently', () => {
    const legacy = emptyJournal();
    delete legacy.exercises[0].repFilter;
    legacy.lifts.push({
      id: 'legacy',
      exerciseId: 'squat',
      date: '2024-01-01',
      pounds: 300,
      createdAt: 1,
    });
    legacy.lifts.push({
      id: 'five',
      exerciseId: 'squat',
      date: '2024-02-01',
      pounds: 250,
      createdAt: 2,
      reps: 5,
    });
    const migrated = migrateJournal(JSON.parse(JSON.stringify(legacy)));
    expect(exerciseRepFilter(migrated.exercises[0])).toBe(1);
    expect(migrated.lifts.find((record) => record.id === 'legacy')?.reps).toBe(1);
    expect(liftsForRep(migrated.lifts, 1).map((record) => record.id)).toEqual(['legacy']);
    expect(liftsForRep(migrated.lifts, 5).map((record) => record.id)).toEqual(['five']);
    expect(liftsForRep(migrated.lifts, 'all').map((record) => record.id)).toEqual([
      'five',
      'legacy',
    ]);
  });
  test('storage starts empty and refuses unsupported versions without overwriting', () => {
    expect(migrateJournal(null)).toEqual(emptyJournal());
    expect(migrateJournal(JSON.parse(JSON.stringify(emptyJournal()))).exercises).toHaveLength(4);
    expect(() => migrateJournal({ version: 2 })).toThrow('unsupported');
    expect(() => migrateJournal({ version: 1 })).toThrow('could not be read');
    expect(() => positive('')).toThrow();
    expect(() => positive(-1)).toThrow();
    expect(() => positive('Infinity')).toThrow();
    expect(positiveAtMost('5000', 5000, 'weight')).toBe(5000);
    expect(() => positiveAtMost('5001', 5000, 'weight')).toThrow('no greater than 5000');
  });

  test('numeric input removes invalid characters and refuses oversized values', () => {
    expect(sanitizeNumericInput('12lb.34', 100, 1)).toBe('12.3');
    expect(sanitizeNumericInput('72,5', 300, 1)).toBe('72.5');
    expect(sanitizeNumericInput('1.2.3', 100, 2)).toBe('1.23');
    expect(sanitizeNumericInput('00a123', 999999, 0)).toBe('00123');
    expect(sanitizeNumericInput('501', 500, 0)).toBeNull();
    expect(sanitizeNumericInput('letters', 500, 0)).toBe('');
  });
});
describe('nutrition calculations', () => {
  test('condenses serving quantities into readable portions', () => {
    expect(formatServingAmount(1.5, '1 medium banana (118 g)')).toBe('1.5 medium banana');
    expect(formatServingAmount(100, '1 gram')).toBe('100 grams');
    expect(formatServingAmount(2, '0.5 cup (80 g)')).toBe('1 cup');
  });

  test('adds a calculated ounce only when grams are the sole native portion', () => {
    const gramOnly = { ...food, portions: [{ id: 'grams', label: '1 gram', grams: 1 }] };
    const prepared = withOunceFallback(gramOnly);
    expect(prepared.portions).toEqual([
      { id: 'grams', label: '1 gram', grams: 1 },
      { id: 'ounce', label: '1 ounce (28.35 g)', grams: 28.349523125 },
    ]);
    expect(nutritionFor(prepared, 'ounce', 1).calories).toBeCloseTo(107.728187875);
    expect(withOunceFallback(food)).toBe(food);
  });

  test('formats all-caps food labels without changing existing capitalization', () => {
    expect(formatFoodLabel(`DOMINO'S 14\" CHEESE PIZZA`)).toBe(`Domino's 14\" cheese pizza`);
    expect(formatFoodLabel('WHOLE MILK')).toBe('Whole milk');
    expect(formatFoodLabel('McDonald’s grilled chicken')).toBe('McDonald’s grilled chicken');
  });
  test('fractional portions and grams give consistent unrounded totals', () => {
    expect(nutritionFor(food, 'cup', 0.5)).toEqual(nutritionFor(food, 'grams', 40));
    expect(nutritionFor(food, 'cup', 0.5).calories).toBe(152);
    expect(() => nutritionFor(food, 'unknown', 1)).toThrow();
    expect(
      sumNutrition([nutritionFor(food, 'grams', 1), nutritionFor(food, 'grams', 1)]).calories,
    ).toBeCloseTo(7.6, 10);
  });
  test('missing values count as zero, and historical values are snapshots', () => {
    const snapshot = nutritionFor(food, 'cup', 1);
    const changed = { ...food, per100g: { ...food.per100g, calories: 999 } };
    expect(snapshot.calories).toBe(304);
    expect(nutritionFor(changed, 'cup', 1).calories).not.toBe(snapshot.calories);
    expect(sumNutrition([snapshot, { calories: null, protein: 0, carbs: 0, fat: 0 }])).toEqual({
      calories: 304,
      protein: 10.4,
      carbs: 54.400000000000006,
      fat: 5.6000000000000005,
    });
  });
  test('normalizes Open Food Facts barcode nutrition and a documented gram serving', () => {
    const normalized = normalizeOpenFoodFacts({
      code: '123',
      product_name: 'Yogurt',
      serving_size: '1 bottle',
      serving_quantity: '340',
      nutriments: { 'energy-kcal_100g': 80, proteins_100g: 10, fat_100g: 0 },
    });
    expect(normalized.per100g).toEqual({ calories: 80, protein: 10, fat: 0, carbs: 0 });
    expect(normalized.portions).toEqual([
      { id: 'grams', label: '1 gram', grams: 1 },
      { id: 'serving', label: '1 bottle', grams: 340 },
    ]);
    expect(normalized.id).toBe('off:123');
  });
  test('uses FatSecret servings and its flagged default without rewriting labels', () => {
    const normalized = normalizeFatSecretFood({
      food_id: '42',
      food_name: 'Protein Drink',
      brand_name: 'Example Brand',
      servings: {
        serving: [
          {
            serving_id: 'a',
            serving_description: '100 g',
            metric_serving_amount: '100',
            metric_serving_unit: 'g',
            calories: '50',
            protein: '10',
            carbohydrate: '2',
            fat: '1',
          },
          {
            serving_id: 'b',
            serving_description: '1 bottle',
            metric_serving_amount: '340',
            metric_serving_unit: 'g',
            is_default: '1',
            calories: '170',
            protein: '34',
            carbohydrate: '6.8',
            fat: '3.4',
          },
        ],
      },
    });
    expect(normalized.id).toBe('fs:42');
    expect(normalized.defaultPortionId).toBe('fs-serving:b');
    expect(normalized.portions.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'fs-serving:a', label: '100 g' },
      { id: 'fs-serving:b', label: '1 bottle' },
    ]);
    expect(nutritionFor(normalized, 'fs-serving:b', 1)).toEqual({
      calories: 170,
      protein: 34,
      carbs: 6.8,
      fat: 3.4,
    });
  });
  test('preserves FatSecret search order, names, brands, and duplicate names', () => {
    expect(
      mapFatSecretSearchFoods([
        { food_id: '7', food_name: 'EGG', brand_name: 'First Brand' },
        { food_id: '8', food_name: 'EGG', brand_name: 'Second Brand' },
        { food_id: '9', food_name: 'Egg, cooked' },
      ]),
    ).toEqual([
      { id: 'fs:7', name: 'EGG', brand: 'First Brand' },
      { id: 'fs:8', name: 'EGG', brand: 'Second Brand' },
      { id: 'fs:9', name: 'Egg, cooked', brand: undefined },
    ]);
  });
  test('pace is based on total time over distance', () => {
    expect(pace(1800, 1609.344 * 3)).toBe('10:00');
    expect(pace(1800, 0)).toBe('—');
    expect(pace(600 + 2400, 1609.344 * 5)).toBe('10:00');
  });
});
