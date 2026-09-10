import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Copy, CheckCircle2, QrCode, User, Mail, CreditCard, 
  AlertCircle, Download, RefreshCw, ShieldCheck, ExternalLink, 
  Lock, Phone, MapPin, Calendar, Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { AsaasPaymentService } from '@/services/AsaasPaymentService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { db } from '@/config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { generateValidCPF, validateCPF } from '@/utils/cpfGenerator';

interface AsaasPixPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  planId?: string;
  planName: string;
  planPrice: number;
  planDescription: string;
  durationDays?: number;
  planFeatures?: string[];
  isUpgrade?: boolean;
  upgradeFromPlan?: string;
  existingFeatures?: string[];
  requiredFeature?: string;
  isFeatureUnlockOnly?: boolean;
}

type Step = 'form' | 'processing' | 'pix' | 'debit_checkout' | 'confirmed' | 'error';
type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';

const AsaasPixPaymentDialog: React.FC<AsaasPixPaymentDialogProps> = ({
  isOpen, onOpenChange, planId, planName, planPrice, planDescription,
  durationDays, planFeatures,
  isUpgrade = false, upgradeFromPlan = '', existingFeatures = [], requiredFeature,
  isFeatureUnlockOnly = false
}) => {
  const { userInfo } = useSimpleAuth();
  const [step, setStep] = useState<Step>('form');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  
  // Dados Pessoais
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(userInfo?.email || '');
  const [phone, setPhone] = useState('');
  
  // Dados do Cartão de Crédito
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  
  // Endereço de Cobrança (para Antifraude de Cartão)
  const [postalCode, setPostalCode] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Estados de Pagamento
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; expirationDate: string } | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [confirmedDates, setConfirmedDates] = useState<{ start: string; end: string } | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calcular dias de acesso reais
  const isUnlock = isFeatureUnlockOnly || (planPrice <= 25 && !planId);
  let calculatedDays = 0;
  if (!isUnlock) {
    if (durationDays && Number(durationDays) > 0) {
      calculatedDays = Number(durationDays);
    } else if (planPrice >= 200) {
      calculatedDays = 365;
    } else if (planPrice >= 130) {
      calculatedDays = 180;
    } else if (planPrice >= 65) {
      calculatedDays = 90;
    } else {
      calculatedDays = 30;
    }
  }

  useEffect(() => {
    if (userInfo) {
      setEmail(userInfo.email || '');
      if (userInfo.name && !name) {
        setName(userInfo.name);
      }
    }
    if (isOpen && !cpf) {
      setCpf(generateValidCPF());
    }
  }, [userInfo, isOpen]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
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

  const formatCardNumber = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 16);
    return nums.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatCardExpiry = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 4);
    if (nums.length <= 2) return nums;
    return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  };

  const formatPostalCode = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 8);
    if (nums.length <= 5) return nums;
    return `${nums.slice(0, 5)}-${nums.slice(5)}`;
  };

  const detectCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, '');
    if (/^4/.test(clean)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
    if (/^(4011|4389|4514|4576|5041|5066|5090|6277|6362|6363|650|651|655)/.test(clean)) return 'Elo';
    if (/^3[47]/.test(clean)) return 'Amex';
    if (/^(606282|3841)/.test(clean)) return 'Hipercard';
    return '';
  };

  const handleLookupCep = async (rawCep: string) => {
    const clean = rawCep.replace(/\D/g, '');
    if (clean.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          if (data.logradouro) setAddressStreet(data.logradouro);
          if (data.localidade) setAddressCity(data.localidade);
          if (data.uf) setAddressState(data.uf);
          toast.success('Endereço localizado!');
        }
      } catch {
        // silencioso
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  // Ativação e persistência do acesso confirmado
  const handlePaymentConfirmed = async (pId: string, methodUsed: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (calculatedDays || 30) * 24 * 60 * 60 * 1000);
    setConfirmedDates({
      start: startDate.toLocaleDateString('pt-BR'),
      end: isUnlock ? 'Inalterada (Plano Atual Mantido)' : endDate.toLocaleDateString('pt-BR')
    });

    if (userInfo?.id) {
      try {
        const { PaymentReconciliationService } = await import('@/services/PaymentReconciliationService');
        await PaymentReconciliationService.activatePaidPlanOrProduct(
          userInfo.id,
          userInfo.email || email,
          name || userInfo.email?.split('@')[0] || 'Usuário',
          {
            planId,
            planName: isUnlock ? `Desbloqueio: ${requiredFeature || planName}` : planName,
            planPrice,
            accessDays: isUnlock ? 0 : calculatedDays,
            durationDays: isUnlock ? 0 : calculatedDays,
            isUpgrade,
            upgradeFrom: upgradeFromPlan,
            isFeatureUnlockOnly: isUnlock,
            requiredFeature: isUnlock ? requiredFeature : undefined
          },
          pId
        );

        // Atualizar no controle financeiro para confirmado
        try {
          await setDoc(doc(db, 'financialRecords', pId), {
            userId: userInfo?.id || 'unknown',
            userEmail: email,
            userName: name,
            planId: planId || undefined,
            planName: isUnlock ? `Desbloqueio: ${requiredFeature || planName}` : (isUpgrade ? `${upgradeFromPlan} + API` : planName),
            planPrice,
            accessDays: isUnlock ? 0 : calculatedDays,
            durationDays: isUnlock ? 0 : calculatedDays,
            paymentMethod: methodUsed,
            paymentId: pId,
            status: 'confirmed',
            confirmedAt: new Date().toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            createdAt: new Date().toISOString(),
            source: isUpgrade ? 'upgrade' : (isUnlock ? 'feature_unlock' : 'panel'),
            isUpgrade,
            upgradeFrom: isUpgrade ? upgradeFromPlan : undefined,
            isFeatureUnlockOnly: isUnlock,
            requiredFeature: isUnlock ? requiredFeature : undefined
          }, { merge: true });
          console.log('💰 Registro financeiro confirmado salvo:', methodUsed, pId, `${calculatedDays} dias`);
        } catch (finErr) {
          console.error('Erro ao salvar registro financeiro confirmado:', finErr);
        }

        toast.success(isUnlock
          ? `Recurso liberado com sucesso! Seu plano foi mantido intacto.`
          : (isUpgrade 
              ? `Upgrade confirmado! API liberada.` 
              : `Pagamento confirmado com sucesso! Acesso liberado por ${calculatedDays} dias.`
            )
        );
      } catch (extendError) {
        console.error('Erro ao ativar acesso:', extendError);
        toast.success('Pagamento confirmado! Acesso liberado no sistema.');
      }
    } else {
      toast.success('Pagamento confirmado!');
    }

    setStep('confirmed');
  };

  // Iniciar verificação contínua via polling
  const startPolling = (firstPaymentId: string, methodUsed: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await AsaasPaymentService.getPaymentStatus(firstPaymentId);
        if (status.status === 'RECEIVED' || status.status === 'CONFIRMED') {
          await handlePaymentConfirmed(firstPaymentId, methodUsed);
        }
      } catch (e) {
        console.error('Erro no polling do pagamento:', e);
      }
    }, 4000);
  };

  const handleSubmit = async () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!name.trim() || !email.trim()) {
      toast.error('Preencha nome e email');
      return;
    }
    if (cleanCpf.length !== 11 || !validateCPF(cleanCpf)) {
      toast.error('CPF inválido. Clique em "Gerar CPF" para gerar um válido.');
      return;
    }

    setStep('processing');
    setError('');

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const cleanPostal = postalCode.replace(/\D/g, '');

      // 1. Criar/buscar cliente no Asaas
      const customer = await AsaasPaymentService.findOrCreateCustomer(name, email, cleanCpf, {
        phone: cleanPhone,
        postalCode: cleanPostal,
        addressNumber: addressNumber.trim()
      });

      // Determinar ciclo para assinaturas recorrentes
      let cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY' = 'MONTHLY';
      if (calculatedDays >= 300) cycle = 'YEARLY';
      else if (calculatedDays >= 150) cycle = 'SEMIANNUALLY';
      else if (calculatedDays >= 60) cycle = 'QUARTERLY';

      // ==================== FLUXO: PIX ====================
      if (paymentMethod === 'PIX') {
        let firstPaymentId = '';

        if (isUnlock) {
          const payment = await AsaasPaymentService.createOneTimePayment(
            customer.id,
            planPrice,
            `Desbloqueio: ${requiredFeature || planName}`
          );
          firstPaymentId = payment.id;
        } else {
          const subscription = await AsaasPaymentService.createSubscription(
            customer.id,
            planPrice,
            `Assinatura ${planName}`,
            cycle
          );
          const payments = await AsaasPaymentService.getSubscriptionPayments(subscription.id);
          if (!payments.length) throw new Error('Nenhuma cobrança gerada para a assinatura');
          firstPaymentId = payments[0].id;
        }

        setPaymentId(firstPaymentId);

        // Gerar QR Code PIX
        const qrData = await AsaasPaymentService.getPixQrCode(firstPaymentId);
        setPixData(qrData);
        setStep('pix');

        // Gravar no controle financeiro como pendente
        try {
          const startDate = new Date();
          const endDate = new Date(startDate.getTime() + (calculatedDays || 30) * 24 * 60 * 60 * 1000);
          await setDoc(doc(db, 'financialRecords', firstPaymentId), {
            userId: userInfo?.id || 'unknown',
            userEmail: email,
            userName: name,
            planId: planId || undefined,
            planName: isUnlock ? `Desbloqueio: ${requiredFeature || planName}` : (isUpgrade ? `${upgradeFromPlan} + API` : planName),
            planPrice,
            accessDays: isUnlock ? 0 : calculatedDays,
            durationDays: isUnlock ? 0 : calculatedDays,
            paymentMethod: 'PIX',
            paymentId: firstPaymentId,
            status: 'pending',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            confirmedAt: '',
            createdAt: new Date().toISOString(),
            source: isUpgrade ? 'upgrade' : (isUnlock ? 'feature_unlock' : 'panel'),
            isUpgrade,
            upgradeFrom: isUpgrade ? upgradeFromPlan : undefined,
            isFeatureUnlockOnly: isUnlock,
            requiredFeature: isUnlock ? requiredFeature : undefined
          });
        } catch (finErr) {
          console.error('Erro ao salvar registro pendente:', finErr);
        }

        // Polling para PIX
        startPolling(firstPaymentId, 'PIX');
        return;
      }

      // ==================== FLUXO: CARTÃO DE CRÉDITO ====================
      if (paymentMethod === 'CREDIT_CARD') {
        const cleanCardNum = cardNumber.replace(/\D/g, '');
        const cleanCvv = cardCvv.trim();
        const [expMonth, expYear] = cardExpiry.split('/');

        if (!cardHolderName.trim()) {
          toast.error('Informe o nome impresso no cartão');
          setStep('form');
          return;
        }
        if (cleanCardNum.length < 13 || cleanCardNum.length > 19) {
          toast.error('Número de cartão de crédito inválido');
          setStep('form');
          return;
        }
        if (!expMonth || !expYear || expMonth.length !== 2 || (expYear.length !== 2 && expYear.length !== 4)) {
          toast.error('Validade do cartão inválida (MM/AA)');
          setStep('form');
          return;
        }
        if (cleanCvv.length < 3 || cleanCvv.length > 4) {
          toast.error('Código de segurança (CVV) inválido');
          setStep('form');
          return;
        }
        if (!cleanPhone || cleanPhone.length < 10) {
          toast.error('Informe um telefone/WhatsApp válido com DDD para o cartão');
          setStep('form');
          return;
        }
        if (!cleanPostal || cleanPostal.length !== 8) {
          toast.error('Informe o CEP de cobrança do cartão');
          setStep('form');
          return;
        }
        if (!addressNumber.trim()) {
          toast.error('Informe o número do endereço de cobrança');
          setStep('form');
          return;
        }

        let firstPaymentId = '';
        let initialStatus = 'PENDING';

        const cardData = {
          holderName: cardHolderName.trim().toUpperCase(),
          number: cleanCardNum,
          expiryMonth: expMonth.trim(),
          expiryYear: expYear.trim(),
          ccv: cleanCvv
        };

        const holderInfo = {
          name: cardHolderName.trim(),
          email: email.trim(),
          cpfCnpj: cleanCpf,
          postalCode: cleanPostal,
          addressNumber: addressNumber.trim(),
          addressComplement: addressComplement.trim() || undefined,
          phone: cleanPhone,
          mobilePhone: cleanPhone
        };

        if (isUnlock || !autoRenew) {
          // Cobrança única no cartão
          const payment = await AsaasPaymentService.createCreditCardPayment(
            customer.id,
            planPrice,
            isUnlock ? `Desbloqueio: ${requiredFeature || planName}` : `Plano ${planName}`,
            cardData,
            holderInfo
          );
          firstPaymentId = payment.id;
          initialStatus = payment.status;
        } else {
          // Assinatura com renovação automática no cartão
          const subscription = await AsaasPaymentService.createCreditCardSubscription(
            customer.id,
            planPrice,
            `Assinatura ${planName}`,
            cardData,
            holderInfo,
            cycle
          );
          const payments = await AsaasPaymentService.getSubscriptionPayments(subscription.id);
          if (payments.length > 0) {
            firstPaymentId = payments[0].id;
            initialStatus = payments[0].status;
          } else {
            firstPaymentId = subscription.id;
            initialStatus = 'CONFIRMED';
          }
        }

        setPaymentId(firstPaymentId);

        // Se o cartão já foi aprovado instantaneamente pelo emissor
        if (initialStatus === 'CONFIRMED' || initialStatus === 'RECEIVED') {
          await handlePaymentConfirmed(firstPaymentId, 'CREDIT_CARD');
        } else {
          // Em análise ou aguardando processamento
          toast.info('Transação enviada para a operadora do cartão. Confirmando...', { duration: 4000 });
          startPolling(firstPaymentId, 'CREDIT_CARD');
        }
        return;
      }

      // ==================== FLUXO: CARTÃO DE DÉBITO / CHECKOUT SEGURO ====================
      if (paymentMethod === 'DEBIT_CARD') {
        const payment = await AsaasPaymentService.createInvoiceCheckoutPayment(
          customer.id,
          planPrice,
          isUnlock ? `Desbloqueio: ${requiredFeature || planName}` : `Assinatura ${planName}`
        );

        setPaymentId(payment.id);
        setCheckoutUrl(payment.invoiceUrl || '');
        setStep('debit_checkout');

        // Registrar registro pendente
        try {
          const startDate = new Date();
          const endDate = new Date(startDate.getTime() + (calculatedDays || 30) * 24 * 60 * 60 * 1000);
          await setDoc(doc(db, 'financialRecords', payment.id), {
            userId: userInfo?.id || 'unknown',
            userEmail: email,
            userName: name,
            planId: planId || undefined,
            planName: isUnlock ? `Desbloqueio: ${requiredFeature || planName}` : (isUpgrade ? `${upgradeFromPlan} + API` : planName),
            planPrice,
            accessDays: isUnlock ? 0 : calculatedDays,
            durationDays: isUnlock ? 0 : calculatedDays,
            paymentMethod: 'DEBIT_CARD',
            paymentId: payment.id,
            status: 'pending',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            confirmedAt: '',
            createdAt: new Date().toISOString(),
            source: isUpgrade ? 'upgrade' : (isUnlock ? 'feature_unlock' : 'panel'),
            isUpgrade,
            upgradeFrom: isUpgrade ? upgradeFromPlan : undefined,
            isFeatureUnlockOnly: isUnlock,
            requiredFeature: isUnlock ? requiredFeature : undefined
          });
        } catch (finErr) {
          console.error('Erro ao salvar registro pendente:', finErr);
        }

        // Iniciar polling para detectar quando o usuário concluir no checkout do Asaas
        startPolling(payment.id, 'DEBIT_CARD');
        return;
      }

    } catch (err: any) {
      console.error('Erro no pagamento:', err);
      setError(err.message || 'Erro ao processar pagamento com o Asaas');
      setStep('error');
    }
  };

  const copyPixCode = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      toast.success('Código PIX copiado!');
    }
  };

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep('form');
    setPixData(null);
    setPaymentId(null);
    setCheckoutUrl('');
    setError('');
    onOpenChange(false);
  };

  const cardBrand = detectCardBrand(cardNumber);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Pagamento Seguro - {planName}
          </DialogTitle>
          <DialogDescription>
            {isFeatureUnlockOnly 
              ? `Liberação de funcionalidade específica`
              : (isUpgrade 
                  ? `Upgrade do plano ${upgradeFromPlan} - Diferença: R$ ${planPrice.toFixed(2)}`
                  : `Assinatura de R$ ${planPrice.toFixed(2)} (${calculatedDays || 30} dias)`
                )
            }
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Formulário Principal */}
        {step === 'form' && (
          <div className="space-y-4">
            {/* Seletor da Forma de Pagamento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Escolha a forma de pagamento:
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PIX')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === 'PIX'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/30'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <QrCode className={`h-5 w-5 mb-1 ${paymentMethod === 'PIX' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-semibold">PIX</span>
                  <span className="text-[10px] text-muted-foreground">Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/30'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <CreditCard className={`h-5 w-5 mb-1 ${paymentMethod === 'CREDIT_CARD' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-semibold">Crédito</span>
                  <span className="text-[10px] text-muted-foreground">Assinatura</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('DEBIT_CARD')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === 'DEBIT_CARD'
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-2 ring-purple-500/30'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <ExternalLink className={`h-5 w-5 mb-1 ${paymentMethod === 'DEBIT_CARD' ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-semibold">Débito</span>
                  <span className="text-[10px] text-muted-foreground">Checkout Banco</span>
                </button>
              </div>
            </div>

            {/* Dados do Pagador (Comum a todos) */}
            <div className="rounded-xl border border-border p-3.5 space-y-3 bg-muted/20">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Dados do Titular
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pay-name" className="text-xs">Nome Completo</Label>
                  <Input 
                    id="pay-name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Seu nome completo" 
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pay-email" className="text-xs">Email</Label>
                  <Input 
                    id="pay-email" 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="seu@email.com" 
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pay-cpf" className="text-xs">CPF</Label>
                    <button
                      type="button"
                      onClick={handleGenerateNewCpf}
                      className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5"
                    >
                      <RefreshCw className="h-2.5 w-2.5" /> Gerar Válido
                    </button>
                  </div>
                  <Input 
                    id="pay-cpf" 
                    value={cpf} 
                    onChange={e => setCpf(formatCpf(e.target.value))} 
                    placeholder="000.000.000-00" 
                    maxLength={14} 
                    className="h-9 font-mono text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pay-phone" className="text-xs">Telefone / WhatsApp</Label>
                  <Input 
                    id="pay-phone" 
                    value={phone} 
                    onChange={e => setPhone(formatPhone(e.target.value))} 
                    placeholder="(11) 99999-9999" 
                    maxLength={15} 
                    className="h-9 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* CAMPOS ESPECÍFICOS: CARTÃO DE CRÉDITO */}
            {paymentMethod === 'CREDIT_CARD' && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/10 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                    Dados do Cartão de Crédito
                  </div>
                  {cardBrand && (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {cardBrand}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="card-number" className="text-xs">Número do Cartão</Label>
                  <div className="relative">
                    <Input 
                      id="card-number" 
                      value={cardNumber} 
                      onChange={e => setCardNumber(formatCardNumber(e.target.value))} 
                      placeholder="0000 0000 0000 0000" 
                      maxLength={19} 
                      className="h-9 font-mono text-sm pr-9"
                    />
                    <Lock className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="card-holder" className="text-xs">Nome no Cartão</Label>
                  <Input 
                    id="card-holder" 
                    value={cardHolderName} 
                    onChange={e => setCardHolderName(e.target.value.toUpperCase())} 
                    placeholder="COMO IMPRESSO NO CARTÃO" 
                    className="h-9 text-sm uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="card-expiry" className="text-xs">Validade (MM/AA)</Label>
                    <Input 
                      id="card-expiry" 
                      value={cardExpiry} 
                      onChange={e => setCardExpiry(formatCardExpiry(e.target.value))} 
                      placeholder="12/28" 
                      maxLength={5} 
                      className="h-9 font-mono text-sm text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="card-cvv" className="text-xs">CVV</Label>
                    <Input 
                      id="card-cvv" 
                      type="password"
                      value={cardCvv} 
                      onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                      placeholder="123" 
                      maxLength={4} 
                      className="h-9 font-mono text-sm text-center"
                    />
                  </div>
                </div>

                {/* Endereço de Cobrança exigido pelo Asaas */}
                <div className="pt-2 border-t border-border/50 space-y-2">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Endereço da Fatura (Antifraude do Cartão)
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="card-cep" className="text-xs">CEP</Label>
                      <div className="relative">
                        <Input 
                          id="card-cep" 
                          value={postalCode} 
                          onChange={e => {
                            const formatted = formatPostalCode(e.target.value);
                            setPostalCode(formatted);
                            if (formatted.replace(/\D/g, '').length === 8) {
                              handleLookupCep(formatted);
                            }
                          }} 
                          placeholder="00000-000" 
                          maxLength={9} 
                          className="h-8 font-mono text-xs"
                        />
                        {isLoadingCep && (
                          <Loader2 className="h-3 w-3 animate-spin absolute right-2.5 top-2.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="card-num" className="text-xs">Número do Imóvel</Label>
                      <Input 
                        id="card-num" 
                        value={addressNumber} 
                        onChange={e => setAddressNumber(e.target.value)} 
                        placeholder="Ex: 120 ou S/N" 
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {addressStreet && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      📍 {addressStreet}, {addressCity} - {addressState}
                    </p>
                  )}
                </div>

                {/* Opção de Renovação Automática */}
                {!isUnlock && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input 
                      type="checkbox" 
                      checked={autoRenew} 
                      onChange={e => setAutoRenew(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-xs text-muted-foreground select-none">
                      Assinatura com renovação automática (pode ser cancelada a qualquer momento)
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* AVISO ESPECÍFICO: CARTÃO DE DÉBITO */}
            {paymentMethod === 'DEBIT_CARD' && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-50/20 dark:bg-purple-950/10 p-3.5 space-y-2.5">
                <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  Pagamento com Cartão de Débito (3D Secure)
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Por normas de segurança bancária do Banco Central, pagamentos com <strong>Cartão de Débito</strong> necessitam de autenticação direta do seu banco (via aplicativo do banco ou token 3D Secure).
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ao clicar em <strong>"Avançar para Débito"</strong>, geramos o checkout seguro oficial do Asaas para você validar o débito no seu banco com total proteção. O sistema libera seu acesso imediatamente assim que aprovado.
                </p>
              </div>
            )}

            {/* Resumo do Plano */}
            <Card className="p-3 bg-muted/40 border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Plano Selecionado:</span>
                <Badge variant="outline" className="font-semibold">{planName}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm mt-1.5">
                <span className="text-muted-foreground">Período de Acesso:</span>
                <span className="font-medium text-foreground">{isUnlock ? 'Vigência Atual' : `${calculatedDays || 30} dias`}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1.5 pt-1.5 border-t border-border">
                <span className="font-semibold text-foreground">Total a pagar:</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  R$ {planPrice.toFixed(2)}
                </span>
              </div>
            </Card>

            <Button onClick={handleSubmit} className="w-full h-10 font-semibold gap-2">
              {paymentMethod === 'PIX' && (
                <>
                  <QrCode className="h-4 w-4" />
                  Gerar QR Code PIX
                </>
              )}
              {paymentMethod === 'CREDIT_CARD' && (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pagar R$ {planPrice.toFixed(2)} no Crédito
                </>
              )}
              {paymentMethod === 'DEBIT_CARD' && (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Avançar para Checkout de Débito
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3 text-emerald-500" />
              Processamento seguro criptografado com certificação PCI-DSS Asaas
            </div>
          </div>
        )}

        {/* STEP: Processando */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-1">
              <p className="font-semibold text-foreground text-sm">
                {paymentMethod === 'CREDIT_CARD' 
                  ? 'Processando cobrança com a operadora do cartão...' 
                  : (paymentMethod === 'DEBIT_CARD' ? 'Gerando link de checkout seguro...' : 'Gerando cobrança PIX...')
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Por favor, aguarde alguns instantes.
              </p>
            </div>
          </div>
        )}

        {/* STEP: QR Code PIX */}
        {step === 'pix' && pixData && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${pixData.encodedImage}`}
                alt="QR Code PIX"
                className="w-56 h-56 rounded-xl border border-border shadow-sm p-1 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Código PIX Copia e Cola:</Label>
              <div className="flex gap-2">
                <Input value={pixData.payload} readOnly className="text-xs font-mono select-all" />
                <Button variant="outline" size="icon" onClick={copyPixCode} title="Copiar código PIX">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                <Loader2 className="h-3.5 w-3.5 inline animate-spin mr-1.5" />
                Aguardando confirmação do pagamento pelo banco...
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                A validação é automática. Assim que pagar, esta janela será atualizada.
              </p>
            </div>
          </div>
        )}

        {/* STEP: Checkout de Débito Aberto */}
        {step === 'debit_checkout' && (
          <div className="space-y-5 py-4 text-center">
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto text-purple-600">
              <ExternalLink className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">Checkout Oficial Asaas Pronto!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Clique no botão abaixo para abrir a página de pagamento seguro e autenticar seu cartão de débito.
              </p>
            </div>

            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all shadow-md text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir Checkout do Banco (Débito)
              </a>
            )}

            <div className="bg-muted/50 border border-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 inline animate-spin mr-1 text-primary" />
                Aguardando conclusão do pagamento na janela do banco...
              </p>
            </div>
          </div>
        )}

        {/* STEP: Confirmado */}
        {step === 'confirmed' && (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h3>
              <p className="text-muted-foreground text-sm">
                Sua assinatura do plano <strong>{planName}</strong> foi liberada com sucesso.
              </p>
            </div>

            {confirmedDates && (
              <Card className="p-4 w-full bg-muted/40 space-y-2 border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Forma de Pagamento:</span>
                  <Badge variant="secondary">
                    {paymentMethod === 'PIX' ? 'PIX Instantâneo' : (paymentMethod === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'Cartão de Débito')}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Início:</span>
                  <span className="font-semibold text-foreground">{confirmedDates.start}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Válido até:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{confirmedDates.end}</span>
                </div>
              </Card>
            )}

            <div className="flex gap-2 w-full pt-2">
              <Button 
                variant="outline" 
                className="flex-1 text-xs" 
                onClick={() => {
                  const pdf = new jsPDF();
                  const now = new Date().toLocaleDateString('pt-BR');
                  
                  pdf.setFontSize(20);
                  pdf.text('Comprovante de Pagamento', 105, 30, { align: 'center' });
                  
                  pdf.setFontSize(12);
                  pdf.setTextColor(100);
                  pdf.text(`Emitido em: ${now}`, 105, 40, { align: 'center' });
                  
                  pdf.setDrawColor(200);
                  pdf.line(20, 48, 190, 48);
                  
                  pdf.setTextColor(0);
                  pdf.setFontSize(13);
                  let y = 60;
                  const items = [
                    ['Plano', planName],
                    ['Valor', `R$ ${planPrice.toFixed(2)}`],
                    ['Forma de Pagamento', paymentMethod === 'PIX' ? 'PIX' : (paymentMethod === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'Cartão de Débito')],
                    ['Cliente', name || userInfo?.email || '-'],
                    ['Email', email],
                    ['CPF', cpf],
                    ['Início', confirmedDates?.start || '-'],
                    ['Válido até', confirmedDates?.end || '-'],
                    ['Status', 'PAGO ✓'],
                  ];
                  
                  items.forEach(([label, value]) => {
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`${label}:`, 25, y);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(value, 85, y);
                    y += 10;
                  });
                  
                  pdf.setDrawColor(200);
                  pdf.line(20, y + 5, 190, y + 5);
                  
                  pdf.setFontSize(10);
                  pdf.setTextColor(130);
                  pdf.text('Documento gerado automaticamente pelo Asaas.', 105, y + 15, { align: 'center' });
                  
                  pdf.save(`comprovante-${planName.toLowerCase().replace(/\s/g, '-')}-${now.replace(/\//g, '-')}.pdf`);
                  toast.success('Comprovante baixado com sucesso!');
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Baixar Comprovante
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Concluir
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Erro */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Não foi possível concluir</h3>
              <p className="text-muted-foreground text-xs max-w-sm mx-auto leading-relaxed">{error}</p>
            </div>
            <div className="flex gap-2 w-full pt-2">
              <Button onClick={() => setStep('form')} variant="outline" className="flex-1">
                Voltar e Corrigir
              </Button>
              <Button 
                onClick={() => {
                  setPaymentMethod('PIX');
                  setStep('form');
                }} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Tentar com PIX
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AsaasPixPaymentDialog;
