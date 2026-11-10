
import { Navigate, Outlet } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useSessionValidator } from '@/hooks/useSessionValidator';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { MaintenancePage } from './MaintenancePage';

interface SimpleProtectedRouteProps {
  children?: React.ReactNode;
  /** @deprecated Mantido por compatibilidade — expirados agora navegam livremente; o bloqueio acontece via permissões/sidebar. */
  allowExpired?: boolean;
}

export const SimpleProtectedRoute: React.FC<SimpleProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useSimpleAuth();
  const { maintenanceState, isMaintenanceActive } = useMaintenanceMode();

  // Validar sessão ativa em tempo real
  useSessionValidator();

  // Gerenciar sessão
  useSessionManager();

  // Só exibir loading se realmente não há sessão hidratada ainda
  if (!isAuthenticated && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  // Check maintenance mode
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
  return <>{children ?? <Outlet />}</>;
};
