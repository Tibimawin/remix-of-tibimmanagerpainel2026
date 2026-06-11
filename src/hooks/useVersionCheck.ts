import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const CURRENT_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const POLL_INTERVAL_MS = 60_000; // 1 minuto
const STORAGE_KEY = 'app:lastSeenVersion';
const RELOAD_GUARD_KEY = 'app:reloadGuard';
const RELOAD_GUARD_WINDOW_MS = 60_000;
const RELOAD_GUARD_MAX = 2;

const canReload = () => {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    const now = Date.now();
    const data = raw ? JSON.parse(raw) : { count: 0, ts: now };
    if (now - data.ts > RELOAD_GUARD_WINDOW_MS) {
      sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify({ count: 1, ts: now }));
      return true;
    }
    if (data.count >= RELOAD_GUARD_MAX) return false;
    sessionStorage.setItem(
      RELOAD_GUARD_KEY,
      JSON.stringify({ count: data.count + 1, ts: data.ts })
    );
    return true;
  } catch {
    return true;
  }
};

const forceReload = () => {
  if (!canReload()) {
    console.warn('[VersionCheck] Reload bloqueado para evitar loop.');
    return;
  }
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

    let versionEndpointAvailable = false;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (!data?.version) return;
        versionEndpointAvailable = true;
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
      // Só age quando temos certeza que o endpoint de versão está disponível
      // (evita loops em preview/dev quando version.json não existe)
      if (!versionEndpointAvailable) return;
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
      if (!versionEndpointAvailable) return;
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
