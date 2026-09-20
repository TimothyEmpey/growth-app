import { useColors } from '@/providers/appearance';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';
import { api } from '@/services/api';
import { linkStrava } from '@/services/auth';
import { clearSession } from '@/services/session';
import type { Connection } from '@/domain/types';
import { Body, Button, Card, Icon, Notice, Sheet, Title, useAction } from '@/components/ui';

export default function StravaSheet() {
  const C = useColors();
  const client = useQueryClient();
  const action = useAction();
  const [confirm, setConfirm] = useState(false);
  const [synced, setSynced] = useState(false);
  const connection = useQuery({
    queryKey: ['strava'],
    queryFn: ({ signal }) => api<Connection>('/api/strava/status', { signal }),
    retry: false,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['strava'] });
    await client.invalidateQueries({ queryKey: ['runs'] });
    await client.invalidateQueries({ queryKey: ['run-days'] });
  };
  return (
    <Sheet
      title={connection.data?.connected ? 'Your Strava connection' : 'Connect with Strava'}
      subtitle="Your runs, automatically in your journal."
    >
      <View style={{ gap: 14 }}>
        <Icon name="run" size={40} color="#fc8a50" />
        <Body>
          Growth reads your running activities, including private runs, to calculate your distance
          and pace. Your activities stay in Strava.
        </Body>
      </View>
      {connection.isPending && <ActivityIndicator color={C.blue} />}
      {connection.error && (
        <>
          <Notice message={connection.error.message} />
          <Button quiet onPress={() => void connection.refetch()}>
            Try again
          </Button>
        </>
      )}
      {connection.data?.connected || connection.data?.status === 'reconnect' ? (
        <>
          <Card style={{ backgroundColor: C.bg }}>
            <Title size={18}>{connection.data.athleteName}</Title>
            <Body>
              {connection.data.lastSync
                ? `Last synced ${new Date(connection.data.lastSync).toLocaleString()}`
                : 'Your first import is starting.'}
            </Body>
            <Body>
              {connection.data.complete
                ? `${connection.data.importedCount ?? 0} runs in your history`
                : 'Importing your complete running history…'}
            </Body>
          </Card>
          {connection.data.connected ? (
            <Button
              loading={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await api('/api/strava/sync', { method: 'POST', body: '{}' });
                  setSynced(true);
                  await refresh();
                })
              }
            >
              Refresh runs
            </Button>
          ) : (
            <Button
              loading={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await linkStrava();
                  await refresh();
                })
              }
            >
              Reconnect with Strava
            </Button>
          )}
          {synced && <Body>Sync requested. Your runs will update shortly.</Body>}
          {confirm ? (
            <>
              <Body>
                Disconnect Strava and remove its cached runs from Growth? Your lifting and food
                journals stay on this device.
              </Body>
              <Button
                quiet
                danger
                loading={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await api('/api/strava/disconnect', { method: 'POST', body: '{}' });
                    await clearSession();
                    client.removeQueries({ queryKey: ['runs'] });
                    client.removeQueries({ queryKey: ['run'] });
                    client.removeQueries({ queryKey: ['run-days'] });
                    setConfirm(false);
                    await refresh();
                  })
                }
              >
                Disconnect and remove runs
              </Button>
              <Button quiet onPress={() => setConfirm(false)}>
                Keep connected
              </Button>
            </>
          ) : (
            <Button quiet onPress={() => setConfirm(true)}>
              Disconnect Strava
            </Button>
          )}
        </>
      ) : connection.data?.configured ? (
        <Button
          loading={action.busy}
          onPress={() =>
            void action.run(async () => {
              await linkStrava();
              await refresh();
            })
          }
        >
          Connect with Strava
        </Button>
      ) : (
        connection.data && (
          <Notice message="Strava is ready to configure. Add your app credentials and callback address using the setup guide, then come back to connect." />
        )
      )}
      {action.error && <Notice message={action.error} />}
      <Body>
        Only you can view the runs connected to your account. You can disconnect at any time.
      </Body>
    </Sheet>
  );
}
