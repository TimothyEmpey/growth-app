import { View } from 'react-native';
import { Body, Label, Notice, Sheet, useAction } from '@/components/ui';
import { Choice } from '@/components/settings';
import { usePreferences, savePreferences } from '@/hooks/use-preferences';
import type { Preferences, Units } from '@/domain/account';
import type { Period } from '@/domain/types';
export default function PreferencesSheet() {
  const preferences = usePreferences();
  const action = useAction();
  const save = (change: Partial<Preferences>) => void action.run(() => savePreferences(change));
  return (
    <Sheet title="Preferences" subtitle="A few small changes. A better fit.">
      <View style={{ gap: 12 }}>
        <Label>Measurement system</Label>
        {(
          [
            ['us', 'US customary', 'Pounds, feet & inches, miles, and pace per mile.'],
            ['metric', 'Metric', 'Kilograms, centimeters, kilometers, and pace per kilometer.'],
          ] as [Units, string, string][]
        ).map(([value, title, detail]) => (
          <Choice
            key={value}
            value={value}
            selected={preferences.units}
            title={title}
            detail={detail}
            disabled={action.busy}
            onSelect={(units) => save({ units })}
          />
        ))}
        <Body>
          Existing records convert automatically. Food nutrition always uses grams and calories.
        </Body>
      </View>
      <View style={{ gap: 12 }}>
        <Label>Default chart period</Label>
        {(['Week', 'Month', 'Year', 'All'] as Period[]).map((value) => (
          <Choice
            key={value}
            value={value}
            selected={preferences.defaultPeriod}
            title={value === 'All' ? 'All time' : value}
            disabled={action.busy}
            onSelect={(defaultPeriod) => save({ defaultPeriod })}
          />
        ))}
        <Body>Sets the starting view for your lifting and running summaries.</Body>
      </View>
      <View style={{ gap: 12 }}>
        <Label>Open Growth to</Label>
        {(
          [
            ['/', 'Lifting'],
            ['/running', 'Running'],
            ['/diet', 'Diet'],
            ['/account', 'Account'],
          ] as [Preferences['startPage'], string][]
        ).map(([value, title]) => (
          <Choice
            key={value}
            value={value}
            selected={preferences.startPage}
            title={title}
            disabled={action.busy}
            onSelect={(startPage) => save({ startPage })}
          />
        ))}
        <Body>
          Applied the next time you open Growth. Shared links still open their intended page.
        </Body>
      </View>
      {action.error && <Notice message={action.error} />}
    </Sheet>
  );
}
