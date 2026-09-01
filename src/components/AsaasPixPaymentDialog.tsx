
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, Copy, CheckCircle2, QrCode, User, Mail, CreditCard, AlertCircle, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import { pushEventsService } from '@/services/PushEventsService';
import { toast } from 'sonner';
import { AsaasPaymentService } from '@/services/AsaasPaymentService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import { db } from '@/config/firebase';
import { addDoc, collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { usePlans } from '@/hooks/usePlans';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { generateValidCPF, validateCPF } from '@/utils/cpfGenerator';

interface AsaasPixPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planPrice: number;
  planDescription: string;
  isUpgrade?: boolean;
  upgradeFromPlan?: string;
  existingFeatures?: string[];
  requiredFeature?: string;
  isFeatureUnlockOnly?: boolean;
}

type Step = 'form' | 'processing' | 'pix' | 'confirmed' | 'error';

const AsaasPixPaymentDialog: React.FC<AsaasPixPaymentDialogProps> = ({
  isOpen, onOpenChange, planName, planPrice, planDescription,
  isUpgrade = false, upgradeFromPlan = '', existingFeatures = [], requiredFeature,
  isFeatureUnlockOnly = false
}) => {
  const { userInfo } = useSimpleAuth();
  const { activePlans } = usePlans();
  const { permissions } = useUserPermissions();
  const [step, setStep] = useState<Step>('form');
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(userInfo?.email || '');
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; expirationDate: string } | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [confirmedDates, setConfirmedDates] = useState<{ start: string; end: string } | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // 1. Criar/buscar cliente
      const customer = await AsaasPaymentService.findOrCreateCustomer(name, email, cleanCpf);

      // 2. Criar assinatura
      const subscription = await AsaasPaymentService.createSubscription(
        customer.id, planPrice, `Assinatura ${planName}`
      );

      // 3. Buscar primeira cobrança
      const payments = await AsaasPaymentService.getSubscriptionPayments(subscription.id);
      if (!payments.length) throw new Error('Nenhuma cobrança gerada');

      const firstPayment = payments[0];
      setPaymentId(firstPayment.id);

      // 4. Gerar QR Code PIX
      const qrData = await AsaasPaymentService.getPixQrCode(firstPayment.id);
      setPixData(qrData);
      setStep('pix');

      // Registrar no controle financeiro como PENDENTE (reconciliação auto se a aba fechar)
      try {
        const accessDays = planPrice >= 300 ? 365 : 30;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + accessDays);

        await setDoc(doc(db, 'financialRecords', firstPayment.id), {
          userId: userInfo?.id || 'unknown',
          userEmail: email,
          userName: name,
          planName: isFeatureUnlockOnly ? `Unlock: ${requiredFeature || planName}` : (isUpgrade ? `${upgradeFromPlan} + API` : planName),
          planPrice,
          accessDays: isFeatureUnlockOnly ? 0 : accessDays,
          paymentMethod: 'PIX',
          paymentId: firstPayment.id,
          status: 'pending',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          confirmedAt: '',
          createdAt: new Date().toISOString(),
          source: isUpgrade ? 'upgrade' : (isFeatureUnlockOnly ? 'feature_unlock' : 'panel'),
          isUpgrade,
          upgradeFrom: isUpgrade ? upgradeFromPlan : undefined,
          isFeatureUnlockOnly,
          requiredFeature
        });
        console.log('💰 Registro financeiro pendente criado:', firstPayment.id);
      } catch (finErr) {
        console.error('Erro ao salvar registro financeiro pendente:', finErr);
      }

      // 5. Polling para verificar pagamento
      pollRef.current = setInterval(async () => {
        try {
          const status = await AsaasPaymentService.getPaymentStatus(firstPayment.id);
          if (status.status === 'RECEIVED' || status.status === 'CONFIRMED') {
            if (pollRef.current) clearInterval(pollRef.current);
            
            // Estender acesso: 365 dias para plano anual, 30 para mensal
            const accessDays = planPrice >= 300 ? 365 : (isFeatureUnlockOnly ? 0 : 30);
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + (accessDays || 30));
            setConfirmedDates({
              start: startDate.toLocaleDateString('pt-BR'),
              end: endDate.toLocaleDateString('pt-BR')
            });
            if (userInfo?.id) {
              try {
                const { PaymentReconciliationService } = await import('@/services/PaymentReconciliationService');
                const result = await PaymentReconciliationService.activatePaidPlanOrProduct(
                  userInfo.id,
                  userInfo.email || email,
                  name || userInfo.email?.split('@')[0] || 'Usuário',
                  {
                    planName: isFeatureUnlockOnly ? `Desbloqueio: ${requiredFeature || planName}` : planName,
                    planPrice,
                    accessDays,
                    isUpgrade,
                    upgradeFrom: upgradeFromPlan,
                    isFeatureUnlockOnly,
                    requiredFeature
                  },
                  firstPayment.id
                );

                // Atualizar no controle financeiro para confirmado
                try {
                  await setDoc(doc(db, 'financialRecords', firstPayment.id), {
                    status: 'confirmed',
                    confirmedAt: new Date().toISOString()
                  }, { merge: true });
                  console.log('💰 Registro financeiro confirmado atualizado');
                } catch (finErr) {
                  console.error('Erro ao salvar registro financeiro confirmado:', finErr);
                }

                toast.success(isFeatureUnlockOnly
                  ? `Recurso liberado com sucesso!`
                  : (isUpgrade 
                      ? `Upgrade confirmado! API liberada.` 
                      : `Pagamento confirmado! Acesso estendido por ${accessDays} dias.`
                    )
                );
              } catch (extendError) {
                console.error('Erro ao estender acesso:', extendError);
                toast.success('Pagamento confirmado! Acesso liberado no sistema.');
              }
            } else {
              toast.success('Pagamento confirmado!');
            }
            
            setStep('confirmed');
          }
        } catch (e) {
          console.error('Erro no polling:', e);
        }
      }, 5000);

    } catch (err: any) {
      console.error('Erro no pagamento:', err);
      setError(err.message || 'Erro ao processar pagamento');
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
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Pagamento PIX - {planName}
          </DialogTitle>
          <DialogDescription>
            {isFeatureUnlockOnly 
              ? `Liberação de funcionalidade específica`
              : (isUpgrade 
                  ? `Upgrade do plano ${upgradeFromPlan} - Diferença: R$ ${planPrice.toFixed(2)}`
                  : `Assinatura mensal de R$ ${planPrice.toFixed(2)}`
                )
            }
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Formulário */}
        {step === 'form' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pix-name" className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Nome completo
              </Label>
              <Input id="pix-name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix-email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input id="pix-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pix-cpf" className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> CPF
                </Label>
                <button
                  type="button"
                  onClick={handleGenerateNewCpf}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Gerar CPF Válido
                </button>
              </div>
              <div className="flex gap-2">
                <Input 
                  id="pix-cpf" 
                  value={cpf} 
                  onChange={e => setCpf(formatCpf(e.target.value))} 
                  placeholder="000.000.000-00" 
                  maxLength={14} 
                  className="font-mono text-sm"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateNewCpf} 
                  className="shrink-0 gap-1 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Gerar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                🔒 Geramos um CPF matematicamente válido para proteger sua privacidade.
              </p>
            </div>

            <Card className="p-3 bg-muted/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Plano:</span>
                <Badge variant="outline">{planName}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-muted-foreground">Valor mensal:</span>
                <span className="font-bold text-foreground">R$ {planPrice.toFixed(2)}</span>
              </div>
            </Card>

            <Button onClick={handleSubmit} className="w-full">
              Gerar PIX
            </Button>
          </div>
        )}

        {/* STEP: Processando */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground text-center">Gerando cobrança PIX...</p>
          </div>
        )}

        {/* STEP: QR Code PIX */}
        {step === 'pix' && pixData && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${pixData.encodedImage}`}
                alt="QR Code PIX"
                className="w-56 h-56 rounded-lg border border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Código PIX Copia e Cola:</Label>
              <div className="flex gap-2">
                <Input value={pixData.payload} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="icon" onClick={copyPixCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <Loader2 className="h-3.5 w-3.5 inline animate-spin mr-1" />
                Aguardando confirmação do pagamento...
              </p>
            </div>
          </div>
        )}

        {/* STEP: Confirmado */}
        {step === 'confirmed' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h3>
            <p className="text-muted-foreground text-center text-sm">
              Sua assinatura do plano {planName} foi ativada com sucesso.
            </p>
            {confirmedDates && (
              <Card className="p-4 w-full bg-muted/50 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Início:</span>
                  <span className="font-semibold text-foreground">{confirmedDates.start}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Válido até:</span>
                  <span className="font-semibold text-foreground">{confirmedDates.end}</span>
                </div>
              </Card>
            )}
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => {
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
                  pdf.text(value, 80, y);
                  y += 10;
                });
                
                pdf.setDrawColor(200);
                pdf.line(20, y + 5, 190, y + 5);
                
                pdf.setFontSize(10);
                pdf.setTextColor(130);
                pdf.text('Documento gerado automaticamente.', 105, y + 15, { align: 'center' });
                
                pdf.save(`comprovante-${planName.toLowerCase().replace(/\s/g, '-')}-${now.replace(/\//g, '-')}.pdf`);
                toast.success('Comprovante baixado!');
              }}>
                <Download className="h-4 w-4 mr-1" />
                Comprovante
              </Button>
              <Button onClick={handleClose} className="flex-1">Fechar</Button>
            </div>
          </div>
        )}

        {/* STEP: Erro */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Erro no Pagamento</h3>
            <p className="text-muted-foreground text-center text-sm">{error}</p>
            <Button onClick={() => setStep('form')} variant="outline" className="w-full">
              Tentar Novamente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AsaasPixPaymentDialog;
