import { ActivityIndicator, Platform, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useDefaultPeriod, usePreferences } from '@/hooks/use-preferences';
import { api } from '@/services/api';
import { periodStart, today } from '@/domain/journal';
import type { ActivityFilter, Connection, Period } from '@/domain/types';
import { Body, Notice, Sheet } from '@/components/ui';
import { RunHistoryRow } from '@/components/run-history-row';
import { useColors } from '@/providers/appearance';
import { getAppleHealthRuns } from '@/services/apple-health';
import { useJournal } from '@/data/journal-store';
import { getAllStravaRuns } from '@/services/connected-runs';
import { activityLabel, filterActivities, mergeConnectedRuns } from '@/domain/runs';

const PERIODS: Period[] = ['Week', 'Month', 'Year', 'All'];

export default function RunHistorySheet() {
  const C = useColors();
  const params = useLocalSearchParams<{ period?: string; activity?: string }>();
  const [defaultPeriod] = useDefaultPeriod();
  const period = PERIODS.includes(params.period as Period)
    ? (params.period as Period)
    : defaultPeriod;
  const { units } = usePreferences();
  const activity: ActivityFilter = [
    'all',
    'run',
    'walk',
    'hike',
    'ride',
    'swim',
    'strength',
    'other',
  ].includes(params.activity ?? '')
    ? (params.activity as ActivityFilter)
    : 'all';
  const { journal } = useJournal();
  const connection = useQuery({
    queryKey: ['strava'],
    queryFn: ({ signal }) => api<Connection>('/api/strava/status', { signal }),
    retry: false,
  });
  const stravaEnabled = !!connection.data?.connected;
  const healthEnabled = Platform.OS === 'ios' && journal.preferences.appleHealthConnected;
  const runs = useQuery({
    queryKey: ['connected-runs', 'strava', period, activity],
    queryFn: ({ signal }) => getAllStravaRuns(periodStart(period), today(), activity, signal),
    enabled: stravaEnabled,
  });
  const healthRuns = useQuery({
    queryKey: ['apple-health-runs', period],
    queryFn: () => getAppleHealthRuns(periodStart(period), today()),
    enabled: healthEnabled,
  });
  const items = filterActivities(
    mergeConnectedRuns(runs.data ?? [], healthRuns.data ?? []),
    activity,
  );
  const connected = stravaEnabled || journal.preferences.appleHealthConnected;
  const loading = (stravaEnabled && runs.isPending) || (healthEnabled && healthRuns.isPending);
  const error = runs.error ?? healthRuns.error;

  return (
    <Sheet
      title={`${activityLabel(activity)} history`}
      subtitle={`${period} · newest ${activityLabel(activity, true).toLowerCase()} first`}
    >
      {connection.isPending || loading ? (
        <ActivityIndicator color={C.blue} />
      ) : connection.error || error ? (
        <Notice
          message={(connection.error ?? error)?.message ?? 'Activity history is unavailable.'}
        />
      ) : !connected ? (
        <Body>
          Connect a supported service from Account → Connections to see your activity history.
        </Body>
      ) : items.length === 0 ? (
        <Body>No {activityLabel(activity, true).toLowerCase()} in this period.</Body>
      ) : (
        <View>
          {items.map((run) => (
            <RunHistoryRow key={run.id} run={run} units={units} />
          ))}
        </View>
      )}
    </Sheet>
  );
}
