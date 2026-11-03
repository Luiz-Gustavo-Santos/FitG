import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import { initialMeals, initialProfile, foodCatalog } from '../data/initialPlan';
import {
  activitySchema,
  foodSchema,
  mealLogSchema,
  mealSchema,
  profileSchema,
  sweetsSchema,
  weightSchema,
} from '../types';
import type { Activity, Food, Meal, MealLog, Profile, Sweets, Weight } from '../types';

export class ShapeDatabase extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  meals!: EntityTable<Meal, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  logs!: EntityTable<MealLog, 'id'>;
  activities!: EntityTable<Activity, 'id'>;
  weights!: EntityTable<Weight, 'id'>;
  sweets!: EntityTable<Sweets, 'day'>;

  constructor(name = 'shape-26-12') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      meals: 'id, time',
      foods: 'id',
      logs: 'id, day, &[day+mealId]',
      activities: 'id, start, [source+externalId]',
      weights: 'id, &day',
      sweets: 'day',
    });
  }
}

export const db = new ShapeDatabase();

export async function initialize(database = db) {
  await database.transaction('rw', database.profile, database.meals, database.foods, async () => {
    if (await database.profile.count()) return;
    await database.profile.put(initialProfile);
    await database.meals.bulkPut(initialMeals);
    await database.foods.bulkPut(foodCatalog);
  });
}

const unique = (values: { id: string }[]) =>
  new Set(values.map((value) => value.id)).size === values.length;
export const backupSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    profile: profileSchema,
    meals: z.array(mealSchema).max(1000).refine(unique, 'IDs de refeicao repetidos'),
    foods: z.array(foodSchema).max(10000).refine(unique, 'IDs de alimento repetidos'),
    logs: z.array(mealLogSchema).max(100000).refine(unique, 'IDs de consumo repetidos'),
    activities: z.array(activitySchema).max(100000).refine(unique, 'IDs de treino repetidos'),
    weights: z.array(weightSchema).max(100000).refine(unique, 'IDs de peso repetidos'),
    sweets: z.array(sweetsSchema).max(100000),
  })
  .superRefine((value, context) => {
    const distinct = (keys: string[], label: string) => {
      if (new Set(keys).size !== keys.length)
        context.addIssue({ code: 'custom', message: `${label} repetidos` });
    };
    distinct(
      value.logs.map((log) => `${log.day}:${log.mealId}`),
      'Registros de refeicao',
    );
    distinct(
      value.weights.map((weight) => weight.day),
      'Dias de peso',
    );
    distinct(
      value.sweets.map((record) => record.day),
      'Dias de doces',
    );
    const foods = new Set(value.foods.map((food) => food.id));
    if (
      value.meals.some((meal) => meal.items.some((item) => item.foodId && !foods.has(item.foodId)))
    )
      context.addIssue({ code: 'custom', message: 'Alimento do plano nao encontrado no catalogo' });
  });

export async function exportBackup(database = db) {
  return database.transaction('r', database.tables, async () =>
    backupSchema.parse({
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: await database.profile.get('profile'),
      meals: await database.meals.toArray(),
      foods: await database.foods.toArray(),
      logs: await database.logs.toArray(),
      activities: await database.activities.toArray(),
      weights: await database.weights.toArray(),
      sweets: await database.sweets.toArray(),
    }),
  );
}

export async function restoreBackup(
  input: unknown,
  database = db,
  options?: { useFixedTarget?: boolean },
) {
  const backup = backupSchema.parse(input);
  if (backup.profile.mode === 'dynamic' && !options?.useFixedTarget)
    throw new Error('Backup com meta dinamica: confirme o uso da meta fixa antes de restaurar.');
  await database.transaction('rw', database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()));
    await database.profile.put(
      options?.useFixedTarget ? { ...backup.profile, mode: 'fixed' } : backup.profile,
    );
    await database.meals.bulkPut(backup.meals);
    await database.foods.bulkPut(backup.foods);
    await database.logs.bulkPut(backup.logs);
    await database.activities.bulkPut(backup.activities);
    await database.weights.bulkPut(backup.weights);
    await database.sweets.bulkPut(backup.sweets);
  });
}
