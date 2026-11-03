import { createContext, useContext, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Activity, Food, Meal, MealLog, Profile, Sweets, Weight } from '../types';

export interface AppData {
  profile: Profile;
  foods: Food[];
  meals: Meal[];
  logs: MealLog[];
  activities: Activity[];
  weights: Weight[];
  sweets: Sweets[];
}
export type Page = 'home' | 'nutrition' | 'training' | 'progress' | 'settings' | 'integrations';
export interface AppContextValue {
  data: AppData;
  day: string;
  setDay: (day: string) => void;
  page: Page;
  setPage: (page: Page) => void;
  openMeal: (meal: Meal, plan?: boolean) => void;
  newMeal: () => void;
  openActivity: (activity?: Activity) => void;
  openWeight: () => void;
  run: (action: () => Promise<unknown>, message: string) => Promise<boolean>;
  confirm: (message: string, action: () => Promise<unknown>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ value, children }: { value: AppContextValue; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppProvider ausente');
  return context;
}
export function useAppData() {
  return useLiveQuery(async () => {
    const [profile, foods, meals, logs, activities, weights, sweets] = await Promise.all([
      db.profile.get('profile'),
      db.foods.toArray(),
      db.meals.orderBy('time').toArray(),
      db.logs.toArray(),
      db.activities.orderBy('start').toArray(),
      db.weights.orderBy('day').toArray(),
      db.sweets.toArray(),
    ]);
    return profile ? { profile, foods, meals, logs, activities, weights, sweets } : undefined;
  });
}
