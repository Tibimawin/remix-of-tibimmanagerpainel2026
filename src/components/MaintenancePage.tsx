import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MaintenancePageProps {
  message?: string;
  estimatedEnd?: string;
  startTime?: string;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  message = 'Sistema em manutenção',
  estimatedEnd,
  startTime
}) => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center border border-orange-500/30">
                  <AlertTriangle className="w-10 h-10 text-orange-500 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full animate-bounce"></div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-foreground mb-2">
              Sistema em Manutenção
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Estamos trabalhando para melhorar sua experiência
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Mensagem Principal */}
            <div className="text-center p-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-foreground text-lg font-medium leading-relaxed">
                {message}
              </p>
            </div>

            {/* Informações de Tempo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {startTime && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">Iniciado em</span>
                  </div>
                  <p className="text-foreground font-mono text-sm">
                    {formatDate(startTime)}
                  </p>
                </div>
              )}

              {estimatedEnd && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-muted-foreground">Previsão de retorno</span>
                  </div>
                  <p className="text-foreground font-mono text-sm">
                    {formatDate(estimatedEnd)}
                  </p>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex-1 modern-button"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar Novamente
              </Button>
              
              <Button
                onClick={() => navigate('/')}
                className="flex-1 modern-button"
              >
                <Home className="w-4 h-4 mr-2" />
                Página Inicial
              </Button>
            </div>

            {/* Informações Adicionais */}
            <div className="text-center text-sm text-muted-foreground border-t border-border/40 pt-4">
              <p>
                Nossa equipe está trabalhando para resolver isso o mais rápido possível.
              </p>
              <p className="mt-1">
                Obrigado pela sua paciência!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Animação de loading sutil */}
        <div className="flex justify-center mt-8">
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};