import { supabase } from '@/integrations/supabase/client';
import { auth } from '@/config/firebase';

/**
 * Sistema de camuflagem de links.
 *
 * O link original nunca é gravado no Baserow: gravamos uma URL do nosso
 * domínio (`/api/s/<token>/<shortId>`) que passa pelo proxy da Vercel e só
 * funciona enquanto a assinatura do usuário estiver ativa.
 */

export interface CloakLinkInput {
  originalUrl: string;
  contentName?: string;
  kind?: 'content' | 'episode';
  source?: string;
}

interface QueuedLink {
  short_id: string;
  owner_uid: string;
  original_url: string;
  content_name?: string;
  kind: string;
  source: string;
}

/** Hash determinístico (FNV-1a 128-ish) — permite gerar o shortId sem round-trip. */
function shortHash(input: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 2246822519) >>> 0;
    h3 = Math.imul(h3 ^ (c * 31), 3266489917) >>> 0;
    h4 = Math.imul(h4 ^ (c + h1), 668265263) >>> 0;
  }
  return [h1, h2, h3, h4].map(h => h.toString(36)).join('');
}

export const getCloakBaseUrl = (): string => {
  const configured = (import.meta as any).env?.VITE_CLOAK_BASE_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

const PENDING_KEY = 'cloak-pending-links';

class CloakServiceImpl {
  private queue: Map<string, QueuedLink> = new Map();
  private tokenCache: { uid: string; token: string } | null = null;
  private flushTimer: number | null = null;
  private flushing = false;


  /** Registra/atualiza o usuário e devolve o token público dele. */
  async syncUser(params: {
    uid: string;
    email?: string;
    name?: string;
    expiresAt?: string | null;
    blocked?: boolean;
    features?: string[];
  }): Promise<string | null> {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const { data, error } = await supabase.functions.invoke('cloak', {
        body: {
          action: 'sync-user',
          firebase_uid: params.uid,
          email: params.email ?? null,
          name: params.name ?? null,
          expires_at: params.expiresAt ?? null,
          blocked: params.blocked === true,
          features: Array.isArray(params.features) ? params.features : [],
        },
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined
      });

      if (error) throw error;
      const token = (data as any)?.token as string | undefined;
      if (token) {
        this.tokenCache = { uid: params.uid, token };
        localStorage.setItem('cloak-token', JSON.stringify({ uid: params.uid, token }));
      }
      return token || null;
    } catch (err) {
      console.warn('[CLOAK] Falha ao sincronizar usuário:', err);
      return null;
    }
  }

  getCachedToken(uid: string): string | null {
    if (this.tokenCache?.uid === uid) return this.tokenCache.token;
    try {
      const raw = localStorage.getItem('cloak-token');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.uid === uid && parsed?.token) {
        this.tokenCache = parsed;
        return parsed.token;
      }
    } catch { /* ignore */ }
    return null;
  }

  /** Garante que temos um token para o usuário (sincroniza se necessário). */
  async ensureToken(params: { uid: string; email?: string; name?: string; expiresAt?: string | null }): Promise<string | null> {
    return this.getCachedToken(params.uid) || (await this.syncUser(params));
  }

  /**
   * Converte uma URL original em URL camuflada (síncrono).
   * O registro é enfileirado, salvo no localStorage (à prova de fechar a aba)
   * e enviado automaticamente para o banco.
   */
  cloakUrl(ownerUid: string, token: string, input: CloakLinkInput): string {
    const url = (input.originalUrl || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) return input.originalUrl;

    const shortId = shortHash(`${ownerUid}::${url}`);
    this.queue.set(shortId, {
      short_id: shortId,
      owner_uid: ownerUid,
      original_url: url,
      content_name: input.contentName,
      kind: input.kind || 'episode',
      source: input.source || 'miniseries',
    });
    this.persistQueue();
    this.scheduleFlush();

    return `${getCloakBaseUrl()}/api/s/${token}/${shortId}`;
  }

  /** Salva a fila no navegador para não perder links se a aba fechar. */
  private persistQueue(): void {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(Array.from(this.queue.values())));
    } catch { /* storage cheio: segue o jogo */ }
  }

  /** Recupera links pendentes de sessões anteriores. */
  restorePending(): void {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as QueuedLink[];
      if (Array.isArray(list)) {
        list.forEach(l => { if (l?.short_id) this.queue.set(l.short_id, l); });
      }
    } catch { /* ignore */ }
    if (this.queue.size > 0) this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 1200) as unknown as number;
  }

  /** Envia os links enfileirados para o banco (em lotes, com retentativa). */
  async flush(): Promise<void> {
    if (this.flushing) return;
    if (this.queue.size === 0) {
      try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
      return;
    }
    this.flushing = true;

    const links = Array.from(this.queue.values());
    const chunkSize = 200;

    try {
      for (let i = 0; i < links.length; i += chunkSize) {
        const chunk = links.slice(i, i + chunkSize);
        let saved = false;

        for (let attempt = 1; attempt <= 3 && !saved; attempt++) {
          try {
            const idToken = await auth.currentUser?.getIdToken();
            const { error } = await supabase.functions.invoke('cloak', {
              body: { action: 'register-links', links: chunk },
              headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined
            });
            if (error) throw error;
            saved = true;
          } catch (err) {
            console.warn(`[CLOAK] Tentativa ${attempt} falhou ao registrar lote:`, err);
            if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 800));
          }
        }

        if (saved) {
          // Só remove da fila o que realmente foi gravado no banco.
          chunk.forEach(l => this.queue.delete(l.short_id));
          this.persistQueue();
        } else {
          console.error('[CLOAK] Lote mantido na fila para nova tentativa.');
        }
      }
    } finally {
      this.flushing = false;
      if (this.queue.size > 0) this.scheduleFlush();
    }
  }

  get pendingCount(): number {
    return this.queue.size;
  }
}

export const CloakService = new CloakServiceImpl();

// Recupera e reenvia links que ficaram pendentes de sessões anteriores.
if (typeof window !== 'undefined') {
  CloakService.restorePending();
  
  // Usar uma flag para garantir apenas um listener global
  if (!(window as any)._cloakBeforeUnloadRegistered) {
    window.addEventListener('beforeunload', () => {
      if (CloakService.pendingCount > 0) void CloakService.flush();
    });
    (window as any)._cloakBeforeUnloadRegistered = true;
  }
}
