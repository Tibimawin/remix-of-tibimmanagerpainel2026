import { useMemo } from 'react';
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
      // 🛡️ Validação robusta de token
      const currentToken = this.apiToken?.trim();
      if (!currentToken || currentToken.length < 5) {
        const errorMsg = 'Configuração do Baserow incompleta: Seu Token está ausente ou inválido. Salve as configurações novamente para sincronizar.';
        console.error('❌ [BaserowService] Erro:', errorMsg, { 
          tokenLength: currentToken?.length,
          baseUrl: this.baseUrl
        });
        throw new Error(errorMsg);
      }

      const proxyPayload = {
        url: originalUrl,
        method: method,
        token: currentToken,
        body: options.body || null
      };

      console.log(`🌐 [BaserowService] Requisição via VERCEL PROXY:`, {
        method,
        proxyUrl: this.proxyUrl,
        originalUrl: originalUrl,
        tokenPreview: `${currentToken.substring(0, 5)}...`,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); 

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'access_token': currentToken, // Envia nos headers também por segurança CORS
          'token': currentToken        // Backup redundante
        };

        const response = await fetch(this.proxyUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(proxyPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          console.error('❌ [BaserowService] TIMEOUT na requisição ao Proxy (35s)');
          throw new Error('A requisição ao servidor demorou muito (Timeout). Tente novamente em instantes.');
        }
        throw err;
      }
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
    if (!tableId || !tableId.trim()) {
      return { results: [], count: 0 };
    }

    try {
      console.log('=== getAllTableData INICIADO ===');
      console.log('Parâmetros:', { tableId, searchTerm, maxRecords });
      console.log('BaseURL:', this.baseUrl);
      console.log('ApiToken presente:', !!this.apiToken);

      let allResults: any[] = [];
      let page = 1;
      let hasMore = true;
      const batchSize = 100;
      // Limite seguro padrão de 1500 registros se maxRecords não for especificado para evitar sobrecarga do servidor
      const effectiveMax = maxRecords && maxRecords > 0 ? maxRecords : 1500;

      logger.debug('Carregando dados paginados da tabela', { effectiveMax });

      while (hasMore && allResults.length < effectiveMax) {
        const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
        const endpoint = `/api/database/rows/table/${tableId}/?user_field_names=true&page=${page}&size=${batchSize}${searchParam}`;

        let pageResponse: Response | null = null;
        let lastError: any = null;

        // Tentativa de carregar a página com 1 retry em caso de falha de conexão ou 502
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const resp = await this.makeRequest(endpoint);
            if (resp.ok) {
              pageResponse = resp;
              break;
            } else if (resp.status === 502 || resp.status === 500) {
              lastError = new Error(`Status ${resp.status}`);
              if (attempt === 1) {
                await new Promise(r => setTimeout(r, 800));
                continue;
              }
            } else {
              pageResponse = resp;
              break;
            }
          } catch (err: any) {
            lastError = err;
            if (attempt === 1) {
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
          }
        }

        // Se após retries não obtivemos resposta válida
        if (!pageResponse || !pageResponse.ok) {
          // Se já temos registros coletados de páginas anteriores, não quebramos a aplicação!
          if (allResults.length > 0) {
            logger.warn(`⚠️ Erro ao carregar página ${page} da tabela ${tableId}. Retornando ${allResults.length} registros já carregados para garantir estabilidade da tela.`);
            break;
          }

          // Se a página 1 falhou e não temos nenhum registro:
          const status = pageResponse ? pageResponse.status : 502;
          const errorText = pageResponse ? await pageResponse.text().catch(() => '') : (lastError?.message || '');

          console.error('❌ [BaserowService] Erro na requisição:', {
            status,
            errorText: errorText.substring(0, 300),
            endpoint
          });
          
          if (status === 401) {
            throw new Error('Erro de Autorização (401): Seu Token do Baserow está inválido ou ausente. Verifique suas credenciais nas Configurações.');
          }

          if (status === 404) {
            throw new Error(`Erro 404: Tabela ${tableId} não encontrada no Baserow. Verifique se o ID está correto nas Configurações.`);
          }

          if (status === 400 && errorText.includes('ERROR_USER_NOT_IN_GROUP')) {
            logger.warn('Sem permissão para acessar tabela no Baserow. Verifique se o token tem acesso ao grupo/workspace.');
            return { results: [], count: 0 };
          }
          
          if (status === 502 || status === 500) {
            throw new Error('Erro 502: O servidor Baserow retornou erro temporário ou está sobrecarregado. Tente novamente em instantes.');
          }
          
          const statusMsg = pageResponse?.statusText || errorText || 'Erro na comunicação com o servidor';
          throw new Error(`Erro ${status}: ${statusMsg}`);
        }

        const contentType = pageResponse.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
          if (allResults.length > 0) {
            logger.warn(`⚠️ Resposta não-JSON na página ${page}. Retornando ${allResults.length} registros obtidos.`);
            break;
          }
          const errorPreview = (await pageResponse.text()).slice(0, 500);
          throw new Error(`Resposta inválida do Baserow (não JSON). Status: ${pageResponse.status}. Preview: ${errorPreview.substring(0, 100)}`);
        }

        const data = await pageResponse.json();

        if (data.results?.length) {
          const remaining = effectiveMax - allResults.length;
          allResults = allResults.concat(data.results.slice(0, remaining));
          page++;
        } else {
          hasMore = false;
        }

        if (!data.next) hasMore = false;
        // Intervalo de 120ms entre páginas para não sobrecarregar a instância do Baserow
        await new Promise(r => setTimeout(r, 120));
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
    if (!tableId || !tableId.trim()) {
      return { results: [], count: 0, next: null };
    }

    try {
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const orderParam = order ? `&order=${encodeURIComponent(order)}` : '';
      const extra = extraParams ? `&${extraParams.replace(/^&/, '')}` : '';
      const endpoint = `/api/database/rows/table/${tableId}/?user_field_names=true&page=${page}&size=${size}${searchParam}${orderParam}${extra}`;

      let response = await this.makeRequest(endpoint);

      // 1 retry rápido se receber 502
      if (!response.ok && (response.status === 502 || response.status === 500)) {
        await new Promise(r => setTimeout(r, 800));
        try {
          const retryResp = await this.makeRequest(endpoint);
          if (retryResp.ok) {
            response = retryResp;
          }
        } catch {
          // Mantém a resposta original
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        if (response.status === 400 && errorText.includes('ERROR_USER_NOT_IN_GROUP')) {
          console.warn(`⚠️ Sem permissão para acessar tabela ${tableId}. Ignorando...`);
          return { results: [], count: 0, next: null };
        }
        if (response.status === 404) {
          throw new Error(`Erro 404: Tabela ${tableId} não encontrada no Baserow. Verifique se o ID está correto nas Configurações.`);
        }
        if (response.status === 502 || response.status === 500) {
          throw new Error('Erro 502: O servidor Baserow retornou erro temporário ou está sobrecarregado. Tente novamente em instantes.');
        }
        const statusMsg = response.statusText || errorText || 'Erro na comunicação';
        throw new Error(`Erro ${response.status}: ${statusMsg}`);
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
  return useMemo(
    () => new BaserowService(config.apiToken, config.baseUrl),
    [config.apiToken, config.baseUrl]
  );
};
