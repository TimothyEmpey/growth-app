import { useState } from 'react';
import { useJournal, updateJournal } from '@/data/journal-store';
import { nutritionKeys, positiveAtMost } from '@/domain/journal';
import { INPUT_LIMITS } from '@/domain/input';
import {
  dismissSheet,
  Body,
  Button,
  JournalReady,
  NumericField,
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
        <NumericField
          key={key}
          label={`${key[0].toUpperCase()}${key.slice(1)} (${key === 'calories' ? 'cal' : 'g'})`}
          value={values[key]}
          onChangeText={(value) => setValues({ ...values, [key]: value })}
          max={key === 'calories' ? INPUT_LIMITS.calories : INPUT_LIMITS.macroGrams}
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
              if (values[key].trim())
                goals[key] = positiveAtMost(
                  values[key],
                  key === 'calories' ? INPUT_LIMITS.calories : INPUT_LIMITS.macroGrams,
                  `${key} goal`,
                );
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
