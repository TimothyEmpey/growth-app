import type { Run, WeightEntry } from '@/domain/types';

const unavailable = () => {
  throw new Error('Apple Health is available in the iPhone app.');
};

export const appleHealthAvailable = () => false;
export const authorizeAppleHealthRuns = async (): Promise<boolean> => unavailable();
export const authorizeAppleHealthWeights = async (): Promise<boolean> => unavailable();
export const getAppleHealthRuns = async (_start: string, _end: string): Promise<Run[]> =>
  unavailable();
export const getAppleHealthRun = async (_id: string): Promise<Run | null> => unavailable();
export const getAppleHealthWeights = async (): Promise<(WeightEntry & { timestamp: number })[]> =>
  unavailable();
