import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface MaintenanceState {
  isActive: boolean;
  message: string;
  startTime: string;
  estimatedEnd: string;
  lastUpdatedBy: string;
  lastUpdated: string;
}

export const useMaintenanceMode = () => {
  const [maintenanceState, setMaintenanceState] = useState<MaintenanceState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Configurando listener de modo de manutenção');
    logger.info('Configurando listener de modo de manutenção');
    
    const maintenanceRef = doc(db, 'system', 'maintenance');
    
    const unsubscribe = onSnapshot(maintenanceRef, (doc) => {
      console.log('Snapshot recebido:', doc.exists(), doc.data());
      if (doc.exists()) {
        const data = doc.data() as MaintenanceState;
        console.log('Estado de manutenção:', data);
        setMaintenanceState(data);
        logger.debug('Estado de manutenção atualizado', data);
      } else {
        console.log('Documento não existe, criando estado padrão');
        // Se não existe documento, criar um padrão
        const defaultState: MaintenanceState = {
          isActive: false,
          message: 'Sistema em manutenção',
          startTime: '',
          estimatedEnd: '',
          lastUpdatedBy: '',
          lastUpdated: ''
        };
        setMaintenanceState(defaultState);
      }
      setLoading(false);
    }, (error) => {
      console.error('Erro ao escutar modo de manutenção:', error);
      logger.error('Erro ao escutar modo de manutenção', error);
      setLoading(false);
    });

    return () => {
      logger.debug('Removendo listener de modo de manutenção');
      unsubscribe();
    };
  }, []);

  const updateMaintenanceMode = async (updates: Partial<MaintenanceState>, adminEmail: string) => {
    try {
      const maintenanceRef = doc(db, 'system', 'maintenance');
      
      const updatedState = {
        ...maintenanceState,
        ...updates,
        lastUpdatedBy: adminEmail,
        lastUpdated: new Date().toISOString()
      };

      await setDoc(maintenanceRef, updatedState);
      
      const action = updates.isActive ? 'ativou' : 'desativou';
      toast.success(`Modo de manutenção ${action} com sucesso!`);
      
      logger.info(`Modo de manutenção ${action}`, {
        adminEmail,
        state: updatedState
      });

    } catch (error) {
      logger.error('Erro ao atualizar modo de manutenção', error);
      toast.error('Erro ao atualizar modo de manutenção');
      throw error;
    }
  };

  const activateMaintenance = async (message: string, estimatedEnd: string, adminEmail: string) => {
    await updateMaintenanceMode({
      isActive: true,
      message,
      estimatedEnd,
      startTime: new Date().toISOString()
    }, adminEmail);
  };

  const deactivateMaintenance = async (adminEmail: string) => {
    await updateMaintenanceMode({
      isActive: false,
      startTime: '',
      estimatedEnd: ''
    }, adminEmail);
  };

  return {
    maintenanceState,
    loading,
    isMaintenanceActive: maintenanceState?.isActive || false,
    updateMaintenanceMode,
    activateMaintenance,
    deactivateMaintenance
  };
};