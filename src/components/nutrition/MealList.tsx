import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import {
  Check,
  CheckCheck,
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
import { Disclosure, DisclosureGroup } from '../ui/Disclosure';
import type { Meal } from '../../types';

export function MealList() {
  const { data, day, openMeal, run } = useApp();
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
  return (
    <div className="meal-list" style={{ '--meal-count': entries.length } as CSSProperties}>
      {entries.length === 0 && <p className="empty-inline">Nenhuma refeicao planejada.</p>}
      <DisclosureGroup>
        {entries.map(({ meal, log }) => {
          const items = log?.items ?? snapshot(meal!.items, data.foods);
          const nutrients = totals(items);
          const name = log?.name ?? meal!.name;
          return (
            <article key={log?.id ?? meal!.id} aria-label={`Refeicao ${name}`}>
              <Disclosure
                title={name}
                summary={log ? 'Consumo registrado' : `${meal!.time} - Pendente`}
                icon={log ? CheckCheck : Utensils}
                className={log ? 'meal-recorded' : ''}
              >
                {!meal && <p className="small muted">Refeicao fora do plano atual</p>}
                <ul className="food-list">
                  {items.map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      <span>{item.name}</span>
                      <span>
                        {item.amount !== null
                          ? `${number(item.amount, 1)} ${item.unit}`
                          : 'A definir'}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="meal-bottom">
                  <div>
                    <strong>
                      {nutrients.unknown === items.length ? '--' : number(nutrients.kcal)}{' '}
                      <small>kcal</small>
                    </strong>
                    <span className="small muted">
                      {log ? 'Consumidas' : 'Planejadas'}
                      {nutrients.unknown > 0 ? ' - parcial' : ' - aprox.'}
                    </span>
                  </div>
                  {log ? (
                    <button
                      className="button ghost"
                      onClick={() => run(() => db.logs.delete(log.id), 'Consumo desfeito.')}
                    >
                      <RotateCcw size={16} />
                      Desfazer
                    </button>
                  ) : (
                    <button className="button primary" onClick={() => openMeal(meal!)}>
                      <Check size={17} />
                      Registrar
                    </button>
                  )}
                </div>
                {meal && <MealOptions meal={meal} />}
              </Disclosure>
            </article>
          );
        })}
      </DisclosureGroup>
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
