import { describe, expect, test } from 'bun:test';
import {
  defaultReminderPreferences,
  normalizeReminderPreferences,
} from '../src/domain/reminders';

describe('reminder preferences', () => {
  test('keeps valid choices and repairs invalid or missing times', () => {
    const preferences = normalizeReminderPreferences({
      weight: { enabled: true, hour: 6, minute: 30 },
      breakfast: { enabled: true, hour: 28, minute: -1 },
    });

    expect(preferences.weight).toEqual({ enabled: true, hour: 6, minute: 30 });
    expect(preferences.breakfast).toEqual({
      enabled: true,
      hour: defaultReminderPreferences.breakfast.hour,
      minute: defaultReminderPreferences.breakfast.minute,
    });
    expect(preferences.workout).toEqual(defaultReminderPreferences.workout);
  });
});
