import { Check, Plus, RotateCcw, Utensils } from 'lucide-react';
import { useApp } from '../hooks/useAppData';
import { db } from '../db';
import { dailySummary } from '../domain/dashboard';
import { number } from '../utils/dates';
import { MealList } from '../components/nutrition/MealList';
import { Disclosure } from '../components/ui/Disclosure';

export function Nutrition() {
  const { data, day, newMeal, run } = useApp();
  const summary = dailySummary(data, day);
  const sweets = data.sweets.find((record) => record.day === day);
  const sweetsLabel = {
    free: 'Dia registrado sem doces',
    consumed: 'Consumo registrado',
  };
  return (
    <div className="app-page">
      <div className="section-heading compact-heading">
        <h2>Alimentacao</h2>
        <button className="button primary" onClick={newMeal}>
          <Plus size={18} />
          Nova refeicao
        </button>
      </div>
      <MealList />
      <div className="section-list">
        <Disclosure
          title="Resumo alimentar"
          summary={`${summary.logs.length} refeicoes registradas`}
          icon={Utensils}
        >
          <dl className="detail-list">
            <div>
              <dt>Consumo</dt>
              <dd>
                {summary.intake === null ? '--' : number(summary.intake)} /{' '}
                {number(data.profile.kcal)} kcal
              </dd>
            </div>
            <div>
              <dt>Proteina</dt>
              <dd>{summary.intake === null ? '--' : number(summary.nutrients.protein)} g</dd>
            </div>
          </dl>
          {summary.nutrients.unknown > 0 && <p className="warning small">Valores incompletos</p>}
        </Disclosure>
        <Disclosure
          title="Doces"
          summary={sweets ? sweetsLabel[sweets.status] : 'Sem registro neste dia'}
          icon={Check}
        >
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
        </Disclosure>
      </div>
    </div>
  );
}
