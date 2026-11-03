import { z } from 'zod';

const positive = z.number().positive();
const nonnegative = z.number().nonnegative();
export const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getFullYear() === Number(value.slice(0, 4)) &&
      parsed.getMonth() + 1 === Number(value.slice(5, 7)) &&
      parsed.getDate() === Number(value.slice(8, 10))
    );
  }, 'Data invalida');
export const nutrientsSchema = z.object({
  kcal: nonnegative,
  protein: nonnegative,
  carbs: nonnegative,
  fat: nonnegative,
});
export const foodSchema = nutrientsSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  unit: z.enum(['g', 'ml', 'un']),
  basis: positive,
  source: z.string().min(1),
});
export const portionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  foodId: z.string().nullable(),
  amount: positive.nullable(),
});
export const mealSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  items: z.array(portionSchema).min(1),
});
export const consumedItemSchema = z.object({
  name: z.string().min(1),
  amount: positive.nullable(),
  unit: z.string(),
  nutrients: nutrientsSchema.nullable(),
});
export const mealLogSchema = z.object({
  id: z.string().min(1),
  day: daySchema,
  mealId: z.string().min(1),
  name: z.string().min(1),
  items: z.array(consumedItemSchema).min(1),
  recordedAt: z.iso.datetime(),
});
export const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: positive.int(),
  reps: positive.int(),
  load: nonnegative,
});
export const activitySchema = z.object({
  id: z.string().min(1),
  externalId: z.string().nullable(),
  source: z.enum(['manual', 'gpx', 'tcx', 'strava', 'apple-health']),
  name: z.string().min(1),
  sport: z.string().min(1),
  start: z.iso.datetime({ offset: true }),
  duration: positive,
  distance: nonnegative.nullable(),
  heartRate: positive.nullable(),
  energy: nonnegative.nullable(),
  energyType: z.enum(['active', 'total', 'unknown']),
  notes: z.string(),
  exercises: z.array(exerciseSchema),
  importedAt: z.iso.datetime().nullable(),
});
export const weightSchema = z.object({
  id: z.string().min(1),
  day: daySchema,
  kg: positive.max(500),
  notes: z.string(),
});
export const sweetsSchema = z.object({
  day: daySchema,
  status: z.enum(['free', 'consumed']),
  notes: z.string(),
});
export const profileSchema = z
  .object({
    id: z.literal('profile'),
    name: z.string().min(1),
    age: positive.int().max(120),
    height: positive.max(250),
    initialWeight: positive.max(500),
    goalWeight: positive.max(500),
    startDay: daySchema,
    endDay: daySchema,
    kcal: positive,
    protein: positive,
    carbs: positive,
    fat: positive,
    mode: z.enum(['fixed', 'dynamic']),
    tdee: positive.nullable(),
    tdeeSource: z.string(),
    baseWithoutExercise: positive.nullable(),
    surplus: nonnegative,
  })
  .refine((value) => value.endDay >= value.startDay, 'O fim deve ser posterior ao inicio')
  .refine(
    (value) => value.tdee === null || value.tdeeSource.trim().length > 0,
    'Informe a origem do TDEE',
  );

export type Nutrients = z.infer<typeof nutrientsSchema>;
export type Food = z.infer<typeof foodSchema>;
export type Portion = z.infer<typeof portionSchema>;
export type Meal = z.infer<typeof mealSchema>;
export type MealLog = z.infer<typeof mealLogSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Weight = z.infer<typeof weightSchema>;
export type Sweets = z.infer<typeof sweetsSchema>;
export type Profile = z.infer<typeof profileSchema>;
