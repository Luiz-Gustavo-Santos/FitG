import { useEffect, useId, useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  ArrowUpRight,
  Clock3,
  Plus,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  Utensils,
} from 'lucide-react';
import { useApp } from '../../hooks/useAppData';
import { db } from '../../db';
import { snapshot, totals } from '../../domain/nutrition';
import { dailySummary } from '../../domain/dashboard';
import { number } from '../../utils/dates';
import { Modal } from '../ui/Modal';
import type { Meal } from '../../types';

export function MealList() {
  const { data, day, openMeal, editConsumption, run } = useApp();
  const [detailId, setDetailId] = useState<string | null>(null);
  const summary = dailySummary(data, day);
  const entries = [
    ...data.meals.map((meal) => ({
      meal,
      log: summary.logs.find((log) => log.mealId === meal.id),
    })),
    ...summary.logs
      .filter((log) => !data.meals.some((meal) => meal.id === log.mealId))
      .map((log) => ({ meal: null, log })),
  ];
  const detail = entries.find(({ meal, log }) => (meal?.id ?? log!.mealId) === detailId);
  const detailItems = detail ? (detail.log?.items ?? snapshot(detail.meal!.items, data.foods)) : [];
  const detailNutrients = totals(detailItems);
  return (
    <div className="nutrition-meal-grid">
      {entries.length === 0 && <p className="empty-inline">Nenhuma refeicao planejada.</p>}
      {entries.map(({ meal, log }) => {
        const items = log?.items ?? [];
        const nutrients = totals(items);
        const name = log?.name ?? meal!.name;
        return (
          <article
            className={`nutrition-meal-card ${log ? 'is-recorded' : ''}`}
            key={meal?.id ?? log!.mealId}
            aria-label={`Refeicao ${name}`}
          >
            <span className="nutrition-meal-art" aria-hidden="true">
              <Utensils size={24} />
            </span>
            <div className="nutrition-meal-identity">
              <button
                type="button"
                className="nutrition-meal-title"
                aria-haspopup="dialog"
                onClick={() => setDetailId(meal?.id ?? log!.mealId)}
              >
                {name}
                <ArrowUpRight size={15} />
              </button>
              <span className="nutrition-meal-time">
                <Clock3 size={13} />
                {meal?.time ?? 'Registro avulso'}
              </span>
              {log ? (
                <span className="nutrition-meal-status">
                  <CheckCheck size={13} />
                  Registrada{nutrients.unknown > 0 ? ' · parcial' : ''}
                </span>
              ) : (
                <span className="nutrition-meal-empty">Sem consumo registrado</span>
              )}
            </div>
            <div className="nutrition-meal-values">
              <strong className="nutrition-meal-kcal">
                {nutrients.unknown === items.length ? '--' : number(nutrients.kcal)}{' '}
                <small>kcal</small>
              </strong>
              <span className="nutrition-meal-macros">
                P {nutrients.unknown === items.length ? '--' : number(nutrients.protein)} · C{' '}
                {nutrients.unknown === items.length ? '--' : number(nutrients.carbs)} · G{' '}
                {nutrients.unknown === items.length ? '--' : number(nutrients.fat)} g
              </span>
            </div>
            <div className="nutrition-meal-actions">
              {meal && <MealOptions meal={meal} />}
              {!log && (
                <button
                  className="nutrition-meal-add"
                  type="button"
                  title="Adicionar alimentos"
                  onClick={() => openMeal(meal!)}
                >
                  <Plus size={19} />
                  <span className="sr-only">Adicionar alimentos</span>
                </button>
              )}
            </div>
          </article>
        );
      })}
      {detail && (
        <Modal
          title={detail.log?.name ?? detail.meal!.name}
          onClose={() => setDetailId(null)}
          sheet
        >
          <div className="nutrition-meal-details">
            <p className="muted small">
              {detail.log ? 'Consumo registrado' : 'Refeicao planejada · ainda nao consumida'}
            </p>
            {!detail.meal && <p className="small muted">Refeicao fora do plano atual</p>}
            <strong className="nutrition-detail-kcal">
              {detailNutrients.unknown === detailItems.length ? '--' : number(detailNutrients.kcal)}{' '}
              <small>kcal{detailNutrients.unknown > 0 ? ' (parcial)' : ''}</small>
            </strong>
            <p className="nutrition-detail-macros muted small">
              Proteina{' '}
              {detailNutrients.unknown === detailItems.length
                ? '--'
                : number(detailNutrients.protein)}{' '}
              g · Carboidratos{' '}
              {detailNutrients.unknown === detailItems.length
                ? '--'
                : number(detailNutrients.carbs)}{' '}
              g · Gorduras{' '}
              {detailNutrients.unknown === detailItems.length ? '--' : number(detailNutrients.fat)}{' '}
              g
            </p>
            <ul className="food-list">
              {detailItems.map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  <span>{item.name}</span>
                  <span>
                    {item.amount === null ? 'A definir' : `${number(item.amount, 1)} ${item.unit}`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="form-actions">
              {detail.log ? (
                <>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={async () => {
                      if (await run(() => db.logs.delete(detail.log!.id), 'Consumo desfeito.'))
                        setDetailId(null);
                    }}
                  >
                    <RotateCcw size={16} />
                    Desfazer
                  </button>
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => {
                      setDetailId(null);
                      editConsumption(detail.log!);
                    }}
                  >
                    <Pencil size={16} />
                    Editar consumo
                  </button>
                </>
              ) : (
                <button
                  className="button primary"
                  type="button"
                  onClick={() => {
                    setDetailId(null);
                    openMeal(detail.meal!);
                  }}
                >
                  <Check size={17} />
                  Registrar
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MealOptions({ meal }: Readonly<{ meal: Meal }>) {
  const { openMeal, confirm } = useApp();
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const lastFirst = useRef(false);
  const id = useId();
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    const buttons = root.current!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    buttons[lastFirst.current ? buttons.length - 1 : 0]?.focus();
    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [open]);
  return (
    <div className="meal-options" ref={root}>
      <button
        id={id}
        ref={trigger}
        className="icon-button"
        type="button"
        title="Opcoes da refeicao"
        aria-label={`Opcoes de ${meal.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        onClick={(event) => {
          lastFirst.current = false;
          setAbove(
            event.currentTarget.getBoundingClientRect().bottom + 112 > window.innerHeight - 80,
          );
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            lastFirst.current = event.key === 'ArrowUp';
            setAbove(
              event.currentTarget.getBoundingClientRect().bottom + 112 > window.innerHeight - 80,
            );
            setOpen(true);
          }
        }}
      >
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <div
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={id}
          className={`meal-options-menu ${above ? 'opens-above' : ''}`}
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            const buttons = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
            ];
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                    buttons.length;
            buttons[next]?.focus();
            event.preventDefault();
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              openMeal(meal, true);
            }}
          >
            <Pencil size={17} />
            Editar plano
          </button>
          <button
            type="button"
            role="menuitem"
            className="destructive"
            aria-label={`Excluir ${meal.name}`}
            onClick={() => {
              close();
              confirm(
                'Excluir esta refeicao do plano? Os consumos anteriores serao preservados.',
                () => db.meals.delete(meal.id),
              );
            }}
          >
            <Trash2 size={17} />
            Excluir refeicao
          </button>
        </div>
      )}
    </div>
  );
}
