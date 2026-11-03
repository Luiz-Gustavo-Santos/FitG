import type { Food, MealLog, Nutrients, Portion } from '../types';

export const emptyNutrients = (): Nutrients => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
export function portionNutrients(food: Food, amount: number): Nutrients {
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error('Quantidade deve ser maior que zero.');
  const ratio = amount / food.basis;
  return {
    kcal: food.kcal * ratio,
    protein: food.protein * ratio,
    carbs: food.carbs * ratio,
    fat: food.fat * ratio,
  };
}
export function snapshot(items: Portion[], foods: Food[]): MealLog['items'] {
  return items.map((item) => {
    const food = foods.find((candidate) => candidate.id === item.foodId);
    return {
      name: food?.name ?? item.name,
      amount: item.amount,
      unit: food?.unit ?? '',
      nutrients: food && item.amount !== null ? portionNutrients(food, item.amount) : null,
    };
  });
}
export function totals(items: MealLog['items']) {
  return items.reduce(
    (result, item) => {
      if (!item.nutrients) return { ...result, unknown: result.unknown + 1 };
      return {
        kcal: result.kcal + item.nutrients.kcal,
        protein: result.protein + item.nutrients.protein,
        carbs: result.carbs + item.nutrients.carbs,
        fat: result.fat + item.nutrients.fat,
        unknown: result.unknown,
      };
    },
    { ...emptyNutrients(), unknown: 0 },
  );
}
