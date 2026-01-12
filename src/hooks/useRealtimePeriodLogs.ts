import { useState, useEffect } from 'react';
import { firebaseLogService, FirebaseLog } from '@/services/FirebaseLogService';

export const useRealtimePeriodLogs = (startDate?: Date, endDate?: Date) => {
  const [logs, setLogs] = useState<FirebaseLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogsByPeriod = async (start: Date, end: Date) => {
    setIsLoading(true);
    try {
      console.log('useRealtimePeriodLogs: Buscando logs por período:', { start, end });
      const periodLogs = await firebaseLogService.getLogsByPeriod(start, end);
      setLogs(periodLogs);
    } catch (error) {
      console.error('useRealtimePeriodLogs: Erro ao buscar logs por período:', error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchLogsByPeriod(startDate, endDate);
    }
  }, [startDate, endDate]);

  return {
    logs,
    isLoading,
    fetchLogsByPeriod
  };
};