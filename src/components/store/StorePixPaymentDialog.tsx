import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, CheckCircle2, QrCode, User, Mail, CreditCard, AlertCircle, Sparkles, RefreshCw, ShieldCheck, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { AsaasPaymentService } from '@/services/AsaasPaymentService';
import { SourceExportService } from '@/services/SourceExportService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { generateValidCPF, validateCPF } from '@/utils/cpfGenerator';
import { db } from '@/config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';

interface StorePixPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productTitle: string;
  productPrice: number;
  productDescription: string;
  productId?: string;
  onSuccess: () => void;
}

type Step = 'processing' | 'pix' | 'confirmed' | 'error' | 'manual_edit';

export const StorePixPaymentDialog: React.FC<StorePixPaymentDialogProps> = ({
  isOpen,
  onOpenChange,
  productTitle,
  productPrice,
  productDescription,
  productId = 'source_csv_full',
  onSuccess
}) => {
  const { userInfo } = useSimpleAuth();
  const [step, setStep] = useState<Step>('processing');
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; expirationDate: string } | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTriggeredRef = useRef(false);

  // Iniciar geração automática e instantânea do PIX assim que o modal for aberto
  useEffect(() => {
    if (isOpen) {
      const userName = userInfo?.name || userInfo?.email?.split('@')[0] || 'Cliente';
      const userEmail = userInfo?.email || 'cliente@painel.com';
      const autoCpf = generateValidCPF();

      setName(userName);
      setEmail(userEmail);
      setCpf(autoCpf);

      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        handleAutoGenerate(userName, userEmail, autoCpf);
      }
    } else {
      hasTriggeredRef.current = false;
    }
  }, [isOpen, userInfo]);

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

  const handleGenerateNewCpf = () => {
    const newCpf = generateValidCPF();
    setCpf(newCpf);
    toast.success('Novo CPF válido gerado automaticamente!', { duration: 2000 });
  };

  const handleAutoGenerate = async (userName: string, userEmail: string, userCpf: string) => {
    setStep('processing');
    setError('');

    const cleanCpf = userCpf.replace(/\D/g, '');

    try {
      // 1. Criar ou localizar cliente no Asaas
      const customer = await AsaasPaymentService.findOrCreateCustomer(
        userName.trim(),
        userEmail.trim(),
        cleanCpf
      );

      // 2. Criar cobrança avulsa PIX
      const payment = await AsaasPaymentService.createOneTimePayment(
        customer.id,
        productPrice,
        `Loja: ${productTitle}`
      );

      setPaymentId(payment.id);

      // 3. Obter QR Code PIX
      const qrData = await AsaasPaymentService.getPixQrCode(payment.id);
      setPixData(qrData);
      setStep('pix');

      // 4. Registrar no Firestore como pendente
      try {
        await setDoc(doc(db, 'financialRecords', payment.id), {
          userId: userInfo?.id || 'unknown',
          userEmail: userEmail.trim().toLowerCase(),
          userName: userName.trim(),
          planName: productTitle,
          planPrice: productPrice,
          paymentMethod: 'PIX',
          paymentId: payment.id,
          status: 'pending',
          source: 'store',
          productId,
          createdAt: new Date().toISOString(),
        });
      } catch (fErr) {
        console.error('Erro ao registrar cobrança pendente:', fErr);
      }

      // 5. Polling para checar confirmação automática do PIX
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const status = await AsaasPaymentService.getPaymentStatus(payment.id);
          if (status.status === 'RECEIVED' || status.status === 'CONFIRMED') {
            if (pollRef.current) clearInterval(pollRef.current);

            // Registrar compra na Loja
            await SourceExportService.recordPurchase({
              paymentId: payment.id,
              userId: userInfo?.id || 'unknown',
              userEmail: userEmail.trim(),
              userName: userName.trim(),
              amount: productPrice,
              productId,
              productName: productTitle,
            });

            // Atualizar registro financeiro como confirmado
            try {
              await setDoc(doc(db, 'financialRecords', payment.id), {
                userId: userInfo?.id || 'unknown',
                userEmail: userEmail.trim().toLowerCase(),
                userName: userName.trim(),
                planName: productTitle,
                planPrice: productPrice,
                paymentMethod: 'PIX',
                paymentId: payment.id,
                status: 'confirmed',
                confirmedAt: new Date().toISOString(),
                source: 'store',
              }, { merge: true });
            } catch (finUpErr) {
              console.error('Erro ao atualizar registro financeiro:', finUpErr);
            }

            setStep('confirmed');
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 }
            });
            toast.success('Pagamento confirmado com sucesso! Seu acesso foi liberado.');
            onSuccess();
          }
        } catch (pollErr) {
          console.error('Erro na checagem do pagamento:', pollErr);
        }
      }, 3500);

    } catch (err: any) {
      console.error('Erro ao gerar PIX:', err);
      setError(err.message || 'Não foi possível gerar a chave PIX no momento.');
      setStep('error');
    }
  };

  const handleCopyPix = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      toast.success('Chave PIX Copia e Cola copiada para a área de transferência!');
    }
  };

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    hasTriggeredRef.current = false;
    setStep('processing');
    setPixData(null);
    setPaymentId(null);
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold">
              Pagamento Único • R$ {productPrice.toFixed(2).replace('.', ',')}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 pt-1">
            <Sparkles className="w-5 h-5 text-amber-500" />
            {productTitle}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {productDescription}
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Processando Automático */}
        {step === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
              <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-foreground">Gerando PIX Instantâneo...</h3>
              <p className="text-xs text-muted-foreground">
                Conectando ao sistema bancário e gerando QR Code oficial.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-600 bg-emerald-500/10 py-1.5 px-3 rounded-full w-fit mx-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CPF válido gerado automaticamente com privacidade</span>
            </div>
          </div>
        )}

        {/* STEP: QR Code PIX (Direto) */}
        {step === 'pix' && pixData && (
          <div className="space-y-4 py-1 text-center">
            <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-2.5 rounded-lg border border-emerald-500/20 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span className="font-medium">Aguardando confirmação do pagamento pelo banco...</span>
            </div>

            <div className="flex justify-center p-3 bg-white rounded-2xl shadow-md border max-w-[230px] mx-auto">
              <img
                src={`data:image/png;base64,${pixData.encodedImage}`}
                alt="QR Code PIX"
                className="w-52 h-52 object-contain"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-muted-foreground">Código PIX Copia e Cola:</Label>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copiar Código
                </button>
              </div>
              <div className="flex gap-2">
                <Input value={pixData.payload} readOnly className="text-xs font-mono select-all bg-muted/50" />
                <Button size="sm" onClick={handleCopyPix} className="gap-1.5 shrink-0 font-semibold">
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </Button>
              </div>
            </div>

            <div className="bg-muted/40 p-3 rounded-xl border text-xs text-left space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Vinculado à conta:</span>
                <span className="font-medium text-foreground">{email}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Liberação:</span>
                <span className="font-semibold text-emerald-600">Automática e Instantânea</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep('manual_edit')}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> Editar dados ou CPF
              </button>

              <button
                type="button"
                onClick={() => handleAutoGenerate(name, email, generateValidCPF())}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Gerar nova chave PIX
              </button>
            </div>
          </div>
        )}

        {/* STEP: Edição Manual Opcional */}
        {step === 'manual_edit' && (
          <div className="space-y-4 py-2">
            <div className="bg-muted/40 p-3 rounded-lg border text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Dados de Cobrança
              </p>
              <p>Os dados abaixo foram preenchidos automaticamente. Você pode alterá-los caso prefira.</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="store-name-edit" className="flex items-center gap-1 text-xs">
                  <User className="w-3.5 h-3.5" /> Nome Completo
                </Label>
                <Input
                  id="store-name-edit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="store-email-edit" className="flex items-center gap-1 text-xs">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <Input
                  id="store-email-edit"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="store-cpf-edit" className="flex items-center gap-1 text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> CPF
                  </Label>
                  <button
                    type="button"
                    onClick={handleGenerateNewCpf}
                    className="text-[11px] text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Gerar Novo CPF
                  </button>
                </div>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="store-cpf-edit"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    maxLength={14}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateNewCpf}
                    className="shrink-0 text-xs gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Gerar
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('pix')} 
                className="w-1/2 text-xs"
              >
                Voltar ao QR Code
              </Button>
              <Button 
                onClick={() => handleAutoGenerate(name, email, cpf)} 
                className="w-1/2 text-xs font-semibold gap-1"
              >
                <QrCode className="w-3.5 h-3.5" />
                Atualizar PIX
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Confirmado */}
        {step === 'confirmed' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Seu acesso ao produto foi liberado com sucesso.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full bg-emerald-600 hover:bg-emerald-700 font-semibold" size="lg">
              Acessar Produto Agora
            </Button>
          </div>
        )}

        {/* STEP: Erro */}
        {step === 'error' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-600">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Não foi possível gerar o PIX</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStep('manual_edit')} variant="outline" className="w-1/2">
                Ajustar Dados
              </Button>
              <Button onClick={() => handleAutoGenerate(name, email, generateValidCPF())} className="w-1/2">
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StorePixPaymentDialog;

