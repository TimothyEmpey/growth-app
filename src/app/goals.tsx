import { useState } from 'react';
import { useJournal, updateJournal } from '@/data/journal-store';
import { nutritionKeys, positive } from '@/domain/journal';
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
import type { Goals } from '@/domain/types';

export default function GoalsSheet() {
  return (
    <JournalReady>
      <GoalsForm />
    </JournalReady>
  );
}
function GoalsForm() {
  const { journal } = useJournal();
  const [values, setValues] = useState(
    Object.fromEntries(nutritionKeys.map((key) => [key, journal.goals[key]?.toString() ?? ''])),
  );
  const action = useAction();
  return (
    <Sheet title="Daily goals" subtitle="Set targets that work for you. Every field is optional.">
      {nutritionKeys.map((key) => (
        <Field
          key={key}
          label={`${key[0].toUpperCase()}${key.slice(1)} (${key === 'calories' ? 'kcal' : 'g'})`}
          value={values[key]}
          onChangeText={(value) => setValues({ ...values, [key]: value })}
          keyboardType="decimal-pad"
          placeholder="No goal"
        />
      ))}
      <Body>
        Goals are reference targets. Your food log always shows what you’ve actually eaten.
      </Body>
      {action.error && <Notice message={action.error} />}
      <Button
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            const goals: Goals = {};
            for (const key of nutritionKeys)
              if (values[key].trim()) goals[key] = positive(values[key]);
            await updateJournal((j) => {
              j.goals = goals;
            });
            dismissSheet('/diet');
          })
        }
      >
        Save goals
      </Button>
    </Sheet>
  );
}
