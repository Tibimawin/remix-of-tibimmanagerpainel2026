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
import { Plan, AVAILABLE_FEATURES } from '@/types/planTypes';
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
    // Esquemas de cor distintos (evitar parecer plágio de outras plataformas)
    const planSchemes = [
      {
        // Mensal (coral/rosa quente)
        cardBg: 'bg-gradient-to-b from-rose-500/20 to-rose-700/10 border-rose-500/40',
        priceText: 'text-rose-400',
        btn: 'bg-rose-500 hover:bg-rose-600 text-white',
        badge: 'bg-rose-500 text-white',
        check: 'text-rose-400',
      },
      {
        // Trimestral (ciano/teal)
        cardBg: 'bg-gradient-to-b from-teal-500/20 to-teal-700/10 border-teal-500/40',
        priceText: 'text-teal-400',
        btn: 'bg-teal-500 hover:bg-teal-600 text-white',
        badge: 'bg-teal-500 text-white',
        check: 'text-teal-400',
      },
      {
        // Anual (âmbar/dourado)
        cardBg: 'bg-gradient-to-b from-amber-500/20 to-amber-700/10 border-amber-500/40',
        priceText: 'text-amber-400',
        btn: 'bg-amber-500 hover:bg-amber-600 text-white',
        badge: 'bg-amber-500 text-white',
        check: 'text-amber-400',
      },
      {
        // Extra (fúcsia/magenta)
        cardBg: 'bg-gradient-to-b from-fuchsia-500/20 to-fuchsia-700/10 border-fuchsia-500/40',
        priceText: 'text-fuchsia-400',
        btn: 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white',
        badge: 'bg-fuchsia-500 text-white',
        check: 'text-fuchsia-400',
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
                    Acesso Restrito
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Este recurso faz parte do módulo Premium. Escolha um plano para desbloquear.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 border text-xs text-muted-foreground self-start sm:self-end">
                  <Shield className="h-3.5 w-3.5" />
                  Status:
                  <span className="font-medium text-foreground">
                    {permissions?.planName || 'Nível Básico'}
                  </span>
                </div>
              </div>

              <div className="mb-8 p-4 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/20">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Módulos incluídos no seu plano ({permissions?.planName || 'Básico'}):
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {permissions?.enabledFeatures?.slice(0, 8).map(f => (
                    <Badge key={f} variant="secondary" className="text-[10px] font-normal opacity-80">
                      {AVAILABLE_FEATURES.find(af => af.id === f)?.name || f}
                    </Badge>
                  ))}
                  {(permissions?.enabledFeatures?.length || 0) > 8 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{(permissions?.enabledFeatures?.length || 0) - 8} outros
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  <Lock className="w-3 h-3" />
                  <span>Para liberar <strong>{AVAILABLE_FEATURES.find(f => f.id === feature)?.name || feature}</strong>, você precisa de um dos planos abaixo:</span>
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
                        {plan.description || `Desbloqueia ${feature.replace(/-/g, ' ')} e outros recursos avançados`}
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
                            <Check className={`w-4 h-4 shrink-0 mt-0.5 ${scheme.check}`} />
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
            requiredFeature={feature}
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
            requiredFeature={feature}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
};
