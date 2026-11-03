import {
  Activity as ActivityIcon,
  Dumbbell,
  Pencil,
  Plus,
  Trash2,
  Timer,
  Flame,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useApp } from '../hooks/useAppData';
import { db } from '../db';
import { weeklyPlan } from '../data/initialPlan';
import { localDay, number } from '../utils/dates';

export function Training() {
  const { data, day, openActivity, confirm } = useApp();
  const activities = data.activities.filter(
    (activity) => localDay(new Date(activity.start)) === day,
  );
  const weekday = parseISO(day).getDay();
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">CONSISTENCIA EM MOVIMENTO</span>
          <h2>
            Seu proximo nivel<span className="accent">.</span>
          </h2>
        </div>
        <button className="button primary" onClick={() => openActivity()}>
          <Plus size={18} />
          Registrar treino
        </button>
      </div>
      <div className="week-plan">
        {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'].map((label, index) => (
          <div className={index === weekday ? 'selected' : ''} key={label}>
            <span>{label}</span>
            <Dumbbell size={19} />
            <strong>{weeklyPlan[index]}</strong>
            <small>{index === weekday ? 'Plano para hoje' : 'Planejado'}</small>
          </div>
        ))}
      </div>
      <div className="section-heading compact">
        <h3>Registros do dia</h3>
        <span className="muted">{activities.length} treino(s)</span>
      </div>
      {activities.length ? (
        <div className="activity-list">
          {activities.map((activity) => (
            <article className="activity-card" key={activity.id}>
              <div className="activity-symbol">
                <Dumbbell size={25} />
              </div>
              <div className="activity-description">
                <span className="eyebrow">
                  {activity.sport} · {activity.source}
                </span>
                <h3>{activity.name}</h3>
                <div className="activity-meta">
                  <span>
                    <Timer size={14} />
                    {number(activity.duration, 1)} min
                  </span>
                  <span>{format(new Date(activity.start), 'HH:mm')}</span>
                  {activity.distance !== null && <span>{number(activity.distance, 2)} km</span>}
                  <span>
                    <Flame size={14} />
                    {activity.energy !== null
                      ? `${number(activity.energy)} kcal (${activity.energyType === 'active' ? 'ativa' : activity.energyType === 'total' ? 'total' : 'tipo desconhecido'})`
                      : 'Energia nao informada'}
                  </span>
                </div>
                {activity.exercises.map((exercise, index) => (
                  <p className="small muted" key={index}>
                    {exercise.name} · {exercise.sets} x {exercise.reps} · {number(exercise.load, 1)}{' '}
                    kg
                  </p>
                ))}
                {activity.notes && <p className="small muted">{activity.notes}</p>}
              </div>
              <div className="inline-actions">
                <button
                  className="icon-button"
                  title="Editar treino"
                  onClick={() => openActivity(activity)}
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button"
                  title="Excluir treino"
                  onClick={() =>
                    confirm('Excluir este treino?', () => db.activities.delete(activity.id))
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <ActivityIcon size={34} />
          <h3>O proximo movimento e seu.</h3>
          <p>Nenhum treino registrado nesta data.</p>
          <button className="button primary" onClick={() => openActivity()}>
            <Plus size={17} />
            Registrar treino
          </button>
        </div>
      )}
    </>
  );
}
