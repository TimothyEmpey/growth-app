import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Run } from '@/domain/types';
import { duration, formatDate, pace } from '@/domain/journal';
import { Body, Button, C, Card, Label, Notice, Row, Sheet, Title } from '@/components/ui';

export default function RunSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ['run', id],
    queryFn: ({ signal }) => api<Run>(`/api/runs/${id}`, { signal }),
    retry: false,
  });
  const run = query.data;
  return (
    <Sheet
      title={run?.title ?? 'Run details'}
      subtitle={run ? formatDate(run.localDate) : 'From Strava'}
    >
      {query.isPending && <ActivityIndicator color={C.blue} />}
      {query.error && (
        <>
          <Notice message={query.error.message} />
          <Button quiet onPress={() => void query.refetch()}>
            Try again
          </Button>
        </>
      )}
      {run && (
        <>
          <Card style={{ backgroundColor: C.bg }}>
            <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between', gap: 24 }}>
              {[
                { label: 'Distance', value: `${(run.distanceMeters / 1609.344).toFixed(2)} mi` },
                { label: 'Moving time', value: duration(run.movingSeconds) },
                { label: 'Mile pace', value: `${pace(run.movingSeconds, run.distanceMeters)} /mi` },
                { label: 'Elevation', value: `${Math.round(run.elevationMeters * 3.28084)} ft` },
                { label: 'Elapsed time', value: duration(run.elapsedSeconds) },
                {
                  label: 'Avg heart rate',
                  value: run.averageHeartRate ? `${Math.round(run.averageHeartRate)} bpm` : '—',
                },
              ].map((metric) => (
                <View key={metric.label} style={{ gap: 9, minWidth: 130 }}>
                  <Label>{metric.label}</Label>
                  <Text selectable style={{ color: C.text, fontSize: 22, fontWeight: '600' }}>
                    {metric.value}
                  </Text>
                </View>
              ))}
            </Row>
          </Card>
          <Title size={18}>Mile splits</Title>
          {run.splits?.length ? (
            run.splits.map((split, i) => (
              <Row
                key={i}
                style={{
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Body>
                  {split.distanceMeters / 1609.344 < 0.95
                    ? `Final ${(split.distanceMeters / 1609.344).toFixed(2)} mi`
                    : `Mile ${i + 1}`}
                </Body>
                <Text style={{ color: C.blue, fontSize: 16 }}>
                  {pace(split.movingSeconds, split.distanceMeters)} / mi
                </Text>
              </Row>
            ))
          ) : (
            <Body>Strava hasn’t provided mile splits for this run.</Body>
          )}
          <Button
            quiet
            icon="arrow"
            onPress={() => void Linking.openURL(`https://www.strava.com/activities/${run.id}`)}
          >
            View on Strava
          </Button>
        </>
      )}
    </Sheet>
  );
}
