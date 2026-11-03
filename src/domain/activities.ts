import type { Activity, Sweets } from '../types';
import { localDay } from '../utils/dates';
import { parseISO, subDays } from 'date-fns';

export function duplicateKind(
  candidate: Activity,
  existing: Activity,
): 'exact' | 'possible' | null {
  if (
    candidate.source === existing.source &&
    candidate.externalId &&
    candidate.externalId === existing.externalId
  )
    return 'exact';
  const closeStart =
    Math.abs(Date.parse(candidate.start) - Date.parse(existing.start)) <= 10 * 60 * 1000;
  const closeDuration =
    Math.abs(candidate.duration - existing.duration) <= Math.max(5, existing.duration * 0.15);
  return closeStart && closeDuration && candidate.sport === existing.sport ? 'possible' : null;
}

export function activeEnergy(activities: Activity[]) {
  const known = activities.filter(
    (activity) => activity.energyType === 'active' && activity.energy !== null,
  );
  return {
    value: known.length ? known.reduce((sum, activity) => sum + activity.energy!, 0) : null,
    incomplete: known.length !== activities.length,
  };
}

export function reviewImport(candidates: Activity[], existing: Activity[]) {
  return candidates.map((activity, index) => {
    const peers = candidates.filter((_, position) => position !== index);
    const conflicts = [...existing, ...peers]
      .filter((record) => duplicateKind(activity, record) === 'possible')
      .map((record) =>
        JSON.stringify([
          record.id,
          record.source,
          record.externalId,
          record.start,
          record.duration,
          record.sport,
        ]),
      );
    const exact = [...existing, ...candidates.slice(0, index)].some(
      (record) => duplicateKind(activity, record) === 'exact',
    );
    return { activity, exact, conflicts };
  });
}

export function prepareImport(
  candidates: Activity[],
  existing: Activity[],
  selected: Set<string>,
  reviewed: Activity[],
) {
  const previous = reviewImport(candidates, reviewed);
  return reviewImport(candidates, existing)
    .filter((entry, index) => {
      if (!selected.has(entry.activity.id) || entry.exact) return false;
      if (entry.conflicts.some((conflict) => !previous[index].conflicts.includes(conflict)))
        throw new Error('As atividades mudaram durante a revisao. Revise as selecoes novamente.');
      return true;
    })
    .map((entry) => entry.activity);
}

export function sweetsStats(records: Sweets[], day: string) {
  const map = new Map(
    records.filter((record) => record.day <= day).map((record) => [record.day, record.status]),
  );
  let cursor = parseISO(day);
  let current = 0;
  while (map.get(localDay(cursor)) === 'free') {
    current += 1;
    cursor = subDays(cursor, 1);
  }
  let best = 0;
  for (const [recordDay, status] of map) {
    if (status !== 'free') continue;
    let length = 0;
    let check = parseISO(recordDay);
    while (map.get(localDay(check)) === 'free') {
      length += 1;
      check = subDays(check, 1);
    }
    best = Math.max(best, length);
  }
  const free = [...map.values()].filter((status) => status === 'free').length;
  return {
    current,
    best,
    registered: map.size,
    free,
    percent: map.size ? (free / map.size) * 100 : null,
  };
}
