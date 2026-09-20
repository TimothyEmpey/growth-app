import { usePreferences } from '@/hooks/use-preferences';
import { displayWeight, weightToPounds } from '@/domain/account';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useJournal, updateJournal } from '@/data/journal-store';
import { newId, positive, putWeight, today } from '@/domain/journal';
import {
  dismissSheet,
  Body,
  Button,
  Field,
  JournalReady,
  Notice,
  Sheet,
  useAction,
} from '@/components/ui';
import { DateField } from '@/components/date-field';

export default function WeightSheet() {
  return (
    <JournalReady>
      <WeightForm />
    </JournalReady>
  );
}
function WeightForm() {
  const { units } = usePreferences();
  const unit = units === 'metric' ? 'kg' : 'lb';
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { journal } = useJournal();
  const existing = journal.weights.find((w) => w.id === id);
  const [date, setDate] = useState(existing?.date ?? today());
  const [weight, setWeight] = useState(
    existing ? String(displayWeight(existing.pounds, units)) : '',
  );
  const action = useAction();
  const duplicate = journal.weights.find((w) => w.date === date && w.id !== id);
  return (
    <Sheet
      title={existing ? 'Edit weigh-in' : 'Log your weight'}
      subtitle="Small check-ins. A bigger picture."
    >
      <Field
        label={`Weight (${unit})`}
        keyboardType="decimal-pad"
        autoFocus
        value={weight}
        onChangeText={setWeight}
        placeholder="0.0"
        style={{ fontSize: 32 }}
      />
      <DateField
        value={date}
        onChange={(value) => {
          setDate(value);
          if (!id) {
            const entry = journal.weights.find((w) => w.date === value);
            setWeight(entry ? String(displayWeight(entry.pounds, units)) : '');
          }
        }}
      />
      {duplicate && <Body>This date already has a weigh-in. Saving will update it.</Body>}
      {action.error && <Notice message={action.error} />}
      <Button
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            const source = existing ?? journal.weights.find((w) => w.date === date);
            const pounds =
              source && weight === String(displayWeight(source.pounds, units))
                ? source.pounds
                : weightToPounds(positive(weight), units);
            await updateJournal((j) => {
              j.weights = putWeight(j.weights, {
                id: id ?? duplicate?.id ?? newId(),
                date,
                pounds,
              });
            });
            dismissSheet();
          })
        }
      >
        {existing || duplicate ? 'Save changes' : 'Save weigh-in'}
      </Button>
      {existing && (
        <View>
          <Button
            quiet
            danger
            icon="trash"
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                await updateJournal((j) => {
                  j.weights = j.weights.filter((w) => w.id !== id);
                });
                dismissSheet();
              })
            }
          >
            Delete weigh-in
          </Button>
        </View>
      )}
    </Sheet>
  );
}
