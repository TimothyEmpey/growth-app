import { usePreferences, useDefaultPeriod } from '@/hooks/use-preferences';
import { distanceValue } from '@/domain/account';
import { useColors } from '@/providers/appearance';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { pace, periodStart, today } from '@/domain/journal';
import type { ActivityFilter, Connection } from '@/domain/types';
import {
  Body,
  Button,
  Card,
  Empty,
  Label,
  Notice,
  Page,
  PeriodControl,
  Row,
  Title,
} from '@/components/ui';
import { RunHistoryRow } from '@/components/run-history-row';
import { Dropdown } from '@/components/dropdown';
import { useJournal } from '@/data/journal-store';
import { getAppleHealthRuns } from '@/services/apple-health';
import { getAllStravaRuns } from '@/services/connected-runs';
import { mergeConnectedRuns, summarizeRuns } from '@/domain/runs';

const activityOptions: { value: ActivityFilter; label: string }[] = [
  { value: 'run', label: 'Running' },
  { value: 'hike', label: 'Hiking' },
  { value: 'all', label: 'All activities' },
];

export default function RunningPage() {
  const C = useColors();
  const [period, setPeriod] = useDefaultPeriod();
  const [activity, setActivity] = useState<ActivityFilter>('all');
  const { units } = usePreferences();
  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const client = useQueryClient();
  const { journal } = useJournal();
  const params = useLocalSearchParams<{ strava?: string; error?: string }>();
  const connection = useQuery({
    queryKey: ['strava'],
    queryFn: ({ signal }) => api<Connection>('/api/strava/status', { signal }),
    retry: false,
    refetchInterval: (q) => (q.state.data?.connected && !q.state.data?.complete ? 4000 : false),
  });
  useEffect(() => {
    if (params.strava === 'connected') {
      void client.invalidateQueries({ queryKey: ['strava'] });
      void client.invalidateQueries({ queryKey: ['runs'] });
      void client.invalidateQueries({ queryKey: ['connected-runs'] });
      void client.invalidateQueries({ queryKey: ['run-days'] });
    }
  }, [params.strava, client]);
  const stravaEnabled = !!connection.data?.connected;
  const healthEnabled =
    Platform.OS === 'ios' && journal.preferences.appleHealthConnected && activity !== 'hike';
  const stravaRuns = useQuery({
    queryKey: ['connected-runs', 'strava', period, activity],
    queryFn: ({ signal }) => getAllStravaRuns(periodStart(period), today(), activity, signal),
    enabled: stravaEnabled,
    refetchInterval: connection.data?.connected && !connection.data.complete ? 5000 : false,
  });
  const healthRuns = useQuery({
    queryKey: ['apple-health-runs', period],
    queryFn: () => getAppleHealthRuns(periodStart(period), today()),
    enabled: healthEnabled,
  });
  const connected = !!connection.data?.connected || journal.preferences.appleHealthConnected;
  const items = mergeConnectedRuns(stravaRuns.data ?? [], healthRuns.data ?? []);
  const loadingRuns =
    (stravaEnabled && stravaRuns.isPending) || (healthEnabled && healthRuns.isPending);
  const summary = connected && !loadingRuns ? summarizeRuns(items) : undefined;
  const averagePace = summary ? pace(summary.movingSeconds, summary.distanceMeters, units) : '—';
  const activityNoun = activity === 'run' ? 'runs' : activity === 'hike' ? 'hikes' : 'activities';
  const activityTitle =
    activity === 'run' ? 'running' : activity === 'hike' ? 'hiking' : 'activity';
  return (
    <Page title="Running" eyebrow="Every mile counts">
      <Row
        style={{
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <Title size={18}>Your {activityTitle} overview</Title>
        <Row style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Dropdown
            label="Activity type"
            value={activity}
            options={activityOptions}
            onChange={setActivity}
          />
          <PeriodControl value={period} onChange={setPeriod} />
        </Row>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {[
          {
            label: `Total ${activityNoun}`,
            value: summary?.count ?? (connected ? '—' : 0),
            unit: activityNoun,
            color: C.blue,
            accent: C.blue,
          },
          {
            label: units === 'metric' ? 'Total kilometers' : 'Total miles',
            value: summary
              ? distanceValue(summary.distanceMeters, units).toFixed(2)
              : connected
                ? '—'
                : '0.00',
            unit: distanceUnit,
            color: C.green,
            accent: C.green,
          },
          {
            label: units === 'metric' ? 'Average kilometer pace' : 'Average mile pace',
            value: averagePace,
            unit: `/ ${distanceUnit}`,
            color: averagePace === '—' ? C.text : C.purple,
            accent: C.purple,
          },
        ].map((metric) => (
          <Card key={metric.label} style={{ flex: 1, minWidth: 170, gap: 23 }}>
            <Label>{metric.label}</Label>
            <Text
              style={{
                color: metric.color,
                fontSize: 36,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
                letterSpacing: -1,
              }}
            >
              {metric.value}
              {metric.unit ? (
                <Text style={{ fontSize: 14, color: C.muted, letterSpacing: 0 }}>
                  {' '}
                  {metric.unit}
                </Text>
              ) : null}
            </Text>
            <View
              style={{ height: 3, borderRadius: 2, width: 32, backgroundColor: metric.accent }}
            />
          </Card>
        ))}
      </View>
      {connection.data?.connected && !connection.data.complete && (
        <Card>
          <Row>
            <ActivityIndicator color={C.blue} />
            <Body>
              Importing your history · {connection.data?.importedCount ?? 0} activities found.
              Totals are incomplete until import finishes.
            </Body>
          </Row>
        </Card>
      )}
      {connection.data?.error && <Notice message={connection.data.error} />}
      {params.error && (
        <Notice
          message={
            params.error === 'access_denied'
              ? 'Strava connection cancelled. You can try again whenever you’re ready.'
              : 'Strava could not be connected. Open Account → Connections to try again.'
          }
        />
      )}
      <Card>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Title size={20}>
            {activity === 'run' ? 'Run' : activity === 'hike' ? 'Hike' : 'Activity'} history
          </Title>
          <Label>{connected ? 'From your connections' : 'Your miles, in one place'}</Label>
        </Row>
        {!connected ? (
          <Empty
            icon={activity === 'hike' ? 'hike' : 'run'}
            title={`Bring your ${activityNoun} into Growth`}
            action={
              <Button icon="link" onPress={() => router.push('/account/connections')}>
                Manage connections
              </Button>
            }
          >
            Connect a supported service to see your {activityNoun}, distance, and pace together.
          </Empty>
        ) : loadingRuns ? (
          <ActivityIndicator color={C.blue} />
        ) : stravaRuns.error || healthRuns.error ? (
          <>
            <Notice
              message={(stravaRuns.error ?? healthRuns.error)?.message ?? 'Runs unavailable.'}
            />
            <Button
              quiet
              onPress={() => void Promise.all([stravaRuns.refetch(), healthRuns.refetch()])}
            >
              Try again
            </Button>
          </>
        ) : items.length === 0 ? (
          <Empty
            icon={activity === 'hike' ? 'hike' : 'run'}
            title={`No ${activityNoun} in this period`}
          >
            Your next {activity === 'all' ? 'activity' : activity.slice(0, -1)} will appear here
            after it syncs from a connection.
          </Empty>
        ) : (
          <View>
            {items.slice(0, 5).map((run) => (
              <RunHistoryRow key={run.id} run={run} units={units} />
            ))}
          </View>
        )}
        {items.length > 0 && (
          <Row style={{ justifyContent: 'flex-end' }}>
            <Button
              quiet
              onPress={() =>
                router.push({
                  pathname: '/run-history',
                  params: { period, activity },
                })
              }
            >
              History
            </Button>
          </Row>
        )}
        {connection.data?.connected && connection.data.lastSync && (
          <Body>Last synced {new Date(connection.data.lastSync).toLocaleString()}</Body>
        )}
      </Card>
    </Page>
  );
}
