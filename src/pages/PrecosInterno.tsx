
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Crown, Check, Zap, Star, Rocket, Shield, MessageSquare, Loader2 } from 'lucide-react';
import { usePlanRequests } from '@/hooks/usePlanRequests';
import { useActivePlan } from '@/hooks/useActivePlan';
import { usePlans } from '@/hooks/usePlans';
import { Plan } from '@/types/planTypes';
import WhatsAppQRDialog from '@/components/WhatsAppQRDialog';

const PrecosInterno = () => {
  const { createPlanRequest } = usePlanRequests();
  const { hasActivePlan, loading: planLoading } = useActivePlan();
  const { activePlans, loading } = usePlans();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [userMessage, setUserMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [showWhatsAppQR, setShowWhatsAppQR] = useState(false);
  const [selectedPlanForWhatsApp, setSelectedPlanForWhatsApp] = useState<string | undefined>(undefined);

  const handleChoosePlan = (plan: Plan) => {
    setSelectedPlanForWhatsApp(plan.name);
    setShowWhatsAppQR(true);
  };

  const handlePlanRequest = async () => {
    if (!selectedPlan) return;
    
    setRequesting(true);
    try {
      await createPlanRequest(
        selectedPlan.id,
        selectedPlan.name,
        selectedPlan.price,
        userMessage.trim() || undefined
      );
      
      // Limpar estado
      setSelectedPlan(null);
      setUserMessage('');
    } catch (error) {
      console.error('Erro ao solicitar plano:', error);
    } finally {
      setRequesting(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'básico':
        return Shield;
      case 'profissional':
        return Star;
      case 'empresa':
        return Rocket;
      default:
        return Shield;
    }
  };

  const getPlanColor = (index: number) => {
    const colors = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-gradient-to-r from-amber-500 to-orange-500'];
    return colors[index % colors.length];
  };

  if (loading || planLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Nossos Planos
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano ideal para suas necessidades e acelere seus resultados
          </p>
          <div className="flex items-center justify-center space-x-2">
            <Badge variant="outline" className="modern-badge bg-green-50 text-green-700 border-green-200">
              <Crown className="w-3 h-3 mr-1" />
              Promoção Limitada
            </Badge>
          </div>
        </div>

        {/* Cards de Planos */}
        <div className={`grid grid-cols-1 ${activePlans.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-8`}>
          {activePlans.map((plan, index) => {
            const IconComponent = getPlanIcon(plan.name);
            const color = getPlanColor(index);
            const isPopular = index === 1 && activePlans.length >= 3;
            const isCurrentPlan = hasActivePlan(plan.id);
            
            return (
              <Card 
                key={plan.id} 
                className={`modern-card relative transition-all duration-300 hover:scale-105 ${
                  isCurrentPlan ? 'ring-2 ring-green-500 shadow-xl' : 
                  isPopular ? 'ring-2 ring-primary shadow-xl' : ''
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="modern-badge bg-green-600 text-white px-4 py-1">
                      <Crown className="w-3 h-3 mr-1" />
                      Plano Atual
                    </Badge>
                  </div>
                )}

                {isPopular && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="modern-badge bg-primary text-primary-foreground px-4 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className={`text-center space-y-4 ${isPopular || isCurrentPlan ? 'pt-8' : ''} pb-6`}>
                  <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${color} flex items-center justify-center shadow-lg`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground mb-2">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {plan.description}
                    </CardDescription>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-3xl font-bold text-foreground">
                        {plan.price}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plan.monthlyContentLimit === -1 ? 'Conteúdos ilimitados' : 
                       plan.monthlyContentLimit === 0 ? 'Sem acesso a conteúdos' :
                       `Até ${plan.monthlyContentLimit.toLocaleString()} conteúdos/mês`}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.slice(0, 5).map((featureId) => (
                      <li key={featureId} className="flex items-center space-x-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-sm text-foreground">
                          {featureId === 'import' && 'Importação de M3U'}
                          {featureId === 'logs' && 'Logs do sistema'}
                          {featureId === 'advanced-search' && 'Busca avançada'}
                          {featureId === 'export' && 'Exportação de dados'}
                          {featureId === 'ai-tools' && 'Ferramentas de IA'}
                          {featureId === 'api-access' && 'Acesso à API'}
                          {featureId === 'priority-support' && 'Suporte prioritário'}
                          {!['import', 'logs', 'advanced-search', 'export', 'ai-tools', 'api-access', 'priority-support'].includes(featureId) && 
                           featureId.charAt(0).toUpperCase() + featureId.slice(1).replace('-', ' ')}
                        </span>
                      </li>
                    ))}
                    {plan.features.length > 5 && (
                      <li className="flex items-center space-x-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-sm text-foreground">+{plan.features.length - 5} recursos adicionais</span>
                      </li>
                    )}
                  </ul>

                  <Button 
                    onClick={() => handleChoosePlan(plan)}
                    className="w-full modern-button"
                  >
                    Falar no WhatsApp
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Seção de Garantia */}
        <div className="text-center space-y-4 py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">
            Garantia de 30 dias
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Teste nosso sistema por 30 dias. Se não ficar satisfeito, devolvemos 100% do seu dinheiro.
          </p>
        </div>

        {/* WhatsApp QR Dialog */}
        <WhatsAppQRDialog 
          isOpen={showWhatsAppQR}
          onOpenChange={setShowWhatsAppQR}
          planName={selectedPlanForWhatsApp}
        />
      </div>
    </div>
  );
};

export default PrecosInterno;
