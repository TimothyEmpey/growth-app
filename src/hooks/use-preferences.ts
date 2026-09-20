import { useState } from 'react';
import type { Period } from '@/domain/types';
import { useJournal, updateJournal } from '@/data/journal-store';
import { normalizePreferences, type Preferences } from '@/domain/account';
export function usePreferences() {
  return useJournal().journal.preferences;
}
export function savePreferences(change: Partial<Preferences>) {
  return updateJournal((journal) => {
    journal.preferences = normalizePreferences({ ...journal.preferences, ...change });
  });
}

// A manual chart selection lasts until the saved default changes.
export function useDefaultPeriod() {
  const { defaultPeriod } = usePreferences();
  const [selection, setSelection] = useState<{ base: Period; value: Period } | null>(null);
  return [
    selection?.base === defaultPeriod ? selection.value : defaultPeriod,
    (value: Period) => setSelection({ base: defaultPeriod, value }),
  ] as const;
}
