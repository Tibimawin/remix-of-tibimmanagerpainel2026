import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';

export const OnboardingSettings: React.FC = () => {
  const { restartOnboarding } = useOnboarding();

  const handleRestartTutorial = () => {
    restartOnboarding();
    toast.success("Tutorial reiniciado! O tutorial será exibido novamente na próxima atualização da página.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Tutorial Interativo
        </CardTitle>
        <CardDescription>
          Gerencie as configurações do tutorial de boas-vindas do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Reiniciar Tutorial</p>
            <p className="text-xs text-muted-foreground">
              Exibe novamente o tour interativo pelas funcionalidades do painel
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestartTutorial}
            className="ml-4"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reiniciar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};