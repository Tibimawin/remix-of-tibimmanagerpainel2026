import React, { useState, useEffect } from 'react';
import { FloatingSidebar } from './user/FloatingSidebar';
import { GlassHeader } from './user/GlassHeader';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [showPrioritySupport, setShowPrioritySupport] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { hasPrioritySupport } = useUserPermissions();
  const { logAction } = useEnhancedActionHistory();
  const { requestPermission, isSupported, getPermissionStatus } = useActionNotifier();
  const { userInfo } = useSimpleAuth();
  const isMobile = useIsMobile();

  useScheduleExecutor();
  useExpirationMonitor();
  useAITracking();

  useEffect(() => {
    const hasAskedPermission = localStorage.getItem('notification_permission_asked');
    if (!hasAskedPermission && isSupported()) {
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

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Floating orbs for visual depth */}
        <div className="orb orb-primary opacity-20" />
        <div className="orb orb-accent opacity-15" />

        <GlassHeader onToggleSidebar={toggleSidebar} sidebarVisible={sidebarVisible} />
        <FloatingSidebar isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} isMobile={isMobile} />

        {/* Sidebar Trigger - always visible on left edge */}
        <div
          className="sidebar-trigger"
          onMouseEnter={() => setSidebarVisible(true)}
          onClick={toggleSidebar}
        />

        <main className="pt-20 px-4 md:px-8 pb-8 min-h-[calc(100vh-5rem)]">
          {hasPrioritySupport() && (
            <div className="fixed bottom-6 right-6 z-50">
              <Button
                onClick={() => {
                  setShowPrioritySupport(!showPrioritySupport);
                  if (!showPrioritySupport) {
                    logAction('Suporte Prioritário', 'Abriu painel de suporte prioritário', 'other');
                  }
                }}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-full p-4 shadow-lg hover-lift gradient-glow"
              >
                <Crown className="h-6 w-6" />
              </Button>
            </div>
          )}

          {showPrioritySupport && (
            <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-40 p-4 animate-fade-in">
              <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
                <div className="glass-card relative p-6">
                  <Button
                    onClick={() => setShowPrioritySupport(false)}
                    variant="ghost"
                    className="absolute top-4 right-4 z-50 rounded-full w-10 h-10 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <SuportePrioritario isVisible={true} />
                </div>
              </div>
            </div>
          )}

          <ExpirationWarningBanner showDismiss={true} onRenewClick={() => window.location.href = '/precos'} />
          <SeasonalThemeBanner />

          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        <FloatingChat />
        <AIAssistant />
        <SeasonalThemeEffects />
        <OnboardingTour />
      </div>
    </ErrorBoundary>
  );
};