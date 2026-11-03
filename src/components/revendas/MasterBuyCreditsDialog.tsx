import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Coins, MessageCircle, Copy, Check, Sparkles, ShieldCheck, ArrowRight,
  Loader2, QrCode, AlertCircle, ShoppingCart, Zap, RefreshCw, CheckCircle2,
  Lock, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import {
  MasterCreditService,
  ResellerWholesaleConfig,
  ResellerWholesalePackage,
  DEFAULT_WHOLESALE_CONFIG
} from '@/services/MasterCreditService';
import { AsaasPaymentService } from '@/services/AsaasPaymentService';
import { formatWhatsAppUrl } from '@/services/ResellerService';
import { generateValidCPF, validateCPF } from '@/utils/cpfGenerator';
import { db } from '@/config/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface MasterBuyCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterId: string;
  masterEmail: string;
  masterName: string;
  currentBalance: number;
  onSuccess?: (addedCredits: number) => void;
}

type TabMode = 'pix_auto' | 'pix_manual';
type PixAutoSubstep = 'select' | 'processing' | 'pix_screen' | 'confirmed' | 'error';

export const MasterBuyCreditsDialog: React.FC<MasterBuyCreditsDialogProps> = ({
  open,
  onOpenChange,
  masterId,
  masterEmail,
  masterName,
  currentBalance,
  onSuccess,
}) => {
  const [config, setConfig] = useState<ResellerWholesaleConfig>(DEFAULT_WHOLESALE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<ResellerWholesalePackage | null>(null);
  const [tabMode, setTabMode] = useState<TabMode>('pix_auto');
  const [substep, setSubstep] = useState<PixAutoSubstep>('select');

  // Dados do Comprador (Master)
  const [name, setName] = useState(masterName || '');
  const [email, setEmail] = useState(masterEmail || '');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  // Estados de Pagamento Asaas
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; expirationDate: string } | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedManualKey, setCopiedManualKey] = useState(false);
  const [isCheckingManual, setIsCheckingManual] = useState(false);
  const [newCreditsAdded, setNewCreditsAdded] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inicialização ao abrir modal
  useEffect(() => {
    if (!open) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    let isMounted = true;
    setLoading(true);

    if (masterEmail) setEmail(masterEmail);
    if (masterName) setName(masterName);
    setCpf(prev => prev || generateValidCPF());

    MasterCreditService.getWholesaleConfig()
      .then(cfg => {
        if (!isMounted) return;
        setConfig(cfg);
        const popular = cfg.packages.find(p => p.popular) || cfg.packages[0] || null;
        setSelectedPackage(popular);
      })
      .catch(err => {
        console.warn('Erro ao carregar configurações de atacado:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, masterEmail, masterName]);

  // Limpar timer no desmonte
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const handleGenerateNewCpf = () => {
    const newCpf = generateValidCPF();
    setCpf(newCpf);
    toast.success('Novo CPF válido gerado!');
  };

  const formatCpf = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  };

  const formatPhone = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  };

  // Tratar confirmação e liberação imediata de créditos
  const handlePaymentConfirmed = async (confirmedPaymentId: string, pkg: ResellerWholesalePackage) => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    try {
      const cleanEmail = (email || masterEmail || '').trim().toLowerCase();
      const cleanName = name || masterName || 'Master';

      // 1. Conceder créditos ao estoque master
      await MasterCreditService.addMasterCredits(
        masterId,
        pkg.credits,
        `Compra de ${pkg.credits} créditos de revenda via PIX Automático Asaas (ID: ${confirmedPaymentId})`,
        {
          masterEmail: cleanEmail,
          masterName: cleanName,
          value: pkg.price,
          type: 'compra_atacado',
          paymentMethod: 'PIX_ASAAS',
          status: 'pago',
        }
      );

      // 2. Registrar no controle financeiro para conciliação contábil (obedecendo lowercased userEmail)
      try {
        await setDoc(doc(db, 'financialRecords', confirmedPaymentId), {
          id: confirmedPaymentId,
          userId: masterId,
          userEmail: cleanEmail,
          userName: cleanName,
          planName: `Atacado Revenda: ${pkg.credits} Créditos`,
          planPrice: pkg.price,
          accessDays: 0,
          durationDays: 0,
          resellerCredits: pkg.credits,
          paymentMethod: 'PIX',
          paymentId: confirmedPaymentId,
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          source: 'reseller_credits_wholesale',
          isFeatureUnlockOnly: true,
          requiredFeature: 'minhas-revendas'
        }, { merge: true });
        console.log('💰 Registro financeiro confirmado gravado para atacado:', confirmedPaymentId);
      } catch (finErr) {
        console.warn('Aviso ao registrar financeiro:', finErr);
      }

      try {
        const audio = new Audio('/success.mp3');
        audio.play().catch(() => {});
      } catch {}

      setNewCreditsAdded(pkg.credits);
      setSubstep('confirmed');
      toast.success(`Pagamento confirmado! +${pkg.credits} créditos adicionados ao seu estoque.`);

      if (onSuccess) {
        onSuccess(pkg.credits);
      }
    } catch (err: any) {
      console.error('Erro ao creditar saldo após pagamento:', err);
      toast.error('Pagamento identificado, mas houve erro ao atualizar o saldo. Notifique o suporte.');
    }
  };

  // Iniciar Polling de verificação a cada 4 segundos
  const startPolling = (pId: string, pkg: ResellerWholesalePackage) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const status = await AsaasPaymentService.getPaymentStatus(pId);
        if (status.status === 'RECEIVED' || status.status === 'CONFIRMED') {
          await handlePaymentConfirmed(pId, pkg);
        }
      } catch (e) {
        console.warn('Polling Asaas em andamento...', e);
      }
    }, 4000);
  };

  // Gerar cobrança PIX automática no Asaas
  const handleGeneratePixPayment = async () => {
    if (!selectedPackage) {
      toast.error('Selecione um pacote de créditos');
      return;
    }

    const cleanName = (name || masterName || '').trim();
    const cleanEmail = (email || masterEmail || '').trim().toLowerCase();
    const cleanCpf = cpf.replace(/\D/g, '');

    if (!cleanName) {
      toast.error('Informe seu nome completo');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Informe um e-mail válido');
      return;
    }
    if (cleanCpf.length !== 11 || !validateCPF(cleanCpf)) {
      toast.error('CPF inválido. Clique em "Gerar Válido" para preencher.');
      return;
    }

    setSubstep('processing');
    setErrorMessage('');

    try {
      // 1. Criar ou obter cliente no Asaas do Admin
      const customer = await AsaasPaymentService.findOrCreateCustomer(
        cleanName,
        cleanEmail,
        cleanCpf,
        {
          phone: phone ? phone.replace(/\D/g, '') : undefined,
        }
      );

      // 2. Criar cobrança avulsa no Asaas
      const paymentDescription = `Compra de ${selectedPackage.credits} Créditos de Revenda - Master: ${cleanEmail}`;
      const payment = await AsaasPaymentService.createOneTimePayment(
        customer.id,
        selectedPackage.price,
        paymentDescription
      );

      setPaymentId(payment.id);

      // 3. Obter QR Code e Payload Copia-e-Cola
      const qrData = await AsaasPaymentService.getPixQrCode(payment.id);
      setPixData(qrData);

      // 4. Salvar registro financeiro pendente
      try {
        await setDoc(doc(db, 'financialRecords', payment.id), {
          id: payment.id,
          userId: masterId,
          userEmail: cleanEmail,
          userName: cleanName,
          planName: `Atacado Revenda: ${selectedPackage.credits} Créditos`,
          planPrice: selectedPackage.price,
          accessDays: 0,
          durationDays: 0,
          resellerCredits: selectedPackage.credits,
          paymentMethod: 'PIX',
          paymentId: payment.id,
          status: 'pending',
          createdAt: new Date().toISOString(),
          source: 'reseller_credits_wholesale',
          isFeatureUnlockOnly: true,
          requiredFeature: 'minhas-revendas'
        }, { merge: true });
      } catch (finErr) {
        console.warn('Aviso ao salvar financeiro pendente:', finErr);
      }

      setSubstep('pix_screen');
      startPolling(payment.id, selectedPackage);
    } catch (err: any) {
      console.error('Erro ao gerar PIX Asaas:', err);
      setErrorMessage(err?.message || 'Falha ao conectar com o serviço de pagamento Asaas.');
      setSubstep('error');
      toast.error(err?.message || 'Erro ao gerar PIX');
    }
  };

  // Botão "Verificar Pagamento Agora"
  const handleCheckStatusNow = async () => {
    if (!paymentId || !selectedPackage) return;
    setIsCheckingManual(true);
    try {
      const status = await AsaasPaymentService.getPaymentStatus(paymentId);
      if (status.status === 'RECEIVED' || status.status === 'CONFIRMED') {
        await handlePaymentConfirmed(paymentId, selectedPackage);
      } else {
        toast.info(status.status === 'PENDING' ? 'Pagamento ainda não detectado pelo Asaas. Se já pagou, aguarde alguns instantes.' : `Status atual: ${status.status}`);
      }
    } catch (err: any) {
      toast.error('Erro ao consultar status: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsCheckingManual(false);
    }
  };

  const copyPixPayload = async () => {
    if (!pixData?.payload) return;
    try {
      await navigator.clipboard.writeText(pixData.payload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2500);
      toast.success('Código PIX Copia e Cola copiado com sucesso!');
    } catch {
      toast.error('Erro ao copiar código PIX.');
    }
  };

  const copyManualPixKey = async () => {
    if (!config.pixKeyAdmin) {
      toast.info('Chave PIX direta não cadastrada. Fale com o Admin pelo WhatsApp.');
      return;
    }
    try {
      await navigator.clipboard.writeText(config.pixKeyAdmin);
      setCopiedManualKey(true);
      setTimeout(() => setCopiedManualKey(false), 2000);
      toast.success('Chave PIX do Admin copiada!');
    } catch {
      toast.error('Não foi possível copiar a chave.');
    }
  };

  const getWhatsAppLink = () => {
    const pkg = selectedPackage || config.packages[0];
    const qty = pkg ? pkg.credits : 50;
    const val = pkg ? pkg.price.toFixed(2) : '100.00';
    const message = `Olá Admin! Sou o usuário ${name || masterName || 'Master'} (${email || masterEmail}) do painel.\n` +
      `Gostaria de comprar o *Pacote de ${qty} Créditos de Revenda* por *R$ ${val}* para abastecer meu estoque.\n` +
      `Já estou com o PIX pronto para envio! Como podemos prosseguir?`;

    return formatWhatsAppUrl(config.whatsappAdmin || '5511999999999', message);
  };

  const handleClose = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setSubstep('select');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="text-left space-y-1.5 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Comprar Créditos de Revenda com o Admin
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Abasteça seu estoque master para distribuir para suas revendas e criar novas linhas IPTV.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-xs text-muted-foreground">Carregando pacotes e integração de pagamento...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Saldo Atual Banner */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Seu Estoque Atual de Créditos</p>
                  <p className="text-sm font-bold text-foreground">
                    {currentBalance} crédito(s) disponível(is)
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold gap-1">
                <Zap className="w-3 h-3 fill-emerald-500" /> Liberação Automática
              </Badge>
            </div>

            {/* Substep: CONFIRMADO (Sucesso) */}
            {substep === 'confirmed' ? (
              <div className="p-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-foreground">
                    Pagamento Confirmado pelo Asaas!
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Parabéns! Seus créditos de revenda foram liberados automaticamente e já estão disponíveis no seu estoque.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border max-w-sm mx-auto flex items-center justify-around">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Créditos Comprados</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{newCreditsAdded}</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Novo Saldo Master</p>
                    <p className="text-lg font-bold text-foreground">{currentBalance + newCreditsAdded} créditos</p>
                  </div>
                </div>

                <Button
                  onClick={handleClose}
                  className="w-full max-w-sm mx-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5"
                >
                  Concluir e Voltar ao Painel
                </Button>
              </div>
            ) : substep === 'processing' ? (
              /* Substep: PROCESSANDO */
              <div className="flex flex-col items-center justify-center py-14 space-y-3 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                <h4 className="text-base font-bold text-foreground">Gerando PIX no Asaas...</h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Criando cobrança oficial na conta do Admin e gerando o QR Code instantâneo.
                </p>
              </div>
            ) : substep === 'pix_screen' && pixData ? (
              /* Substep: QR CODE & COPIA E COLA PIX */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (pollRef.current) clearInterval(pollRef.current);
                      setSubstep('select');
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar aos pacotes
                  </button>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Aguardando Pagamento
                  </Badge>
                </div>

                {/* Card de Resumo */}
                <div className="p-3.5 rounded-xl border border-border bg-card flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pacote Selecionado</p>
                    <p className="text-sm font-bold text-foreground">
                      {selectedPackage?.credits} Créditos de Revenda
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Valor a Pagar</p>
                    <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                      R$ {selectedPackage?.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="p-5 rounded-2xl border border-border/70 bg-card text-center space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Abra o app do seu banco, escolha <strong>Pagar via PIX</strong> e aponte a câmera para o QR Code abaixo:
                  </p>

                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                      <img
                        src={pixData.encodedImage.startsWith('data:') ? pixData.encodedImage : `data:image/png;base64,${pixData.encodedImage}`}
                        alt="QR Code PIX Asaas"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                  </div>

                  {/* Código Copia e Cola */}
                  <div className="space-y-1.5 pt-1 max-w-md mx-auto">
                    <label className="text-[11px] font-semibold text-muted-foreground block text-left">
                      Ou use o PIX Copia e Cola:
                    </label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={pixData.payload}
                        className="w-full bg-muted/60 border border-border px-3 py-2 rounded-lg text-xs font-mono text-foreground select-all"
                      />
                      <Button
                        type="button"
                        onClick={copyPixPayload}
                        className={`shrink-0 font-semibold gap-1.5 ${
                          copiedPayload
                            ? 'bg-emerald-600 text-white'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {copiedPayload ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedPayload ? 'Copiado!' : 'Copiar'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Status de Polling & Ações */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
                    <span>Verificando pagamento automaticamente a cada 4 segundos...</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCheckStatusNow}
                    disabled={isCheckingManual}
                    className="shrink-0 gap-1.5 text-xs font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingManual ? 'animate-spin' : ''}`} />
                    {isCheckingManual ? 'Verificando...' : 'Já Paguei, Verificar Agora'}
                  </Button>
                </div>
              </div>
            ) : substep === 'error' ? (
              /* Substep: ERRO */
              <div className="p-5 rounded-2xl border border-destructive/40 bg-destructive/10 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
                <h4 className="text-base font-bold text-foreground">Não foi possível gerar a cobrança</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {errorMessage || 'Houve um erro na comunicação com o gateway Asaas. Você pode tentar novamente ou pagar via chave PIX / WhatsApp com o Admin.'}
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubstep('select')}
                  >
                    Tentar Novamente
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setTabMode('pix_manual');
                      setSubstep('select');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Pagar via WhatsApp / Chave Manual
                  </Button>
                </div>
              </div>
            ) : (
              /* Substep: SELEÇÃO DE PACOTES E DADOS */
              <div className="space-y-5">
                {/* Pacotes de Créditos */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    1. Selecione um Pacote de Atacado:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {config.packages.map((pkg, idx) => {
                      const isSelected = selectedPackage?.credits === pkg.credits && selectedPackage?.price === pkg.price;
                      const unitPrice = pkg.credits > 0 ? (pkg.price / pkg.credits) : config.creditPrice;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`relative cursor-pointer p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                              : 'border-border/60 hover:border-border bg-card'
                          }`}
                        >
                          {pkg.popular && (
                            <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Mais Vendido
                            </span>
                          )}

                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                <Coins className="w-4 h-4 text-amber-500" />
                                {pkg.label || `${pkg.credits} Créditos`}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                R$ {unitPrice.toFixed(2)} por crédito
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-extrabold text-foreground">
                                R$ {pkg.price.toFixed(2)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">à vista no PIX</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Seleção do Modo de Pagamento: PIX Automático vs Manual WhatsApp */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    2. Método de Pagamento:
                  </label>
                  <Tabs value={tabMode} onValueChange={(v) => setTabMode(v as TabMode)}>
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="pix_auto" className="gap-1.5 text-xs font-semibold">
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        PIX Automático (Instantâneo)
                      </TabsTrigger>
                      <TabsTrigger value="pix_manual" className="gap-1.5 text-xs">
                        <MessageCircle className="w-3.5 h-3.5 text-primary" />
                        Chave PIX / WhatsApp Admin
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Conteúdo Aba PIX Automático */}
                {tabMode === 'pix_auto' && (
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Pacote Selecionado</p>
                        <p className="text-sm font-bold text-foreground">
                          {selectedPackage ? `${selectedPackage.credits} Créditos de Revenda` : 'Nenhum'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total a Pagar</p>
                        <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          R$ {selectedPackage ? selectedPackage.price.toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>

                    {/* Dados para Emissão do PIX */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-primary" />
                        Confirme seus dados para emissão da cobrança Asaas:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Nome Completo</Label>
                          <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">E-mail</Label>
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-[11px] text-muted-foreground">CPF do Pagador (Obrigatório Asaas)</Label>
                            <button
                              type="button"
                              onClick={handleGenerateNewCpf}
                              className="text-[10px] text-primary hover:underline font-medium"
                            >
                              Gerar CPF Válido
                            </button>
                          </div>
                          <Input
                            value={cpf}
                            onChange={(e) => setCpf(formatCpf(e.target.value))}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-background/80 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        Assim que o pagamento for detectado pelo Asaas, seus <strong>{selectedPackage?.credits || 0} créditos</strong> serão adicionados na hora ao seu estoque.
                      </span>
                    </div>

                    <Button
                      type="button"
                      onClick={handleGeneratePixPayment}
                      disabled={!selectedPackage}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 h-auto gap-2 shadow-sm"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      Gerar PIX e Pagar R$ {selectedPackage ? selectedPackage.price.toFixed(2) : '0.00'}
                    </Button>
                  </div>
                )}

                {/* Conteúdo Aba Manual / WhatsApp */}
                {tabMode === 'pix_manual' && (
                  <div className="p-4 rounded-xl border border-border bg-card space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Pacote Selecionado</p>
                        <p className="text-sm font-bold text-foreground">
                          {selectedPackage ? `${selectedPackage.credits} Créditos de Revenda` : 'Nenhum'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total a Pagar</p>
                        <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                          R$ {selectedPackage ? selectedPackage.price.toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>

                    {/* Dados do PIX do Admin */}
                    {config.pixKeyAdmin ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-primary" />
                          Chave PIX do Administrador ({config.pixKeyTypeAdmin || 'Chave'}):
                        </p>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={config.pixKeyAdmin}
                            className="w-full bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-foreground select-all"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={copyManualPixKey}
                            className="shrink-0 gap-1.5"
                          >
                            {copiedManualKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedManualKey ? 'Copiado!' : 'Copiar PIX'}
                          </Button>
                        </div>
                        {config.pixNameAdmin && (
                          <p className="text-[11px] text-muted-foreground">
                            Favorecido: <strong className="text-foreground">{config.pixNameAdmin}</strong>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>O Admin atende pedidos de atacado diretamente no WhatsApp.</span>
                      </div>
                    )}

                    {/* Instruções */}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {config.instructions || 'Após o pagamento, envie o comprovante no WhatsApp do Admin para confirmação e recarga imediata do seu estoque.'}
                    </p>

                    {/* Botão de WhatsApp */}
                    <Button
                      asChild
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 h-auto gap-2"
                    >
                      <a
                        href={getWhatsAppLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Enviar Comprovante / Solicitar no WhatsApp do Admin
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
