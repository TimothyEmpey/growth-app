import { describe, expect, test } from 'bun:test';
import { emptyJournal } from '@/domain/journal';
import {
  activityWidgetSnapshot,
  journalWidgetSnapshots,
} from '@/domain/widget-snapshots';

describe('widget snapshots', () => {
  test('selects the heaviest current lift for the Maxes title', () => {
    const journal = emptyJournal();
    journal.lifts = [
      { id: 'bench', exerciseId: 'bench', date: '2026-09-20', pounds: 275, createdAt: 1 },
      { id: 'deadlift', exerciseId: 'deadlift', date: '2026-09-22', pounds: 425, createdAt: 2 },
      { id: 'squat', exerciseId: 'squat', date: '2026-09-21', pounds: 315, createdAt: 3 },
    ];
    expect(journalWidgetSnapshots(journal).maxes.lifts[0]).toEqual({
      name: 'Deadlift',
      value: '425',
      date: 'Sep 22',
    });
  });

  test("uses today's journal entries and current preferences", () => {
    const journal = emptyJournal();
    journal.goals = { calories: 2200, protein: 180, carbs: 240, fat: 70 };
    journal.meals.push({
      id: 'meal',
      date: new Date().toLocaleDateString('en-CA'),
      meal: 'breakfast',
      food: { id: 'food', name: 'Breakfast', per100g: { calories: 0, protein: 0, carbs: 0, fat: 0 }, portions: [] },
      portionId: 'serving',
      quantity: 1,
      nutrition: { calories: 500, protein: 40, carbs: 60, fat: 12 },
    });
    const snapshot = journalWidgetSnapshots(journal).diet;
    expect(snapshot.calories).toBe(500);
    expect(snapshot.protein).toBe(40);
    expect(snapshot.calorieGoal).toBe(2200);
  });

  test('summarizes connected activities for the last-seven-days widget', () => {
    const snapshot = activityWidgetSnapshot(
      [{
        id: 'run', title: 'Morning Run', date: '2026-09-28T12:00:00Z', localDate: '2026-09-28',
        sport: 'Run', distanceMeters: 8046.72, movingSeconds: 2700, elapsedSeconds: 2800,
        elevationMeters: 40, averageHeartRate: null,
      }],
      'us',
    );
    expect(snapshot.count).toBe(1);
    expect(snapshot.distance).toBe('5.0');
    expect(snapshot.movingMinutes).toBe(45);
  });
});
