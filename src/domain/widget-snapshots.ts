import { displayWeight, distanceValue } from './account';
import { exerciseRepFilter, liftsForRep, shiftDay, sumNutrition, today } from './journal';
import type { Journal, Run } from './types';

export type WeightWidgetSnapshot = {
  value: string;
  unit: string;
  date: string;
  change: string;
  history: number[];
  startDate: string;
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
  lifts: { name: string; shortName: string; value: string; numericValue: number; date: string }[];
};

export type ActivityWidgetSnapshot = {
  count: number;
  distance: string;
  distanceUnit: string;
  running: string;
  hiking: string;
  walking: string;
  runningHistory: number[];
  hikingHistory: number[];
  walkingHistory: number[];
  startDate: string;
  endDate: string;
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
  const latest = weights.at(-1);
  const monthStart = shiftDay(today(), -29);
  const monthWeights = weights.filter((entry) => entry.date >= monthStart);
  const baseline = monthWeights[0] ?? latest;
  const value = latest ? displayWeight(latest.pounds, units) : 0;
  const change = latest && baseline ? value - displayWeight(baseline.pounds, units) : 0;
  const nutrition = sumNutrition(
    journal.meals.filter((entry) => entry.date === today()).map((entry) => entry.nutrition),
  );
  const maxes = journal.exercises
    .map((exercise) => {
      const current = liftsForRep(
        journal.lifts.filter((record) => record.exerciseId === exercise.id),
        exerciseRepFilter(exercise),
      )[0];
      return current ? { exercise, current } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => b.current.pounds - a.current.pounds)
    .slice(0, 4);

  return {
    weight: {
      value: latest ? value.toFixed(1) : '—',
      unit: weightUnit,
      date: latest ? conciseDate(latest.date) : 'No entries',
      change: `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change).toFixed(1)}`,
      history: (monthWeights.length ? monthWeights : weights).slice(-7).map((entry) =>
        displayWeight(entry.pounds, units),
      ),
      startDate: monthWeights.length ? conciseDate(monthWeights[0].date) : '',
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
      lifts: maxes.map(({ exercise, current }) => ({
        name: exercise.name,
        shortName: exercise.name.toLowerCase().includes('overhead') ? 'OHP' : exercise.name.split(' ')[0],
        value: displayWeight(current.pounds, units).toFixed(1).replace(/\.0$/, ''),
        numericValue: displayWeight(current.pounds, units),
        date: conciseDate(current.date),
      })),
    },
  };
}

export function activityWidgetSnapshot(
  runs: Run[],
  units: Journal['preferences']['units'],
): ActivityWidgetSnapshot {
  const end = today();
  const start = shiftDay(end, -29);
  const recent = runs.filter((run) => run.localDate >= start && run.localDate <= end);
  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const kind = (sport: string) => {
    const normalized = sport.toLowerCase();
    if (normalized.includes('hike')) return 'hiking';
    if (normalized.includes('walk')) return 'walking';
    return 'running';
  };
  const totals = { running: 0, hiking: 0, walking: 0 };
  const buckets = {
    running: [0, 0, 0, 0],
    hiking: [0, 0, 0, 0],
    walking: [0, 0, 0, 0],
  };
  for (const run of recent) {
    const activity = kind(run.sport);
    const value = distanceValue(run.distanceMeters, units);
    totals[activity] += value;
    const daysAgo = Math.max(0, Math.floor((new Date(`${end}T12:00:00`).getTime() - new Date(`${run.localDate}T12:00:00`).getTime()) / 86_400_000));
    buckets[activity][Math.min(3, 3 - Math.floor(daysAgo / 8))] += value;
  }
  const total = totals.running + totals.hiking + totals.walking;
  return {
    count: recent.length,
    distance: Math.round(total).toString(),
    distanceUnit,
    running: Math.round(totals.running).toString(),
    hiking: Math.round(totals.hiking).toString(),
    walking: Math.round(totals.walking).toString(),
    runningHistory: buckets.running,
    hikingHistory: buckets.hiking,
    walkingHistory: buckets.walking,
    startDate: conciseDate(start),
    endDate: conciseDate(end),
  };
}
