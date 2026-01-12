
import { useState, useEffect } from 'react';
import { logService, SystemLog } from '@/services/LogService';
import { userActivityService } from '@/services/UserActivityService';
import { firebaseLogService } from '@/services/FirebaseLogService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useUserActionHistory } from './useUserActionHistory';

export const useSystemLogs = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { userInfo } = useSimpleAuth();
  const { addAction } = useUserActionHistory();

  const refreshLogs = async () => {
    setIsLoading(true);
    try {
      console.log('useSystemLogs: Atualizando logs centralizados...');
      const updatedLogs = await logService.getLogs();
      setLogs(updatedLogs);
      console.log('useSystemLogs: Logs atualizados:', updatedLogs.length);
      console.log('useSystemLogs: Primeiros 3 logs:', updatedLogs.slice(0, 3));
    } catch (error) {
      console.error('useSystemLogs: Erro ao atualizar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addLog = async (action: string, details?: string) => {
    if (userInfo?.email && userInfo?.id) {
      try {
        console.log('useSystemLogs: Adicionando log com atividade:', { action, details, email: userInfo.email, userId: userInfo.id });
        
        // Registrar no Firebase (tempo real)
        await firebaseLogService.addLog(userInfo.email, action, details);
        
        // Registrar atividade completa do usuário
        await userActivityService.updateUserActivity(userInfo.id, 'action', `${action}${details ? ` - ${details}` : ''}`);
        
        // Manter compatibilidade com sistema antigo
        await logService.addLog(userInfo.email, action, details);
        
        // Registrar no histórico pessoal do usuário
        addAction(action, details || '', 'other', false);
        
        // Atualizar logs após adicionar
        await refreshLogs();
      } catch (error) {
        console.error('useSystemLogs: Erro ao adicionar log:', error);
      }
    } else {
      console.warn('useSystemLogs: Tentativa de adicionar log sem userInfo completo:', userInfo);
    }
  };

  const logUserLogin = async (email: string, userId?: string) => {
    try {
      console.log('useSystemLogs: Registrando login:', { email, userId });
      
      if (userId) {
        await userActivityService.updateUserActivity(userId, 'login');
      }
      
      // Registrar no Firebase (tempo real)
      const action = 'Login realizado com sucesso';
      const details = `Usuário ${email} fez login no sistema em ${new Date().toLocaleString('pt-BR')}`;
      await firebaseLogService.addLog(email, action, details);
      
      // Manter compatibilidade
      await logService.addLog(email, action, details);
      await refreshLogs();
    } catch (error) {
      console.error('useSystemLogs: Erro ao registrar login:', error);
    }
  };

  const logUserLogout = async (email: string, userId?: string) => {
    try {
      console.log('useSystemLogs: Registrando logout:', { email, userId });
      
      if (userId) {
        await userActivityService.updateUserActivity(userId, 'logout');
      }
      
      // Registrar no Firebase (tempo real)
      const action = 'Logout realizado';
      const details = `Usuário ${email} fez logout do sistema em ${new Date().toLocaleString('pt-BR')}`;
      await firebaseLogService.addLog(email, action, details);
      
      // Manter compatibilidade
      await logService.addLog(email, action, details);
    } catch (error) {
      console.error('useSystemLogs: Erro ao registrar logout:', error);
    }
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  return {
    logs,
    addLog,
    refreshLogs,
    isLoading,
    logUserLogin,
    logUserLogout
  };
};
