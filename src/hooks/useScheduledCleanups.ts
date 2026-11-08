import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { toast } from 'sonner';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

export interface ScheduledCleanup {
  id: string;
  userId: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  tableId: string;
  apiToken: string;
  baseUrl: string;
  isActive: boolean;
  lastRun?: string;
  nextRun: string;
  notifications: boolean;
  email?: string;
  createdAt: string;
}

export const useScheduledCleanups = () => {
  const { userInfo } = useSimpleAuth();
  const [scheduledCleanups, setScheduledCleanups] = useState<ScheduledCleanup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userInfo?.id) {
      setScheduledCleanups([]);
      setIsLoading(false);
      return;
    }

    const schedulesRef = collection(db, 'scheduledCleanups');
    const q = query(
      schedulesRef,
      where('userId', '==', userInfo.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const schedules = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ScheduledCleanup[];

        setScheduledCleanups(schedules);
        setIsLoading(false);
      },
      (error) => {
        console.error('Erro ao buscar agendamentos:', error);
        toast.error('Erro ao carregar agendamentos');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userInfo?.id]);

  const calculateNextRun = (frequency: string, time: string): string => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const nextRun = new Date();
    
    nextRun.setHours(hours, minutes, 0, 0);
    
    if (frequency === 'daily') {
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else if (frequency === 'weekly') {
      nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay()));
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
    } else if (frequency === 'monthly') {
      nextRun.setMonth(nextRun.getMonth() + 1, 1);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }
    
    return nextRun.toISOString();
  };

  const createSchedule = async (
    scheduleData: Omit<ScheduledCleanup, 'id' | 'userId' | 'createdAt' | 'nextRun'>
  ) => {
    if (!userInfo?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const nextRun = calculateNextRun(scheduleData.frequency, scheduleData.time);

      await addDoc(collection(db, 'scheduledCleanups'), {
        ...scheduleData,
        userId: userInfo.id,
        nextRun,
        createdAt: new Date().toISOString(),
      });

      toast.success('Agendamento criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao criar agendamento');
    }
  };

  const updateSchedule = async (scheduleId: string, updates: Partial<ScheduledCleanup>) => {
    try {
      const scheduleRef = doc(db, 'scheduledCleanups', scheduleId);
      await updateDoc(scheduleRef, updates);
      
      toast.success('Agendamento atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      toast.error('Erro ao atualizar agendamento');
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      await deleteDoc(doc(db, 'scheduledCleanups', scheduleId));
      toast.success('Agendamento removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover agendamento:', error);
      toast.error('Erro ao remover agendamento');
    }
  };

  const toggleSchedule = async (scheduleId: string) => {
    const schedule = scheduledCleanups.find(s => s.id === scheduleId);
    if (!schedule) return;

    try {
      await updateSchedule(scheduleId, { isActive: !schedule.isActive });
    } catch (error) {
      console.error('Erro ao alterar status do agendamento:', error);
    }
  };

  return {
    scheduledCleanups,
    isLoading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    toggleSchedule,
  };
};