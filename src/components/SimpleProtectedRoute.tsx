
import { Navigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useSessionValidator } from '@/hooks/useSessionValidator';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useAccessControl } from '@/hooks/useAccessControl';
import { MaintenancePage } from './MaintenancePage';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
  /** @deprecated Mantido por compatibilidade — expirados agora navegam livremente; o bloqueio acontece via permissões/sidebar. */
  allowExpired?: boolean;
}

export const SimpleProtectedRoute: React.FC<SimpleProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useSimpleAuth();
  const { maintenanceState, loading: maintenanceLoading, isMaintenanceActive } = useMaintenanceMode();
  const { isChecking } = useAccessControl();
  
  // Validar sessão ativa em tempo real
  useSessionValidator();
  
  // Gerenciar sessão com expiração de 1 hora
  useSessionManager();

  if (isLoading || maintenanceLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Check maintenance mode first (before authentication check)
  if (isMaintenanceActive && maintenanceState) {
    return (
      <MaintenancePage
        message={maintenanceState.message}
        estimatedEnd={maintenanceState.estimatedEnd}
        startTime={maintenanceState.startTime}
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Usuários com assinatura expirada navegam normalmente — o bloqueio das
  // funcionalidades pagas é feito via permissões (sidebar/itens desabilitados)
  // e pelo SubscriptionExpiredBanner exibido no Layout.
  return <>{children}</>;
};
