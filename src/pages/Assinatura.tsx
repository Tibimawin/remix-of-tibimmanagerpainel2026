import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, QrCode, FileText, Check, ArrowLeft, 
  Shield, Clock, Zap, Loader2, Copy, ExternalLink, CheckCircle2
} from 'lucide-react';
import { useAssinatura } from '@/hooks/useAssinatura';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import PaymentHistory from '@/components/PaymentHistory';
import { toast } from 'sonner';

const Assinatura: React.FC = () => {
  const navigate = useNavigate();
  const { userInfo } = useSimpleAuth();
  const {
    creatingPayment,
    payment,
    pixQrCode,
    paymentConfirmed,
    createPayment,
    reset,
  } = useAssinatura();

  const [cpfCnpj, setCpfCnpj] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD' | null>(null);

  const handleCreatePayment = async () => {
    if (!selectedMethod) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }
    if (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11) {
      toast.error('Informe um CPF/CNPJ válido');
      return;
    }
    await createPayment(selectedMethod, cpfCnpj);
  };

  const copyPixCode = () => {
    if (pixQrCode?.payload) {
      navigator.clipboard.writeText(pixQrCode.payload);
      toast.success('Código PIX copiado!');
    }
  };

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-foreground">Pagamento Confirmado!</CardTitle>
            <CardDescription>
              Seu acesso foi liberado por mais 30 dias. Aproveite!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/dashboard')}>
              Ir para o Painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
            <p className="text-muted-foreground text-sm">Renove seu acesso ao painel</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Plan Card */}
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Plano Mensal</Badge>
                <Badge className="bg-primary text-primary-foreground">Recomendado</Badge>
              </div>
              <CardTitle className="text-3xl mt-4">
                R$ 30<span className="text-lg text-muted-foreground font-normal">/mês</span>
              </CardTitle>
              <CardDescription>Acesso completo por 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="mb-4" />
              <ul className="space-y-3">
                {[
                  { icon: Zap, text: 'Acesso completo ao painel' },
                  { icon: Clock, text: '30 dias de uso' },
                  { icon: Shield, text: 'Suporte prioritário' },
                  { icon: Check, text: 'Todas as funcionalidades' },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Icon className="h-4 w-4 text-primary" />
                    {text}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <div className="space-y-4">
            {!payment ? (
              <>
                {/* CPF Input */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Seus dados</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                      <Input value={userInfo?.email || ''} disabled />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">CPF/CNPJ</label>
                      <Input
                        placeholder="000.000.000-00"
                        value={cpfCnpj}
                        onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                        maxLength={18}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Forma de pagamento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { type: 'PIX' as const, icon: QrCode, label: 'PIX', desc: 'Aprovação instantânea' },
                      { type: 'BOLETO' as const, icon: FileText, label: 'Boleto', desc: 'Até 3 dias úteis' },
                      { type: 'CREDIT_CARD' as const, icon: CreditCard, label: 'Cartão de Crédito', desc: 'Aprovação imediata' },
                    ].map(({ type, icon: Icon, label, desc }) => (
                      <button
                        key={type}
                        onClick={() => setSelectedMethod(type)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          selectedMethod === type
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${selectedMethod === type ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="font-medium text-sm text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        {selectedMethod === type && <Check className="h-4 w-4 text-primary ml-auto" />}
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Button
                  className="w-full h-12 text-base"
                  onClick={handleCreatePayment}
                  disabled={creatingPayment || !selectedMethod}
                >
                  {creatingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando cobrança...
                    </>
                  ) : (
                    `Pagar R$ 30,00 via ${selectedMethod || '...'}`
                  )}
                </Button>
              </>
            ) : (
              /* Payment Created - Show details */
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pagamento gerado</CardTitle>
                  <CardDescription>
                    {payment.billingType === 'PIX'
                      ? 'Escaneie o QR Code ou copie o código para pagar'
                      : payment.billingType === 'BOLETO'
                      ? 'Acesse o link do boleto para pagar'
                      : 'Pagamento sendo processado'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* PIX QR Code */}
                  {pixQrCode && (
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded-lg flex justify-center">
                        <img
                          src={`data:image/png;base64,${pixQrCode.encodedImage}`}
                          alt="QR Code PIX"
                          className="w-48 h-48"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={pixQrCode.payload}
                          readOnly
                          className="text-xs"
                        />
                        <Button variant="outline" size="icon" onClick={copyPixCode}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Boleto Link */}
                  {payment.billingType === 'BOLETO' && payment.bankSlipUrl && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(payment.bankSlipUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Boleto
                    </Button>
                  )}

                  {/* Invoice Link */}
                  {payment.invoiceUrl && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(payment.invoiceUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Fatura
                    </Button>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aguardando confirmação do pagamento...
                  </div>

                  <Separator />

                  <Button variant="ghost" className="w-full" onClick={reset}>
                    Escolher outro método
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Payment History - full width below */}
        <div className="md:col-span-2">
          <PaymentHistory userId={userInfo?.id} />
        </div>
      </div>
    </div>
  );
};

export default Assinatura;
