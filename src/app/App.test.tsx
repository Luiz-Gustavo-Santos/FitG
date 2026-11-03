import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { db } from '../db';
import { parseActivities } from '../integrations/imports/activityParser';
import { AppUpdate } from '../components/ui/AppUpdate';
import { Disclosure } from '../components/ui/Disclosure';
import { Modal } from '../components/ui/Modal';

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

describe('dialogos acessiveis', () => {
  it('mantem Tab e Shift+Tab dentro do dialogo, ignorando controles ocultos ou desabilitados', () => {
    render(
      <Modal title="Revisao" onClose={vi.fn()}>
        <input aria-label="Quantidade" />
        <button type="button">Salvar</button>
        <button type="button" disabled>
          Indisponivel
        </button>
        <div hidden>
          <button type="button">Oculto</button>
        </div>
      </Modal>,
    );
    const first = screen.getByRole('button', { name: 'Fechar' });
    const last = screen.getByRole('button', { name: 'Salvar' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
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
  it('mantem a revisao utilizavel durante uma quantidade temporariamente invalida', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar refeicao' }));
    const banana = screen.getByRole<HTMLInputElement>('spinbutton', {
      name: 'Quantidade de Banana',
    });
    const submit = screen.getByRole<HTMLButtonElement>('button', { name: 'Registrar consumo' });
    fireEvent.change(banana, { target: { value: '0' } });
    expect(screen.getByRole('alert').textContent).toBe('Quantidade deve ser maior que zero.');
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);
    expect(await db.logs.count()).toBe(0);
    fireEvent.click(screen.getByLabelText('Consumir Banana'));
    expect(banana.disabled).toBe(true);
    expect(submit.disabled).toBe(false);
    expect(submit.closest('form')!.checkValidity()).toBe(true);
    fireEvent.click(screen.getByLabelText('Consumir Banana'));
    fireEvent.change(banana, { target: { value: '0.5' } });
    expect(banana.value).toBe('0.5');
    expect(banana.disabled).toBe(false);
    expect(submit.disabled).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(submit.closest('form')!.checkValidity()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await db.logs.count()).toBe(0);
  });
  it('seleciona uma data local, navega pelos dias e retorna a hoje sem criar registros', async () => {
    render(<App />);
    const date = await screen.findByLabelText<HTMLInputElement>('Data dos registros');
    const today = date.value;
    fireEvent.change(date, { target: { value: '2027-01-01' } });
    expect(date.value).toBe('2027-01-01');
    fireEvent.click(screen.getByRole('button', { name: 'Proximo dia' }));
    expect(date.value).toBe('2027-01-02');
    fireEvent.click(screen.getByRole('button', { name: 'Dia anterior' }));
    expect(date.value).toBe('2027-01-01');
    const register = screen.getByRole('button', { name: 'Registrar refeicao' });
    register.focus();
    fireEvent.click(register);
    expect(within(screen.getByRole('dialog')).getByText('01/01/2027')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(document.activeElement).toBe(register);
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(date.value).toBe(today);
    expect(screen.queryByRole('button', { name: 'Hoje' })).toBeNull();
    expect(await db.logs.count()).toBe(0);
  });
  it('resguarda edicao e exclusao no menu, suporta teclado e confirma a exclusao', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cafe da manha' }));
    expect(screen.queryByRole('menuitem')).toBeNull();
    const options = screen.getByRole('button', { name: 'Opcoes de Cafe da manha' });
    fireEvent.click(options);
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Editar plano' }));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Excluir Cafe da manha' }),
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(options);
    fireEvent.click(options);
    fireEvent.pointerDown(screen.getByRole('heading', { name: 'Meu dia' }));
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(options);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar plano' }));
    expect(screen.getByLabelText('Refeicao')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(options);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Excluir Cafe da manha' }));
    expect(await db.meals.count()).toBe(6);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await db.meals.count()).toBe(6);
    fireEvent.click(options);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Excluir Cafe da manha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(async () => expect(await db.meals.count()).toBe(5));
    expect(await db.logs.count()).toBe(0);
  });
  it('nao representa nutrientes desconhecidos como consumo zero ou progresso', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar refeicao' }));
    screen
      .getAllByRole('checkbox')
      .filter((choice) => choice.getAttribute('aria-label') !== 'Consumir Banana')
      .forEach((choice) => fireEvent.click(choice));
    fireEvent.change(screen.getByLabelText('Quantidade de Banana'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    expect(await screen.findByText('Nutrientes nao informados')).toBeTruthy();
    expect(await db.logs.count()).toBe(1);
    expect(screen.queryByRole('progressbar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Resumo e historico' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nutrientes e energia' }));
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
  it('abre somente uma refeicao por vez e permite recolher todas e navegar pelo teclado', async () => {
    const { container } = render(<App />);
    const breakfast = await screen.findByRole('button', { name: 'Cafe da manha' });
    const snack = screen.getByRole('button', { name: 'Lanche da manha' });
    fireEvent.click(breakfast);
    fireEvent.click(snack);
    expect(breakfast.getAttribute('aria-expanded')).toBe('false');
    expect(snack.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelectorAll('.meal-list button[aria-expanded="true"]')).toHaveLength(1);
    fireEvent.click(snack);
    expect(container.querySelectorAll('.meal-list button[aria-expanded="true"]')).toHaveLength(0);
    breakfast.focus();
    fireEvent.keyDown(breakfast, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(snack);
    fireEvent.keyDown(snack, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ceia' }));
  });
  it('oferece porcoes primeiro e preserva ajustes ao personalizar o consumo', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar refeicao' }));
    expect(screen.queryByLabelText('Refeicao')).toBeNull();
    expect(screen.queryByLabelText('Horario')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    fireEvent.change(screen.getByLabelText('Quantidade de Banana'), { target: { value: '0.5' } });
    fireEvent.click(screen.getByLabelText('Consumir Leite'));
    fireEvent.click(screen.getByRole('button', { name: 'Personalizar alimentos' }));
    expect(screen.getByLabelText('Refeicao')).toBeTruthy();
    expect(screen.getByLabelText('Alimento para Banana')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar as porcoes' }));
    expect(
      screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Quantidade de Banana' }).value,
    ).toBe('0.5');
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Consumir Leite' }).checked).toBe(
      false,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    await waitFor(async () => expect(await db.logs.count()).toBe(1));
    const [log] = await db.logs.toArray();
    expect(log.items).toHaveLength(4);
    expect(log.items.find((item) => item.name.includes('Banana'))?.amount).toBe(0.5);
    expect(
      (await db.meals.get('breakfast'))!.items.find((item) => item.name === 'Banana')?.amount,
    ).toBe(1);
  });
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
    fireEvent.click(main.getByRole('button', { name: 'Resumo e historico' }));
    fireEvent.click(main.getByRole('button', { name: 'Nutrientes e energia' }));
    expect(main.queryByRole('progressbar', { name: 'Proteina' })).toBeNull();
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
    await screen.findByText('Dia registrado sem doces');
    fireEvent.click(screen.getByRole('button', { name: 'Doces' }));
    expect(screen.queryByRole('button', { name: 'Sem doces' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Doces' }));
    fireEvent.click(screen.getByTitle('Desfazer registro de doces'));
    await waitFor(async () => expect(await db.sweets.count()).toBe(0));
  });
  it('registra refeicao, atualiza indicadores e permite desfazer sem perder o plano', async () => {
    const { container } = render(<App />);
    await screen.findByRole('button', { name: 'Registrar refeicao' });
    expect(screen.getByText('Ainda sem registros')).toBeTruthy();
    expect(screen.queryByRole('progressbar', { name: 'Consumo registrado' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar refeicao' }));
    expect(container.querySelector('.brand strong')?.textContent?.trim()).toBe('FitG');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    await waitFor(() => expect(container.querySelector('.daily-intake')?.textContent).toBe('581'));
    const progress = screen.getByRole<HTMLProgressElement>('progressbar', {
      name: 'Consumo registrado',
    });
    expect(progress.value).toBe(581.3);
    expect(progress.max).toBe(2800);
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
