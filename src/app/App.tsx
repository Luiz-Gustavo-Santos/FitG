import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Dumbbell,
  Home as HomeIcon,
  LoaderCircle,
  Menu,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  Utensils,
  WifiOff,
  X,
} from 'lucide-react';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { initialize } from '../db';
import { AppProvider, useAppData, type Page } from '../hooks/useAppData';
import { dayLabel, localDay } from '../utils/dates';
import type { Activity as ActivityType, Meal } from '../types';
import { Home } from '../pages/Home';
import { Nutrition } from '../pages/Nutrition';
import { Training } from '../pages/Training';
import { Progress } from '../pages/Progress';
import { Settings } from '../pages/Settings';
import { Integrations } from '../pages/Integrations';
import { Modal } from '../components/ui/Modal';
import { ActivityEditor, MealEditor, WeightEditor } from '../components/ui/Editors';

const navigation = [
  { id: 'home', label: 'Home', title: 'Visao geral', icon: HomeIcon },
  { id: 'nutrition', label: 'Alimentacao', title: 'Alimentacao', icon: Utensils },
  { id: 'training', label: 'Treinos', title: 'Treinos', icon: Dumbbell },
  { id: 'progress', label: 'Evolucao', title: 'Evolucao', icon: Activity },
  { id: 'settings', label: 'Perfil', title: 'Perfil e metas', icon: SettingsIcon },
] as const;
type Editor =
  | { kind: 'meal'; meal: Meal; plan: boolean }
  | { kind: 'activity'; activity?: ActivityType }
  | { kind: 'weight' }
  | null;

export function App() {
  const data = useAppData();
  const [day, setDay] = useState(localDay());
  const [page, updatePage] = useState<Page>('home');
  const [editor, setEditor] = useState<Editor>(null);
  const [confirmation, setConfirmation] = useState<{
    message: string;
    action: () => Promise<unknown>;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [startupError, setStartupError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    initialize().catch(() =>
      setStartupError(
        'Nao foi possivel inicializar o armazenamento. Verifique as permissoes do navegador.',
      ),
    );
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), toast.error ? 9000 : 4500);
    return () => clearTimeout(timeout);
  }, [toast]);
  function setPage(next: Page) {
    updatePage(next);
    setMenu(false);
    window.scrollTo({ top: 0 });
  }
  async function run(action: () => Promise<unknown>, message: string) {
    try {
      await action();
      setToast({ message, error: false });
      return true;
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Erro inesperado';
      setToast({
        message: text.startsWith('[')
          ? 'Dados invalidos. Confira quantidades, datas e campos obrigatorios.'
          : text,
        error: true,
      });
      return false;
    }
  }
  if (startupError)
    return (
      <main className="startup">
        <CircleAlert size={36} />
        <h1>Precisamos do armazenamento local.</h1>
        <p>{startupError}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Tentar novamente
        </button>
      </main>
    );
  if (!data)
    return (
      <main className="startup" aria-live="polite">
        <LoaderCircle className="spin" size={32} />
        <h1>Preparando seu espaco.</h1>
        <p>Seus dados ficam neste dispositivo.</p>
      </main>
    );
  const elapsed = Math.max(
    0,
    differenceInCalendarDays(parseISO(day), parseISO(data.profile.startDay)),
  );
  const duration = Math.max(
    1,
    differenceInCalendarDays(parseISO(data.profile.endDay), parseISO(data.profile.startDay)),
  );
  return (
    <AppProvider
      value={{
        data,
        day,
        setDay,
        page,
        setPage,
        run,
        openMeal: (meal, plan = false) => setEditor({ kind: 'meal', meal, plan }),
        newMeal: () =>
          setEditor({
            kind: 'meal',
            plan: true,
            meal: {
              id: crypto.randomUUID(),
              name: 'Nova refeicao',
              time: '12:00',
              items: [{ id: crypto.randomUUID(), name: 'Alimento', foodId: null, amount: null }],
            },
          }),
        openActivity: (activity) => setEditor({ kind: 'activity', activity }),
        openWeight: () => setEditor({ kind: 'weight' }),
        confirm: (message, action) => setConfirmation({ message, action }),
      }}
    >
      <a className="skip-link" href="#main">
        Ir para o conteudo
      </a>
      <aside className={`sidebar ${menu ? 'menu-open' : ''}`}>
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setPage('home');
          }}
        >
          <div className="brand-icon">
            <Dumbbell size={27} strokeWidth={2.5} />
          </div>
          <div>
            <strong>
              Fit<span>G</span>
            </strong>
            <small>BUILD YOUR NEXT LEVEL</small>
          </div>
        </a>
        <span className="nav-caption">SEU ESPACO</span>
        <nav aria-label="Navegacao principal">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={
                page === item.id || (page === 'integrations' && item.id === 'settings')
                  ? 'active'
                  : ''
              }
              aria-current={page === item.id ? 'page' : undefined}
              onClick={() => setPage(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {page === item.id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-goal">
          <span className="eyebrow">ATE 26/12</span>
          <h3>Foco no processo.</h3>
          <p>
            Constancia transforma
            <br />
            intencao em evolucao.
          </p>
          <progress
            aria-label="Periodo da meta"
            max={duration}
            value={Math.min(duration, elapsed)}
          />
          <div>
            <span>Seu projeto</span>
            <strong>{Math.round(Math.min(1, elapsed / duration) * 100)}%</strong>
          </div>
        </div>
        <div className="sidebar-bottom">
          <span className="privacy-label">
            <ShieldCheck size={16} />
            Local. Privado. Seu.
          </span>
          <button className="profile-link" onClick={() => setPage('settings')}>
            <span className="avatar">{data.profile.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{data.profile.name}</strong>
              <small>Objetivo: hipertrofia</small>
            </div>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </aside>
      {menu && (
        <button className="menu-backdrop" aria-label="Fechar menu" onClick={() => setMenu(false)} />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="header-location">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span>SEU DASHBOARD</span>
            <ChevronRight size={14} />
            <strong>{navigation.find((item) => item.id === page)?.title ?? 'Integracoes'}</strong>
          </div>
          <div className="header-status">
            {online ? (
              <>
                <span className="status-dot" />
                Dados locais
              </>
            ) : (
              <>
                <WifiOff size={15} />
                Offline
              </>
            )}
            <span className="header-divider" />
            <span className="avatar small-avatar">
              {data.profile.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main">
          <div className="date-toolbar">
            <span className="date-label">{dayLabel(day)}</span>
            <div className="date-controls">
              <button
                className="icon-button"
                title="Dia anterior"
                aria-label="Dia anterior"
                onClick={() => setDay(localDay(addDays(parseISO(day), -1)))}
              >
                <ChevronLeft size={17} />
              </button>
              <label className="date-input">
                <CalendarDays size={16} />
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
              <button
                className="icon-button"
                title="Proximo dia"
                aria-label="Proximo dia"
                onClick={() => setDay(localDay(addDays(parseISO(day), 1)))}
              >
                <ChevronRight size={17} />
              </button>
              {day !== localDay() && (
                <button className="button ghost today-button" onClick={() => setDay(localDay())}>
                  Hoje
                </button>
              )}
            </div>
          </div>
          {page === 'home' && <Home />}
          {page === 'nutrition' && <Nutrition />}
          {page === 'training' && <Training />}
          {page === 'progress' && <Progress />}
          {page === 'settings' && <Settings />}
          {page === 'integrations' && <Integrations />}
          <footer className="page-footer">
            <span>FitG</span>
            <span>Seu ritmo. Sua evolucao.</span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegacao mobile">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={page === item.id ? 'active' : ''}
            aria-current={page === item.id ? 'page' : undefined}
            onClick={() => setPage(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {editor?.kind === 'meal' && (
        <MealEditor
          key={editor.meal.id}
          meal={editor.meal}
          plan={editor.plan}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.kind === 'activity' && (
        <ActivityEditor activity={editor.activity} onClose={() => setEditor(null)} />
      )}
      {editor?.kind === 'weight' && <WeightEditor onClose={() => setEditor(null)} />}
      {confirmation && (
        <Modal
          title="Confirmar acao"
          onClose={() => {
            if (!confirming) setConfirmation(null);
          }}
        >
          <p className="muted">{confirmation.message}</p>
          <div className="form-actions">
            <button
              className="button ghost"
              disabled={confirming}
              onClick={() => setConfirmation(null)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={confirming}
              onClick={async () => {
                setConfirming(true);
                const ok = await run(confirmation.action, 'Acao concluida.');
                setConfirming(false);
                if (ok) setConfirmation(null);
              }}
            >
              <Check size={17} />
              Confirmar
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? 'error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <CircleAlert size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Fechar notificacao"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </AppProvider>
  );
}
