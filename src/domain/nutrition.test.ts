import { describe, expect, it } from 'vitest';
import { foodCatalog, initialMeals } from '../data/initialPlan';
import { portionNutrients, snapshot, totals } from './nutrition';
import { activeEnergy, duplicateKind, sweetsStats } from './activities';
import { daySchema } from '../types';

describe('alimentacao real', () => {
  it('calcula porcao parcial sem somar estimativa ilustrativa', () => {
    expect(
      portionNutrients(
        foodCatalog.find((food) => food.id === 'rice')!,
        50,
      ).kcal,
    ).toBe(64);
  });
  it('mantem desconhecidos sem fabricar nutrientes', () => {
    expect(totals(snapshot(initialMeals[2].items, foodCatalog)).unknown).toBe(2);
  });
  it('preserva snapshot apos editar alimento e plano', () => {
    const foods = structuredClone(foodCatalog);
    const captured = snapshot(initialMeals[0].items, foods);
    const before = totals(captured).kcal;
    foods[0].kcal = 200;
    expect(totals(captured).kcal).toBe(before);
    expect(totals([]).kcal).toBe(0);
  });
  it('rejeita porcoes invalidas', () =>
    expect(() => portionNutrients(foodCatalog[0], -2)).toThrow());
});

describe('datas e registros explicitos', () => {
  it('rejeita dias inexistentes', () => {
    expect(daySchema.safeParse('2026-02-30').success).toBe(false);
    expect(daySchema.safeParse('2026-11-03').success).toBe(true);
  });
  it('nao transforma dias desconhecidos em dias sem doces', () => {
    const stats = sweetsStats(
      [
        { day: '2026-11-01', status: 'free', notes: '' },
        { day: '2026-11-03', status: 'free', notes: '' },
      ],
      '2026-11-03',
    );
    expect(stats).toMatchObject({ current: 1, best: 1, registered: 2, percent: 100 });
    expect(sweetsStats([], '2026-11-03').percent).toBeNull();
  });
  it('nao inventa energia ativa sem treinos', () => expect(activeEnergy([]).value).toBeNull());
});
