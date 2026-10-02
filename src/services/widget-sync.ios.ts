import { shiftDay, today } from '@/domain/journal';
import { activityWidgetSnapshot, journalWidgetSnapshots } from '@/domain/widget-snapshots';
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
  const start = shiftDay(today(), -29);
  const end = today();
  let stravaRuns: Run[] = [];
  let healthRuns: Run[] = [];
  try {
    const connection = await api<Connection>('/api/strava/status');
    if (connection.connected) stravaRuns = await getAllStravaRuns(start, end, 'all');
  } catch {
    // Offline and signed-out users can still populate the widget from local Health data.
  }
  if (journal.preferences.appleHealthConnected) {
    try {
      healthRuns = await getAppleHealthRuns(start, end);
    } catch {
      // A failed provider must not prevent other activity data from refreshing.
    }
  }
  ActivityWidget.updateSnapshot(
    activityWidgetSnapshot(mergeConnectedRuns(stravaRuns, healthRuns), journal.preferences.units),
  );
}
