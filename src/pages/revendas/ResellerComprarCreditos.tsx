import React, { useEffect, useRef, useState } from 'react';
import { Coins, ShoppingCart, Copy, Check, QrCode, Loader2, CircleCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ResellerService, type ResellerState, type ResellerCreditPackage, type PixResult } from '@/services/ResellerService';

export const ResellerComprarCreditos: React.FC = () => {
  const [state, setState] = useState<ResellerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState<number>(10);
  const [cpf, setCpf] = useState('');
  const [busy, setBusy] = useState(false);
  const [pix, setPix] = useState<PixResult | null>(null);
  const [pixStatus, setPixStatus] = useState<'pendente' | 'pago'>('pendente');
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const s = await ResellerService.state();
      setState(s);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  const packages: ResellerCreditPackage[] = state?.settings.packages || [];
  const pricePerCredit = state?.settings.creditPrice || 5;
  const packMatch = packages.find(p => Number(p.credits) === credits);
  const value = packMatch ? Number(packMatch.price) : Number((credits * pricePerCredit).toFixed(2));

  const startPolling = (paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const st = await ResellerService.pixStatus(paymentId);
        if (st.status === 'pago') {
          setPixStatus('pago');
          if (pollRef.current) clearInterval(pollRef.current);
          toast.success(`${st.credited ? 'Pagamento confirmado! Créditos adicionados.' : 'Pagamento já confirmado.'} Saldo atual: ${st.creditBalance}`);
          load();
        }
      } catch { /* segue tentando */ }
    }, 5000);
  };

  const gerarPix = async () => {
    setError('');
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      setError('Informe seu CPF (11 números) para o PIX.');
      return;
    }
    setBusy(true);
    try {
      const result = await ResellerService.createPix({ credits, cpf: cpfDigits });
      setPix(result);
      setPixStatus('pendente');
      startPolling(result.paymentId);
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar PIX.');
    } finally {
      setBusy(false);
    }
  };

  const copyPayload = async () => {
    if (!pix?.qrPayload) return;
    try {
      await navigator.clipboard.writeText(pix.qrPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar. Selecione o código manualmente.');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>;
  }

  if (state && !state.settings.asaasConfigured) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-400/20 bg-slate-900/50 p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <h2 className="text-lg font-semibold text-slate-100">Compras em preparação</h2>
        <p className="mt-2 text-sm text-slate-400">
          Quem te indicou ainda não configurou o recebimento de pagamentos.
          Volte mais tarde ou fale diretamente com {state.master.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100"><Coins className="h-6 w-6 text-amber-400" /> Comprar Créditos</h1>
        <p className="text-sm text-slate-400">
          Saldo atual: <strong className="text-amber-300">{state?.reseller.creditBalance ?? 0}</strong> crédito(s) ·
          1 crédito = 30 dias de linha · pago por PIX direto para {state?.master.name || 'quem te indicou'}
        </p>
      </div>

      {error && !pix && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Pacotes */}
      {packages.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {packages.map((p, i) => (
            <button key={i} onClick={() => setCredits(Number(p.credits))}
              className={`rounded-xl border p-4 text-left transition-colors ${
                credits === Number(p.credits)
                  ? 'border-amber-400 bg-amber-400/10'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}>
              <p className="text-2xl font-bold text-amber-300">{p.credits}</p>
              <p className="text-xs text-slate-400">crédito(s)</p>
              <p className="mt-2 font-semibold text-slate-100">
                {Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              {p.label && <p className="mt-0.5 text-xs text-slate-500">{p.label}</p>}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-300">Quantidade de créditos</Label>
            <Input type="number" min={1} value={credits} onChange={e => setCredits(Math.max(1, Number(e.target.value) || 1))}
              className="border-slate-700 bg-slate-950 text-slate-100" />
            <p className="text-xs text-slate-500">Avulso: {pricePerCredit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por crédito</p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">CPF (para o PIX)</Label>
            <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" inputMode="numeric"
              className="border-slate-700 bg-slate-950 text-slate-100" />
            <p className="text-xs text-slate-500">Usado apenas para identificar o pagamento.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-950/60 p-4">
          <div>
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-3xl font-bold text-slate-100">
              {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-slate-500">{credits} crédito(s) · PIX</p>
          </div>
          <Button onClick={gerarPix} disabled={busy}
            className="bg-gradient-to-r from-amber-400 to-amber-600 font-semibold text-slate-950 hover:from-amber-300 hover:to-amber-500">
            <QrCode className="mr-2 h-4 w-4" />
            {busy ? 'Gerando PIX…' : 'Gerar PIX'}
          </Button>
        </div>
      </div>

      {/* Dialog do PIX */}
      <Dialog open={!!pix} onOpenChange={(open) => { if (!open) { setPix(null); if (pollRef.current) clearInterval(pollRef.current); } }}>
        <DialogContent className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pixStatus === 'pago' ? <CircleCheck className="h-5 w-5 text-emerald-400" /> : <QrCode className="h-5 w-5 text-amber-400" />}
              {pixStatus === 'pago' ? 'Pagamento confirmado!' : 'Pague o PIX para receber os créditos'}
            </DialogTitle>
          </DialogHeader>

          {pix && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-slate-950 px-4 py-3">
                <div>
                  <p className="text-xs text-slate-400">Valor</p>
                  <p className="text-xl font-bold text-amber-300">{Number(pix.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Créditos</p>
                  <p className="text-xl font-bold text-slate-100">+{pix.credits}</p>
                </div>
              </div>

              {pixStatus === 'pendente' ? (
                <>
                  {pix.qrImage && (
                    <div className="flex justify-center">
                      <img src={pix.qrImage} alt="QR Code PIX" className="rounded-lg bg-white p-2" style={{ width: 220, height: 220 }} />
                    </div>
                  )}
                  {pix.qrPayload && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">PIX copia e cola</Label>
                      <textarea readOnly value={pix.qrPayload}
                        className="h-20 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300" />
                      <Button variant="outline" onClick={copyPayload}
                        className="w-full border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800">
                        {copied ? <Check className="mr-2 h-4 w-4 text-emerald-400" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copied ? 'Copiado!' : 'Copiar código PIX'}
                      </Button>
                    </div>
                  )}
                  <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    Aguardando pagamento — os créditos caem automaticamente na confirmação…
                  </p>
                </>
              ) : (
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-center text-sm text-emerald-300">
                  Créditos adicionados com sucesso! Já pode criar linhas.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nota de segurança */}
      <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500">
        <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
        O pagamento vai direto para a conta PIX de {state?.master.name || 'quem te indicou'} — o painel não fica com nada.
        Os créditos caem automaticamente após a confirmação (verificação a cada poucos segundos).
      </div>
    </div>
  );
};

export default ResellerComprarCreditos;
