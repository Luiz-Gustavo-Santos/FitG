import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from './App';
import { db } from '../db';

HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
window.scrollTo = () => {};

beforeEach(async () => {
  await db.open();
});
afterEach(async () => {
  cleanup();
  await db.delete();
});

describe('fluxo diario da interface', () => {
  it('registra refeicao, atualiza indicadores e permite desfazer sem perder o plano', async () => {
    const { container } = render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar refeicao' }));
    expect(container.querySelector('.brand strong')?.textContent?.trim()).toBe('FitG');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    await waitFor(() =>
      expect(container.querySelector('.calorie-ring strong')?.textContent).toBe('581'),
    );
    expect(await db.logs.count()).toBe(1);
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(2)')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect(await db.logs.count()).toBe(0));
    expect(await db.meals.count()).toBe(6);
  });
});
