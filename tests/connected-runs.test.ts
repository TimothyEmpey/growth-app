import { expect, test } from 'bun:test';
import { activityCategory, filterActivities, mergeConnectedRuns } from '../src/domain/runs';
import { activityWidgetSnapshot } from '../src/domain/widget-snapshots';
import { shiftDay, today } from '../src/domain/journal';
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

test('Nike Run Club wins when it duplicates a generic Apple Health workout', () => {
  const nike = run('nike', 'nikeRunClub');
  const appleCopy = run('apple-copy', 'appleHealth', 1);
  expect(mergeConnectedRuns([], [appleCopy, nike]).map((item) => item.id)).toEqual(['nike']);
});

test('activity categories retain all provider sports and filter related variants together', () => {
  const trail = { ...run('trail', 'strava'), sport: 'TrailRun' };
  const ride = { ...run('ride', 'strava'), sport: 'MountainBikeRide' };
  const yoga = { ...run('yoga', 'appleHealth'), sport: 'Yoga', distanceMeters: 0 };
  expect(activityCategory(trail.sport)).toBe('run');
  expect(activityCategory(ride.sport)).toBe('ride');
  expect(activityCategory(yoga.sport)).toBe('other');
  expect(filterActivities([trail, ride, yoga], 'ride').map((item) => item.id)).toEqual(['ride']);
  expect(filterActivities([trail, ride, yoga], 'all')).toHaveLength(3);
});

test('the activity widget reports running distance from the current calendar month', () => {
  const month = today().slice(0, 7);
  const previousMonth = shiftDay(`${month}-01`, -1);
  const current = { ...run('current', 'strava'), localDate: `${month}-02`, distanceMeters: 8046.72 };
  const old = { ...run('old', 'strava'), localDate: previousMonth, distanceMeters: 1609.344 };
  expect(activityWidgetSnapshot([current, old], 'us').monthlyRunning).toBe('5');
});
