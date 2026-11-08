import React, { useEffect, useState } from 'react';
import {
  Users,
  ListPlus,
  Timer,
  RefreshCw,
  Copy,
  Check,
  MessageCircle,
  CalendarClock,
  Loader2,
  AlertTriangle,
  Coins,
  Server,
  Settings,
  Sparkles,
  RotateCcw,
  Film,
  Tv,
  Radio,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  ResellerService,
  type ResellerState,
  type ResellerLine,
  type ResellerLineLinks,
  type CreateLineResult,
  buildResellerLineLinks,
  buildEnterpriseShareMessage,
} from '@/services/ResellerService';
import {
  ResellerLineConfigDialog,
  type ResellerLineDetail,
} from '@/components/revendas/ResellerLineConfigDialog';
import { ResellerServerInfoDialog } from '@/components/revendas/ResellerServerInfoDialog';

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const isExpired = (line: ResellerLine) => {
  const statusDead = /vencid|inativ|bloquead|cancelad|desativ/i.test(line.status || '');
  if (statusDead) return true;
  const t = Date.parse(line.vencimento);
  return !isNaN(t) && t < Date.now();
};

export const ResellerLinhas: React.FC = () => {
  const [state, setState] = useState<ResellerState | null>(null);
  const [lines, setLines] = useState<ResellerLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialogs de criação
  const [novaLinhaOpen, setNovaLinhaOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [criando, setCriando] = useState(false);

  // Dialog de Configurações da Linha & Conexão M3U / Xtream
  const [selectedLine, setSelectedLine] = useState<ResellerLineDetail | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<ResellerLineLinks | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [renewing, setRenewing] = useState(false);

  // Dialog de Informações do Servidor Global
  const [serverInfoOpen, setServerInfoOpen] = useState(false);

  const [copiedKey, setCopiedKey] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([ResellerService.state(), ResellerService.lines()]);
      setState(s);
      setLines(l.lines || []);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar linhas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Minhas Linhas — Portal de Revenda';
    load();
  }, []);

  const copy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} copiado!`);
      setTimeout(() => setCopiedKey(''), 1500);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const getLinks = (u: string, p: string): ResellerLineLinks => {
    return buildResellerLineLinks(state?.settings.dnsHost, state?.master.id, u, p);
  };

  const handleOpenConfigDialog = (line: ResellerLine) => {
    const links = getLinks(line.usuario, line.senha);
    setSelectedLine({
      id: line.id,
      nome: line.nome,
      usuario: line.usuario,
      senha: line.senha,
      vencimento: line.vencimento,
      status: line.status,
      tipo: /teste/i.test(line.usuario || '') ? 'teste' : 'linha',
    });
    setSelectedLinks(links);
    setConfigDialogOpen(true);
  };

  const criarLinha = async (tipo: 'linha' | 'teste') => {
    setError('');
    setCriando(true);
    try {
      const result: CreateLineResult = await ResellerService.createLine({
        tipo,
        nome: nome.trim(),
        usuario: usuario.trim(),
        senha: senha.trim(),
        whatsapp: whatsapp.trim(),
      });
      setNovaLinhaOpen(false);
      setNome('');
      setUsuario('');
      setSenha('');
      setWhatsapp('');
      await load();

      // Abre automaticamente o diálogo completo de configuração com todas as abas
      const newLinks = getLinks(result.username, result.password);
      setSelectedLine({
        nome: nome.trim() || result.username,
        usuario: result.username,
        senha: result.password,
        vencimento: result.vencimento,
        status: 'Ativo',
        tipo,
        whatsapp: whatsapp.trim(),
      });
      setSelectedLinks(newLinks);
      setConfigDialogOpen(true);

      toast.success(
        tipo === 'linha'
          ? 'Linha de 30 dias criada com sucesso! 1 crédito utilizado.'
          : 'Teste grátis de 1 hora gerado com sucesso!'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar linha.');
    } finally {
      setCriando(false);
    }
  };

  const renovar = async (lineId?: string) => {
    const targetId = lineId || selectedLine?.id;
    if (!targetId) return;

    const saldoAtual = state?.reseller.creditBalance ?? 0;
    if (saldoAtual < 1) {
      toast.error('Você não tem créditos suficientes para renovar. Adquira créditos primeiro.');
      return;
    }

    setRenewing(true);
    try {
      const r = await ResellerService.renewLine(targetId);
      toast.success(`Linha renovada até ${fmtDate(r.vencimento)} — 1 crédito usado. Saldo: ${r.creditBalance}`);
      await load();
      if (selectedLine && selectedLine.id === targetId) {
        setSelectedLine((prev) => (prev ? { ...prev, vencimento: r.vencimento, status: 'Ativo' } : null));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao renovar linha.');
    } finally {
      setRenewing(false);
    }
  };

  const saldo = state?.reseller.creditBalance ?? 0;
  const masterName = state?.master.name || 'Portal de Revenda';
  const dnsHost = state?.settings.dnsHost || 'https://api.tibimmanagerpainel.shop';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <Users className="h-6 w-6 text-amber-400" /> Minhas Linhas
          </h1>
          <p className="text-sm text-slate-400">
            Linhas e testes criados por você com acesso isolado ao catálogo do seu indicador.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setServerInfoOpen(true)}
            className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          >
            <Server className="mr-1.5 h-3.5 w-3.5 text-amber-400" /> Configurações M3U & Servidor
          </Button>
          <Button
            size="sm"
            onClick={() => criarLinha('teste')}
            disabled={criando}
            className="border border-emerald-400/40 bg-emerald-400/10 font-medium text-emerald-300 hover:bg-emerald-400/20"
          >
            <Timer className="mr-1.5 h-3.5 w-3.5" /> Teste 1h (grátis)
          </Button>
          <Button
            size="sm"
            onClick={() => setNovaLinhaOpen(true)}
            className="bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500"
          >
            <ListPlus className="mr-1.5 h-4 w-4" /> Nova Linha (1 crédito)
          </Button>
        </div>
      </div>

      {/* Barra de Saldo & Status de Créditos */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-400" />
          <span>Saldo de Créditos:</span>
          <strong className="text-amber-300 text-base">{saldo}</strong>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{lines.length} cliente(s) na sua lista</span>
        </div>
        <div className="flex items-center gap-2">
          {saldo === 0 ? (
            <Link
              to="/revendas-creditos/comprar-creditos"
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:underline bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Sem créditos — Recarregar agora
            </Link>
          ) : (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Saldo pronto para uso
            </span>
          )}
        </div>
      </div>

      {/* Resumo do Catálogo do Indicador */}
      {state && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-amber-400" />
            <span>Grade do Indicador ({state.master.name}):</span>
            <span className="font-semibold text-amber-300">{(state.catalog?.totalConteudos || 0).toLocaleString('pt-BR')} Conteúdos</span>
            <span className="text-slate-600">•</span>
            <span className="font-semibold text-sky-300">{(state.catalog?.totalFilmes || 0).toLocaleString('pt-BR')} Filmes</span>
            <span className="text-slate-600">•</span>
            <span className="font-semibold text-purple-300">{(state.catalog?.totalSeries || 0).toLocaleString('pt-BR')} Séries</span>
            <span className="text-slate-600">•</span>
            <span className="font-semibold text-emerald-300">{(state.catalog?.totalCanaisTv || 0).toLocaleString('pt-BR')} Canais TV</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-400 border border-slate-700/60">
              Limite Máx: <strong className="text-amber-300 font-medium">{state.catalog?.limiteLabel || 'Ilimitado'}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Banner educativo quando saldo está zerado */}
      {saldo === 0 && !loading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Coins className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-amber-300">Como funcionam os créditos na revenda?</p>
              <p className="text-slate-300">
                Você pode gerar <strong>testes grátis de 1 hora</strong> sem gastar nada. Para criar novas linhas mensais (30 dias) ou renovar clientes vencidos, adquira créditos via PIX automático.
              </p>
            </div>
          </div>
          <Link to="/revendas-creditos/comprar-creditos">
            <Button size="sm" className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400 text-xs">
              Comprar Créditos (PIX)
            </Button>
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Tabela de Linhas */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <span className="text-xs text-slate-500">Carregando carteira de linhas...</span>
          </div>
        ) : lines.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="mx-auto h-10 w-10 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-300">Nenhuma linha encontrada</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Crie seu primeiro cliente com 1 crédito ou gere um teste gratuito de 1 hora para degustação.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => criarLinha('teste')}
                className="border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 text-xs"
              >
                <Timer className="mr-1.5 h-3.5 w-3.5" /> Gerar Teste 1h
              </Button>
              <Button
                size="sm"
                onClick={() => setNovaLinhaOpen(true)}
                className="bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-semibold"
              >
                <ListPlus className="mr-1.5 h-3.5 w-3.5" /> Criar Linha 30d
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3.5">Cliente</th>
                  <th className="px-4 py-3.5">Usuário / Login</th>
                  <th className="px-4 py-3.5">Vencimento</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações & Configurações M3U</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-950/40">
                {lines.map((line) => {
                  const links = getLinks(line.usuario, line.senha);
                  const expired = isExpired(line);
                  const isTest = /teste/i.test(line.usuario || '') || /teste/i.test(line.nome || '');

                  const enterpriseMsg = buildEnterpriseShareMessage({
                    nomeCliente: line.nome,
                    usuario: line.usuario,
                    senha: line.senha,
                    vencimento: line.vencimento,
                    tipo: isTest ? 'teste' : 'linha',
                    links,
                    masterName,
                  });

                  return (
                    <tr key={line.id} className="text-slate-200 transition-colors hover:bg-slate-900/40">
                      <td className="px-4 py-3.5 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{line.nome || '—'}</span>
                          {isTest && (
                            <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-400 border border-sky-500/20">
                              Teste
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs">
                        <button
                          onClick={() => copy(line.usuario, `u_${line.id}`, 'Usuário')}
                          className="flex items-center gap-1 text-slate-300 hover:text-amber-300"
                          title="Clique para copiar usuário"
                        >
                          <span>{line.usuario || '—'}</span>
                          {copiedKey === `u_${line.id}` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        <span className={`flex items-center gap-1.5 ${expired ? 'text-red-400 font-semibold' : 'text-slate-300'}`}>
                          <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                          {fmtDate(line.vencimento)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            expired
                              ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {expired ? 'Vencida' : line.status || 'Ativo'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {/* Botão Principal: Abre o Diálogo Completo com M3U, Xtream, Servidor e Mensagem */}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenConfigDialog(line)}
                            className="h-8 gap-1.5 bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 text-xs px-2.5 shadow-sm"
                            title="Ver detalhes de conexão M3U, Xtream e Servidor"
                          >
                            <Settings className="h-3.5 w-3.5" />
                            <span>Acessos & M3U</span>
                          </Button>

                          {/* Copiar M3U direto */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Copiar Link M3U Plus TS direto"
                            onClick={() => copy(links.m3u_ts, `m_${line.id}`, 'Link M3U TS')}
                            className="h-8 px-2 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            {copiedKey === `m_${line.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}{' '}
                            M3U
                          </Button>

                          {/* Copiar Xtream rápido */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Copiar dados de acesso Xtream"
                            onClick={() =>
                              copy(
                                `Servidor: ${links.dns_host}\nPorta: ${links.port}\nUsuário: ${line.usuario}\nSenha: ${line.senha}`,
                                `x_${line.id}`,
                                'Dados Xtream'
                              )
                            }
                            className="h-8 px-2 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            {copiedKey === `x_${line.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Server className="h-3.5 w-3.5" />
                            )}{' '}
                            Xtream
                          </Button>

                          {/* Enviar pelo WhatsApp com a Mensagem Formatada Enterprise */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Enviar mensagem completa pelo WhatsApp"
                            onClick={() =>
                              window.open(
                                `https://wa.me/?text=${encodeURIComponent(enterpriseMsg)}`,
                                '_blank',
                                'noopener'
                              )
                            }
                            className="h-8 px-2 text-xs text-emerald-300 hover:bg-emerald-400/10"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Enviar
                          </Button>

                          {/* Renovar Linha */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title={
                              saldo < 1
                                ? 'Sem créditos para renovar (necessário 1 crédito)'
                                : 'Renovar por +30 dias (1 crédito)'
                            }
                            onClick={() => {
                              if (saldo < 1) {
                                toast.error('Você está sem créditos para renovar. Compre créditos primeiro.');
                              } else {
                                renovar(line.id);
                              }
                            }}
                            className={`h-8 px-2 text-xs ${
                              saldo < 1 ? 'text-slate-500 hover:text-slate-400' : 'text-amber-300 hover:bg-amber-400/10'
                            }`}
                          >
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

      {/* Dialog Criar Nova Linha */}
      <Dialog open={novaLinhaOpen} onOpenChange={setNovaLinhaOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="h-5 w-5 text-amber-400" /> Nova Linha Mensal (30 dias)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="rounded-lg bg-slate-900/80 p-3 text-xs text-slate-300 leading-relaxed border border-slate-800">
              Custo: <strong className="text-amber-300">1 crédito</strong> (seu saldo atual: <strong>{saldo}</strong>).
              Se deixar usuário e senha vazios, eles serão gerados de forma automática e segura.
            </p>
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs">Nome do cliente</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo"
                className="border-slate-800 bg-slate-900 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs">WhatsApp do cliente (opcional)</Label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ex: 11 99999-8888"
                className="border-slate-800 bg-slate-900 text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Usuário (opcional)</Label>
                <Input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="automático"
                  className="border-slate-800 bg-slate-900 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Senha (opcional)</Label>
                <Input
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="automática"
                  className="border-slate-800 bg-slate-900 text-slate-100"
                />
              </div>
            </div>
            <Button
              onClick={() => criarLinha('linha')}
              disabled={criando || saldo < 1}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500"
            >
              {criando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListPlus className="mr-2 h-4 w-4" />}
              {criando ? 'Criando linha…' : saldo < 1 ? 'Saldo Insuficiente (0 Créditos)' : 'Criar Linha (−1 Crédito)'}
            </Button>
            {saldo < 1 && (
              <p className="text-center text-[11px] text-amber-300">
                Você precisa comprar créditos para criar linhas definitivas de 30 dias.{' '}
                <Link to="/revendas-creditos/comprar-creditos" className="underline font-semibold">
                  Comprar agora
                </Link>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo Completo de Configuração da Linha & Conexão IPTV (M3U, Xtream, Servidor, Mensagem) */}
      <ResellerLineConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        line={selectedLine}
        links={selectedLinks}
        masterName={masterName}
        creditBalance={saldo}
        onRenew={() => renovar()}
        renewing={renewing}
      />

      {/* Diálogo de Informações Gerais do Servidor DNS & M3U */}
      <ResellerServerInfoDialog
        open={serverInfoOpen}
        onOpenChange={setServerInfoOpen}
        dnsHost={dnsHost}
        masterName={masterName}
        masterWhatsapp={state?.settings.whatsapp}
        creditBalance={saldo}
        creditPrice={state?.settings.creditPrice}
      />
    </div>
  );
};

export default ResellerLinhas;
