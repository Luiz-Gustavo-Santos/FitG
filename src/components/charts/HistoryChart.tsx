import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartNoAxesCombined } from 'lucide-react';
import { useApp } from '../../hooks/useAppData';
import { history } from '../../domain/dashboard';

export function HistoryChart({
  kind = 'calories',
  title = 'Consumo & energia',
}: {
  kind?: 'calories' | 'protein' | 'weight' | 'workouts';
  title?: string;
}) {
  const { data, day } = useApp();
  const [range, setRange] = useState(7);
  const values = history(data, day, range);
  const key = { calories: 'intake', protein: 'protein', weight: 'weight', workouts: 'workouts' }[
    kind
  ] as 'intake' | 'protein' | 'weight' | 'workouts';
  const hasData =
    kind === 'workouts'
      ? values.some((value) => value.workouts > 0)
      : values.some((value) => value[key] !== null);
  const axes = (
    <>
      <CartesianGrid stroke="#25372d" strokeDasharray="3 5" vertical={false} />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tick={{ fill: '#92a69a', fontSize: 11 }}
        minTickGap={14}
      />
      <YAxis
        width={42}
        tickLine={false}
        axisLine={false}
        tick={{ fill: '#92a69a', fontSize: 11 }}
        domain={kind === 'weight' ? ['auto', 'auto'] : [0, 'auto']}
      />
      <Tooltip
        contentStyle={{
          background: '#15211b',
          border: '1px solid #3b5040',
          borderRadius: 6,
          color: '#f4f8f5',
        }}
        labelFormatter={(_, payload) => {
          const point = payload[0]?.payload;
          return `${point?.day ?? ''}${(kind === 'calories' || kind === 'protein') && point?.intakeStatus === 'partial' ? ' · consumo parcial' : ''}`;
        }}
      />
    </>
  );
  return (
    <section className="chart-section">
      <div className="chart-heading">
        <div>
          <h3>{title}</h3>
          <span className="small muted">
            {kind === 'calories'
              ? 'kcal por dia · valores conhecidos'
              : kind === 'weight'
                ? 'kg · registros reais'
                : kind === 'protein'
                  ? 'gramas por dia'
                  : 'treinos por dia'}
          </span>
        </div>
        <div className="segmented" aria-label="Periodo do grafico">
          {[7, 30].map((count) => (
            <button key={count} aria-pressed={range === count} onClick={() => setRange(count)}>
              {count}D
            </button>
          ))}
        </div>
      </div>
      <div className="chart-area">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {kind === 'workouts' ? (
              <BarChart data={values}>
                {axes}
                <Bar
                  dataKey="workouts"
                  name="Treinos"
                  fill="#39ff88"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            ) : kind === 'weight' ? (
              <LineChart data={values}>
                {axes}
                <Line
                  dataKey="weight"
                  name="Peso (kg)"
                  stroke="#b6ff4d"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            ) : (
              <AreaChart data={values}>
                <defs>
                  <linearGradient id={`fill-${kind}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#39ff88" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#39ff88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {axes}
                <Area
                  dataKey={key}
                  name={kind === 'calories' ? 'Consumo (kcal)' : 'Proteina (g)'}
                  stroke="#b6ff4d"
                  strokeWidth={2.5}
                  fill={`url(#fill-${kind})`}
                  dot={{ r: 3 }}
                />
                {kind === 'calories' && (
                  <Area
                    dataKey="tdee"
                    name="TDEE configurado atual (estimativa)"
                    stroke="#00c896"
                    strokeDasharray="5 5"
                    fill="transparent"
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            <ChartNoAxesCombined size={30} />
            <span>
              {(kind === 'calories' || kind === 'protein') &&
              values.some((value) => value.intakeStatus === 'unknown')
                ? 'Consumos registrados sem nutrientes conhecidos.'
                : 'Seu historico comeca no primeiro registro.'}
            </span>
            <small>Nenhum valor conhecido neste periodo</small>
          </div>
        )}
      </div>
      {kind === 'calories' && (
        <div className="chart-legend">
          <span>
            <i />
            Consumo registrado
          </span>
          <span>
            <i className="mint" />
            TDEE configurado (se informado)
          </span>
        </div>
      )}
    </section>
  );
}
