import { Activity, Flame, Plus, Scale, Trash2, Utensils } from 'lucide-react';
import { useApp } from '../hooks/useAppData';
import { HistoryChart } from '../components/charts/HistoryChart';
import { sweetsStats } from '../domain/activities';
import { recentDays, number } from '../utils/dates';
import { db } from '../db';
import { Disclosure } from '../components/ui/Disclosure';

export function Progress() {
  const { data, day, setDay, setPage, openWeight, confirm } = useApp();
  const stats = sweetsStats(data.sweets, day);
  const weights = data.weights.filter((weight) => weight.day <= day);
  const last = weights.at(-1);
  const average = weights.filter((weight) => recentDays(day, 7).includes(weight.day));
  return (
    <div className="app-page">
      <div className="section-heading compact-heading">
        <h2>Evolucao</h2>
        <button className="button primary" onClick={openWeight}>
          <Plus size={18} />
          Registrar peso
        </button>
      </div>
      <Disclosure
        title="Resumo do peso"
        summary={last ? `${number(last.kg, 1)} kg registrados` : 'Sem pesagens registradas'}
        icon={Scale}
      >
        <div className="summary-strip">
          <span>
            <Scale size={17} />
            <strong>{last ? number(last.kg, 1) : '--'}</strong> kg registrados
          </span>
          <span>
            Media 7 dias:{' '}
            {average.length
              ? `${number(average.reduce((sum, weight) => sum + weight.kg, 0) / average.length, 1)} kg (${average.length} registro(s))`
              : 'sem dados'}
          </span>
          <span>
            Variacao:{' '}
            {weights.length >= 2
              ? `${number(last!.kg - weights[0].kg, 1)} kg`
              : 'sem dados suficientes'}
          </span>
        </div>
        <p className="muted small">
          Variacoes de peso nao representam necessariamente ganho ou perda de massa muscular.
        </p>
      </Disclosure>
      <Disclosure title="Grafico de peso" summary="Evolucao das pesagens" icon={Scale}>
        <HistoryChart kind="weight" title="Sua curva de peso" />
      </Disclosure>
      <Disclosure title="Proteina diaria" summary="Historico de consumo" icon={Utensils}>
        <HistoryChart kind="protein" title="Proteina diaria" />
      </Disclosure>
      <Disclosure title="Frequencia de treinos" summary="Atividades registradas" icon={Activity}>
        <HistoryChart kind="workouts" title="Frequencia de treinos" />
      </Disclosure>
      <Disclosure
        title="Calendario de doces"
        summary={`${stats.registered} dias registrados`}
        icon={Flame}
      >
        <div className="streak-metrics">
          <div>
            <strong>{stats.current}</strong>
            <span>sequencia atual</span>
          </div>
          <div>
            <strong>{stats.best}</strong>
            <span>recorde</span>
          </div>
          <div>
            <strong>{stats.percent === null ? '--' : `${number(stats.percent)}%`}</strong>
            <span>sem doces / {stats.registered} dias registrados</span>
          </div>
        </div>
        <div className="sweets-calendar">
          {recentDays(day, 28).map((date) => {
            const record = data.sweets.find((record) => record.day === date);
            return (
              <button
                key={date}
                title={`${date}: ${record ? (record.status === 'free' ? 'sem doces' : 'consumo registrado') : 'desconhecido'}`}
                className={record?.status ?? ''}
                onClick={() => {
                  setDay(date);
                  setPage('nutrition');
                }}
              >
                <span>{date.slice(8)}</span>
                <i />
              </button>
            );
          })}
        </div>
        <p className="muted small">Verde: sem doces · Amarelo: consumo · Sem cor: desconhecido</p>
      </Disclosure>
      <Disclosure title="Historico de peso" summary={`${weights.length} pesagens`} icon={Scale}>
        {weights.length ? (
          <div className="record-table">
            {[...weights].reverse().map((weight) => (
              <div key={weight.id}>
                <span>{weight.day.split('-').reverse().join('/')}</span>
                <strong>{number(weight.kg, 1)} kg</strong>
                <span className="muted">{weight.notes}</span>
                <button
                  className="icon-button"
                  title="Excluir registro de peso"
                  onClick={() =>
                    confirm('Excluir este registro de peso?', () => db.weights.delete(weight.id))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <Scale size={28} />
            <p>Nenhuma pesagem registrada. O peso inicial do perfil e apenas uma referencia.</p>
          </div>
        )}
      </Disclosure>
    </div>
  );
}
