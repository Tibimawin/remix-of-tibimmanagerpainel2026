
import React from 'react';
import SystemMetricsCards from '@/components/SystemMetricsCards';
import { UserOffers } from '@/components/UserOffers';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { PermissionGate } from '@/components/PermissionGate';
import ExpirationWarningBanner from '@/components/ExpirationWarningBanner';
import UserAnnouncementsBanner from '@/components/UserAnnouncementsBanner';
import NewContentBanner from '@/components/NewContentBanner';
import NewContentDialog from '@/components/NewContentDialog';
import NewContentList from '@/components/NewContentList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNewContentNotifications } from '@/hooks/useNewContentNotifications';
import { CreditCard, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { loading } = useUserPermissions();
  const navigate = useNavigate();
  const [showPaymentBanner, setShowPaymentBanner] = React.useState(() => {
    return localStorage.getItem('dismiss-payment-banner') !== 'true';
  });
  const {
    newItems,
    newCount,
    hasNewContent,
    shouldShowPopup,
    markAllAsSeen,
    dismissPopup,
  } = useNewContentNotifications();
  const [isNewContentDialogOpen, setIsNewContentDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (shouldShowPopup && hasNewContent) {
      setIsNewContentDialogOpen(true);
    }
  }, [hasNewContent, shouldShowPopup]);

  const handleViewNewContent = React.useCallback(() => {
    dismissPopup();
    setIsNewContentDialogOpen(false);

    window.setTimeout(() => {
      document.getElementById('novidades-conteudos')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  }, [dismissPopup]);

  const handleDialogOpenChange = React.useCallback((open: boolean) => {
    setIsNewContentDialogOpen(open);
    if (!open) {
      dismissPopup();
    }
  }, [dismissPopup]);

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
        <ExpirationWarningBanner
          onRenewClick={() => {
            window.location.href = '/precos';
          }}
        />

        <NewContentBanner
          count={newCount}
          onView={handleViewNewContent}
          onMarkAllAsSeen={markAllAsSeen}
        />

        <NewContentDialog
          open={isNewContentDialogOpen}
          items={newItems}
          onOpenChange={handleDialogOpenChange}
          onView={handleViewNewContent}
          onMarkAllAsSeen={() => {
            markAllAsSeen();
            setIsNewContentDialogOpen(false);
          }}
        />

        <UserAnnouncementsBanner />

        {showPaymentBanner && (
          <Alert className="relative border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <AlertDescription className="text-foreground">
                  <p className="text-sm font-semibold">🎉 Novidade! Pagamento de assinatura pelo painel</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
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

        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary to-orange-500"></div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="font-medium text-muted-foreground">
                Visão geral e métricas do sistema
              </p>
            </div>
          </div>
        </div>

        {hasNewContent && (
          <NewContentList
            items={newItems}
            onMarkAllAsSeen={markAllAsSeen}
          />
        )}

        <div className="space-y-6">
          <div className="modern-card p-6 backdrop-blur-sm">
            <div className="mb-6 flex items-center space-x-3">
              <div className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-orange-500"></div>
              <h2 className="text-xl font-bold text-foreground">Métricas do Sistema</h2>
            </div>
            <SystemMetricsCards />
          </div>
        </div>

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
