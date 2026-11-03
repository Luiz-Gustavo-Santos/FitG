import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, FileUp, Link2, ShieldCheck, Watch } from 'lucide-react';
import { useApp } from '../hooks/useAppData';
import { db } from '../db';
import { prepareImport, reviewImport } from '../domain/activities';
import { number } from '../utils/dates';
import type { Activity } from '../types';
import { Disclosure } from '../components/ui/Disclosure';

export function Integrations() {
  const { data, run, setPage } = useApp();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const reviewedRef = useRef<Activity[]>([]);
  useEffect(() => () => workerRef.current?.terminate(), []);
  function importFile(file: File) {
    setError('');
    setActivities([]);
    setProgress(0);
    workerRef.current?.terminate();
    const worker = new Worker(
      new URL('../integrations/imports/parser.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;
    worker.onmessage = (event) => {
      if (event.data.error) {
        setError(event.data.error);
        setProgress(null);
        worker.terminate();
      } else if (event.data.activities) {
        const parsed = event.data.activities as Activity[];
        reviewedRef.current = data.activities;
        setActivities(parsed);
        setSelected(
          new Set(
            reviewImport(parsed, data.activities)
              .filter((entry) => !entry.exact && !entry.conflicts.length)
              .map((entry) => entry.activity.id),
          ),
        );
        setProgress(null);
        worker.terminate();
      } else setProgress(event.data.progress);
    };
    worker.onerror = () => {
      setError('Erro ao processar o arquivo. Tente outro GPX/TCX.');
      setProgress(null);
      worker.terminate();
    };
    worker.postMessage(file);
  }
  return (
    <div className="app-page">
      <button className="button ghost back-button" onClick={() => setPage('settings')}>
        <ArrowLeft size={16} />
        Perfil
      </button>
      <div className="section-heading compact-heading">
        <h2>Integracoes</h2>
      </div>
      <Disclosure title="Strava" summary="Nao configurada" icon={Link2}>
        <p>
          A conexao OAuth depende de um servico seguro para troca e renovacao de tokens. Nenhuma
          conta conectada.
        </p>
      </Disclosure>
      <Disclosure title="Apple Health" summary="Requer aplicativo iOS nativo" icon={Watch}>
        <p>
          O navegador nao acessa HealthKit. XML/ZIP Apple Health e FIT ainda nao sao suportados
          nesta versao.
        </p>
      </Disclosure>
      <Disclosure
        title="Importacao local de atividades"
        summary="Arquivos GPX e TCX - sem upload"
        icon={FileUp}
      >
        <div className="section-heading compact">
          <div>
            <h3>Importacao local de atividades</h3>
            <p className="muted">
              GPX com horarios ou TCX com voltas · ate 10 MB / 500 atividades · sem upload
            </p>
          </div>
          <ShieldCheck size={25} className="accent" />
        </div>
        <button
          className="button primary"
          disabled={progress !== null}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp size={17} />
          Escolher GPX / TCX
        </button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".gpx,.tcx,application/xml,text/xml"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) importFile(file);
          }}
        />
        {progress !== null && (
          <div className="import-progress" role="status">
            <span>Processando no dispositivo...</span>
            <progress aria-label="Progresso da importacao" value={progress} max={100} />
          </div>
        )}
        {error && (
          <p className="import-error" role="alert">
            {error}
          </p>
        )}
        <p className="muted small import-note">
          GPX: inicio e duracao pelos horarios dos pontos; distancia, energia e frequencia cardiaca
          nao importadas. TCX: distancia, calorias e FC media apenas quando presentes. Calorias TCX
          entram com tipo desconhecido, sem somar a energia ativa ate voce confirmar o tipo.
        </p>
      </Disclosure>
      {activities.length > 0 && (
        <section>
          <div className="section-heading compact">
            <h3>Revise antes de importar</h3>
            <span className="muted small">{selected.size} selecionada(s)</span>
          </div>
          <div className="import-list">
            {reviewImport(activities, data.activities).map(({ activity, exact, conflicts }) => {
              const possible = conflicts.length > 0;
              return (
                <label className="import-row" key={activity.id}>
                  <input
                    type="checkbox"
                    disabled={exact}
                    checked={selected.has(activity.id) && !exact}
                    onChange={(event) =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(activity.id);
                        else next.delete(activity.id);
                        return next;
                      })
                    }
                  />
                  <div>
                    <strong>{activity.name}</strong>
                    <span>
                      {new Date(activity.start).toLocaleString('pt-BR')} ·{' '}
                      {number(activity.duration, 1)} min · {activity.source}
                    </span>
                    <small>
                      {activity.energy === null
                        ? 'Energia nao informada'
                        : `${number(activity.energy)} kcal (tipo desconhecido)`}
                    </small>
                    {exact ? (
                      <small className="warning">
                        Arquivo/atividade ja importado. Sera ignorado.
                      </small>
                    ) : possible ? (
                      <small className="warning">
                        Possivel duplicata. Marque apenas se for um treino diferente; manter ambos
                        pode duplicar totais.
                      </small>
                    ) : (
                      <small className="accent">Nova atividade</small>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="form-actions">
            <button className="button ghost" onClick={() => setActivities([])}>
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={!selected.size || saving}
              onClick={async () => {
                setSaving(true);
                const ok = await run(async () => {
                  await db.transaction('rw', db.activities, async () => {
                    const existing = await db.activities.toArray();
                    const chosen = prepareImport(
                      activities,
                      existing,
                      selected,
                      reviewedRef.current,
                    );
                    await db.activities.bulkPut(chosen);
                  });
                }, 'Atividades importadas. Revise modalidade e campos em Treinos.');
                setSaving(false);
                if (ok) setActivities([]);
                else {
                  const latest = await db.activities.toArray();
                  reviewedRef.current = latest;
                  setSelected(
                    new Set(
                      reviewImport(activities, latest)
                        .filter((entry) => !entry.exact && !entry.conflicts.length)
                        .map((entry) => entry.activity.id),
                    ),
                  );
                }
              }}
            >
              <Check size={17} />
              Importar selecionadas
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
