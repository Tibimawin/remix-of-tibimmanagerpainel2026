
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, Copy, CheckCircle2, QrCode, User, Mail, CreditCard, AlertCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { pushEventsService } from '@/services/PushEventsService';
import { toast } from 'sonner';
import { AsaasPaymentService } from '@/services/AsaasPaymentService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import { db } from '@/config/firebase';
import { addDoc, collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { usePlans } from '@/hooks/usePlans';

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
}

type Step = 'form' | 'processing' | 'pix' | 'confirmed' | 'error';

const AsaasPixPaymentDialog: React.FC<AsaasPixPaymentDialogProps> = ({
  isOpen, onOpenChange, planName, planPrice, planDescription,
  isUpgrade = false, upgradeFromPlan = '', existingFeatures = [], requiredFeature
}) => {
  const { userInfo } = useSimpleAuth();
  const { activePlans } = usePlans();
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
    }
  }, [userInfo]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const formatCpf = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  };

  const handleSubmit = async () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!name.trim() || !email.trim() || cleanCpf.length !== 11) {
      toast.error('Preencha todos os campos corretamente');
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
          planName: isUpgrade ? `${upgradeFromPlan} + API` : planName,
          planPrice,
          accessDays,
          paymentMethod: 'PIX',
          paymentId: firstPayment.id,
          status: 'pending',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          confirmedAt: '',
          createdAt: new Date().toISOString(),
          source: isUpgrade ? 'upgrade' : 'panel',
          isUpgrade,
          upgradeFrom: isUpgrade ? upgradeFromPlan : undefined
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
            const accessDays = planPrice >= 300 ? 365 : 30;
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + accessDays);
            setConfirmedDates({
              start: startDate.toLocaleDateString('pt-BR'),
              end: endDate.toLocaleDateString('pt-BR')
            });
            if (userInfo?.id) {
              try {
                await FirebaseUserService.extendUserAccess(userInfo.id, accessDays);
                console.log(`✅ Acesso estendido por ${accessDays} dias para:`, userInfo.id);
                
                // 🔓 Auto-liberar permissões baseado no plano assinado
                try {
                  // Tenta achar o plano exato; se não encontrar, faz fallback para
                  // o plano "Empresa" / mais completo (importação ilimitada).
                  const normalize = (s: string) => (s || '').toLowerCase().trim();
                  const fallbackPlan =
                    activePlans.find(p => normalize(p.name).includes('empresa')) ||
                    activePlans.find(p => p.monthlyContentLimit === -1) ||
                    [...activePlans].sort((a, b) => (b.features?.length || 0) - (a.features?.length || 0))[0];
                  const matchedPlan =
                    activePlans.find(p => normalize(p.name) === normalize(planName)) || fallbackPlan;
                  
                  if (isUpgrade) {
                    // UPGRADE: mesclar features existentes com a nova feature (minha-api)
                    const apiPlanFeatures = matchedPlan?.features || ['minha-api'];
                    const mergedFeatures = [...new Set([...existingFeatures, ...apiPlanFeatures, 'planos', 'minha-api'])];
                    const combinedPlanName = `${upgradeFromPlan} + API`;
                    
                    await setDoc(doc(db, 'userPermissions', userInfo.id), {
                      userId: userInfo.id,
                      userEmail: userInfo.email,
                      userName: name || userInfo.email?.split('@')[0] || 'Usuário',
                      planId: matchedPlan?.id || 'upgrade-api',
                      planName: combinedPlanName,
                      monthlyContentLimit: matchedPlan?.monthlyContentLimit || 999,
                      enabledFeatures: mergedFeatures,
                      currentMonthUsage: 0,
                      lastUpdated: new Date().toISOString(),
                      expiryDate: endDate.toISOString(),
                      isActive: true
                    });
                    console.log('🔓 Upgrade realizado! Features mescladas:', mergedFeatures.length);
                    
                    try {
                      await addDoc(collection(db, 'autoPermissionLogs'), {
                        userId: userInfo.id,
                        userEmail: email,
                        userName: name || userInfo.email?.split('@')[0] || 'Usuário',
                        planName: combinedPlanName,
                        planId: matchedPlan?.id || 'upgrade-api',
                        featuresCount: mergedFeatures.length,
                        features: mergedFeatures,
                        grantedAt: new Date().toISOString(),
                        source: 'payment-upgrade',
                        upgradeFrom: upgradeFromPlan,
                        previousFeatures: existingFeatures
                      });
                    } catch (logErr) {
                      console.error('Erro ao salvar log de upgrade:', logErr);
                    }
                  } else if (matchedPlan) {
                    const endDate2 = new Date();
                    endDate2.setDate(endDate2.getDate() + accessDays);
                    
                    // Garante que a feature solicitada (ex.: importacao-automatica)
                    // e o acesso a "planos" estejam sempre incluídos.
                    const baseFeatures = Array.isArray(matchedPlan.features) ? matchedPlan.features : [];
                    const featuresWithPlanos = Array.from(new Set([
                      ...baseFeatures,
                      'planos',
                      ...(requiredFeature ? [requiredFeature] : []),
                    ]));

                    await setDoc(doc(db, 'userPermissions', userInfo.id), {
                      userId: userInfo.id,
                      userEmail: userInfo.email,
                      userName: name || userInfo.email?.split('@')[0] || 'Usuário',
                      planId: matchedPlan.id,
                      planName: matchedPlan.name,
                      monthlyContentLimit: matchedPlan.monthlyContentLimit ?? -1,
                      enabledFeatures: featuresWithPlanos,
                      currentMonthUsage: 0,
                      lastUpdated: new Date().toISOString(),
                      expiryDate: endDate2.toISOString(),
                      isActive: true
                    });
                    console.log('🔓 Permissões liberadas automaticamente:', matchedPlan.features.length, 'features');
                    
                    // Salvar log de permissões auto-liberadas
                    try {
                      await addDoc(collection(db, 'autoPermissionLogs'), {
                        userId: userInfo.id,
                        userEmail: email,
                        userName: name || userInfo.email?.split('@')[0] || 'Usuário',
                        planName: matchedPlan.name,
                        planId: matchedPlan.id,
                        featuresCount: featuresWithPlanos.length,
                        features: featuresWithPlanos,
                        grantedAt: new Date().toISOString(),
                        source: 'payment-auto'
                      });
                    } catch (logErr) {
                      console.error('Erro ao salvar log de permissões:', logErr);
                    }
                  } else {
                    // Fallback final: nenhum plano cadastrado. Cria uma permissão
                    // "Empresa" sintética com importação ilimitada para não bloquear o usuário.
                    const endDate3 = new Date();
                    endDate3.setDate(endDate3.getDate() + accessDays);
                    const syntheticFeatures = Array.from(new Set([
                      'dashboard','conteudos','episodios','categorias','banners',
                      'duplicados','duplicados-episodios','importacao-automatica','automacao',
                      'substituicao-urls','importar-m3u','adicionar-conteudo','usuarios',
                      'sessoes','plataformas','produtos','estatisticas','relatorios-visualizacao',
                      'recursos','clean-data','maxplus-import','precos-interno','configuracoes',
                      'perfil','suporte-ao-vivo','priority-support','export','logs','planos',
                      ...(requiredFeature ? [requiredFeature] : []),
                    ]));
                    await setDoc(doc(db, 'userPermissions', userInfo.id), {
                      userId: userInfo.id,
                      userEmail: userInfo.email,
                      userName: name || userInfo.email?.split('@')[0] || 'Usuário',
                      planId: 'empresa-auto',
                      planName: 'Empresa',
                      monthlyContentLimit: -1,
                      enabledFeatures: syntheticFeatures,
                      currentMonthUsage: 0,
                      lastUpdated: new Date().toISOString(),
                      expiryDate: endDate3.toISOString(),
                      isActive: true
                    });
                    console.log('🔓 Permissão Empresa sintética concedida (fallback).');
                  }
                } catch (permErr) {
                  console.error('Erro ao liberar permissões:', permErr);
                }
                
                toast.success(isUpgrade 
                  ? `Upgrade confirmado! API liberada.` 
                  : `Pagamento confirmado! Acesso estendido por ${accessDays} dias.`
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

                // Push real de pagamento confirmado
                try {
                  await pushEventsService.notifyPaymentConfirmed({
                    paymentId: firstPayment.id,
                    accessDays,
                  });
                } catch (finErr) {
                  console.error('Erro ao salvar registro financeiro confirmado:', finErr);
                }
              } catch (extendError) {
                console.error('Erro ao estender acesso:', extendError);
                toast.success('Pagamento confirmado! Entre em contato com o suporte para ativar seu acesso.');
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
            {isUpgrade 
              ? `Upgrade do plano ${upgradeFromPlan} - Diferença: R$ ${planPrice.toFixed(2)}`
              : `Assinatura mensal de R$ ${planPrice.toFixed(2)}`
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
              <Label htmlFor="pix-cpf" className="flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" /> CPF
              </Label>
              <Input id="pix-cpf" value={cpf} onChange={e => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
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
