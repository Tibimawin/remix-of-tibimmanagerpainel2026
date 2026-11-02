import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Server,
  Copy,
  Check,
  ShieldCheck,
  Tv,
  Coins,
  FileCode2,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface ResellerServerInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dnsHost: string;
  masterName?: string;
  creditBalance?: number;
  creditPrice?: number;
}

export const ResellerServerInfoDialog: React.FC<ResellerServerInfoDialogProps> = ({
  open,
  onOpenChange,
  dnsHost,
  masterName = 'Painel de Revendas',
  creditBalance = 0,
  creditPrice = 5,
}) => {
  const [copiedKey, setCopiedKey] = useState<string>('');

  const cleanHost = String(dnsHost || 'https://api.tibimmanagerpainel.shop').replace(/\/+$/, '');
  let port = '80';
  try {
    const parsed = new URL(cleanHost);
    port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  } catch {}

  const copy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} copiado!`);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-100">
                Configurações da Lista M3U & Servidor DNS
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Informações do servidor e conexão IPTV para você configurar seus clientes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Card Servidor Principal */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Tv className="h-4 w-4 text-amber-400" />
                URL Principal do Servidor (Host DNS)
              </h4>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
                Online & Ativo
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Esta é a URL que seus clientes devem digitar no campo <strong>Servidor / URL / Host</strong> em aplicativos como IPTV Smarters Pro, XCIPTV, TiviMate, etc.
            </p>

            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3 text-xs font-mono">
              <span className="text-amber-300 font-semibold truncate pr-2">{cleanHost}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copy(cleanHost, 'srv_host', 'Host do Servidor')}
                className="h-8 gap-1 border border-slate-800 bg-slate-900 px-3 text-slate-300 hover:bg-slate-800"
              >
                {copiedKey === 'srv_host' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                Copiar URL
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="rounded-lg bg-slate-950/70 p-2.5">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Porta Padrão</span>
                <span className="font-mono font-semibold text-slate-200">{port} (HTTP / HTTPS)</span>
              </div>
              <div className="rounded-lg bg-slate-950/70 p-2.5">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Provedor / Master</span>
                <span className="font-semibold text-slate-200 truncate block">{masterName}</span>
              </div>
            </div>
          </div>

          {/* Formatos Suportados */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-sky-400" />
              Formatos de Lista e Transmissão Suportados
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 rounded-lg bg-slate-950/60 p-2.5">
                <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-400 text-[10px] shrink-0">
                  M3U Plus (TS)
                </Badge>
                <span className="text-slate-300">
                  Formato padrão para Smart TVs, TV Box, Smarters e TiviMate com suporte a categorias e logos.
                </span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-slate-950/60 p-2.5">
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] shrink-0">
                  M3U8 (HLS)
                </Badge>
                <span className="text-slate-300">
                  Streaming adaptativo HLS ideal para iOS (iPhone, iPad, Apple TV), Safari e players web.
                </span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-slate-950/60 p-2.5">
                <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-400 text-[10px] shrink-0">
                  EPG (XMLTV)
                </Badge>
                <span className="text-slate-300">
                  Grade de programação completa dos canais sincronizada automaticamente.
                </span>
              </div>
            </div>
          </div>

          {/* Como Funciona o Saldo de Créditos */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-xs">
            <h4 className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-amber-400" />
              Como Funciona o Sistema de Créditos na Revenda
            </h4>
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
              <li>
                <strong>1 Crédito = 30 dias de acesso</strong> para 1 cliente final.
              </li>
              <li>
                <strong>Testes de 1 hora são 100% GRÁTIS</strong> e ilimitados para você enviar para clientes degustarem antes de comprar.
              </li>
              <li>
                Quando você cria uma linha definitiva ou renova um cliente por +30 dias, <strong>1 crédito é debitado</strong> do seu saldo.
              </li>
              <li>
                Seu saldo atual: <strong className="text-amber-300">{creditBalance} crédito(s)</strong>.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
