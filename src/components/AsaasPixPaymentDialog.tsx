
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, Copy, CheckCircle2, QrCode, User, Mail, CreditCard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AsaasPaymentService } from '@/services/AsaasPaymentService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { FirebaseUserService } from '@/services/FirebaseUserService';

interface AsaasPixPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planPrice: number;
  planDescription: string;
}

type Step = 'form' | 'processing' | 'pix' | 'confirmed' | 'error';

const AsaasPixPaymentDialog: React.FC<AsaasPixPaymentDialogProps> = ({
  isOpen, onOpenChange, planName, planPrice, planDescription
}) => {
  const { userInfo } = useSimpleAuth();
  const [step, setStep] = useState<Step>('form');
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(userInfo?.email || '');
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; expirationDate: string } | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

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

      // 5. Polling para verificar pagamento
      pollRef.current = setInterval(async () => {
        try {
          const status = await AsaasPaymentService.getPaymentStatus(firstPayment.id);
          if (status.status === 'RECEIVED' || status.status === 'CONFIRMED') {
            if (pollRef.current) clearInterval(pollRef.current);
            
            // Estender acesso: 365 dias para plano anual, 30 para mensal
            const accessDays = planPrice >= 300 ? 365 : 30;
            if (userInfo?.id) {
              try {
                await FirebaseUserService.extendUserAccess(userInfo.id, accessDays);
                console.log(`✅ Acesso estendido por ${accessDays} dias para:`, userInfo.id);
                toast.success(`Pagamento confirmado! Acesso estendido por ${accessDays} dias.`);
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
            Assinatura mensal de R$ {planPrice.toFixed(2)}
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
            <Button onClick={handleClose} className="w-full">Fechar</Button>
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
