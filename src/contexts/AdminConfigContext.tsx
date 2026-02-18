import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserConfig } from '@/hooks/useUserConfig';

interface AdminConfig {
  canaisTv: {
    sourceToken: string;
    sourceBaseUrl: string;
    sourceTableId: string;
  };
}

interface AdminConfigContextType {
  adminConfig: AdminConfig;
  updateAdminConfig: (config: Partial<AdminConfig>) => Promise<void>;
  isAdminConfigured: boolean;
  loading: boolean;
}

const defaultAdminConfig: AdminConfig = {
  canaisTv: {
    sourceToken: '',
    sourceBaseUrl: '',
    sourceTableId: ''
  }
};

const AdminConfigContext = createContext<AdminConfigContextType | undefined>(undefined);

export const AdminConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(defaultAdminConfig);
  const { config: userConfig, updateCanaisTvConfig, loading } = useUserConfig();

  // Sincronizar com Firebase quando userConfig carregar
  useEffect(() => {
    if (userConfig?.canaisTvConfig) {
      setAdminConfig({
        canaisTv: {
          sourceToken: userConfig.canaisTvConfig.sourceToken || '',
          sourceBaseUrl: userConfig.canaisTvConfig.sourceBaseUrl || '',
          sourceTableId: userConfig.canaisTvConfig.sourceTableId || '',
        }
      });
    }
  }, [userConfig]);

  const updateAdminConfig = async (newConfig: Partial<AdminConfig>) => {
    try {
      const updated = { ...adminConfig, ...newConfig };
      setAdminConfig(updated);

      // Salvar no Firebase
      if (newConfig.canaisTv) {
        await updateCanaisTvConfig(newConfig.canaisTv);
      }
    } catch (error) {
      console.error('Erro ao salvar configuração de admin:', error);
      throw error;
    }
  };

  const isAdminConfigured = Boolean(
    adminConfig.canaisTv.sourceToken &&
    adminConfig.canaisTv.sourceBaseUrl &&
    adminConfig.canaisTv.sourceTableId
  );

  return (
    <AdminConfigContext.Provider
      value={{
        adminConfig,
        updateAdminConfig,
        isAdminConfigured,
        loading
      }}
    >
      {children}
    </AdminConfigContext.Provider>
  );
};

export const useAdminConfig = () => {
  const context = useContext(AdminConfigContext);
  if (context === undefined) {
    throw new Error('useAdminConfig must be used within an AdminConfigProvider');
  }
  return context;
};
