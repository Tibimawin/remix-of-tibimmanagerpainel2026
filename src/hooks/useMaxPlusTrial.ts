import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { MaxPlusTrialService, MaxPlusTrialInfo } from '@/services/MaxPlusTrialService';

export const useMaxPlusTrial = () => {
  const { userInfo } = useSimpleAuth();
  const { permissions, isSubscriptionExpired, refreshPermissions } = useUserPermissions();

  const userId = userInfo?.id;
  const firestoreStart = permissions?.maxplusTrialStartedAt;

  // Verifica se o usuário tem acesso pago/permanente ativo
  const hasPermanentAccess = useMemo(() => {
    if (isSubscriptionExpired) return false;
    return !!(
      permissions?.enabledFeatures?.includes('maxplus') ||
      permissions?.enabledFeatures?.includes('maxplus-import')
    );
  }, [permissions, isSubscriptionExpired]);

  const [trialInfo, setTrialInfo] = useState<MaxPlusTrialInfo>(() => {
    return MaxPlusTrialService.getTrialInfo(userId, firestoreStart);
  });

  // Atualiza estado do teste
  const syncTrialState = useCallback(() => {
    const info = MaxPlusTrialService.getTrialInfo(userId, firestoreStart);
    setTrialInfo(info);
    return info;
  }, [userId, firestoreStart]);

  // Iniciar teste se ainda não começou
  useEffect(() => {
    if (hasPermanentAccess) return;

    const current = MaxPlusTrialService.getTrialInfo(userId, firestoreStart);
    if (!current.hasStarted) {
      MaxPlusTrialService.startTrial(userId).then(newInfo => {
        setTrialInfo(newInfo);
      });
    } else {
      setTrialInfo(current);
    }
  }, [userId, firestoreStart, hasPermanentAccess]);

  // Timer de 1 segundo para atualizar o contador regressivo em tempo real
  useEffect(() => {
    if (hasPermanentAccess) return;

    // Se ainda não iniciou ou já expirou, verifica a cada 5s
    const intervalTime = trialInfo.isActive ? 1000 : 5000;

    const timer = setInterval(() => {
      const updated = syncTrialState();
      if (updated.isExpired && trialInfo.isActive) {
        // Expirou neste instante! Atualizar permissões do usuário
        refreshPermissions();
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [hasPermanentAccess, syncTrialState, trialInfo.isActive, refreshPermissions]);

  const formattedRemaining = useMemo(() => {
    return MaxPlusTrialService.formatRemainingTime(trialInfo.remainingSeconds);
  }, [trialInfo.remainingSeconds]);

  return {
    hasPermanentAccess,
    trialInfo,
    formattedRemaining,
    remainingSeconds: trialInfo.remainingSeconds,
    isTrialActive: trialInfo.isActive,
    isTrialExpired: trialInfo.isExpired,
    hasStarted: trialInfo.hasStarted,
    syncTrialState
  };
};
