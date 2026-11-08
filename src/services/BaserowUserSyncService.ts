import { BaserowService } from './BaserowService';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
let cachedBaserowConfig: (ResolvedBaserowConfig & { ownerId?: string }) | null = null;

export const BaserowUserSyncService = {
  /**
   * Resolve as credenciais do Baserow APENAS da própria conta do usuário logado:
   * 1. Parâmetro explícito (config do componente, já do usuário logado)
   * 2. Cache em memória — somente se for do MESMO usuário
   * 3. Firestore: userConfigs/<uid> (configuração pessoal do usuário)
   *
   * ⚠️ ISOLAMENTO POR CONTA: nunca usa o localStorage global ('admin-config'),
   * o 'systemConfig/baserow' compartilhado nem as configs de outros usuários.
   */
  async resolveBaserowConfig(overrideConfig?: any, opts?: { userId?: string }): Promise<ResolvedBaserowConfig | null> {
    const uid = opts?.userId || '';

    // 1. Parâmetro explícito (config do usuário logado passada pelo componente)
    if (overrideConfig?.apiToken && overrideConfig?.baseUrl && overrideConfig?.tableIds?.usuarios) {
      const resolved: ResolvedBaserowConfig = {
        apiToken: overrideConfig.apiToken.trim(),
        baseUrl: overrideConfig.baseUrl.trim(),
        usuariosTableId: String(overrideConfig.tableIds.usuarios).trim()
      };
      cachedBaserowConfig = { ...resolved, ownerId: uid || undefined };
      return resolved;
    }

    // 2. Cache em memória — válido apenas para o MESMO usuário
    if (cachedBaserowConfig?.apiToken && cachedBaserowConfig?.baseUrl && cachedBaserowConfig?.usuariosTableId) {
      if (!uid || !cachedBaserowConfig.ownerId || cachedBaserowConfig.ownerId === uid) {
        return cachedBaserowConfig;
      }
      cachedBaserowConfig = null;
    }

    // 3. Firestore: configuração pessoal do PRÓPRIO usuário (userConfigs/<uid>)
    if (uid) {
      try {
        const snap = await getDoc(doc(db, 'userConfigs', uid));
        if (snap.exists()) {
          const data: any = snap.data();
          if (data.userId && data.userId !== uid) {
            console.error('⚠️ [BaserowUserSync] Configuração não pertence ao usuário logado; ignorando.');
            return null;
          }
          if (data.apiToken && data.baseUrl && data.tableIds?.usuarios) {
            const resolved: ResolvedBaserowConfig = {
              apiToken: String(data.apiToken).trim(),
              baseUrl: String(data.baseUrl).trim(),
              usuariosTableId: String(data.tableIds.usuarios).trim()
            };
            cachedBaserowConfig = { ...resolved, ownerId: uid };
            return resolved;
          }
        }
      } catch (e) {
        console.warn('⚠️ [BaserowUserSync] Erro ao buscar a configuração do próprio usuário no Firestore:', e);
      }
    }

    return null;
  },

  /**
   * Sincroniza um usuário do Firebase diretamente com a tabela 'usuarios' no Baserow
   */
  async syncUserToBaserow(
    user: BaserowSyncUserData,
    configOverride?: any,
    opts?: { userId?: string }
  ): Promise<BaserowSyncResult> {
    try {
      if (!user.email) {
        return { success: false, error: 'Email do usuário é obrigatório para sincronização' };
      }

      const config = await this.resolveBaserowConfig(configOverride, opts);
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
