import React, { useEffect, useState } from 'react';
import {
  ListPlus, Timer, Copy, Check, MessageCircle, Loader2, Coins, ExternalLink,
  AlertTriangle, Link2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  ResellerService, type ResellerState, type ResellerLineLinks, type CreateLineResult,
} from '@/services/ResellerService';

const buildShareMessage = (line: { usuario: string; senha: string }, links: ResellerLineLinks, masterName: string) =>
  `🎬 Seu acesso chegou!\n\n` +
  `📱 App: Xtream Codes / IPTV Smarters\n` +
  `🔗 Servidor: ${links.dns_host}\n` +
  `👤 Usuário: ${line.usuario}\n` +
  `🔑 Senha: ${line.senha}\n\n` +
  `🎬 Lista completa: ${links.m3u_ts}\n\n` +
  `${masterName} — bom divertimento!`;

const buildLinks = (state: ResellerState | null, masterId: string, u: string, p: string): ResellerLineLinks => {
  const dnsHost = state?.settings.dnsHost || 'https://api.tibimmanagerpainel.shop';
  const acct = masterId ? `&account=${encodeURIComponent(masterId)}` : '';
  return {
    dns_host: dnsHost,
    m3u_ts: `${dnsHost}/get.php?username=${u}&password=${p}${acct}&type=m3u_plus&output=ts`,
    m3u_hls: `${dnsHost}/get.php?username=${u}&password=${p}${acct}&type=m3u_plus&output=m3u8`,
    player_api: `${dnsHost}/player_api.php?username=${u}&password=${p}${acct}`,
  };
};

/**
 * Rota rápida /revendas-creditos/gerar-linha:
 * uma tela objetiva para criar 1 linha (−1 crédito) ou 1 teste de 1h (grátis)
 * e já copiar os dados do cliente final (M3U, Xtream, WhatsApp).
 */
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

  useEffect(() => {
    document.title = 'Portal de Revendas — Gerar Linha';
    ResellerService.state()
      .then(setState)
      .catch(() => { /* layout/página já sinalizam erro de sessão */ })
      .finally(() => setLoading(false));
  }, []);

  const saldo = state?.reseller.creditBalance ?? 0;
  const masterName = state?.master.name || '';

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1500);
    } catch {
      toast.error('Não foi possível copiar.');
    }
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
      setNome(''); setUsuario(''); setSenha(''); setWhatsapp('');
      toast.success(tipo === 'linha' ? 'Linha criada — 1 crédito usado.' : 'Teste de 1h criado (grátis).');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar.');
    } finally {
      setBusy('');
    }
  };

  const links = resultado ? buildLinks(state, state?.master.id || '', resultado.username, resultado.password) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <ListPlus className="h-6 w-6 text-amber-400" /> Gerar Linha
        </h1>
        <p className="text-sm text-slate-400">
          Crie o acesso do seu cliente e já envie por WhatsApp. Linha nova = <strong className="text-amber-300">1 crédito</strong> (30 dias).
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm">
        <Coins className="h-4 w-4 text-amber-400" />
        Saldo: <strong className="text-amber-300">{loading ? '…' : saldo}</strong> crédito(s)
        {loading ? (
          <Loader2 className="ml-auto h-4 w-4 animate-spin text-slate-500" />
        ) : saldo === 0 ? (
          <Link to="/revendas-creditos/comprar-creditos" className="ml-auto flex items-center gap-1 text-xs text-amber-300 hover:underline">
            <AlertTriangle className="h-3.5 w-3.5" /> Sem créditos — comprar agora
          </Link>
        ) : null}
      </div>

      {/* Formulário */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-300">Nome do cliente</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João da Silva"
              className="border-slate-700 bg-slate-950 text-slate-100" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">WhatsApp do cliente (opcional)</Label>
            <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="11 99999-9999" inputMode="tel"
              className="border-slate-700 bg-slate-950 text-slate-100" />
          </div>
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

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => criar('linha')} disabled={!!busy || loading || saldo < 1}
            className="bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500">
            {busy === 'linha' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListPlus className="mr-2 h-4 w-4" />}
            {busy === 'linha' ? 'Gerando…' : 'Gerar Linha (−1 crédito)'}
          </Button>
          <Button onClick={() => criar('teste')} disabled={!!busy || loading}
            className="border border-emerald-400/40 bg-emerald-400/10 font-medium text-emerald-300 hover:bg-emerald-400/20">
            {busy === 'teste' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Timer className="mr-2 h-4 w-4" />}
            {busy === 'teste' ? 'Gerando…' : 'Teste 1h (grátis)'}
          </Button>
        </div>
        {saldo < 1 && (
          <p className="mt-3 text-xs text-slate-500">
            Você está sem créditos — o teste de 1 hora continua grátis; para linha de 30 dias, compre créditos.
          </p>
        )}
      </div>

      {/* Resultado */}
      {resultado && links && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold text-slate-100">
              {resultado.tipo === 'teste' ? 'Teste de 1 hora gerado' : 'Linha gerada — válida 30 dias'}
            </h2>
          </div>

          <div className="space-y-1 rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300">
            <p>Usuário: <span className="text-amber-300">{resultado.username}</span></p>
            <p>Senha: <span className="text-amber-300">{resultado.password}</span></p>
            <p>Servidor: <span className="text-slate-200">{links.dns_host}</span></p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => copy(links.m3u_ts, 'm3u')}
                className="justify-start border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800">
                {copiedKey === 'm3u' ? <Check className="mr-2 h-4 w-4 text-emerald-400" /> : <Copy className="mr-2 h-4 w-4" />}
                Copiar lista M3U
              </Button>
              <Button variant="outline" onClick={() => copy(`Host: ${links.dns_host}\nUsuário: ${resultado.username}\nSenha: ${resultado.password}`, 'xt')}
                className="justify-start border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800">
                {copiedKey === 'xt' ? <Check className="mr-2 h-4 w-4 text-emerald-400" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                Copiar dados Xtream
              </Button>
            </div>
            <Button
              onClick={() => {
                const digits = whatsapp.replace(/\D/g, '');
                const target = digits ? `55${digits}` : '';
                window.open(`https://wa.me/${target}${target ? '?' : ''}text=${encodeURIComponent(buildShareMessage({ usuario: resultado.username, senha: resultado.password }, links, masterName))}`, '_blank', 'noopener');
              }}
              className="bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Enviar acesso por WhatsApp
            </Button>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Link2 className="h-3.5 w-3.5" /> Saldo atual: {resultado.creditBalance} crédito(s) — já pode gerar a próxima.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResellerGerarLinha;
