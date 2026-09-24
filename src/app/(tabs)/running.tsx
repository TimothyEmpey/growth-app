import { usePreferences, useDefaultPeriod } from '@/hooks/use-preferences';
import { distanceValue } from '@/domain/account';
import { useColors } from '@/providers/appearance';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { pace, periodStart, today } from '@/domain/journal';
import type { Connection, RunPage } from '@/domain/types';
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

export default function RunningPage() {
  const C = useColors();
  const [period, setPeriod] = useDefaultPeriod();
  const { units } = usePreferences();
  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const client = useQueryClient();
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
      void client.invalidateQueries({ queryKey: ['run-days'] });
    }
  }, [params.strava, client]);
  const runs = useInfiniteQuery({
    queryKey: ['runs', period],
    initialPageParam: '',
    queryFn: ({ pageParam, signal }) =>
      api<RunPage>(
        `/api/runs?start=${periodStart(period)}&end=${today()}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!connection.data?.connected,
    refetchInterval: connection.data?.connected && !connection.data.complete ? 5000 : false,
  });
  const connected = connection.data?.connected;
  // Server summaries cover the whole period, including run pages not yet loaded by the UI.
  const summary = connected ? runs.data?.pages[0]?.summary : undefined;
  const items = runs.data?.pages.flatMap((p) => p.runs) ?? [];
  const averagePace = summary ? pace(summary.movingSeconds, summary.distanceMeters, units) : '—';
  return (
    <Page
      title="Running"
      eyebrow="Every mile counts"
      action={
        <Button quiet icon="link" onPress={() => router.push('/strava')}>
          {connected ? 'Strava connected' : 'Link Strava'}
        </Button>
      }
    >
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Title size={18}>Your running overview</Title>
        <PeriodControl value={period} onChange={setPeriod} />
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {[
          {
            label: 'Total runs',
            value: summary?.count ?? (connected ? '—' : 0),
            unit: 'runs',
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
      {connected && !connection.data?.complete && (
        <Card>
          <Row>
            <ActivityIndicator color={C.blue} />
            <Body>
              Importing your history · {connection.data?.importedCount ?? 0} runs found. Totals are
              incomplete until import finishes.
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
              : 'Strava could not be connected. Open Link Strava to try again.'
          }
        />
      )}
      <Card>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Title size={20}>Run history</Title>
          <Label>{connected ? 'Powered by Strava' : 'Your miles, in one place'}</Label>
        </Row>
        {!connected ? (
          <Empty
            icon="run"
            title="Bring your runs into Growth"
            action={
              <Button icon="link" onPress={() => router.push('/strava')}>
                Link Strava
              </Button>
            }
          >
            Connect your Strava account to see your runs, distance, and pace together.
          </Empty>
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
          <Empty icon="run" title="No runs in this period">
            Your next run will appear here after it syncs from Strava.
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
              onPress={() => router.push({ pathname: '/run-history', params: { period } })}
            >
              History
            </Button>
          </Row>
        )}
        {connected && connection.data?.lastSync && (
          <Body>Last synced {new Date(connection.data.lastSync).toLocaleString()}</Body>
        )}
      </Card>
    </Page>
  );
}
