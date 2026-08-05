import { useEffect } from 'react';
import { JogosDiaScheduleService } from '@/services/JogosDiaScheduleService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useGlobalJogosDiaConfig } from '@/hooks/useGlobalJogosDiaConfig';

export const useJogosDiaScheduleExecutor = () => {
  const { userInfo } = useSimpleAuth();
  const { globalConfig } = useGlobalJogosDiaConfig();

  useEffect(() => {
    if (!userInfo?.id || !globalConfig?.isActive) return;

    const interval = setInterval(() => {
      JogosDiaScheduleService.checkAndExecuteForUser(userInfo.id, userInfo.email);
    }, 60000); // Checa a cada minuto

    return () => clearInterval(interval);
  }, [userInfo?.id, globalConfig?.isActive]);
};
