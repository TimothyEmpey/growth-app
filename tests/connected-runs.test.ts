import { expect, test } from 'bun:test';
import { mergeConnectedRuns } from '../src/domain/runs';
import type { Run } from '../src/domain/types';

const run = (id: string, source: Run['source'], minutes = 0): Run => ({
  id,
  source,
  title: id,
  date: new Date(Date.UTC(2026, 0, 1, 12, minutes)).toISOString(),
  localDate: '2026-01-01',
  sport: 'Run',
  distanceMeters: 5000,
  movingSeconds: 1800,
  elapsedSeconds: 1850,
  elevationMeters: 20,
  averageHeartRate: null,
});

test('connected runs prefer Strava when Apple Health contains the same workout', () => {
  const strava = run('strava', 'strava');
  const duplicate = run('health-copy', 'appleHealth', 2);
  const healthOnly = run('health-only', 'appleHealth', 30);
  expect(mergeConnectedRuns([strava], [duplicate, healthOnly]).map((item) => item.id)).toEqual([
    'health-only',
    'strava',
  ]);
});
