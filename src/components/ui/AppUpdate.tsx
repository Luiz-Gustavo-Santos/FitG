import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Modal } from './Modal';

const hasOpenEditor = () => Boolean(document.querySelector('form, dialog[open]'));

export function AppUpdate() {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [blocked, setBlocked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_, value) => {
      registration.current = value;
    },
    onRegisterError: () =>
      setError('Nao foi possivel verificar atualizacoes. Seus dados locais foram mantidos.'),
  });
  useEffect(() => {
    const inspect = () => setBlocked(hasOpenEditor());
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    inspect();
    const check = () => {
      if (navigator.onLine && document.visibilityState === 'visible')
        void registration.current?.update().catch(() => undefined);
    };
    const interval = window.setInterval(check, 15 * 60 * 1000);
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      observer.disconnect();
      clearInterval(interval);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  if (!needRefresh) return null;
  return (
    <>
      <aside className="app-update" aria-label="Atualizacao do FitG" aria-live="polite">
        <strong>Nova versao disponivel</strong>
        <p>
          {blocked && !confirming
            ? 'Conclua ou feche o formulario antes de atualizar.'
            : 'Seus registros locais serao mantidos.'}
        </p>
        {error && <p role="alert">{error}</p>}
        <button
          type="button"
          className="button primary"
          disabled={blocked || updating}
          onClick={() => {
            if (!hasOpenEditor()) setConfirming(true);
          }}
        >
          <RefreshCw size={17} />
          Atualizar FitG
        </button>
      </aside>
      {confirming && (
        <Modal
          title="Atualizar FitG"
          onClose={() => {
            if (!updating) setConfirming(false);
          }}
        >
          <p>A pagina sera recarregada. Os registros salvos neste navegador serao preservados.</p>
          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              disabled={updating}
              onClick={() => setConfirming(false)}
            >
              Agora nao
            </button>
            <button
              type="button"
              className="button primary"
              disabled={updating}
              onClick={async () => {
                if (
                  document.querySelector('form') ||
                  document.querySelectorAll('dialog[open]').length > 1
                ) {
                  setConfirming(false);
                  return;
                }
                setUpdating(true);
                setError('');
                try {
                  await updateServiceWorker(true);
                } catch {
                  setError(
                    'Atualizacao nao concluida. Seus dados foram mantidos; tente novamente.',
                  );
                } finally {
                  setUpdating(false);
                  setConfirming(false);
                }
              }}
            >
              <RefreshCw size={17} />
              {updating ? 'Atualizando...' : 'Confirmar atualizacao'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
