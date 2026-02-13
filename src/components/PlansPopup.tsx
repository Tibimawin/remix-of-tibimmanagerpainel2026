
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Crown, Check, Shield, Star, Rocket, Loader2, Sparkles } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { usePlans } from '@/hooks/usePlans';
import { Plan } from '@/types/planTypes';
import AsaasPixPaymentDialog from '@/components/AsaasPixPaymentDialog';

interface PlansPopupProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const PlansPopup: React.FC<PlansPopupProps> = ({ forceOpen, onClose }) => {
  const { permissions, loading: permLoading } = useUserPermissions();
  const { userInfo } = useSimpleAuth();
  const { activePlans, loading: plansLoading } = usePlans();
  const [autoOpen, setAutoOpen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; description: string } | null>(null);

  const isOpen = forceOpen !== undefined ? forceOpen : autoOpen;

  useEffect(() => {
    if (forceOpen !== undefined) return; // controlled externally
    if (permLoading || plansLoading || !userInfo?.id) return;

    const hasNoFeatures = !permissions?.enabledFeatures || permissions.enabledFeatures.length === 0;
    const dismissedKey = `plans-popup-dismissed-${userInfo.id}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey);

    if (hasNoFeatures && !wasDismissed) {
      const timer = setTimeout(() => setAutoOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [permLoading, plansLoading, permissions, userInfo?.id, forceOpen]);

  const handleDismiss = () => {
    setAutoOpen(false);
    onClose?.();
    if (userInfo?.id) {
      sessionStorage.setItem(`plans-popup-dismissed-${userInfo.id}`, 'true');
    }
  };

  const handleChoosePlan = (plan: Plan) => {
    const numericPrice = parseFloat(plan.price.replace(/[^\d,]/g, '').replace(',', '.')) || 30;
    setSelectedPlan({ name: plan.name, price: numericPrice, description: plan.description });
    setAutoOpen(false);
    onClose?.();
    setShowPayment(true);
  };

  const getPlanIcon = (index: number) => {
    const icons = [Shield, Star, Rocket];
    return icons[index % icons.length];
  };

  const getPlanGradient = (index: number) => {
    const gradients = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-amber-500 to-orange-500'
    ];
    return gradients[index % gradients.length];
  };

  if (plansLoading || activePlans.length === 0) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold">
              Bem-vindo! 🎉
            </DialogTitle>
            <DialogDescription className="text-base">
              Para desbloquear todas as funcionalidades, escolha um plano e assine agora mesmo.
            </DialogDescription>
          </DialogHeader>

          <div className={`grid grid-cols-1 ${activePlans.length >= 2 ? 'sm:grid-cols-2' : ''} gap-4 mt-4`}>
            {activePlans.map((plan, index) => {
              const IconComponent = getPlanIcon(index);
              const gradient = getPlanGradient(index);

              return (
                <Card
                  key={plan.id}
                  className="relative p-5 border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg cursor-pointer group"
                  onClick={() => handleChoosePlan(plan)}
                >
                  {index === 1 && activePlans.length >= 2 && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3">
                      <Crown className="w-3 h-3 mr-1" /> Popular
                    </Badge>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-md`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>

                    <div className="text-center py-2">
                      <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>

                    <ul className="space-y-2">
                      {plan.features.slice(0, 4).map((featureId) => (
                        <li key={featureId} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="text-muted-foreground capitalize">
                            {featureId.replace(/-/g, ' ')}
                          </span>
                        </li>
                      ))}
                      {plan.features.length > 4 && (
                        <li className="text-xs text-muted-foreground text-center">
                          +{plan.features.length - 4} recursos incluídos
                        </li>
                      )}
                    </ul>

                    <Button className="w-full group-hover:bg-primary/90 transition-colors">
                      Assinar Agora
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground">
              Continuar sem plano
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedPlan && (
        <AsaasPixPaymentDialog
          isOpen={showPayment}
          onOpenChange={setShowPayment}
          planName={selectedPlan.name}
          planPrice={selectedPlan.price}
          planDescription={selectedPlan.description}
        />
      )}
    </>
  );
};
