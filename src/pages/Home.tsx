import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Plus,
  Scale,
  Target,
  Utensils,
  Zap,
} from 'lucide-react';
import { parseISO } from 'date-fns';
import { useApp } from '../hooks/useAppData';
import { dailySummary } from '../domain/dashboard';
import { weeklyPlan } from '../data/initialPlan';
import { number } from '../utils/dates';
import { HistoryChart } from '../components/charts/HistoryChart';

export function Home() {
  const { data, day, setPage, openActivity, openWeight, openMeal } = useApp();
  const { nutrients, intake, intakeStatus, energy, exercise, logs, weight, daysLeft, activities } =
    dailySummary(data, day);
  const pending = data.meals.filter((meal) => !logs.some((log) => log.mealId === meal.id));
  const progress = energy.target ? Math.min(100, (nutrients.kcal / energy.target) * 100) : 0;
  return (
    <>
      <div className="home-greeting">
        <div>
          <span className="eyebrow">SEU PROJETO DE EVOLUCAO</span>
          <h2>
            Construa sua <em>melhor versao.</em>
          </h2>
          <p>Um dia consistente. Um passo mais perto.</p>
        </div>
        <div className="goal-count">
          <span className="status-dot" />
          {daysLeft > 0 ? (
            <>
              <strong>{daysLeft}</strong>
              <span>dias ate sua meta</span>
            </>
          ) : (
            <>
              <Target size={19} />
              <span>Seu historico continua</span>
            </>
          )}
        </div>
      </div>
      <div className="dashboard-top">
        <section className="fuel-panel">
          <div className="panel-heading">
            <div className="icon-label">
              <Flame size={18} />
              <h3>Energia do dia</h3>
            </div>
            <span className="tag">
              {data.profile.mode === 'fixed' ? 'META FIXA' : 'META DINAMICA'}
            </span>
          </div>
          <div className="fuel-content">
            <div
              className="calorie-ring"
              role="img"
              aria-label={
                intake === null
                  ? 'Consumo nao informado'
                  : `${number(progress)} por cento da meta calorica registrada`
              }
              style={{ '--progress': `${progress}%` } as React.CSSProperties}
            >
              <div>
                <Flame size={23} />
                <strong>{intake === null ? '--' : number(intake)}</strong>
                <span>de {energy.target === null ? '?' : number(energy.target)} kcal</span>
              </div>
            </div>
            <div className="fuel-details">
              <span className="eyebrow">SEU COMBUSTIVEL</span>
              <h4>
                {nutrients.kcal === 0 ? 'Pronto para comecar?' : `${number(progress)}% da meta`}
              </h4>
              <p>
                {nutrients.unknown
                  ? 'Consumo parcial: existem alimentos com nutrientes desconhecidos.'
                  : logs.length
                    ? 'Consumo calculado pelas porcoes registradas.'
                    : 'Suas refeicoes de hoje ainda estao por vir.'}
              </p>
              <button
                className="button primary"
                onClick={() => (pending[0] ? openMeal(pending[0]) : setPage('nutrition'))}
              >
                <Plus size={16} />
                Registrar refeicao
              </button>
            </div>
          </div>
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
                <progress
                  aria-label={macro.label}
                  max={data.profile[macro.key]}
                  value={nutrients[macro.key]}
                  style={{ '--bar-color': macro.color } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </section>
        <section className="balance-panel">
          <div className="panel-heading">
            <div className="icon-label">
              <Zap size={18} />
              <h3>Energy Balance</h3>
            </div>
            <span className="small muted">kcal</span>
          </div>
          <div className="balance-row">
            <span>
              <ArrowDownRight size={16} />
              Consumo registrado
            </span>
            <strong>
              {intake === null
                ? intakeStatus === 'unknown'
                  ? 'Desconhecido'
                  : 'Sem registros'
                : `${number(intake)}${nutrients.unknown > 0 ? ' (parcial)' : ''}`}
            </strong>
          </div>
          <div className="balance-row">
            <span>
              <Target size={16} />
              Meta alimentar
            </span>
            <strong>{energy.target === null ? 'Nao definida' : number(energy.target)}</strong>
          </div>
          <div className="balance-row">
            <span>
              <Dumbbell size={16} />
              Exercicio ativo
            </span>
            <strong>
              {exercise.value === null
                ? 'Nao informado'
                : `${number(exercise.value)}${exercise.incomplete ? '*' : ''}`}
            </strong>
          </div>
          <div className="balance-row">
            <span>
              <Flame size={16} />
              TDEE estimado
            </span>
            <strong>{energy.tdee === null ? 'Nao informado' : number(energy.tdee)}</strong>
          </div>
          <div className="balance-total">
            <div>
              <span>Saldo energetico{energy.balance !== null ? ' parcial' : ''}</span>
              <strong>
                {energy.balance === null
                  ? '--'
                  : `${energy.balance > 0 ? '+' : ''}${number(energy.balance)}`}
                <small>
                  {energy.balance === null
                    ? energy.tdee === null
                      ? ' TDEE necessario'
                      : ' Consumo necessario'
                    : ' kcal'}
                </small>
              </strong>
            </div>
            <ArrowUpRight size={24} />
          </div>
          <p className="method-note">
            Ingestao registrada menos gasto diario total (TDEE). O saldo nao confirma o fechamento
            do dia.{' '}
            {data.profile.mode === 'fixed'
              ? 'O treino nao aumenta a meta fixa.'
              : 'A meta dinamica requer atividade incremental confirmada.'}{' '}
            {data.profile.tdeeSource && `Fonte TDEE: ${data.profile.tdeeSource}.`}
          </p>
        </section>
      </div>
      <div className="metric-grid">
        {[
          {
            icon: Utensils,
            label: 'Refeicoes registradas',
            value: `${logs.length}`,
            unit: 'registros',
            detail: 'Seu ritmo de hoje',
            action: () => setPage('nutrition'),
          },
          {
            icon: Dumbbell,
            label: 'Treinos do dia',
            value: `${activities.length}`,
            unit: 'treinos',
            detail: weeklyPlan[parseISO(day).getDay()],
            action: () => setPage('training'),
          },
          {
            icon: Scale,
            label: 'Ultimo peso registrado',
            value: weight ? number(weight.kg, 1) : '--',
            unit: 'kg',
            detail: weight
              ? `Em ${weight.day.split('-').reverse().join('/')}`
              : 'Ainda sem registro',
            action: openWeight,
          },
          {
            icon: Target,
            label: 'Objetivo de peso',
            value: number(data.profile.goalWeight, 1),
            unit: 'kg',
            detail: `Referencia inicial: ${data.profile.initialWeight} kg`,
            action: () => setPage('settings'),
          },
        ].map((metric) => (
          <button className="metric-card" key={metric.label} onClick={metric.action}>
            <div>
              <metric.icon size={18} />
              <ArrowUpRight size={15} />
            </div>
            <span className="metric-label">{metric.label}</span>
            <strong>
              {metric.value}
              <small>{metric.unit}</small>
            </strong>
            <span className="metric-detail">{metric.detail}</span>
          </button>
        ))}
      </div>
      <div className="dashboard-bottom">
        <HistoryChart />
        <section className="daily-plan">
          <div className="panel-heading">
            <h3>No seu radar</h3>
            <button
              className="icon-button"
              title="Ver alimentacao"
              onClick={() => setPage('nutrition')}
            >
              <ArrowRight size={19} />
            </button>
          </div>
          {pending.slice(0, 3).map((meal) => (
            <button className="pending-meal" key={meal.id} onClick={() => openMeal(meal)}>
              <span className="pending-time">{meal.time}</span>
              <div>
                <strong>{meal.name}</strong>
                <small>Refeicao planejada</small>
              </div>
              <ChevronRight size={17} />
            </button>
          ))}
          {pending.length === 0 && (
            <p className="muted">
              <Check size={18} />
              Todas as refeicoes registradas.
            </p>
          )}
          <button className="today-training" onClick={() => openActivity()}>
            <Dumbbell size={24} />
            <div>
              <span className="eyebrow">PLANO DE HOJE</span>
              <strong>{weeklyPlan[parseISO(day).getDay()]}</strong>
            </div>
            <Plus size={18} />
          </button>
        </section>
      </div>
    </>
  );
}
