
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock, Crown, Sparkles, CreditCard, RefreshCw } from 'lucide-react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { usePlans } from '@/hooks/usePlans';
import { Plan } from '@/types/planTypes';
import { toast } from 'sonner';
import AsaasPixPaymentDialog from '@/components/AsaasPixPaymentDialog';
import { PaymentReconciliationService } from '@/services/PaymentReconciliationService';

interface AccessExpiredMessageProps {
  expiryDate?: string;
}

const AccessExpiredMessage: React.FC<AccessExpiredMessageProps> = ({ expiryDate }) => {
  const { userInfo, logout } = useSimpleAuth();
  const { activePlans, loading } = usePlans();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPixDialog, setShowPixDialog] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSelectPlan = (plan: Plan) => {
    const price = parseFloat(plan.price.replace(/[^\d,]/g, '').replace(',', '.'));
    setSelectedPlan(plan);
    setShowPixDialog(true);
  };

  const parsePrice = (priceStr: string): number => {
    return parseFloat(priceStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  };

  const handleVerifyPayment = async () => {
    if (!userInfo?.id || !userInfo?.email) {
      toast.error('Identificação de usuário não encontrada. Faça login novamente.');
      return;
    }
    setIsVerifying(true);
    toast.loading('Consultando pagamentos no Asaas...', { id: 'verif-pay' });
    try {
      const res = await PaymentReconciliationService.reconcileUserPayments(userInfo.id, userInfo.email, userInfo.name);
      if (res.reconciled) {
        toast.success(res.message, { id: 'verif-pay' });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.info(res.message, { id: 'verif-pay' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao consultar pagamento', { id: 'verif-pay' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Banner informativo */}
        <Alert className="border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <AlertDescription className="text-foreground">
                <p className="font-semibold text-sm">💳 Renove diretamente pelo painel!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escolha um plano abaixo e pague via PIX de forma rápida e segura.
                </p>
              </AlertDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyPayment}
              disabled={isVerifying}
              className="shrink-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              Já Paguei? Ativar
            </Button>
          </div>
        </Alert>
        {/* Header Card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl text-foreground">Seu acesso expirou</CardTitle>
            <CardDescription>
              Renove agora via PIX para continuar usando o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expiryDate && (
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Expirado em: {new Date(expiryDate).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planos */}
        {loading ? (
          <div className="text-center text-muted-foreground text-sm">Carregando planos...</div>
        ) : (
          <div className={`grid grid-cols-1 ${activePlans.length >= 2 ? 'md:grid-cols-2' : ''} gap-4`}>
            {activePlans.map((plan, index) => {
              const price = parsePrice(plan.price);
              const isAnnual = price >= 300;
              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg border-2 ${
                    isAnnual ? 'border-primary' : 'border-border'
                  }`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isAnnual && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Melhor oferta
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Crown className={`h-5 w-5 ${isAnnual ? 'text-primary' : 'text-muted-foreground'}`} />
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold text-foreground">{plan.price}</div>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <li key={i}>✓ {f}</li>
                        ))}
                      </ul>
                    )}
                    <Button className="w-full" variant={isAnnual ? 'default' : 'outline'}>
                      Assinar via PIX
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activePlans.length === 0 && !loading && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground text-sm">Nenhum plano disponível no momento. Entre em contato com o suporte.</p>
          </Card>
        )}

        {/* Ações */}
        <div className="flex space-x-2">
          <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
            Verificar Novamente
          </Button>
          <Button variant="default" className="flex-1" onClick={logout}>
            Sair
          </Button>
        </div>
      </div>

      {/* Dialog PIX */}
      {selectedPlan && (
        <AsaasPixPaymentDialog
          isOpen={showPixDialog}
          onOpenChange={setShowPixDialog}
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          planPrice={parsePrice(selectedPlan.price)}
          planDescription={selectedPlan.description || ''}
          durationDays={selectedPlan.durationDays}
          planFeatures={selectedPlan.features}
        />
      )}
    </div>
  );
};

export default AccessExpiredMessage;
