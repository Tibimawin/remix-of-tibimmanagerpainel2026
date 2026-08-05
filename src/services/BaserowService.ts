import { useConfig } from '../contexts/ConfigContext';
import { logger } from '@/utils/logger';
import BASEROW_PROXY_CONFIG from '@/config/proxyConfig';

export class BaserowService {
  private apiToken: string;
  private baseUrl: string;
  // 🔧 Detecção automática de ambiente (desenvolvimento/produção)
  private proxyUrl = BASEROW_PROXY_CONFIG.ACTIVE_PROXY_URL;

  constructor(apiToken: string, baseUrl: string) {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;

    // Log informativo
    console.log(`🌐 BaserowService inicializado:`, {
      proxyUrl: this.proxyUrl,
      environment: BASEROW_PROXY_CONFIG.getEnvironment(),
      usingSupabase: false
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

      console.log(`🌐 [BaserowService] Requisição via VERCEL PROXY:`, {
        method,
        proxyUrl: this.proxyUrl,
        originalUrl: originalUrl,
        tokenLength: this.apiToken?.length || 0,
      });

      // Validação básica de token antes de enviar
      if (!this.apiToken || this.apiToken.length < 5) {
        console.error('❌ [BaserowService] Erro: Token do Baserow ausente ou inválido!', { 
          tokenLength: this.apiToken?.length 
        });
        throw new Error('Configuração do Baserow incompleta: Token ausente. Vá em Configurações > IDs das Tabelas.');
      }

      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
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

  // 🔥 Deleção em lote otimizada (com fallback para versões antigas do Baserow)
  async deleteRowsBatch(tableId: string, rowIds: (string | number)[]): Promise<void> {
    if (!rowIds.length) return;

    const numericIds = rowIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => !isNaN(id));
    
    // Tentar primeiro o endpoint de batch delete (Baserow 1.18+)
    // POST /api/database/rows/table/{table_id}/batch-delete/
    const batchEndpoint = `/api/database/rows/table/${tableId}/batch-delete/`;
    const body = JSON.stringify({ items: numericIds });

    let attempt = 0;
    const maxRetries = 2;

    while (attempt < maxRetries) {
      attempt++;
      const start = Date.now();

      try {
        logger.debug(`🗑️ Tentando deletar ${numericIds.length} registros via batch-delete (tentativa ${attempt})`);
        const response = await this.makeRequest(batchEndpoint, { method: 'POST', body });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Se o endpoint não existe (404) ou não é suportado, usar fallback
          if (response.status === 404 || response.status === 400 || errorText.includes('HTML')) {
            logger.warn(`⚠️ Endpoint batch-delete não suportado, usando deleção individual...`);
            throw new Error('BATCH_NOT_SUPPORTED');
          }
          
          logger.warn(`⚠️ Erro ao deletar em lote (status ${response.status}): ${errorText}`);
          throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        const duration = Date.now() - start;
        logger.debug(`✅ Lote de ${numericIds.length} registros deletado em ${duration}ms`);
        return; // sucesso

      } catch (error: any) {
        // Se batch não é suportado, usar fallback de deleção individual
        if (error.message === 'BATCH_NOT_SUPPORTED' || error.message?.includes('HTML')) {
          logger.warn('⚠️ Batch delete não suportado nesta versão do Baserow, deletando individualmente...');
          
          // Fallback: deletar um por um com delay
          for (let i = 0; i < numericIds.length; i++) {
            const id = numericIds[i];
            try {
              await this.deleteRow(tableId, String(id));
              // Delay de 100ms entre deletes para evitar rate limit
              if (i < numericIds.length - 1) {
                await new Promise(r => setTimeout(r, 100));
              }
            } catch (deleteError: any) {
              // Se erro 404, o registro já foi deletado - continuar
              if (deleteError.message?.includes('404')) {
                logger.debug(`Registro ${id} já não existe, continuando...`);
                continue;
              }
              throw deleteError;
            }
          }
          logger.debug(`✅ ${numericIds.length} registros deletados individualmente`);
          return;
        }
        
        logger.error(`❌ Erro na tentativa ${attempt} de deleção em lote:`, error);
        if (attempt < maxRetries) {
          const delay = 300 * attempt;
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw error;
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
          
          if (response.status === 401) {
            throw new Error('Token do Baserow inválido ou expirado. Verifique as configurações em IDs das Tabelas.');
          }

          if (response.status === 400 && errorText.includes('ERROR_USER_NOT_IN_GROUP')) {
            logger.warn('Sem permissão para acessar tabela no Baserow. Verifique se o token tem acesso ao grupo/workspace.');
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

  async getTableData(tableId: string, page = 1, size = 100, searchTerm?: string, order?: string, extraParams?: string) {
    try {
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const orderParam = order ? `&order=${encodeURIComponent(order)}` : '';
      const extra = extraParams ? `&${extraParams.replace(/^&/, '')}` : '';
      const endpoint = `/api/database/rows/table/${tableId}/?user_field_names=true&page=${page}&size=${size}${searchParam}${orderParam}${extra}`;

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
