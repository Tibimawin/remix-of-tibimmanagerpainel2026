import { useState, useEffect } from 'react';
import { UserConfigService, GlobalPlanosConfig } from '@/services/UserConfigService';
import { toast } from 'sonner';

export const useGlobalPlanosConfig = () => {
  const [planosConfig, setPlanosConfig] = useState<GlobalPlanosConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = UserConfigService.onGlobalPlanosConfigChange((config) => {
      setPlanosConfig(config);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const savePlanosConfig = async (tableId: string) => {
    try {
      await UserConfigService.saveGlobalPlanosConfig({ tableId });
      toast.success('Configuração de planos salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configuração de planos.');
      throw error;
    }
  };

  return { planosConfig, loading, savePlanosConfig };
};
