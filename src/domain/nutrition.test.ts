import { describe, expect, it } from 'vitest';
import { foodCatalog, initialMeals, initialProfile } from '../data/initialPlan';
import { dailySummary, history } from './dashboard';
import type { AppData } from '../hooks/useAppData';
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

describe('completude dos indicadores', () => {
  function data(): AppData {
    return {
      profile: { ...initialProfile, tdee: 2500, tdeeSource: 'Estimativa manual' },
      foods: foodCatalog,
      meals: initialMeals,
      logs: [],
      activities: [],
      weights: [],
      sweets: [],
    };
  }
  it('nao calcula deficit sem consumo registrado', () => {
    const summary = dailySummary(data(), '2026-11-03');
    expect(summary.intake).toBeNull();
    expect(summary.intakeStatus).toBe('missing');
    expect(summary.energy.balance).toBeNull();
  });
  it('nao transforma consumo desconhecido em zero nos graficos', () => {
    const records = data();
    records.logs.push({
      id: 'log',
      mealId: 'snack',
      name: 'Lanche',
      day: '2026-11-03',
      recordedAt: '2026-11-03T10:00:00Z',
      items: [{ name: 'Fruta', amount: null, unit: '', nutrients: null }],
    });
    expect(dailySummary(records, '2026-11-03').energy.balance).toBeNull();
    expect(history(records, '2026-11-03', 1)[0]).toMatchObject({
      intake: null,
      protein: null,
      intakeStatus: 'unknown',
    });
  });
  it('identifica valores conhecidos parciais e preserva o saldo contra TDEE', () => {
    const records = data();
    records.logs.push({
      id: 'log',
      mealId: 'lunch',
      name: 'Almoco',
      day: '2026-11-03',
      recordedAt: '2026-11-03T13:00:00Z',
      items: snapshot(initialMeals[2].items, foodCatalog),
    });
    const summary = dailySummary(records, '2026-11-03');
    expect(summary.intakeStatus).toBe('partial');
    expect(summary.energy.balance).toBe(summary.nutrients.kcal - 2500);
    expect(history(records, '2026-11-03', 1)[0].intakeStatus).toBe('partial');
  });
});
