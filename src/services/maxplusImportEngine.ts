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
   * Busca se o episódio já existe na tabela de episódios por Série + Temporada + Episódio
   */
  async findEpisodeByIdentifiers(
    serieName: string,
    season: number,
    episode: number,
    tableId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const cleanSerie = serieName.toLowerCase().trim();
      const data = await this.baserowService.getTableData(tableId, 1, 200, serieName.trim());
      if (!data || !data.results || data.results.length === 0) return null;

      const match = data.results.find((item: Record<string, unknown>) => {
        const itemSerie = (String(item.Nome || item.Serie || item.Titulo || '')).toLowerCase().trim();
        const itemTemp = String(item.Temporada || '');
        const itemEp = String(item['Episódio'] || item.Episodio || item.Numero || '');
        return (itemSerie === cleanSerie || itemSerie.includes(cleanSerie)) &&
          itemTemp === String(season) &&
          itemEp === String(episode);
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
    const isLegendado = videoUrl.toLowerCase().includes('leg.mp4') || videoUrl.toLowerCase().includes('_leg');
    const idioma = isLegendado ? 'Legendado' : 'Dublado';
    const categoria = data.generos || fallbackCategory || 'Filmes';

    // 🎬 Enriquecimento automático com TMDb: TMDB ID, Trailer, Ano, Data de Lançamento, Capa de fundo, Imdb
    let tmdbData = null;
    try {
      const hintText = [data.video, data.link, data.imagem].filter(Boolean).join(' ');
      tmdbData = await tmdbService.getEnrichedDataForContent(data.nome, 'movie', hintText);
      if (tmdbData) {
        console.log(`🎬 [MaxPlus] Metadados TMDb obtidos com sucesso para "${data.nome}":`, tmdbData);
      }
    } catch (tmdbErr) {
      console.warn(`[MaxPlus] Aviso ao consultar TMDb para "${data.nome}":`, tmdbErr);
    }

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
        Categoria: this.pick(categoria, existingContent.Categoria),
        Link: this.pick(videoUrl, existingContent.Link),
        Tipo: 'Filme',
        Idioma: this.pick(idioma, existingContent.Idioma),
        'TMDB ID': this.pick(tmdbData?.tmdbId, existingContent['TMDB ID'] || existingContent.tmdb_id),
        'Trailer': this.pick(tmdbData?.trailer, existingContent.Trailer || existingContent.trailer),
        'Ano': this.pick(tmdbData?.ano, existingContent.Ano || existingContent.ano),
        'Data de Lançamento': this.pick(tmdbData?.dataDeLancamento, existingContent['Data de Lançamento'] || existingContent.data_lancamento),
        'Capa de fundo': this.pick(tmdbData?.capaDeFundo, existingContent['Capa de fundo'] || existingContent.capa_de_fundo),
        'Imdb': this.pick(avaliacaoImdb, existingContent.Imdb || existingContent.imdb),
      };

      const mappedUpdatePayload = tableKeys.length > 0 ? mapToDatabaseKeys(rawUpdatePayload, tableKeys) : rawUpdatePayload;
      await this.baserowService.updateRow(this.conteudosTableId, String(existingContent.id), mappedUpdatePayload);
      return { success: true, id: String(existingContent.id), updated: true };
    }

    // Se não existir, cria um novo registro
    const rawPayload = {
      Nome: data.nome,
      Capa: data.imagem || tmdbData?.poster || '',
      Sinopse: data.sinopse || tmdbData?.sinopse || '',
      Categoria: categoria,
      Link: videoUrl,
      Tipo: 'Filme',
      Idioma: idioma,
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
  ): Promise<{ success: boolean; serieId?: string; totalEpisodesImported: number; updated?: boolean }> {
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
      tmdbData = await tmdbService.getEnrichedDataForContent(data.nome, 'tv', hintText);
      if (tmdbData) {
        console.log(`📺 [MaxPlus] Metadados TMDb obtidos com sucesso para série "${data.nome}":`, tmdbData);
      }
    } catch (tmdbErr) {
      console.warn(`[MaxPlus] Aviso ao consultar TMDb para série "${data.nome}":`, tmdbErr);
    }

    const avaliacaoImdb = tmdbData?.imdb || (data.estrelas ? String(data.estrelas) : '');
    const categoria = data.generos || fallbackCategory || 'Séries';
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
        Categoria: this.pick(categoria, existingSerie.Categoria),
        Tipo: 'Série',
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
    } else {
      const rawSeriePayload = {
        Nome: data.nome,
        Capa: data.imagem || tmdbData?.poster || '',
        Sinopse: data.sinopse || tmdbData?.sinopse || '',
        Categoria: categoria,
        Tipo: 'Série',
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
    const episodiosKeys = await this.getEpisodiosKeys();

    if (totalEpisodes > 0 && onProgress) {
      onProgress({
        active: true,
        total: totalEpisodes,
        current: 0,
        currentTitle: data.nome,
        stage: `Preparando importação de ${totalEpisodes} episódios...`,
      });
    }

    // 3. Loop assíncrono para resolver links de episódios e fazer Upsert (atualizar se já existe)
    for (let i = 0; i < totalEpisodes; i++) {
      const item = allEpisodesToImport[i];
      const epNum = item.episode.number;
      const seasonNum = item.seasonNum;
      const epTitle = item.episode.title || `Episódio ${epNum}`;

      if (onProgress) {
        onProgress({
          active: true,
          total: totalEpisodes,
          current: i + 1,
          currentTitle: `${data.nome} - T${seasonNum}E${epNum}: ${epTitle}`,
          stage: `Processando episódio (${i + 1}/${totalEpisodes})...`,
        });
      }

      try {
        let videoUrl = '';
        let isLeg = false;

        // Buscar link direto do MP4 via fetchEpisode
        if (item.episode.link) {
          try {
            const epResult = await fetchEpisode(item.episode.link);
            videoUrl = epResult?.video || '';
            isLeg = videoUrl.toLowerCase().includes('leg.mp4') || videoUrl.toLowerCase().includes('_leg');
          } catch (epErr) {
            console.warn(`Aviso ao obter link do episódio T${seasonNum}E${epNum}:`, epErr);
          }
        }

        // Verifica se o episódio já existe na tabela de episódios
        const existingEp = await this.findEpisodeByIdentifiers(data.nome, seasonNum, epNum, this.episodiosTableId);

        if (existingEp) {
          console.log(`🔄 [MaxPlus] Episódio T${seasonNum}E${epNum} já existe (ID: ${existingEp.id}), atualizando...`);
          const rawEpUpdate: Record<string, unknown> = {
            Nome: data.nome,
            Serie: data.nome,
            Temporada: seasonNum,
            'Episódio': epNum,
            Link: this.pick(videoUrl, existingEp.Link),
            Idioma: this.pick(isLeg ? 'Legendado' : 'Dublado', existingEp.Idioma),
            Sinopse: this.pick(epTitle, existingEp.Sinopse),
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
        } else {
          const rawEpPayload: Record<string, unknown> = {
            Nome: data.nome,
            Serie: data.nome,
            Temporada: seasonNum,
            'Episódio': epNum,
            Link: videoUrl,
            Idioma: isLeg ? 'Legendado' : 'Dublado',
            Sinopse: epTitle,
          };

          if (serieId) {
            rawEpPayload.Conteudo = [serieId];
          }

          const mappedEpPayload = episodiosKeys.length > 0 
            ? mapToDatabaseKeys(rawEpPayload, episodiosKeys) 
            : rawEpPayload;

          await this.baserowService.createRow(this.episodiosTableId, mappedEpPayload);
        }

        importedCount++;

        // Pequena pausa para estabilidade de rede
        await new Promise(r => setTimeout(r, 120));
      } catch (err) {
        console.error(`Erro ao importar episódio T${seasonNum}E${epNum}:`, err);
      }
    }

    return {
      success: true,
      serieId,
      totalEpisodesImported: importedCount,
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
