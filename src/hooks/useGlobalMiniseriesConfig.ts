import { useState, useEffect } from 'react';
import { UserConfigService, GlobalMiniseriesConfig } from '@/services/UserConfigService';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

/**
 * Configuração global da origem de MINISSÉRIES (definida pelo admin,
 * lida por todos os usuários em tempo real).
 * Firestore: globalConfig/miniseriesSource
 */
export const useGlobalMiniseriesConfig = () => {
  const [globalConfig, setGlobalConfig] = useState<GlobalMiniseriesConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = UserConfigService.onGlobalMiniseriesConfigChange((config) => {
      setGlobalConfig(config);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const saveGlobalMiniseriesConfig = async (config: Omit<GlobalMiniseriesConfig, 'updatedAt'>) => {
    try {
      await UserConfigService.saveGlobalMiniseriesConfig(config);
      toast.success('Configuração de Minisséries salva para todos os usuários!');
    } catch (error) {
      logger.error('Erro ao salvar configuração global de minisséries', error);
      toast.error('Erro ao salvar configuração de Minisséries');
      throw error;
    }
  };

  return { globalConfig, loading, saveGlobalMiniseriesConfig };
};
