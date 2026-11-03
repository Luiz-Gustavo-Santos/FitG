import type { Food, MealLog, Nutrients, Portion } from '../types';

export const emptyNutrients = (): Nutrients => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
export function portionNutrients(food: Food, amount: number): Nutrients {
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error('Quantidade deve ser maior que zero.');
  return scaleNutrients(food, amount / food.basis);
}
function scaleNutrients(nutrients: Nutrients, ratio: number): Nutrients {
  return {
    kcal: nutrients.kcal * ratio,
    protein: nutrients.protein * ratio,
    carbs: nutrients.carbs * ratio,
    fat: nutrients.fat * ratio,
  };
}
export function resizeConsumedItem(
  item: MealLog['items'][number],
  amount: number | null,
): MealLog['items'][number] {
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0))
    throw new Error('Quantidade deve ser maior que zero.');
  if (item.amount === amount) return { ...item };
  return {
    ...item,
    amount,
    nutrients:
      item.amount !== null && item.nutrients !== null && amount !== null
        ? scaleNutrients(item.nutrients, amount / item.amount)
        : null,
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
