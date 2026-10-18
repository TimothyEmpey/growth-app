import type { ActivityFilter, Run } from './types';

const activitySports: Record<Exclude<ActivityFilter, 'all' | 'other'>, string[]> = {
  run: ['Run', 'TrailRun', 'VirtualRun'],
  walk: ['Walk'],
  hike: ['Hike'],
  ride: [
    'Ride',
    'VirtualRide',
    'MountainBikeRide',
    'GravelRide',
    'EBikeRide',
    'EMountainBikeRide',
    'Handcycle',
    'Velomobile',
    'Cycling',
  ],
  swim: ['Swim', 'Swimming'],
  strength: [
    'WeightTraining',
    'Workout',
    'Crossfit',
    'HighIntensityIntervalTraining',
    'StrengthTraining',
  ],
};

export function activityCategory(sport: string): ActivityFilter {
  const match = Object.entries(activitySports).find(([, sports]) => sports.includes(sport));
  return (match?.[0] as ActivityFilter | undefined) ?? 'other';
}

export function filterActivities(activities: Run[], filter: ActivityFilter): Run[] {
  return filter === 'all'
    ? activities
    : activities.filter((activity) => activityCategory(activity.sport) === filter);
}

export function activityLabel(filter: ActivityFilter, plural = false): string {
  const labels: Record<ActivityFilter, [string, string]> = {
    all: ['Activity', 'Activities'],
    run: ['Run', 'Runs'],
    walk: ['Walk', 'Walks'],
    hike: ['Hike', 'Hikes'],
    ride: ['Ride', 'Rides'],
    swim: ['Swim', 'Swims'],
    strength: ['Strength workout', 'Strength workouts'],
    other: ['Other activity', 'Other activities'],
  };
  return labels[filter][plural ? 1 : 0];
}

function sameWorkout(strava: Run, health: Run) {
  const timeDifference = Math.abs(
    new Date(strava.date).getTime() - new Date(health.date).getTime(),
  );
  const distanceTolerance = Math.max(250, strava.distanceMeters * 0.03);
  return (
    activityCategory(strava.sport) === activityCategory(health.sport) &&
    strava.localDate === health.localDate &&
    timeDifference <= 5 * 60_000 &&
    Math.abs(strava.distanceMeters - health.distanceMeters) <= distanceTolerance &&
    Math.abs(strava.movingSeconds - health.movingSeconds) <= 5 * 60
  );
}

export function mergeConnectedRuns(strava: Run[], health: Run[]): Run[] {
  // Keep provider detail in priority order when the same workout reaches multiple sources.
  const nike = health.filter((run) => run.source === 'nikeRunClub');
  const apple = health.filter(
    (run) => run.source !== 'nikeRunClub' && !nike.some((nikeRun) => sameWorkout(nikeRun, run)),
  );
  const healthOnly = [...nike, ...apple].filter(
    (healthRun) => !strava.some((stravaRun) => sameWorkout(stravaRun, healthRun)),
  );
  return [...strava, ...healthOnly].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function summarizeRuns(runs: Run[]) {
  return {
    count: runs.length,
    distanceMeters: runs.reduce((total, run) => total + run.distanceMeters, 0),
    movingSeconds: runs.reduce((total, run) => total + run.movingSeconds, 0),
  };
}
