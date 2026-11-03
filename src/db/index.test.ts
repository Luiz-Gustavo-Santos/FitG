import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, ShapeDatabase, initialize, exportBackup, restoreBackup } from './index';

let database: ShapeDatabase;
beforeEach(() => {
  database = new ShapeDatabase('shape-test');
});
afterEach(async () => {
  await database.delete();
});

describe('persistencia e backup', () => {
  it('preserva a identidade legada do banco ao renomear o aplicativo', () => {
    expect(db.name).toBe('shape-26-12');
  });
  it('inicializa uma vez sem historico ficticio e preserva edicoes', async () => {
    await initialize(database);
    await database.profile.update('profile', { kcal: 3000 });
    await initialize(database);
    expect(await database.meals.count()).toBe(6);
    expect(await database.logs.count()).toBe(0);
    expect(await database.weights.count()).toBe(0);
    expect((await database.profile.get('profile'))?.kcal).toBe(3000);
  });
  it('exporta e restaura dados validados', async () => {
    await initialize(database);
    await database.weights.put({ id: 'weight', day: '2026-11-03', kg: 67.2, notes: '' });
    const backup = await exportBackup(database);
    await database.weights.clear();
    await restoreBackup(backup, database);
    expect((await database.weights.get('weight'))?.kg).toBe(67.2);
  });
  it('rejeita backup invalido antes de substituir dados', async () => {
    await initialize(database);
    const backup = await exportBackup(database);
    await expect(
      restoreBackup({ ...backup, profile: { ...backup.profile, kcal: -1 } }, database),
    ).rejects.toThrow();
    expect(await database.meals.count()).toBe(6);
  });
});
