import { useConfig } from '../contexts/ConfigContext';
import { logger } from '@/utils/logger';
import BASEROW_PROXY_CONFIG from '@/config/proxyConfig';
import { supabase } from '@/integrations/supabase/client';

export class BaserowService {
  private apiToken: string;
  private baseUrl: string;
  // 🔧 Detecção automática de ambiente (desenvolvimento/produção)
  private proxyUrl = BASEROW_PROXY_CONFIG.ACTIVE_PROXY_URL;
  private isUsingSupabase = BASEROW_PROXY_CONFIG.isUsingSupabase();

  constructor(apiToken: string, baseUrl: string) {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;

    // Log informativo
    console.log(`🌐 BaserowService inicializado:`, {
      proxyUrl: this.proxyUrl,
      environment: BASEROW_PROXY_CONFIG.getEnvironment(),
      usingSupabase: this.isUsingSupabase
    });
  }

  private needsProxy(): boolean {
    return this.baseUrl.startsWith('http://');
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const method = options.method || 'GET';
    const originalUrl = `${this.baseUrl}${endpoint}`;
    logger.debug('Fazendo requisição ao Baserow', { method, needsProxy: this.needsProxy() });

    if (this.needsProxy()) {
      const proxyPayload = {
        url: originalUrl,
        method: method,
        token: this.apiToken,
        body: options.body || null
      };

      // Usar supabase.functions.invoke para Supabase Edge Function (evita CORS)
      if (this.isUsingSupabase) {
        console.log(`🌐 [BaserowService] Requisição via SUPABASE (functions.invoke):`, {
          method,
          originalUrl: originalUrl,
          tokenPreview: this.apiToken.substring(0, 15) + '...',
        });

        console.log('📦 [BaserowService] Payload para Supabase:', {
          url: proxyPayload.url,
          method: proxyPayload.method,
          hasToken: !!proxyPayload.token,
          hasBody: !!proxyPayload.body
        });

        const { data, error } = await supabase.functions.invoke('baserow-proxy', {
          body: proxyPayload
        });

        if (error) {
          console.error('❌ [BaserowService] Erro na Edge Function:', error);
          throw new Error(`Edge Function error: ${error.message}`);
        }

        // Retornar um objeto Response-like para manter compatibilidade
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => data,
          text: async () => JSON.stringify(data),
        } as Response;
      }

      // Usar fetch direto para Vercel Serverless
      console.log(`🌐 [BaserowService] Requisição via VERCEL PROXY:`, {
        method,
        proxyUrl: this.proxyUrl,
        originalUrl: originalUrl,
        tokenPreview: this.apiToken.substring(0, 15) + '...',
        tokenLength: this.apiToken.length,
        hasUserFieldNames: originalUrl.includes('user_field_names=true'),
        bodyLength: options.body ? (options.body as string).length : 0,
        bodyPreview: options.body ? (options.body as string).substring(0, 150) : 'N/A'
      });

      console.log('📦 [BaserowService] Payload para Vercel:', {
        url: proxyPayload.url,
        method: proxyPayload.method,
        hasToken: !!proxyPayload.token,
        tokenPreview: proxyPayload.token?.substring(0, 15) + '...',
        hasBody: !!proxyPayload.body
      });

      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proxyPayload)
      });

      return response;
    } else {
      // HTTPS direto
      console.log('🔗 [BaserowService] Requisição DIRETA (HTTPS):', {
        method,
        url: originalUrl,
        hasUserFieldNames: originalUrl.includes('user_field_names=true')
      });

      return fetch(originalUrl, {
        ...options,
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    }
  }

  // 🔥 NOVO: Deleção em lote otimizada
  async deleteRowsBatch(tableId: string, rowIds: (string | number)[]): Promise<void> {
    if (!rowIds.length) return;

    const endpoint = `/api/database/rows/table/${tableId}/batch-delete/`;
    // Baserow expects { items: [int, int, ...] }
    const numericIds = rowIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => !isNaN(id));
    const body = JSON.stringify({ items: numericIds });

    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      attempt++;
      const start = Date.now();

      try {
        logger.debug(`🗑️ Tentando deletar ${rowIds.length} registros (tentativa ${attempt})`);
        const response = await this.makeRequest(endpoint, { method: 'POST', body });

        if (!response.ok) {
          const errorText = await response.text();
          logger.warn(`⚠️ Erro ao deletar em lote (status ${response.status}): ${errorText}`);
          throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        const duration = Date.now() - start;
        logger.debug(`✅ Lote de ${rowIds.length} registros deletado em ${duration}ms`);
        return; // sucesso → sair do loop

      } catch (error) {
        logger.error(`❌ Erro na tentativa ${attempt} de deleção em lote:`, error);
        if (attempt < maxRetries) {
          // pequena pausa antes de tentar novamente
          const delay = 200 * attempt;
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw error; // falhou todas as tentativas
        }
      }
    }
  }

  async getAllTableData(tableId: string, searchTerm?: string, maxRecords?: number) {
    try {
      console.log('=== getAllTableData INICIADO ===');
      console.log('Parâmetros:', { tableId, searchTerm, maxRecords });
      console.log('BaseURL:', this.baseUrl);
      console.log('ApiToken presente:', !!this.apiToken);

      let allResults: any[] = [];
      let page = 1;
      let hasMore = true;
      const batchSize = 100;

      logger.debug('Carregando dados paginados da tabela', { maxRecords });

      while (hasMore && (!maxRecords || allResults.length < maxRecords)) {
        const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
        const endpoint = `/api/database/rows/table/${tableId}/?user_field_names=true&page=${page}&size=${batchSize}${searchParam}`;

        const response = await this.makeRequest(endpoint);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [BaserowService] Erro na requisição:', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText.substring(0, 300),
            endpoint
          });
          
          if (response.status === 400 && errorText.includes('ERROR_USER_NOT_IN_GROUP')) {
            logger.warn('Sem permissão para acessar tabela');
            return { results: [], count: 0 };
          }
          
          // Se for erro 502 do proxy, tentar extrair a mensagem
          if (response.status === 502) {
            try {
              const errorData = JSON.parse(errorText);
              throw new Error(`Proxy Error: ${errorData.error}. ${errorData.details || ''}`);
            } catch {
              throw new Error(`Erro ${response.status}: Proxy falhou ao conectar ao Baserow`);
            }
          }
          
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
          const errorPreview = (await response.text()).slice(0, 500);
          console.error('❌ [BaserowService] Resposta não JSON:', {
            status: response.status,
            statusText: response.statusText,
            contentType,
            url: `${this.baseUrl}${endpoint}`,
            preview: errorPreview,
            needsProxy: this.needsProxy(),
            proxyUrl: this.proxyUrl
          });
          throw new Error(`Resposta inválida do Baserow (não JSON). Status: ${response.status}. Preview: ${errorPreview.substring(0, 100)}`);
        }

        const data = await response.json();

        if (data.results?.length) {
          const remaining = maxRecords ? maxRecords - allResults.length : data.results.length;
          allResults = allResults.concat(data.results.slice(0, remaining));
          page++;
        } else {
          hasMore = false;
        }

        if (!data.next) hasMore = false;
        await new Promise(r => setTimeout(r, 50));
      }

      logger.debug('Dados carregados', { totalRecords: allResults.length });
      allResults.sort((a: any, b: any) => Number(b.id) - Number(a.id));

      return { results: allResults, count: allResults.length };
    } catch (error) {
      logger.error('Erro ao buscar dados da tabela', error);
      throw error;
    }
  }

  async getTableData(tableId: string, page = 1, size = 100, searchTerm?: string, order?: string) {
    try {
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const orderParam = order ? `&order=${encodeURIComponent(order)}` : '';
      const endpoint = `/api/database/rows/table/${tableId}/?page=${page}&size=${size}&user_field_names=true${searchParam}${orderParam}`;

      const response = await this.makeRequest(endpoint);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 400 && errorText.includes('ERROR_USER_NOT_IN_GROUP')) {
          console.warn(`⚠️ Sem permissão para acessar tabela ${tableId}. Ignorando...`);
          return { results: [], count: 0, next: null };
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar dados da tabela:', error);
      throw error;
    }
  }

  async createRow(tableId: string, data: any) {
    const endpoint = `/api/database/rows/table/${tableId}/?user_field_names=true`;
    console.log('🔧 [BaserowService] createRow chamado:', {
      tableId,
      endpoint,
      needsProxy: this.needsProxy(),
      fullUrl: `${this.baseUrl}${endpoint}`,
      dataKeys: Object.keys(data)
    });

    const response = await this.makeRequest(endpoint, { method: 'POST', body: JSON.stringify(data) });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BaserowService] Erro ao criar row:', {
        status: response.status,
        error: errorText
      });
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ [BaserowService] Row criado, resposta:', result);
    return result;
  }

  async updateRow(tableId: string, rowId: string, data: any) {
    const endpoint = `/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;
    const response = await this.makeRequest(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
    if (!response.ok) throw new Error(`Erro ${response.status}: ${await response.text()}`);
    return response.json();
  }

  async deleteRow(tableId: string, rowId: string) {
    const endpoint = `/api/database/rows/table/${tableId}/${rowId}/`;
    const response = await this.makeRequest(endpoint, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Erro ${response.status}: ${await response.text()}`);
    return true;
  }

  // 🚀 Criação em lote otimizada (até 200 rows por chamada)
  async createRowsBatch(tableId: string, rows: any[]): Promise<any[]> {
    if (!rows.length) return [];

    const MAX_BATCH_SIZE = 200;
    const allCreated: any[] = [];

    // Dividir em sub-lotes de até 200
    for (let i = 0; i < rows.length; i += MAX_BATCH_SIZE) {
      const chunk = rows.slice(i, i + MAX_BATCH_SIZE);
      const endpoint = `/api/database/rows/table/${tableId}/batch/?user_field_names=true`;
      const body = JSON.stringify({ items: chunk });

      let attempt = 0;
      const maxRetries = 3;

      while (attempt < maxRetries) {
        attempt++;
        try {
          logger.debug(`📦 Criando lote de ${chunk.length} registros (tentativa ${attempt})`);
          const response = await this.makeRequest(endpoint, { method: 'POST', body });

          if (!response.ok) {
            const errorText = await response.text();
            logger.warn(`⚠️ Erro batch-create (status ${response.status}): ${errorText}`);
            throw new Error(`Erro ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          const created = data.items || data;
          allCreated.push(...(Array.isArray(created) ? created : [created]));
          break; // sucesso
        } catch (error) {
          logger.error(`❌ Erro na tentativa ${attempt} de batch-create:`, error);
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 300 * attempt));
          } else {
            throw error;
          }
        }
      }
    }

    logger.debug(`✅ Total de ${allCreated.length} registros criados em lote`);
    return allCreated;
  }
}

export const useBaserowService = () => {
  const { config } = useConfig();
  return new BaserowService(config.apiToken, config.baseUrl);
};
