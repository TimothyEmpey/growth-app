import { api } from './api';
import type { ActivityFilter, Run, RunPage } from '@/domain/types';

export async function getAllStravaRuns(
  start: string,
  end: string,
  activity: ActivityFilter,
  signal?: AbortSignal,
): Promise<Run[]> {
  const result: Run[] = [];
  const seenCursors = new Set<string>();
  let cursor = '';
  do {
    const page = await api<RunPage>(
      `/api/runs?start=${start}&end=${end}&activity=${activity}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      { signal },
    );
    result.push(...page.runs.map((run) => ({ ...run, source: 'strava' as const })));
    const next = page.nextCursor ?? '';
    cursor = next && !seenCursors.has(next) ? next : '';
    if (cursor) seenCursors.add(cursor);
  } while (cursor);
  return result;
}
