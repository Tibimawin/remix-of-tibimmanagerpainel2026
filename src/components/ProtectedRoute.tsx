
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useConfig } from '@/contexts/ConfigContext';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { FirebaseUserService } from '@/services/FirebaseUserService';
import AccessExpiredMessage from './AccessExpiredMessage';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { MaintenancePage } from './MaintenancePage';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isConfigured } = useConfig();
  const { userInfo, isLoading } = useSimpleAuth();
  const { maintenanceState, loading: maintenanceLoading, isMaintenanceActive } = useMaintenanceMode();
  const { adminUser } = useAdminAuth();
  const isAdmin = !!adminUser;
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!userInfo?.id) {
        setIsCheckingAccess(false);
        return;
      }

      try {
        console.log('Verificando acesso para usuário:', userInfo.id);
        
        // Verificar se o usuário tem acesso válido
        const hasValidAccess = await FirebaseUserService.checkUserAccess(userInfo.id);
        
        if (!hasValidAccess) {
          // Buscar dados do usuário para mostrar data de expiração
          const userData = await FirebaseUserService.getUserById(userInfo.id);
          if (userData) {
            setExpiryDate(userData.expiryDate);
          }
        }
        
        setHasAccess(hasValidAccess);
      } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    if (userInfo?.id) {
      checkUserAccess();
    }
  }, [userInfo?.id]);

  // Loading states
  if (isLoading || isCheckingAccess || maintenanceLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!userInfo) {
    return <Navigate to="/login" replace />;
  }

  // Check maintenance mode (only for regular users, not admins)
  console.log('Verificando manutenção:', { isMaintenanceActive, maintenanceState, isAdmin });
  if (!isAdmin && isMaintenanceActive && maintenanceState) {
    console.log('Exibindo página de manutenção para usuário não-admin');
    return (
      <MaintenancePage
        message={maintenanceState.message}
        estimatedEnd={maintenanceState.estimatedEnd}
        startTime={maintenanceState.startTime}
      />
    );
  }

  // Assinatura expirada: NÃO bloquear toda a navegação. As funcionalidades pagas
  // ficam desabilitadas via permissões e o banner de renovação é exibido no Layout.
  void hasAccess;
  void expiryDate;

  // If not configured, redirect to settings
  if (!isConfigured) {
    return <Navigate to="/configuracoes" replace />;
  }

  // Has access and is configured
  return <>{children}</>;
};
