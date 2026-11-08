import { useState, useEffect } from 'react';
import { firebaseLogService, FirebaseLog } from '@/services/FirebaseLogService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

export const useRealtimeLogs = () => {
  const [logs, setLogs] = useState<FirebaseLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userInfo } = useSimpleAuth();

  useEffect(() => {
    console.log('useRealtimeLogs: Configurando listener em tempo real...');
    setIsLoading(true);

    const unsubscribe = firebaseLogService.onLogsChange((updatedLogs) => {
      console.log('useRealtimeLogs: Logs atualizados:', updatedLogs.length);
      setLogs(updatedLogs);
      setIsLoading(false);
    });

    // Cleanup function
    return () => {
      console.log('useRealtimeLogs: Removendo listener...');
      unsubscribe();
    };
  }, []);

  const addLog = async (action: string, details?: string) => {
    if (userInfo?.email) {
      try {
        console.log('useRealtimeLogs: Adicionando log:', { action, details, email: userInfo.email });
        await firebaseLogService.addLog(userInfo.email, action, details);
      } catch (error) {
        console.error('useRealtimeLogs: Erro ao adicionar log:', error);
      }
    } else {
      console.warn('useRealtimeLogs: Tentativa de adicionar log sem userInfo:', userInfo);
    }
  };

  return {
    logs,
    addLog,
    isLoading
  };
};