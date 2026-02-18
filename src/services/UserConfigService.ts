import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

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
  }
};