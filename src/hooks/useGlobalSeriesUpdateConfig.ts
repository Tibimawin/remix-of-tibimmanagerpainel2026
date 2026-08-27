import { useState, useEffect } from 'react';
import { UserConfigService, GlobalSeriesUpdateConfig } from '@/services/UserConfigService';
import { toast } from 'sonner';

export const DEFAULT_SERIES_UPDATE_CONFIG = {
  sourceToken: 'bOs1UqfA6YdpGV5yqGgSeK9WimkFhXbB',
  sourceBaseUrl: 'http://213.199.56.115',
  sourceTableId: '3777',
};

export const useGlobalSeriesUpdateConfig = () => {
  const [seriesConfig, setSeriesConfig] = useState<GlobalSeriesUpdateConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = UserConfigService.onGlobalSeriesUpdateConfigChange((config) => {
      setSeriesConfig(config);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const saveSeriesConfig = async (config: Omit<GlobalSeriesUpdateConfig, 'updatedAt'>) => {
    try {
      await UserConfigService.saveGlobalSeriesUpdateConfig(config);
      toast.success('Configuração de atualização de séries salva!');
    } catch (error) {
      toast.error('Erro ao salvar configuração de atualização de séries.');
      throw error;
    }
  };

  return { seriesConfig, loading, saveSeriesConfig };
};
