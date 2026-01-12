
import { useState, useEffect } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { UserPermissions } from '@/types/planTypes';

export const useActivePlan = () => {
  const { userInfo } = useSimpleAuth();
  const [activePlan, setActivePlan] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivePlan = () => {
      if (!userInfo?.id) {
        setActivePlan(null);
        setLoading(false);
        return;
      }

      try {
        const savedPermissions = localStorage.getItem(`user-permissions-${userInfo.id}`);
        if (savedPermissions) {
          const permissions = JSON.parse(savedPermissions);
          console.log('Plano ativo encontrado:', permissions);
          setActivePlan(permissions);
        } else {
          console.log('Nenhum plano ativo encontrado para o usuário');
          setActivePlan(null);
        }
      } catch (error) {
        console.error('Erro ao carregar plano ativo:', error);
        setActivePlan(null);
      } finally {
        setLoading(false);
      }
    };

    loadActivePlan();
  }, [userInfo?.id]);

  const hasActivePlan = (planId: string): boolean => {
    return activePlan?.planId === planId;
  };

  const getActivePlanName = (): string | null => {
    return activePlan?.planName || null;
  };

  return {
    activePlan,
    loading,
    hasActivePlan,
    getActivePlanName
  };
};
