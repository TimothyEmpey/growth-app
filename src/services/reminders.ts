import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  defaultReminderPreferences,
  normalizeReminderPreferences,
  reminderDefinitions,
  type ReminderId,
  type ReminderPermission,
  type ReminderPreferences,
} from '@/domain/reminders';

const STORAGE_KEY = 'growth-reminder-preferences-v1';
const CHANNEL_ID = 'growth-reminders';
let saveQueue: Promise<void> = Promise.resolve();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function loadReminderPreferences(): Promise<ReminderPreferences> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return defaultReminderPreferences;
  try {
    return normalizeReminderPreferences(JSON.parse(raw));
  } catch {
    return defaultReminderPreferences;
  }
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted ? 'granted' : permission.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function saveReminderPreferences(preferences: ReminderPreferences) {
  // Time spinners can emit quickly; serialize rebuilds so the final selection always wins.
  saveQueue = saveQueue.catch(() => undefined).then(async () => {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(preferences));
    await syncScheduledReminders(preferences);
  });
  return saveQueue;
}

// Rebuild only Growth-owned schedules so time edits never duplicate reminders.
async function syncScheduledReminders(preferences: ReminderPreferences) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.content.data?.growthReminderId)
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  await Promise.all(
    (Object.keys(preferences) as ReminderId[])
      .filter((id) => preferences[id].enabled)
      .map((id) => {
        const setting = preferences[id];
        const definition = reminderDefinitions[id];
        return Notifications.scheduleNotificationAsync({
          content: {
            title: definition.notificationTitle,
            body: definition.notificationBody,
            sound: 'default',
            data: { growthReminderId: id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: setting.hour,
            minute: setting.minute,
            channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
          },
        });
      }),
  );
}
