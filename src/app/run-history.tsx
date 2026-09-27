import { ActivityIndicator, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useDefaultPeriod, usePreferences } from '@/hooks/use-preferences';
import { api } from '@/services/api';
import { periodStart, today } from '@/domain/journal';
import type { ActivityFilter, Connection, Period, RunPage } from '@/domain/types';
import { Body, Button, Notice, Sheet } from '@/components/ui';
import { RunHistoryRow } from '@/components/run-history-row';
import { useColors } from '@/providers/appearance';
import { getAppleHealthRuns } from '@/services/apple-health';

const PERIODS: Period[] = ['Week', 'Month', 'Year', 'All'];

export default function RunHistorySheet() {
  const C = useColors();
  const params = useLocalSearchParams<{ period?: string; activity?: string; source?: string }>();
  const [defaultPeriod] = useDefaultPeriod();
  const period = PERIODS.includes(params.period as Period)
    ? (params.period as Period)
    : defaultPeriod;
  const { units } = usePreferences();
  const activity: ActivityFilter = ['run', 'hike', 'all'].includes(params.activity ?? '')
    ? (params.activity as ActivityFilter)
    : 'run';
  const appleHealth = params.source === 'appleHealth';
  const connection = useQuery({
    queryKey: ['strava'],
    queryFn: ({ signal }) => api<Connection>('/api/strava/status', { signal }),
    retry: false,
    enabled: !appleHealth,
  });
  const runs = useInfiniteQuery({
    queryKey: ['runs', period, activity],
    initialPageParam: '',
    queryFn: ({ pageParam, signal }) =>
      api<RunPage>(
        `/api/runs?start=${periodStart(period)}&end=${today()}&activity=${activity}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !appleHealth && !!connection.data?.connected,
  });
  const healthRuns = useQuery({
    queryKey: ['apple-health-runs', period],
    queryFn: () => getAppleHealthRuns(periodStart(period), today()),
    enabled: appleHealth,
  });
  const items = appleHealth
    ? (healthRuns.data ?? [])
    : (runs.data?.pages.flatMap((page) => page.runs) ?? []);

  return (
    <Sheet
      title={`${activity === 'run' ? 'Run' : activity === 'hike' ? 'Hike' : 'Activity'} history`}
      subtitle={`${period} · newest ${activity === 'all' ? 'activities' : `${activity}s`} first`}
    >
      {appleHealth ? (
        healthRuns.isPending ? (
          <ActivityIndicator color={C.blue} />
        ) : healthRuns.error ? (
          <Notice message={healthRuns.error.message} />
        ) : items.length === 0 ? (
          <Body>No runs in this period.</Body>
        ) : (
          <View>
            {items.map((run) => (
              <RunHistoryRow key={run.id} run={run} units={units} />
            ))}
          </View>
        )
      ) : connection.isPending || (connection.data?.connected && runs.isPending) ? (
        <ActivityIndicator color={C.blue} />
      ) : connection.error ? (
        <Notice message={connection.error.message} />
      ) : !connection.data?.connected ? (
        <Body>Connect Strava from the Running page to see your run history.</Body>
      ) : runs.error ? (
        <>
          <Notice message={runs.error.message} />
          <Button quiet onPress={() => void runs.refetch()}>
            Try again
          </Button>
        </>
      ) : items.length === 0 ? (
        <Body>No {activity === 'all' ? 'activities' : `${activity}s`} in this period.</Body>
      ) : (
        <View>
          {items.map((run) => (
            <RunHistoryRow key={run.id} run={run} units={units} />
          ))}
        </View>
      )}
      {!appleHealth && runs.hasNextPage && (
        <Button quiet loading={runs.isFetchingNextPage} onPress={() => void runs.fetchNextPage()}>
          Load more {activity === 'all' ? 'activities' : `${activity}s`}
        </Button>
      )}
    </Sheet>
  );
}
