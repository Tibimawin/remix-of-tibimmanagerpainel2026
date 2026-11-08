import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserConfigService } from '@/services/UserConfigService';
import { logger } from '@/utils/logger';

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
  const [loading, setLoading] = useState(true);

  // Listener em tempo real do documento global
  useEffect(() => {
    const unsubscribe = UserConfigService.onGlobalCanaisTvConfigChange((config) => {
      if (config) {
        setAdminConfig({
          canaisTv: {
            sourceToken: config.sourceToken || '',
            sourceBaseUrl: config.sourceBaseUrl || '',
            sourceTableId: config.sourceTableId || '',
          }
        });
      } else {
        setAdminConfig(defaultAdminConfig);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateAdminConfig = async (newConfig: Partial<AdminConfig>) => {
    try {
      const updated = { ...adminConfig, ...newConfig };
      setAdminConfig(updated);

      // Salvar no documento global do Firestore
      if (newConfig.canaisTv) {
        await UserConfigService.saveGlobalCanaisTvConfig(newConfig.canaisTv);
      }
    } catch (error) {
      logger.error('Erro ao salvar configuração global de Canais TV:', error);
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
