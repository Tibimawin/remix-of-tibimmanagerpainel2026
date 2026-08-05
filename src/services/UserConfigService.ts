import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

export interface GlobalPlanosConfig {
  tableId: string;
  updatedAt: string;
}

export interface GlobalSeriesUpdateConfig {
  sourceToken: string;
  sourceBaseUrl: string;
  sourceTableId: string;
  updatedAt: string;
}

export interface GlobalAutomationConfig {
  isEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
  reason?: string;
}

export interface GlobalImportConfig {
  sourceToken: string;
  sourceBaseUrl: string;
  contentTableId: string;
  episodeTableId: string;
  episodeMatchType: 'contains' | 'exact' | 'custom';
  episodeKeyField: string;
  episodeSearchField: string;
  isActive: boolean;
  updatedAt: string;
}

export interface GlobalMiniseriesConfig {
  sourceToken: string;
  sourceBaseUrl: string;
  contentTableId: string;
  episodeTableId: string;
  episodeMatchType: 'contains' | 'exact' | 'custom';
  episodeKeyField: string;
  episodeSearchField: string;
  isActive: boolean;
  updatedAt: string;
}

export interface UserConfig {
  userId: string;
  apiToken: string;
  baseUrl: string;
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
  apiKeys?: {
    tmdb?: string;
    omdb?: string;
  };
  importConfig?: {
    sourceToken: string;
    sourceBaseUrl: string;
    contentTableId: string;
    episodeTableId: string;
    episodeMatchType: 'contains' | 'exact' | 'custom';
    episodeKeyField: string;
    episodeSearchField: string;
    isActive: boolean;
  };
  canaisTvConfig?: {
    sourceToken: string;
    sourceBaseUrl: string;
    sourceTableId: string;
  };
  personalSettings?: {
    theme: string;
    language: string;
    notifications: boolean;
    autoSave: boolean;
  };
  lastUpdated: string;
  createdAt: string;
}

export const UserConfigService = {
  // Buscar configurações do usuário
  async getUserConfig(userId: string): Promise<UserConfig | null> {
    try {
      logger.debug('Buscando configurações do usuário');

      const docRef = doc(db, 'userConfigs', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserConfig;

        // Verificar se a configuração pertence ao usuário correto
        if (data.userId !== userId) {
          logger.error('Configuração encontrada não pertence ao usuário');
          return null;
        }

        logger.debug('Configurações válidas encontradas');
        return data;
      } else {
        logger.debug('Nenhuma configuração encontrada');
        return null;
      }
    } catch (error) {
      logger.error('Erro ao buscar configurações', error);
      throw error;
    }
  },

  // Salvar configurações do usuário
  async saveUserConfig(config: UserConfig): Promise<void> {
    try {
      logger.debug('Salvando configurações do usuário');

      // Garantir que o userId está sempre definido corretamente
      const configData = {
        ...config,
        userId: config.userId, // Reforçar o userId
        lastUpdated: new Date().toISOString()
      };

      const docRef = doc(db, 'userConfigs', config.userId);
      await setDoc(docRef, configData, { merge: false }); // Usar merge: false para garantir isolamento

      logger.debug('Configurações salvas com sucesso');
    } catch (error) {
      logger.error('Erro ao salvar configurações', error);
      throw error;
    }
  },

  // Atualizar configurações parcialmente
  async updateUserConfig(userId: string, updates: Partial<UserConfig>): Promise<void> {
    try {
      logger.debug('Atualizando configurações do usuário');

      // Primeiro buscar configuração existente para garantir isolamento
      const existingConfig = await this.getUserConfig(userId);

      const updateData = {
        ...existingConfig,
        ...updates,
        userId: userId, // Garantir que o userId nunca seja alterado
        lastUpdated: new Date().toISOString()
      };

      const docRef = doc(db, 'userConfigs', userId);
      await setDoc(docRef, updateData, { merge: false }); // merge: false para isolamento total

      logger.debug('Configurações atualizadas com sucesso');
    } catch (error) {
      logger.error('Erro ao atualizar configurações', error);
      throw error;
    }
  },

  // Listener em tempo real para configurações do usuário
  onUserConfigChange(userId: string, callback: (config: UserConfig | null) => void) {
    logger.debug('Iniciando listener de configurações');
    const docRef = doc(db, 'userConfigs', userId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserConfig;

          // Verificar se a configuração realmente pertence ao usuário correto
          if (data.userId !== userId) {
            logger.error('Configuração não pertence ao usuário atual');
            callback(null);
            return;
          }

          logger.debug('Configurações carregadas', {
            hasApiToken: !!data.apiToken,
            hasBaseUrl: !!data.baseUrl,
            tableIdsCount: Object.keys(data.tableIds).filter(key => data.tableIds[key]).length
          });
          callback(data);
        } else {
          logger.debug('Nenhuma configuração encontrada');
          callback(null);
        }
      },
      (error) => {
        logger.error('Erro no listener de configurações', error);
        callback(null);
      }
    );

    return unsubscribe;
  },

  // Criar configuração inicial para novo usuário
  async createInitialConfig(userId: string, userEmail: string): Promise<UserConfig> {
    try {
      console.log('Criando configuração inicial para usuário:', userId);

      const initialConfig: UserConfig = {
        userId,
        apiToken: '',
        baseUrl: '',
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
        personalSettings: {
          theme: 'system',
          language: 'pt-BR',
          notifications: true,
          autoSave: true,
        },
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await this.saveUserConfig(initialConfig);

      console.log('Configuração inicial criada com sucesso');
      return initialConfig;
    } catch (error) {
      console.error('Erro ao criar configuração inicial:', error);
      throw error;
    }
  },

  // Migrar configurações do localStorage para Firebase
  async migrateFromLocalStorage(userId: string): Promise<void> {
    try {
      console.log('Verificando migração do localStorage para usuário:', userId);

      // Verificar se já existe configuração no Firebase
      const existingConfig = await this.getUserConfig(userId);
      if (existingConfig) {
        console.log('Configuração já existe no Firebase, pulando migração');
        return;
      }

      // Buscar configurações do localStorage
      const localConfig = localStorage.getItem('admin-config');
      const localImportConfig = localStorage.getItem('import-config');

      if (!localConfig && !localImportConfig) {
        console.log('Nenhuma configuração local encontrada');
        return;
      }

      // Criar configuração com dados migrados
      const migratedConfig: UserConfig = {
        userId,
        apiToken: '',
        baseUrl: '',
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
        personalSettings: {
          theme: 'system',
          language: 'pt-BR',
          notifications: true,
          autoSave: true,
        },
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // Migrar configuração principal
      if (localConfig) {
        try {
          const parsedConfig = JSON.parse(localConfig);
          migratedConfig.apiToken = parsedConfig.apiToken || '';
          migratedConfig.baseUrl = parsedConfig.baseUrl || '';
          if (parsedConfig.tableIds) {
            migratedConfig.tableIds = { ...migratedConfig.tableIds, ...parsedConfig.tableIds };
          }
        } catch (error) {
          console.error('Erro ao migrar configuração principal:', error);
        }
      }

      // Migrar configuração de importação
      if (localImportConfig) {
        try {
          const parsedImportConfig = JSON.parse(localImportConfig);
          migratedConfig.importConfig = {
            sourceToken: parsedImportConfig.sourceToken || '',
            sourceBaseUrl: parsedImportConfig.sourceBaseUrl || '',
            contentTableId: parsedImportConfig.contentTableId || '',
            episodeTableId: parsedImportConfig.episodeTableId || '',
            episodeMatchType: parsedImportConfig.episodeMatchType || 'custom',
            episodeKeyField: parsedImportConfig.episodeKeyField || 'Serie',
            episodeSearchField: parsedImportConfig.episodeSearchField || 'Nome',
            isActive: parsedImportConfig.isActive || false
          };
        } catch (error) {
          console.error('Erro ao migrar configuração de importação:', error);
        }
      }

      // Salvar configuração migrada
      await this.saveUserConfig(migratedConfig);

      console.log('Migração concluída com sucesso');

      // Opcional: remover do localStorage após migração bem-sucedida
      // localStorage.removeItem('admin-config');
      // localStorage.removeItem('import-config');

    } catch (error) {
      console.error('Erro na migração:', error);
    }
  },

  // ============================================================
  // Configuração Global de Origem (admin → todos usuários)
  // Firestore path: globalConfig/importSource
  // ============================================================

  async getGlobalImportConfig(): Promise<GlobalImportConfig | null> {
    try {
      const docRef = doc(db, 'globalConfig', 'importSource');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as GlobalImportConfig;
      }
      return null;
    } catch (error) {
      logger.error('Erro ao buscar configuração global de importação', error);
      return null;
    }
  },

  async saveGlobalImportConfig(config: Omit<GlobalImportConfig, 'updatedAt'>): Promise<void> {
    try {
      const docRef = doc(db, 'globalConfig', 'importSource');
      await setDoc(docRef, {
        ...config,
        updatedAt: new Date().toISOString()
      });
      logger.debug('Configuração global de importação salva');
    } catch (error) {
      logger.error('Erro ao salvar configuração global de importação', error);
      throw error;
    }
  },

  // ============================================================
  // Configuração Global de Planos (admin → todos usuários)
  // Firestore path: globalConfig/planos
  // ============================================================

  async getGlobalPlanosConfig(): Promise<GlobalPlanosConfig | null> {
    try {
      const docRef = doc(db, 'globalConfig', 'planos');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as GlobalPlanosConfig;
      }
      return null;
    } catch (error) {
      logger.error('Erro ao buscar configuração global de planos', error);
      return null;
    }
  },

  async saveGlobalPlanosConfig(config: Omit<GlobalPlanosConfig, 'updatedAt'>): Promise<void> {
    try {
      const docRef = doc(db, 'globalConfig', 'planos');
      await setDoc(docRef, {
        ...config,
        updatedAt: new Date().toISOString()
      });
      logger.debug('Configuração global de planos salva');
    } catch (error) {
      logger.error('Erro ao salvar configuração global de planos', error);
      throw error;
    }
  },

  onGlobalPlanosConfigChange(callback: (config: GlobalPlanosConfig | null) => void): () => void {
    const docRef = doc(db, 'globalConfig', 'planos');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as GlobalPlanosConfig);
        } else {
          callback(null);
        }
      },
      (error) => {
        logger.error('Erro no listener da config global de planos', error);
        callback(null);
      }
    );
  },

  onGlobalImportConfigChange(callback: (config: GlobalImportConfig | null) => void): () => void {
    const docRef = doc(db, 'globalConfig', 'importSource');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as GlobalImportConfig);
        } else {
          callback(null);
        }
      },
      (error) => {
        logger.error('Erro no listener da config global de importação', error);
        callback(null);
      }
    );
  },

  // ============================================================
  // Configuração Global de Canais TV (admin → todos usuários)
  // Firestore path: globalConfig/canaisTvSource
  // ============================================================

  async getGlobalCanaisTvConfig(): Promise<{ sourceToken: string; sourceBaseUrl: string; sourceTableId: string; updatedAt: string } | null> {
    try {
      const docRef = doc(db, 'globalConfig', 'canaisTvSource');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as { sourceToken: string; sourceBaseUrl: string; sourceTableId: string; updatedAt: string };
      }
      return null;
    } catch (error) {
      logger.error('Erro ao buscar configuração global de Canais TV', error);
      return null;
    }
  },

  async saveGlobalCanaisTvConfig(config: { sourceToken: string; sourceBaseUrl: string; sourceTableId: string }): Promise<void> {
    try {
      const docRef = doc(db, 'globalConfig', 'canaisTvSource');
      await setDoc(docRef, {
        ...config,
        updatedAt: new Date().toISOString()
      });
      logger.debug('Configuração global de Canais TV salva');
    } catch (error) {
      logger.error('Erro ao salvar configuração global de Canais TV', error);
      throw error;
    }
  },

  onGlobalCanaisTvConfigChange(callback: (config: { sourceToken: string; sourceBaseUrl: string; sourceTableId: string } | null) => void): () => void {
    const docRef = doc(db, 'globalConfig', 'canaisTvSource');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as { sourceToken: string; sourceBaseUrl: string; sourceTableId: string });
        } else {
          callback(null);
        }
      },
      (error) => {
        logger.error('Erro no listener da config global de Canais TV', error);
        callback(null);
      }
    );
  },

  // ============================================================
  // Configuração Global da Atualização de Séries (admin → todos)
  // Firestore path: globalConfig/seriesUpdateSource
  // ============================================================

  async getGlobalSeriesUpdateConfig(): Promise<GlobalSeriesUpdateConfig | null> {
    try {
      const docRef = doc(db, 'globalConfig', 'seriesUpdateSource');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as GlobalSeriesUpdateConfig) : null;
    } catch (error) {
      logger.error('Erro ao buscar configuração global de atualização de séries', error);
      return null;
    }
  },

  async saveGlobalSeriesUpdateConfig(config: Omit<GlobalSeriesUpdateConfig, 'updatedAt'>): Promise<void> {
    try {
      const docRef = doc(db, 'globalConfig', 'seriesUpdateSource');
      await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() });
      logger.debug('Configuração global de atualização de séries salva');
    } catch (error) {
      logger.error('Erro ao salvar configuração global de atualização de séries', error);
      throw error;
    }
  },

  onGlobalSeriesUpdateConfigChange(callback: (config: GlobalSeriesUpdateConfig | null) => void): () => void {
    const docRef = doc(db, 'globalConfig', 'seriesUpdateSource');
    return onSnapshot(
      docRef,
      (docSnap) => {
        callback(docSnap.exists() ? (docSnap.data() as GlobalSeriesUpdateConfig) : null);
      },
      (error) => {
        logger.error('Erro no listener da config global de atualização de séries', error);
        callback(null);
      }
    );
  },

  // ============================================================
  // Configuração Global de Minisséries (admin → todos)
  // Firestore path: globalConfig/miniseriesSource
  // ============================================================

  async getGlobalMiniseriesConfig(): Promise<GlobalMiniseriesConfig | null> {
    try {
      const docRef = doc(db, 'globalConfig', 'miniseriesSource');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as GlobalMiniseriesConfig) : null;
    } catch (error) {
      logger.error('Erro ao buscar configuração global de minisséries', error);
      return null;
    }
  },

  async saveGlobalMiniseriesConfig(config: Omit<GlobalMiniseriesConfig, 'updatedAt'>): Promise<void> {
    try {
      const docRef = doc(db, 'globalConfig', 'miniseriesSource');
      await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() });
      logger.debug('Configuração global de minisséries salva');
    } catch (error) {
      logger.error('Erro ao salvar configuração global de minisséries', error);
      throw error;
    }
  },

  onGlobalMiniseriesConfigChange(callback: (config: GlobalMiniseriesConfig | null) => void): () => void {
    const docRef = doc(db, 'globalConfig', 'miniseriesSource');
    return onSnapshot(
      docRef,
      (docSnap) => {
        callback(docSnap.exists() ? (docSnap.data() as GlobalMiniseriesConfig) : null);
      },
      (error) => {
        logger.error('Erro no listener da config global de minisséries', error);
        callback(null);
      }
    );
  },

  // ============================================================
  // Configuração Global de Jogos do Dia (admin → todos)
  // Firestore path: globalConfig/jogosDiaSource
  // ============================================================

  async getGlobalJogosDiaConfig(): Promise<GlobalImportConfig | null> {
    try {
      const docRef = doc(db, 'globalConfig', 'jogosDiaSource');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as GlobalImportConfig) : null;
    } catch (error) {
      logger.error('Erro ao buscar configuração global de Jogos do Dia', error);
      return null;
    }
  },

  async saveGlobalJogosDiaConfig(config: Omit<GlobalImportConfig, 'updatedAt'>): Promise<void> {
    try {
      const docRef = doc(db, 'globalConfig', 'jogosDiaSource');
      await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() });
      logger.debug('Configuração global de Jogos do Dia salva');
    } catch (error) {
      logger.error('Erro ao salvar configuração global de Jogos do Dia', error);
      throw error;
    }
  },

  onGlobalJogosDiaConfigChange(callback: (config: GlobalImportConfig | null) => void): () => void {
    const docRef = doc(db, 'globalConfig', 'jogosDiaSource');
    return onSnapshot(
      docRef,
      (docSnap) => {
        callback(docSnap.exists() ? (docSnap.data() as GlobalImportConfig) : null);
      },
      (error) => {
        logger.error('Erro no listener da config global de Jogos do Dia', error);
        callback(null);
      }
    );
  },

  // ============================================================
  // Kill-switch GLOBAL da Automação (admin → todos usuários)
  // Firestore path: globalConfig/automation
  // ============================================================

  async getGlobalAutomationConfig(): Promise<GlobalAutomationConfig | null> {
    try {
      const docRef = doc(db, 'globalConfig', 'automation');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as GlobalAutomationConfig) : null;
    } catch (error) {
      logger.error('Erro ao buscar config global de automação', error);
      return null;
    }
  },

  async saveGlobalAutomationConfig(config: { isEnabled: boolean; updatedBy?: string; reason?: string }): Promise<void> {
    try {
      const docRef = doc(db, 'globalConfig', 'automation');
      await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('Erro ao salvar config global de automação', error);
      throw error;
    }
  },

  onGlobalAutomationConfigChange(callback: (config: GlobalAutomationConfig | null) => void): () => void {
    const docRef = doc(db, 'globalConfig', 'automation');
    return onSnapshot(
      docRef,
      (docSnap) => {
        callback(docSnap.exists() ? (docSnap.data() as GlobalAutomationConfig) : null);
      },
      (error) => {
        logger.error('Erro no listener da config global de automação', error);
        callback(null);
      }
    );
  },

  // ============================================================
  // Credenciais DNS/IPTV do usuário
  // ============================================================

  async getDnsConfig(userId: string): Promise<{ dnsUrl: string; dnsUsername: string; dnsPassword: string; lastFetchedAt?: string } | null> {
    try {
      const userConfig = await this.getUserConfig(userId);
      return (userConfig as any)?.dnsConfig || null;
    } catch (error) {
      logger.error('Erro ao buscar config DNS', error);
      return null;
    }
  },

  async saveDnsConfig(userId: string, dnsConfig: { dnsUrl: string; dnsUsername: string; dnsPassword: string }): Promise<void> {
    try {
      await this.updateUserConfig(userId, {
        dnsConfig: {
          ...dnsConfig,
          lastFetchedAt: new Date().toISOString(),
        },
      } as any);
      logger.debug('Credenciais DNS salvas com sucesso');
    } catch (error) {
      logger.error('Erro ao salvar config DNS', error);
      throw error;
    }
  },
};
