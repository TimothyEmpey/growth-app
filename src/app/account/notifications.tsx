import { useEffect, useState } from 'react';
import { Linking, Switch, Text, View } from 'react-native';
import { Body, Button, Card, Label, Notice, Row, Sheet } from '@/components/ui';
import { TimeField } from '@/components/time-field';
import {
  defaultReminderPreferences,
  reminderDefinitions,
  type ReminderId,
  type ReminderPermission,
  type ReminderPreferences,
} from '@/domain/reminders';
import { useColors } from '@/providers/appearance';
import {
  getReminderPermission,
  loadReminderPreferences,
  requestReminderPermission,
  saveReminderPreferences,
} from '@/services/reminders';

const reminderOrder: ReminderId[] = ['weight', 'breakfast', 'lunch', 'dinner', 'workout'];

export default function NotificationsSheet() {
  const C = useColors();
  const [preferences, setPreferences] = useState<ReminderPreferences>(
    defaultReminderPreferences,
  );
  const [permission, setPermission] = useState<ReminderPermission>('undetermined');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void Promise.all([loadReminderPreferences(), getReminderPermission()])
      .then(([stored, status]) => {
        setPreferences(stored);
        setPermission(status);
      })
      .catch(() => setError('Your reminder settings could not be loaded.'))
      .finally(() => setReady(true));
  }, []);

  const persist = async (next: ReminderPreferences) => {
    setPreferences(next);
    setSaving(true);
    setError(undefined);
    try {
      await saveReminderPreferences(next);
    } catch {
      setError('Growth could not update your scheduled reminders.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: ReminderId, enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const granted = await requestReminderPermission();
      const nextPermission = await getReminderPermission();
      setPermission(nextPermission);
      if (!granted) {
        setError('Notifications are off in your device settings.');
        return;
      }
    }
    await persist({ ...preferences, [id]: { ...preferences[id], enabled } });
  };

  const changeTime = (id: ReminderId, hour: number, minute: number) =>
    void persist({ ...preferences, [id]: { ...preferences[id], hour, minute } });

  return (
    <Sheet title="Notifications" subtitle="Private reminders, scheduled on this device.">
      <View style={{ gap: 8 }}>
        <Label>Daily reminders</Label>
        <Body>
          Each reminder is optional. Times follow your device clock and adjust with its time zone.
        </Body>
      </View>
      <Card style={{ paddingVertical: 2, gap: 0 }}>
        {reminderOrder.map((id, index) => {
          const definition = reminderDefinitions[id];
          const setting = preferences[id];
          return (
            <View key={id}>
              {index > 0 && <View style={{ height: 1, backgroundColor: C.border }} />}
              <Row style={{ minHeight: 94, paddingVertical: 16 }}>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ color: C.text, fontSize: 17, fontWeight: '600' }}>
                    {definition.title}
                  </Text>
                  <Body>{definition.detail}</Body>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 9 }}>
                  <Switch
                    accessibilityLabel={`${definition.title} reminder`}
                    disabled={!ready || saving || process.env.EXPO_OS === 'web'}
                    value={setting.enabled}
                    onValueChange={(enabled) => void toggle(id, enabled)}
                    trackColor={{ false: C.border, true: C.blue }}
                    thumbColor="#fff"
                  />
                  <TimeField
                    hour={setting.hour}
                    minute={setting.minute}
                    disabled={!ready || saving || process.env.EXPO_OS === 'web'}
                    onChange={(hour, minute) => changeTime(id, hour, minute)}
                  />
                </View>
              </Row>
            </View>
          );
        })}
      </Card>
      {process.env.EXPO_OS === 'web' && (
        <Body>Daily reminders are available in the Growth iPhone app.</Body>
      )}
      {permission === 'denied' && process.env.EXPO_OS !== 'web' && (
        <Button quiet onPress={() => void Linking.openSettings()}>
          Open notification settings
        </Button>
      )}
      {error && <Notice message={error} />}
      <Body>
        Reminder choices stay on this device. Growth does not send them to your account or a
        notification server.
      </Body>
    </Sheet>
  );
}
