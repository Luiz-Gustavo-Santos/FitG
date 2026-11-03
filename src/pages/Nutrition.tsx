import {
  Beef,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Plus,
  RotateCcw,
  Utensils,
  Wheat,
} from 'lucide-react';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '../hooks/useAppData';
import { db } from '../db';
import { dailySummary } from '../domain/dashboard';
import { localDay, number } from '../utils/dates';
import { MealList } from '../components/nutrition/MealList';
import { Disclosure } from '../components/ui/Disclosure';

export function Nutrition() {
  const { data, day, setDay, newMeal, newConsumption, run } = useApp();
  const summary = dailySummary(data, day);
  const start = startOfWeek(parseISO(day), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => localDay(addDays(start, index)));
  const remaining =
    summary.intake === null || summary.energy.target === null
      ? null
      : summary.energy.target - summary.intake;
  const ratio =
    summary.intake === null || !summary.energy.target
      ? null
      : Math.max(0, Math.min(1, summary.intake / summary.energy.target));
  const macros = [
    { key: 'protein', name: 'Proteina', icon: Beef },
    { key: 'carbs', name: 'Carboidratos', icon: Wheat },
    { key: 'fat', name: 'Gorduras', icon: Droplets },
  ] as const;
  const sweets = data.sweets.find((record) => record.day === day);
  const sweetsLabel = {
    free: 'Dia registrado sem doces',
    consumed: 'Consumo registrado',
  };
  return (
    <div className="app-page nutrition-page">
      <div className="section-heading compact-heading nutrition-heading">
        <h2>Alimenta&ccedil;&atilde;o</h2>
        <div className="nutrition-header-actions">
          <button
            className="button primary nutrition-register"
            type="button"
            onClick={newConsumption}
          >
            <Plus size={17} />
            Novo registro
          </button>
          <label className="nutrition-date-picker">
            <CalendarDays size={18} />
            <span className="sr-only">Data dos registros</span>
            <input
              aria-label="Data dos registros"
              type="date"
              required
              value={day}
              onChange={(event) => {
                if (event.target.value) setDay(event.target.value);
              }}
            />
          </label>
          {day !== localDay() && (
            <button
              className="icon-button"
              type="button"
              aria-label="Hoje"
              title="Voltar para hoje"
              onClick={() => setDay(localDay())}
            >
              <CalendarCheck size={18} />
            </button>
          )}
        </div>
      </div>
      <nav className="nutrition-days" aria-label="Dias da alimentacao">
        <button
          className="icon-button"
          aria-label="Semana anterior"
          onClick={() => setDay(localDay(addDays(parseISO(day), -7)))}
        >
          <ChevronLeft size={17} />
        </button>
        {days.map((date) => (
          <button
            key={date}
            type="button"
            className={date === day ? 'selected' : ''}
            aria-label={`Dia ${date}`}
            aria-pressed={date === day}
            onClick={() => setDay(date)}
          >
            <span>{format(parseISO(date), 'EEEEE', { locale: ptBR })}</span>
            <strong>{format(parseISO(date), 'dd')}</strong>
          </button>
        ))}
        <button
          className="icon-button"
          aria-label="Proxima semana"
          onClick={() => setDay(localDay(addDays(parseISO(day), 7)))}
        >
          <ChevronRight size={17} />
        </button>
      </nav>
      <div className="nutrition-layout">
        <div className="nutrition-main">
          <section className="nutrition-calories" aria-label="Calorias e macronutrientes">
            <div className="nutrition-card-heading">
              <h3>Calorias</h3>
              <Flame size={20} />
              <span>{summary.intakeStatus === 'partial' ? 'Valores parciais' : 'Meta diaria'}</span>
            </div>
            <div className="nutrition-calorie-body">
              <div className="nutrition-calorie-ring">
                <svg viewBox="0 0 200 200" aria-hidden="true">
                  <circle className="nutrition-ring-track" cx="100" cy="100" r="83" />
                  <circle
                    className="nutrition-ring-value"
                    cx="100"
                    cy="100"
                    r="83"
                    pathLength="100"
                    strokeDasharray={`${(ratio ?? 0) * 100} 100`}
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                {ratio !== null && (
                  <progress
                    className="nutrition-native-progress"
                    aria-label="Consumo alimentar"
                    value={summary.intake!}
                    max={summary.energy.target!}
                  />
                )}
                <Flame className="nutrition-ring-icon" size={28} aria-hidden="true" />
              </div>
              <div className="nutrition-remaining">
                <strong>{remaining === null ? '--' : number(Math.abs(remaining))}</strong>
                <span>
                  {remaining !== null && remaining < 0 ? 'Acima da meta' : 'kcal restantes'}
                </span>
                <small>
                  {summary.intake === null
                    ? 'Consumo nao informado'
                    : 'A partir do consumo registrado'}
                </small>
              </div>
              <dl className="nutrition-calorie-totals">
                <div>
                  <dt>Consumidas</dt>
                  <dd>
                    {summary.intake === null ? '--' : number(summary.intake)} <small>kcal</small>
                  </dd>
                </div>
                <div>
                  <dt>Meta alimentar</dt>
                  <dd>
                    {summary.energy.target === null ? '--' : number(summary.energy.target)}{' '}
                    <small>kcal</small>
                  </dd>
                </div>
              </dl>
            </div>
            <div className="nutrition-macros">
              {macros.map(({ key, name, icon: Icon }) => (
                <div key={key} className={`nutrition-macro macro-${key}`}>
                  <span>
                    <Icon size={16} />
                    {name}
                  </span>
                  <strong>
                    {summary.intake === null ? '--' : number(summary.nutrients[key])}
                    <small> / {number(data.profile[key])} g</small>
                  </strong>
                  {summary.intake !== null ? (
                    <progress
                      aria-label={name}
                      value={summary.nutrients[key]}
                      max={data.profile[key]}
                    />
                  ) : (
                    <span className="nutrition-macro-empty" />
                  )}
                </div>
              ))}
            </div>
            {summary.nutrients.unknown > 0 && (
              <output className="nutrition-partial">
                Nutrientes nao informados para {summary.nutrients.unknown} item(ns). Totais
                conhecidos sao parciais.
              </output>
            )}
          </section>
          <div className="nutrition-diary-heading">
            <h3>Refeicoes do dia</h3>
            <div className="nutrition-diary-actions">
              <span>{summary.logs.length} registrada(s)</span>
              <button className="button ghost" type="button" onClick={newMeal}>
                <Plus size={17} />
                Nova refeicao
              </button>
            </div>
          </div>
          <MealList />
        </div>
        <aside className="nutrition-secondary" aria-label="Registro de doces">
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
                  run(
                    () => db.sweets.put({ day, status: 'consumed', notes: '' }),
                    'Dia registrado.',
                  )
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
        </aside>
      </div>
    </div>
  );
}
