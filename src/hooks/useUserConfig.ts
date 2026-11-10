import { useState, useEffect } from 'react';
import { UserConfigService, UserConfig } from '@/services/UserConfigService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

const DEMO_CONFIG: UserConfig = {
  userId: 'demo-user-session',
  apiToken: 'demo-token-tibim-123',
  baseUrl: 'https://api.baserow.io',
  tableIds: {
    conteudos: '99901',
    episodios: '99902',
    banners: '99903',
    categorias: '99904',
    usuarios: '99905',
    sessoes: '99906',
    plataformas: '99907',
    canaisTv: '99908',
    jogosDia: '99909',
    miniseries: '99910',
    miniseriesEpisodios: '99911',
  },
  personalSettings: {
    theme: 'system',
    language: 'pt-BR',
    notifications: true,
    autoSave: true,
  },
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString()
};

const getUserConfigCacheKey = (userId: string) => `user-config-cache:${userId}`;

const readCachedUserConfig = (userId?: string): UserConfig | null => {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getUserConfigCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserConfig;
    return parsed?.userId === userId ? parsed : null;
  } catch {
    return null;
  }
};

const computeIsConfigured = (cfg: UserConfig | null): boolean => {
  if (!cfg) return false;
  const hasBasicConfig = Boolean(cfg.apiToken && cfg.baseUrl);
  const hasTableIds = Object.values(cfg.tableIds || {}).some((id) => typeof id === 'string' && id.trim() !== '');
  return hasBasicConfig && hasTableIds;
};

export const useUserConfig = () => {
  const { userInfo } = useSimpleAuth();
  const [config, setConfig] = useState<UserConfig | null>(() => {
    if (userInfo?.isDemo) return DEMO_CONFIG;
    return readCachedUserConfig(userInfo?.id);
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!userInfo?.id || userInfo?.isDemo) return false;
    return !readCachedUserConfig(userInfo.id);
  });
  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    if (userInfo?.isDemo) return true;
    return computeIsConfigured(readCachedUserConfig(userInfo?.id));
  });

  // Configurar listener em tempo real para configurações do usuário
  useEffect(() => {
    if (!userInfo?.id) {
      setConfig(null);
      setLoading(false);
      setIsConfigured(false);
      return;
    }

    // 🧪 MODO DEMO: Carregar configuração de simulação instantaneamente sem Firestore
    if (userInfo.isDemo) {
      setConfig(DEMO_CONFIG);
      setLoading(false);
      setIsConfigured(true);
      return;
    }

    // Hidratar instantaneamente do cache local se mudou de usuário após montagem
    const cached = readCachedUserConfig(userInfo.id);
    if (cached) {
      setConfig(cached);
      setIsConfigured(computeIsConfigured(cached));
      setLoading(false);
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

      if (updatedConfig) {
        try {
          localStorage.setItem(getUserConfigCacheKey(userInfo.id), JSON.stringify(updatedConfig));
        } catch {
          // noop
        }
        const configured = computeIsConfigured(updatedConfig);
        setIsConfigured(configured);

        logger.debug('Status da configuração atualizado', {
          isConfigured: configured
        });
      } else {
        try {
          localStorage.removeItem(getUserConfigCacheKey(userInfo.id));
        } catch {
          // noop
        }
        setIsConfigured(false);
      }
    });

    // Cleanup listener ao desmontar componente
    return () => {
      logger.debug('Removendo listener de configurações');
      unsubscribe();
    };
  }, [userInfo?.id, userInfo?.isDemo]);

  // Atualizar configurações
  const updateConfig = async (updates: Partial<UserConfig>) => {
    if (!userInfo?.id) {
      toast.error('Usuário não logado');
      return;
    }

    if (userInfo.isDemo) {
      setConfig(prev => prev ? { ...prev, ...updates } : { ...DEMO_CONFIG, ...updates });
      toast.info('🧪 Modo Demonstração: Configuração atualizada apenas em memória para visualização.');
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
            jogosDia: '',
            miniseries: '',
            miniseriesEpisodios: '',
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

    if (userInfo.isDemo) {
      toast.info('🧪 Modo Demonstração: Configurações de importação simuladas.');
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

    if (userInfo.isDemo) {
      toast.info('🧪 Modo Demonstração: Configuração de Canais TV simulada.');
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

    if (userInfo.isDemo) {
      toast.info('🧪 Modo Demonstração: Preferências simuladas.');
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

    if (userInfo.isDemo) {
      setConfig(DEMO_CONFIG);
      return DEMO_CONFIG;
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