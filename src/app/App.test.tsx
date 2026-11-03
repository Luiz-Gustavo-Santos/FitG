import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { db } from '../db';
import { parseActivities } from '../integrations/imports/activityParser';
import { AppUpdate } from '../components/ui/AppUpdate';

const serviceWorker = vi.hoisted(() => ({ refresh: true, update: vi.fn() }));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [serviceWorker.refresh, vi.fn()],
    updateServiceWorker: serviceWorker.update,
  }),
}));

HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
window.scrollTo = () => {};

beforeEach(async () => {
  serviceWorker.refresh = true;
  serviceWorker.update.mockReset().mockResolvedValue(undefined);
  await db.open();
});

describe('atualizacao segura da PWA', () => {
  it('bloqueia formulario aberto e exige confirmacao apos fecha-lo', async () => {
    const view = render(
      <>
        <form aria-label="Rascunho">
          <input defaultValue="Nao perder" />
        </form>
        <AppUpdate />
      </>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Atualizar FitG' }).disabled,
      ).toBe(true),
    );
    expect(serviceWorker.update).not.toHaveBeenCalled();
    view.rerender(<AppUpdate />);
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Atualizar FitG' }).disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar FitG' }));
    expect(serviceWorker.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar atualizacao' }));
    await waitFor(() => expect(serviceWorker.update).toHaveBeenCalledWith(true));
  });
  it('nao oferece atualizacao sem uma nova versao', () => {
    serviceWorker.refresh = false;
    render(<AppUpdate />);
    expect(screen.queryByRole('button', { name: 'Atualizar FitG' })).toBeNull();
  });
  it('bloqueia dialogos abertos e permite tentar novamente apos erro', async () => {
    const view = render(
      <>
        <dialog open>Acao em andamento</dialog>
        <AppUpdate />
      </>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Atualizar FitG' }).disabled,
      ).toBe(true),
    );
    view.rerender(<AppUpdate />);
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Atualizar FitG' }).disabled,
      ).toBe(false),
    );
    serviceWorker.update.mockRejectedValueOnce(new Error('Offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar FitG' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar atualizacao' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Atualizar FitG' }).disabled,
      ).toBe(false),
    );
  });
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
  it('consulta o snapshot e desfaz consumo mesmo apos alterar e excluir o plano', async () => {
    const { container } = render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar refeicao' }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    await waitFor(async () => expect(await db.logs.count()).toBe(1));
    await db.meals.update('breakfast', {
      name: 'Plano alterado',
      items: [{ id: 'changed', name: 'Item futuro', foodId: null, amount: null }],
    });
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(2)')!);
    const recorded = await screen.findByRole('article', { name: 'Refeicao Cafe da manha' });
    expect(within(recorded).getByText('Banana media (parte comestivel ~90 g)')).toBeTruthy();
    expect(within(recorded).queryByText('Item futuro')).toBeNull();
    await db.meals.delete('breakfast');
    expect(await screen.findByText('Refeicao fora do plano atual')).toBeTruthy();
    fireEvent.click(within(recorded).getByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect(await db.logs.count()).toBe(0));
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Refeicao Cafe da manha' })).toBeNull(),
    );
  });
  it('edita notas de treino importado sem perder precisao ou origem', async () => {
    const { container } = render(<App />);
    await screen.findByRole('button', { name: 'Registrar refeicao' });
    const day = container.querySelector<HTMLInputElement>('input[type="date"]')!.value;
    const [activity] = parseActivities(
      `<gpx><trk><trkseg><trkpt><time>${day}T12:00:00.123Z</time></trkpt><trkpt><time>${day}T12:30:01.123Z</time></trkpt></trkseg></trk></gpx>`,
      'precision',
    );
    activity.distance = 1.2345;
    activity.energy = 200.25;
    await db.activities.put(activity);
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(3)')!);
    fireEvent.click(await screen.findByTitle('Editar treino'));
    const form = screen.getByRole('button', { name: 'Salvar treino' }).closest('form')!;
    expect(form.checkValidity()).toBe(true);
    fireEvent.change(within(form).getByLabelText('Notas'), { target: { value: 'Notas editadas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));
    await waitFor(async () =>
      expect((await db.activities.get(activity.id))?.notes).toBe('Notas editadas'),
    );
    expect(await db.activities.get(activity.id)).toMatchObject({
      ...activity,
      notes: 'Notas editadas',
    });
  });
});
