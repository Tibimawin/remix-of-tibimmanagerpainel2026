
import React from 'react';
import SystemMetricsCards from '@/components/SystemMetricsCards';
import { UserOffers } from '@/components/UserOffers';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { PermissionGate } from '@/components/PermissionGate';
import { useConfig } from '@/contexts/ConfigContext';
import ExpirationWarningBanner from '@/components/ExpirationWarningBanner';
import UserAnnouncementsBanner from '@/components/UserAnnouncementsBanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CreditCard, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { loading } = useUserPermissions();
  const { config, isConfigured } = useConfig();
  const navigate = useNavigate();
  const [showPaymentBanner, setShowPaymentBanner] = React.useState(() => {
    return localStorage.getItem('dismiss-payment-banner') !== 'true';
  });

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 modern-loading rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 modern-loading rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }



  return (
    <PermissionGate feature="dashboard">
      <div className="w-full space-y-6 animate-fade-in">
        {/* Banner de Expiração */}
        <ExpirationWarningBanner
          onRenewClick={() => {
            window.location.href = '/precos';
          }}
        />

        {/* Anúncios do Sistema */}
        <UserAnnouncementsBanner />

        {/* Banner Nova Funcionalidade - Pagamento pelo Painel */}
        {showPaymentBanner && (
          <Alert className="border-primary/30 bg-primary/5 relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <AlertDescription className="text-foreground">
                  <p className="font-semibold text-sm">🎉 Novidade! Pagamento de assinatura pelo painel</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Agora você pode renovar ou assinar seu plano diretamente pela aba de Pagamentos no seu perfil, via PIX.
                  </p>
                </AlertDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5"
                  onClick={() => navigate('/perfil')}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Ver Pagamentos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setShowPaymentBanner(false);
                    localStorage.setItem('dismiss-payment-banner', 'true');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Header da Página */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-1 h-8 bg-gradient-to-b from-primary to-orange-500 rounded-full"></div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground font-medium">
                Visão geral e métricas do sistema
              </p>
            </div>
          </div>
        </div>


        {/* Métricas do Sistema */}
        <div className="space-y-6">
          <div className="modern-card p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-1 h-6 bg-gradient-to-b from-primary to-orange-500 rounded-full"></div>
              <h2 className="text-xl font-bold text-foreground">Métricas do Sistema</h2>
            </div>
            <SystemMetricsCards />
          </div>
        </div>

        {/* Ofertas Especiais */}
        <div className="space-y-6">
          <div className="modern-card p-6 backdrop-blur-sm">
            <UserOffers />
          </div>
        </div>
      </div>
    </PermissionGate>
  );
};

export default Dashboard;
