import {
  Activity,
  ArrowUpRight,
  Dumbbell,
  Flame,
  Scale,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { parseISO } from 'date-fns';
import { useApp } from '../hooks/useAppData';
import { dailySummary } from '../domain/dashboard';
import { weeklyPlan } from '../data/initialPlan';
import { localDay, number, recentDays } from '../utils/dates';
import { HistoryChart } from '../components/charts/HistoryChart';
import { Disclosure } from '../components/ui/Disclosure';

export function Home() {
  const { data, day } = useApp();
  const summary = dailySummary(data, day);
  return (
    <div className="app-page premium-home">
      <div className="section-heading compact-heading">
        <h2>Meu dia</h2>
        <span className="home-goal">
          Hipertrofia <span aria-hidden="true">/</span>{' '}
          {data.profile.endDay.split('-').reverse().join('/')}
        </span>
      </div>
      <HomeIndicators summary={summary} />
      <div className="home-highlights-heading">
        <h3>Destaques</h3>
        <span>Seu dia, em perspectiva</span>
      </div>
      <div className="home-highlights">
        <NutritionHighlight summary={summary} />
        <PerformanceHighlight summary={summary} />
        <ProgressHighlight summary={summary} />
      </div>
      <HomeDetails summary={summary} />
    </div>
  );
}

type SummaryProps = Readonly<{ summary: ReturnType<typeof dailySummary> }>;

function HomeIndicators({ summary }: SummaryProps) {
  const { data, day, setPage } = useApp();
  const { nutrients, intake, intakeStatus, energy, weight, activities } = summary;
  const week = recentDays(day, 7);
  const recordedDays = new Set(
    [
      ...data.logs.map((log) => log.day),
      ...data.activities.map((activity) => localDay(new Date(activity.start))),
    ].filter((date) => week.includes(date)),
  ).size;
  const calorieNote = intakeStatus === 'partial' ? 'kcal (parcial)' : 'kcal registradas';
  const activityNote = activities.length === 1 ? 'treino no dia' : 'treinos no dia';
  return (
    <nav className="home-indicators" aria-label="Indicadores do dia">
      <button
        type="button"
        aria-label="Calorias: abrir alimentacao"
        aria-describedby="home-calories-value home-calories-note"
        onClick={() => setPage('nutrition')}
      >
        <HomeRing icon={Flame} value={intake} max={energy.target} label="Calorias consumidas" />
        <strong id="home-calories-value">{intake === null ? '--' : number(intake)}</strong>
        <span>Calorias</span>
        <small id="home-calories-note">{intake === null ? 'Sem dados' : calorieNote}</small>
      </button>
      <button
        type="button"
        aria-label="Proteina: abrir alimentacao"
        aria-describedby="home-protein-value home-protein-note"
        onClick={() => setPage('nutrition')}
      >
        <HomeRing
          icon={Utensils}
          value={intake === null ? null : nutrients.protein}
          max={data.profile.protein}
          label="Proteina diaria"
        />
        <strong id="home-protein-value">
          {intake === null ? '--' : `${number(nutrients.protein)} g`}
        </strong>
        <span>Proteina</span>
        <small id="home-protein-note">
          Meta {number(data.profile.protein)} g{intakeStatus === 'partial' ? ' (parcial)' : ''}
        </small>
      </button>
      <button
        type="button"
        aria-label="Atividade: abrir treinos"
        aria-describedby="home-activity-value home-activity-note"
        onClick={() => setPage('training')}
      >
        <HomeRing icon={Dumbbell} value={null} max={null} label="Atividade fisica" />
        <strong id="home-activity-value">{activities.length || '--'}</strong>
        <span>Atividade</span>
        <small id="home-activity-note">{activities.length ? activityNote : 'Sem registros'}</small>
      </button>
      <button
        type="button"
        aria-label="Consistencia: abrir evolucao"
        aria-describedby="home-consistency-value home-consistency-note"
        onClick={() => setPage('progress')}
      >
        <HomeRing
          icon={Activity}
          value={recordedDays}
          max={7}
          label="Dias com alimentacao ou treino registrados nos ultimos sete dias"
        />
        <strong id="home-consistency-value">{recordedDays}/7</strong>
        <span>Consistencia</span>
        <small id="home-consistency-note">Alimentacao ou treino</small>
      </button>
      {weight && (
        <button
          type="button"
          aria-label="Peso: abrir evolucao"
          aria-describedby="home-weight-value home-weight-note"
          onClick={() => setPage('progress')}
        >
          <HomeRing icon={Scale} value={null} max={null} label="Ultimo peso registrado" />
          <strong id="home-weight-value">{number(weight.kg, 1)}</strong>
          <span>Peso</span>
          <small id="home-weight-note">kg registrados</small>
        </button>
      )}
    </nav>
  );
}

function NutritionHighlight({ summary }: SummaryProps) {
  const { setPage } = useApp();
  const { nutrients, intake, intakeStatus, energy, logs } = summary;
  const titles = {
    missing: 'Ainda sem registros',
    unknown: 'Nutrientes nao informados',
    partial: 'Consumo parcial',
    recorded: 'Alimentacao do dia',
  };
  return (
    <button
      type="button"
      className="home-highlight nutrition-highlight"
      aria-label="Abrir alimentacao"
      onClick={() => setPage('nutrition')}
    >
      <img src="/images/home-nutrition.webp" alt="" decoding="async" fetchPriority="high" />
      <span className="highlight-heading">
        <span>
          <Utensils size={18} />
          Nutricao
        </span>
        <ArrowUpRight size={20} />
      </span>
      <span className="highlight-center">
        <HomeRing
          icon={Flame}
          value={intake}
          max={energy.target}
          label="Consumo registrado"
          large
        />
        <strong className="daily-intake">{intake === null ? '--' : number(intake)}</strong>
        <span>
          {energy.target === null ? 'Meta nao definida' : `de ${number(energy.target)} kcal`}
        </span>
      </span>
      <span className="highlight-footer">
        <strong>{titles[intakeStatus]}</strong>
        <span className="highlight-macros">
          <span>
            Proteina <b>{intake === null ? '--' : `${number(nutrients.protein)} g`}</b>
          </span>
          <span>
            Carboidratos <b>{intake === null ? '--' : `${number(nutrients.carbs)} g`}</b>
          </span>
          <span>
            Gorduras <b>{intake === null ? '--' : `${number(nutrients.fat)} g`}</b>
          </span>
        </span>
        <span className="highlight-action">
          {logs.length ? 'Ver alimentacao' : 'Registrar alimentacao'}
          <ArrowUpRight size={16} />
        </span>
      </span>
    </button>
  );
}

function PerformanceHighlight({ summary }: SummaryProps) {
  const { day, setPage } = useApp();
  const { activities, exercise } = summary;
  const duration = activities.reduce((sum, activity) => sum + activity.duration, 0);
  const recordedLabel = activities.length === 1 ? 'treino registrado' : 'treinos registrados';
  const others = activities.length > 1 ? ` + ${activities.length - 1}` : '';
  const title = activities.length
    ? activities[0].name + others
    : weeklyPlan[parseISO(day).getDay()];
  const exerciseLabel =
    exercise.value === null ? 'Energia nao informada' : exerciseDescription(exercise);
  return (
    <button
      type="button"
      className="home-highlight performance-highlight"
      aria-label="Abrir treinos"
      onClick={() => setPage('training')}
    >
      <img src="/images/home-performance.webp" alt="" decoding="async" loading="lazy" />
      <span className="highlight-heading">
        <span>
          <Dumbbell size={18} />
          Performance
        </span>
        <ArrowUpRight size={20} />
      </span>
      <span className="highlight-center">
        <Dumbbell size={32} />
        <strong>{activities.length || '--'}</strong>
        <span>{activities.length ? recordedLabel : 'Nenhum treino registrado'}</span>
      </span>
      <span className="highlight-footer">
        <strong>{title}</strong>
        <span>{activities.length ? 'Registrado no dia' : 'Planejado para o dia'}</span>
        <span>
          {activities.length ? `${number(duration)} min registrados` : 'Duracao nao registrada'} ·{' '}
          {exerciseLabel}
        </span>
        <span className="highlight-action">
          {activities.length ? 'Ver treinos' : 'Registrar treino'}
          <ArrowUpRight size={16} />
        </span>
      </span>
    </button>
  );
}

function ProgressHighlight({ summary }: SummaryProps) {
  const { data, day, setPage } = useApp();
  const { weight } = summary;
  const weights = data.weights.filter((record) => record.day <= day).slice(-7);
  return (
    <button
      type="button"
      className="home-highlight progress-highlight"
      aria-label="Abrir evolucao"
      onClick={() => setPage('progress')}
    >
      <img src="/images/home-progress.webp" alt="" decoding="async" loading="lazy" />
      <span className="highlight-heading">
        <span>
          <Scale size={18} />
          Evolucao
        </span>
        <ArrowUpRight size={20} />
      </span>
      <span className="highlight-center">
        <Scale size={30} />
        <strong>
          {weight ? number(weight.kg, 1) : '--'}
          <small> kg</small>
        </strong>
        <span>
          {weight
            ? `Pesagem de ${weight.day.split('-').reverse().join('/')}`
            : 'Nenhuma pesagem registrada'}
        </span>
      </span>
      <span className="highlight-footer">
        {weights.length >= 2 ? (
          <>
            <WeightSparkline weights={weights} />
            <span>Ultimas {weights.length} pesagens</span>
          </>
        ) : (
          <span>Historico insuficiente para tendencia</span>
        )}
        <span className="highlight-action">
          {weight ? 'Ver evolucao' : 'Registrar peso'}
          <ArrowUpRight size={16} />
        </span>
      </span>
    </button>
  );
}

function HomeDetails({ summary }: SummaryProps) {
  const { data, day, setPage } = useApp();
  const { nutrients, intake, energy, exercise, weight, daysLeft, activities } = summary;
  const exerciseLabel = exerciseDescription(exercise);
  const balanceLabel = balanceDescription(energy.balance);
  return (
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
                <dd>{energy.target === null ? 'Nao definida' : `${number(energy.target)} kcal`}</dd>
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
              Ingestao registrada menos gasto diario total (TDEE). Sem consumo conhecido ou TDEE, o
              saldo e desconhecido. Nao representa o fechamento do dia.{' '}
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
              <button className="button primary" onClick={() => setPage('training')}>
                <Dumbbell size={17} />
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
              <button className="button primary" onClick={() => setPage('progress')}>
                <Scale size={17} />
                Ver evolucao
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
  );
}

function exerciseDescription(exercise: ReturnType<typeof dailySummary>['exercise']) {
  if (exercise.value === null) return 'Nao informado';
  const partial = exercise.incomplete ? ' (parcial)' : '';
  return `${number(exercise.value)} kcal ativas${partial}`;
}

function balanceDescription(balance: number | null) {
  if (balance === null) return '--';
  const sign = balance > 0 ? '+' : '';
  return `${sign}${number(balance)} kcal`;
}

function HomeRing({
  icon: Icon,
  value,
  max,
  label,
  large = false,
}: Readonly<{
  icon: LucideIcon;
  value: number | null;
  max: number | null;
  label: string;
  large?: boolean;
}>) {
  const known = value !== null && max !== null && max > 0;
  const ratio = known ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <span className={`home-ring ${large ? 'large-ring' : ''}`}>
      {known && (
        <progress
          className="ring-accessible-progress"
          aria-label={label}
          value={value}
          max={max}
          aria-valuenow={Math.min(value, max)}
          aria-valuemax={max}
          aria-valuetext={`${number(value)} de ${number(max)}`}
        />
      )}
      <svg className="ring-visual" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r="44" />
        {known && ratio > 0 && (
          <circle
            className="ring-value"
            cx="50"
            cy="50"
            r="44"
            pathLength="100"
            strokeDasharray={`${ratio * 100} 100`}
            transform="rotate(-90 50 50)"
          />
        )}
      </svg>
      <Icon aria-hidden="true" size={large ? 24 : 21} />
    </span>
  );
}

function WeightSparkline({ weights }: Readonly<{ weights: { day: string; kg: number }[] }>) {
  const values = weights.map((record) => record.kg);
  const low = Math.min(...values);
  const range = Math.max(...values) - low || 1;
  const start = parseISO(weights[0].day).getTime();
  const period = parseISO(weights.at(-1)!.day).getTime() - start || 1;
  const points = weights
    .map(
      (record) =>
        `${8 + ((parseISO(record.day).getTime() - start) / period) * 244},${64 - ((record.kg - low) / range) * 48}`,
    )
    .join(' ');
  const description = weights
    .map((record) => `${record.day}: ${number(record.kg, 1)} kg`)
    .join('; ');
  return (
    <svg
      className="weight-sparkline"
      viewBox="0 0 260 80"
      role="img"
      aria-label={`Pesagens: ${description}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
