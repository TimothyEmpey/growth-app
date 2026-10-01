import { displayWeight, distanceValue } from './account';
import {
  exerciseRepFilter,
  liftsForRep,
  shiftDay,
  sumNutrition,
  today,
} from './journal';
import { summarizeRuns } from './runs';
import type { Journal, Run } from './types';

export type WeightWidgetSnapshot = {
  value: string;
  unit: string;
  date: string;
  change: string;
  history: number[];
};

export type DietWidgetSnapshot = {
  calories: number;
  calorieGoal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fat: number;
  fatGoal: number;
};

export type MaxesWidgetSnapshot = {
  unit: string;
  lifts: { name: string; value: string; date: string }[];
};

export type ActivityWidgetSnapshot = {
  count: number;
  distance: string;
  distanceUnit: string;
  movingMinutes: number;
  recent: { title: string; distance: string; date: string }[];
  categories: {
    running: string;
    hiking: string;
    walking: string;
  };
  trends: {
    running: number[];
    hiking: number[];
    walking: number[];
  };
};

const conciseDate = (date: string) =>
  new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export function journalWidgetSnapshots(journal: Journal): {
  weight: WeightWidgetSnapshot;
  diet: DietWidgetSnapshot;
  maxes: MaxesWidgetSnapshot;
} {
  const units = journal.preferences.units;
  const weightUnit = units === 'metric' ? 'kg' : 'lb';
  const weights = [...journal.weights].sort((a, b) => a.date.localeCompare(b.date));
  const latestWeight = weights.at(-1);
  const previousWeight = weights.at(-2);
  const displayedWeight = latestWeight ? displayWeight(latestWeight.pounds, units) : 0;
  const displayedPrevious = previousWeight ? displayWeight(previousWeight.pounds, units) : null;
  const delta = displayedPrevious === null ? null : displayedWeight - displayedPrevious;
  const recentWeights = weights.filter((entry) => entry.date >= shiftDay(today(), -29));
  const firstRecentWeight = recentWeights[0];
  const monthlyDelta = firstRecentWeight
    ? displayedWeight - displayWeight(firstRecentWeight.pounds, units)
    : delta;
  const meals = journal.meals.filter((entry) => entry.date === today());
  const nutrition = sumNutrition(meals.map((entry) => entry.nutrition));
  const currentMaxes = journal.exercises
    .map((exercise) => {
      const current = liftsForRep(
        journal.lifts.filter((record) => record.exerciseId === exercise.id),
        exerciseRepFilter(exercise),
      )[0];
      return current ? { exercise, current } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => !!entry)
    .sort((a, b) => b.current.pounds - a.current.pounds)
    .slice(0, 4);

  return {
    weight: {
      value: latestWeight ? displayedWeight.toFixed(1) : '—',
      unit: weightUnit,
      date: latestWeight ? conciseDate(latestWeight.date) : 'No entries yet',
      change:
        monthlyDelta === null
          ? 'Log another entry to see change'
          : `${monthlyDelta > 0 ? '+' : ''}${monthlyDelta.toFixed(1)} ${weightUnit}`,
      history: recentWeights.map((entry) => displayWeight(entry.pounds, units)),
    },
    diet: {
      calories: Math.round(nutrition.calories ?? 0),
      calorieGoal: Math.round(journal.goals.calories ?? 0),
      protein: Math.round(nutrition.protein ?? 0),
      proteinGoal: Math.round(journal.goals.protein ?? 0),
      carbs: Math.round(nutrition.carbs ?? 0),
      carbsGoal: Math.round(journal.goals.carbs ?? 0),
      fat: Math.round(nutrition.fat ?? 0),
      fatGoal: Math.round(journal.goals.fat ?? 0),
    },
    maxes: {
      unit: weightUnit,
      lifts: currentMaxes.map(({ exercise, current }) => ({
        name: exercise.name,
        value: displayWeight(current.pounds, units).toFixed(1).replace(/\.0$/, ''),
        date: conciseDate(current.date),
      })),
    },
  };
}

export function activityWidgetSnapshot(
  runs: Run[],
  units: Journal['preferences']['units'],
): ActivityWidgetSnapshot {
  const summary = summarizeRuns(runs);
  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const category = (run: Run): keyof ActivityWidgetSnapshot['categories'] => {
    const sport = run.sport.toLowerCase();
    if (sport.includes('hike')) return 'hiking';
    if (sport.includes('walk')) return 'walking';
    return 'running';
  };
  const categories = { running: 0, hiking: 0, walking: 0 };
  const dates = [...new Set(runs.map((run) => run.localDate))].sort().slice(-7);
  const trends = {
    running: dates.map(() => 0),
    hiking: dates.map(() => 0),
    walking: dates.map(() => 0),
  };
  runs.forEach((run) => {
    const key = category(run);
    categories[key] += run.distanceMeters;
    const index = dates.indexOf(run.localDate);
    if (index >= 0) trends[key][index] += distanceValue(run.distanceMeters, units);
  });
  return {
    count: summary.count,
    distance: distanceValue(summary.distanceMeters, units).toFixed(1),
    distanceUnit,
    movingMinutes: Math.round(summary.movingSeconds / 60),
    categories: {
      running: distanceValue(categories.running, units).toFixed(1),
      hiking: distanceValue(categories.hiking, units).toFixed(1),
      walking: distanceValue(categories.walking, units).toFixed(1),
    },
    trends,
    recent: [...runs]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4)
      .map((run) => ({
        title: run.title,
        distance: `${distanceValue(run.distanceMeters, units).toFixed(1)} ${distanceUnit}`,
        date: conciseDate(run.localDate),
      })),
  };
}
