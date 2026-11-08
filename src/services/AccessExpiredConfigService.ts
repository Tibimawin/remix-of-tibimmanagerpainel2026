import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

export interface AccessExpiredConfig {
  title: string;
  description: string;
  instructions: string[];
  contactType: 'email' | 'whatsapp';
  contactValue: string;
  contactLabel: string;
  lastUpdated: string;
  updatedBy: string;
}

export const defaultConfig: AccessExpiredConfig = {
  title: 'Acesso Expirado',
  description: 'Seu período de acesso ao sistema expirou',
  instructions: [
    'Entre em contato com o administrador',
    'Solicite a renovação do seu plano',
    'Aguarde a ativação do novo período'
  ],
  contactType: 'email',
  contactValue: 'admin@admin.com',
  contactLabel: 'Suporte',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system'
};

export const AccessExpiredConfigService = {
  // Buscar configuração global de acesso expirado
  async getConfig(): Promise<AccessExpiredConfig> {
    try {
      logger.debug('Buscando configuração de acesso expirado');
      
      const docRef = doc(db, 'systemConfigs', 'accessExpiredMessage');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as AccessExpiredConfig;
        logger.debug('Configuração encontrada');
        return data;
      } else {
        logger.debug('Configuração não encontrada, usando padrão');
        return defaultConfig;
      }
    } catch (error) {
      logger.error('Erro ao buscar configuração', error);
      return defaultConfig;
    }
  },

  // Salvar configuração global de acesso expirado
  async saveConfig(config: Omit<AccessExpiredConfig, 'lastUpdated' | 'updatedBy'>, updatedBy: string): Promise<void> {
    try {
      logger.debug('Salvando configuração de acesso expirado');
      
      const configData: AccessExpiredConfig = {
        ...config,
        lastUpdated: new Date().toISOString(),
        updatedBy
      };

      const docRef = doc(db, 'systemConfigs', 'accessExpiredMessage');
      await setDoc(docRef, configData);
      
      logger.debug('Configuração salva com sucesso');
    } catch (error) {
      logger.error('Erro ao salvar configuração', error);
      throw error;
    }
  },

  // Listener em tempo real para configuração
  onConfigChange(callback: (config: AccessExpiredConfig) => void) {
    logger.debug('Iniciando listener de configuração de acesso expirado');
    const docRef = doc(db, 'systemConfigs', 'accessExpiredMessage');
    
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as AccessExpiredConfig;
          logger.debug('Configuração atualizada em tempo real');
          callback(data);
        } else {
          logger.debug('Configuração não existe, usando padrão');
          callback(defaultConfig);
        }
      },
      (error) => {
        logger.error('Erro no listener de configuração', error);
        callback(defaultConfig);
      }
    );

    return unsubscribe;
  },

  // Migrar configuração do localStorage para Firebase
  async migrateFromLocalStorage(updatedBy: string): Promise<void> {
    try {
      logger.debug('Verificando migração do localStorage');
      
      // Verificar se já existe configuração no Firebase
      const existingConfig = await this.getConfig();
      if (existingConfig.updatedBy !== 'system') {
        logger.debug('Configuração já existe no Firebase, pulando migração');
        return;
      }

      // Buscar configuração do localStorage
      const localConfig = localStorage.getItem('access-expired-config');
      
      if (!localConfig) {
        logger.debug('Nenhuma configuração local encontrada');
        return;
      }

      try {
        const parsedConfig = JSON.parse(localConfig);
        
        // Migrar configuração
        const migratedConfig = {
          title: parsedConfig.title || defaultConfig.title,
          description: parsedConfig.description || defaultConfig.description,
          instructions: parsedConfig.instructions || defaultConfig.instructions,
          contactType: parsedConfig.contactType || defaultConfig.contactType,
          contactValue: parsedConfig.contactValue || defaultConfig.contactValue,
          contactLabel: parsedConfig.contactLabel || defaultConfig.contactLabel
        };

        await this.saveConfig(migratedConfig, updatedBy);
        logger.debug('Migração concluída com sucesso');
        
        // Remover do localStorage após migração bem-sucedida
        localStorage.removeItem('access-expired-config');
        
      } catch (parseError) {
        logger.error('Erro ao fazer parse da configuração local', parseError);
      }
      
    } catch (error) {
      logger.error('Erro na migração', error);
    }
  }
};