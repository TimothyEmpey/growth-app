import { shiftDay, today } from '@/domain/journal';
import {
  activityWidgetSnapshot,
  journalWidgetSnapshots,
} from '@/domain/widget-snapshots';
import { mergeConnectedRuns } from '@/domain/runs';
import type { Connection, Journal, Run } from '@/domain/types';
import ActivityWidget from '@/widgets/activity-widget';
import BodyWeightWidget from '@/widgets/body-weight-widget';
import DietWidget from '@/widgets/diet-widget';
import MaxesWidget from '@/widgets/maxes-widget';
import { getAppleHealthRuns } from './apple-health';
import { api } from './api';
import { getAllStravaRuns } from './connected-runs';

export function syncJournalWidgets(journal: Journal) {
  const snapshots = journalWidgetSnapshots(journal);
  BodyWeightWidget.updateSnapshot(snapshots.weight);
  DietWidget.updateSnapshot(snapshots.diet);
  MaxesWidget.updateSnapshot(snapshots.maxes);
}

export async function syncActivityWidget(journal: Journal) {
  const start = shiftDay(today(), -6);
  const end = today();
  let stravaRuns: Run[] = [];
  let healthRuns: Run[] = [];
  try {
    const connection = await api<Connection>('/api/strava/status');
    if (connection.connected) stravaRuns = await getAllStravaRuns(start, end, 'all');
  } catch {
    // Signed-out and offline users can still receive locally imported Health activities.
  }
  if (journal.preferences.appleHealthConnected) {
    try {
      healthRuns = await getAppleHealthRuns(start, end);
    } catch {
      // Keep the previous provider's data from preventing the widget refresh.
    }
  }
  const runs = mergeConnectedRuns(stravaRuns, healthRuns);
  ActivityWidget.updateSnapshot(activityWidgetSnapshot(runs, journal.preferences.units));
}
