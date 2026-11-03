import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { db } from '../db';
import { parseActivities } from '../integrations/imports/activityParser';
import { AppUpdate } from '../components/ui/AppUpdate';
import { Disclosure } from '../components/ui/Disclosure';

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

describe('secoes recolhiveis', () => {
  it('inicia fechada e abre e fecha somente por acao do usuario', () => {
    render(
      <Disclosure title="Cafe da manha" summary="07:30 - Pendente">
        <p>Alimentos da refeicao</p>
        <button>Registrar consumo</button>
      </Disclosure>,
    );
    const trigger = screen.getByRole('button', { name: 'Cafe da manha' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Alimentos da refeicao')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Registrar consumo' })).toBeNull();
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Alimentos da refeicao')).toBeTruthy();
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)).toBeTruthy();
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Registrar consumo' })).toBeNull();
  });
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
  it('inicia a Home sem detalhes e recolhe tudo ao mudar a data', async () => {
    const { container } = render(<App />);
    await screen.findByRole('button', { name: 'Registrar refeicao' });
    const main = within(container.querySelector('main')!);
    expect(container.querySelectorAll('button[aria-expanded="true"]')).toHaveLength(0);
    expect(main.queryByText('Banana media (parte comestivel ~90 g)')).toBeNull();
    expect(main.queryByRole('progressbar', { name: 'Proteina' })).toBeNull();
    expect(main.queryByText('Consumo & energia')).toBeNull();
    fireEvent.click(main.getByRole('button', { name: 'Cafe da manha' }));
    expect(main.getByText('Banana media (parte comestivel ~90 g)')).toBeTruthy();
    fireEvent.click(main.getByRole('button', { name: 'Nutrientes e energia' }));
    expect(main.getByRole('progressbar', { name: 'Proteina' })).toBeTruthy();
    expect(main.getByText('Gasto diario total (TDEE)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Proximo dia' }));
    expect(container.querySelectorAll('button[aria-expanded="true"]')).toHaveLength(0);
    expect(main.queryByText('Banana media (parte comestivel ~90 g)')).toBeNull();
    expect(await db.logs.count()).toBe(0);
  });
  it('mantem semana, graficos, catalogo e configuracoes fechados ao navegar', async () => {
    const { container } = render(<App />);
    await screen.findByRole('button', { name: 'Registrar refeicao' });
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(3)')!);
    expect(
      screen.getByRole('button', { name: 'Plano da semana' }).getAttribute('aria-expanded'),
    ).toBe('false');
    expect(screen.queryByText('SEG')).toBeNull();
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(4)')!);
    expect(
      screen.getByRole('button', { name: 'Grafico de peso' }).getAttribute('aria-expanded'),
    ).toBe('false');
    expect(container.querySelector('.chart-area')).toBeNull();
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(5)')!);
    expect(screen.queryByLabelText('Nome')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Exportar backup JSON' })).toBeNull();
    expect(container.querySelector('.catalog-list')).toBeNull();
    expect(screen.queryByLabelText('Data dos registros')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Integracoes', expanded: false }));
    fireEvent.click(screen.getByRole('button', { name: 'Importar atividades' }));
    expect(
      screen
        .getByRole('button', { name: 'Importacao local de atividades' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
    expect(screen.queryByRole('button', { name: 'Escolher GPX / TCX' })).toBeNull();
  });
  it('preserva o rascunho do perfil ao recolher e salva somente com confirmacao do formulario', async () => {
    const { container } = render(<App />);
    await screen.findByRole('button', { name: 'Registrar refeicao' });
    const original = (await db.profile.get('profile'))!.name;
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(5)')!);
    const profile = screen.getByRole('button', { name: 'Perfil e metas' });
    fireEvent.click(profile);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Rascunho preservado' } });
    fireEvent.click(profile);
    expect(screen.queryByRole('textbox', { name: 'Nome' })).toBeNull();
    expect((await db.profile.get('profile'))!.name).toBe(original);
    fireEvent.click(profile);
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Nome' }).value).toBe(
      'Rascunho preservado',
    );
    expect(
      screen.getByRole('button', { name: 'Salvar perfil' }).closest('form')!.checkValidity(),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    await waitFor(async () =>
      expect((await db.profile.get('profile'))!.name).toBe('Rascunho preservado'),
    );
  });
  it('mantem doces desconhecidos ate um registro explicito dentro da secao', async () => {
    const { container } = render(<App />);
    await screen.findByRole('button', { name: 'Registrar refeicao' });
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(2)')!);
    expect(await db.sweets.count()).toBe(0);
    expect(screen.queryByRole('button', { name: 'Sem doces' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Doces' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sem doces' }));
    await waitFor(async () => expect(await db.sweets.count()).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: 'Doces' }));
    expect(screen.queryByRole('button', { name: 'Sem doces' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Doces' }));
    fireEvent.click(screen.getByTitle('Desfazer registro de doces'));
    await waitFor(async () => expect(await db.sweets.count()).toBe(0));
  });
  it('registra refeicao, atualiza indicadores e permite desfazer sem perder o plano', async () => {
    const { container } = render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar refeicao' }));
    expect(container.querySelector('.brand strong')?.textContent?.trim()).toBe('FitG');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    await waitFor(() => expect(container.querySelector('.daily-intake')?.textContent).toBe('581'));
    expect(await db.logs.count()).toBe(1);
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(2)')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Cafe da manha' }));
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
    expect(within(recorded).queryByText('Banana media (parte comestivel ~90 g)')).toBeNull();
    fireEvent.click(within(recorded).getByRole('button', { name: 'Cafe da manha' }));
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
    fireEvent.click(await screen.findByRole('button', { name: activity.name }));
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
