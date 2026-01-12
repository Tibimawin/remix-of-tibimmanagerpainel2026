import { useState, useEffect } from 'react';
import { firebaseLogService, FirebaseLog } from '@/services/FirebaseLogService';

export const useRealtimeActivities = () => {
  const [activities, setActivities] = useState<FirebaseLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('useRealtimeActivities: Configurando listener para atividades recentes...');
    setIsLoading(true);

    const unsubscribe = firebaseLogService.onRecentActivitiesChange((updatedActivities) => {
      console.log('useRealtimeActivities: Atividades recentes atualizadas:', updatedActivities.length);
      setActivities(updatedActivities);
      setIsLoading(false);
    });

    // Cleanup function
    return () => {
      console.log('useRealtimeActivities: Removendo listener de atividades...');
      unsubscribe();
    };
  }, []);

  return {
    activities,
    isLoading
  };
};