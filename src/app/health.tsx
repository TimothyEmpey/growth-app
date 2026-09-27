import { useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card, Notice, Sheet, Title, useAction } from '@/components/ui';
import { useJournal, updateJournal } from '@/data/journal-store';
import { importHealthWeights } from '@/domain/journal';
import {
  appleHealthAvailable,
  authorizeAppleHealthRuns,
  authorizeAppleHealthWeights,
  getAppleHealthWeights,
} from '@/services/apple-health';

export default function AppleHealthSheet() {
  const { journal } = useJournal();
  const action = useAction();
  const [result, setResult] = useState<string | null>(null);
  const supported = Platform.OS === 'ios' && appleHealthAvailable();

  const connect = () =>
    action.run(async () => {
      if (!(await authorizeAppleHealthRuns())) throw new Error('Apple Health is unavailable.');
      await updateJournal((next) => {
        next.preferences.runSource = 'appleHealth';
        next.preferences.appleHealthConnected = true;
      });
      router.back();
    });

  const importWeights = () =>
    action.run(async () => {
      if (!(await authorizeAppleHealthWeights())) throw new Error('Apple Health is unavailable.');
      const samples = await getAppleHealthWeights();
      let message = '';
      await updateJournal((next) => {
        const imported = importHealthWeights(next.weights, samples);
        next.weights = imported.weights;
        next.preferences.appleHealthConnected = true;
        message = `${imported.imported} ${imported.imported === 1 ? 'day' : 'days'} imported`;
        if (imported.skipped)
          message += ` · ${imported.skipped} existing Growth ${imported.skipped === 1 ? 'entry' : 'entries'} kept`;
      });
      setResult(message || 'No body-weight measurements were available.');
    });

  return (
    <Sheet title="Apple Health" subtitle="Private, read-only access on this iPhone.">
      {!supported ? (
        <Notice message="Apple Health is available in the Growth iPhone app on a physical iPhone." />
      ) : (
        <>
          <Card>
            <Title size={18}>Running workouts</Title>
            <Body>
              Choose Apple Health as your run source to show running workouts recorded by Apple
              Watch, iPhone, or another app that saves workouts to Health.
            </Body>
            <Button loading={action.busy} onPress={() => void connect()}>
              {journal.preferences.appleHealthConnected
                ? 'Use Apple Health for runs'
                : 'Connect Apple Health'}
            </Button>
          </Card>
          <Card>
            <Title size={18}>Body-weight history</Title>
            <Body>
              Import the latest measurement from each calendar day. Existing Growth entries are kept
              when the same day already has a manually logged weight.
            </Body>
            <Button quiet loading={action.busy} onPress={() => void importWeights()}>
              Import weight history
            </Button>
          </Card>
          {result && <Notice message={result} />}
          {action.error && <Notice message={action.error} />}
          <Body>
            Growth reads this data directly from Apple Health. Apple controls which categories and
            date ranges are shared, and you can change access in the Health app at any time.
          </Body>
        </>
      )}
    </Sheet>
  );
}
