export interface EnergyInput {
  intake: number | null;
  fixedTarget: number;
  exercise: number | null;
  tdee: number | null;
  mode: 'fixed' | 'dynamic';
  baseWithoutExercise: number | null;
  incrementalExercise: number | null;
  surplus: number;
}

export function energyBalance(input: EnergyInput) {
  const dynamicTdee =
    input.baseWithoutExercise !== null && input.incrementalExercise !== null
      ? input.baseWithoutExercise + input.incrementalExercise
      : null;
  const tdee = input.mode === 'dynamic' ? dynamicTdee : input.tdee;
  return {
    target:
      input.mode === 'fixed'
        ? input.fixedTarget
        : dynamicTdee === null
          ? null
          : dynamicTdee + input.surplus,
    exercise: input.exercise,
    tdee,
    balance: tdee === null || input.intake === null ? null : input.intake - tdee,
  };
}
