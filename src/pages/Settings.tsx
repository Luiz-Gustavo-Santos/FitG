import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Download, FileUp, Save, ShieldCheck } from 'lucide-react';
import { db, backupSchema, exportBackup, restoreBackup } from '../db';
import { useApp } from '../hooks/useAppData';
import { foodSchema, profileSchema } from '../types';
import { Modal } from '../components/ui/Modal';

export function Settings() {
  const { data, run, confirm, setPage } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [foodId, setFoodId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const food = data.foods.find((food) => food.id === foodId);
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    await run(async () => {
      const values = { ...data.profile };
      for (const key of ['name', 'startDay', 'endDay', 'tdeeSource'] as const)
        values[key] = String(form.get(key));
      for (const key of [
        'age',
        'height',
        'initialWeight',
        'goalWeight',
        'kcal',
        'protein',
        'carbs',
        'fat',
      ] as const)
        values[key] = Number(form.get(key));
      values.tdee = form.get('tdee') ? Number(form.get('tdee')) : null;
      await db.profile.put(profileSchema.parse(values));
    }, 'Perfil e metas atualizados.');
    setSaving(false);
  }
  async function download() {
    await run(async () => {
      const backup = await exportBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `fitg-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'Backup exportado. Guarde-o em um local seguro.');
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">DO SEU JEITO</span>
          <h2>
            Seu perfil. Suas metas<span className="accent">.</span>
          </h2>
        </div>
      </div>
      <form className="settings-form" key={JSON.stringify(data.profile)} onSubmit={saveProfile}>
        <div className="form-grid three">
          <label>
            Nome
            <input name="name" required defaultValue={data.profile.name} />
          </label>
          {(
            [
              ['age', 'Idade (anos)'],
              ['height', 'Altura (cm)'],
              ['initialWeight', 'Peso inicial de referencia (kg)'],
              ['goalWeight', 'Peso-alvo (kg)'],
              ['kcal', 'Meta fixa (kcal/dia)'],
              ['protein', 'Proteina (g/dia)'],
              ['carbs', 'Carboidratos (g/dia)'],
              ['fat', 'Gorduras (g/dia)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                required
                name={key}
                type="number"
                min="0.1"
                step={key === 'age' ? 1 : 0.1}
                defaultValue={data.profile[key]}
              />
            </label>
          ))}
          <label>
            Inicio
            <input name="startDay" type="date" required defaultValue={data.profile.startDay} />
          </label>
          <label>
            Data-alvo
            <input name="endDay" type="date" required defaultValue={data.profile.endDay} />
          </label>
        </div>
        <h3 className="form-subtitle">Gasto diario total (opcional)</h3>
        <p className="muted small">
          Estimativa informada por voce. Inclui atividades habituais; nao sera somada novamente aos
          treinos. Sem TDEE, o saldo fica desconhecido.
        </p>
        <div className="form-grid">
          <label>
            TDEE (kcal/dia)
            <input
              name="tdee"
              type="number"
              min="1"
              defaultValue={data.profile.tdee ?? ''}
              placeholder="Nao informado"
            />
          </label>
          <label>
            Fonte / metodologia
            <input
              name="tdeeSource"
              defaultValue={data.profile.tdeeSource}
              placeholder="Ex.: estimativa do profissional de saude"
            />
          </label>
        </div>
        <p className="muted small">
          Metas sao referencias editaveis, nao prescricao medica. Modo atual: meta fixa; atividade
          fisica nao altera automaticamente a meta alimentar.
        </p>
        <div className="form-actions">
          <button className="button primary" disabled={saving}>
            <Save size={17} />
            Salvar perfil
          </button>
        </div>
      </form>
      <section className="section-block">
        <div className="section-heading compact">
          <div>
            <h3>Seus dados ficam com voce</h3>
            <p className="muted">
              Armazenados neste navegador. Limpar os dados ou desinstalar pode apaga-los. Exporte
              backups regularmente.
            </p>
          </div>
          <ShieldCheck className="accent" size={30} />
        </div>
        <div className="inline-actions wrap">
          <button className="button ghost" onClick={download}>
            <Download size={17} />
            Exportar backup JSON
          </button>
          <button className="button ghost" onClick={() => inputRef.current?.click()}>
            <FileUp size={17} />
            Restaurar backup
          </button>
          <button className="button ghost" onClick={() => setPage('integrations')}>
            Integracoes
            <ArrowRight size={17} />
          </button>
        </div>
        <input
          hidden
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            await run(async () => {
              if (file.size > 20 * 1024 * 1024) throw new Error('Backup excede o limite de 20 MB.');
              const backup = backupSchema.parse(JSON.parse(await file.text()));
              confirm(
                `Substituir todos os dados locais por este backup? ${backup.logs.length} refeicoes e ${backup.activities.length} treinos. Esta acao nao pode ser desfeita.`,
                () => restoreBackup(backup),
              );
            }, 'Arquivo validado; confirme a restauracao.');
          }}
        />
        <p className="muted small">
          Sem telemetria, upload ou sincronizacao implicita. Backup contem dados de saude:
          compartilhe apenas com quem voce autorizar.
        </p>
      </section>
      <section className="section-block">
        <div className="section-heading compact">
          <div>
            <h3>Catalogo nutricional</h3>
            <p className="muted">
              Valores aproximados por unidade/base. Edicoes nao alteram consumos anteriores.
            </p>
          </div>
        </div>
        <div className="catalog-list">
          {data.foods.map((food) => (
            <button key={food.id} onClick={() => setFoodId(food.id)}>
              <span>{food.name}</span>
              <span>
                {food.kcal} kcal / {food.basis} {food.unit}
                <ArrowRight size={15} />
              </span>
            </button>
          ))}
        </div>
      </section>
      {food && (
        <Modal title="Editar alimento" onClose={() => setFoodId(null)}>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const ok = await run(async () => {
                await db.foods.put(
                  foodSchema.parse({
                    ...food,
                    name: form.get('name'),
                    source: form.get('source'),
                    basis: Number(form.get('basis')),
                    kcal: Number(form.get('kcal')),
                    protein: Number(form.get('protein')),
                    carbs: Number(form.get('carbs')),
                    fat: Number(form.get('fat')),
                  }),
                );
              }, 'Alimento atualizado.');
              if (ok) setFoodId(null);
            }}
          >
            <label>
              Nome
              <input required name="name" defaultValue={food.name} />
            </label>
            <div className="form-grid">
              {(['basis', 'kcal', 'protein', 'carbs', 'fat'] as const).map((key) => (
                <label key={key}>
                  {
                    {
                      basis: `Base (${food.unit})`,
                      kcal: 'kcal',
                      protein: 'Proteina (g)',
                      carbs: 'Carboidratos (g)',
                      fat: 'Gorduras (g)',
                    }[key]
                  }
                  <input
                    name={key}
                    required
                    type="number"
                    min={key === 'basis' ? 0.1 : 0}
                    step="0.1"
                    defaultValue={food[key]}
                  />
                </label>
              ))}
            </div>
            <label>
              Fonte
              <textarea required name="source" defaultValue={food.source} />
            </label>
            <div className="form-actions">
              <button className="button primary">
                <Save size={16} />
                Salvar alimento
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
