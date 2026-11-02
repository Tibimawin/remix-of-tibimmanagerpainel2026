import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Coins, Users, ListPlus, Timer, Loader2, AlertTriangle, Receipt,
  ShoppingCart, Check, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  ResellerService,
  type ResellerState,
  type ResellerLine,
  type ResellerTransaction,
} from '@/services/ResellerService';

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const txLabel = (t: ResellerTransaction) => {
  switch (t.type) {
    case 'compra': return t.status === 'pago' ? 'Compra paga' : 'Compra pendente';
    case 'linha': return 'Linha criada';
    case 'renovacao': return 'Renovação';
    case 'teste': return 'Teste 1h';
    default: return t.descricao || t.type;
  }
};

/**
 * /revendas-creditos/dashboard — home do revendedor: saldo em destaque,
 * atalhos rápidos e resumo de linhas/movimentações.
 */
export const ResellerDashboard: React.FC = () => {
  const [state, setState] = useState<ResellerState | null>(null);
  const [lines, setLines] = useState<ResellerLine[]>([]);
  const [txs, setTxs] = useState<ResellerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, l, t] = await Promise.all([
        ResellerService.state(),
        ResellerService.lines().catch(() => ({ lines: [] as ResellerLine[] })),
        ResellerService.transactions().catch(() => ({ transactions: [] as ResellerTransaction[] })),
      ]);
      setState(s);
      setLines(l.lines || []);
      setTxs(t.transactions || []);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar o painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeLines = useMemo(
    () => lines.filter(l => {
      const dead = /vencid|inativ|bloquead|cancelad|desativ/i.test(l.status || '');
      if (dead) return false;
      const t = Date.parse(l.vencimento);
      return isNaN(t) || t >= Date.now();
    }).length,
    [lines],
  );

  const totalCompras = useMemo(
    () => txs.filter(t => t.type === 'compra' && t.status === 'pago').reduce((a, t) => a + (t.value || 0), 0),
    [txs],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <p className="text-sm text-red-300">{error}</p>
        <Link to="/revendas-creditos/login" className="mt-4 inline-block text-xs text-amber-300 hover:underline">Fazer login novamente</Link>
      </div>
    );
  }

  const saldo = state?.reseller.creditBalance ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Olá, {state?.reseller.nome || state?.reseller.email || 'revendedor'} 👋</h1>
        <p className="text-sm text-slate-400">
          Você revende as listas de <strong className="text-slate-200">{state?.master.name || 'seu master'}</strong> —
          cada crédito vale {state?.creditsPerLine ?? 30} dias de linha.
        </p>
      </div>

      {state && !state.settings.enabled && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Seu master pausou as revendas temporariamente. Fale com {state.master.name} para regularizar.
        </div>
      )}

      {/* Saldo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-amber-600/10 p-5">
          <div className="flex items-center gap-2 text-xs text-amber-300/90">
            <Coins className="h-4 w-4" /> Saldo de créditos
          </div>
          <p className="mt-2 text-4xl font-bold text-amber-300">{saldo}</p>
          <p className="mt-1 text-xs text-slate-400">1 crédito = {state?.creditsPerLine ?? 30} dias</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 text-xs text-slate-400"><Users className="h-4 w-4" /> Linhas ativas</div>
          <p className="mt-2 text-4xl font-bold text-slate-100">{activeLines}</p>
          <p className="mt-1 text-xs text-slate-500">de {lines.length} criadas</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 text-xs text-slate-400"><Receipt className="h-4 w-4" /> Investido (PIX)</div>
          <p className="mt-2 text-4xl font-bold text-emerald-400">
            {totalCompras.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="mt-1 text-xs text-slate-500">total em compras pagas</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 text-xs text-slate-400"><Timer className="h-4 w-4" /> Testes grátis</div>
          <p className="mt-2 text-4xl font-bold text-slate-100">{txs.filter(t => t.type === 'teste').length}</p>
          <p className="mt-1 text-xs text-slate-500">testes de 1h gerados</p>
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/revendas-creditos/comprar-creditos"
          className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-amber-400/40">
          <ShoppingCart className="h-6 w-6 text-amber-400" />
          <p className="mt-3 font-semibold text-slate-100">Comprar créditos</p>
          <p className="mt-1 text-xs text-slate-500">PIX na conta Asaas do seu master — saldo cai na hora</p>
          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-amber-300">
            Ir para compras <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </p>
        </Link>
        <Link to="/revendas-creditos/gerar-linha"
          className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-amber-400/40">
          <ListPlus className="h-6 w-6 text-emerald-400" />
          <p className="mt-3 font-semibold text-slate-100">Gerar linha / teste</p>
          <p className="mt-1 text-xs text-slate-500">Linha nova (1 crédito) ou teste de 1 hora grátis</p>
          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-amber-300">
            Criar agora <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </p>
        </Link>
        <Link to="/revendas-creditos/linhas"
          className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-amber-400/40">
          <Users className="h-6 w-6 text-sky-400" />
          <p className="mt-3 font-semibold text-slate-100">Minhas linhas</p>
          <p className="mt-1 text-xs text-slate-500">Gerenciar, renovar e copiar links M3U/Xtream</p>
          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-amber-300">
            Gerenciar <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </p>
        </Link>
      </div>

      {/* Movimentações recentes */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-100">
            <Receipt className="h-4 w-4 text-amber-400" /> Movimentações recentes
          </h2>
          {txs.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => toast.info('A lista completa carrega na aba Minhas Linhas')}
              className="text-slate-400 hover:bg-slate-800 hover:text-slate-200">
              Ver linhas <Check className="mr-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {txs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Sem movimentações ainda. Comece comprando créditos.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {txs.slice(0, 8).map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-slate-200">{t.descricao || txLabel(t)}</p>
                  <p className="text-xs text-slate-500">{fmtDate(t.createdAt)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-slate-100">
                    {t.type === 'compra' && t.status === 'pago'
                      ? `+${t.credits} créditos`
                      : t.credits ? `−${t.credits} crédito(s)` : 'grátis'}
                  </p>
                  {t.value != null && <p className="text-xs text-slate-500">{Number(t.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ResellerDashboard;
