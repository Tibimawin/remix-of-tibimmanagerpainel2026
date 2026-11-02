import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import {
  Copy,
  Check,
  QrCode,
  Server,
  KeyRound,
  FileCode2,
  Tv,
  MessageCircle,
  Clock,
  ShieldCheck,
  Send,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import {
  type ResellerLineLinks,
  buildEnterpriseShareMessage,
} from '@/services/ResellerService';

export interface ResellerLineDetail {
  id?: string;
  nome?: string;
  usuario: string;
  senha: string;
  vencimento?: string;
  status?: string;
  tipo?: 'linha' | 'teste' | string;
  whatsapp?: string;
}

interface ResellerLineConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: ResellerLineDetail | null;
  links: ResellerLineLinks | null;
  masterName?: string;
  creditBalance?: number;
  onRenew?: () => void;
  renewing?: boolean;
}

const fmtDate = (iso?: string) => {
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

export const ResellerLineConfigDialog: React.FC<ResellerLineConfigDialogProps> = ({
  open,
  onOpenChange,
  line,
  links,
  masterName = 'Painel de Revenda',
  creditBalance = 0,
  onRenew,
  renewing = false,
}) => {
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [qrOpen, setQrOpen] = useState(false);
  const [customHeader, setCustomHeader] = useState(() => {
    return localStorage.getItem('reseller_custom_msg_header') || '';
  });
  const [editingHeader, setEditingHeader] = useState(false);

  if (!line || !links) return null;

  const isTest = line.tipo === 'teste' || /teste/i.test(line.usuario || '') || /teste/i.test(line.nome || '');
  const isExpired = line.vencimento ? Date.parse(line.vencimento) < Date.now() : false;

  const copy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} copiado!`);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {
      toast.error('Não foi possível copiar para a área de transferência.');
    }
  };

  const handleOpenQr = (url: string) => {
    setQrUrl(url);
    setQrOpen(true);
  };

  const fullXtreamText =
    `Servidor: ${links.dns_host}\n` +
    `Porta: ${links.port}\n` +
    `Usuário: ${line.usuario}\n` +
    `Senha: ${line.senha}\n` +
    `Vencimento: ${fmtDate(line.vencimento)}`;

  const shareMessage = buildEnterpriseShareMessage({
    nomeCliente: line.nome,
    usuario: line.usuario,
    senha: line.senha,
    vencimento: line.vencimento,
    tipo: isTest ? 'teste' : 'linha',
    links,
    masterName,
    customHeader: customHeader.trim() || undefined,
  });

  const handleSaveHeader = () => {
    localStorage.setItem('reseller_custom_msg_header', customHeader);
    setEditingHeader(false);
    toast.success('Recado personalizado salvo para as próximas mensagens!');
  };

  const handleSendWhatsApp = () => {
    const rawNumber = String(line.whatsapp || '').replace(/\D/g, '');
    let url = 'https://wa.me/';
    if (rawNumber) {
      const fullNum = rawNumber.length <= 11 ? `55${rawNumber}` : rawNumber;
      url += `${fullNum}?text=${encodeURIComponent(shareMessage)}`;
    } else {
      url += `?text=${encodeURIComponent(shareMessage)}`;
    }
    window.open(url, '_blank', 'noopener');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
          <DialogHeader className="space-y-2 border-b border-slate-800 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-100">
                    {line.nome || line.usuario || 'Cliente'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Configurações da Lista M3U, Dados Xtream e Mensagem de Acesso
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    isTest
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }
                >
                  {isTest ? 'Teste 1h (Grátis)' : 'Linha 30 Dias'}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    isExpired
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  }
                >
                  {isExpired ? 'Vencida' : 'Ativo'}
                </Badge>
              </div>
            </div>

            {/* Barra rápida de status */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/70 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Vencimento:</span>
                <strong className={isExpired ? 'text-red-400' : 'text-slate-100'}>
                  {fmtDate(line.vencimento)}
                </strong>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>DNS Isolado</span>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="xtream" className="mt-4 space-y-4">
            <TabsList className="grid grid-cols-3 border border-slate-800 bg-slate-900 p-1 text-slate-400">
              <TabsTrigger
                value="xtream"
                className="gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:font-semibold data-[state=active]:text-slate-950"
              >
                <KeyRound className="h-4 w-4" />
                <span className="hidden sm:inline">Dados</span> Xtream Codes
              </TabsTrigger>
              <TabsTrigger
                value="m3u"
                className="gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:font-semibold data-[state=active]:text-slate-950"
              >
                <FileCode2 className="h-4 w-4" />
                Listas M3U / EPG
              </TabsTrigger>
              <TabsTrigger
                value="mensagem"
                className="gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:font-semibold data-[state=active]:text-slate-950"
              >
                <MessageCircle className="h-4 w-4" />
                Mensagem Cliente
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: DADOS XTREAM CODES */}
            <TabsContent value="xtream" className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                    <Tv className="h-4 w-4 text-amber-400" />
                    Dados de Entrada Xtream Codes (API)
                  </h4>
                  <Badge variant="outline" className="border-slate-700 bg-slate-800 text-[10px] text-slate-300">
                    Smarters / XCIPTV / TiviMate
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para clientes que usam aplicativos IPTV modernos. Basta inserir o Servidor/URL, Usuário e Senha.
                </p>

                <div className="grid gap-2.5 pt-1">
                  {/* Servidor / URL */}
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-2.5 text-xs">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        URL do Servidor / Host DNS
                      </span>
                      <p className="font-mono font-semibold text-amber-300 truncate">{links.dns_host}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copy(links.dns_host, 'xt_server', 'Servidor DNS')}
                      className="h-8 gap-1 border border-slate-800 bg-slate-900 px-2.5 text-slate-300 hover:bg-slate-800"
                    >
                      {copiedKey === 'xt_server' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">Copiar</span>
                    </Button>
                  </div>

                  {/* Porta */}
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-2.5 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Porta
                      </span>
                      <p className="font-mono font-semibold text-slate-200">{links.port}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copy(links.port, 'xt_port', 'Porta')}
                      className="h-8 gap-1 border border-slate-800 bg-slate-900 px-2.5 text-slate-300 hover:bg-slate-800"
                    >
                      {copiedKey === 'xt_port' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">Copiar</span>
                    </Button>
                  </div>

                  {/* Usuário */}
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-2.5 text-xs">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Usuário
                      </span>
                      <p className="font-mono font-semibold text-slate-100 truncate">{line.usuario}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copy(line.usuario, 'xt_user', 'Usuário')}
                      className="h-8 gap-1 border border-slate-800 bg-slate-900 px-2.5 text-slate-300 hover:bg-slate-800"
                    >
                      {copiedKey === 'xt_user' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">Copiar</span>
                    </Button>
                  </div>

                  {/* Senha */}
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-2.5 text-xs">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Senha
                      </span>
                      <p className="font-mono font-semibold text-slate-100 truncate">{line.senha}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copy(line.senha, 'xt_pass', 'Senha')}
                      className="h-8 gap-1 border border-slate-800 bg-slate-900 px-2.5 text-slate-300 hover:bg-slate-800"
                    >
                      {copiedKey === 'xt_pass' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">Copiar</span>
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => copy(fullXtreamText, 'xt_all', 'Dados Xtream completos')}
                    className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 font-semibold text-slate-950 hover:from-amber-400 hover:to-amber-500"
                  >
                    {copiedKey === 'xt_all' ? <Check className="h-4 w-4 text-emerald-950" /> : <Copy className="h-4 w-4" />}
                    Copiar Todos os Dados Xtream (Host/Porta/User/Senha)
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: FORMATOS M3U & EPG */}
            <TabsContent value="m3u" className="space-y-3">
              {/* Card 1: Formato TS */}
              <div className="rounded-xl border border-sky-500/20 bg-slate-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs">
                    Padrão Recomendado (MPEG-TS)
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenQr(links.m3u_ts)}
                    className="h-7 w-7 text-sky-400 hover:bg-sky-500/10"
                    title="Ver QR Code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
                <h4 className="text-sm font-semibold text-slate-200">Link M3U Plus (Formato TS)</h4>
                <p className="text-xs text-slate-400">
                  Ideal para IPTV Smarters, TiviMate, OTT Navigator, Smart TVs e TV Box.
                </p>
                <div className="select-all rounded-md bg-slate-950 p-2 font-mono text-[11px] text-slate-300 break-all">
                  {links.m3u_ts}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(links.m3u_ts, 'm3u_ts', 'Link M3U Plus TS')}
                    className="w-full gap-1.5 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  >
                    {copiedKey === 'm3u_ts' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copiar Link M3U TS
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenQr(links.m3u_ts)}
                    className="gap-1 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR Code
                  </Button>
                </div>
              </div>

              {/* Card 2: Formato HLS */}
              <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
                    HLS Streaming (M3U8)
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenQr(links.m3u_hls)}
                    className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10"
                    title="Ver QR Code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
                <h4 className="text-sm font-semibold text-slate-200">Link M3U8 (Formato HLS)</h4>
                <p className="text-xs text-slate-400">
                  Ideal para dispositivos Apple (iOS / iPadOS / macOS / Apple TV), Safari e players web.
                </p>
                <div className="select-all rounded-md bg-slate-950 p-2 font-mono text-[11px] text-slate-300 break-all">
                  {links.m3u_hls}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(links.m3u_hls, 'm3u_hls', 'Link M3U8 HLS')}
                    className="w-full gap-1.5 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  >
                    {copiedKey === 'm3u_hls' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copiar Link M3U8 HLS
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenQr(links.m3u_hls)}
                    className="gap-1 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR Code
                  </Button>
                </div>
              </div>

              {/* Card 3: Link EPG XMLTV */}
              <div className="rounded-xl border border-purple-500/20 bg-slate-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs">
                    Guia de TV (XMLTV)
                  </Badge>
                </div>
                <h4 className="text-sm font-semibold text-slate-200">Link EPG (Guia de Programação)</h4>
                <p className="text-xs text-slate-400">
                  URL para carregar os horários e a grade da programação dos canais nos aplicativos.
                </p>
                <div className="select-all rounded-md bg-slate-950 p-2 font-mono text-[11px] text-slate-300 break-all">
                  {links.epg_xmltv}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(links.epg_xmltv, 'epg', 'Link EPG')}
                  className="w-full gap-1.5 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                >
                  {copiedKey === 'epg' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar Link EPG XMLTV
                </Button>
              </div>
            </TabsContent>

            {/* ABA 3: MENSAGEM ENTERPRISE PARA CLIENTE */}
            <TabsContent value="mensagem" className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4 text-emerald-400" />
                      Mensagem Pronta para WhatsApp / Email
                    </h4>
                    <p className="text-xs text-slate-400">
                      Mensagem estruturada estilo grandes empresas com instruções e dados de conexão.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingHeader(!editingHeader)}
                    className="h-8 gap-1 text-xs text-slate-400 hover:text-slate-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {editingHeader ? 'Fechar edição' : 'Personalizar recado'}
                  </Button>
                </div>

                {editingHeader && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <label className="text-xs font-medium text-slate-300">
                      Recado personalizado extra (opcional — aparecerá no início da mensagem):
                    </label>
                    <Textarea
                      rows={2}
                      value={customHeader}
                      onChange={(e) => setCustomHeader(e.target.value)}
                      placeholder="Ex: Seu plano foi ativado com sucesso! Qualquer dúvida envie uma mensagem neste número."
                      className="border-slate-800 bg-slate-900 text-xs text-slate-200"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCustomHeader('');
                          localStorage.removeItem('reseller_custom_msg_header');
                        }}
                        className="h-7 text-xs text-slate-400"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" /> Limpar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveHeader}
                        className="h-7 bg-amber-500 font-medium text-slate-950 hover:bg-amber-400 text-xs"
                      >
                        Salvar Recado
                      </Button>
                    </div>
                  </div>
                )}

                {/* Preview da Mensagem */}
                <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-sans text-xs leading-relaxed text-slate-300 select-all border border-slate-800/80">
                  {shareMessage}
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={handleSendWhatsApp}
                    className="flex-1 gap-2 bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    <Send className="h-4 w-4" />
                    Enviar pelo WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copy(shareMessage, 'msg_all', 'Mensagem completa')}
                    className="flex-1 gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  >
                    {copiedKey === 'msg_all' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    Copiar Mensagem Formatada
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Rodapé: Ação de Renovação se necessário */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 mt-2">
            <div className="text-xs text-slate-400">
              {isExpired ? (
                <span className="text-red-400 font-medium">Linha vencida — renove para reativar o sinal.</span>
              ) : (
                <span>Acesso ativo e sincronizado no servidor.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onRenew && (
                <Button
                  size="sm"
                  onClick={onRenew}
                  disabled={renewing || creditBalance < 1}
                  className="gap-1.5 bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400 text-xs"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${renewing ? 'animate-spin' : ''}`} />
                  {renewing ? 'Renovando...' : 'Renovar +30 dias (1 crédito)'}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <QRCodeGenerator open={qrOpen} onOpenChange={setQrOpen} url={qrUrl} />
    </>
  );
};
