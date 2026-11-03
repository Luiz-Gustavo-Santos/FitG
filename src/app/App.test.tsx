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

async function openNutrition() {
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir alimentacao' }));
}

async function reviewBreakfast() {
  await openNutrition();
  const card = screen.getByRole('article', { name: 'Refeicao Cafe da manha' });
  const register = within(card).getByRole('button', { name: 'Adicionar alimentos' });
  register.focus();
  fireEvent.click(register);
  return register;
}

function returnHome() {
  fireEvent.click(document.querySelector('.sidebar nav button:first-child')!);
}

beforeEach(async () => {
  vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
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
  vi.unstubAllGlobals();
});

describe('fluxo diario da interface', () => {
  it('Sprint 10: cria registro avulso, edita snapshot sem alterar o plano e desfaz', async () => {
    render(<App />);
    await openNutrition();
    const plans = await db.meals.toArray();
    fireEvent.click(screen.getByRole('button', { name: 'Novo registro' }));
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Registrar consumo' }).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText('Refeicao'), { target: { value: 'Lanche avulso' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar alimento' }));
    const food = (await db.foods.toArray())[0];
    fireEvent.change(screen.getByLabelText('Alimento para Alimento adicional'), {
      target: { value: food.id },
    });
    fireEvent.change(screen.getByLabelText(`Quantidade de ${food.name}`), {
      target: { value: String(food.basis) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const original = (await db.logs.toArray())[0];
    expect(original.items[0].nutrients!.kcal).toBe(food.kcal);
    expect(
      screen.getByRole('progressbar', { name: 'Consumo alimentar' }).getAttribute('value'),
    ).toBe(String(food.kcal));
    await db.foods.update(food.id, { kcal: food.kcal * 10 });
    fireEvent.click(screen.getByRole('button', { name: 'Lanche avulso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar consumo' }));
    fireEvent.change(screen.getByLabelText('Refeicao'), { target: { value: 'Lanche revisado' } });
    fireEvent.change(screen.getByLabelText(`Quantidade de ${food.name}`), {
      target: { value: String(food.basis / 2) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar consumo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const revised = (await db.logs.toArray())[0];
    expect(await db.logs.count()).toBe(1);
    expect(revised.id).toBe(original.id);
    expect(revised.items[0].nutrients!.kcal).toBe(food.kcal / 2);
    expect(await db.meals.toArray()).toEqual(plans);
    fireEvent.click(screen.getByRole('button', { name: 'Lanche revisado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await db.logs.count()).toBe(0);
    expect(screen.queryByRole('progressbar', { name: 'Consumo alimentar' })).toBeNull();
  });
  it('Sprint 10: mostra anel calorico e dias sem inventar consumo', async () => {
    render(<App />);
    await openNutrition();
    expect(screen.getByRole('region', { name: 'Calorias e macronutrientes' })).toBeTruthy();
    expect(screen.getByText('Consumo nao informado')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Resumo alimentar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Nova refeicao' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Doces' })).toBeTruthy();
    expect(screen.queryByRole('progressbar', { name: 'Consumo alimentar' })).toBeNull();
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
    expect(await db.logs.count()).toBe(0);
  });
  it('Sprint 09: apresenta destaques reais sem formulario e navega sem criar registros', async () => {
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Destaques' });
    expect(container.querySelector('.meal-list')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cafe da manha' })).toBeNull();
    expect(screen.queryByRole('progressbar', { name: 'Consumo registrado' })).toBeNull();
    expect(screen.getByText('Ainda sem registros')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir alimentacao' }));
    expect(screen.getByRole('button', { name: 'Cafe da manha' })).toBeTruthy();
    fireEvent.click(container.querySelector('.sidebar nav button:first-child')!);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir treinos' }));
    expect(screen.getByRole('button', { name: 'Registrar treino' })).toBeTruthy();
    fireEvent.click(container.querySelector('.sidebar nav button:first-child')!);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir evolucao' }));
    expect(screen.getByRole('button', { name: 'Registrar peso' })).toBeTruthy();
    expect(await db.logs.count()).toBe(0);
    expect(await db.activities.count()).toBe(0);
    expect(await db.weights.count()).toBe(0);
  });
  it('Sprint 09: mostra apenas pesagens reais ate a data selecionada e consistencia de registros', async () => {
    const { container } = render(<App />);
    const date = await screen.findByLabelText<HTMLInputElement>('Data dos registros');
    fireEvent.change(date, { target: { value: '2026-11-03' } });
    expect(screen.queryByRole('button', { name: 'Peso: abrir evolucao' })).toBeNull();
    expect(container.querySelector('.weight-sparkline')).toBeNull();
    await db.weights.bulkPut([
      { id: 'first', day: '2026-11-01', kg: 67, notes: '' },
      { id: 'last', day: '2026-11-03', kg: 67.4, notes: '' },
      { id: 'future', day: '2026-11-04', kg: 68, notes: '' },
    ]);
    const weight = await screen.findByRole('button', { name: 'Peso: abrir evolucao' });
    expect(weight.textContent).toContain('67,4');
    expect(container.querySelector('.weight-sparkline')?.getAttribute('aria-label')).toBe(
      'Pesagens: 2026-11-01: 67 kg; 2026-11-03: 67,4 kg',
    );
    const consistency = screen.getByRole('progressbar', {
      name: 'Dias com alimentacao ou treino registrados nos ultimos sete dias',
    });
    expect(consistency.getAttribute('aria-valuenow')).toBe('0');
    await reviewBreakfast();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    returnHome();
    expect(
      screen
        .getByRole('progressbar', {
          name: 'Dias com alimentacao ou treino registrados nos ultimos sete dias',
        })
        .getAttribute('aria-valuenow'),
    ).toBe('1');
    expect(await db.weights.count()).toBe(3);
  });
  it('mantem a revisao utilizavel durante uma quantidade temporariamente invalida', async () => {
    render(<App />);
    await reviewBreakfast();
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
    const register = await reviewBreakfast();
    expect(within(screen.getByRole('dialog')).getByText('01/01/2027')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(document.activeElement).toBe(register);
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(screen.getByLabelText<HTMLInputElement>('Data dos registros').value).toBe(today);
    expect(screen.queryByRole('button', { name: 'Hoje' })).toBeNull();
    expect(await db.logs.count()).toBe(0);
  });
  it('resguarda edicao e exclusao no menu, suporta teclado e confirma a exclusao', async () => {
    render(<App />);
    await openNutrition();
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
    fireEvent.pointerDown(screen.getByRole('heading', { name: /Alimenta/ }));
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
    await reviewBreakfast();
    screen
      .getAllByRole('checkbox')
      .filter((choice) => choice.getAttribute('aria-label') !== 'Consumir Banana')
      .forEach((choice) => fireEvent.click(choice));
    fireEvent.change(screen.getByLabelText('Quantidade de Banana'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    returnHome();
    expect(await screen.findByText('Nutrientes nao informados')).toBeTruthy();
    expect(await db.logs.count()).toBe(1);
    expect(screen.queryByRole('progressbar', { name: 'Consumo registrado' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Resumo e historico' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nutrientes e energia' }));
    expect(screen.queryByRole('progressbar', { name: 'Consumo registrado' })).toBeNull();
  });
  it('Sprint 10: abre detalhes em painel sem accordions e retorna ao card ao fechar', async () => {
    const { container } = render(<App />);
    await openNutrition();
    const breakfast = await screen.findByRole('button', { name: 'Cafe da manha' });
    expect(container.querySelector('.nutrition-meal-grid .disclosure')).toBeNull();
    breakfast.focus();
    fireEvent.click(breakfast);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Banana media (parte comestivel ~90 g)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(breakfast);
  });
  it('oferece porcoes primeiro e preserva ajustes ao personalizar o consumo', async () => {
    render(<App />);
    await reviewBreakfast();
    expect(screen.getByLabelText<HTMLInputElement>('Refeicao').value).toBe('Cafe da manha');
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
    await screen.findByRole('heading', { name: 'Destaques' });
    const main = within(container.querySelector('main')!);
    expect(container.querySelectorAll('button[aria-expanded="true"]')).toHaveLength(0);
    expect(main.queryByText('Banana media (parte comestivel ~90 g)')).toBeNull();
    expect(main.queryByRole('progressbar', { name: 'Proteina' })).toBeNull();
    expect(main.queryByText('Consumo & energia')).toBeNull();
    expect(main.queryByRole('button', { name: 'Cafe da manha' })).toBeNull();
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
    await screen.findByRole('heading', { name: 'Destaques' });
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
    await screen.findByRole('heading', { name: 'Destaques' });
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
    await screen.findByRole('heading', { name: 'Destaques' });
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
    await screen.findByRole('heading', { name: 'Destaques' });
    expect(screen.getByText('Ainda sem registros')).toBeTruthy();
    expect(screen.queryByRole('progressbar', { name: 'Consumo registrado' })).toBeNull();
    await reviewBreakfast();
    expect(container.querySelector('.brand strong')?.textContent?.trim()).toBe('FitG');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    returnHome();
    await waitFor(() => expect(container.querySelector('.daily-intake')?.textContent).toBe('581'));
    const progress = screen.getByRole('progressbar', {
      name: 'Consumo registrado',
    });
    expect(progress.getAttribute('aria-valuenow')).toBe('581.3');
    expect(progress.getAttribute('aria-valuemax')).toBe('2800');
    expect(await db.logs.count()).toBe(1);
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(2)')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Cafe da manha' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect(await db.logs.count()).toBe(0));
    expect(await db.meals.count()).toBe(6);
  });
  it('consulta o snapshot e desfaz consumo mesmo apos alterar e excluir o plano', async () => {
    const { container } = render(<App />);
    await reviewBreakfast();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar consumo' }));
    await waitFor(async () => expect(await db.logs.count()).toBe(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    returnHome();
    await db.meals.update('breakfast', {
      name: 'Plano alterado',
      items: [{ id: 'changed', name: 'Item futuro', foodId: null, amount: null }],
    });
    fireEvent.click(container.querySelector('.sidebar nav button:nth-child(2)')!);
    const recorded = await screen.findByRole('article', { name: 'Refeicao Cafe da manha' });
    expect(within(recorded).queryByText('Banana media (parte comestivel ~90 g)')).toBeNull();
    fireEvent.click(within(recorded).getByRole('button', { name: 'Cafe da manha' }));
    expect(
      within(screen.getByRole('dialog')).getByText('Banana media (parte comestivel ~90 g)'),
    ).toBeTruthy();
    expect(within(screen.getByRole('dialog')).queryByText('Item futuro')).toBeNull();
    await db.meals.delete('breakfast');
    expect(await screen.findByText('Refeicao fora do plano atual')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect(await db.logs.count()).toBe(0));
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Refeicao Cafe da manha' })).toBeNull(),
    );
  });
  it('cria plano com ingredientes sem APIs exclusivas de contexto seguro', async () => {
    render(<App />);
    await openNutrition();
    expect(crypto.randomUUID).toBeUndefined();
    expect(crypto.subtle).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Nova refeicao' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Editar plano alimentar' }));
    const food = (await db.foods.toArray())[0];
    fireEvent.change(dialog.getByRole('textbox', { name: 'Refeicao' }), {
      target: { value: 'Plano mobile' },
    });
    fireEvent.change(dialog.getByRole('combobox', { name: 'Alimento para Alimento' }), {
      target: { value: food.id },
    });
    fireEvent.change(dialog.getByRole('spinbutton', { name: `Quantidade de ${food.name}` }), {
      target: { value: '100' },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Adicionar alimento' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Remover Alimento adicional' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Salvar plano' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const saved = await db.meals.filter((meal) => meal.name === 'Plano mobile').first();
    expect(saved?.items).toMatchObject([{ foodId: food.id, amount: 100 }]);
    expect(await db.meals.count()).toBe(7);
    expect(await db.logs.count()).toBe(0);
  });
  it('salva treino e exercicio pela navegacao mobile sem randomUUID', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Destaques' });
    const navigation = within(screen.getByRole('navigation', { name: 'Navegacao mobile' }));
    fireEvent.click(navigation.getByRole('button', { name: 'Treinos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar treino' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Treino mobile' },
    });
    fireEvent.change(dialog.getByRole('spinbutton', { name: 'Duracao (min)' }), {
      target: { value: '45' },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Exercicio' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Exercicio' }), {
      target: { value: 'Agachamento' },
    });
    fireEvent.change(dialog.getByRole('spinbutton', { name: 'kg' }), {
      target: { value: '20' },
    });
    fireEvent.click(dialog.getByRole('button', { name: 'Salvar treino' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await db.activities.toArray()).toMatchObject([
      {
        name: 'Treino mobile',
        source: 'manual',
        duration: 45,
        energy: null,
        exercises: [{ name: 'Agachamento', sets: 3, reps: 10, load: 20 }],
      },
    ]);
  });
  it('registra e atualiza peso pela navegacao mobile sem duplicar o dia', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Destaques' });
    const navigation = within(screen.getByRole('navigation', { name: 'Navegacao mobile' }));
    fireEvent.click(navigation.getByRole('button', { name: 'Evolucao' }));
    for (const value of ['67.4', '67.6']) {
      fireEvent.click(screen.getByRole('button', { name: 'Registrar peso' }));
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso (kg)' }), {
        target: { value },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar peso' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
    expect(await db.weights.toArray()).toMatchObject([{ kg: 67.6 }]);
  });
  it('edita notas de treino importado sem perder precisao ou origem', async () => {
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Destaques' });
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
