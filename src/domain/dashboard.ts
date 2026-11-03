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
  const nutrients = totals(logs.flatMap((log) => log.items));
  const exercise = activeEnergy(activities);
  const energy = energyBalance({
    intake: nutrients.kcal,
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
      intake: summary.logs.length ? Math.round(summary.nutrients.kcal) : null,
      protein: summary.logs.length ? Math.round(summary.nutrients.protein) : null,
      tdee: summary.energy.tdee,
      workouts: summary.activities.length,
      weight: data.weights.find((record) => record.day === date)?.kg ?? null,
    };
  });
}
