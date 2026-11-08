import React, { useEffect, useState } from 'react';
import {
  ListPlus,
  Timer,
  Copy,
  Check,
  MessageCircle,
  Loader2,
  Coins,
  AlertTriangle,
  Server,
  QrCode,
  Tv,
  FileCode2,
  Send,
  ShieldCheck,
  Sparkles,
  Database,
  Film,
  Radio,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import {
  ResellerService,
  type ResellerState,
  type ResellerLineLinks,
  type CreateLineResult,
  buildResellerLineLinks,
  buildEnterpriseShareMessage,
} from '@/services/ResellerService';

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

export const ResellerGerarLinha: React.FC = () => {
  const [state, setState] = useState<ResellerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [busy, setBusy] = useState('');
  const [resultado, setResultado] = useState<CreateLineResult | null>(null);
  const [copiedKey, setCopiedKey] = useState('');

  // QR Code
  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    document.title = 'Gerar Linha ou Teste — Portal de Revenda';
    ResellerService.state()
      .then(setState)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saldo = state?.reseller.creditBalance ?? 0;
  const masterName = state?.master.name || 'Portal de Revenda';

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

  const handleOpenQr = (url: string) => {
    setQrUrl(url);
    setQrOpen(true);
  };

  const criar = async (tipo: 'linha' | 'teste') => {
    setBusy(tipo);
    setResultado(null);
    try {
      const result = await ResellerService.createLine({
        tipo,
        nome: nome.trim(),
        usuario: usuario.trim(),
        senha: senha.trim(),
        whatsapp: whatsapp.trim(),
      });
      setResultado(result);
      setNome('');
      setUsuario('');
      setSenha('');
      setWhatsapp('');
      // Atualizar saldo
      setState((prev) =>
        prev
          ? {
              ...prev,
              reseller: {
                ...prev.reseller,
                creditBalance: result.creditBalance,
              },
            }
          : null
      );
      toast.success(
        tipo === 'linha'
          ? 'Linha de 30 dias gerada — 1 crédito usado.'
          : 'Teste grátis de 1 hora gerado com sucesso!'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar acesso.');
    } finally {
      setBusy('');
    }
  };

  const links: ResellerLineLinks | null = resultado
    ? buildResellerLineLinks(
        state?.settings.dnsHost,
        state?.master.id,
        resultado.username,
        resultado.password
      )
    : null;

  const isTest = resultado?.tipo === 'teste';

  const enterpriseMsg =
    resultado && links
      ? buildEnterpriseShareMessage({
          nomeCliente: resultado.username,
          usuario: resultado.username,
          senha: resultado.password,
          vencimento: resultado.vencimento,
          tipo: resultado.tipo,
          links,
          masterName,
        })
      : '';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <ListPlus className="h-6 w-6 text-amber-400" /> Gerar Linha ou Teste
        </h1>
        <p className="text-sm text-slate-400">
          Crie o acesso do seu cliente com dados Xtream Codes, Links M3U e mensagem pronta para WhatsApp.
        </p>
      </div>

      {/* Saldo de créditos */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-400" />
          <span>Saldo de Créditos:</span>
          <strong className="text-amber-300 text-base">{loading ? '…' : saldo}</strong>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">Linha Nova = 1 crédito (30 dias) · Teste 1h = Grátis</span>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        ) : saldo === 0 ? (
          <Link
            to="/revendas-creditos/comprar-creditos"
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:underline bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Sem créditos — comprar agora
          </Link>
        ) : null}
      </div>

      {/* Grade de conteúdos do Indicador vinculados a esta linha */}
      {state && (
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-slate-950 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Esta linha terá acesso a todo o acervo de <strong>{state.master.name}</strong>:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-semibold">
              <span className="flex items-center gap-1 rounded bg-sky-500/10 px-2 py-0.5 text-sky-300 border border-sky-500/20">
                <Film className="h-3 w-3" />
                {(state.catalog?.totalFilmes || 0).toLocaleString('pt-BR')} Filmes
              </span>
              <span className="flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-purple-300 border border-purple-500/20">
                <Tv className="h-3 w-3" />
                {(state.catalog?.totalSeries || 0).toLocaleString('pt-BR')} Séries
              </span>
              <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-300 border border-emerald-500/20">
                <Radio className="h-3 w-3" />
                {(state.catalog?.totalCanaisTv || 0).toLocaleString('pt-BR')} Canais
              </span>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300 border border-amber-500/20">
                Limite: {state.catalog?.limiteLabel || 'Ilimitado'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Formulário */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" /> Dados do Novo Acesso
          </h3>
          <span className="text-xs text-slate-400">Campos opcionais são gerados automaticamente</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Nome do cliente</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
              className="border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">WhatsApp do cliente (opcional)</Label>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ex: 11 99999-9999"
              inputMode="tel"
              className="border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Usuário (opcional)</Label>
            <Input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="automático"
              className="border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Senha (opcional)</Label>
            <Input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="automática"
              className="border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-3">
          <Button
            onClick={() => criar('linha')}
            disabled={!!busy || loading || saldo < 1}
            className="bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500 shadow-md"
          >
            {busy === 'linha' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListPlus className="mr-2 h-4 w-4" />}
            {busy === 'linha' ? 'Gerando…' : saldo < 1 ? 'Saldo Insuficiente (0 Créditos)' : 'Gerar Linha (−1 crédito)'}
          </Button>

          <Button
            onClick={() => criar('teste')}
            disabled={!!busy || loading}
            className="border border-emerald-400/40 bg-emerald-400/10 font-medium text-emerald-300 hover:bg-emerald-400/20"
          >
            {busy === 'teste' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Timer className="mr-2 h-4 w-4" />}
            {busy === 'teste' ? 'Gerando…' : 'Gerar Teste 1h (grátis)'}
          </Button>
        </div>

        {saldo < 1 && (
          <p className="text-xs text-amber-300/90 pt-1">
            Você está sem créditos. O <strong>teste de 1 hora é ilimitado e grátis</strong>; para gerar linha mensal de 30 dias,{' '}
            <Link to="/revendas-creditos/comprar-creditos" className="underline font-semibold">
              compre créditos agora
            </Link>.
          </p>
        )}
      </div>

      {/* Resultado Rico com Servidor, Xtream Codes, M3U e Mensagem WhatsApp */}
      {resultado && links && (
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/80 p-6 space-y-5 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-100 text-base">
                  {isTest ? 'Teste de 1 Hora Ativado com Sucesso' : 'Linha de 30 Dias Gerada com Sucesso'}
                </h2>
                <p className="text-xs text-slate-400">
                  Válido até: <strong>{fmtDate(resultado.vencimento)}</strong> · Saldo restante: {resultado.creditBalance} crédito(s)
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                isTest
                  ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }
            >
              {isTest ? 'Teste Grátis' : '30 Dias Ativos'}
            </Badge>
          </div>

          {/* Card 1: Dados de Entrada Xtream Codes */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Tv className="h-4 w-4 text-amber-400" />
                Dados Xtream Codes (Para o cliente digitar no App IPTV)
              </h3>
              <Badge variant="outline" className="border-slate-700 bg-slate-800 text-[10px] text-slate-300">
                Smarters / TiviMate / XCIPTV
              </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Servidor / URL</span>
                  <p className="font-mono font-semibold text-amber-300 truncate">{links.dns_host}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(links.dns_host, 'c_srv', 'Servidor')}
                  className="h-7 px-2 text-xs text-slate-300"
                >
                  {copiedKey === 'c_srv' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Porta</span>
                  <p className="font-mono font-semibold text-slate-200">{links.port}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(links.port, 'c_port', 'Porta')}
                  className="h-7 px-2 text-xs text-slate-300"
                >
                  {copiedKey === 'c_port' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Usuário</span>
                  <p className="font-mono font-semibold text-slate-100 truncate">{resultado.username}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(resultado.username, 'c_user', 'Usuário')}
                  className="h-7 px-2 text-xs text-slate-300"
                >
                  {copiedKey === 'c_user' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Senha</span>
                  <p className="font-mono font-semibold text-slate-100 truncate">{resultado.password}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(resultado.password, 'c_pass', 'Senha')}
                  className="h-7 px-2 text-xs text-slate-300"
                >
                  {copiedKey === 'c_pass' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                copy(
                  `Servidor: ${links.dns_host}\nPorta: ${links.port}\nUsuário: ${resultado.username}\nSenha: ${resultado.password}\nVencimento: ${fmtDate(resultado.vencimento)}`,
                  'c_all_xt',
                  'Dados Xtream'
                )
              }
              className="w-full gap-1.5 border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 text-xs"
            >
              {copiedKey === 'c_all_xt' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              Copiar Todos os Dados Xtream Juntos
            </Button>
          </div>

          {/* Card 2: Links M3U e EPG */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <FileCode2 className="h-4 w-4 text-sky-400" />
              Links Diretos de Playlist M3U e EPG
            </h3>

            <div className="space-y-2 text-xs">
              {/* M3U TS */}
              <div className="rounded-lg bg-slate-950 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sky-400">Link M3U Plus (Formato TS - Recomendado)</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenQr(links.m3u_ts)}
                    className="h-6 w-6 text-sky-400"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="font-mono text-[11px] text-slate-300 break-all select-all">{links.m3u_ts}</p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copy(links.m3u_ts, 'm3u_ts', 'Link M3U TS')}
                    className="h-7 text-xs text-slate-300"
                  >
                    {copiedKey === 'm3u_ts' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    Copiar
                  </Button>
                </div>
              </div>

              {/* M3U8 HLS */}
              <div className="rounded-lg bg-slate-950 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400">Link M3U8 (Formato HLS - Apple / Web)</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenQr(links.m3u_hls)}
                    className="h-6 w-6 text-emerald-400"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="font-mono text-[11px] text-slate-300 break-all select-all">{links.m3u_hls}</p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copy(links.m3u_hls, 'm3u_hls', 'Link M3U8 HLS')}
                    className="h-7 text-xs text-slate-300"
                  >
                    {copiedKey === 'm3u_hls' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    Copiar
                  </Button>
                </div>
              </div>

              {/* EPG XMLTV */}
              <div className="rounded-lg bg-slate-950 p-2.5 space-y-1">
                <span className="font-semibold text-purple-400">Link EPG (Grade de Programação XMLTV)</span>
                <p className="font-mono text-[11px] text-slate-300 break-all select-all">{links.epg_xmltv}</p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copy(links.epg_xmltv, 'epg', 'Link EPG')}
                    className="h-7 text-xs text-slate-300"
                  >
                    {copiedKey === 'epg' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    Copiar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Mensagem Pronta para WhatsApp */}
          <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              Mensagem Pronta para Envio ao Cliente
            </h3>

            <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-sans text-xs leading-relaxed text-slate-300 select-all border border-slate-800">
              {enterpriseMsg}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                onClick={() => {
                  const raw = whatsapp.replace(/\D/g, '');
                  let target = '';
                  if (raw) target = raw.length <= 11 ? `55${raw}` : raw;
                  window.open(
                    `https://wa.me/${target}${target ? '?' : ''}text=${encodeURIComponent(enterpriseMsg)}`,
                    '_blank',
                    'noopener'
                  );
                }}
                className="flex-1 gap-2 bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
              >
                <Send className="h-4 w-4" />
                Enviar pelo WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => copy(enterpriseMsg, 'msg_all', 'Mensagem completa')}
                className="flex-1 gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              >
                {copiedKey === 'msg_all' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                Copiar Mensagem Formatada
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Dialog */}
      <QRCodeGenerator open={qrOpen} onOpenChange={setQrOpen} url={qrUrl} />
    </div>
  );
};

export default ResellerGerarLinha;
