import GrowthHealth, {
  type HealthRun,
  type HealthWeight,
} from '../../modules/growth-health/src/GrowthHealthModule';
import { parseDate, shiftDay, today } from '@/domain/journal';
import type { Run, WeightEntry } from '@/domain/types';

export const appleHealthAvailable = () => GrowthHealth.isAvailable();
export const authorizeAppleHealthRuns = () => GrowthHealth.requestRunningAuthorization();
export const authorizeAppleHealthWeights = () => GrowthHealth.requestWeightAuthorization();

function isoRange(start: string, end: string) {
  return [parseDate(start).toISOString(), parseDate(shiftDay(end, 1)).toISOString()] as const;
}

function normalizeRun(run: HealthRun): Run {
  const nikeRunClub = `${run.title} ${run.sourceName} ${run.sourceBundleIdentifier}`
    .toLowerCase()
    .includes('nike');
  return {
    ...run,
    id: `apple-health:${run.id}`,
    localDate: today(new Date(run.date)),
    sport: 'Run',
    source: nikeRunClub ? 'nikeRunClub' : 'appleHealth',
  };
}

export async function getAppleHealthRuns(start: string, end: string): Promise<Run[]> {
  const [from, through] = isoRange(start, end);
  try {
    return (await GrowthHealth.getRunningWorkouts(from, through)).map(normalizeRun);
  } catch {
    throw new Error('Apple Health runs could not be loaded. Review Health access and try again.');
  }
}

export async function getAppleHealthRun(id: string): Promise<Run | null> {
  try {
    const run = await GrowthHealth.getRunningWorkout(id.replace(/^apple-health:/, ''));
    return run ? normalizeRun(run) : null;
  } catch {
    throw new Error('This run could not be loaded from Apple Health.');
  }
}

export async function getAppleHealthWeights(): Promise<(WeightEntry & { timestamp: number })[]> {
  try {
    return (await GrowthHealth.getBodyWeights()).map((weight: HealthWeight) => ({
      id: `apple-health:${weight.id}`,
      date: today(new Date(weight.date)),
      pounds: weight.pounds,
      timestamp: new Date(weight.date).getTime(),
    }));
  } catch {
    throw new Error('Body-weight history could not be loaded from Apple Health.');
  }
}
