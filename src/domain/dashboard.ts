import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { AppData } from '../hooks/useAppData';
import { totals } from './nutrition';
import { activeEnergy } from './activities';
import { energyBalance } from './energyBalance';
import { localDay, recentDays } from '../utils/dates';

export function dailySummary(data: AppData, day: string) {
  const logs = data.logs.filter((log) => log.day === day);
  const activities = data.activities.filter(
    (activity) => localDay(new Date(activity.start)) === day,
  );
  const items = logs.flatMap((log) => log.items);
  const nutrients = totals(items);
  const known = items.length - nutrients.unknown;
  const intake = known ? nutrients.kcal : null;
  let intakeStatus: 'missing' | 'unknown' | 'partial' | 'recorded' = 'recorded';
  if (!items.length) intakeStatus = 'missing';
  else if (!known) intakeStatus = 'unknown';
  else if (nutrients.unknown) intakeStatus = 'partial';
  const exercise = activeEnergy(activities);
  const energy = energyBalance({
    intake,
    fixedTarget: data.profile.kcal,
    exercise: exercise.value,
    tdee: data.profile.tdee,
    mode: data.profile.mode,
    baseWithoutExercise: data.profile.baseWithoutExercise,
    incrementalExercise: null,
    surplus: data.profile.surplus,
  });
  const weight = data.weights.filter((record) => record.day <= day).at(-1);
  return {
    logs,
    activities,
    nutrients,
    intake,
    intakeStatus,
    exercise,
    energy,
    weight,
    daysLeft: Math.max(0, differenceInCalendarDays(parseISO(data.profile.endDay), parseISO(day))),
  };
}

export function history(data: AppData, day: string, count: number) {
  return recentDays(day, count).map((date) => {
    const summary = dailySummary(data, date);
    return {
      day: date,
      label: date.slice(8),
      intake: summary.intake === null ? null : Math.round(summary.intake),
      protein: summary.intake === null ? null : Math.round(summary.nutrients.protein),
      intakeStatus: summary.intakeStatus,
      tdee: summary.energy.tdee,
      workouts: summary.activities.length,
      weight: data.weights.find((record) => record.day === date)?.kg ?? null,
    };
  });
}
