import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Plus, Save, SlidersHorizontal, Trash2 } from 'lucide-react';
import { db } from '../../db';
import { useApp } from '../../hooks/useAppData';
import {
  activitySchema,
  mealLogSchema,
  mealSchema,
  weightSchema,
  type Activity,
  type Meal,
  type Portion,
} from '../../types';
import { snapshot, totals } from '../../domain/nutrition';
import { number } from '../../utils/dates';
import { format, parseISO } from 'date-fns';
import { Modal } from './Modal';

export function MealEditor({
  meal,
  plan,
  onClose,
}: {
  meal: Meal;
  plan: boolean;
  onClose: () => void;
}) {
  const { data, day, run } = useApp();
  const [name, setName] = useState(meal.name);
  const [time, setTime] = useState(meal.time);
  const [items, setItems] = useState<Portion[]>(structuredClone(meal.items));
  const [selected, setSelected] = useState(() => new Set(meal.items.map((item) => item.id)));
  const [saving, setSaving] = useState(false);
  const [customizing, setCustomizing] = useState(plan);
  const update = (id: string, patch: Partial<Portion>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const chosen = items.filter((item) => selected.has(item.id));
  const invalidAmounts = (plan ? items : chosen).some(
    (item) => item.amount !== null && (!Number.isFinite(item.amount) || item.amount <= 0),
  );
  const summary = invalidAmounts ? null : totals(snapshot(chosen, data.foods));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (invalidAmounts) return;
    setSaving(true);
    const ok = await run(
      async () => {
        if (plan) {
          await db.meals.put(mealSchema.parse({ ...meal, name, time, items }));
        } else {
          const existing = await db.logs.where('[day+mealId]').equals([day, meal.id]).first();
          await db.logs.put(
            mealLogSchema.parse({
              id: existing?.id ?? crypto.randomUUID(),
              day,
              mealId: meal.id,
              name,
              items: snapshot(chosen, data.foods),
              recordedAt: new Date().toISOString(),
            }),
          );
        }
      },
      plan ? 'Plano salvo. Consumos anteriores foram preservados.' : 'Refeicao registrada.',
    );
    setSaving(false);
    if (ok) onClose();
  }
  return (
    <Modal
      title={plan ? 'Editar plano alimentar' : 'Registrar refeicao'}
      onClose={onClose}
      wide={plan}
      sheet={!plan}
    >
      <form onSubmit={submit} className="meal-editor">
        {!plan && (
          <div className="meal-review-heading">
            <strong>{name}</strong>
            <span>{format(parseISO(day), 'dd/MM/yyyy')}</span>
          </div>
        )}
        {customizing ? (
          <>
            <div className="form-grid">
              <label>
                Refeicao
                <input required value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label>
                Horario
                <input
                  required
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </label>
            </div>
            <div className="portion-list">
              {items.map((item) => {
                const food = data.foods.find((candidate) => candidate.id === item.foodId);
                return (
                  <div className="portion-row" key={item.id}>
                    {!plan && (
                      <label className="portion-check">
                        <input
                          aria-label={`Consumir ${item.name}`}
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={(event) =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(item.id);
                              else next.delete(item.id);
                              return next;
                            })
                          }
                        />
                        <span className="sr-only">Consumir {item.name}</span>
                      </label>
                    )}
                    <label className="portion-food">
                      {item.name}
                      <select
                        aria-label={`Alimento para ${item.name}`}
                        value={item.foodId ?? ''}
                        onChange={(event) =>
                          update(item.id, { foodId: event.target.value || null })
                        }
                      >
                        <option value="">Nao especificado</option>
                        {data.foods.map((food) => (
                          <option key={food.id} value={food.id}>
                            {food.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="portion-amount">
                      {food?.unit ?? 'Quantidade'}
                      <input
                        aria-label={`Quantidade de ${item.name}`}
                        type="number"
                        disabled={!plan && !selected.has(item.id)}
                        min="0.01"
                        step="0.01"
                        placeholder="?"
                        value={item.amount ?? ''}
                        onChange={(event) =>
                          update(item.id, {
                            amount: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="icon-button"
                      title="Remover alimento"
                      aria-label={`Remover ${item.name}`}
                      onClick={() =>
                        setItems(items.filter((candidate) => candidate.id !== item.id))
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              className="button ghost"
              type="button"
              onClick={() => {
                const id = crypto.randomUUID();
                setItems([
                  ...items,
                  { id, name: 'Alimento adicional', foodId: null, amount: null },
                ]);
                setSelected(new Set([...selected, id]));
              }}
            >
              <Plus size={16} />
              Adicionar alimento
            </button>
          </>
        ) : (
          <div className="meal-review-list">
            {items.map((item) => {
              const food = data.foods.find((candidate) => candidate.id === item.foodId);
              return (
                <div className="meal-review-row" key={item.id}>
                  <label className="meal-review-food">
                    <input
                      aria-label={`Consumir ${item.name}`}
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        })
                      }
                    />
                    <span>{item.name}</span>
                  </label>
                  <label className="meal-review-amount">
                    <span className="sr-only">Quantidade de {item.name}</span>
                    <input
                      aria-label={`Quantidade de ${item.name}`}
                      type="number"
                      disabled={!selected.has(item.id)}
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      placeholder="?"
                      value={item.amount ?? ''}
                      onChange={(event) =>
                        update(item.id, {
                          amount: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                    />
                    <span>{food?.unit ?? 'A definir'}</span>
                  </label>
                </div>
              );
            })}
          </div>
        )}
        {!plan && (
          <button
            className="button ghost meal-customize"
            type="button"
            onClick={() => setCustomizing(!customizing)}
          >
            {customizing ? <ArrowLeft size={17} /> : <SlidersHorizontal size={17} />}
            {customizing ? 'Voltar as porcoes' : 'Personalizar alimentos'}
          </button>
        )}
        {summary ? (
          <div className="notice">
            {number(summary.kcal)} kcal conhecidas · {number(summary.protein)} g proteina
            {summary.unknown > 0 && (
              <>
                <br />
                {summary.unknown} item(ns) com nutrientes desconhecidos.
              </>
            )}
          </div>
        ) : (
          <p className="warning small" role="alert">
            Quantidade deve ser maior que zero.
          </p>
        )}
        {!plan && (
          <p className="muted small">
            {chosen.length} de {items.length} alimentos selecionados.
            {data.logs.some((log) => log.day === day && log.mealId === meal.id) &&
              ' O consumo anterior desta refeicao sera substituido.'}
          </p>
        )}
        <div className="form-actions">
          <button className="button ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="button primary"
            type="submit"
            disabled={saving || invalidAmounts || !items.length || (!plan && !chosen.length)}
          >
            <Check size={17} />
            {plan ? 'Salvar plano' : 'Registrar consumo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ActivityEditor({
  activity,
  onClose,
}: {
  activity?: Activity;
  onClose: () => void;
}) {
  const { day, run } = useApp();
  const initialStart = activity
    ? format(new Date(activity.start), "yyyy-MM-dd'T'HH:mm:ss.SSS")
    : `${day}T18:00`;
  const [startValue, setStartValue] = useState(initialStart);
  const [sport, setSport] = useState(activity?.sport ?? 'Musculacao');
  const [exercises, setExercises] = useState(activity?.exercises ?? []);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const optional = (key: string) => (form.get(key) ? Number(form.get(key)) : null);
    setSaving(true);
    const ok = await run(async () => {
      const value = activitySchema.parse({
        id: activity?.id ?? crypto.randomUUID(),
        externalId: activity?.externalId ?? null,
        source: activity?.source ?? 'manual',
        name: String(form.get('name')) || sport,
        sport,
        start:
          activity && startValue === initialStart
            ? activity.start
            : new Date(startValue).toISOString(),
        duration: Number(form.get('duration')),
        distance: optional('distance'),
        heartRate: optional('heartRate'),
        energy: optional('energy'),
        energyType: form.get('energyType'),
        notes: form.get('notes'),
        exercises,
        importedAt: activity?.importedAt ?? null,
      });
      await db.activities.put(value);
    }, 'Treino salvo.');
    setSaving(false);
    if (ok) onClose();
  }
  return (
    <Modal title={activity ? 'Editar treino' : 'Registrar treino'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            Modalidade
            <select value={sport} onChange={(event) => setSport(event.target.value)}>
              {[
                'Musculacao',
                'Squash',
                'Natacao',
                'Escalada',
                'Corrida',
                'Ciclismo',
                'Caminhada',
                'Outro',
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Nome
            <input name="name" defaultValue={activity?.name} placeholder="Treino do dia" />
          </label>
          <label>
            Inicio
            <input
              name="start"
              required
              type="datetime-local"
              step="any"
              value={startValue}
              onChange={(event) => setStartValue(event.target.value)}
            />
          </label>
          <label>
            Duracao (min)
            <input
              name="duration"
              required
              type="number"
              min="0"
              step="any"
              defaultValue={activity?.duration}
            />
          </label>
          <label>
            Distancia (km, opcional)
            <input
              name="distance"
              type="number"
              min="0"
              step="any"
              defaultValue={activity?.distance ?? ''}
            />
          </label>
          <label>
            FC media (bpm, opcional)
            <input
              name="heartRate"
              type="number"
              min="1"
              step="any"
              defaultValue={activity?.heartRate ?? ''}
            />
          </label>
          <label>
            Energia informada (kcal)
            <input
              name="energy"
              type="number"
              min="0"
              step="any"
              defaultValue={activity?.energy ?? ''}
              placeholder="Nao informado"
            />
          </label>
          <label>
            Tipo de energia
            <select name="energyType" defaultValue={activity?.energyType ?? 'unknown'}>
              <option value="unknown">Desconhecida</option>
              <option value="active">Ativa (exercicio)</option>
              <option value="total">Total (inclui repouso)</option>
            </select>
          </label>
        </div>
        {sport === 'Musculacao' && (
          <fieldset>
            <legend>Exercicios</legend>
            {exercises.map((exercise, index) => (
              <div className="exercise-row" key={index}>
                <label>
                  Exercicio
                  <input
                    required
                    value={exercise.name}
                    onChange={(event) =>
                      setExercises(
                        exercises.map((entry, position) =>
                          position === index ? { ...entry, name: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </label>
                {(['sets', 'reps', 'load'] as const).map((key) => (
                  <label key={key}>
                    {{ sets: 'Series', reps: 'Reps', load: 'kg' }[key]}
                    <input
                      required
                      type="number"
                      min={key === 'load' ? 0 : 1}
                      step={key === 'load' ? 0.1 : 1}
                      value={exercise[key]}
                      onChange={(event) =>
                        setExercises(
                          exercises.map((entry, position) =>
                            position === index
                              ? { ...entry, [key]: Number(event.target.value) }
                              : entry,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="icon-button"
                  title="Remover exercicio"
                  onClick={() =>
                    setExercises(exercises.filter((_, position) => position !== index))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button ghost"
              onClick={() => setExercises([...exercises, { name: '', sets: 3, reps: 10, load: 0 }])}
            >
              <Plus size={16} />
              Exercicio
            </button>
          </fieldset>
        )}
        <label>
          Notas
          <textarea name="notes" defaultValue={activity?.notes} rows={2} />
        </label>
        <p className="muted small">
          Energia e opcional e nao sera estimada automaticamente. Informe o tipo exibido pela sua
          fonte.
        </p>
        <div className="form-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={saving}>
            <Save size={16} />
            Salvar treino
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function WeightEditor({ onClose }: { onClose: () => void }) {
  const { data, day, run } = useApp();
  const existing = data.weights.find((weight) => weight.day === day);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const ok = await run(async () => {
      const value = weightSchema.parse({
        id: existing?.id ?? crypto.randomUUID(),
        day,
        kg: Number(form.get('kg')),
        notes: form.get('notes'),
      });
      await db.weights.put(value);
    }, 'Peso registrado.');
    setSaving(false);
    if (ok) onClose();
  }
  return (
    <Modal title="Registrar peso" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted">{day.split('-').reverse().join('/')}</p>
        <label>
          Peso (kg)
          <input
            name="kg"
            required
            type="number"
            min="1"
            max="500"
            step="0.1"
            autoFocus
            defaultValue={existing?.kg}
          />
        </label>
        <label>
          Notas
          <textarea name="notes" rows={2} defaultValue={existing?.notes} />
        </label>
        <div className="form-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={saving}>
            <Save size={16} />
            Salvar peso
          </button>
        </div>
      </form>
    </Modal>
  );
}
