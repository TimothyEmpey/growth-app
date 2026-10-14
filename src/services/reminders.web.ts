import {
  defaultReminderPreferences,
  normalizeReminderPreferences,
  type ReminderPermission,
  type ReminderPreferences,
} from '@/domain/reminders';

const STORAGE_KEY = 'growth-reminder-preferences-v1';

export async function loadReminderPreferences(): Promise<ReminderPreferences> {
  const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
  if (!raw) return defaultReminderPreferences;
  try {
    return normalizeReminderPreferences(JSON.parse(raw));
  } catch {
    return defaultReminderPreferences;
  }
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  return 'denied';
}

export async function requestReminderPermission() {
  return false;
}

export async function saveReminderPreferences(preferences: ReminderPreferences) {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
