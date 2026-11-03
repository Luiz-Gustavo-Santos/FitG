import { describe, expect, it } from 'vitest';
import { energyBalance, type EnergyInput } from './energyBalance';

const input: EnergyInput = {
  intake: 2100,
  fixedTarget: 2800,
  exercise: 400,
  tdee: null,
  mode: 'fixed',
  baseWithoutExercise: null,
  incrementalExercise: null,
  surplus: 200,
};

describe('balanco energetico', () => {
  it('mantem meta fixa independente do treino e nao inventa TDEE', () => {
    expect(energyBalance(input)).toEqual({
      target: 2800,
      exercise: 400,
      tdee: null,
      balance: null,
    });
  });
  it('calcula saldo contra TDEE, nao contra exercicio', () => {
    expect(energyBalance({ ...input, tdee: 2500 }).balance).toBe(-400);
  });
  it('usa apenas atividade incremental no modo dinamico', () => {
    expect(
      energyBalance({
        ...input,
        mode: 'dynamic',
        baseWithoutExercise: 2000,
        incrementalExercise: 300,
      }),
    ).toEqual({ target: 2500, exercise: 400, tdee: 2300, balance: -200 });
  });
  it('nao fabrica uma meta dinamica sem dados', () => {
    expect(energyBalance({ ...input, mode: 'dynamic' }).target).toBeNull();
  });
});
