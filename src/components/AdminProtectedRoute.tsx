
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { auth } from '@/config/firebase';
import { Loader2 } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, adminUser, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white mb-4" />
          <p className="text-slate-300">Validando credenciais administrativas com o servidor...</p>
        </div>
      </div>
    );
  }

  // 🛡️ Segurança: Exige que tanto o contexto quanto a sessão ativa do Firebase Auth existam
  if (!isAuthenticated || !adminUser || !auth.currentUser) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};
