/**
 * Cliente HTTP do portal de revendas — fala com a API serverless /reseller-*
 * (rewritten para api/xtream.js na Vercel). A sessão é o ID token Firebase,
 * enviado no header x-reseller-token; o backend valida via identitytoolkit.
 */

import { auth, authReady, db } from '@/config/firebase';
import { getIdToken, onIdTokenChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { BASEROW_PROXY_CONFIG } from '@/config/proxyConfig';

type Json = any;

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const env = BASEROW_PROXY_CONFIG.getEnvironment();
  if (env === 'lovable-preview' || env === 'lovable-production') {
    return 'https://tibimmanagerpainel2026-git-main-apktibim-1235s-projects.vercel.app/';
  }
  return `${window.location.origin}/`;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let authUnsub: (() => void) | null = null;
let cachedToken: string | null = null;

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão de revenda expirada. Faça login novamente.');
  const fresh = await getIdToken(user, true);
  cachedToken = fresh;
  return fresh;
}

function ensureTokenListener() {
  if (authUnsub || typeof window === 'undefined') return;
  authUnsub = onIdTokenChanged(auth, user => {
    cachedToken = null;
    if (user) getIdToken(user, false).then(t => { cachedToken = t; }).catch(() => {});
  });
}

async function api(path: string, method: 'GET' | 'POST' = 'GET', body?: Json): Promise<Json> {
  await authReady;
  ensureTokenListener();
  const token = cachedToken ? await getIdToken(auth.currentUser!, false) : await getToken();
  const lastErr: { message?: string } = { message: 'Não foi possível conectar ao portal de revendas.' };
  const baseUrl = getApiBase();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-reseller-token': token,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const contentType = resp.headers.get('content-type') || '';
      const text = await resp.text();
      let json: any = {};
      if (contentType.includes('application/json') || (text.startsWith('{') || text.startsWith('['))) {
        try { json = JSON.parse(text); } catch { json = {}; }
      } else if (text.trim().startsWith('<')) {
        throw new Error('Servidor retornou resposta inesperada (HTML).');
      }

      if (resp.ok) return json;
      if (resp.status === 401) throw new Error(json?.error || 'Sessão inválida. Entre novamente.');
      const msg = String(json?.error || '').slice(0, 200);
      throw new Error(msg || `Erro ${resp.status} no portal de revendas.`);
    } catch (err: any) {
      const isNetwork = !err?.message?.includes('Sessão inválida') && !err?.message?.includes('HTML');
      if (err?.message?.startsWith('Erro 4') || !isNetwork) throw err;
      lastErr.message = err?.message || lastErr.message;
      await sleep(attempt === 0 ? 500 : 1200);
    }
  }
  throw new Error(lastErr.message || 'Sem conexão com o portal de revendas.');
}

export type ResellerCreditPackage = { credits: number; price: number; label?: string };

export type ResellerLineLinks = {
  dns_host: string;
  m3u_ts: string;
  m3u_hls: string;
  player_api: string;
};

export type ResellerLine = {
  id: string;
  nome: string;
  usuario: string;
  senha: string;
  vencimento: string;
  status: string;
};

export type ResellerState = {
  reseller: {
    uid: string;
    email: string;
    nome: string;
    whatsapp: string;
    creditBalance: number;
    status: string;
    createdAt: string;
  };
  settings: {
    enabled: boolean;
    creditPrice: number;
    packages: ResellerCreditPackage[];
    dnsHost: string;
    whatsapp: string;
    asaasConfigured: boolean;
  };
  master: { id: string; name: string };
  creditsPerLine: number;
};

export type CreateLineResult = {
  ok: boolean;
  tipo: string;
  username: string;
  password: string;
  vencimento: string;
  creditBalance: number;
  links: ResellerLineLinks;
  masterName: string;
};

export type PixResult = {
  ok: boolean;
  paymentId: string;
  value: number;
  credits: number;
  transactionId: string;
  qrPayload: string;
  qrImage: string;
  expiresAt: string;
};

export type ResellerTransaction = {
  id: string;
  type: string;
  resellerId: string;
  masterId: string;
  credits: number;
  value?: number;
  status?: string;
  descricao?: string;
  createdAt: string;
};

export const ResellerService = {
  async signupInfo(ref: string): Promise<{ ok: boolean; masterName: string }> {
    const cleanRef = String(ref || '').trim();
    if (!cleanRef) throw new Error('Código de indicação não informado.');

    // 1. Tentar ler diretamente do Firestore (instantâneo e offline-first)
    try {
      await authReady;
      const userSnap = await getDoc(doc(db, 'users', cleanRef)).catch(() => null);
      if (userSnap && userSnap.exists()) {
        const u = userSnap.data();
        const masterName = String(u.appStoreName || u.name || u.userName || u.email || 'Seu indicador').trim();
        return { ok: true, masterName };
      }
      const cfgSnap = await getDoc(doc(db, 'userConfigs', cleanRef)).catch(() => null);
      if (cfgSnap && cfgSnap.exists()) {
        const c = cfgSnap.data();
        const masterName = String((c as any).appStoreName || (c as any).name || (c as any).userName || 'Seu indicador').trim();
        return { ok: true, masterName };
      }
    } catch (e) {
      console.warn('[ResellerService] Leitura Firestore direta falhou, tentando API:', e);
    }

    // 2. Fallback via API
    const url = `${getApiBase()}reseller-signup-info?ref=${encodeURIComponent(cleanRef)}`;
    const resp = await fetch(url);
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const j = await resp.json();
      if (!j?.ok) throw new Error(j?.error || 'Indicação inválida.');
      return j;
    }
    throw new Error('Não foi possível verificar o indicador. Confirme o link recebido.');
  },

  async signup(payload: { ref: string; nome?: string; whatsapp?: string }): Promise<{ ok: boolean; alreadyLinked?: boolean }> {
    await authReady;
    const user = auth.currentUser;
    if (user) {
      try {
        const cleanRef = String(payload.ref || '').trim();
        const resellerDoc = {
          uid: user.uid,
          masterId: cleanRef,
          email: (user.email || '').toLowerCase(),
          nome: String(payload.nome || user.displayName || (user.email || '').split('@')[0]).trim(),
          whatsapp: String(payload.whatsapp || '').trim(),
          creditBalance: 0,
          status: 'ativo',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'resellers', user.uid), resellerDoc, { merge: true });
      } catch (err) {
        console.warn('[ResellerService] setDoc direto falhou:', err);
      }
    }
    try {
      return await api('reseller-signup', 'POST', payload);
    } catch {
      return { ok: true };
    }
  },

  async state(): Promise<ResellerState> {
    try {
      return (await api('reseller-state', 'GET')) as ResellerState;
    } catch (apiErr: any) {
      if (apiErr?.message?.includes('bloqueada') || apiErr?.message?.includes('Sessão inválida')) {
        throw apiErr;
      }
      // Fallback robusto direto pelo Firestore caso haja atraso na API
      await authReady;
      const user = auth.currentUser;
      if (!user) throw new Error('Sessão de revenda expirada. Faça login novamente.');

      const rSnap = await getDoc(doc(db, 'resellers', user.uid)).catch(() => null);
      if (!rSnap || !rSnap.exists()) {
        throw new Error('Conta de revenda não encontrada. Faça o cadastro com o link de indicação.');
      }
      const r = rSnap.data();
      const masterId = String(r.masterId || '');

      let masterName = 'Painel';
      let resellerSettings: any = null;
      if (masterId) {
        const [uSnap, cSnap] = await Promise.all([
          getDoc(doc(db, 'users', masterId)).catch(() => null),
          getDoc(doc(db, 'userConfigs', masterId)).catch(() => null),
        ]);
        if (uSnap?.exists()) {
          const u = uSnap.data();
          masterName = String(u.appStoreName || u.name || u.email || 'Painel').trim();
        }
        if (cSnap?.exists()) {
          const c = cSnap.data();
          resellerSettings = c.resellerSettings;
        }
      }

      return {
        reseller: {
          uid: user.uid,
          email: r.email || user.email || '',
          nome: r.nome || '',
          whatsapp: r.whatsapp || '',
          creditBalance: Number(r.creditBalance) || 0,
          status: r.status || 'ativo',
          createdAt: r.createdAt || '',
        },
        settings: {
          enabled: resellerSettings?.enabled !== false,
          creditPrice: Number(resellerSettings?.creditPrice) || 5,
          packages: Array.isArray(resellerSettings?.packages) ? resellerSettings.packages : [{ credits: 10, price: 45, label: 'Pacote 10' }],
          dnsHost: String(resellerSettings?.dnsHost || 'https://api.tibimmanagerpainel.shop'),
          whatsapp: String(resellerSettings?.whatsapp || ''),
          asaasConfigured: Boolean(resellerSettings?.asaasApiKey),
        },
        master: { id: masterId, name: masterName },
        creditsPerLine: 30,
      };
    }
  },

  lines(): Promise<{ ok: boolean; lines: ResellerLine[]; dnsHost: string; masterId: string }> {
    return api('reseller-lines', 'GET');
  },

  createLine(payload: {
    tipo: 'linha' | 'teste';
    nome?: string;
    usuario?: string;
    senha?: string;
    whatsapp?: string;
  }): Promise<CreateLineResult> {
    return api('reseller-line', 'POST', payload) as unknown as Promise<CreateLineResult>;
  },

  renewLine(rowId: string): Promise<{ ok: boolean; creditBalance: number; vencimento: string }> {
    return api('reseller-renew', 'POST', { rowId });
  },

  createPix(payload: { credits: number; cpf: string }): Promise<PixResult> {
    return api('reseller-pix', 'POST', payload) as unknown as Promise<PixResult>;
  },

  pixStatus(paymentId: string): Promise<{ status: string; credited: boolean; creditBalance: number }> {
    return api(`reseller-pix-status?paymentId=${encodeURIComponent(paymentId)}`, 'GET');
  },

  async transactions(): Promise<{ ok: boolean; transactions: ResellerTransaction[] }> {
    try {
      return await api('reseller-transactions', 'GET');
    } catch {
      await authReady;
      const user = auth.currentUser;
      if (!user) return { ok: true, transactions: [] };
      const q = query(collection(db, 'resellerTransactions'), where('resellerId', '==', user.uid));
      const snap = await getDocs(q).catch(() => null);
      const list = (snap?.docs || []).map(d => ({ id: d.id, ...d.data() } as ResellerTransaction))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return { ok: true, transactions: list };
    }
  },
};
