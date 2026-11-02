/**
 * Serviço do Módulo de Revendas (créditos).
 * Fala com os endpoints /reseller-* no servidor da DNS (api/xtream.js handler v6).
 * A identidade da revenda é validada no servidor via Firebase ID token (x-reseller-token).
 */
import { auth } from '@/config/firebase';

const DEFAULT_API_BASE = 'https://api.tibimmanagerpainel.shop';

export const getResellerApiBase = (): string => {
  try {
    return localStorage.getItem('tibim_reseller_api_base') || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
};

export interface ResellerCreditPackage {
  credits: number;
  price: number;
  label?: string;
}

export interface ResellerSettingsPublic {
  enabled: boolean;
  creditPrice: number;
  packages: ResellerCreditPackage[];
  dnsHost: string;
  whatsapp: string;
  asaasConfigured: boolean;
}

export interface ResellerProfile {
  uid: string;
  email: string;
  nome: string;
  whatsapp: string;
  creditBalance: number;
  status: string;
  createdAt: string;
}

export interface ResellerState {
  reseller: ResellerProfile;
  settings: ResellerSettingsPublic;
  master: { id: string; name: string };
  creditsPerLine: number;
}

export interface ResellerLine {
  id: string;
  nome: string;
  usuario: string;
  senha: string;
  vencimento: string;
  status: string;
}

export interface ResellerLineLinks {
  dns_host: string;
  m3u_ts: string;
  m3u_hls: string;
  player_api: string;
}

export interface ResellerTransaction {
  id: string;
  type: string;
  resellerId: string;
  resellerEmail: string;
  masterId: string;
  credits: number;
  value?: number;
  status?: string;
  asaasPaymentId?: string;
  descricao?: string;
  createdAt: string;
  paidAt?: string;
}

export interface CreateLineResult {
  ok: boolean;
  tipo: 'linha' | 'teste';
  username: string;
  password: string;
  vencimento: string;
  creditBalance: number;
  links: ResellerLineLinks;
  masterName: string;
}

export interface PixResult {
  ok: boolean;
  paymentId: string;
  value: number;
  credits: number;
  transactionId: string;
  qrPayload: string;
  qrImage: string;
  expiresAt: string;
}

export interface PixStatusResult {
  status: 'pendente' | 'pago';
  credited: boolean;
  creditBalance: number;
}

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão da revenda expirada. Entre novamente.');
  return user.getIdToken();
}

async function call<T>(
  route: string,
  options: { method?: 'GET' | 'POST'; body?: Record<string, unknown> } = {}
): Promise<T> {
  const token = await getIdToken();
  const base = getResellerApiBase().replace(/\/+$/, '');
  const resp = await fetch(`${base}/${route}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-reseller-token': token,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let json: any = {};
  try { json = await resp.json(); } catch { /* resposta vazia */ }
  if (!resp.ok) {
    throw new Error(json?.error || `Falha na comunicação com o servidor (${resp.status})`);
  }
  return json as T;
}

export const ResellerService = {
  getApiBase: getResellerApiBase,

  signupInfo: (ref: string) =>
    call<{ ok: boolean; masterName: string }>(`reseller-signup-info?ref=${encodeURIComponent(ref)}`),

  signup: (payload: { ref: string; nome: string; whatsapp: string; email?: string }) =>
    call<{ ok: boolean; alreadyLinked?: boolean }>('reseller-signup', { method: 'POST', body: payload }),

  state: () => call<ResellerState>('reseller-state'),

  lines: () => call<{ ok: boolean; lines: ResellerLine[]; dnsHost: string; masterId: string }>('reseller-lines'),

  transactions: () => call<{ ok: boolean; transactions: ResellerTransaction[] }>('reseller-transactions'),

  createLine: (payload: { tipo: 'linha' | 'teste'; nome?: string; usuario?: string; senha?: string; whatsapp?: string }) =>
    call<CreateLineResult>('reseller-line', { method: 'POST', body: payload }),

  renewLine: (rowId: string) =>
    call<{ ok: boolean; creditBalance: number; vencimento: string }>('reseller-renew', { method: 'POST', body: { rowId } }),

  createPix: (payload: { credits: number; cpf: string }) =>
    call<PixResult>('reseller-pix', { method: 'POST', body: payload }),

  pixStatus: (paymentId: string) =>
    call<PixStatusResult>(`reseller-pix-status?paymentId=${encodeURIComponent(paymentId)}`),
};
