import React, { useState } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { usePlans } from '@/hooks/usePlans';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Plan, AVAILABLE_FEATURES } from '@/types/planTypes';
import AsaasPixPaymentDialog from './AsaasPixPaymentDialog';
import { PaymentReconciliationService } from '@/services/PaymentReconciliationService';

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
  const { userInfo } = useSimpleAuth();
  const { activePlans } = usePlans();
  const [showUpgradePayment, setShowUpgradePayment] = useState(false);
  const [showPlanPayment, setShowPlanPayment] = useState(false);
  const [showFeatureUnlockPayment, setShowFeatureUnlockPayment] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<
    | {
        id?: string;
        name: string;
        price: number;
        description: string;
        durationDays?: number;
        features?: string[];
        isUpgrade?: boolean;
        upgradeFromPlan?: string;
        existingFeatures?: string[];
      }
    | null
  >(null);

  const handleVerifyPayment = async () => {
    if (!userInfo?.id || !userInfo?.email) {
      toast.error('Você precisa estar conectado.');
      return;
    }
    setIsVerifying(true);
    toast.loading('Consultando pagamentos no Asaas...', { id: 'verif-gate' });
    try {
      const res = await PaymentReconciliationService.reconcileUserPayments(userInfo.id, userInfo.email, userInfo.name);
      if (res.reconciled) {
        toast.success(res.message, { id: 'verif-gate' });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.info(res.message, { id: 'verif-gate' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao verificar pagamentos', { id: 'verif-gate' });
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasFeature(feature)) {
    // ⚠️ CRITICAL LOGIC: A assinatura é considerada expirada se isActive for explicitamente false OU se não houver data de expiração/plano
    const hasActivePlan = !!(permissions?.planName && permissions?.isActive && permissions?.expiryDate);
    const isSubscriptionExpired = permissions?.isActive === false || !permissions?.expiryDate || new Date(permissions.expiryDate) < new Date();
    
    // "Liberar Recurso (R$ 15)" pode ser contratado por qualquer usuário com conta ativa
    const canUnlockIndividual = hasActivePlan && !isSubscriptionExpired;
    
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
          id: plan.id,
          name: plan.name,
          price: difference,
          description: `Upgrade de ${permissions?.planName} para ${plan.name}`,
          durationDays: plan.durationDays,
          features: plan.features,
          isUpgrade: true,
          upgradeFromPlan: permissions?.planName || '',
          existingFeatures: permissions?.enabledFeatures || [],
        });
      } else {
        setSelectedPlan({
          id: plan.id,
          name: plan.name,
          price: numericPrice,
          description: plan.description,
          durationDays: plan.durationDays,
          features: plan.features,
        });
      }
      setShowPlanPayment(true);
    };

    return (
      <div className="permission-gate-container">
        <div className="space-y-6">
          {activePlans.length > 0 && (
            <div className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                    {canUnlockIndividual ? 'Desbloqueio Disponível' : 'Acesso Restrito'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {hasActivePlan && !isSubscriptionExpired ? (
                      <>Você está no plano <strong>{permissions?.planName}</strong>. Desbloqueie este recurso extra (R$ 15) para turbinar seu painel.</>
                    ) : (
                      <>Sua assinatura está <strong>expirada</strong> ou você não possui um plano ativo. Escolha uma opção abaixo para continuar.</>
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyPayment}
                    disabled={isVerifying}
                    className="mt-2 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold gap-1.5 h-8 rounded-full px-3"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                    Já Paguei? Ativar Agora
                  </Button>
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
                        ? `Desbloqueio avulso por apenas R$ 15,00 ou plano completo` 
                        : 'Disponível em planos ativos'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button 
                      size="sm" 
                      className="h-7 px-3 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                      onClick={() => setShowFeatureUnlockPayment(true)}
                    >
                      <Zap className="w-3 h-3" />
                      Liberar Recurso (R$ 15)
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-7 px-3 text-[10px] border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold"
                      onClick={() => {
                        const firstPremium = activePlans.find(p => p.features.includes(feature)) || activePlans[0];
                        if (firstPremium) handleChoosePlan(firstPremium);
                      }}
                    >
                      Trocar Plano
                    </Button>
                  </div>
                </div>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Planos Disponíveis para Contratação
                </h3>
                
                <div
                  className={`grid gap-5 ${
                    activePlans.length === 1
                      ? 'grid-cols-1 max-w-sm'
                      : activePlans.length === 2
                      ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
                      : activePlans.length === 3
                      ? 'grid-cols-1 md:grid-cols-3 max-w-5xl'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                  } mx-auto`}
                >
                  {activePlans.map((plan, index) => {
                    const IconComponent = planIcons[index % planIcons.length];
                    const scheme = planSchemes[index % planSchemes.length];
                    const isApiPlan = plan.features.includes('minha-api');
                    const numericPrice =
                      parseFloat(
                        plan.price.replace(/[^\d,]/g, '').replace(',', '.')
                      ) || 30;
                    const isUpgrade =
                      isApiPlan &&
                      hasSubscription &&
                      currentPlanPrice > 0 &&
                      numericPrice > currentPlanPrice;
                    const finalPrice = isUpgrade
                      ? numericPrice - currentPlanPrice
                      : numericPrice;

                    return (
                      <Card
                        key={plan.id}
                        className={`relative flex flex-col justify-between border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                          plan.features.includes(feature)
                            ? 'border-primary shadow-lg ring-1 ring-primary/30'
                            : scheme.cardBg
                        }`}
                      >
                        {plan.features.includes(feature) && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-0.5 text-xs shadow-md">
                              Recomendado
                            </Badge>
                          </div>
                        )}

                        <CardContent className="p-5 flex flex-col flex-1 justify-between">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="p-2 rounded-lg bg-background/50 border border-border/50">
                                <IconComponent className="w-5 h-5 text-foreground" />
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${scheme.badge}`}
                              >
                                {plan.name}
                              </Badge>
                            </div>

                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs text-muted-foreground">
                                  R$
                                </span>
                                <span
                                  className={`text-3xl font-extrabold tracking-tight ${scheme.priceText}`}
                                >
                                  {finalPrice.toFixed(2).replace('.', ',')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  /mês
                                </span>
                              </div>
                              {isUpgrade && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Diferença do seu plano atual
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {plan.description}
                              </p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-border/40">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                O que está incluído:
                              </p>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {plan.features.map((feat) => {
                                  const featObj = AVAILABLE_FEATURES.find(
                                    (f) => f.id === feat
                                  );
                                  const isThisFeature = feat === feature;
                                  return (
                                    <div
                                      key={feat}
                                      className={`flex items-center gap-2 text-xs ${
                                        isThisFeature
                                          ? 'font-bold text-primary'
                                          : 'text-muted-foreground'
                                      }`}
                                    >
                                      <Check
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          isThisFeature
                                            ? 'text-primary'
                                            : scheme.check
                                        }`}
                                      />
                                      <span className="truncate">
                                        {featObj?.name || feat}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <Button
                            className={`w-full mt-5 font-bold text-xs h-9 ${scheme.btn}`}
                            onClick={() => handleChoosePlan(plan)}
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                            {isUpgrade ? 'Fazer Upgrade' : 'Contratar via PIX'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
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
            planId={selectedPlan.id}
            planName={selectedPlan.name}
            planPrice={selectedPlan.price}
            planDescription={selectedPlan.description}
            durationDays={selectedPlan.durationDays}
            planFeatures={selectedPlan.features}
            isUpgrade={selectedPlan.isUpgrade}
            upgradeFromPlan={selectedPlan.upgradeFromPlan}
            existingFeatures={selectedPlan.existingFeatures}
            isFeatureUnlockOnly={false}
          />
        )}

        <AsaasPixPaymentDialog
          isOpen={showFeatureUnlockPayment}
          onOpenChange={setShowFeatureUnlockPayment}
          planName={`Desbloqueio: ${AVAILABLE_FEATURES.find(f => f.id === feature)?.name || feature}`}
          planPrice={15}
          planDescription={`Acesso ao recurso ${AVAILABLE_FEATURES.find(f => f.id === feature)?.name || feature} durante a vigência do seu plano.`}
          isFeatureUnlockOnly={true}
          requiredFeature={feature}
        />
      </div>
    );
  }

  return <>{children}</>;
};
