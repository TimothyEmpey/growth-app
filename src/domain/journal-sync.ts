import type { Journal } from './types';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function choose<T>(base: T, local: T, remote: T): T {
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  return local;
}

function mergeRecords<T extends { id: string }>(base: T[], local: T[], remote: T[]): T[] {
  const before = new Map(base.map((item) => [item.id, item]));
  const left = new Map(local.map((item) => [item.id, item]));
  const right = new Map(remote.map((item) => [item.id, item]));
  const ids = new Set([...before.keys(), ...left.keys(), ...right.keys()]);
  const merged: T[] = [];
  for (const id of ids) {
    const old = before.get(id),
      localItem = left.get(id),
      remoteItem = right.get(id);
    if (!old) {
      if (localItem && remoteItem) merged.push(localItem);
      else if (localItem || remoteItem) merged.push((localItem ?? remoteItem)!);
    } else if (!localItem && !remoteItem) continue;
    else if (!localItem) {
      if (!same(remoteItem, old)) merged.push(remoteItem!);
    } else if (!remoteItem) {
      if (!same(localItem, old)) merged.push(localItem);
    } else merged.push(choose(old, localItem, remoteItem));
  }
  return merged;
}

function mergeObject<T extends object>(base: T, local: T, remote: T): T {
  const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
  return Object.fromEntries(
    [...keys].map((key) => [
      key,
      choose(
        (base as Record<string, unknown>)[key],
        (local as Record<string, unknown>)[key],
        (remote as Record<string, unknown>)[key],
      ),
    ]),
  ) as T;
}

// Three-way merge keeps independent device edits and treats a delete as final only
// when the other device did not edit the same record after the common base.
export function mergeJournals(base: Journal, local: Journal, remote: Journal): Journal {
  return {
    version: 1,
    weights: mergeRecords(base.weights, local.weights, remote.weights).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    exercises: mergeRecords(base.exercises, local.exercises, remote.exercises),
    lifts: mergeRecords(base.lifts, local.lifts, remote.lifts),
    meals: mergeRecords(base.meals, local.meals, remote.meals),
    foods: mergeRecords(base.foods, local.foods, remote.foods),
    recipes: mergeRecords(base.recipes, local.recipes, remote.recipes),
    goals: mergeObject(base.goals, local.goals, remote.goals),
    preferences: mergeObject(base.preferences, local.preferences, remote.preferences),
    profile: mergeObject(base.profile, local.profile, remote.profile),
  };
}
