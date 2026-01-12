
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Crown, Shield, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { usePlans } from '@/hooks/usePlans';
import { useActivePlan } from '@/hooks/useActivePlan';
import WhatsAppQRDialog from '@/components/WhatsAppQRDialog';

const Precos = () => {
  const { activePlans, loading } = usePlans();
  const { hasActivePlan } = useActivePlan();
  const [showWhatsAppQR, setShowWhatsAppQR] = useState(false);
  const [selectedPlanForWhatsApp, setSelectedPlanForWhatsApp] = useState<string | undefined>(undefined);

  const handleRequestPlan = (planName: string) => {
    setSelectedPlanForWhatsApp(planName);
    setShowWhatsAppQR(true);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header em estilo Markdown */}
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              # Nossos Planos
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-pink-600 mx-auto rounded-full"></div>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Escolha o plano ideal para suas necessidades e aguarde a liberação do administrador. 
            Oferecemos soluções personalizadas para cada tipo de usuário.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mx-auto max-w-3xl">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">ℹ</span>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Como funciona o processo?
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Após solicitar um plano, o administrador irá manualmente liberar as permissões 
                  no painel administrativo. Você receberá uma notificação quando sua solicitação for processada.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Plans Grid em estilo Markdown */}
        <div className={`grid grid-cols-1 ${activePlans.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-8`}>
          {activePlans.map((plan, index) => {
            const getColor = (index: number) => {
              const colors = ['green', 'blue', 'purple'];
              return colors[index % colors.length];
            };
            
            const getIcon = (index: number) => {
              const icons = [Shield, Star, Crown];
              return icons[index % icons.length];
            };
            
            const IconComponent = getIcon(index);
            const color = getColor(index);
            const isCurrentPlan = hasActivePlan(plan.id);
            
            return (
              <Card key={plan.id} className={`relative border-2 border-${color}-200 dark:border-${color}-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                <CardHeader className="text-center space-y-4 pb-6">
                  <div className="flex items-center justify-center space-x-2">
                    <IconComponent className={`h-8 w-8 text-${color}-600`} />
                    <CardTitle className={`text-2xl font-bold text-${color}-700 dark:text-${color}-400`}>
                      **{plan.name}**
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className={`border-${color}-300 text-${color}-700 dark:text-${color}-400 px-4 py-1`}>
                    {plan.description}
                  </Badge>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className={`bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-800 rounded-lg p-4`}>
                    <blockquote className={`text-sm text-${color}-800 dark:text-${color}-200 italic`}>
                      "{plan.price}"
                    </blockquote>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">## Recursos inclusos:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {plan.features.slice(0, 4).map((featureId) => (
                        <li key={featureId} className="flex items-center space-x-2">
                          <Check className={`h-4 w-4 text-${color}-600 flex-shrink-0`} />
                          <span>
                            - {featureId === 'import' && 'Importação de M3U'}
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
                      <li className="flex items-center space-x-2">
                        <Check className={`h-4 w-4 text-${color}-600 flex-shrink-0`} />
                        <span>- {plan.monthlyContentLimit === -1 ? 'Conteúdos ilimitados' : `Até ${plan.monthlyContentLimit} conteúdos/mês`}</span>
                      </li>
                    </ul>
                  </div>

                  <Button 
                    onClick={() => handleRequestPlan(plan.name)}
                    disabled={isCurrentPlan}
                    className={`w-full bg-${color}-600 hover:bg-${color}-700 text-white py-3 rounded-lg font-medium transition-colors ${isCurrentPlan ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isCurrentPlan ? 'Plano Atual' : `[Solicitar ${plan.name}]`}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Process Info em estilo Markdown */}
        <div className="text-center space-y-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-semibold text-amber-800 dark:text-amber-200 mb-6">
              ### Como funciona o processo?
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-amber-700 dark:text-amber-300">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto">
                  1
                </div>
                <p className="font-medium">Escolha seu plano</p>
                <p className="text-sm">Selecione o plano que melhor atende suas necessidades</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto">
                  2
                </div>
                <p className="font-medium">Aguarde aprovação</p>
                <p className="text-sm">Nossa equipe analisará sua solicitação</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto">
                  3
                </div>
                <p className="font-medium">Comece a usar</p>
                <p className="text-sm">Receba as permissões e acesse todos os recursos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold text-foreground">
            Pronto para começar?
          </h3>
          <p className="text-muted-foreground">
            Escolha seu plano ideal e dê o primeiro passo para transformar sua gestão de conteúdo.
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

export default Precos;
