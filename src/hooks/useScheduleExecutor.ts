import { useEffect } from 'react';
import { ScheduledCleanupService } from '@/services/ScheduledCleanupService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

/**
 * Hook para executar verificações de agendamentos automaticamente
 * Verifica a cada 30 segundos se há agendamentos para executar
 */
export const useScheduleExecutor = () => {
  const { userInfo } = useSimpleAuth();

  useEffect(() => {
    if (!userInfo?.id) {
      console.log('Verificador de agendamentos não iniciado: usuário não autenticado.');
      return;
    }

    console.log('Iniciando verificador de agendamentos para usuário:', userInfo.id);

    // Verificação inicial com pequeno atraso para não disputar com o carregamento do painel
    const initialTimeout = setTimeout(() => {
      ScheduledCleanupService.checkAndExecuteSchedules(userInfo.id);
    }, 30000);
    
    // Verificar a cada 10 minutos para reduzir chamadas repetidas
    const interval = setInterval(() => {
      ScheduledCleanupService.checkAndExecuteSchedules(userInfo.id);
    }, 600000); // 10 minutos
    
    return () => {
      console.log('Parando verificador de agendamentos para usuário:', userInfo.id);
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [userInfo?.id]);
};