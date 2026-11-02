import React, { useEffect, useState } from 'react';
import {
  Users, ListPlus, Timer, RefreshCw, Copy, Check, MessageCircle, CalendarClock,
  Loader2, AlertTriangle, Coins, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  ResellerService, type ResellerState, type ResellerLine, type ResellerLineLinks, type CreateLineResult,
} from '@/services/ResellerService';

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const isExpired = (line: ResellerLine) => {
  const statusDead = /vencid|inativ|bloquead|cancelad|desativ/i.test(line.status || '');
  if (statusDead) return true;
  const t = Date.parse(line.vencimento);
  return !isNaN(t) && t < Date.now();
};

const buildShareMessage = (line: { usuario: string; senha: string }, links: ResellerLineLinks, masterName: string) =>
  `🎬 Seu acesso chegou!\n\n` +
  `📱 App: Xtream Codes / IPTV Smarters\n` +
  `🔗 Servidor: ${links.dns_host}\n` +
  `👤 Usuário: ${line.usuario}\n` +
  `🔑 Senha: ${line.senha}\n\n` +
  `🎬 Lista completa: ${links.m3u_ts}\n\n` +
  `${masterName} — bom divertimento!`;

export const ResellerLinhas: React.FC = () => {
  const [state, setState] = useState<ResellerState | null>(null);
  const [lines, setLines] = useState<ResellerLine[]>([]);
  const [linksByUser, setLinksByUser] = useState<Record<string, ResellerLineLinks>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [novaLinhaOpen, setNovaLinhaOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [criando, setCriando] = useState(false);

  const [resultado, setResultado] = useState<CreateLineResult | null>(null);
  const [copiedKey, setCopiedKey] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([ResellerService.state(), ResellerService.lines()]);
      setState(s);
      setLines(l.lines || []);
      setLinksByUser(prev => (Object.keys(prev).length ? prev : prev));
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar linhas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1500);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const criarLinha = async (tipo: 'linha' | 'teste') => {
    setError('');
    setCriando(true);
    try {
      const result = await ResellerService.createLine({ tipo, nome, usuario: usuario.trim(), senha: senha.trim() });
      setResultado(result);
      setNovaLinhaOpen(false);
      setNome(''); setUsuario(''); setSenha('');
      await load();
      toast.success(tipo === 'linha' ? 'Linha criada — 1 crédito usado.' : 'Teste de 1 hora criado (sem custo).');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar linha.');
    } finally {
      setCriando(false);
    }
  };

  const renovar = async (line: ResellerLine) => {
    try {
      const r = await ResellerService.renewLine(line.id);
      toast.success(`Linha renovada até ${fmtDate(r.vencimento)} — 1 crédito usado. Saldo: ${r.creditBalance}`);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao renovar.');
    }
  };

  const linksOf = (line: ResellerLine): ResellerLineLinks => {
    if (linksByUser[line.usuario]) return linksByUser[line.usuario];
    const dnsHost = state?.settings.dnsHost || 'https://api.tibimmanagerpainel.shop';
    const masterId = state?.master.id || '';
    const acct = masterId ? `&account=${encodeURIComponent(masterId)}` : '';
    const u = encodeURIComponent(line.usuario);
    const p = encodeURIComponent(line.senha);
    return {
      dns_host: dnsHost,
      m3u_ts: `${dnsHost}/get.php?username=${u}&password=${p}${acct}&type=m3u_plus&output=ts`,
      m3u_hls: `${dnsHost}/get.php?username=${u}&password=${p}${acct}&type=m3u_plus&output=m3u8`,
      player_api: `${dnsHost}/player_api.php?username=${u}&password=${p}${acct}`,
    };
  };

  const saldo = state?.reseller.creditBalance ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100"><Users className="h-6 w-6 text-amber-400" /> Minhas Linhas</h1>
          <p className="text-sm text-slate-400">Linhas criadas por você — só você enxerga esses clientes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => criarLinha('teste')} disabled={criando}
            className="border border-emerald-400/40 bg-emerald-400/10 font-medium text-emerald-300 hover:bg-emerald-400/20">
            <Timer className="mr-1 h-3.5 w-3.5" /> Teste 1h (grátis)
          </Button>
          <Button size="sm" onClick={() => setNovaLinhaOpen(true)}
            className="bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500">
            <ListPlus className="mr-1 h-4 w-4" /> Nova Linha (1 crédito)
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm">
        <Coins className="h-4 w-4 text-amber-400" />
        Saldo: <strong className="text-amber-300">{saldo}</strong> crédito(s)
        <span className="text-slate-500">·</span>
        <span className="text-slate-400">{lines.length} linha(s)</span>
        {state && !state.settings.enabled && (
          <span className="ml-auto flex items-center gap-1 text-xs text-amber-300"><AlertTriangle className="h-3.5 w-3.5" /> Revendas pausadas por quem te indicou</span>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Tabela de linhas */}
      <div className="overflow-hidden rounded-xl border border-slate-800">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>
        ) : lines.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhuma linha ainda. Crie a primeira com 1 crédito ou gere um teste de 1 hora grátis.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-950/40">
                {lines.map(line => {
                  const links = linksOf(line);
                  const expired = isExpired(line);
                  return (
                    <tr key={line.id} className="text-slate-200">
                      <td className="px-4 py-3 font-medium">{line.nome || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => copy(line.usuario, `u_${line.id}`)} className="flex items-center gap-1 text-slate-300 hover:text-amber-300" title="Copiar usuário">
                          {line.usuario || '—'}
                          {copiedKey === `u_${line.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 opacity-40" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 ${expired ? 'text-red-300' : ''}`}>
                          <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                          {fmtDate(line.vencimento)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${expired ? 'bg-red-400/10 text-red-300' : 'bg-emerald-400/10 text-emerald-300'}`}>
                          {expired ? 'Vencida' : (line.status || 'Ativo')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Button variant="ghost" size="sm" title="Copiar link M3U (TS)"
                            onClick={() => copy(links.m3u_ts, `m_${line.id}`)}
                            className="h-8 px-2 text-xs text-slate-300 hover:bg-slate-800">
                            {copiedKey === `m_${line.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} M3U
                          </Button>
                          <Button variant="ghost" size="sm" title="Copiar dados Xtream"
                            onClick={() => copy(`Host: ${links.dns_host}\nUsuário: ${line.usuario}\nSenha: ${line.senha}`, `x_${line.id}`)}
                            className="h-8 px-2 text-xs text-slate-300 hover:bg-slate-800">
                            {copiedKey === `x_${line.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <ExternalLink className="h-3.5 w-3.5" />} Xtream
                          </Button>
                          <Button variant="ghost" size="sm" title="Enviar acesso por WhatsApp"
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildShareMessage(line, links, state?.master.name || ''))}`, '_blank')}
                            className="h-8 px-2 text-xs text-emerald-300 hover:bg-emerald-400/10">
                            <MessageCircle className="h-3.5 w-3.5" /> Enviar
                          </Button>
                          <Button variant="ghost" size="sm" title="Renovar +30 dias (1 crédito)"
                            onClick={() => renovar(line)}
                            className="h-8 px-2 text-xs text-amber-300 hover:bg-amber-400/10">
                            <CalendarClock className="h-3.5 w-3.5" /> +30d
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog nova linha */}
      <Dialog open={novaLinhaOpen} onOpenChange={setNovaLinhaOpen}>
        <DialogContent className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ListPlus className="h-5 w-5 text-amber-400" /> Nova Linha — 30 dias</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-400">
              Custo: <strong className="text-amber-300">1 crédito</strong> (saldo atual: {saldo}).
              Usuário e senha são gerados automaticamente se você deixar em branco.
            </p>
            <div className="space-y-2">
              <Label className="text-slate-300">Nome do cliente</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João da Silva"
                className="border-slate-700 bg-slate-950 text-slate-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300">Usuário (opcional)</Label>
                <Input value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="automático"
                  className="border-slate-700 bg-slate-950 text-slate-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Senha (opcional)</Label>
                <Input value={senha} onChange={e => setSenha(e.target.value)} placeholder="automática"
                  className="border-slate-700 bg-slate-950 text-slate-100" />
              </div>
            </div>
            <Button onClick={() => criarLinha('linha')} disabled={criando}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500">
              {criando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListPlus className="mr-2 h-4 w-4" />}
              {criando ? 'Criando linha…' : 'Criar linha (−1 crédito)'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog resultado (credenciais + links) */}
      <Dialog open={!!resultado} onOpenChange={(open) => { if (!open) setResultado(null); }}>
        <DialogContent className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-400" />
              {resultado?.tipo === 'teste' ? 'Teste criado (1 hora)' : 'Linha criada — 30 dias'}
            </DialogTitle>
          </DialogHeader>
          {resultado && (
            <div className="space-y-3 text-sm">
              <div className="space-y-1 rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300">
                <p>Usuário: <span className="text-amber-300">{resultado.username}</span></p>
                <p>Senha: <span className="text-amber-300">{resultado.password}</span></p>
                <p>Vence: {fmtDate(resultado.vencimento)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => copy(resultado.links.m3u_ts, 'res_m3u')}
                  className="justify-start border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800">
                  {copiedKey === 'res_m3u' ? <Check className="mr-2 h-4 w-4 text-emerald-400" /> : <Copy className="mr-2 h-4 w-4" />}
                  Copiar lista M3U (MPEG-TS)
                </Button>
                <Button variant="outline" onClick={() => copy(`Host: ${resultado.links.dns_host}\nUsuário: ${resultado.username}\nSenha: ${resultado.password}`, 'res_xt')}
                  className="justify-start border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800">
                  {copiedKey === 'res_xt' ? <Check className="mr-2 h-4 w-4 text-emerald-400" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                  Copiar dados Xtream (host/usuário/senha)
                </Button>
                <Button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildShareMessage({ usuario: resultado.username, senha: resultado.password }, resultado.links, resultado.masterName))}`, '_blank')}
                  className="bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400">
                  <MessageCircle className="mr-2 h-4 w-4" /> Enviar por WhatsApp
                </Button>
              </div>
              <p className="text-xs text-slate-500">A linha já funciona na DNS na hora — não precisa esperar atualizar nada.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResellerLinhas;
