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
  return {
    ...run,
    id: `apple-health:${run.id}`,
    localDate: today(new Date(run.date)),
    sport: 'Run',
    source: 'appleHealth',
  };
}

export async function getAppleHealthRuns(start: string, end: string): Promise<Run[]> {
  const [from, through] = isoRange(start, end);
  return (await GrowthHealth.getRunningWorkouts(from, through)).map(normalizeRun);
}

export async function getAppleHealthRun(id: string): Promise<Run | null> {
  const run = await GrowthHealth.getRunningWorkout(id.replace(/^apple-health:/, ''));
  return run ? normalizeRun(run) : null;
}

export async function getAppleHealthWeights(): Promise<(WeightEntry & { timestamp: number })[]> {
  return (await GrowthHealth.getBodyWeights()).map((weight: HealthWeight) => ({
    id: `apple-health:${weight.id}`,
    date: today(new Date(weight.date)),
    pounds: weight.pounds,
    timestamp: new Date(weight.date).getTime(),
  }));
}
