import React, { useState } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { usePlans } from '@/hooks/usePlans';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  Shield,
  Sparkles,
  ArrowUpCircle,
  Check,
  Crown,
  Star,
  Rocket,
} from 'lucide-react';
import { Plan } from '@/types/planTypes';
import AsaasPixPaymentDialog from './AsaasPixPaymentDialog';

interface PermissionGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const API_PLAN_PRICE = 50;

export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  feature, 
  children, 
  fallback 
}) => {
  const { hasFeature, loading, permissions } = useUserPermissions();
  const { activePlans } = usePlans();
  const [showUpgradePayment, setShowUpgradePayment] = useState(false);
  const [showPlanPayment, setShowPlanPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<
    | {
        name: string;
        price: number;
        description: string;
        isUpgrade?: boolean;
        upgradeFromPlan?: string;
        existingFeatures?: string[];
      }
    | null
  >(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasFeature(feature)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Check if this is the API feature and user already has an active plan
    const isApiFeature = feature === 'minha-api';
    const hasActivePlan = permissions?.planName && permissions?.enabledFeatures && permissions.enabledFeatures.length > 0;
    
    // Calculate current plan price
    let currentPlanPrice = 0;
    if (hasActivePlan && permissions?.planId) {
      const currentPlan = activePlans.find(p => p.id === permissions.planId);
      if (currentPlan) {
        currentPlanPrice = parseFloat(currentPlan.price.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      }
    }
    
    const upgradeDifference = Math.max(API_PLAN_PRICE - currentPlanPrice, 0);
    const canUpgrade = isApiFeature && hasActivePlan && upgradeDifference > 0;

    const planIcons = [Shield, Star, Rocket];
    const planGradients = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-amber-500 to-orange-500',
    ];

    const handleChoosePlan = (plan: Plan) => {
      const numericPrice =
        parseFloat(plan.price.replace(/[^\d,]/g, '').replace(',', '.')) || 30;
      const isApiPlan = plan.features.includes('minha-api');
      const planUpgrade =
        isApiPlan && hasActivePlan && currentPlanPrice > 0 && numericPrice > currentPlanPrice;

      if (planUpgrade) {
        const difference = numericPrice - currentPlanPrice;
        setSelectedPlan({
          name: plan.name,
          price: difference,
          description: `Upgrade de ${permissions?.planName} para ${plan.name}`,
          isUpgrade: true,
          upgradeFromPlan: permissions?.planName || '',
          existingFeatures: permissions?.enabledFeatures || [],
        });
      } else {
        setSelectedPlan({
          name: plan.name,
          price: numericPrice,
          description: plan.description,
        });
      }
      setShowPlanPayment(true);
    };

    return (
      <>
        <div className="space-y-6">
          <Card className="bg-muted/40 border-destructive/20">
            <CardContent className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <Lock className="h-7 w-7 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-1">
                Recurso bloqueado
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                {canUpgrade
                  ? `Faça upgrade para desbloquear a Integração API por apenas R$ ${upgradeDifference.toFixed(2)}/mês.`
                  : 'Sua assinatura não cobre esta funcionalidade. Escolha um plano abaixo para liberar o acesso completo ao painel.'}
              </p>
              {canUpgrade && (
                <Button
                  onClick={() => setShowUpgradePayment(true)}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Fazer Upgrade - R$ {upgradeDifference.toFixed(2)}/mês
                </Button>
              )}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 border text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Plano atual: <span className="font-medium text-foreground">{permissions?.planName || 'Sem plano'}</span>
              </div>
            </CardContent>
          </Card>

          {activePlans.length > 0 && (
            <div>
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 text-primary font-semibold">
                  <Sparkles className="h-4 w-4" />
                  Escolha um plano para liberar tudo
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Compare os planos abaixo e assine em poucos cliques.
                </p>
              </div>

              <div
                className={`grid gap-4 ${
                  activePlans.length === 1
                    ? 'grid-cols-1 max-w-sm mx-auto'
                    : activePlans.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {activePlans.map((plan, index) => {
                  const Icon = planIcons[index % planIcons.length];
                  const gradient = planGradients[index % planGradients.length];
                  const numericPrice =
                    parseFloat(plan.price.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                  const isApiPlan = plan.features.includes('minha-api');
                  const showUpgradePrice =
                    isApiPlan && hasActivePlan && currentPlanPrice > 0 && numericPrice > currentPlanPrice;
                  const displayPrice = showUpgradePrice ? numericPrice - currentPlanPrice : numericPrice;
                  const isPopular = index === 1 && activePlans.length >= 2;

                  return (
                    <Card
                      key={plan.id}
                      className={`relative p-5 border-2 transition-all duration-300 hover:shadow-lg cursor-pointer group ${
                        isPopular ? 'border-primary/60' : 'hover:border-primary/40'
                      }`}
                      onClick={() => handleChoosePlan(plan)}
                    >
                      {isPopular && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3">
                          <Crown className="w-3 h-3 mr-1" /> Popular
                        </Badge>
                      )}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-md`}
                          >
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground">{plan.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {plan.description}
                            </p>
                          </div>
                        </div>

                        <div className="text-center py-2 border-y">
                          {showUpgradePrice ? (
                            <>
                              <span className="text-sm text-muted-foreground line-through mr-2">
                                {plan.price}
                              </span>
                              <span className="text-2xl font-bold text-foreground">
                                R$ {displayPrice.toFixed(2)}
                              </span>
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Upgrade
                              </Badge>
                            </>
                          ) : (
                            <>
                              <span className="text-2xl font-bold text-foreground">
                                {plan.price}
                              </span>
                              <span className="text-sm text-muted-foreground">/mês</span>
                            </>
                          )}
                        </div>

                        <ul className="space-y-1.5">
                          {plan.features.slice(0, 6).map((featureId) => (
                            <li
                              key={featureId}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Check className="w-4 h-4 text-green-500 shrink-0" />
                              <span className="text-muted-foreground capitalize">
                                {featureId.replace(/-/g, ' ')}
                              </span>
                            </li>
                          ))}
                          {plan.features.length > 6 && (
                            <li className="text-xs text-muted-foreground text-center pt-1">
                              +{plan.features.length - 6} recursos incluídos
                            </li>
                          )}
                        </ul>

                        <Button className="w-full">
                          {showUpgradePrice ? (
                            <>
                              <ArrowUpCircle className="h-4 w-4 mr-1" />
                              Fazer Upgrade
                            </>
                          ) : (
                            'Assinar agora'
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {canUpgrade && (
          <AsaasPixPaymentDialog
            isOpen={showUpgradePayment}
            onOpenChange={setShowUpgradePayment}
            planName="Integração API"
            planPrice={upgradeDifference}
            planDescription="Upgrade para Integração API"
            isUpgrade
            upgradeFromPlan={permissions?.planName || ''}
            existingFeatures={permissions?.enabledFeatures || []}
          />
        )}

        {selectedPlan && (
          <AsaasPixPaymentDialog
            isOpen={showPlanPayment}
            onOpenChange={setShowPlanPayment}
            planName={selectedPlan.name}
            planPrice={selectedPlan.price}
            planDescription={selectedPlan.description}
            isUpgrade={selectedPlan.isUpgrade}
            upgradeFromPlan={selectedPlan.upgradeFromPlan}
            existingFeatures={selectedPlan.existingFeatures}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
};
