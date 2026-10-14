export type ReminderId = 'weight' | 'breakfast' | 'lunch' | 'dinner' | 'workout';

export type ReminderSetting = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export type ReminderPreferences = Record<ReminderId, ReminderSetting>;

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

export const reminderDefinitions: Record<
  ReminderId,
  { title: string; detail: string; notificationTitle: string; notificationBody: string }
> = {
  weight: {
    title: 'Log weight',
    detail: 'A quick daily check-in.',
    notificationTitle: 'Log your weight',
    notificationBody: "Take a moment to add today's weight.",
  },
  breakfast: {
    title: 'Log breakfast',
    detail: 'Keep the start of your day accounted for.',
    notificationTitle: 'Log breakfast',
    notificationBody: 'Add breakfast while it is still fresh in your mind.',
  },
  lunch: {
    title: 'Log lunch',
    detail: 'A midday meal reminder.',
    notificationTitle: 'Log lunch',
    notificationBody: 'Take a moment to add your lunch.',
  },
  dinner: {
    title: 'Log dinner',
    detail: 'Wrap up your daily food journal.',
    notificationTitle: 'Log dinner',
    notificationBody: 'Add dinner to complete your food journal.',
  },
  workout: {
    title: 'Workout reminder',
    detail: 'A gentle evening nudge to move.',
    notificationTitle: 'You can still get a workout in',
    notificationBody: 'A little movement today still counts.',
  },
};

export const defaultReminderPreferences: ReminderPreferences = {
  weight: { enabled: false, hour: 7, minute: 0 },
  breakfast: { enabled: false, hour: 7, minute: 0 },
  lunch: { enabled: false, hour: 12, minute: 0 },
  dinner: { enabled: false, hour: 18, minute: 0 },
  workout: { enabled: false, hour: 20, minute: 0 },
};

export function normalizeReminderPreferences(value: unknown): ReminderPreferences {
  const stored = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(
    (Object.keys(defaultReminderPreferences) as ReminderId[]).map((id) => {
      const candidate = (stored as Partial<ReminderPreferences>)[id];
      const fallback = defaultReminderPreferences[id];
      return [
        id,
        {
          enabled: candidate?.enabled === true,
          hour:
            Number.isInteger(candidate?.hour) && candidate!.hour >= 0 && candidate!.hour <= 23
              ? candidate!.hour
              : fallback.hour,
          minute:
            Number.isInteger(candidate?.minute) && candidate!.minute >= 0 && candidate!.minute <= 59
              ? candidate!.minute
              : fallback.minute,
        },
      ];
    }),
  ) as ReminderPreferences;
}

export function formatReminderTime({ hour, minute }: Pick<ReminderSetting, 'hour' | 'minute'>) {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}
