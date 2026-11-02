/**
 * Cliente HTTP do portal de revendas — fala com a API serverless /reseller-*
 * (rewritten para api/xtream.js na Vercel). A sessão é o ID token Firebase,
 * enviado no header x-reseller-token; o backend valida via identitytoolkit.
 */

import { auth, authReady } from '@/config/firebase';
import { getIdToken, onIdTokenChanged } from 'firebase/auth';

type Json = any;

const API_BASE = typeof window !== 'undefined' ? `${window.location.origin}/` : '';

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
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-reseller-token': token,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await resp.json().catch(() => ({}));
      if (resp.ok) return json;
      if (resp.status === 401) throw new Error(json?.error || 'Sessão inválida. Entre novamente.');
      const msg = String(json?.error || '').slice(0, 200);
      throw new Error(msg || `Erro ${resp.status} no portal de revendas.`);
    } catch (err: any) {
      const isNetwork = !err?.message?.includes('Sessão inválida');
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
  signupInfo(ref: string): Promise<{ ok: boolean; masterName: string }> {
    const url = `${API_BASE}reseller-signup-info?ref=${encodeURIComponent(ref)}`;
    return fetch(url)
      .then(r => r.json())
      .then(j => { if (!j?.ok) throw new Error(j?.error || 'Indicação inválida.'); return j; });
  },

  signup(payload: { ref: string; nome?: string; whatsapp?: string }): Promise<{ ok: boolean; alreadyLinked?: boolean }> {
    return api('reseller-signup', 'POST', payload);
  },

  state(): Promise<ResellerState> {
    return api('reseller-state', 'GET') as unknown as Promise<ResellerState>;
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

  transactions(): Promise<{ ok: boolean; transactions: ResellerTransaction[] }> {
    return api('reseller-transactions', 'GET');
  },
};
