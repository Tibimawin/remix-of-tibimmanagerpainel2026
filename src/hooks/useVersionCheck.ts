import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const CURRENT_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const POLL_INTERVAL_MS = 60_000; // 1 minuto
const STORAGE_KEY = 'app:lastSeenVersion';

const forceReload = () => {
  try {
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  } catch {}
  // Quebra cache do HTML
  const url = new URL(window.location.href);
  url.searchParams.set('v', String(Date.now()));
  window.location.replace(url.toString());
};

let updatePromptShown = false;
const showUpdateToast = () => {
  if (updatePromptShown) return;
  updatePromptShown = true;
  toast('Nova versão disponível', {
    description: 'Atualize para receber as últimas correções.',
    duration: Infinity,
    action: {
      label: 'Atualizar agora',
      onClick: () => forceReload(),
    },
  });
};

export const useVersionCheck = () => {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (CURRENT_VERSION === 'dev') return;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (!data?.version) return;
        if (data.version !== CURRENT_VERSION) {
          localStorage.setItem(STORAGE_KEY, data.version);
          showUpdateToast();
        }
      } catch {
        // silencioso
      }
    };

    check();
    intervalRef.current = window.setInterval(check, POLL_INTERVAL_MS);

    const onFocus = () => check();
    window.addEventListener('focus', onFocus);

    // Detecta erro de chunk (bundle antigo) e força reload
    const onChunkError = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const isAsset =
        target &&
        (target.tagName === 'SCRIPT' || target.tagName === 'LINK');
      if (!isAsset) return;
      const src =
        (target as HTMLScriptElement).src ||
        (target as HTMLLinkElement).href ||
        '';
      if (/\/assets\/.+\.(js|css)/.test(src)) {
        console.warn('[VersionCheck] Asset failed to load, forcing reload:', src);
        forceReload();
      }
    };
    window.addEventListener('error', onChunkError, true);

    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg = String(e?.reason?.message || e?.reason || '');
      if (
        /Failed to fetch dynamically imported module/i.test(msg) ||
        /Importing a module script failed/i.test(msg) ||
        /ChunkLoadError/i.test(msg)
      ) {
        console.warn('[VersionCheck] Dynamic import failed, forcing reload:', msg);
        forceReload();
      }
    };
    window.addEventListener('unhandledrejection', onUnhandled);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('error', onChunkError, true);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);
};
