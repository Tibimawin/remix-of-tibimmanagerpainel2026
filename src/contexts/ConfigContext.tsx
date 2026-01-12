
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserConfig } from '@/hooks/useUserConfig';

interface Config {
  apiToken: string;
  baseUrl: string;
  conteudosTableId: string;
  episodiosTableId: string;
  tableIds: {
    conteudos: string;
    episodios: string;
    banners: string;
    categorias: string;
    usuarios: string;
    sessoes: string;
    plataformas: string;
    canaisTv: string;
  };
}

interface ConfigContextType {
  config: Config;
  updateConfig: (newConfig: Partial<Config>) => void;
  isConfigured: boolean;
  loading: boolean;
}

export const defaultConfig: Config = {
  apiToken: '',
  baseUrl: '',
  conteudosTableId: '',
  episodiosTableId: '',
  tableIds: {
    conteudos: '',
    episodios: '',
    banners: '',
    categorias: '',
    usuarios: '',
    sessoes: '',
    plataformas: '',
    canaisTv: '',
  },
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const { config: userConfig, updateConfig: updateUserConfig, isConfigured, loading } = useUserConfig();

  // Sincronizar configuração local com configuração do usuário
  useEffect(() => {
    if (userConfig) {
      const syncedConfig: Config = {
        apiToken: userConfig.apiToken || '',
        baseUrl: userConfig.baseUrl || '',
        conteudosTableId: userConfig.tableIds?.conteudos || '',
        episodiosTableId: userConfig.tableIds?.episodios || '',
        tableIds: userConfig.tableIds || defaultConfig.tableIds,
      };
      
      setConfig(syncedConfig);
    } else {
      setConfig(defaultConfig);
    }
  }, [userConfig]);

  const updateConfig = async (newConfig: Partial<Config>) => {
    try {
      // Atualizar configuração local imediatamente para feedback rápido
      const updated = { ...config, ...newConfig };
      setConfig(updated);

      // Preparar dados para o Firebase
      const firebaseUpdate: any = {};
      
      if (newConfig.apiToken !== undefined) firebaseUpdate.apiToken = newConfig.apiToken;
      if (newConfig.baseUrl !== undefined) firebaseUpdate.baseUrl = newConfig.baseUrl;
      
      if (newConfig.tableIds) {
        const current = userConfig?.tableIds || defaultConfig.tableIds;

        firebaseUpdate.tableIds = {
          ...current,
          ...Object.fromEntries(
            Object.entries(newConfig.tableIds).map(([key, value]) => [
              key,
              typeof value === 'string' ? value.trim() : value,
            ]),
          ),
        };
      }

      // Atualizar no Firebase
      await updateUserConfig(firebaseUpdate);
      
    } catch (error) {
      // Reverter configuração local em caso de erro
      if (userConfig) {
        const revertedConfig: Config = {
          apiToken: userConfig.apiToken || '',
          baseUrl: userConfig.baseUrl || '',
          conteudosTableId: userConfig.tableIds?.conteudos || '',
          episodiosTableId: userConfig.tableIds?.episodios || '',
          tableIds: userConfig.tableIds || defaultConfig.tableIds,
        };
        setConfig(revertedConfig);
      }
      throw error;
    }
  };

  return (
    <ConfigContext.Provider value={{ config, updateConfig, isConfigured, loading }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig deve ser usado dentro de ConfigProvider');
  }
  return context;
};
