import { Check, CheckCheck, Clock3, Pencil, Plus, RotateCcw, Trash2, Utensils } from 'lucide-react';
import { useApp } from '../hooks/useAppData';
import { db } from '../db';
import { snapshot, totals } from '../domain/nutrition';
import { dailySummary } from '../domain/dashboard';
import { number } from '../utils/dates';

export function Nutrition() {
  const { data, day, openMeal, newMeal, run, confirm } = useApp();
  const summary = dailySummary(data, day);
  const sweets = data.sweets.find((record) => record.day === day);
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
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">COMBUSTIVEL PARA EVOLUIR</span>
          <h2>
            Seu plano alimentar<span className="accent">.</span>
          </h2>
        </div>
        <button className="button primary" onClick={newMeal}>
          <Plus size={18} />
          Nova refeicao
        </button>
      </div>
      <div className="summary-strip">
        <span>
          <strong>{summary.intake === null ? '--' : number(summary.intake)}</strong> /{' '}
          {number(data.profile.kcal)} kcal
        </span>
        <span>{summary.intake === null ? '--' : number(summary.nutrients.protein)} g proteina</span>
        <span>{summary.logs.length} refeicoes registradas</span>
        {summary.nutrients.unknown > 0 && <span className="warning">Valores incompletos</span>}
      </div>
      <div className="meal-grid">
        {entries.map(({ meal, log }) => {
          const items = log?.items ?? snapshot(meal!.items, data.foods);
          const nutrients = totals(items);
          const name = log?.name ?? meal!.name;
          return (
            <article
              className={`meal-card ${log ? 'recorded' : ''}`}
              key={log?.id ?? meal!.id}
              aria-label={`Refeicao ${name}`}
            >
              <div className="meal-top">
                <span className="meal-time">
                  <Clock3 size={15} />
                  {log ? 'Consumo registrado' : meal!.time}
                </span>
                {meal && (
                  <div className="inline-actions">
                    <button
                      className="icon-button"
                      title="Editar plano"
                      aria-label={`Editar plano ${meal.name}`}
                      onClick={() => openMeal(meal, true)}
                    >
                      <Pencil size={16} />
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
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <h3>{name}</h3>
              {!meal && <p className="small muted">Refeicao fora do plano atual</p>}
              <ul className="food-list">
                {items.map((item, index) => {
                  return (
                    <li key={index}>
                      <span>{item.name}</span>
                      <span>
                        {item.amount !== null
                          ? `${number(item.amount, 1)} ${item.unit}`
                          : 'A definir'}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="meal-bottom">
                <div>
                  <strong>
                    {nutrients.unknown === items.length ? '--' : number(nutrients.kcal)}{' '}
                    <small>kcal</small>
                  </strong>
                  <span className="small muted">
                    {log ? 'Consumidas' : 'Planejadas'}
                    {nutrients.unknown > 0 ? ' · parcial' : ' · aprox.'}
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
              {log && (
                <div className="recorded-label">
                  <CheckCheck size={14} />
                  {log.items.length} alimento(s) registrado(s)
                </div>
              )}
            </article>
          );
        })}
      </div>
      <section className="section-block sweets-panel">
        <div>
          <span className="eyebrow">UM DIA DE CADA VEZ</span>
          <h3>Como foi com os doces?</h3>
          <p className="muted">
            {sweets
              ? sweets.status === 'free'
                ? 'Dia registrado sem doces.'
                : 'Consumo registrado. Seguimos no seu ritmo.'
              : 'Este dia ainda nao tem registro.'}
          </p>
        </div>
        <div className="sweets-actions">
          <button
            className={`button ${sweets?.status === 'free' ? 'primary' : 'ghost'}`}
            onClick={() =>
              run(() => db.sweets.put({ day, status: 'free', notes: '' }), 'Dia registrado.')
            }
          >
            <Check size={16} />
            Sem doces
          </button>
          <button
            className={`button ${sweets?.status === 'consumed' ? 'primary' : 'ghost'}`}
            onClick={() =>
              run(() => db.sweets.put({ day, status: 'consumed', notes: '' }), 'Dia registrado.')
            }
          >
            <Utensils size={16} />
            Consumi doces
          </button>
          {sweets && (
            <button
              className="icon-button"
              title="Desfazer registro de doces"
              onClick={() => run(() => db.sweets.delete(day), 'Registro desfeito.')}
            >
              <RotateCcw size={17} />
            </button>
          )}
        </div>
      </section>
    </>
  );
}
