import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, ShoppingCart, Users, ListPlus, Timer, ArrowRight, Receipt, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResellerService, type ResellerState, type ResellerLine, type ResellerTransaction } from '@/services/ResellerService';
import { useResellerAuth } from '@/contexts/ResellerAuthContext';

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtValor = (v?: number) =>
  typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

export const ResellerDashboard: React.FC = () => {
  const { user } = useResellerAuth();
  const [state, setState] = useState<ResellerState | null>(null);
  const [lines, setLines] = useState<ResellerLine[]>([]);
  const [transactions, setTransactions] = useState<ResellerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, l, t] = await Promise.all([
        ResellerService.state(),
        ResellerService.lines(),
        ResellerService.transactions(),
      ]);
      setState(s);
      setLines(l.lines || []);
      setTransactions(t.transactions || []);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saldo = state?.reseller.creditBalance ?? 0;
  const masterName = state?.master.name || '—';
  const linhasAtivas = lines.filter(l => l.status && !/vencid|inativ|bloquead|cancelad|desativ/i.test(l.status)).length;
  const creditosGastos = transactions.filter(t => ['linha', 'renovacao'].includes(t.type)).length;
  const totalComprado = transactions.filter(t => t.type === 'compra' && t.status === 'pago').reduce((acc, t) => acc + (t.credits || 0), 0);

  const quickActions = [
    { to: '/revendas-creditos/comprar-creditos', icon: ShoppingCart, title: 'Comprar Créditos', desc: 'PIX na hora, créditos caem automático' },
    { to: '/revendas-creditos/linhas', icon: ListPlus, title: 'Nova Linha (1 crédito)', desc: 'Criar linha de 30 dias para seu cliente' },
    { to: '/revendas-creditos/linhas', icon: Timer, title: 'Teste Rápido (grátis)', desc: 'Linha de teste de 1 hora sem custo' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Olá, {state?.reseller.nome || user?.displayName || 'revenda'} 👋</h1>
        <p className="text-sm text-slate-400">Sua revenda está ligada a <strong className="text-slate-300">{masterName}</strong></p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
          <Button variant="ghost" size="sm" className="ml-2 text-red-300 hover:text-red-200" onClick={load}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Tentar de novo
          </Button>
        </div>
      )}

      {/* Saldo em destaque */}
      <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-slate-900 to-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Coins className="h-4 w-4 text-amber-400" /> Saldo disponível
            </p>
            <p className="mt-1 text-5xl font-bold text-amber-300">{loading ? '…' : saldo}</p>
            <p className="mt-1 text-xs text-slate-500">crédito(s) — cada um cria ou renova 30 dias de linha</p>
          </div>
          <Button asChild className="bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500">
            <Link to="/revendas-creditos/comprar-creditos">
              <ShoppingCart className="mr-2 h-4 w-4" /> Comprar créditos
            </Link>
          </Button>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Linhas criadas', value: lines.length, icon: Users },
          { label: 'Linhas ativas', value: linhasAtivas, icon: Users },
          { label: 'Créditos comprados', value: totalComprado, icon: Coins },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="flex items-center gap-2 text-xs text-slate-400"><card.icon className="h-3.5 w-3.5 text-amber-400" /> {card.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-100">{loading ? '…' : card.value}</p>
          </div>
        ))}
      </div>

      {/* Ações rápidas */}
      <div className="grid gap-4 sm:grid-cols-3">
        {quickActions.map(a => (
          <Link key={a.title} to={a.to}
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-amber-400/40 hover:bg-slate-900">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
              <a.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>
            <p className="flex items-center font-semibold text-slate-100">
              {a.title} <ArrowRight className="ml-1 h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300" />
            </p>
            <p className="mt-1 text-xs text-slate-400">{a.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Últimas linhas */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Users className="h-4 w-4 text-amber-400" /> Últimas linhas</p>
            <Link to="/revendas-creditos/linhas" className="text-xs text-amber-300 hover:underline">Ver todas</Link>
          </div>
          {loading ? <p className="text-sm text-slate-500">Carregando…</p> : lines.length === 0 ? (
            <p className="text-sm text-slate-500">Você ainda não criou linhas. Crie a primeira com 1 crédito.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {lines.slice(0, 5).map(l => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-200">{l.nome || l.usuario}</p>
                    <p className="text-xs text-slate-500">{l.usuario} · vence {fmtDate(l.vencimento)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${/vencid|inativ|bloquead|desativ/i.test(l.status) ? 'bg-red-400/10 text-red-300' : 'bg-emerald-400/10 text-emerald-300'}`}>
                    {l.status || 'Ativo'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Últimas movimentações */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Receipt className="h-4 w-4 text-amber-400" /> Movimentações</p>
            <span className="text-xs text-slate-500">{creditosGastos} crédito(s) usados</span>
          </div>
          {loading ? <p className="text-sm text-slate-500">Carregando…</p> : transactions.length === 0 ? (
            <p className="text-sm text-slate-500">Sem movimentações ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {transactions.slice(0, 6).map(t => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-slate-200">{t.descricao || t.type}</p>
                    <p className="text-xs text-slate-500">{fmtDate(t.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-amber-300">
                      {t.type === 'compra' ? `+${t.credits}` : t.credits ? `−${t.credits}` : '0'}
                    </p>
                    {t.value != null && <p className="text-[11px] text-slate-500">{fmtValor(t.value)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResellerDashboard;
