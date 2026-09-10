/**
 * Engine para importação de conteúdos e episódios do MaxPlus no Baserow
 */
import { BaserowService } from '@/services/BaserowService';
import { 
  fetchDetails, 
  fetchEpisode, 
  MaxPlusContentDetails, 
  MaxPlusCatalogItem,
  MaxPlusSeasonDetail,
  MaxPlusEpisodeDetail
} from '@/services/maxplusApi';
import { mapToDatabaseKeys } from '@/utils/baserowHelpers';
import { tmdbService } from '@/services/TmdbService';
import { normalizeCategories } from '@/utils/categoryNormalizer';

export interface ImportProgress {
  active: boolean;
  total: number;
  current: number;
  currentTitle: string;
  stage: string;
}

export class MaxPlusImportEngine {
  private baserowService: BaserowService;
  private conteudosTableId: string;
  private episodiosTableId: string;
  private conteudosKeysCache: string[] | null = null;
  private episodiosKeysCache: string[] | null = null;

  // Cache estático em memória por sessão para evitar re-consultar títulos no Baserow
  private static verifiedImportedCache = new Set<string>();
  private static verifiedMissingCache = new Set<string>();

  public static markAsImported(title?: string | null): void {
    if (!title) return;
    const norm = (title || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (norm) {
      MaxPlusImportEngine.verifiedImportedCache.add(norm);
      MaxPlusImportEngine.verifiedMissingCache.delete(norm);
    }
  }

  public static getKnownImportedTitles(): Set<string> {
    return new Set(MaxPlusImportEngine.verifiedImportedCache);
  }

  constructor(
    baserowService: BaserowService,
    conteudosTableId: string,
    episodiosTableId: string
  ) {
    this.baserowService = baserowService;
    this.conteudosTableId = conteudosTableId;
    this.episodiosTableId = episodiosTableId;
  }

  /**
   * Obtém a lista de colunas reais da tabela para mapeamento dinâmico
   */
  private async getTableKeys(tableId: string): Promise<string[]> {
    try {
      const resp = await this.baserowService.getTableData(tableId, 1, 1);
      if (resp?.results && resp.results.length > 0) {
        return Object.keys(resp.results[0]);
      }
    } catch (e) {
      console.warn(`Não foi possível inferir colunas da tabela ${tableId}:`, e);
    }
    return [];
  }

  private async getConteudosKeys(): Promise<string[]> {
    if (!this.conteudosKeysCache) {
      this.conteudosKeysCache = await this.getTableKeys(this.conteudosTableId);
    }
    return this.conteudosKeysCache;
  }

  private async getEpisodiosKeys(): Promise<string[]> {
    if (!this.episodiosKeysCache) {
      this.episodiosKeysCache = await this.getTableKeys(this.episodiosTableId);
    }
    return this.episodiosKeysCache;
  }

  /**
   * Helper para mesclar campos novos mantendo os antigos se o novo for vazio (idêntico ao AutoImportService)
   */
  private pick(novo: unknown, antigo: unknown): unknown {
    return (novo !== undefined && novo !== null && String(novo).trim() !== '') ? novo : (antigo ?? '');
  }

  /**
   * Busca se o conteúdo já existe na tabela pelo Título / Nome (idêntico ao AutoImportService)
   */
  async findContentByName(titulo: string, tableId: string): Promise<Record<string, unknown> | null> {
    if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') return null;
    try {
      const cleanTitle = titulo.toLowerCase().trim();
      const data = await this.baserowService.getTableData(tableId, 1, 200, titulo.trim());
      if (!data || !data.results || data.results.length === 0) return null;

      const match = data.results.find((item: Record<string, unknown>) => {
        const itemTitle = (String(item.Nome || item.Titulo || '')).toLowerCase().trim();
        return itemTitle === cleanTitle;
      });
      return match || null;
    } catch (err) {
      console.warn(`[MaxPlus] Erro ao buscar conteúdo existente "${titulo}":`, err);
      return null;
    }
  }

  /**
   * Busca conteúdos existentes por uma lista de títulos com cache em memória e execução paralela otimizada
   */
  async findExistingContentsByTitles(titles: string[]): Promise<Set<string>> {
    const existingSet = new Set<string>();
    if (!this.conteudosTableId || !titles || titles.length === 0) {
      for (const t of MaxPlusImportEngine.verifiedImportedCache) {
        existingSet.add(t);
      }
      return existingSet;
    }

    const normalizeText = (value?: string | null) =>
      (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    try {
      const cleanTitles = Array.from(new Set(titles.map(t => t?.trim()).filter(Boolean)));
      if (cleanTitles.length === 0) return existingSet;

      // 1. Preenche imediatamente os que já estão no cache em memória
      const unverifiedTitles: string[] = [];
      for (const rawTitle of cleanTitles) {
        const norm = normalizeText(rawTitle);
        if (!norm) continue;

        if (MaxPlusImportEngine.verifiedImportedCache.has(norm)) {
          existingSet.add(norm);
        } else if (!MaxPlusImportEngine.verifiedMissingCache.has(norm)) {
          unverifiedTitles.push(rawTitle);
        }
      }

      // Se todos os títulos já foram checados nesta sessão, retorna instantaneamente (0ms)!
      if (unverifiedTitles.length === 0) {
        return existingSet;
      }

      // 2. Consulta títulos não verificados em lotes paralelos de até 35 com timeout de segurança de 4.5s
      const CHUNK_SIZE = 35;
      const chunks: string[][] = [];
      for (let i = 0; i < unverifiedTitles.length; i += CHUNK_SIZE) {
        chunks.push(unverifiedTitles.slice(i, i + CHUNK_SIZE));
      }

      const queryPromises = chunks.map(async (chunk) => {
        let filterParams = 'filter_type=OR';
        chunk.forEach(t => {
          filterParams += `&filter__Nome__equal=${encodeURIComponent(t)}`;
        });

        const foundInChunk = new Set<string>();

        try {
          const fetchPromise = this.baserowService.getTableData(
            this.conteudosTableId,
            1,
            200,
            undefined,
            undefined,
            filterParams
          );
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500));
          const resp = await Promise.race([fetchPromise, timeoutPromise]);

          if (resp?.results && Array.isArray(resp.results)) {
            resp.results.forEach((item: Record<string, unknown>) => {
              const name = (item.Nome || item.Titulo || item.Title) as string;
              const norm = normalizeText(name);
              if (norm) {
                existingSet.add(norm);
                foundInChunk.add(norm);
                MaxPlusImportEngine.verifiedImportedCache.add(norm);
                MaxPlusImportEngine.verifiedMissingCache.delete(norm);
              }
            });
          }
        } catch (filterErr) {
          console.warn('[MaxPlus] Filtro OR falhou, tentando fallback com busca direta:', filterErr);
          try {
            const fallbackResp = await this.baserowService.getTableData(this.conteudosTableId, 1, 100);
            if (fallbackResp?.results) {
              fallbackResp.results.forEach((item: Record<string, unknown>) => {
                const name = (item.Nome || item.Titulo) as string;
                const norm = normalizeText(name);
                if (norm) {
                  existingSet.add(norm);
                  foundInChunk.add(norm);
                  MaxPlusImportEngine.verifiedImportedCache.add(norm);
                }
              });
            }
          } catch {
            // ignore
          }
        }

        // Marcar títulos não encontrados no cache para evitar buscas repetidas
        chunk.forEach(t => {
          const norm = normalizeText(t);
          if (norm && !foundInChunk.has(norm) && !MaxPlusImportEngine.verifiedImportedCache.has(norm)) {
            MaxPlusImportEngine.verifiedMissingCache.add(norm);
          }
        });
      });

      await Promise.all(queryPromises);
    } catch (err) {
      console.warn('[MaxPlus] Erro ao buscar conteúdos já importados:', err);
    }

    return existingSet;
  }

  /**
   * Busca todos os episódios existentes de uma série no Baserow
   */
  async getExistingEpisodesForSeries(
    serieName: string,
    tableId: string
  ): Promise<Record<string, unknown>[]> {
    if (!serieName || !tableId) return [];
    try {
      const fetchPromise = this.baserowService.getTableData(tableId, 1, 200, serieName.trim());
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
      const data = await Promise.race([fetchPromise, timeoutPromise]);
      if (!data || !data.results) return [];

      const cleanSerie = serieName.toLowerCase().trim();
      return data.results.filter((item: Record<string, unknown>) => {
        const itemSerie = String(item.Serie || item.Nome || item.Titulo || '').toLowerCase().trim();
        return itemSerie === cleanSerie || itemSerie.includes(cleanSerie) || cleanSerie.includes(itemSerie);
      });
    } catch (err) {
      console.warn(`[MaxPlus] Erro ao buscar episódios da série "${serieName}":`, err);
      return [];
    }
  }

  /**
   * Busca se o episódio já existe na tabela de episódios por Série + Temporada + Episódio (mesma lógica do AutoImportService)
   */
  async findEpisodeByIdentifiers(
    serieName: string,
    season: number | string,
    episode: number | string,
    tableId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const cleanSerie = serieName.toLowerCase().trim();
      const targetSeason = String(season).trim();
      const targetEpisode = String(episode).trim();

      const data = await this.baserowService.getTableData(tableId, 1, 200, serieName.trim());
      if (!data || !data.results || data.results.length === 0) return null;

      const match = data.results.find((item: Record<string, unknown>) => {
        const itemSerie = (String(item.Nome || item.Serie || item.Titulo || '')).toLowerCase().trim();
        const itemTemp = String(item.Temporada || '').trim();
        const itemEp = String(item['Episódio'] || item.Episodio || item.Numero || '').trim();

        const matchSerie = itemSerie === cleanSerie || itemSerie.includes(cleanSerie) || cleanSerie.includes(itemSerie);
        const matchTemp = itemTemp === targetSeason;
        const matchEp = itemEp === targetEpisode;

        return matchSerie && matchTemp && matchEp;
      });
      return match || null;
    } catch (err) {
      console.warn(`[MaxPlus] Erro ao buscar episódio existente S${season}E${episode}:`, err);
      return null;
    }
  }

  /**
   * Importa um Filme diretamente para a tabela de conteúdos (com Upsert se já existir)
   */
  async importMovie(
    data: MaxPlusContentDetails, 
    fallbackCategory?: string
  ): Promise<{ success: boolean; id?: string; error?: string; updated?: boolean }> {
    if (!this.conteudosTableId) {
      throw new Error('ID da tabela de conteúdos não configurado nas Configurações.');
    }

    const videoUrl = data.video || '';
    // Regra de Idioma obrigatório: data.idioma || (data.video && data.video.includes('LEG') ? 'Legendado' : 'Dublado')
    // Padrão 'Dublado', nunca vazio.
    const isLegendado = Boolean(
      (data.video && data.video.includes('LEG')) ||
      (videoUrl && (videoUrl.toLowerCase().includes('leg.mp4') || videoUrl.toLowerCase().includes('_leg')))
    );
    const idioma = data.idioma || (data.video && isLegendado ? 'Legendado' : 'Dublado') || 'Dublado';

    // 🎬 Enriquecimento automático com TMDb: TMDB ID, Trailer, Ano, Data de Lançamento, Capa de fundo, Imdb
    let tmdbData = null;
    try {
      const hintText = [data.video, data.link, data.imagem].filter(Boolean).join(' ');
      const fetchTmdb = tmdbService.getEnrichedDataForContent(data.nome, 'movie', hintText);
      const tmdbTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      tmdbData = await Promise.race([fetchTmdb, tmdbTimeout]);
      if (tmdbData) {
        console.log(`🎬 [MaxPlus] Metadados TMDb obtidos com sucesso para "${data.nome}":`, tmdbData);
      }
    } catch (tmdbErr) {
      console.warn(`[MaxPlus] Aviso ao consultar TMDb para "${data.nome}":`, tmdbErr);
    }

    // 🏷️ Normalização e padronização das Categorias:
    // - Filmes SEMPRE contêm 'Filmes'
    // - Contém SEMPRE o ano (ex: 2026 ou 2023)
    // - 'Lançamentos' apenas se for do ano atual (2026) / mês atual
    const categoriaNormalizada = normalizeCategories({
      tipo: 'Filme',
      categorias: data.generos || fallbackCategory,
      ano: tmdbData?.ano,
      dataDeLancamento: tmdbData?.dataDeLancamento,
      titulo: data.nome,
    });

    // Avaliação numérica do filme para a coluna Imdb (ex: "7.5" ou "5.0")
    const avaliacaoImdb = tmdbData?.imdb || (data.estrelas ? String(data.estrelas) : '');

    const tableKeys = await this.getConteudosKeys();

    // 🔍 Estratégia de Upsert: verificar se o conteúdo já foi importado
    const existingContent = await this.findContentByName(data.nome, this.conteudosTableId);

    if (existingContent) {
      console.log(`🔄 [MaxPlus] Filme já existe no Baserow (ID: ${existingContent.id}), atualizando dados...`);
      const rawUpdatePayload = {
        Nome: data.nome,
        Capa: this.pick(data.imagem || tmdbData?.poster, existingContent.Capa || existingContent.Poster),
        Sinopse: this.pick(data.sinopse || tmdbData?.sinopse, existingContent.Sinopse),
        Categoria: normalizeCategories({
          tipo: 'Filme',
          categorias: this.pick(categoriaNormalizada, existingContent.Categoria),
          ano: tmdbData?.ano || (existingContent.Ano as string) || (existingContent.ano as string),
          dataDeLancamento: tmdbData?.dataDeLancamento || (existingContent['Data de Lançamento'] as string) || (existingContent.data_lancamento as string),
          titulo: data.nome,
        }),
        Link: this.pick(videoUrl, existingContent.Link),
        Tipo: 'Filme',
        Idioma: this.pick(idioma, existingContent.Idioma || existingContent.idioma) || idioma || 'Dublado',
        'TMDB ID': this.pick(tmdbData?.tmdbId, existingContent['TMDB ID'] || existingContent.tmdb_id),
        'Trailer': this.pick(tmdbData?.trailer, existingContent.Trailer || existingContent.trailer),
        'Ano': this.pick(tmdbData?.ano, existingContent.Ano || existingContent.ano),
        'Data de Lançamento': this.pick(tmdbData?.dataDeLancamento, existingContent['Data de Lançamento'] || existingContent.data_lancamento),
        'Capa de fundo': this.pick(tmdbData?.capaDeFundo, existingContent['Capa de fundo'] || existingContent.capa_de_fundo),
        'Imdb': this.pick(avaliacaoImdb, existingContent.Imdb || existingContent.imdb),
      };

      const mappedUpdatePayload = tableKeys.length > 0 ? mapToDatabaseKeys(rawUpdatePayload, tableKeys) : rawUpdatePayload;
      await this.baserowService.updateRow(this.conteudosTableId, String(existingContent.id), mappedUpdatePayload);
      MaxPlusImportEngine.markAsImported(data.nome);
      return { success: true, id: String(existingContent.id), updated: true };
    }

    // Se não existir, cria um novo registro
    const rawPayload = {
      Nome: data.nome,
      Capa: data.imagem || tmdbData?.poster || '',
      Sinopse: data.sinopse || tmdbData?.sinopse || '',
      Categoria: categoriaNormalizada,
      Link: videoUrl,
      Tipo: 'Filme',
      Idioma: idioma || 'Dublado',
      'TMDB ID': tmdbData?.tmdbId || '',
      'Trailer': tmdbData?.trailer || '',
      'Ano': tmdbData?.ano || '',
      'Data de Lançamento': tmdbData?.dataDeLancamento || '',
      'Capa de fundo': tmdbData?.capaDeFundo || '',
      'Imdb': avaliacaoImdb,
    };

    const mappedPayload = tableKeys.length > 0 ? mapToDatabaseKeys(rawPayload, tableKeys) : rawPayload;

    console.log('🎬 [MaxPlus] Importando novo filme no Baserow:', mappedPayload);
    const result = await this.baserowService.createRow(this.conteudosTableId, mappedPayload);
    MaxPlusImportEngine.markAsImported(data.nome);
    return { success: true, id: String(result.id) };
  }

  /**
   * Importa uma Série e todos os seus episódios com resolução assíncrona de URLs MP4 (com Upsert)
   */
  async importSeries(
    data: MaxPlusContentDetails,
    fallbackCategory: string | undefined,
    onProgress?: (progress: ImportProgress) => void,
    selectedSeasonsOrEpisodes?: { seasonNum: number; episodeNum: number }[]
  ): Promise<{ success: boolean; serieId?: string; totalEpisodesImported: number; createdEpisodesCount: number; updatedEpisodesCount: number; updated?: boolean }> {
    if (!this.conteudosTableId) {
      throw new Error('ID da tabela de conteúdos não configurado.');
    }
    if (!this.episodiosTableId) {
      throw new Error('ID da tabela de episódios não configurado.');
    }

    // 📺 Enriquecimento automático com TMDb para Série: TMDB ID, Trailer, Ano, Data de Lançamento, Capa de fundo, Imdb
    let tmdbData = null;
    try {
      const hintText = [data.link, data.imagem].filter(Boolean).join(' ');
      const fetchTmdb = tmdbService.getEnrichedDataForContent(data.nome, 'tv', hintText);
      const tmdbTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      tmdbData = await Promise.race([fetchTmdb, tmdbTimeout]);
      if (tmdbData) {
        console.log(`📺 [MaxPlus] Metadados TMDb obtidos com sucesso para série "${data.nome}":`, tmdbData);
      }
    } catch (tmdbErr) {
      console.warn(`[MaxPlus] Aviso ao consultar TMDb para série "${data.nome}":`, tmdbErr);
    }

    const avaliacaoImdb = tmdbData?.imdb || (data.estrelas ? String(data.estrelas) : '');

    // Regra de Idioma obrigatório para Série:
    // data.idioma || (data.video && data.video.includes('LEG') ? 'Legendado' : 'Dublado')
    // Se por qualquer motivo não for detectado, utilize "Dublado" como padrão. Nunca deixe vazio.
    const isSerieLegendado = Boolean(
      (data.video && data.video.includes('LEG')) ||
      (data.video && (data.video.toLowerCase().includes('leg.mp4') || data.video.toLowerCase().includes('_leg')))
    );
    const serieIdioma = data.idioma || (data.video && isSerieLegendado ? 'Legendado' : 'Dublado') || 'Dublado';

    // 🏷️ Normalização e padronização das Categorias:
    // - Séries SEMPRE contêm 'Series'
    // - Contém SEMPRE o ano (ex: 2026 ou 2023)
    // - 'Lançamentos' apenas se for do ano atual (2026) / mês atual
    const categoriaNormalizada = normalizeCategories({
      tipo: 'Serie',
      categorias: data.generos || fallbackCategory,
      ano: tmdbData?.ano,
      dataDeLancamento: tmdbData?.dataDeLancamento,
      titulo: data.nome,
    });

    const conteudosKeys = await this.getConteudosKeys();

    // 1. Verifica se a Série já existe na tabela de conteúdos (Upsert)
    const existingSerie = await this.findContentByName(data.nome, this.conteudosTableId);
    let serieId = '';
    let isSerieUpdated = false;

    if (existingSerie) {
      console.log(`🔄 [MaxPlus] Série já existe no Baserow (ID: ${existingSerie.id}), atualizando registro...`);
      const rawSerieUpdate = {
        Nome: data.nome,
        Capa: this.pick(data.imagem || tmdbData?.poster, existingSerie.Capa || existingSerie.Poster),
        Sinopse: this.pick(data.sinopse || tmdbData?.sinopse, existingSerie.Sinopse),
        Categoria: normalizeCategories({
          tipo: 'Serie',
          categorias: this.pick(categoriaNormalizada, existingSerie.Categoria),
          ano: tmdbData?.ano || (existingSerie.Ano as string) || (existingSerie.ano as string),
          dataDeLancamento: tmdbData?.dataDeLancamento || (existingSerie['Data de Lançamento'] as string) || (existingSerie.data_lancamento as string),
          titulo: data.nome,
        }),
        Tipo: 'Serie',
        Idioma: this.pick(serieIdioma, existingSerie.Idioma || existingSerie.idioma) || serieIdioma || 'Dublado',
        'TMDB ID': this.pick(tmdbData?.tmdbId, existingSerie['TMDB ID'] || existingSerie.tmdb_id),
        'Trailer': this.pick(tmdbData?.trailer, existingSerie.Trailer || existingSerie.trailer),
        'Ano': this.pick(tmdbData?.ano, existingSerie.Ano || existingSerie.ano),
        'Data de Lançamento': this.pick(tmdbData?.dataDeLancamento, existingSerie['Data de Lançamento'] || existingSerie.data_lancamento),
        'Capa de fundo': this.pick(tmdbData?.capaDeFundo, existingSerie['Capa de fundo'] || existingSerie.capa_de_fundo),
        'Imdb': this.pick(avaliacaoImdb, existingSerie.Imdb || existingSerie.imdb),
      };

      const mappedSerieUpdate = conteudosKeys.length > 0 ? mapToDatabaseKeys(rawSerieUpdate, conteudosKeys) : rawSerieUpdate;
      await this.baserowService.updateRow(this.conteudosTableId, String(existingSerie.id), mappedSerieUpdate);
      serieId = String(existingSerie.id);
      isSerieUpdated = true;
      MaxPlusImportEngine.markAsImported(data.nome);
    } else {
      const rawSeriePayload = {
        Nome: data.nome,
        Capa: data.imagem || tmdbData?.poster || '',
        Sinopse: data.sinopse || tmdbData?.sinopse || '',
        Categoria: categoriaNormalizada,
        Tipo: 'Serie',
        Idioma: serieIdioma || 'Dublado',
        'TMDB ID': tmdbData?.tmdbId || '',
        'Trailer': tmdbData?.trailer || '',
        'Ano': tmdbData?.ano || '',
        'Data de Lançamento': tmdbData?.dataDeLancamento || '',
        'Capa de fundo': tmdbData?.capaDeFundo || '',
        'Imdb': avaliacaoImdb,
      };

      const mappedSeriePayload = conteudosKeys.length > 0 ? mapToDatabaseKeys(rawSeriePayload, conteudosKeys) : rawSeriePayload;
      console.log('📺 [MaxPlus] Criando novo registro da Série no Baserow:', mappedSeriePayload);
      const serieResult = await this.baserowService.createRow(this.conteudosTableId, mappedSeriePayload);
      serieId = String(serieResult?.id);
      MaxPlusImportEngine.markAsImported(data.nome);
    }

    // 2. Coletar todos os episódios a serem importados
    const seasons = data.seasons_details || [];
    const allEpisodesToImport: { seasonNum: number; episode: MaxPlusEpisodeDetail }[] = [];

    for (const season of seasons) {
      const seasonNum = season.number;
      for (const ep of (season.episodes || [])) {
        if (selectedSeasonsOrEpisodes && selectedSeasonsOrEpisodes.length > 0) {
          const isSelected = selectedSeasonsOrEpisodes.some(
            s => s.seasonNum === seasonNum && s.episodeNum === ep.number
          );
          if (!isSelected) continue;
        }
        allEpisodesToImport.push({ seasonNum, episode: ep });
      }
    }

    const totalEpisodes = allEpisodesToImport.length;
    let importedCount = 0;
    let createdEpisodesCount = 0;
    let updatedEpisodesCount = 0;
    const episodiosKeys = await this.getEpisodiosKeys();

    // 🔍 Pré-carregar episódios já existentes desta série na tabela de destino para evitar sobrecarga de requisições
    const existingEpisodesList = await this.getExistingEpisodesForSeries(data.nome, this.episodiosTableId);
    const existingEpisodesMap = new Map<string, Record<string, unknown>>();
    for (const ep of existingEpisodesList) {
      const s = String(ep.Temporada || '').trim();
      const e = String(ep['Episódio'] || ep.Episodio || ep.Numero || '').trim();
      if (s && e) {
        existingEpisodesMap.set(`${s}_${e}`, ep);
      }
    }
    console.log(`📋 [MaxPlus] ${existingEpisodesList.length} episódios existentes já mapeados para "${data.nome}"`);

    if (totalEpisodes > 0 && onProgress) {
      onProgress({
        active: true,
        total: totalEpisodes,
        current: 0,
        currentTitle: data.nome,
        stage: `Preparando importação de ${totalEpisodes} episódios...`,
      });
    }

    // 3. Processamento concorrente de episódios em lotes de 3 (alto desempenho sem travar o Baserow)
    const CONCURRENCY = 3;
    for (let i = 0; i < totalEpisodes; i += CONCURRENCY) {
      const batch = allEpisodesToImport.slice(i, i + CONCURRENCY);

      await Promise.all(batch.map(async (item, batchIdx) => {
        const itemIndex = i + batchIdx;
        const epNum = item.episode.number;
        const seasonNum = item.seasonNum;
        const epTitle = item.episode.title || `Episódio ${epNum}`;

        if (onProgress) {
          onProgress({
            active: true,
            total: totalEpisodes,
            current: Math.min(itemIndex + 1, totalEpisodes),
            currentTitle: `${data.nome} - T${seasonNum}E${epNum}: ${epTitle}`,
            stage: `Processando episódio (${Math.min(itemIndex + 1, totalEpisodes)}/${totalEpisodes})...`,
          });
        }

        try {
          let videoUrl = '';
          let epData: MaxPlusEpisodeResult | null = null;

          // Buscar link direto do MP4 via fetchEpisode com timeout de 6s
          if (item.episode.link) {
            try {
              const fetchPromise = fetchEpisode(item.episode.link);
              const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
              epData = await Promise.race([fetchPromise, timeoutPromise]);
              videoUrl = epData?.video || '';
            } catch (epErr) {
              console.warn(`Aviso ao obter link do episódio T${seasonNum}E${epNum}:`, epErr);
            }
          }

          // Regra de Idioma obrigatório do episódio:
          // epData.idioma || (epData.video && epData.video.includes('LEG') ? 'Legendado' : 'Dublado')
          // Se por qualquer motivo não for detectado, utilize "Dublado" como padrão. Nunca deixe vazio.
          const epVideo = epData?.video || videoUrl || '';
          const isEpLegendado = Boolean(
            (epVideo && epVideo.includes('LEG')) ||
            (epVideo && (epVideo.toLowerCase().includes('leg.mp4') || epVideo.toLowerCase().includes('_leg')))
          );
          const epIdioma = epData?.idioma || (epVideo && isEpLegendado ? 'Legendado' : 'Dublado') || 'Dublado';

          // Verifica se o episódio já existe na tabela de episódios pelo mapa pré-carregado
          const epKey = `${seasonNum}_${epNum}`;
          const existingEp = existingEpisodesMap.get(epKey) || null;

          if (existingEp) {
            console.log(`🔄 [MaxPlus] Episódio T${seasonNum}E${epNum} já existe (ID: ${existingEp.id}), atualizando dados...`);
            const rawEpUpdate: Record<string, unknown> = {
              Nome: data.nome,
              Serie: data.nome,
              Temporada: seasonNum,
              'Episódio': epNum,
              Link: this.pick(videoUrl, existingEp.Link || existingEp.link),
              Idioma: this.pick(epIdioma, existingEp.Idioma || existingEp.idioma) || epIdioma || 'Dublado',
              Sinopse: this.pick(epTitle, existingEp.Sinopse || existingEp.sinopse),
            };

            // Preencher vínculo Conteudo se estiver vazio
            const conteudoLink = existingEp.Conteudo;
            const linkVazio = !conteudoLink || (Array.isArray(conteudoLink) && conteudoLink.length === 0);
            if (linkVazio && serieId) {
              rawEpUpdate.Conteudo = [serieId];
            }

            const mappedEpUpdate = episodiosKeys.length > 0 
              ? mapToDatabaseKeys(rawEpUpdate, episodiosKeys) 
              : rawEpUpdate;

            await this.baserowService.updateRow(this.episodiosTableId, String(existingEp.id), mappedEpUpdate);
            updatedEpisodesCount++;
          } else {
            console.log(`➕ [MaxPlus] Criando novo episódio T${seasonNum}E${epNum}...`);
            const rawEpPayload: Record<string, unknown> = {
              Nome: data.nome,
              Serie: data.nome,
              Temporada: seasonNum,
              'Episódio': epNum,
              Link: videoUrl,
              Idioma: epIdioma || 'Dublado',
              Sinopse: epTitle,
            };

            if (serieId) {
              rawEpPayload.Conteudo = [serieId];
            }

            const mappedEpPayload = episodiosKeys.length > 0 
              ? mapToDatabaseKeys(rawEpPayload, episodiosKeys) 
              : rawEpPayload;

            const createdEp = await this.baserowService.createRow(this.episodiosTableId, mappedEpPayload);
            if (createdEp) {
              existingEpisodesMap.set(epKey, createdEp);
            }
            createdEpisodesCount++;
          }

          importedCount++;
        } catch (err) {
          console.error(`Erro ao importar episódio T${seasonNum}E${epNum}:`, err);
        }
      }));

      // Pequena pausa entre lotes de episódios para não estressar a conexão
      await new Promise(r => setTimeout(r, 60));
    }

    return {
      success: true,
      serieId,
      totalEpisodesImported: importedCount,
      createdEpisodesCount,
      updatedEpisodesCount,
      updated: isSerieUpdated,
    };
  }

  /**
   * Importa múltiplos itens de catálogo em lote (Batch)
   */
  async importBatch(
    items: MaxPlusCatalogItem[],
    onProgress?: (progress: ImportProgress) => void
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;
    const total = items.length;

    for (let i = 0; i < total; i++) {
      const item = items[i];

      if (onProgress) {
        onProgress({
          active: true,
          total,
          current: i + 1,
          currentTitle: item.nome,
          stage: `Processando item ${i + 1} de ${total}: ${item.nome}`,
        });
      }

      try {
        // Carregar detalhes completos do item
        const details = await fetchDetails(item.link);
        const isSeries = (details.total_seasons && details.total_seasons > 0) || 
                         (details.seasons_details && details.seasons_details.length > 0) ||
                         item.link.includes('/tvshows/');

        if (isSeries) {
          await this.importSeries(details, item.genres);
        } else {
          await this.importMovie(details, item.genres);
        }
        succeeded++;
      } catch (error) {
        console.error(`Falha ao importar item ${item.nome}:`, error);
        failed++;
      }

      // Pequena pausa entre itens para não estressar o Baserow
      await new Promise(r => setTimeout(r, 200));
    }

    return { succeeded, failed };
  }
}
