import { useState, useEffect } from 'react';
import { UserConfigService, UserConfig } from '@/services/UserConfigService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useUserConfig = () => {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const { userInfo } = useSimpleAuth();

  // Configurar listener em tempo real para configurações do usuário
  useEffect(() => {
    if (!userInfo?.id) {
      setConfig(null);
      setLoading(false);
      setIsConfigured(false);
      return;
    }

    logger.info('Configurando listener de configurações');
    
    // Migrar configurações do localStorage se necessário
    UserConfigService.migrateFromLocalStorage(userInfo.id);

    // Configurar listener em tempo real
    const unsubscribe = UserConfigService.onUserConfigChange(userInfo.id, (updatedConfig) => {
      if (updatedConfig && updatedConfig.userId !== userInfo.id) {
        logger.error('Configuração de usuário incorreta detectada');
        setConfig(null);
        setLoading(false);
        setIsConfigured(false);
        return;
      }
      
      setConfig(updatedConfig);
      setLoading(false);
      
      // Verificar se o usuário tem configurações completas
      if (updatedConfig) {
        const hasBasicConfig = updatedConfig.apiToken && updatedConfig.baseUrl;
        const hasTableIds = Object.values(updatedConfig.tableIds).some(id => id.trim() !== '');
        setIsConfigured(hasBasicConfig && hasTableIds);
        
        logger.debug('Status da configuração atualizado', {
          hasBasicConfig,
          hasTableIds,
          isConfigured: hasBasicConfig && hasTableIds
        });
      } else {
        setIsConfigured(false);
      }
    });

    // Cleanup listener ao desmontar componente
    return () => {
      logger.debug('Removendo listener de configurações');
      unsubscribe();
    };
  }, [userInfo?.id]);

  // Atualizar configurações
  const updateConfig = async (updates: Partial<UserConfig>) => {
    if (!userInfo?.id) {
      toast.error('Usuário não logado');
      return;
    }

    try {
      logger.info('Atualizando configuração do usuário');
      
      // Se não existe configuração ainda, criar uma nova
      if (!config) {
        const newConfig: UserConfig = {
          userId: userInfo.id,
          apiToken: updates.apiToken || '',
          baseUrl: updates.baseUrl || '',
          tableIds: updates.tableIds || {
            conteudos: '',
            episodios: '',
            banners: '',
            categorias: '',
            usuarios: '',
            sessoes: '',
            plataformas: '',
            canaisTv: '',
          },
          personalSettings: updates.personalSettings || {
            theme: 'system',
            language: 'pt-BR',
            notifications: true,
            autoSave: true,
          },
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        
        await UserConfigService.saveUserConfig(newConfig);
        logger.info('Nova configuração criada');
      } else {
        // Verificar se estamos atualizando a configuração do usuário correto
        if (config.userId !== userInfo.id) {
          logger.error('Tentativa de atualizar configuração de outro usuário');
          toast.error('Erro de segurança: configuração de usuário incorreta');
          return;
        }
        
        await UserConfigService.updateUserConfig(userInfo.id, updates);
        logger.info('Configuração atualizada');
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      logger.error('❌ [USER-CONFIG] Erro ao salvar configurações', error);

      const msg = String(error?.message || '');

      if (msg.includes('permission-denied')) {
        toast.error('Sem permissão para salvar configurações do usuário.');
      } else if (msg.includes('No document to update') || msg.includes('not-found')) {
        toast.error('Configuração do usuário não encontrada. Recarregue a página para recriar a configuração.');
      } else if (msg.toLowerCase().includes('quota') || msg.includes('resource-exhausted') || msg.includes('Quota exceeded')) {
        toast.error('Limite de uso do Firestore atingido ao salvar configurações.');
      } else {
        toast.error('Erro ao salvar configurações');
      }

      throw error;
    }
  };

  // Atualizar configurações de importação
  const updateImportConfig = async (importConfig: Partial<UserConfig['importConfig']>) => {
    if (!userInfo?.id) {
      toast.error('Usuário não logado');
      return;
    }

    try {
      const configWithDefaults = {
        sourceToken: '',
        sourceBaseUrl: '',
        contentTableId: '',
        episodeTableId: '',
        episodeMatchType: 'custom' as const,
        episodeKeyField: 'Serie',
        episodeSearchField: 'Nome',
        isActive: false,
        ...importConfig
      };

      await UserConfigService.updateUserConfig(userInfo.id, { importConfig: configWithDefaults });
      toast.success('Configurações de importação salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações de importação:', error);
      toast.error('Erro ao salvar configurações de importação');
      throw error;
    }
  };

  // Atualizar configurações de Canais TV
  const updateCanaisTvConfig = async (canaisTvConfig: UserConfig['canaisTvConfig']) => {
    if (!userInfo?.id) {
      toast.error('Usuário não logado');
      return;
    }

    try {
      await UserConfigService.updateUserConfig(userInfo.id, { canaisTvConfig });
      toast.success('Configuração de Canais TV salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração de Canais TV:', error);
      toast.error('Erro ao salvar configuração de Canais TV');
      throw error;
    }
  };

  // Atualizar configurações pessoais
  const updatePersonalSettings = async (personalSettings: UserConfig['personalSettings']) => {
    if (!userInfo?.id) {
      toast.error('Usuário não logado');
      return;
    }

    try {
      await UserConfigService.updateUserConfig(userInfo.id, { personalSettings });
      toast.success('Configurações pessoais salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações pessoais:', error);
      toast.error('Erro ao salvar configurações pessoais');
      throw error;
    }
  };

  // Inicializar configurações para novo usuário
  const initializeConfig = async () => {
    if (!userInfo?.id) {
      toast.error('Usuário não logado');
      return;
    }

    try {
      const initialConfig = await UserConfigService.createInitialConfig(userInfo.id, userInfo.email);
      setConfig(initialConfig);
      toast.success('Configurações inicializadas com sucesso!');
      return initialConfig;
    } catch (error) {
      console.error('Erro ao inicializar configurações:', error);
      toast.error('Erro ao inicializar configurações');
      throw error;
    }
  };

  // Verificar se uma configuração específica está definida
  const hasConfigValue = (path: string): boolean => {
    if (!config) return false;
    
    const keys = path.split('.');
    let current: any = config;
    
    for (const key of keys) {
      if (current[key] === undefined || current[key] === null || current[key] === '') {
        return false;
      }
      current = current[key];
    }
    
    return true;
  };

  return {
    config,
    loading,
    isConfigured,
    updateConfig,
    updateImportConfig,
    updateCanaisTvConfig,
    updatePersonalSettings,
    initializeConfig,
    hasConfigValue
  };
};