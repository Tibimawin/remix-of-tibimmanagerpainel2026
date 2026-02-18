import { useState, useEffect } from 'react';
import { UserConfigService, GlobalImportConfig } from '@/services/UserConfigService';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

/**
 * Hook para leitura e escrita da configuração global de origem
 * (definida pelo admin, lida por todos os usuários em tempo real)
 * Firestore: globalConfig/importSource
 */
export const useGlobalImportConfig = () => {
  const [globalConfig, setGlobalConfig] = useState<GlobalImportConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.debug('Iniciando listener da configuração global de importação');

    const unsubscribe = UserConfigService.onGlobalImportConfigChange((config) => {
      setGlobalConfig(config);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const saveGlobalImportConfig = async (config: Omit<GlobalImportConfig, 'updatedAt'>) => {
    try {
      await UserConfigService.saveGlobalImportConfig(config);
      toast.success('Configuração de origem salva com sucesso para todos os usuários!');
    } catch (error) {
      logger.error('Erro ao salvar configuração global de importação', error);
      toast.error('Erro ao salvar configuração global de importação');
      throw error;
    }
  };

  return {
    globalConfig,
    loading,
    saveGlobalImportConfig
  };
};
