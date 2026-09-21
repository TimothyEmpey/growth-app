import { View } from 'react-native';
import { Body, Notice, Sheet, useAction } from '@/components/ui';
import { Choice } from '@/components/settings';
import { usePreferences, savePreferences } from '@/hooks/use-preferences';
import type { Appearance } from '@/domain/account';
export default function AppearanceSheet() {
  const { appearance } = usePreferences();
  const action = useAction();
  return (
    <Sheet title="App appearance" subtitle="Find your favorite light.">
      <View style={{ gap: 12 }}>
        {(
          [
            ['light', 'Light mode', 'A bright, clean canvas for your day.'],
            ['dark', 'Dark mode', 'The familiar charcoal look. Easy on the eyes.'],
            ['system', 'Match system', 'Follow your device’s light and dark setting.'],
            ['coffee', 'Coffee', 'Warm cream, roasted brown, and a touch of caramel.'],
            ['aqua', 'Aqua', 'Fresh sea-glass tones with a crisp teal accent.'],
            ['forest', 'Forest', 'Quiet sage surfaces grounded by deep green.'],
          ] as [Appearance, string, string][]
        ).map(([value, title, detail]) => (
          <Choice
            key={value}
            value={value}
            selected={appearance}
            title={title}
            detail={detail}
            disabled={action.busy}
            onSelect={(appearance) => void action.run(() => savePreferences({ appearance }))}
          />
        ))}
      </View>
      {action.error && <Notice message={action.error} />}
      <Body>Changes apply immediately across Growth and are saved on this device.</Body>
    </Sheet>
  );
}
