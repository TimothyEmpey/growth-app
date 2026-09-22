import { describe, expect, test } from 'bun:test';
import {
  emptyJournal,
  formatDate,
  migrateJournal,
  nutritionFor,
  pace,
  periodStart,
  positive,
  putWeight,
  shiftDay,
  sortLifts,
  sumNutrition,
  today,
  validDate,
} from '../src/domain/journal';
import type { Food } from '../src/domain/types';
import { hasMacroData, normalizeFood, searchTermScore } from '../server/food';

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
  test('latest dated max wins, with backdates and same-day corrections', () => {
    const records = [
      { id: 'old', exerciseId: 'bench', date: '2024-01-01', pounds: 250, createdAt: 4 },
      { id: 'new', exerciseId: 'bench', date: '2024-02-01', pounds: 225, createdAt: 2 },
      { id: 'tie', exerciseId: 'bench', date: '2024-02-01', pounds: 230, createdAt: 3 },
    ];
    expect(sortLifts(records).map((r) => r.id)).toEqual(['tie', 'new', 'old']);
    expect(sortLifts(records.filter((r) => r.id !== 'tie'))[0].pounds).toBe(225);
  });
  test('storage starts empty and refuses unsupported versions without overwriting', () => {
    expect(migrateJournal(null)).toEqual(emptyJournal());
    expect(migrateJournal(JSON.parse(JSON.stringify(emptyJournal()))).exercises).toHaveLength(4);
    expect(() => migrateJournal({ version: 2 })).toThrow('unsupported');
    expect(() => migrateJournal({ version: 1 })).toThrow('could not be read');
    expect(() => positive('')).toThrow();
    expect(() => positive(-1)).toThrow();
    expect(() => positive('Infinity')).toThrow();
  });
});
describe('nutrition calculations', () => {
  test('fractional portions and grams give consistent unrounded totals', () => {
    expect(nutritionFor(food, 'cup', 0.5)).toEqual(nutritionFor(food, 'grams', 40));
    expect(nutritionFor(food, 'cup', 0.5).calories).toBe(152);
    expect(() => nutritionFor(food, 'unknown', 1)).toThrow();
    expect(
      sumNutrition([nutritionFor(food, 'grams', 1), nutritionFor(food, 'grams', 1)]).calories,
    ).toBeCloseTo(7.6, 10);
  });
  test('unknown is distinct from zero, and historical values are snapshots', () => {
    const snapshot = nutritionFor(food, 'cup', 1);
    const changed = { ...food, per100g: { ...food.per100g, calories: 999 } };
    expect(snapshot.calories).toBe(304);
    expect(nutritionFor(changed, 'cup', 1).calories).not.toBe(snapshot.calories);
    expect(sumNutrition([snapshot, { calories: null, protein: 0, carbs: 0, fat: 0 }])).toEqual({
      calories: null,
      protein: 10.4,
      carbs: 54.400000000000006,
      fat: 5.6000000000000005,
    });
  });
  test('normalizes USDA details, known gram portions and branded label fallback', () => {
    const normalized = normalizeFood({
      fdcId: 1,
      description: 'Yogurt',
      servingSize: 150,
      servingSizeUnit: 'g',
      labelNutrients: { calories: { value: 120 }, protein: { value: 15 } },
      foodNutrients: [{ nutrient: { id: 1004 }, amount: 0 }],
      foodPortions: [{ id: 1, gramWeight: 200, amount: 1, measureUnit: { name: 'cup' } }],
    });
    expect(normalized.per100g).toEqual({ calories: 80, protein: 10, fat: 0, carbs: null });
    expect(normalized.portions.map((p) => p.grams)).toEqual([1, 150, 200]);
    const liquid = normalizeFood({
      fdcId: 2,
      description: 'Liquid',
      servingSize: 200,
      servingSizeUnit: 'ml',
      labelNutrients: { calories: { value: 100 } },
    });
    expect(liquid.portions).toHaveLength(1);
    expect(liquid.per100g.calories).toBeNull();
  });
  test('keeps USDA search results with recorded macros, including true zero-calorie foods', () => {
    expect(
      hasMacroData({
        fdcId: 1,
        description: 'Protein powder',
        foodNutrients: [
          { nutrientId: 1003, value: 20 },
          { nutrientId: 1004, value: 0 },
          { nutrientId: 1005, value: 0 },
        ],
      }),
    ).toBe(true);
    expect(
      hasMacroData({
        fdcId: 2,
        description: 'No macro data',
        foodNutrients: [
          { nutrientId: 1003, value: 0 },
          { nutrientId: 1004, value: 0 },
          { nutrientId: 1005, value: 0 },
        ],
      }),
    ).toBe(true);
    expect(hasMacroData({ fdcId: 3, description: 'Missing macros' })).toBe(false);
  });
  test('ranks food-search terms in any order and ignores punctuation', () => {
    const result = {
      fdcId: 1,
      description: 'Milk, whole, with vitamin D',
      brandName: 'Local Dairy',
    };
    expect(searchTermScore(result, 'whole milk')).toBe(2);
    expect(searchTermScore(result, 'skim milk')).toBe(1);
    expect(searchTermScore({ fdcId: 2, description: `DOMINO'S Cheese Pizza` }, 'dominos')).toBe(1);
  });
  test('pace is based on total time over distance', () => {
    expect(pace(1800, 1609.344 * 3)).toBe('10:00');
    expect(pace(1800, 0)).toBe('—');
    expect(pace(600 + 2400, 1609.344 * 5)).toBe('10:00');
  });
});
