import React from 'react';
import { Shield } from 'lucide-react';
import { NotificationSettings } from '@/components/NotificationSettings';

const ConfiguracoesSeguranca = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-4 animate-fade-in">
            <div>
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                Configurações de Segurança
              </h1>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
                Gerencie notificações push e controle de alertas de ações do sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NotificationSettings />
      </div>
    </div>
  );
};

export default ConfiguracoesSeguranca;
