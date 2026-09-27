import type { Period } from './types';
import { parseDate, shiftDay, today } from './journal';

export type Appearance = 'light' | 'dark' | 'system' | 'coffee' | 'aqua' | 'forest' | 'skinty';
export type Units = 'us' | 'metric';
export type Preferences = {
  appearance: Appearance;
  units: Units;
  defaultPeriod: Period;
  startPage: '/' | '/running' | '/diet' | '/account';
  runSource: 'strava' | 'appleHealth';
  appleHealthConnected: boolean;
};
export type Profile = {
  name: string;
  gender: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
};
export type Account = Profile & { id: string; email: string };
export const defaultPreferences: Preferences = {
  appearance: 'dark',
  units: 'us',
  defaultPeriod: 'Month',
  startPage: '/',
  runSource: 'strava',
  appleHealthConnected: false,
};
export const emptyProfile = (): Profile => ({
  name: '',
  gender: '',
  age: null,
  heightCm: null,
  weightKg: null,
});
export function normalizePreferences(value: Partial<Preferences> = {}): Preferences {
  return {
    appearance: ['light', 'dark', 'system', 'coffee', 'aqua', 'forest', 'skinty'].includes(
      value.appearance ?? '',
    )
      ? value.appearance!
      : 'dark',
    units: value.units === 'metric' ? 'metric' : 'us',
    defaultPeriod: ['Week', 'Month', 'Year', 'All'].includes(value.defaultPeriod ?? '')
      ? value.defaultPeriod!
      : 'Month',
    startPage: ['/', '/running', '/diet', '/account'].includes(value.startPage ?? '')
      ? value.startPage!
      : '/',
    runSource: value.runSource === 'appleHealth' ? 'appleHealth' : 'strava',
    appleHealthConnected: value.appleHealthConnected === true,
  };
}
export function validateProfile(value: unknown): Profile {
  if (!value || typeof value !== 'object') throw new Error('Enter your profile details.');
  const p = value as Profile;
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.trim().length > 80)
    throw new Error('Enter a name between 1 and 80 characters.');
  if (typeof p.gender !== 'string' || p.gender.trim().length > 60)
    throw new Error('Gender must be 60 characters or fewer.');
  for (const [key, min, max] of [
    ['age', 1, 120],
    ['heightCm', 30, 300],
    ['weightKg', 1, 650],
  ] as const) {
    const n = p[key];
    if (
      n !== null &&
      (typeof n !== 'number' ||
        !Number.isFinite(n) ||
        n < min ||
        n > max ||
        (key === 'age' && !Number.isInteger(n)))
    )
      throw new Error(
        key === 'age'
          ? 'Enter an age from 1 to 120, or leave it blank.'
          : `Enter a valid ${key === 'heightCm' ? 'height' : 'weight'}, or leave it blank.`,
      );
  }
  return {
    name: p.name.trim(),
    gender: p.gender.trim(),
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
  };
}
export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a valid email address.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Enter a valid email address.');
  return email;
}
export function validatePassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128)
    throw new Error('Use a password between 12 and 128 characters.');
  return value;
}
export const weightFromPounds = (pounds: number, units: Units) =>
  units === 'metric' ? pounds * 0.45359237 : pounds;
export const weightToPounds = (value: number, units: Units) =>
  units === 'metric' ? value / 0.45359237 : value;
export const displayWeight = (pounds: number, units: Units) =>
  Number(weightFromPounds(pounds, units).toFixed(1));
export const distanceValue = (meters: number, units: Units) =>
  meters / (units === 'metric' ? 1000 : 1609.344);

// A day counts once, whether it contains a meal, a run, or both. Yesterday's streak
// remains active until the user has had the whole of today to continue it.
export function activityStreak(mealDates: string[], runDates: string[], end = today()) {
  const active = new Set(
    [...mealDates, ...runDates].filter(
      (date) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        date >= '1900-01-01' &&
        date <= end &&
        today(parseDate(date)) === date,
    ),
  );
  const dates = [...active].sort();
  let best = 0,
    count = 0,
    previous = '';
  for (const date of dates) {
    count = previous && shiftDay(previous, 1) === date ? count + 1 : 1;
    best = Math.max(best, count);
    previous = date;
  }
  let current = 0,
    cursor = active.has(end) ? end : shiftDay(end, -1);
  while (active.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }
  return {
    current,
    best,
    todayComplete: active.has(end),
    days: Array.from({ length: 7 }, (_, i) => {
      const date = shiftDay(end, i - 6);
      return { date, active: active.has(date) };
    }),
  };
}
