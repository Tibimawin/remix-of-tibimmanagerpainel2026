
import { useCallback } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

const SESSION_KEY = 'user-session-timestamp';

// ✅ Timer de expiração removido — sessão gerenciada pelo Firebase Auth
// O Firebase renova o token automaticamente e persiste no localStorage
export const useSessionManager = () => {
  const { isAuthenticated } = useSimpleAuth();

  const updateSessionTimestamp = useCallback(() => {
    if (isAuthenticated) {
      localStorage.setItem(SESSION_KEY, Date.now().toString());
    }
  }, [isAuthenticated]);

  const getSessionRemainingTime = useCallback(() => {
    // Retorna Infinity — sem expiração por inatividade
    return Infinity;
  }, []);

  const isSessionExpired = useCallback(() => {
    // Nunca expira automaticamente — só logout manual
    return false;
  }, []);

  const shouldShowWarning = useCallback(() => {
    return false;
  }, []);

  const extendSession = useCallback(() => {
    updateSessionTimestamp();
  }, [updateSessionTimestamp]);

  const checkSession = useCallback(() => {
    // Sem logout automático por inatividade
    return true;
  }, []);

  return {
    getSessionRemainingTime,
    isSessionExpired,
    shouldShowWarning,
    extendSession,
    checkSession,
    updateSessionTimestamp
  };
};
