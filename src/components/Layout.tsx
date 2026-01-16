import React, { useState, useEffect } from 'react';
import { UserSidebar } from './user/UserSidebar';
import { UserHeader } from './user/UserHeader';
import { SuportePrioritario } from './SuportePrioritario';
import FloatingChat from './FloatingChat';
import { OnboardingTour } from './OnboardingTour';
import { ErrorBoundary } from './ErrorBoundary';
import ExpirationWarningBanner from './ExpirationWarningBanner';
import { AIAssistant } from './AIAssistant';
import { SeasonalThemeBanner, SeasonalThemeEffects } from './seasonal/SeasonalThemeWrapper';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useEnhancedActionHistory } from '@/hooks/useEnhancedActionHistory';
import { useActionNotifier } from '@/hooks/useActionNotifier';
import { useScheduleExecutor } from '@/hooks/useScheduleExecutor';
import { useExpirationMonitor } from '@/hooks/useExpirationMonitor';
import { useAITracking } from '@/hooks/useAITracking';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { Button } from '@/components/ui/button';
import { Crown, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useZoom } from '@/hooks/useZoom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [showPrioritySupport, setShowPrioritySupport] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { hasPrioritySupport } = useUserPermissions();
  const { logAction } = useEnhancedActionHistory();
  const { requestPermission, isSupported, getPermissionStatus } = useActionNotifier();
  const { userInfo } = useSimpleAuth();
  const isMobile = useIsMobile();
  const { zoom } = useZoom();

  // Hook para executar agendamentos automaticamente
  useScheduleExecutor();

  // Hook para monitorar expirações e enviar notificações (apenas se usuário logado)
  useExpirationMonitor();

  // Hook para rastrear ações do usuário para a IA
  useAITracking();

  // Solicitar permissão de notificação ao carregar (apenas uma vez)
  useEffect(() => {
    const hasAskedPermission = localStorage.getItem('notification_permission_asked');

    if (!hasAskedPermission && isSupported()) {
      // Esperar 3 segundos após o carregamento para não ser intrusivo
      const timer = setTimeout(async () => {
        const currentStatus = getPermissionStatus();

        if (currentStatus === 'default') {
          toast.info('Ative as notificações', {
            description: 'Receba alertas sobre ações importantes no painel',
            duration: 8000,
            action: {
              label: 'Ativar',
              onClick: async () => {
                await requestPermission();
                localStorage.setItem('notification_permission_asked', 'true');
              }
            }
          });

          localStorage.setItem('notification_permission_asked', 'true');
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isSupported, requestPermission, getPermissionStatus]);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <ErrorBoundary>
      <div 
        className="min-h-screen bg-background origin-top-left transition-transform duration-200"
        style={{ 
          transform: `scale(${zoom / 100})`,
          width: `${10000 / zoom}%`,
        }}
      >
        <UserHeader onToggleSidebar={handleToggleSidebar} isCollapsed={isCollapsed} />
        <div className="flex">
          <UserSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} isMobile={isMobile} />
          <main className={cn(
            "flex-1 p-6 transition-all duration-300 min-h-[calc(100vh-4rem)]",
            isCollapsed
              ? (isMobile ? "ml-0" : "ml-20")
              : (isMobile ? "ml-0" : "ml-80")
          )}>
            {/* Botão de Suporte Prioritário fixo */}
            {hasPrioritySupport() && (
              <div className="fixed bottom-6 left-6 z-50">
                <Button
                  onClick={() => {
                    setShowPrioritySupport(!showPrioritySupport);
                    if (!showPrioritySupport) {
                      logAction('Suporte Prioritário', 'Abriu painel de suporte prioritário', 'other');
                    }
                  }}
                  className="modern-button bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-full p-4 shadow-soft hover-lift"
                  title="Suporte Prioritário"
                >
                  <Crown className="h-6 w-6" />
                </Button>
              </div>
            )}

            {/* Modal/Card de Suporte Prioritário */}
            {showPrioritySupport && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40 p-4 modern-animate-in">
                <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
                  <div className="modern-card bg-card/95 backdrop-blur-xl relative">
                    <Button
                      onClick={() => setShowPrioritySupport(false)}
                      variant="ghost"
                      className="absolute top-4 right-4 z-50 rounded-full w-10 h-10 p-0 modern-button bg-red-500 hover:bg-red-600 text-white shadow-minimal"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                    <div className="pr-16">
                      <SuportePrioritario isVisible={true} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Banner de Aviso de Expiração */}
            <ExpirationWarningBanner
              showDismiss={true}
              onRenewClick={() => window.location.href = '/precos'}
            />

            {/* 🎨 Banner de Tema Sazonal */}
            <SeasonalThemeBanner />

            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>

        {/* Chat Flutuante */}
        <FloatingChat />

        {/* Assistente IA */}
        <AIAssistant />

        {/* 🎨 Efeitos do Tema Sazonal (partículas e decorações) */}
        <SeasonalThemeEffects />

        {/* Tutorial de Onboarding */}
        <OnboardingTour />
      </div>
    </ErrorBoundary>
  );
};
