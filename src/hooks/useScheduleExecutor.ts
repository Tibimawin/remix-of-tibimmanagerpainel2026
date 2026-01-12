import { useEffect } from 'react';
import { ScheduledCleanupService } from '@/services/ScheduledCleanupService';

/**
 * Hook para executar verificações de agendamentos automaticamente
 * Verifica a cada 30 segundos se há agendamentos para executar
 */
export const useScheduleExecutor = () => {
  useEffect(() => {
    console.log('Iniciando verificador de agendamentos...');
    
    // Verificação inicial
    ScheduledCleanupService.checkAndExecuteSchedules();
    
    // Verificar a cada 30 segundos
    const interval = setInterval(() => {
      ScheduledCleanupService.checkAndExecuteSchedules();
    }, 30000); // 30 segundos
    
    return () => {
      console.log('Parando verificador de agendamentos...');
      clearInterval(interval);
    };
  }, []);
};