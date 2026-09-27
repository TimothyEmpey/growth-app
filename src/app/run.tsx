import { usePreferences } from '@/hooks/use-preferences';
import { distanceValue } from '@/domain/account';
import { useColors } from '@/providers/appearance';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Run } from '@/domain/types';
import { duration, formatDate, pace } from '@/domain/journal';
import { Body, Button, Card, Label, Notice, Row, Sheet, Title } from '@/components/ui';
import { getAppleHealthRun } from '@/services/apple-health';
import { ServiceLogo } from '@/components/service-logo';

export default function RunSheet() {
  const C = useColors();
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const healthRun = source === 'appleHealth' || source === 'nikeRunClub';
  const provider =
    source === 'nikeRunClub' ? 'Nike Run Club' : healthRun ? 'Apple Health' : 'Strava';
  const query = useQuery({
    queryKey: ['run', source ?? 'strava', id],
    queryFn: ({ signal }) =>
      healthRun
        ? getAppleHealthRun(id).then((run) => {
            if (!run) throw new Error('This run is no longer available in Apple Health.');
            return run;
          })
        : api<Run>(`/api/runs/${id}`, { signal }),
    retry: false,
  });
  const { units } = usePreferences();
  const metric = units === 'metric';
  const unit = metric ? 'km' : 'mi';
  const run = query.data;
  const splits = metric ? run?.metricSplits : run?.splits;
  return (
    <Sheet
      title={run?.title ?? 'Run details'}
      subtitle={run ? formatDate(run.localDate) : `From ${provider}`}
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
          <Row>
            <ServiceLogo
              service={
                source === 'nikeRunClub' ? 'nikeRunClub' : healthRun ? 'appleHealth' : 'strava'
              }
              size={38}
            />
            <Label>{provider}</Label>
          </Row>
          <Card style={{ backgroundColor: C.bg }}>
            <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between', gap: 24 }}>
              {[
                {
                  label: 'Distance',
                  value: `${distanceValue(run.distanceMeters, units).toFixed(2)} ${unit}`,
                },
                { label: 'Moving time', value: duration(run.movingSeconds) },
                {
                  label: metric ? 'Kilometer pace' : 'Mile pace',
                  value: `${pace(run.movingSeconds, run.distanceMeters, units)} /${unit}`,
                },
                {
                  label: 'Elevation',
                  value: `${Math.round(run.elevationMeters * (metric ? 1 : 3.28084))} ${metric ? 'm' : 'ft'}`,
                },
                { label: 'Elapsed time', value: duration(run.elapsedSeconds) },
                {
                  label: 'Avg heart rate',
                  value: run.averageHeartRate ? `${Math.round(run.averageHeartRate)} bpm` : '—',
                },
              ].map((metric) => (
                <View key={metric.label} style={{ gap: 9, minWidth: 130 }}>
                  <Label>{metric.label}</Label>
                  <Text style={{ color: C.text, fontSize: 22, fontWeight: '600' }}>
                    {metric.value}
                  </Text>
                </View>
              ))}
            </Row>
          </Card>
          <Title size={18}>{metric ? 'Kilometer splits' : 'Mile splits'}</Title>
          {splits?.length ? (
            splits.map((split, i) => (
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
                  {distanceValue(split.distanceMeters, units) < 0.95
                    ? `Final ${distanceValue(split.distanceMeters, units).toFixed(2)} ${unit}`
                    : `${metric ? 'Kilometer' : 'Mile'} ${i + 1}`}
                </Body>
                <Text style={{ color: C.blue, fontSize: 16 }}>
                  {pace(split.movingSeconds, split.distanceMeters, units)} / {unit}
                </Text>
              </Row>
            ))
          ) : (
            <Body>
              {provider} hasn’t provided {metric ? 'kilometer' : 'mile'} splits for this run.
            </Body>
          )}
          {!healthRun && (
            <Button
              quiet
              icon="arrow"
              onPress={() => void Linking.openURL(`https://www.strava.com/activities/${run.id}`)}
            >
              View on Strava
            </Button>
          )}
        </>
      )}
    </Sheet>
  );
}
