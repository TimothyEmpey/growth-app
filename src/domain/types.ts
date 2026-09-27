import type { Preferences, Profile } from './account';
// Local calendar date (YYYY-MM-DD), without a time or UTC offset.
export type DateKey = string;
export type Period = 'Week' | 'Month' | 'Year' | 'All';
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
// Calories are displayed as cal; macros are grams. Missing provider values are stored as zero.
export type Nutrition = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};
export type Goals = Partial<Record<keyof Nutrition, number>>;
export type WeightEntry = { id: string; date: DateKey; pounds: number };
export type RepCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type RepFilter = RepCount | 'all';
export type ActivityFilter = 'run' | 'hike' | 'all';
export type Exercise = { id: string; name: string; repFilter?: RepFilter };
export type LiftRecord = {
  id: string;
  exerciseId: string;
  date: DateKey;
  pounds: number;
  createdAt: number;
  reps?: RepCount;
};
export type FoodPortion = { id: string; label: string; grams: number; nutrition?: Nutrition };
export type Food = {
  id: string;
  name: string;
  brand?: string;
  per100g: Nutrition;
  portions: FoodPortion[];
  defaultPortionId?: string;
};
export type FoodSearchItem = { id: string; name: string; brand?: string };
export type MealEntry = {
  id: string;
  date: DateKey;
  meal: Meal;
  food: Food;
  portionId: string;
  quantity: number;
  // Serving-scaled values saved with the entry, independent of later food database updates.
  nutrition: Nutrition;
};
export type Journal = {
  version: 1;
  weights: WeightEntry[];
  exercises: Exercise[];
  lifts: LiftRecord[];
  meals: MealEntry[];
  foods: Food[];
  goals: Goals;
  preferences: Preferences;
  profile: Profile;
};
export type RunSplit = {
  distanceMeters: number;
  movingSeconds: number;
  elevationDifference: number;
};
export type Run = {
  id: string;
  title: string;
  date: string;
  localDate: DateKey;
  sport: string;
  distanceMeters: number;
  movingSeconds: number;
  elapsedSeconds: number;
  elevationMeters: number;
  averageHeartRate: number | null;
  splits?: RunSplit[];
  metricSplits?: RunSplit[];
  source?: 'strava' | 'appleHealth';
};
export type Connection = {
  configured: boolean;
  connected: boolean;
  athleteName?: string;
  status?: 'connected' | 'reconnect';
  complete?: boolean;
  importedCount?: number;
  lastSync?: string | null;
  error?: string | null;
};
export type RunPage = {
  runs: Run[];
  nextCursor: string | null;
  summary: { count: number; distanceMeters: number; movingSeconds: number };
  complete: boolean;
};
