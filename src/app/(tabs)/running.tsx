import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { duration, formatDate, pace, periodStart, today } from '@/domain/journal';
import type { Connection, Period, RunPage } from '@/domain/types';
import {
  Body,
  Button,
  C,
  Card,
  Empty,
  Icon,
  Label,
  Notice,
  Page,
  PeriodControl,
  Row,
  Title,
} from '@/components/ui';

export default function RunningPage() {
  const [period, setPeriod] = useState<Period>('Month');
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
          },
          {
            label: 'Total miles',
            value: summary
              ? (summary.distanceMeters / 1609.344).toFixed(2)
              : connected
                ? '—'
                : '0.00',
            unit: 'mi',
            color: C.green,
          },
          {
            label: 'Average mile pace',
            value: summary ? pace(summary.movingSeconds, summary.distanceMeters) : '—',
            unit: '/ mi',
            color: C.purple,
          },
        ].map((metric) => (
          <Card key={metric.label} style={{ flex: 1, minWidth: 170, gap: 23 }}>
            <Label>{metric.label}</Label>
            <Text
              selectable
              style={{
                color: metric.color,
                fontSize: 36,
                fontWeight: '600',
                fontVariant: ['tabular-nums'],
                letterSpacing: -1,
              }}
            >
              {metric.value}
              <Text style={{ fontSize: 14, color: C.muted, letterSpacing: 0 }}> {metric.unit}</Text>
            </Text>
            <View
              style={{ height: 3, borderRadius: 2, width: 32, backgroundColor: metric.color }}
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
            {items.map((run) => (
              <Pressable
                accessibilityRole="button"
                key={run.id}
                onPress={() => router.push({ pathname: '/run', params: { id: run.id } })}
                style={{ borderBottomWidth: 1, borderColor: C.border, paddingVertical: 20 }}
              >
                <Row>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: '#71d7b112',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="run" color={C.green} size={21} />
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>
                      {run.title}
                    </Text>
                    <Body>{formatDate(run.localDate)}</Body>
                    <Row style={{ flexWrap: 'wrap', gap: 18 }}>
                      <Text style={{ color: C.text, fontSize: 14 }}>
                        {(run.distanceMeters / 1609.344).toFixed(2)} mi
                      </Text>
                      <Text style={{ color: C.muted, fontSize: 14 }}>
                        {duration(run.movingSeconds)}
                      </Text>
                      <Text style={{ color: C.blue, fontSize: 14 }}>
                        {pace(run.movingSeconds, run.distanceMeters)} / mi
                      </Text>
                    </Row>
                  </View>
                  <Icon name="right" size={18} />
                </Row>
              </Pressable>
            ))}
          </View>
        )}
        {runs.hasNextPage && (
          <Button quiet loading={runs.isFetchingNextPage} onPress={() => void runs.fetchNextPage()}>
            Load more runs
          </Button>
        )}
        {connected && connection.data?.lastSync && (
          <Body>Last synced {new Date(connection.data.lastSync).toLocaleString()}</Body>
        )}
      </Card>
    </Page>
  );
}
