import { useEffect, useState, useCallback } from 'react';
import { scheduledNotificationService, type ScheduledNotification } from '@/services/ScheduledNotificationService';
import { toast } from 'sonner';

export const useScheduledNotifications = () => {
  const [schedules, setSchedules] = useState<ScheduledNotification[]>([]);

  useEffect(() => {
    // Carregar agendamentos
    loadSchedules();

    // Iniciar scheduler
    scheduledNotificationService.startScheduler();

    return () => {
      scheduledNotificationService.stopScheduler();
    };
  }, []);

  const loadSchedules = useCallback(() => {
    const allSchedules = scheduledNotificationService.getSchedules();
    setSchedules(allSchedules);
  }, []);

  const addSchedule = useCallback((
    schedule: Omit<ScheduledNotification, 'id' | 'createdAt' | 'nextRun'>
  ) => {
    try {
      const newSchedule = scheduledNotificationService.addSchedule(schedule);
      loadSchedules();
      toast.success(`${newSchedule.title} foi agendado com sucesso.`);
      return newSchedule;
    } catch (error) {
      toast.error('Não foi possível criar o agendamento.');
      return null;
    }
  }, [loadSchedules]);

  const updateSchedule = useCallback((
    id: string,
    updates: Partial<ScheduledNotification>
  ) => {
    const success = scheduledNotificationService.updateSchedule(id, updates);
    if (success) {
      loadSchedules();
      toast.success('Agendamento atualizado com sucesso.');
    }
    return success;
  }, [loadSchedules]);

  const removeSchedule = useCallback((id: string) => {
    const success = scheduledNotificationService.removeSchedule(id);
    if (success) {
      loadSchedules();
      toast.success('Agendamento removido com sucesso.');
    }
    return success;
  }, [loadSchedules]);

  const toggleSchedule = useCallback((id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
      updateSchedule(id, { enabled: !schedule.enabled });
    }
  }, [schedules, updateSchedule]);

  const executeNow = useCallback(async (id: string) => {
    const success = await scheduledNotificationService.executeManually(id);
    if (success) {
      loadSchedules();
      toast.success('Agendamento executado com sucesso.');
    }
    return success;
  }, [loadSchedules]);

  const createDefaults = useCallback(() => {
    scheduledNotificationService.createDefaultSchedules();
    loadSchedules();
    toast.success('Agendamentos padrão criados com sucesso.');
  }, [loadSchedules]);

  return {
    schedules,
    addSchedule,
    updateSchedule,
    removeSchedule,
    toggleSchedule,
    executeNow,
    createDefaults,
    refresh: loadSchedules
  };
};
