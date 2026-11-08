import { useState, useEffect } from 'react';
import { activeSessionService, ActiveSession } from '@/services/ActiveSessionService';

export const useActiveSessions = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const activeSessions = await activeSessionService.getActiveSessions();
      setSessions(activeSessions);
      
      const online = activeSessions.filter(session => session.isOnline).length;
      setOnlineCount(online);
      
      console.log('Sessões carregadas:', activeSessions.length, 'Online:', online);
    } catch (error) {
      console.error('Erro ao carregar sessões ativas:', error);
      setSessions([]);
      setOnlineCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const forceLogout = async (userId: string, email: string) => {
    try {
      await activeSessionService.forceLogout(userId, email);
      // Recarregar sessões após logout forçado
      await loadSessions();
      return true;
    } catch (error) {
      console.error('Erro ao forçar logout:', error);
      return false;
    }
  };

  useEffect(() => {
    loadSessions();

    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      loadSessions();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    sessions,
    isLoading,
    onlineCount,
    refreshSessions: loadSessions,
    forceLogout
  };
};