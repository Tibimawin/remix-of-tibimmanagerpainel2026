import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Crown, Shield, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Plan } from '@/types/planTypes';
import { useActivePlan } from '@/hooks/useActivePlan';
import { usePlans } from '@/hooks/usePlans';
import WhatsAppQRDialog from '@/components/WhatsAppQRDialog';

const PrecosPublico = () => {
  const navigate = useNavigate();
  const { activePlans, loading } = usePlans();
  const { hasActivePlan, loading: planLoading } = useActivePlan();
  const [showWhatsAppQR, setShowWhatsAppQR] = useState(false);
  const [selectedPlanForWhatsApp, setSelectedPlanForWhatsApp] = useState<string | undefined>(undefined);

  const handleRequestPlan = (planName: string) => {
    setSelectedPlanForWhatsApp(planName);
    setShowWhatsAppQR(true);
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'básico':
        return Shield;
      case 'profissional':
        return Star;
      case 'empresa':
        return Crown;
      default:
        return Shield;
    }
  };

  const getPlanColor = (index: number) => {
    const colors = ['green', 'blue', 'purple'];
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden py-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5"></div>
        <div className="relative container mx-auto px-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
            
            <div className="flex gap-4">
              <Button 
                variant="outline"
                onClick={() => navigate('/login')}
                className="border-border text-muted-foreground hover:bg-muted"
              >
                Entrar
              </Button>
              <Button 
                onClick={() => navigate('/criar-conta')}
                className="modern-button"
              >
                Criar Conta
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="text-center space-y-6 mb-16">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              Nossos Planos
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/70 mx-auto rounded-full"></div>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Escolha o plano ideal para suas necessidades. Todos os planos incluem suporte técnico 
            e acesso às funcionalidades principais da plataforma.
          </p>
        </div>

        {/* Plans Grid */}
        <div className={`grid grid-cols-1 ${activePlans.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-8 mb-16`}>
          {activePlans.map((plan, index) => {
            const Icon = getPlanIcon(plan.name);
            const color = getPlanColor(index);
            const isPopular = index === 1 && activePlans.length >= 3;
            const isCurrentPlan = hasActivePlan(plan.id);
            
            return (
              <Card 
                key={plan.id} 
                className={`modern-card hover-lift relative border-2 ${isCurrentPlan ? 'border-primary bg-primary/10' : 'border-border'} ${isPopular ? 'transform scale-105' : ''}`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="modern-badge">
                      <Crown className="h-4 w-4 mr-1" />
                      Plano Atual
                    </Badge>
                  </div>
                )}
                
                {isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="modern-badge">
                      <Star className="h-4 w-4 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className={`text-center space-y-4 ${isPopular || isCurrentPlan ? 'pt-8' : ''} pb-6`}>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {plan.name}
                  </CardTitle>
                  <Badge variant="outline" className="border-primary text-primary px-4 py-1">
                    {plan.description}
                  </Badge>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground mb-2">{plan.price}</div>
                    <p className="text-muted-foreground text-sm">
                      {plan.monthlyContentLimit === -1 ? 'Conteúdos ilimitados' : 
                       plan.monthlyContentLimit === 0 ? 'Sem acesso a conteúdos' :
                       `Até ${(plan.monthlyContentLimit ?? 0).toLocaleString()} conteúdos/mês`}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Recursos inclusos:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {plan.features.slice(0, 5).map((featureId) => (
                        <li key={featureId} className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>
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
                        <li className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>+{plan.features.length - 5} recursos adicionais</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <Button 
                    onClick={() => handleRequestPlan(plan.name)}
                    className="w-full modern-button py-3 font-medium"
                  >
                    Falar no WhatsApp
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Process Info */}
        <div className="text-center space-y-6">
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-semibold text-primary mb-6">
              Como funciona o processo?
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-foreground">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg mx-auto">
                  1
                </div>
                <p className="font-medium">Escolha seu plano</p>
                <p className="text-sm text-muted-foreground">Selecione o plano que melhor atende suas necessidades</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg mx-auto">
                  2
                </div>
                <p className="font-medium">Crie sua conta</p>
                <p className="text-sm text-muted-foreground">Faça seu cadastro e aguarde a aprovação</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg mx-auto">
                  3
                </div>
                <p className="font-medium">Comece a usar</p>
                <p className="text-sm text-muted-foreground">Receba as permissões e acesse todos os recursos</p>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp QR Dialog */}
        <WhatsAppQRDialog 
          isOpen={showWhatsAppQR}
          onOpenChange={setShowWhatsAppQR}
          planName={selectedPlanForWhatsApp}
        />
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            © 2024 Painel de Gestão. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrecosPublico;
