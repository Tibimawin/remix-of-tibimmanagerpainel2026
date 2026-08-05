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
  const [showFeatureUnlockPayment, setShowFeatureUnlockPayment] = useState(false);
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
    const hasActivePlan = permissions?.planName && permissions?.isActive && permissions?.expiryDate;
    const isSubscriptionExpired = !permissions?.isActive;
    
    // Identifica se o usuário possui um dos planos base de 30 dias (R$ 30 a R$ 35)
    // Inclui: "Básico", "Mensal", "Painel + Baserow"
    const isBasicActive = hasActivePlan && (
      permissions.planName.toLowerCase().includes('básico') || 
      permissions.planName.toLowerCase().includes('basico') || 
      permissions.planName.toLowerCase().includes('mensal') ||
      permissions.planName.toLowerCase().includes('baserow')
    );

    // Identifica o plano de destino que contém o recurso (Geralmente R$ 44,90 ou superior)
    const targetPlanForFeature = activePlans.find(p => p.features.includes(feature));
    const targetPrice = targetPlanForFeature 
      ? parseFloat(targetPlanForFeature.price.replace(/[^\d,]/g, '').replace(',', '.')) 
      : 0;

    // Regra: "Liberar Recurso (R$ 15)" aparece se:
    // 1. Usuário tem plano básico/baserow ativo (isBasicActive)
    // 2. O recurso solicitado está em um plano superior (normalmente o de R$ 44,90)
    // 3. A assinatura NÃO está expirada (se estiver expirada, deve assinar um plano novo completo)
    const canUnlockIndividual = isBasicActive && targetPrice >= 44 && !isSubscriptionExpired;
    
    if (fallback) {
      return <>{fallback}</>;
    }

    // Check if this is the API feature and user already has an active plan
    const isApiFeature = feature === 'minha-api';
    const hasSubscription = permissions?.planName && permissions?.enabledFeatures && permissions.enabledFeatures.length > 0;
    
    // Calculate current plan price
    let currentPlanPrice = 0;
    if (hasSubscription && permissions?.planId) {
      const currentPlan = activePlans.find(p => p.id === permissions.planId);
      if (currentPlan) {
        currentPlanPrice = parseFloat(currentPlan.price.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      }
    }
    
    const upgradeDifference = Math.max(API_PLAN_PRICE - currentPlanPrice, 0);
    const canUpgrade = isApiFeature && hasSubscription && upgradeDifference > 0;

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
        isApiPlan && hasSubscription && currentPlanPrice > 0 && numericPrice > currentPlanPrice;

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
                    {canUnlockIndividual ? 'Desbloqueio Disponível' : 'Acesso Restrito'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {hasActivePlan ? (
                      <>Você está no plano <strong>{permissions.planName}</strong>. Desbloqueie este recurso extra para turbinar seu painel.</>
                    ) : (
                      <>Este recurso faz parte do módulo Premium. Escolha um plano para desbloquear.</>
                    )}
                  </p>
                </div>
                <div className="inline-flex flex-col gap-1 items-end">
                  <div className="inline-flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 border text-xs text-muted-foreground self-start sm:self-end">
                    <Shield className="h-3.5 w-3.5" />
                    Plano atual:
                    <span className="font-medium text-foreground">
                      {permissions?.planName || 'Nível Básico'}
                    </span>
                  </div>
                  {hasActivePlan && permissions?.expiryDate && (
                    <div className="text-[10px] text-muted-foreground bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                      Vencimento: {new Date(permissions.expiryDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-8 p-6 bg-muted/30 rounded-2xl border border-muted-foreground/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Progresso da sua Conta
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-medium border-primary/20 bg-primary/5 text-primary">
                    {permissions?.planName || 'Básico'}
                  </Badge>
                </div>

                {/* Barra de Progresso de Recursos */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-[10px] font-medium px-1">
                    <span className="text-muted-foreground">Módulos Ativos</span>
                    <span className="text-primary">{permissions?.enabledFeatures?.length || 0} / {AVAILABLE_FEATURES.length}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(((permissions?.enabledFeatures?.length || 0) / AVAILABLE_FEATURES.length) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground opacity-70">Seu Arsenal Atual:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {permissions?.enabledFeatures?.slice(0, 6).map(f => (
                        <div key={f} className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">
                          <Check className="w-2.5 h-2.5" />
                          {AVAILABLE_FEATURES.find(af => af.id === f)?.name || f}
                        </div>
                      ))}
                      {(permissions?.enabledFeatures?.length || 0) > 6 && (
                        <div className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-[10px]">
                          +{(permissions?.enabledFeatures?.length || 0) - 6}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground opacity-70">Próximo Desbloqueio:</span>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-rose-400 truncate">
                      {AVAILABLE_FEATURES.find(f => f.id === feature)?.name || feature}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">
                      {canUnlockIndividual 
                        ? `Upgrade disponível de ${permissions?.planName || 'Básico'} para R$ 44,90` 
                        : 'Disponível em planos Premium'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button 
                      size="sm" 
                      className="h-7 px-3 text-[10px] bg-rose-500 hover:bg-rose-600 text-white font-bold"
                      onClick={() => {
                        const firstPremium = activePlans.find(p => p.features.includes(feature)) || activePlans[0];
                        if (firstPremium) handleChoosePlan(firstPremium);
                      }}
                    >
                      Trocar Plano
                    </Button>
                    
                    {canUnlockIndividual && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 px-3 text-[10px] border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold"
                        onClick={() => setShowFeatureUnlockPayment(true)}
                      >
                        Liberar Recurso (R$ 15)
                      </Button>
                    )}
                  </div>
                </div>
                  </div>
                </div>
              </div>

              {(isSubscriptionExpired || !canUnlockIndividual) && (
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
                      isApiPlan && hasSubscription && currentPlanPrice > 0 && numericPrice > currentPlanPrice;
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
              )}
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

        <AsaasPixPaymentDialog
          isOpen={showFeatureUnlockPayment}
          onOpenChange={setShowFeatureUnlockPayment}
          planName={`Desbloqueio: ${AVAILABLE_FEATURES.find(f => f.id === feature)?.name || feature}`}
          planPrice={15}
          planDescription={`Acesso vitalício ao recurso ${AVAILABLE_FEATURES.find(f => f.id === feature)?.name || feature} durante a vigência do seu plano atual.`}
          isFeatureUnlockOnly={true}
          requiredFeature={feature}
        />
      </>
    );
  }

  return <>{children}</>;
};
