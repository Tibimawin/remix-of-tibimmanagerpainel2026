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
  CreditCard,
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
    // Esquemas de cor estilo "Assine o Premium" (referência)
    const planSchemes = [
      {
        // Mensal (laranja)
        cardBg: 'bg-gradient-to-b from-orange-500/20 to-orange-700/10 border-orange-500/40',
        priceText: 'text-orange-400',
        btn: 'bg-orange-500 hover:bg-orange-600 text-white',
        badge: 'bg-orange-500 text-white',
      },
      {
        // Trimestral (azul)
        cardBg: 'bg-gradient-to-b from-blue-500/20 to-blue-800/10 border-blue-500/40',
        priceText: 'text-blue-400',
        btn: 'bg-blue-500 hover:bg-blue-600 text-white',
        badge: 'bg-blue-500 text-white',
      },
      {
        // Anual (roxo)
        cardBg: 'bg-gradient-to-b from-purple-500/20 to-purple-800/10 border-purple-500/40',
        priceText: 'text-purple-400',
        btn: 'bg-purple-500 hover:bg-purple-600 text-white',
        badge: 'bg-purple-500 text-white',
      },
      {
        // Extra (verde)
        cardBg: 'bg-gradient-to-b from-emerald-500/20 to-emerald-800/10 border-emerald-500/40',
        priceText: 'text-emerald-400',
        btn: 'bg-emerald-500 hover:bg-emerald-600 text-white',
        badge: 'bg-emerald-500 text-white',
      },
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
          {activePlans.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                    Assine o Premium
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Aproveite recursos avançados para gerenciar sua plataforma
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 border text-xs text-muted-foreground self-start sm:self-end">
                  <Shield className="h-3.5 w-3.5" />
                  Plano atual:
                  <span className="font-medium text-foreground">
                    {permissions?.planName || 'Grátis'}
                  </span>
                </div>
              </div>

              <div
                className={`grid gap-5 ${
                  activePlans.length === 1
                    ? 'grid-cols-1 max-w-sm mx-auto'
                    : activePlans.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
                    : activePlans.length === 3
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                }`}
              >
                {activePlans.map((plan, index) => {
                  const scheme = planSchemes[index % planSchemes.length];
                  const numericPrice =
                    parseFloat(plan.price.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                  const isApiPlan = plan.features.includes('minha-api');
                  const showUpgradePrice =
                    isApiPlan && hasActivePlan && currentPlanPrice > 0 && numericPrice > currentPlanPrice;
                  const displayPrice = showUpgradePrice ? numericPrice - currentPlanPrice : numericPrice;
                  const isCurrent = permissions?.planId === plan.id;
                  const isPopular = !isCurrent && index === activePlans.length - 1 && activePlans.length >= 3;

                  return (
                    <Card
                      key={plan.id}
                      className={`relative p-6 border-2 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col ${scheme.cardBg}`}
                    >
                      {isPopular && (
                        <Badge className={`absolute top-4 right-4 ${scheme.badge} text-[10px] px-2 py-0.5`}>
                          Mais Popular
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge className="absolute top-4 right-4 bg-foreground/80 text-background text-[10px] px-2 py-0.5">
                          Plano atual
                        </Badge>
                      )}

                      <div className="flex items-center gap-2 mb-1">
                        <Crown className={`w-5 h-5 ${scheme.priceText}`} />
                        <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-5 line-clamp-2">
                        {plan.description || 'Acesso premium completo'}
                      </p>

                      <div className="mb-5">
                        {showUpgradePrice ? (
                          <>
                            <div className={`text-3xl font-extrabold ${scheme.priceText}`}>
                              R$ {displayPrice.toFixed(2).replace('.', ',')}
                            </div>
                            <div className="text-xs text-muted-foreground line-through">{plan.price}</div>
                            <Badge variant="secondary" className="mt-1 text-[10px]">Upgrade</Badge>
                          </>
                        ) : (
                          <>
                            <div className={`text-3xl font-extrabold ${scheme.priceText}`}>
                              {plan.price.replace(/\/.*$/, '')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {plan.price.includes('/') ? `/${plan.price.split('/').pop()}` : '/mês'}
                            </div>
                          </>
                        )}
                      </div>

                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.slice(0, 6).map((featureId) => (
                          <li key={featureId} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-foreground/90 capitalize">
                              {featureId.replace(/-/g, ' ')}
                            </span>
                          </li>
                        ))}
                        {plan.features.length > 6 && (
                          <li className="text-xs text-muted-foreground pl-6">
                            +{plan.features.length - 6} recursos incluídos
                          </li>
                        )}
                      </ul>

                      {isCurrent ? (
                        <Button disabled variant="outline" className="w-full rounded-full">
                          Plano atual
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleChoosePlan(plan)}
                          className={`w-full rounded-full font-semibold ${scheme.btn}`}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          {showUpgradePrice ? 'Fazer Upgrade' : `Assinar ${plan.name}`}
                        </Button>
                      )}
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
