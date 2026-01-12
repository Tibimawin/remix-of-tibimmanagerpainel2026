import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface AdminConfig {
  canaisTv: {
    sourceToken: string;
    sourceBaseUrl: string;
    sourceTableId: string;
  };
}

interface AdminConfigContextType {
  adminConfig: AdminConfig;
  updateAdminConfig: (config: Partial<AdminConfig>) => void;
  isAdminConfigured: boolean;
  loading: boolean;
}

const defaultAdminConfig: AdminConfig = {
  canaisTv: {
    sourceToken: 'TH0lxs0P4EzApqjqMXjEqHvtRsjemFgn',
    sourceBaseUrl: 'http://213.199.56.115',
    sourceTableId: '1783'
  }
};

const AdminConfigContext = createContext<AdminConfigContextType | undefined>(undefined);

export const AdminConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(defaultAdminConfig);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminConfig();
    }
  }, [isAuthenticated]);

  const loadAdminConfig = async () => {
    setLoading(true);
    try {
      // Por enquanto, usar configuração padrão
      // Futuramente pode carregar do Firebase ou outro serviço
      const savedConfig = localStorage.getItem('admin-config');
      if (savedConfig) {
        setAdminConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAdminConfig = async (newConfig: Partial<AdminConfig>) => {
    try {
      const updated = { ...adminConfig, ...newConfig };
      setAdminConfig(updated);
      
      // Salvar no localStorage (futuramente pode usar Firebase)
      localStorage.setItem('admin-config', JSON.stringify(updated));
    } catch (error) {
      console.error('Erro ao salvar configuração de admin:', error);
    }
  };

  const isAdminConfigured = Boolean(adminConfig.canaisTv.sourceToken && 
                                   adminConfig.canaisTv.sourceBaseUrl && 
                                   adminConfig.canaisTv.sourceTableId);

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