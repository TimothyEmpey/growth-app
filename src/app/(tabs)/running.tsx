import { usePreferences, useDefaultPeriod } from '@/hooks/use-preferences';
import { distanceValue } from '@/domain/account';
import { useColors } from '@/providers/appearance';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { pace, periodStart, today } from '@/domain/journal';
import type { ActivityFilter, Connection, RunPage } from '@/domain/types';
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
import { useJournal, updateJournal } from '@/data/journal-store';
import { getAppleHealthRuns } from '@/services/apple-health';

const activityOptions: { value: ActivityFilter; label: string }[] = [
  { value: 'run', label: 'Running' },
  { value: 'hike', label: 'Hiking' },
  { value: 'all', label: 'All activities' },
];

export default function RunningPage() {
  const C = useColors();
  const [period, setPeriod] = useDefaultPeriod();
  const [activity, setActivity] = useState<ActivityFilter>('run');
  const { units } = usePreferences();
  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const client = useQueryClient();
  const { journal } = useJournal();
  const source: 'strava' | 'appleHealth' =
    Platform.OS === 'ios' ? journal.preferences.runSource : 'strava';
  const sourceOptions: { value: 'strava' | 'appleHealth'; label: string }[] = [
    { value: 'strava', label: 'Strava' },
    ...(Platform.OS === 'ios' ? [{ value: 'appleHealth' as const, label: 'Apple Health' }] : []),
  ];
  const params = useLocalSearchParams<{ strava?: string; error?: string }>();
  const connection = useQuery({
    queryKey: ['strava'],
    queryFn: ({ signal }) => api<Connection>('/api/strava/status', { signal }),
    retry: false,
    enabled: source === 'strava',
    refetchInterval: (q) => (q.state.data?.connected && !q.state.data?.complete ? 4000 : false),
  });
  useEffect(() => {
    if (params.strava === 'connected') {
      void client.invalidateQueries({ queryKey: ['strava'] });
      void client.invalidateQueries({ queryKey: ['runs'] });
      void client.invalidateQueries({ queryKey: ['run-days'] });
    }
  }, [params.strava, client]);
  const selectedActivity: ActivityFilter = source === 'appleHealth' ? 'run' : activity;
  const runs = useInfiniteQuery({
    queryKey: ['runs', period, selectedActivity],
    initialPageParam: '',
    queryFn: ({ pageParam, signal }) =>
      api<RunPage>(
        `/api/runs?start=${periodStart(period)}&end=${today()}&activity=${selectedActivity}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: source === 'strava' && !!connection.data?.connected,
    refetchInterval: connection.data?.connected && !connection.data.complete ? 5000 : false,
  });
  const healthRuns = useQuery({
    queryKey: ['apple-health-runs', period],
    queryFn: () => getAppleHealthRuns(periodStart(period), today()),
    enabled: source === 'appleHealth' && journal.preferences.appleHealthConnected,
  });
  const connected =
    source === 'appleHealth'
      ? journal.preferences.appleHealthConnected
      : connection.data?.connected;
  const healthItems = healthRuns.data ?? [];
  const healthSummary = healthRuns.data
    ? {
        count: healthItems.length,
        distanceMeters: healthItems.reduce((total, run) => total + run.distanceMeters, 0),
        movingSeconds: healthItems.reduce((total, run) => total + run.movingSeconds, 0),
      }
    : undefined;
  // Server summaries cover the whole period, including run pages not yet loaded by the UI.
  const summary = connected
    ? source === 'appleHealth'
      ? healthSummary
      : runs.data?.pages[0]?.summary
    : undefined;
  const items =
    source === 'appleHealth' ? healthItems : (runs.data?.pages.flatMap((p) => p.runs) ?? []);
  const averagePace = summary ? pace(summary.movingSeconds, summary.distanceMeters, units) : '—';
  const activityNoun =
    selectedActivity === 'run' ? 'runs' : selectedActivity === 'hike' ? 'hikes' : 'activities';
  const activityTitle =
    selectedActivity === 'run' ? 'running' : selectedActivity === 'hike' ? 'hiking' : 'activity';
  return (
    <Page
      title="Running"
      eyebrow="Every mile counts"
      action={
        <Button
          quiet
          icon="link"
          onPress={() => router.push(source === 'appleHealth' ? '/health' : '/strava')}
        >
          {source === 'appleHealth'
            ? connected
              ? 'Apple Health selected'
              : 'Connect Apple Health'
            : connected
              ? 'Strava connected'
              : 'Link Strava'}
        </Button>
      }
    >
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
            label="Run source"
            value={source}
            options={sourceOptions}
            onChange={(value) => {
              void updateJournal((next) => {
                next.preferences.runSource = value;
              });
              if (value === 'appleHealth' && !journal.preferences.appleHealthConnected)
                router.push('/health');
            }}
          />
          {source === 'strava' && (
            <Dropdown
              label="Activity type"
              value={activity}
              options={activityOptions}
              onChange={setActivity}
            />
          )}
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
      {source === 'strava' && connected && !connection.data?.complete && (
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
      {source === 'strava' && connection.data?.error && <Notice message={connection.data.error} />}
      {params.error && (
        <Notice
          message={
            params.error === 'access_denied'
              ? 'Strava connection cancelled. You can try again whenever you’re ready.'
              : 'Strava could not be connected. Open Link Strava to try again.'
          }
        />
      )}
      <Card>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Title size={20}>
            {selectedActivity === 'run' ? 'Run' : selectedActivity === 'hike' ? 'Hike' : 'Activity'}{' '}
            history
          </Title>
          <Label>
            {connected
              ? source === 'appleHealth'
                ? 'From Apple Health'
                : 'Powered by Strava'
              : 'Your miles, in one place'}
          </Label>
        </Row>
        {!connected ? (
          <Empty
            icon={selectedActivity === 'hike' ? 'hike' : 'run'}
            title={`Bring your ${activityNoun} into Growth`}
            action={
              <Button
                icon="link"
                onPress={() => router.push(source === 'appleHealth' ? '/health' : '/strava')}
              >
                {source === 'appleHealth' ? 'Connect Apple Health' : 'Link Strava'}
              </Button>
            }
          >
            Connect {source === 'appleHealth' ? 'Apple Health' : 'your Strava account'} to see your{' '}
            {activityNoun}, distance, and pace together.
          </Empty>
        ) : source === 'appleHealth' ? (
          healthRuns.isPending ? (
            <ActivityIndicator color={C.blue} />
          ) : healthRuns.error ? (
            <>
              <Notice message={healthRuns.error.message} />
              <Button quiet onPress={() => void healthRuns.refetch()}>
                Try again
              </Button>
            </>
          ) : items.length === 0 ? (
            <Empty icon="run" title="No runs in this period">
              Runs shared through Apple Health will appear here.
            </Empty>
          ) : (
            <View>
              {items.slice(0, 5).map((run) => (
                <RunHistoryRow key={run.id} run={run} units={units} />
              ))}
            </View>
          )
        ) : runs.isPending ? (
          <ActivityIndicator color={C.blue} />
        ) : runs.error ? (
          <>
            <Notice message={runs.error.message} />
            <Button quiet onPress={() => void runs.refetch()}>
              Try again
            </Button>
          </>
        ) : items.length === 0 ? (
          <Empty
            icon={selectedActivity === 'hike' ? 'hike' : 'run'}
            title={`No ${activityNoun} in this period`}
          >
            Your next {selectedActivity === 'all' ? 'activity' : selectedActivity.slice(0, -1)} will
            appear here after it syncs from Strava.
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
                  params: { period, activity: selectedActivity, source },
                })
              }
            >
              History
            </Button>
          </Row>
        )}
        {source === 'strava' && connected && connection.data?.lastSync && (
          <Body>Last synced {new Date(connection.data.lastSync).toLocaleString()}</Body>
        )}
      </Card>
    </Page>
  );
}
