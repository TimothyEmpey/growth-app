import type { Run } from './types';

function sameWorkout(strava: Run, health: Run) {
  const timeDifference = Math.abs(
    new Date(strava.date).getTime() - new Date(health.date).getTime(),
  );
  const distanceTolerance = Math.max(250, strava.distanceMeters * 0.03);
  return (
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
