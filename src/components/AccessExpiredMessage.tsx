
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Crown, Sparkles } from 'lucide-react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { usePlans } from '@/hooks/usePlans';
import { Plan } from '@/types/planTypes';
import AsaasPixPaymentDialog from '@/components/AsaasPixPaymentDialog';

interface AccessExpiredMessageProps {
  expiryDate?: string;
}

const AccessExpiredMessage: React.FC<AccessExpiredMessageProps> = ({ expiryDate }) => {
  const { logout } = useSimpleAuth();
  const { activePlans, loading } = usePlans();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPixDialog, setShowPixDialog] = useState(false);

  const handleSelectPlan = (plan: Plan) => {
    const price = parseFloat(plan.price.replace(/[^\d,]/g, '').replace(',', '.'));
    setSelectedPlan(plan);
    setShowPixDialog(true);
  };

  const parsePrice = (priceStr: string): number => {
    return parseFloat(priceStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
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
          planName={selectedPlan.name}
          planPrice={parsePrice(selectedPlan.price)}
          planDescription={selectedPlan.description || ''}
        />
      )}
    </div>
  );
};

export default AccessExpiredMessage;
