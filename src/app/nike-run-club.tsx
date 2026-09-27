import { Platform } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card, Notice, Sheet, Title, useAction } from '@/components/ui';
import { ServiceLogo } from '@/components/service-logo';
import { updateJournal } from '@/data/journal-store';
import { appleHealthAvailable, authorizeAppleHealthRuns } from '@/services/apple-health';

export default function NikeRunClubSheet() {
  const action = useAction();
  const supported = Platform.OS === 'ios' && appleHealthAvailable();
  const connect = () =>
    action.run(async () => {
      if (!(await authorizeAppleHealthRuns())) throw new Error('Apple Health is unavailable.');
      await updateJournal((next) => {
        next.preferences.appleHealthConnected = true;
      });
      router.back();
    });

  return (
    <Sheet title="Nike Run Club" subtitle="Import NRC workouts through Apple Health.">
      <ServiceLogo service="nikeRunClub" size={64} />
      <Card>
        <Title size={18}>Connect through Apple Health</Title>
        <Body>
          Nike Run Club does not offer third-party account linking. Its supported connection sends
          NRC workouts to Apple Health, where Growth can read them on this iPhone.
        </Body>
        <Body>
          In iPhone Settings, open Privacy & Security → Health → Nike Run Club and enable workout
          sharing. Then return here and allow Growth to read workouts.
        </Body>
        {supported ? (
          <Button loading={action.busy} onPress={() => void connect()}>
            Connect through Apple Health
          </Button>
        ) : (
          <Notice message="Nike Run Club import is available in the Growth iPhone app." />
        )}
      </Card>
      {action.error && <Notice message={action.error} />}
      <Body>
        Nike Run Club workouts use Nike branding in Growth. If the same workout also appears as a
        generic Apple Health run, Growth keeps the Nike version so it is counted once.
      </Body>
    </Sheet>
  );
}
