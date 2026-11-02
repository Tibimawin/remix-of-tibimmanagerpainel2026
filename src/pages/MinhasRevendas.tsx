import React, { useCallback, useEffect, useState } from 'react';
import {
  Users, Coins, Copy, Check, Link2, Save, Loader2, Settings2, Receipt,
  Plus, Minus, Ban, ShieldCheck, KeyRound, DollarSign, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import {
  UserConfigService,
  type ResellerSettings,
  type ResellerCreditPackage,
} from '@/services/UserConfigService';

interface ResellerDoc {
  id: string;
  email: string;
  nome: string;
  whatsapp?: string;
  masterId: string;
  creditBalance: number;
  status: string;
  createdAt: string;
}

interface ResellerTxDoc {
  id: string;
  type: string;
  credits: number;
  value?: number;
  status?: string;
  descricao?: string;
  resellerEmail?: string;
  createdAt: string;
  paidAt?: string;
}

const DEFAULT_SETTINGS: ResellerSettings = {
  enabled: true,
  asaasApiKey: '',
  creditPrice: 5,
  packages: [{ credits: 10, price: 45, label: 'Pacote 10' }],
  dnsHost: 'https://api.tibimmanagerpainel.shop',
  whatsapp: '',
};

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtValor = (v?: number) =>
  typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

export const MinhasRevendas: React.FC = () => {
  const { userInfo } = useSimpleAuth();
  const uid = userInfo?.id || '';

  const [settings, setSettings] = useState<ResellerSettings>(DEFAULT_SETTINGS);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);

  const [resellers, setResellers] = useState<ResellerDoc[]>([]);
  const [transactions, setTransactions] = useState<ResellerTxDoc[]>([]);
  const [loadingResellers, setLoadingResellers] = useState(true);

  const [copiedLink, setCopiedLink] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const s = await UserConfigService.getResellerSettings(uid);
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
    } catch { /* mantém padrão */ }
    setLoadingConfig(false);
  }, [uid]);

  const loadResellers = useCallback(async () => {
    if (!uid) return;
    setLoadingResellers(true);
    try {
      const [resSnap, txSnap] = await Promise.all([
        getDocs(query(collection(db, 'resellers'), where('masterId', '==', uid))),
        getDocs(query(collection(db, 'resellerTransactions'), where('masterId', '==', uid))),
      ]);
      const resList: ResellerDoc[] = resSnap.docs.map(d => ({ id: d.id, ...d.data() } as ResellerDoc))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      const txList: ResellerTxDoc[] = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as ResellerTxDoc))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      setResellers(resList);
      setTransactions(txList);
    } catch (err: any) {
      toast.error('Não foi possível carregar as revendas: ' + (err?.message || ''));
    } finally {
      setLoadingResellers(false);
    }
  }, [uid]);

  useEffect(() => { loadConfig(); loadResellers(); }, [loadConfig, loadResellers]);

  const referralLink = uid
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://tibimmanagerpainel.shop'}/revendas-creditos/cadastro?ref=${uid}`
    : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Link de indicação copiado!');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await UserConfigService.saveResellerSettings(uid, settings);
      toast.success('Configuração de revendas salva!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const updatePackage = (index: number, field: keyof ResellerCreditPackage, value: string) => {
    const packs = [...(settings.packages || [])];
    const pack = { ...packs[index] };
    if (field === 'label') pack.label = value;
    else pack[field] = Number(value) || 0;
    packs[index] = pack;
    setSettings({ ...settings, packages: packs });
  };

  const ajustarSaldo = async (r: ResellerDoc, delta: number) => {
    const novo = Math.max(0, (Number(r.creditBalance) || 0) + delta);
    try {
      await updateDoc(doc(db, 'resellers', r.id), { creditBalance: novo });
      setResellers(prev => prev.map(x => (x.id === r.id ? { ...x, creditBalance: novo } : x)));
      toast.success(`${delta > 0 ? 'Adicionado' : 'Removido'} ${Math.abs(delta)} crédito(s) de ${r.nome || r.email}.`);
    } catch (err: any) {
      toast.error('Erro ao ajustar saldo: ' + (err?.message || ''));
    }
  };

  const toggleStatus = async (r: ResellerDoc) => {
    const novoStatus = String(r.status || 'ativo').toLowerCase() === 'bloqueado' ? 'ativo' : 'bloqueado';
    try {
      await updateDoc(doc(db, 'resellers', r.id), { status: novoStatus });
      setResellers(prev => prev.map(x => (x.id === r.id ? { ...x, status: novoStatus } : x)));
      toast.success(novoStatus === 'bloqueado' ? 'Revenda bloqueada.' : 'Revenda reativada.');
    } catch (err: any) {
      toast.error('Erro ao alterar status: ' + (err?.message || ''));
    }
  };

  const creditosVendidos = transactions.filter(t => t.type === 'compra' && t.status === 'pago').reduce((a, t) => a + (t.credits || 0), 0);
  const totalRecebido = transactions.filter(t => t.type === 'compra' && t.status === 'pago').reduce((a, t) => a + (t.value || 0), 0);

  if (!uid) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Revendas</h1>
          <p className="text-sm text-muted-foreground">
            Revendedores indicados por você vendem suas listas com créditos — cada crédito vale 30 dias de linha.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Revendas</p>
            <p className="text-xl font-bold">{resellers.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Créditos vendidos</p>
            <p className="text-xl font-bold text-amber-600">{creditosVendidos}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Recebido</p>
            <p className="text-xl font-bold text-emerald-600">{fmtValor(totalRecebido)}</p>
          </div>
        </div>
      </div>

      {/* Link de indicação */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Link de Indicação para Revendas</h2>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Envie este link para quem quiser revender suas listas. A revenda nasce ligada à SUA conta: vende seus conteúdos,
          paga por PIX direto na sua conta Asaas e consome seus créditos de linha.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={referralLink} className="font-mono text-xs" />
          <Button onClick={copyLink} variant="outline" className="shrink-0">
            {copiedLink ? <Check className="mr-2 h-4 w-4 text-emerald-600" /> : <Copy className="mr-2 h-4 w-4" />}
            {copiedLink ? 'Copiado!' : 'Copiar'}
          </Button>
          <Button asChild variant="outline" className="shrink-0">
            <a href={referralLink} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Abrir</a>
          </Button>
        </div>
      </div>

      {/* Configuração */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Configuração do Portal de Revendas</h2>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="revenda-enabled" className="text-sm text-muted-foreground">Revendas ativas</Label>
            <Switch id="revenda-enabled" checked={settings.enabled} onCheckedChange={v => setSettings({ ...settings, enabled: v })} />
          </div>
        </div>

        {loadingConfig ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Chave API Asaas (sua conta)</Label>
                <div className="flex gap-2">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={settings.asaasApiKey}
                    onChange={e => setSettings({ ...settings, asaasApiKey: e.target.value })}
                    placeholder="Cole sua chave da API Asaas"
                  />
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => setShowKey(v => !v)}>
                    {showKey ? 'Ocultar' : 'Mostrar'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O PIX das revendas cai direto na SUA conta Asaas — nada passa pelo painel.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Preço por crédito (R$)</Label>
                <Input type="number" step="0.01" min={1} value={settings.creditPrice}
                  onChange={e => setSettings({ ...settings, creditPrice: Number(e.target.value) || 5 })} />
                <p className="text-xs text-muted-foreground">Usado quando a revenda compra créditos avulsos (fora dos pacotes).</p>
              </div>
              <div className="space-y-2">
                <Label>Host da sua DNS (links das listas)</Label>
                <Input value={settings.dnsHost}
                  onChange={e => setSettings({ ...settings, dnsHost: e.target.value })}
                  placeholder="https://api.tibimmanagerpainel.shop" />
                <p className="text-xs text-muted-foreground">Base dos links M3U/Xtream entregues aos clientes das revendas.</p>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp de suporte (opcional)</Label>
                <Input value={settings.whatsapp} onChange={e => setSettings({ ...settings, whatsapp: e.target.value })}
                  placeholder="11 99999-9999" />
              </div>
            </div>

            {/* Pacotes de créditos */}
            <div className="space-y-2">
              <Label>Pacotes de créditos (opcional)</Label>
              <div className="space-y-2">
                {(settings.packages || []).map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Input type="number" min={1} value={p.credits} onChange={e => updatePackage(i, 'credits', e.target.value)}
                      className="w-24" title="Créditos" />
                    <span className="text-sm text-muted-foreground">créditos por</span>
                    <Input type="number" step="0.01" min={0} value={p.price} onChange={e => updatePackage(i, 'price', e.target.value)}
                      className="w-28" title="Preço R$" />
                    <span className="text-sm text-muted-foreground">R$</span>
                    <Input value={p.label || ''} onChange={e => updatePackage(i, 'label', e.target.value)}
                      className="w-40" placeholder="Nome do pacote" />
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                      onClick={() => setSettings({ ...settings, packages: settings.packages.filter((_, j) => j !== i) })}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm"
                onClick={() => setSettings({ ...settings, packages: [...(settings.packages || []), { credits: 10, price: 45, label: '' }] })}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar pacote
              </Button>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar configuração
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de revendas */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Revendas cadastradas</h2>
          {loadingResellers && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {!loadingResellers && resellers.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nenhuma revenda ainda. Compartilhe o link de indicação acima para começar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Revenda</th>
                  <th className="px-4 py-3">Saldo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Desde</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {resellers.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.nome || '—'}</p>
                      <p className="text-xs text-muted-foreground">{r.email}{r.whatsapp ? ` · ${r.whatsapp}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-600">{r.creditBalance ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        String(r.status || 'ativo').toLowerCase() === 'bloqueado'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        {String(r.status || 'ativo') === 'bloqueado' ? 'Bloqueada' : 'Ativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" title="Adicionar 1 crédito" onClick={() => ajustarSaldo(r, 1)} className="h-8 px-2">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Remover 1 crédito" onClick={() => ajustarSaldo(r, -1)} className="h-8 px-2">
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm"
                          onClick={() => toggleStatus(r)}
                          className={`h-8 px-2 ${String(r.status || 'ativo').toLowerCase() === 'bloqueado' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {String(r.status || 'ativo').toLowerCase() === 'bloqueado'
                            ? <><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Reativar</>
                            : <><Ban className="mr-1 h-3.5 w-3.5" /> Bloquear</>}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transações */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Receipt className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Movimentações das revendas</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Sem movimentações ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Revenda</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Créditos</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.slice(0, 50).map(t => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">{t.descricao || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.resellerEmail || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        t.type === 'compra' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        {t.type === 'compra' ? `Compra${t.status === 'pago' ? ' (paga)' : ' (pendente)'}`
                          : t.type === 'linha' ? 'Linha criada'
                          : t.type === 'renovacao' ? 'Renovação'
                          : 'Teste 1h'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{t.type === 'compra' ? `+${t.credits}` : t.credits ? `−${t.credits}` : '0'}</td>
                    <td className="px-4 py-3">{t.value != null ? fmtValor(t.value) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinhasRevendas;
