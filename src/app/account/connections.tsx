import { ActivityIndicator, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Body, Card, Label, Notice, Sheet } from '@/components/ui';
import { SettingsRow } from '@/components/settings';
import { ServiceLogo } from '@/components/service-logo';
import { useColors } from '@/providers/appearance';
import { useJournal } from '@/data/journal-store';
import { api } from '@/services/api';
import type { Connection } from '@/domain/types';

export default function ConnectionsSheet() {
  const C = useColors();
  const { journal } = useJournal();
  const strava = useQuery({
    queryKey: ['strava'],
    queryFn: ({ signal }) => api<Connection>('/api/strava/status', { signal }),
    retry: false,
  });
  const stravaDetail = strava.data?.connected
    ? `${strava.data.athleteName || 'Connected'} · ${strava.data.importedCount ?? 0} activities`
    : strava.data?.status === 'reconnect'
      ? 'Reconnect required'
      : 'Not connected';

  return (
    <Sheet title="Connections" subtitle="Manage the services that bring your activity into Growth.">
      <Card style={{ paddingVertical: 4, gap: 0 }}>
        <SettingsRow
          icon="run"
          leading={<ServiceLogo service="strava" />}
          title="Strava"
          detail={strava.isPending ? 'Checking connection…' : stravaDetail}
          onPress={() => router.push('/strava')}
        />
        {Platform.OS === 'ios' && (
          <>
            <View style={{ height: 1, backgroundColor: C.border }} />
            <SettingsRow
              icon="link"
              leading={<ServiceLogo service="appleHealth" />}
              title="Apple Health"
              detail={
                journal.preferences.appleHealthConnected
                  ? 'Connected · runs and weight import'
                  : 'Not connected'
              }
              onPress={() => router.push('/health')}
            />
            <View style={{ height: 1, backgroundColor: C.border }} />
            <SettingsRow
              icon="run"
              leading={<ServiceLogo service="nikeRunClub" />}
              title="Nike Run Club"
              detail={
                journal.preferences.appleHealthConnected
                  ? 'Available through Apple Health'
                  : 'Connect through Apple Health'
              }
              onPress={() => router.push('/nike-run-club')}
            />
          </>
        )}
      </Card>
      {strava.isPending && <ActivityIndicator color={C.blue} />}
      {strava.error && <Notice message={strava.error.message} />}
      <View style={{ gap: 8 }}>
        <Label>How connected runs work</Label>
        <Body>
          Growth combines activities from every connected service. Duplicate runs keep the Strava
          version first, then Nike Run Club, then generic Apple Health data.
        </Body>
      </View>
    </Sheet>
  );
}
