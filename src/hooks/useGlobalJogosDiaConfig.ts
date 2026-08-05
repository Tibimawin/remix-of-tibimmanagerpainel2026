import { useState, useEffect } from 'react';
import { UserConfigService, GlobalImportConfig } from '@/services/UserConfigService';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

/**
 * Configuração global da origem de JOGOS DO DIA (definida pelo admin,
 * lida por todos os usuários em tempo real).
 * Firestore: globalConfig/jogosDiaSource
 */
export const useGlobalJogosDiaConfig = () => {
  const [globalConfig, setGlobalConfig] = useState<GlobalImportConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = UserConfigService.onGlobalJogosDiaConfigChange((config) => {
      setGlobalConfig(config);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const saveGlobalJogosDiaConfig = async (config: Omit<GlobalImportConfig, 'updatedAt'>) => {
    try {
      await UserConfigService.saveGlobalJogosDiaConfig(config);
      toast.success('Configuração de Jogos do Dia salva para todos os usuários!');
    } catch (error) {
      logger.error('Erro ao salvar configuração global de jogos do dia', error);
      toast.error('Erro ao salvar configuração de Jogos do Dia');
      throw error;
    }
  };

  return { globalConfig, loading, saveGlobalJogosDiaConfig };
};
