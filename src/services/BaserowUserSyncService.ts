import { BaserowService } from './BaserowService';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { logger } from '@/utils/logger';

export interface BaserowSyncUserData {
  name: string;
  email: string;
  accessDays?: number;
  startDate?: string;
  expiryDate: string;
  isActive: boolean;
}

export interface BaserowSyncResult {
  success: boolean;
  action?: 'updated' | 'created' | 'skipped';
  rowId?: string | number;
  message?: string;
  error?: string;
}

export interface ResolvedBaserowConfig {
  apiToken: string;
  baseUrl: string;
  usuariosTableId: string;
}

// Cache em memória para não precisar buscar em múltiplos lugares a cada clique
let cachedBaserowConfig: ResolvedBaserowConfig | null = null;

export const BaserowUserSyncService = {
  /**
   * Resolve as credenciais do Baserow a partir de múltiplos locais com fallback:
   * 1. Parâmetro explícito (do ConfigContext do componente)
   * 2. Cache em memória
   * 3. localStorage (admin-config / user-baserow-config)
   * 4. Firestore (coleção userConfigs / systemConfig)
   */
  async resolveBaserowConfig(overrideConfig?: any): Promise<ResolvedBaserowConfig | null> {
    // 1. Tentar parâmetro explícito
    if (overrideConfig?.apiToken && overrideConfig?.baseUrl && overrideConfig?.tableIds?.usuarios) {
      const resolved: ResolvedBaserowConfig = {
        apiToken: overrideConfig.apiToken.trim(),
        baseUrl: overrideConfig.baseUrl.trim(),
        usuariosTableId: String(overrideConfig.tableIds.usuarios).trim()
      };
      cachedBaserowConfig = resolved;
      return resolved;
    }

    // 2. Cache em memória válido
    if (cachedBaserowConfig?.apiToken && cachedBaserowConfig?.baseUrl && cachedBaserowConfig?.usuariosTableId) {
      return cachedBaserowConfig;
    }

    // 3. Tentar localStorage
    try {
      const localAdminConfig = localStorage.getItem('admin-config');
      if (localAdminConfig) {
        const parsed = JSON.parse(localAdminConfig);
        if (parsed.apiToken && parsed.baseUrl && parsed.tableIds?.usuarios) {
          const resolved: ResolvedBaserowConfig = {
            apiToken: parsed.apiToken.trim(),
            baseUrl: parsed.baseUrl.trim(),
            usuariosTableId: String(parsed.tableIds.usuarios).trim()
          };
          cachedBaserowConfig = resolved;
          return resolved;
        }
      }

      const localUserConfig = localStorage.getItem('user-baserow-config');
      if (localUserConfig) {
        const parsed = JSON.parse(localUserConfig);
        if (parsed.apiToken && parsed.baseUrl && parsed.tableIds?.usuarios) {
          const resolved: ResolvedBaserowConfig = {
            apiToken: parsed.apiToken.trim(),
            baseUrl: parsed.baseUrl.trim(),
            usuariosTableId: String(parsed.tableIds.usuarios).trim()
          };
          cachedBaserowConfig = resolved;
          return resolved;
        }
      }
    } catch (e) {
      console.warn('⚠️ Erro ao ler configuração local do Baserow:', e);
    }

    // 4. Tentar Firestore
    try {
      // Verificar se há configuração em systemConfig/baserow
      const sysDoc = await getDoc(doc(db, 'systemConfig', 'baserow'));
      if (sysDoc.exists()) {
        const data = sysDoc.data();
        if (data.apiToken && data.baseUrl && (data.usuariosTableId || data.tableIds?.usuarios)) {
          const resolved: ResolvedBaserowConfig = {
            apiToken: data.apiToken.trim(),
            baseUrl: data.baseUrl.trim(),
            usuariosTableId: String(data.usuariosTableId || data.tableIds?.usuarios).trim()
          };
          cachedBaserowConfig = resolved;
          return resolved;
        }
      }

      // Buscar na coleção userConfigs
      const userConfigsSnap = await getDocs(collection(db, 'userConfigs'));
      for (const configDoc of userConfigsSnap.docs) {
        const data = configDoc.data();
        if (data.apiToken && data.baseUrl && data.tableIds?.usuarios) {
          const resolved: ResolvedBaserowConfig = {
            apiToken: data.apiToken.trim(),
            baseUrl: data.baseUrl.trim(),
            usuariosTableId: String(data.tableIds.usuarios).trim()
          };
          cachedBaserowConfig = resolved;
          return resolved;
        }
      }
    } catch (e) {
      console.warn('⚠️ Erro ao buscar configuração do Baserow no Firestore:', e);
    }

    return null;
  },

  /**
   * Sincroniza um usuário do Firebase diretamente com a tabela 'usuarios' no Baserow
   */
  async syncUserToBaserow(
    user: BaserowSyncUserData,
    configOverride?: any
  ): Promise<BaserowSyncResult> {
    try {
      if (!user.email) {
        return { success: false, error: 'Email do usuário é obrigatório para sincronização' };
      }

      const config = await this.resolveBaserowConfig(configOverride);
      if (!config) {
        console.warn('⚠️ [BaserowUserSync] Configuração do Baserow ou ID da tabela de usuários não encontrado');
        return {
          success: false,
          error: 'Configuração do Baserow não encontrada. Verifique o Token e a Tabela de Usuários nas Configurações.'
        };
      }

      const { apiToken, baseUrl, usuariosTableId } = config;
      const baserow = new BaserowService(apiToken, baseUrl);

      const targetEmail = user.email.trim().toLowerCase();
      console.log(`🔄 [BaserowUserSync] Buscando usuário ${targetEmail} na tabela ${usuariosTableId}...`);

      // 1. Buscar se o usuário já existe na tabela de usuários do Baserow
      let searchResult: any = null;
      try {
        searchResult = await baserow.getAllTableData(usuariosTableId, targetEmail, 20);
      } catch (err: any) {
        console.error('❌ [BaserowUserSync] Erro ao buscar dados na tabela de usuários:', err);
        return {
          success: false,
          error: `Erro ao consultar Baserow: ${err.message || 'Falha de conexão'}`
        };
      }

      const rows: any[] = Array.isArray(searchResult) 
        ? searchResult 
        : (searchResult?.results || []);

      // Encontrar a linha correspondente exatamente pelo email
      const existingRow = rows.find((row: any) => {
        const rowEmailEntry = Object.entries(row).find(([key]) => {
          const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
          return normalizedKey === 'email' || normalizedKey === 'mail';
        });
        const rowEmailVal = rowEmailEntry ? String(rowEmailEntry[1] || '').trim().toLowerCase() : '';
        return rowEmailVal === targetEmail;
      });

      // Formatar datas para padrão seguro do Baserow
      const formattedExpiry = user.expiryDate.includes('T')
        ? user.expiryDate.split('.')[0] + 'Z'
        : `${user.expiryDate}T23:59:59Z`;

      const formattedStartDate = user.startDate
        ? (user.startDate.includes('T') ? user.startDate.split('.')[0] + 'Z' : `${user.startDate}T00:00:00Z`)
        : undefined;

      const statusText = user.isActive ? 'Ativo' : 'Expirado';

      if (existingRow) {
        // --- ATUALIZAÇÃO ---
        const originalKeys = Object.keys(existingRow);

        const vencimentoKey = originalKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'vencimento' || l === 'datavencimento' || l === 'expirydate';
        }) || 'Vencimento';

        const statusKey = originalKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'status' || l === 'situacao';
        }) || 'Status';

        const diasKey = originalKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'totaldedias' || l === 'dias' || l === 'totaldias' || l === 'accessdays';
        });

        const pagamentoKey = originalKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'datapagamento' || l === 'pagamento' || l === 'datacriacao' || l === 'startdate';
        });

        const nomeKey = originalKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'nome' || l === 'name' || l === 'usuario';
        });

        const updatePayload: Record<string, any> = {
          [vencimentoKey]: formattedExpiry,
          [statusKey]: statusText
        };

        if (diasKey && user.accessDays !== undefined) {
          updatePayload[diasKey] = Number(user.accessDays);
        }

        if (pagamentoKey && formattedStartDate) {
          updatePayload[pagamentoKey] = formattedStartDate;
        }

        if (nomeKey && user.name) {
          updatePayload[nomeKey] = user.name;
        }

        console.log(`✅ [BaserowUserSync] Atualizando row ${existingRow.id} no Baserow:`, updatePayload);
        await baserow.updateRow(usuariosTableId, String(existingRow.id), updatePayload);

        return {
          success: true,
          action: 'updated',
          rowId: existingRow.id,
          message: `Usuário sincronizado com sucesso no Baserow (Row #${existingRow.id})`
        };
      } else {
        // --- CRIAÇÃO ---
        // Se a tabela já tem alguma linha, tentar descobrir os nomes exatos das colunas
        const sampleRow = rows.length > 0 ? rows[0] : null;
        const sampleKeys = sampleRow ? Object.keys(sampleRow) : [];

        const nomeKey = sampleKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'nome' || l === 'name' || l === 'usuario';
        }) || 'Nome';

        const emailKey = sampleKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'email' || l === 'mail';
        }) || 'Email';

        const vencimentoKey = sampleKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'vencimento' || l === 'datavencimento' || l === 'expirydate';
        }) || 'Vencimento';

        const statusKey = sampleKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'status' || l === 'situacao';
        }) || 'Status';

        const diasKey = sampleKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'totaldedias' || l === 'dias' || l === 'totaldias' || l === 'accessdays';
        }) || 'Total de Dias';

        const pagamentoKey = sampleKeys.find(k => {
          const l = k.toLowerCase().replace(/[\s_-]/g, '');
          return l === 'datapagamento' || l === 'pagamento' || l === 'datacriacao' || l === 'startdate';
        }) || 'Data Pagamento';

        const createPayload: Record<string, any> = {
          [nomeKey]: user.name,
          [emailKey]: user.email,
          [vencimentoKey]: formattedExpiry,
          [statusKey]: statusText,
          [diasKey]: Number(user.accessDays || 30)
        };

        if (formattedStartDate) {
          createPayload[pagamentoKey] = formattedStartDate;
        }

        console.log(`✨ [BaserowUserSync] Criando novo registro de usuário no Baserow:`, createPayload);
        const createdRow = await baserow.createRow(usuariosTableId, createPayload);

        return {
          success: true,
          action: 'created',
          rowId: createdRow?.id,
          message: `Novo usuário cadastrado e sincronizado no Baserow (Row #${createdRow?.id})`
        };
      }
    } catch (error: any) {
      console.error('❌ [BaserowUserSync] Erro fatal durante sincronização:', error);
      return {
        success: false,
        error: error.message || 'Erro inesperado na sincronização com o Baserow'
      };
    }
  }
};
