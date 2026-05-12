import { useEffect, useState } from 'react';
import { UserConfigService, GlobalAutomationConfig } from '@/services/UserConfigService';

/**
 * Hook que escuta o kill-switch global de Automação (controlado pelo admin).
 * Padrão: HABILITADO se o documento não existir (compatibilidade retroativa).
 */
export const useGlobalAutomationConfig = () => {
  const [config, setConfig] = useState<GlobalAutomationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = UserConfigService.onGlobalAutomationConfigChange((c) => {
      setConfig(c);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Default: habilitado quando ainda não foi configurado.
  const isEnabled = config?.isEnabled !== false;

  const setEnabled = async (enabled: boolean, updatedBy?: string, reason?: string) => {
    await UserConfigService.saveGlobalAutomationConfig({
      isEnabled: enabled,
      updatedBy,
      reason,
    });
  };

  return { config, isEnabled, loading, setEnabled };
};