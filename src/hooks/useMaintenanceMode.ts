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

const DEFAULT_MAINTENANCE_STATE: MaintenanceState = {
  isActive: false,
  message: 'Sistema em manutenção',
  startTime: '',
  estimatedEnd: '',
  lastUpdatedBy: '',
  lastUpdated: ''
};

const MAINTENANCE_CACHE_KEY = 'tibim-maintenance-cache';

const readCachedMaintenance = (): MaintenanceState | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(MAINTENANCE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as MaintenanceState) : null;
  } catch {
    return null;
  }
};

let sharedMaintenanceState: MaintenanceState | null = readCachedMaintenance();
let sharedMaintenanceLoaded = sharedMaintenanceState !== null;
let sharedUnsubscribe: (() => void) | null = null;
const maintenanceListeners = new Set<(state: MaintenanceState) => void>();

const ensureSharedMaintenanceListener = () => {
  if (sharedUnsubscribe) return;
  const maintenanceRef = doc(db, 'system', 'maintenance');
  sharedUnsubscribe = onSnapshot(
    maintenanceRef,
    (snapshot) => {
      const nextState: MaintenanceState = snapshot.exists()
        ? (snapshot.data() as MaintenanceState)
        : DEFAULT_MAINTENANCE_STATE;
      sharedMaintenanceState = nextState;
      sharedMaintenanceLoaded = true;
      try {
        sessionStorage.setItem(MAINTENANCE_CACHE_KEY, JSON.stringify(nextState));
      } catch {
        // noop
      }
      maintenanceListeners.forEach((cb) => cb(nextState));
    },
    (error) => {
      logger.error('Erro ao escutar modo de manutenção', error);
      if (!sharedMaintenanceState) {
        sharedMaintenanceState = DEFAULT_MAINTENANCE_STATE;
      }
      sharedMaintenanceLoaded = true;
      maintenanceListeners.forEach((cb) => cb(sharedMaintenanceState!));
    }
  );
};

export const useMaintenanceMode = () => {
  const [maintenanceState, setMaintenanceState] = useState<MaintenanceState | null>(
    () => sharedMaintenanceState ?? DEFAULT_MAINTENANCE_STATE
  );
  const [loading, setLoading] = useState(!sharedMaintenanceLoaded);

  useEffect(() => {
    const listener = (nextState: MaintenanceState) => {
      setMaintenanceState(nextState);
      setLoading(false);
    };

    maintenanceListeners.add(listener);
    if (sharedMaintenanceState) {
      setMaintenanceState(sharedMaintenanceState);
      setLoading(false);
    }

    ensureSharedMaintenanceListener();

    return () => {
      maintenanceListeners.delete(listener);
      if (maintenanceListeners.size === 0 && sharedUnsubscribe) {
        sharedUnsubscribe();
        sharedUnsubscribe = null;
      }
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