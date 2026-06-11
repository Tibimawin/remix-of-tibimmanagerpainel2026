import { useBaserowService } from './BaserowService';
import { makeProxyRequest } from '@/utils/proxyRequest';
import { tmdbService } from './TmdbService';

export interface ImportContent {
  id: string;
  Titulo: string;
  Tipo: 'Filme' | 'Serie' | 'TV';
  Ano?: string;
  Genero?: string;
  Sinopse?: string;
  Poster?: string;
  Link?: string;
  Categoria?: string;
  Capa?: string;
  Idioma?: string;
  Views?: string;
  Temporadas?: string;
  Imdb?: string;
  'Data de Lançamento'?: string;
  'Capa de fundo'?: string;
}

export interface ImportEpisode {
  id: string;
  Titulo: string;
  Serie: string;
  Temporada: string;
  Episodio: string;
  Link?: string;
  Sinopse?: string;
}

export interface ImportConfig {
  id?: string;
  sourceToken: string;
  sourceBaseUrl: string;
  contentTableId: string;
  episodeTableId: string;
  isActive: boolean;
  // Configurações para busca de episódios
  episodeMatchType?: 'contains' | 'exact' | 'custom';
  episodeKeyField?: string; // Campo personalizado para associação (ex: "Serie")
  episodeSearchField?: string; // Campo onde fazer a busca (padrão: "Nome")
}

export interface UserConfig {
  apiToken: string;
  baseUrl: string;
  contentTableId: string;
  episodeTableId?: string;
  tableIds?: {
    canaisTv?: string;
  };
}

export interface PaginatedResponse {
  results: ImportContent[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Singleton cache manager - improved with better loading state management
class CacheManager {
  private static instance: CacheManager | null = null;
  private cache: ImportContent[] | null = null;
  private isLoading: boolean = false;
  private loadingPromise: Promise<ImportContent[]> | null = null;
  private lastConfigHash: string = '';
  private requestQueue: Array<() => void> = [];
  private isProcessingQueue: boolean = false;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private getConfigHash(config: ImportConfig): string {
    return `${config.sourceBaseUrl}-${config.contentTableId}-${config.sourceToken.slice(-10)}`;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    while (this.requestQueue.length > 0) {
      const callback = this.requestQueue.shift();
      if (callback) {
        callback();
      }
      // Small delay between queue processing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.isProcessingQueue = false;
  }

  async getCache(config: ImportConfig, forceReload = false): Promise<ImportContent[]> {
    const configHash = this.getConfigHash(config);

    // Clear cache if config changed
    if (this.lastConfigHash && this.lastConfigHash !== configHash) {
      console.log('Configuração mudou, limpando cache...');
      this.clearCache();
    }
    this.lastConfigHash = configHash;

    // Return cached data if available and not forcing reload
    if (this.cache && !forceReload) {
      console.log('Retornando dados do cache:', this.cache.length, 'registros');
      return this.cache;
    }

    // If already loading, wait for the existing promise
    if (this.isLoading && this.loadingPromise) {
      console.log('Cache já está sendo carregado, aguardando...');
      return this.loadingPromise;
    }

    // Start new loading process
    console.log('Iniciando novo carregamento do cache...');
    this.isLoading = true;
    this.loadingPromise = this.loadAllContent(config);

    try {
      this.cache = await this.loadingPromise;
      console.log('Cache carregado com sucesso:', this.cache.length, 'registros');
      return this.cache;
    } catch (error) {
      console.error('Erro no carregamento do cache:', error);
      throw error;
    } finally {
      // CRITICAL: Always reset loading state
      console.log('Finalizando estado de carregamento...');
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  private async loadAllContent(config: ImportConfig): Promise<ImportContent[]> {
    const results: any[] = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 50;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    const pageSize = 200;

    console.log('Iniciando carregamento completo de conteúdos...');

    while (hasMore && page <= maxPages && consecutiveErrors < maxConsecutiveErrors) {
      try {
        console.log(`Carregando página ${page}/${maxPages}...`);

        const endpoint = `/api/database/rows/table/${config.contentTableId}/?user_field_names=true&page=${page}&size=${pageSize}`;
        const originalUrl = `${config.sourceBaseUrl}${endpoint}`;

        const result = await makeProxyRequest({
          url: originalUrl,
          method: 'GET',
          token: config.sourceToken,
          body: null,
        });

        if (!result.ok) {
          const errorText = result.error || 'Erro desconhecido no proxy central';
          console.error('Erro na resposta da API:', result.status, errorText);

          if (result.status === 429) {
            console.log('Rate limit atingido, aguardando 3 segundos...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }

          consecutiveErrors++;
          if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Muitos erros consecutivos. Último erro ${result.status}: ${errorText}`);
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        const data = result.data;

        const pageResults = data.results || [];
        console.log(`Página ${page} carregada: ${pageResults.length} registros de ${pageSize} solicitados`);

        if (pageResults.length > 0) {
          results.push(...pageResults);
          consecutiveErrors = 0;

          if (pageResults.length < pageSize || !data.next) {
            console.log(`Última página detectada (página ${page}): ${pageResults.length} < ${pageSize} ou next=${data.next}`);
            hasMore = false;
          } else {
            page++;
          }
        } else {
          console.log(`Página ${page} vazia, finalizando carregamento`);
          hasMore = false;
        }

        console.log(`Progresso: ${results.length} registros carregados até agora`);

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }

      } catch (error) {
        console.error(`Erro ao carregar página ${page}:`, error);
        consecutiveErrors++;

        if (error.message?.includes('ERR_INSUFFICIENT_RESOURCES') ||
          error.message?.includes('Failed to fetch')) {
          console.log('Recursos insuficientes, aguardando 5 segundos antes de tentar novamente...');
          await new Promise(resolve => setTimeout(resolve, 5000));

          if (consecutiveErrors < maxConsecutiveErrors) {
            continue;
          }
        }

        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(`Falha após ${maxConsecutiveErrors} tentativas consecutivas: ${error.message}`);
          throw new Error(`Falha após ${maxConsecutiveErrors} tentativas consecutivas: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log(`✅ Carregamento finalizado! Total de registros carregados: ${results.length}`);

    const filteredContents = results.filter((content: any) => {
      const tipo = content.Tipo;
      if (!tipo) return false;

      const tipoLower = tipo.toString().toLowerCase();
      return tipoLower.includes('filme') ||
        tipoLower.includes('film') ||
        tipoLower.includes('movie') ||
        tipoLower.includes('serie') ||
        tipoLower.includes('series') ||
        tipoLower.includes('tv') ||
        tipo === 'Filme' ||
        tipo === 'Serie' ||
        tipo === 'TV';
    }).map((content: any) => ({
      ...content,
      Titulo: content.Titulo || content.Nome || content.Title || 'Sem título',
      Tipo: content.Tipo || '',
      Categoria: content.Categoria || content.Category || '',
      Sinopse: content.Sinopse || content.Synopsis || content.Description || '',
      Poster: content.Poster || content.Capa || content.Image || '',
      Capa: content.Capa || content.Poster || content.Image || '',
      Link: content.Link || content.Url || '',
      Idioma: content.Idioma || content.Language || '',
      Views: content.Views || '',
      Temporadas: content.Temporadas || content.Seasons || ''
    }));

    filteredContents.sort((a: any, b: any) => (Number(b.id) || 0) - (Number(a.id) || 0));

    console.log(`🎯 Conteúdos processados e ordenados: ${filteredContents.length} de ${results.length} registros totais`);
    return filteredContents;
  }

  clearCache() {
    console.log('Limpando cache...');
    this.cache = null;
    this.isLoading = false;
    this.loadingPromise = null;
    this.requestQueue = [];
  }
}

export class AutoImportService {
  private baserowService: any;
  private sourceService: any;
  private cacheManager: CacheManager;

  constructor(userBaserowService: any) {
    this.baserowService = userBaserowService;
    this.cacheManager = CacheManager.getInstance();
  }

  private validateUserConfig(userConfig: UserConfig) {
    if (!userConfig) {
      throw new Error('Configuração do Baserow não encontrada. Configure suas credenciais no painel de configuração acima.');
    }

    if (!userConfig.apiToken) {
      throw new Error('Token da API não configurado. Insira seu token do Baserow no painel de configuração acima.');
    }

    if (!userConfig.baseUrl) {
      throw new Error('URL base não configurada. Verifique se a URL do seu Baserow está correta no painel de configuração.');
    }

    if (!userConfig.contentTableId) {
      throw new Error('ID da tabela de conteúdos não configurado. Insira o ID da sua tabela de conteúdos no painel de configuração acima.');
    }

    console.log('Configuração do usuário validada com sucesso:', userConfig);
    return userConfig;
  }

  setSourceService(config: ImportConfig) {
    this.sourceService = {
      makeRequest: async (endpoint: string, options: RequestInit = {}) => {
        const method = (options.method || 'GET') as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
        const originalUrl = `${config.sourceBaseUrl}${endpoint}`;
        const parsedBody = typeof options.body === 'string'
          ? (() => {
              try {
                return JSON.parse(options.body as string);
              } catch {
                return options.body as string;
              }
            })()
          : (options.body ?? null);

        const result = await makeProxyRequest({
          url: originalUrl,
          method,
          token: config.sourceToken,
          body: parsedBody,
        });

        return {
          ok: result.ok,
          status: result.status,
          statusText: result.ok ? 'OK' : 'Proxy Error',
          json: async () => result.data,
          text: async () => result.error || JSON.stringify(result.data ?? {}),
        };
      }
    };
  }

  async getAllAvailableContents(config: ImportConfig, forceReload = false): Promise<ImportContent[]> {
    return this.cacheManager.getCache(config, forceReload);
  }

  async getAvailableContents(
    config: ImportConfig,
    page: number = 1,
    size: number = 20,
    typeFilter?: string,
    searchTerm?: string
  ): Promise<PaginatedResponse> {
    try {
      console.log('Buscando conteúdos disponíveis...', { page, size, typeFilter, searchTerm });

      let allContents = await this.getAllAvailableContents(config);

      if (typeFilter && typeFilter !== 'all') {
        const filterLower = typeFilter.toLowerCase();
        allContents = allContents.filter((content: ImportContent) => {
          const tipoLower = content.Tipo.toLowerCase();
          const categoriaLower = (content.Categoria || '').toLowerCase();

          if (filterLower === 'filme') {
            return tipoLower.includes('filme') || tipoLower.includes('film') || tipoLower.includes('movie');
          }
          if (filterLower === 'serie') {
            // Exclui doramas, animes e novelas do filtro "série"
            return (tipoLower.includes('serie') || tipoLower.includes('series')) &&
              !categoriaLower.includes('dorama') &&
              !categoriaLower.includes('anime') &&
              !categoriaLower.includes('novela');
          }
          if (filterLower === 'dorama') {
            return (tipoLower.includes('serie') || tipoLower.includes('series')) &&
              (categoriaLower.includes('dorama') || categoriaLower.includes('doramas'));
          }
          if (filterLower === 'anime') {
            return (tipoLower.includes('serie') || tipoLower.includes('series')) &&
              (categoriaLower.includes('anime') || categoriaLower.includes('animes'));
          }
          if (filterLower === 'novela') {
            return (tipoLower.includes('serie') || tipoLower.includes('series')) &&
              (categoriaLower.includes('novela') || categoriaLower.includes('novelas'));
          }
          if (filterLower === 'tv') {
            return tipoLower.includes('tv');
          }
          return true;
        });
      }

      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim();
        allContents = allContents.filter((content: ImportContent) => {
          const titulo = content.Titulo || '';
          const genero = content.Genero || '';
          const sinopse = content.Sinopse || '';
          const categoria = content.Categoria || '';

          return titulo.toLowerCase().includes(searchLower) ||
            genero.toLowerCase().includes(searchLower) ||
            sinopse.toLowerCase().includes(searchLower) ||
            categoria.toLowerCase().includes(searchLower);
        });

        console.log(`Busca global por "${searchTerm}" encontrou ${allContents.length} resultados`);
      }

      const totalCount = allContents.length;
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedResults = allContents.slice(startIndex, endIndex);

      console.log(`Página ${page}: mostrando ${paginatedResults.length} de ${totalCount} resultados`);

      return {
        results: paginatedResults,
        count: totalCount,
        next: endIndex < totalCount ? `page=${page + 1}` : null,
        previous: page > 1 ? `page=${page - 1}` : null
      };
    } catch (error) {
      console.error('Erro ao buscar conteúdos disponíveis:', error);
      throw error;
    }
  }

  clearCache() {
    this.cacheManager.clearCache();
  }

  // Método otimizado que busca apenas episódios da série específica usando search
  async getSeriesEpisodesOptimized(config: ImportConfig, serieName: string): Promise<ImportEpisode[]> {
    console.log('🔍 [EPISÓDIOS OTIMIZADO] Buscando episódios para série:', serieName);

    if (!config.episodeTableId) {
      console.warn('⚠️ [EPISÓDIOS] ID da tabela de episódios não configurado');
      return [];
    }

    this.setSourceService(config);

    try {
      let allEpisodes: any[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 200;

      // Usar search para filtrar apenas episódios desta série
      const searchParam = encodeURIComponent(serieName);

      console.log('📋 [EPISÓDIOS OTIMIZADO] Buscando com filtro:', searchParam);

      while (hasMore) {
        try {
          const endpoint = `/api/database/rows/table/${config.episodeTableId}/?user_field_names=true&page=${page}&size=${pageSize}&search=${searchParam}`;
          const response = await this.sourceService.makeRequest(endpoint);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [EPISÓDIOS] Erro ao buscar página de episódios:', response.status, errorText);

            if (response.status === 429) {
              console.log('⏳ [EPISÓDIOS] Rate limit atingido, aguardando 3 segundos...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue;
            }

            throw new Error(`Erro ao buscar episódios página ${page}: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          const pageResults = data.results || [];

          console.log(`📊 [EPISÓDIOS] Página ${page}: ${pageResults.length} episódios encontrados`);

          if (pageResults.length > 0) {
            allEpisodes = allEpisodes.concat(pageResults);

            if (pageResults.length < pageSize || !data.next) {
              hasMore = false;
            } else {
              page++;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } else {
            hasMore = false;
          }

        } catch (pageError) {
          console.error(`❌ [EPISÓDIOS] Erro na página ${page}:`, pageError);
          if (page === 1) {
            throw pageError;
          } else {
            hasMore = false;
          }
        }
      }

      console.log('✅ [EPISÓDIOS OTIMIZADO] Total encontrado:', allEpisodes.length);

      if (allEpisodes.length > 0) {
        console.log('🔍 [EPISÓDIOS] DEBUG - Primeiros 5 episódios carregados:');
        allEpisodes.slice(0, 5).forEach((ep: any, index: number) => {
          console.log(`  ${index + 1}. ID: ${ep.id}`, {
            Nome: ep.Nome,
            Serie: ep.Serie,
            Link: ep.Link,
            Temporada: ep.Temporada,
            Episodio: ep.Episodio,
            Episódio: ep.Episódio,
            'Todos os campos': Object.keys(ep)
          });
        });
      }

      const matchingEpisodes = this.filterEpisodesBySeries(allEpisodes, serieName, config);

      console.log(`🎯 [EPISÓDIOS] RESULTADO FINAL: ${matchingEpisodes.length} episódios encontrados para "${serieName}"`);

      if (matchingEpisodes.length > 0) {
        console.log('✅ [EPISÓDIOS] Episódios que serão importados:');
        matchingEpisodes.forEach((ep: any, index: number) => {
          console.log(`  ${index + 1}. ${ep.Nome || ep.Titulo} (S${ep.Temporada}E${ep.Episódio || ep.Episodio}) - Serie: ${ep.Serie}`);
        });
      } else {
        console.warn('⚠️ [EPISÓDIOS] NENHUM EPISÓDIO ENCONTRADO - Executando debug detalhado...');
        this.debugEpisodeSearch(allEpisodes, serieName, config);
      }

      // Mapear para o formato correto com debug adicional do campo Episódio
      return matchingEpisodes.map((ep: any) => {
        const episodeNumber = ep.Episódio || ep.Episodio || '1';
        console.log(`🔍 [MAPEAMENTO] Episódio ${ep.id}: Episódio(com acento)="${ep.Episódio}", Episodio(sem acento)="${ep.Episodio}", Valor final="${episodeNumber}"`);

        return {
          id: ep.id,
          Titulo: ep.Nome || ep.Titulo || `Episódio ${episodeNumber}`,
          Serie: ep.Serie || serieName,
          Temporada: ep.Temporada || '1',
          Episodio: episodeNumber, // CORRIGIDO: Garantir que o valor não seja undefined
          Link: ep.Link || '',
          Sinopse: ep.Sinopse || ep.Description || ''
        };
      });

    } catch (error) {
      console.error('❌ [EPISÓDIOS] Erro ao buscar episódios da série:', error);
      throw error;
    }
  }

  /**
   * Debug detalhado quando nenhum episódio é encontrado
   */
  private debugEpisodeSearch(episodes: any[], serieName: string, config: ImportConfig) {
    const matchType = config.episodeMatchType || 'custom';
    const keyField = config.episodeKeyField || 'Serie';
    const searchField = config.episodeSearchField || 'Nome';

    console.log('\n🔍 [DEBUG] ===== ANÁLISE DETALHADA DA BUSCA DE EPISÓDIOS =====');
    console.log(`🔍 [DEBUG] Série buscada: "${serieName}"`);
    console.log(`🔍 [DEBUG] Tipo de correspondência: "${matchType}"`);
    console.log(`🔍 [DEBUG] Campo personalizado: "${keyField}"`);
    console.log(`🔍 [DEBUG] Campo de busca: "${searchField}"`);
    console.log(`🔍 [DEBUG] Total de episódios na tabela: ${episodes.length}`);

    // Verificar se os campos existem nos episódios
    const fieldsInEpisodes = episodes.length > 0 ? Object.keys(episodes[0]) : [];
    console.log(`🔍 [DEBUG] Campos disponíveis nos episódios:`, fieldsInEpisodes);

    const hasKeyField = fieldsInEpisodes.includes(keyField);
    const hasSearchField = fieldsInEpisodes.includes(searchField);

    console.log(`🔍 [DEBUG] Campo "${keyField}" existe: ${hasKeyField}`);
    console.log(`🔍 [DEBUG] Campo "${searchField}" existe: ${hasSearchField}`);

    if (matchType === 'custom' && !hasKeyField) {
      console.log(`❌ [DEBUG] PROBLEMA IDENTIFICADO: Campo personalizado "${keyField}" não existe!`);
      console.log(`💡 [DEBUG] Campos disponíveis: ${fieldsInEpisodes.join(', ')}`);
      return;
    }

    // Analisar valores únicos no campo de busca
    const fieldToAnalyze = matchType === 'custom' ? keyField : searchField;
    const uniqueValues = [...new Set(episodes.map((ep: any) => ep[fieldToAnalyze]).filter(val => val))];
    console.log(`🔍 [DEBUG] Valores únicos no campo "${fieldToAnalyze}":`, uniqueValues.slice(0, 10));

    // Verificar correspondências potenciais
    const serieLower = serieName.toLowerCase().trim();
    console.log(`🔍 [DEBUG] Série em minúsculas: "${serieLower}"`);

    const potentialMatches = episodes.filter((ep: any) => {
      if (!ep[fieldToAnalyze]) return false;
      const epValue = ep[fieldToAnalyze].toString().toLowerCase().trim();

      if (matchType === 'custom') {
        return epValue === serieLower;
      } else {
        return epValue.includes(serieLower) || serieLower.includes(epValue) || epValue === serieLower;
      }
    });

    console.log(`🔍 [DEBUG] Correspondências encontradas: ${potentialMatches.length}`);

    if (potentialMatches.length > 0) {
      console.log(`🔍 [DEBUG] Primeiras correspondências:`, potentialMatches.slice(0, 3).map(ep => ({
        id: ep.id,
        [fieldToAnalyze]: ep[fieldToAnalyze],
        Nome: ep.Nome,
        Temporada: ep.Temporada,
        Episodio: ep.Episodio
      })));
    } else {
      console.log(`❌ [DEBUG] Nenhuma correspondência encontrada!`);

      // Mostrar episódios similares
      const similarEpisodes = episodes.filter((ep: any) => {
        if (!ep[fieldToAnalyze]) return false;
        const epValue = ep[fieldToAnalyze].toString().toLowerCase();
        const serieWords = serieLower.split(' ');
        return serieWords.some(word => word.length > 2 && epValue.includes(word));
      });

      if (similarEpisodes.length > 0) {
        console.log(`🔍 [DEBUG] Episódios com similaridade encontrados (${similarEpisodes.length}):`,
          similarEpisodes.slice(0, 3).map(ep => ({
            [fieldToAnalyze]: ep[fieldToAnalyze],
            Nome: ep.Nome
          }))
        );
      }
    }

    console.log('🔍 [DEBUG] ================================================\n');
  }

  /**
   * Filtra episódios baseado na série com lógica de fallback melhorada
   */
  private filterEpisodesBySeries(episodes: any[], serieName: string, config: ImportConfig): any[] {
    const matchType = config.episodeMatchType || 'custom';
    const keyField = config.episodeKeyField || 'Serie';
    const searchField = config.episodeSearchField || 'Nome';

    console.log(`🔍 [FILTRO] Aplicando filtro "${matchType}" para série "${serieName}"`);
    console.log(`📋 [FILTRO] Campo personalizado: "${keyField}"`);
    console.log(`📋 [FILTRO] Campo de busca: "${searchField}"`);
    console.log(`📋 [FILTRO] Total de episódios a serem filtrados: ${episodes.length}`);

    let filteredEpisodes: any[] = [];

    // Função auxiliar para verificar correspondência baseada no tipo configurado
    const checkMatch = (episodeFieldValue: string, serieNameToMatch: string, matchTypeToUse: string): boolean => {
      const episodeValueLower = episodeFieldValue.toLowerCase().trim();
      const serieNameLower = serieNameToMatch.toLowerCase().trim();

      switch (matchTypeToUse) {
        case 'exact':
          return episodeValueLower === serieNameLower;
        case 'contains':
        default:
          return episodeValueLower.includes(serieNameLower) ||
            serieNameLower.includes(episodeValueLower) ||
            episodeValueLower === serieNameLower;
      }
    };

    // Para modo personalizado (custom), usar o campo especificado com fallback para "Nome"
    if (matchType === 'custom') {
      // Primeira tentativa: buscar no campo personalizado (geralmente "Serie")
      filteredEpisodes = episodes.filter((ep: any) => {
        if (!ep.hasOwnProperty(keyField) || !ep[keyField] || ep[keyField].toString().trim() === '') {
          return false;
        }

        const episodeKeyValue = ep[keyField].toString().trim();
        const serieNameTrim = serieName.trim();

        // Para custom mode, usar correspondência exata
        const isMatch = episodeKeyValue === serieNameTrim;

        if (isMatch) {
          console.log(`✅ [FILTRO] Episódio ${ep.id} (${ep.Nome || ep.Titulo}) corresponde à série "${serieName}" via campo "${keyField}"`);
        }

        return isMatch;
      });

      console.log(`🎯 [FILTRO] Primeira busca (campo "${keyField}"): ${filteredEpisodes.length} episódios encontrados`);

      // Fallback: se não encontrou nada no campo personalizado, buscar no campo "Nome"
      if (filteredEpisodes.length === 0) {
        console.log(`🔄 [FILTRO] Aplicando fallback: buscando no campo "Nome"`);

        filteredEpisodes = episodes.filter((ep: any) => {
          if (!ep.hasOwnProperty('Nome') || !ep.Nome || ep.Nome.toString().trim() === '') {
            return false;
          }

          const episodeNomeValue = ep.Nome.toString().trim();

          // Usar lógica de "contains" para o fallback no modo custom
          const isMatch = checkMatch(episodeNomeValue, serieName, 'contains');

          if (isMatch) {
            console.log(`✅ [FILTRO] Episódio ${ep.id} (${ep.Nome}) corresponde à série "${serieName}" via fallback no campo "Nome"`);
          }

          return isMatch;
        });

        console.log(`🎯 [FILTRO] Busca de fallback (campo "Nome"): ${filteredEpisodes.length} episódios encontrados`);
      }
    } else {
      // Para outros modos (contains, exact), usar lógica aprimorada com fallback
      const fieldToSearch = searchField || 'Nome';

      // Primeira tentativa: buscar no campo configurado
      filteredEpisodes = episodes.filter((ep: any) => {
        if (!ep.hasOwnProperty(fieldToSearch) || !ep[fieldToSearch] || ep[fieldToSearch].toString().trim() === '') {
          return false;
        }

        const episodeFieldValue = ep[fieldToSearch].toString();
        const isMatch = checkMatch(episodeFieldValue, serieName, matchType);

        if (isMatch) {
          console.log(`✅ [FILTRO] Episódio ${ep.id} (${ep.Nome || ep.Titulo}) corresponde à série "${serieName}" via campo "${fieldToSearch}"`);
        }

        return isMatch;
      });

      console.log(`🎯 [FILTRO] Primeira busca (campo "${fieldToSearch}"): ${filteredEpisodes.length} episódios encontrados`);

      // Fallback: se não encontrou e o campo de busca não é "Nome", tentar buscar no campo "Nome"
      if (filteredEpisodes.length === 0 && fieldToSearch !== 'Nome') {
        console.log(`🔄 [FILTRO] Aplicando fallback: buscando no campo "Nome" com tipo "${matchType}"`);

        filteredEpisodes = episodes.filter((ep: any) => {
          if (!ep.hasOwnProperty('Nome') || !ep.Nome || ep.Nome.toString().trim() === '') {
            return false;
          }

          const episodeNomeValue = ep.Nome.toString();
          const isMatch = checkMatch(episodeNomeValue, serieName, matchType);

          if (isMatch) {
            console.log(`✅ [FILTRO] Episódio ${ep.id} (${ep.Nome}) corresponde à série "${serieName}" via fallback no campo "Nome"`);
          }

          return isMatch;
        });

        console.log(`🎯 [FILTRO] Busca de fallback (campo "Nome"): ${filteredEpisodes.length} episódios encontrados`);
      }
    }

    console.log(`🎯 [FILTRO] RESULTADO FINAL: ${filteredEpisodes.length} episódios encontrados de ${episodes.length} total`);

    return filteredEpisodes;
  }

  /**
   * Busca conteúdo pelo nome usando filtro na API (não carrega tabela inteira)
   */
  async findContentByName(titulo: string, userBaserowService: any, tableId: string): Promise<any | null> {
    try {
      if (!titulo || typeof titulo !== 'string' || titulo.trim() === '' || titulo === 'Sem título') {
        console.warn('Título inválido para busca:', titulo);
        return null;
      }

      console.log(`🔍 Buscando conteúdo existente: "${titulo}"`);

      // 🔧 FIX: Não fazer encodeURIComponent - o getTableData já faz!
      // Encoding duplo causa %2520 e a busca falha
      const data = await userBaserowService.getTableData(tableId, 1, 200, titulo);

      if (!data || !data.results || data.results.length === 0) {
        console.log(`📭 Nenhum conteúdo encontrado com o título "${titulo}"`);
        return null;
      }

      // Filtrar para encontrar match exato (case-insensitive)
      const exactMatch = data.results.find((item: any) => {
        const itemTitle = (item.Titulo || item.Nome || '').toLowerCase().trim();
        return itemTitle === titulo.toLowerCase().trim();
      });

      if (exactMatch) {
        console.log(`✅ Conteúdo encontrado: ID ${exactMatch.id}, Título: "${exactMatch.Titulo || exactMatch.Nome}"`);
      } else {
        console.log(`📭 Nenhum match exato encontrado para "${titulo}"`);
      }

      return exactMatch || null;
    } catch (error) {
      console.error('Erro ao buscar conteúdo por nome:', error);
      return null;
    }
  }

  /**
   * Busca episódio por Título + Temporada + Episódio
   */
  async findEpisodeByIdentifiers(
    titulo: string,
    temporada: string,
    episodio: string,
    userBaserowService: any,
    tableId: string
  ): Promise<any | null> {
    try {
      console.log(`🔍 Buscando episódio: "${titulo}" S${temporada}E${episodio}`);

      // 🔧 FIX: Não fazer encodeURIComponent - o getTableData já faz!
      // Encoding duplo causa %2520 e a busca de episódios falha
      const data = await userBaserowService.getTableData(tableId, 1, 200, titulo);

      if (!data || !data.results || data.results.length === 0) {
        console.log(`📭 Nenhum episódio encontrado para "${titulo}"`);
        return null;
      }

      // Filtrar para encontrar match exato de Título + Temporada + Episódio
      const exactMatch = data.results.find((item: any) => {
        const matchTitle = (item.Nome || item.Titulo || '').toLowerCase().trim() === titulo.toLowerCase().trim();
        const matchTemp = (item.Temporada || '').toString() === temporada.toString();
        const matchEp = (item.Episódio || item.Episodio || '').toString() === episodio.toString();
        return matchTitle && matchTemp && matchEp;
      });

      if (exactMatch) {
        console.log(`✅ Episódio encontrado: ID ${exactMatch.id}, S${exactMatch.Temporada}E${exactMatch.Episódio || exactMatch.Episodio}`);
      } else {
        console.log(`📭 Episódio não encontrado: "${titulo}" S${temporada}E${episodio}`);
      }

      return exactMatch || null;
    } catch (error) {
      console.error('Erro ao buscar episódio:', error);
      return null;
    }
  }

  async importContents(
    config: ImportConfig,
    selectedContents: ImportContent[],
    userConfig: UserConfig,
    seriesSeasons?: Map<string, number[]>,
    seriesEpisodes?: Map<string, any[]>,
    typeMode: 'singular' | 'plural' = 'singular',
    onEpisodeProgress?: (episode: {
      seriesTitle: string;
      episodeTitle: string;
      season: string;
      episode: string;
      status: 'pending' | 'processing' | 'success' | 'error';
      current: number;
      total: number;
    }) => void,
    onContentProgress?: (info: {
      current: number;
      total: number;
      title: string;
      status: 'processing' | 'success' | 'error';
    }) => void
  ): Promise<{ success: number, errors: string[] }> {
    let success = 0;
    const errors: string[] = [];

    try {
      const validatedUserConfig = this.validateUserConfig(userConfig);
      console.log('✅ Configuração do usuário validada:', validatedUserConfig);

      const { BaserowService } = await import('./BaserowService');
      const userBaserowService = new BaserowService(validatedUserConfig.apiToken, validatedUserConfig.baseUrl);

      const totalContents = selectedContents.length;
      let contentIndex = 0;
      for (const content of selectedContents) {
        contentIndex++;
        onContentProgress?.({
          current: contentIndex,
          total: totalContents,
          title: content.Titulo || 'Sem título',
          status: 'processing',
        });
        try {
          console.log('📥 Processando conteúdo:', content.Titulo);

          const titulo = content.Titulo || 'Sem título';
          if (!titulo || titulo.trim() === '' || titulo === 'Sem título') {
            errors.push(`Conteúdo com título inválido foi ignorado`);
            continue;
          }

          // Determinar tabela alvo baseado no tipo e modo
          let targetTableId = validatedUserConfig.contentTableId;
          const isTv = (content.Tipo || '').toUpperCase() === 'TV' ||
            (content.Tipo || '').toUpperCase().includes('TV') ||
            (content.Tipo || '').toUpperCase().includes('CANAL');

          // Se for TV e modo plural, usar tabela de canais TV se disponível
          if (isTv && typeMode === 'plural' && validatedUserConfig.tableIds?.canaisTv) {
            targetTableId = validatedUserConfig.tableIds.canaisTv;
            console.log('📺 Roteando canal de TV para tabela específica:', targetTableId);
          }

          // Buscar se o conteúdo já existe
          const existingContent = await this.findContentByName(
            titulo,
            userBaserowService,
            targetTableId
          );

          let createdOrUpdatedContent;

          if (existingContent) {
            // ATUALIZAR conteúdo existente (apenas Link, Sinopse e Capa)
            console.log('🔄 Conteúdo já existe, atualizando:', titulo);

            const updateData = {
              Link: content.Link || existingContent.Link,
              Sinopse: content.Sinopse || existingContent.Sinopse,
              Capa: content.Poster || content.Capa || existingContent.Capa
            };

            console.log('📋 Dados de atualização:', updateData);

            createdOrUpdatedContent = await userBaserowService.updateRow(
              targetTableId,
              existingContent.id,
              updateData
            );

            console.log('✅ Conteúdo atualizado:', titulo);
          } else {
            // CRIAR novo conteúdo
            console.log('➕ Criando novo conteúdo:', titulo);

            const normalizeTypeForMode = (tipo: string | undefined): string => {
              const t = (tipo || '').toLowerCase();
              if (typeMode === 'plural') {
                if (t.includes('filme') || t.includes('movie') || t.includes('film')) return 'Filmes';
                if (t.includes('serie') || t.includes('series')) return 'Series';
                if ((tipo || '').toUpperCase() === 'TV') return 'TV';
                return tipo || '';
              }
              // singular (padrão): manter como está ou normalizar para 'Filme'/'Serie'
              if (t.includes('filmes')) return 'Filme';
              if (t.includes('series')) return 'Serie';
              return tipo || '';
            };

            const contentData = {
              Nome: titulo,
              Tipo: normalizeTypeForMode(content.Tipo),
              Categoria: content.Categoria || '',
              Sinopse: content.Sinopse || '',
              Capa: content.Poster || content.Capa || '',
              Link: content.Link || '',
              Idioma: content.Idioma || 'Português',
              Views: content.Views || '0',
              Temporadas: content.Temporadas || (content.Tipo === 'Serie' ? '1' : ''),
              Imdb: content.Imdb || '0',
              'Data de Lançamento': content['Data de Lançamento'] || '',
              'Capa de fundo': content['Capa de fundo'] || '',
              'TMDB ID': ''
            };

            // 🎬 Enriquecer com TMDB ID (busca por nome + tipo)
            try {
              const tipoLower = (content.Tipo || '').toLowerCase();
              const tmdbType: 'movie' | 'tv' =
                tipoLower.includes('serie') || tipoLower.includes('series') ? 'tv' : 'movie';
              const tmdbResult = await tmdbService.search(titulo, tmdbType);
              if (tmdbResult?.id) {
                contentData['TMDB ID'] = String(tmdbResult.id);
                console.log(`🎬 TMDB ID encontrado para "${titulo}":`, tmdbResult.id);
              } else {
                console.warn(`⚠️ TMDB ID não encontrado para "${titulo}"`);
              }
            } catch (tmdbErr) {
              console.error(`❌ Erro ao buscar TMDB ID para "${titulo}":`, tmdbErr);
            }

            console.log('📋 [DEBUG] Dados ORIGINAIS do content recebido:', {
              Titulo: content.Titulo,
              Tipo: content.Tipo,
              Categoria: content.Categoria,
              Sinopse: content.Sinopse,
              Poster: content.Poster,
              Capa: content.Capa,
              Link: content.Link,
              Idioma: content.Idioma,
              Views: content.Views,
              Temporadas: content.Temporadas,
              Imdb: content.Imdb
            });

            console.log('📋 [DEBUG] Dados MAPEADOS para contentData:', contentData);
            console.log('📋 [DEBUG] Campos vazios detectados:', Object.entries(contentData)
              .filter(([key, value]) => !value || value === '' || value === '0')
              .map(([key]) => key)
            );

            createdOrUpdatedContent = await userBaserowService.createRow(
              targetTableId,
              contentData
            );

            console.log('✅ Conteúdo criado com sucesso:', titulo);
            console.log('📋 [DEBUG] Resposta do Baserow:', createdOrUpdatedContent);

            // 🔧 FIX: Se a resposta veio com campos null (problema do proxy), buscar o row recém-criado
            if (createdOrUpdatedContent && createdOrUpdatedContent.id && createdOrUpdatedContent.Nome === null) {
              console.log('⚠️ [FIX] Resposta veio com campos null, buscando row recém-criado...');
              try {
                const freshData = await userBaserowService.getTableData(targetTableId, 1, 1, titulo);
                if (freshData && freshData.results && freshData.results.length > 0) {
                  // Buscar o row com o ID correto
                  const freshRow = freshData.results.find((r: any) => r.id === createdOrUpdatedContent.id);
                  if (freshRow) {
                    createdOrUpdatedContent = freshRow;
                    console.log('✅ [FIX] Dados atualizados com sucesso:', createdOrUpdatedContent);
                  } else {
                    console.warn('⚠️ [FIX] Row não encontrado na busca, usando ID:', createdOrUpdatedContent.id);
                  }
                }
              } catch (fetchError) {
                console.warn('⚠️ [FIX] Erro ao buscar row recém-criado (continuando com dados null):', fetchError);
              }
            }
          }

          if (content.Tipo === 'Serie' && validatedUserConfig.episodeTableId) {
            console.log('🎬 Série detectada, iniciando processamento de episódios...');
            console.log('📂 ID da tabela de episódios configurada:', validatedUserConfig.episodeTableId);

            try {
              console.log('🔍 Verificando episódios já carregados...');

              // Usar episódios já carregados se disponíveis, caso contrário buscar
              let episodes = seriesEpisodes?.get(content.id);

              if (!episodes) {
                console.log('📥 Episódios não foram pré-carregados, buscando agora...');
                episodes = await this.getSeriesEpisodesOptimized(config, titulo);
              } else {
                console.log('✅ Usando episódios já carregados:', episodes.length);
              }

              console.log('📊 Episódios encontrados:', episodes?.length || 0);

              // Filtrar por temporadas selecionadas, se houver
              const selectedSeasons = seriesSeasons?.get(content.id);
              if (selectedSeasons && selectedSeasons.length > 0) {
                console.log('🎯 Filtrando episódios para temporadas selecionadas:', selectedSeasons);
                episodes = episodes.filter(ep => {
                  const season = parseInt(ep.Temporada);
                  return selectedSeasons.includes(season);
                });
                console.log('📊 Episódios após filtro de temporadas:', episodes.length);
              }

              if (episodes.length === 0) {
                console.warn('⚠️ Nenhum episódio encontrado para a série:', titulo);
                errors.push(`Aviso: Nenhum episódio encontrado para a série "${titulo}". Verifique se os episódios existem na tabela de origem e se o nome da série coincide.`);
              } else {
                console.log('📥 Iniciando processamento de', episodes.length, 'episódios...');

                const totalEpisodes = episodes.length;
                let processedEpisodes = 0;

                for (const episode of episodes) {
                  try {
                    // Notificar início do processamento do episódio
                    if (onEpisodeProgress) {
                      onEpisodeProgress({
                        seriesTitle: titulo,
                        episodeTitle: episode.Titulo,
                        season: episode.Temporada,
                        episode: episode.Episodio,
                        status: 'processing',
                        current: processedEpisodes,
                        total: totalEpisodes
                      });
                    }

                    // Buscar se episódio já existe
                    const existingEpisode = await this.findEpisodeByIdentifiers(
                      episode.Titulo,
                      episode.Temporada,
                      episode.Episodio,
                      userBaserowService,
                      validatedUserConfig.episodeTableId
                    );

                    if (existingEpisode) {
                      // ATUALIZAR apenas o Link
                      console.log(`🔄 Episódio já existe, atualizando link: ${episode.Titulo} (S${episode.Temporada}E${episode.Episodio})`);

                      await userBaserowService.updateRow(
                        validatedUserConfig.episodeTableId,
                        existingEpisode.id,
                        { Link: episode.Link || existingEpisode.Link }
                      );

                      console.log('✅ Link do episódio atualizado');
                    } else {
                      // CRIAR novo episódio
                      console.log(`➕ Criando novo episódio: ${episode.Titulo} (S${episode.Temporada}E${episode.Episodio})`);

                      console.log('📋 [DEBUG] Dados ORIGINAIS do episódio:', {
                        episode_object: episode,
                        all_fields: Object.keys(episode)
                      });

                      const episodeData = {
                        Nome: episode.Titulo,
                        Serie: episode.Serie,
                        Temporada: episode.Temporada,
                        Episódio: episode.Episodio,
                        Link: episode.Link || '',
                        Sinopse: episode.Sinopse || '',
                        Conteudo: [createdOrUpdatedContent.id]
                      };

                      console.log('📋 [DEBUG] Dados do episódio MAPEADOS para criação:', episodeData);
                      console.log('📋 [DEBUG] Campos vazios no episódio:', Object.entries(episodeData)
                        .filter(([key, value]) => !value || value === '' || (Array.isArray(value) && value.length === 0))
                        .map(([key]) => key)
                      );

                      const createdEpisode = await userBaserowService.createRow(validatedUserConfig.episodeTableId, episodeData);
                      console.log('✅ Episódio criado:', createdEpisode);

                      // 🔧 FIX: Mesmo fix para episódios - buscar se resposta vier com null
                      if (createdEpisode && createdEpisode.id && createdEpisode.Nome === null) {
                        console.log('⚠️ [FIX] Resposta do episódio veio com campos null, dados foram salvos mas resposta está incorreta');
                      }
                    }

                    processedEpisodes++;

                    // Notificar sucesso do episódio
                    if (onEpisodeProgress) {
                      onEpisodeProgress({
                        seriesTitle: titulo,
                        episodeTitle: episode.Titulo,
                        season: episode.Temporada,
                        episode: episode.Episodio,
                        status: 'success',
                        current: processedEpisodes,
                        total: totalEpisodes
                      });
                    }
                  } catch (episodeError) {
                    processedEpisodes++;
                    console.error(`❌ Erro ao processar episódio ${episode.Titulo}:`, episodeError);

                    // Notificar erro do episódio
                    if (onEpisodeProgress) {
                      onEpisodeProgress({
                        seriesTitle: titulo,
                        episodeTitle: episode.Titulo,
                        season: episode.Temporada,
                        episode: episode.Episodio,
                        status: 'error',
                        current: processedEpisodes,
                        total: totalEpisodes
                      });
                    }
                  }
                }

                console.log('🎉 Todos os episódios da série foram processados com sucesso!');
              }
            } catch (episodeError) {
              console.error('❌ Erro ao importar episódios:', episodeError);
              const errorMessage = episodeError instanceof Error ? episodeError.message : String(episodeError);
              errors.push(`Aviso: Episódios de "${titulo}" não foram importados - ${errorMessage}`);
            }
          } else if (content.Tipo === 'Serie' && !validatedUserConfig.episodeTableId) {
            console.warn('⚠️ Série detectada mas ID da tabela de episódios não configurado');
            errors.push(`Aviso: "${titulo}" é uma série, mas o ID da tabela de episódios não está configurado. Configure o ID no painel de configuração para importar episódios automaticamente.`);
          }

          success++;
          onContentProgress?.({
            current: contentIndex,
            total: totalContents,
            title: content.Titulo || 'Sem título',
            status: 'success',
          });
        } catch (contentError) {
          console.error(`❌ Erro ao importar ${content.Titulo || 'conteúdo sem título'}:`, contentError);
          const errorMessage = contentError instanceof Error ? contentError.message : String(contentError);
          errors.push(`Erro ao importar ${content.Titulo || 'conteúdo sem título'}: ${errorMessage}`);
          onContentProgress?.({
            current: contentIndex,
            total: totalContents,
            title: content.Titulo || 'Sem título',
            status: 'error',
          });
        }
      }
    } catch (configError) {
      console.error('❌ Erro de configuração:', configError);
      const errorMessage = configError instanceof Error ? configError.message : String(configError);
      return { success: 0, errors: [errorMessage] };
    }

    console.log('📊 Resultado final da importação:', { success, errors: errors.length });
    return { success, errors };
  }
}

export const useAutoImportService = () => {
  const baserowService = useBaserowService();
  return new AutoImportService(baserowService);
};
