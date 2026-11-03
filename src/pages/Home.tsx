import { Activity, Dumbbell, Plus, Scale, Utensils, Zap } from 'lucide-react';
import { parseISO } from 'date-fns';
import { useApp } from '../hooks/useAppData';
import { dailySummary } from '../domain/dashboard';
import { weeklyPlan } from '../data/initialPlan';
import { number } from '../utils/dates';
import { HistoryChart } from '../components/charts/HistoryChart';
import { Disclosure } from '../components/ui/Disclosure';
import { MealList } from '../components/nutrition/MealList';

export function Home() {
  const { data, day, setPage, openActivity, openWeight, openMeal } = useApp();
  const { nutrients, intake, intakeStatus, energy, exercise, logs, weight, daysLeft, activities } =
    dailySummary(data, day);
  const pending = data.meals.find((meal) => !logs.some((log) => log.mealId === meal.id));
  const intakeLabels = {
    missing: 'Sem registros',
    unknown: 'Nutrientes desconhecidos',
    partial: 'Consumo parcial',
    recorded: 'Meta alimentar',
  };
  let exerciseLabel = 'Nao informado';
  if (exercise.value !== null) {
    exerciseLabel = `${number(exercise.value)} kcal${exercise.incomplete ? ' (parcial)' : ''}`;
  }
  let balanceLabel = '--';
  if (energy.balance !== null) {
    balanceLabel = `${energy.balance > 0 ? '+' : ''}${number(energy.balance)} kcal`;
  }
  return (
    <div className="app-page">
      <div className="section-heading compact-heading">
        <h2>Meu dia</h2>
        <span className="small muted">{logs.length} refeicoes registradas</span>
      </div>
      <div className="daily-overview" aria-label="Resumo do dia">
        {intake === null ? (
          <div className="daily-empty">
            <strong>
              {intakeStatus === 'missing' ? 'Ainda sem registros' : 'Nutrientes nao informados'}
            </strong>
            <span>
              Meta: {energy.target === null ? 'nao definida' : `${number(energy.target)} kcal`}
            </span>
          </div>
        ) : (
          <>
            <div>
              <span>Consumo registrado</span>
              <strong className="daily-intake">{number(intake)}</strong>
            </div>
            <div>
              <span>de {energy.target === null ? '--' : number(energy.target)} kcal</span>
              <small>{intakeLabels[intakeStatus]}</small>
            </div>
          </>
        )}
      </div>
      {intake !== null && energy.target !== null && energy.target > 0 && (
        <progress
          className="calorie-progress"
          aria-label="Consumo registrado"
          aria-valuetext={`${number(intake)} de ${number(energy.target)} kcal${intakeStatus === 'partial' ? ' (parcial)' : ''}`}
          max={energy.target}
          value={intake}
        />
      )}
      <div className="quick-actions">
        <button
          className="button primary"
          onClick={() => (pending ? openMeal(pending) : setPage('nutrition'))}
        >
          <Utensils size={18} />
          Registrar refeicao
        </button>
        <button className="button ghost" onClick={() => openActivity()}>
          <Plus size={18} />
          Registrar treino
        </button>
      </div>
      <h3 className="list-heading">Refeicoes</h3>
      <MealList />
      <div className="section-list">
        <Disclosure
          title="Resumo e historico"
          summary="Nutrientes, treino e objetivo"
          icon={Activity}
        >
          <div className="secondary-sections">
            <Disclosure title="Nutrientes e energia" summary="Macros, meta e saldo" icon={Zap}>
              <div className="macro-bars">
                {(
                  [
                    { key: 'protein', label: 'Proteina', color: '#b6ff4d' },
                    { key: 'carbs', label: 'Carboidratos', color: '#39ff88' },
                    { key: 'fat', label: 'Gorduras', color: '#00c896' },
                  ] as const
                ).map((macro) => (
                  <div key={macro.key}>
                    <div>
                      <span>{macro.label}</span>
                      <strong>
                        {intake === null ? '--' : number(nutrients[macro.key])}
                        <small> / {data.profile[macro.key]} g</small>
                      </strong>
                    </div>
                    {intake !== null && (
                      <progress
                        aria-label={macro.label}
                        max={data.profile[macro.key]}
                        value={nutrients[macro.key]}
                        style={{ '--bar-color': macro.color } as React.CSSProperties}
                      />
                    )}
                  </div>
                ))}
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Meta alimentar</dt>
                  <dd>
                    {energy.target === null ? 'Nao definida' : `${number(energy.target)} kcal`}
                  </dd>
                </div>
                <div>
                  <dt>Exercicio ativo</dt>
                  <dd>{exerciseLabel}</dd>
                </div>
                <div>
                  <dt>Gasto diario total (TDEE)</dt>
                  <dd>{energy.tdee === null ? 'Nao informado' : `${number(energy.tdee)} kcal`}</dd>
                </div>
                <div>
                  <dt>Saldo energetico parcial</dt>
                  <dd>{balanceLabel}</dd>
                </div>
              </dl>
              <p className="method-note">
                Ingestao registrada menos gasto diario total (TDEE). Sem consumo conhecido ou TDEE,
                o saldo e desconhecido. Nao representa o fechamento do dia.{' '}
                {data.profile.mode === 'fixed'
                  ? 'O treino nao aumenta a meta fixa.'
                  : 'A meta dinamica requer atividade incremental confirmada.'}{' '}
                {data.profile.tdeeSource && `Fonte TDEE: ${data.profile.tdeeSource}.`}
              </p>
            </Disclosure>
            <Disclosure
              title="Treino do dia"
              summary={`${activities.length} registrados - ${weeklyPlan[parseISO(day).getDay()]}`}
              icon={Dumbbell}
            >
              {activities.length === 0 && <p className="muted">Nenhum treino registrado.</p>}
              <div className="action-row">
                <button className="button primary" onClick={() => openActivity()}>
                  <Plus size={17} />
                  Registrar treino
                </button>
                <button className="button ghost" onClick={() => setPage('training')}>
                  Ver treinos
                </button>
              </div>
            </Disclosure>
            <Disclosure
              title="Peso e objetivo"
              summary={weight ? `${number(weight.kg, 1)} kg registrados` : 'Sem pesagem registrada'}
              icon={Scale}
            >
              <dl className="detail-list">
                <div>
                  <dt>Ultimo peso</dt>
                  <dd>
                    {weight
                      ? `${number(weight.kg, 1)} kg em ${weight.day.split('-').reverse().join('/')}`
                      : 'Nao registrado'}
                  </dd>
                </div>
                <div>
                  <dt>Peso de referencia</dt>
                  <dd>{number(data.profile.goalWeight, 1)} kg</dd>
                </div>
                <div>
                  <dt>Prazo da meta</dt>
                  <dd>
                    {daysLeft > 0 ? `${daysLeft} dias` : 'Periodo encerrado; historico preservado'}
                  </dd>
                </div>
              </dl>
              <div className="action-row">
                <button className="button primary" onClick={openWeight}>
                  <Plus size={17} />
                  Registrar peso
                </button>
                <button className="button ghost" onClick={() => setPage('settings')}>
                  Editar meta
                </button>
              </div>
            </Disclosure>
            <Disclosure title="Historico" summary="Consumo e gasto diario estimado" icon={Activity}>
              <HistoryChart />
            </Disclosure>
          </div>
        </Disclosure>
      </div>
    </div>
  );
}
