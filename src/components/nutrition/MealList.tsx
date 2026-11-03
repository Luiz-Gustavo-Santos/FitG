import { Check, CheckCheck, Pencil, RotateCcw, Trash2, Utensils } from 'lucide-react';
import { useApp } from '../../hooks/useAppData';
import { db } from '../../db';
import { snapshot, totals } from '../../domain/nutrition';
import { dailySummary } from '../../domain/dashboard';
import { number } from '../../utils/dates';
import { Disclosure } from '../ui/Disclosure';

export function MealList() {
  const { data, day, openMeal, run, confirm } = useApp();
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
    <div className="meal-list">
      {entries.length === 0 && <p className="empty-inline">Nenhuma refeicao planejada.</p>}
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
              {meal && (
                <div className="meal-plan-actions">
                  <button className="button ghost" onClick={() => openMeal(meal, true)}>
                    <Pencil size={16} />
                    Editar plano
                  </button>
                  <button
                    className="icon-button"
                    title="Excluir refeicao do plano"
                    aria-label={`Excluir ${meal.name}`}
                    onClick={() =>
                      confirm(
                        'Excluir esta refeicao do plano? Os consumos anteriores serao preservados.',
                        () => db.meals.delete(meal.id),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              )}
            </Disclosure>
          </article>
        );
      })}
    </div>
  );
}
