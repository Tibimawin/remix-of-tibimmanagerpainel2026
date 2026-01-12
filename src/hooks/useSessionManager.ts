
import { useEffect, useCallback } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

const SESSION_DURATION = 60 * 60 * 1000; // 1 hora em millisegundos
const SESSION_KEY = 'user-session-timestamp';
const WARNING_TIME = 5 * 60 * 1000; // 5 minutos antes da expiração

export const useSessionManager = () => {
  const { isAuthenticated, logout } = useSimpleAuth();

  const updateSessionTimestamp = useCallback(() => {
    if (isAuthenticated) {
      localStorage.setItem(SESSION_KEY, Date.now().toString());
    }
  }, [isAuthenticated]);

  const getSessionRemainingTime = useCallback(() => {
    const timestamp = localStorage.getItem(SESSION_KEY);
    if (!timestamp) return 0;
    
    const sessionStart = parseInt(timestamp);
    const elapsed = Date.now() - sessionStart;
    const remaining = SESSION_DURATION - elapsed;
    
    return Math.max(0, remaining);
  }, []);

  const isSessionExpired = useCallback(() => {
    return getSessionRemainingTime() <= 0;
  }, [getSessionRemainingTime]);

  const shouldShowWarning = useCallback(() => {
    const remaining = getSessionRemainingTime();
    return remaining > 0 && remaining <= WARNING_TIME;
  }, [getSessionRemainingTime]);

  const extendSession = useCallback(() => {
    updateSessionTimestamp();
  }, [updateSessionTimestamp]);

  const checkSession = useCallback(() => {
    if (isAuthenticated && isSessionExpired()) {
      logout();
      return false;
    }
    return true;
  }, [isAuthenticated, isSessionExpired, logout]);

  // Verificar sessão periodicamente
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      checkSession();
    }, 30000); // Verificar a cada 30 segundos

    return () => clearInterval(interval);
  }, [isAuthenticated, checkSession]);

  // Atualizar timestamp da sessão em atividades do usuário
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUserActivity = () => {
      updateSessionTimestamp();
    };

    // Eventos que indicam atividade do usuário
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Inicializar timestamp se não existir
    if (!localStorage.getItem(SESSION_KEY)) {
      updateSessionTimestamp();
    }

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isAuthenticated, updateSessionTimestamp]);

  return {
    getSessionRemainingTime,
    isSessionExpired,
    shouldShowWarning,
    extendSession,
    checkSession,
    updateSessionTimestamp
  };
};
