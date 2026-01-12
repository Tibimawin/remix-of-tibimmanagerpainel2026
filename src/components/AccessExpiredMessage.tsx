import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Mail, MessageCircle } from 'lucide-react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { AccessExpiredConfigService, defaultConfig, type AccessExpiredConfig } from '@/services/AccessExpiredConfigService';

interface AccessExpiredMessageProps {
  expiryDate?: string;
}

const AccessExpiredMessage: React.FC<AccessExpiredMessageProps> = ({ expiryDate }) => {
  const { logout } = useSimpleAuth();
  const [config, setConfig] = useState<AccessExpiredConfig>(defaultConfig);

  useEffect(() => {
    // Configurar listener em tempo real para mudanças na configuração
    const unsubscribe = AccessExpiredConfigService.onConfigChange((newConfig) => {
      setConfig(newConfig);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl text-foreground">{config.title}</CardTitle>
          <CardDescription>
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {expiryDate && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Expirado em: {new Date(expiryDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Como renovar seu acesso:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {config.instructions.map((instruction, index) => (
                <li key={index}>• {instruction}</li>
              ))}
            </ul>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-primary/10 rounded-lg">
            {config.contactType === 'email' ? (
              <Mail className="h-4 w-4 text-primary" />
            ) : (
              <MessageCircle className="h-4 w-4 text-primary" />
            )}
            <div className="text-sm">
              <p className="font-medium text-foreground">{config.contactLabel}</p>
              <p className="text-muted-foreground">{config.contactValue}</p>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              Verificar Novamente
            </Button>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={logout}
            >
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessExpiredMessage;