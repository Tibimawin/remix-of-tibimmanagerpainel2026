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
   * Importa um Filme diretamente para a tabela de conteúdos
   */
  async importMovie(
    data: MaxPlusContentDetails, 
    fallbackCategory?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
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
      'Imdb': tmdbData?.imdb || '',
    };

    const tableKeys = await this.getConteudosKeys();
    const mappedPayload = tableKeys.length > 0 ? mapToDatabaseKeys(rawPayload, tableKeys) : rawPayload;

    console.log('🎬 [MaxPlus] Importando filme no Baserow:', mappedPayload);
    const result = await this.baserowService.createRow(this.conteudosTableId, mappedPayload);
    return { success: true, id: result.id };
  }

  /**
   * Importa uma Série e todos os seus episódios com resolução assíncrona de URLs MP4
   */
  async importSeries(
    data: MaxPlusContentDetails,
    fallbackCategory: string | undefined,
    onProgress?: (progress: ImportProgress) => void,
    selectedSeasonsOrEpisodes?: { seasonNum: number; episodeNum: number }[]
  ): Promise<{ success: boolean; serieId?: string; totalEpisodesImported: number }> {
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

    // 1. Cria a linha principal da série na tabela de conteúdos
    const categoria = data.generos || fallbackCategory || 'Séries';
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
      'Imdb': tmdbData?.imdb || '',
    };

    const conteudosKeys = await this.getConteudosKeys();
    const mappedSeriePayload = conteudosKeys.length > 0 ? mapToDatabaseKeys(rawSeriePayload, conteudosKeys) : rawSeriePayload;

    console.log('📺 [MaxPlus] Criando registro da Série no Baserow:', mappedSeriePayload);
    const serieResult = await this.baserowService.createRow(this.conteudosTableId, mappedSeriePayload);
    const serieId = serieResult?.id;

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

    // 3. Loop assíncrono para resolver links de episódios e criar rows
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
          stage: `Resolvendo vídeo e salvando episódio (${i + 1}/${totalEpisodes})...`,
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

        const rawEpPayload = {
          Nome: data.nome,
          Temporada: seasonNum,
          Episódio: epNum,
          Link: videoUrl,
          Idioma: isLeg ? 'Legendado' : 'Dublado',
        };

        const mappedEpPayload = episodiosKeys.length > 0 
          ? mapToDatabaseKeys(rawEpPayload, episodiosKeys) 
          : rawEpPayload;

        await this.baserowService.createRow(this.episodiosTableId, mappedEpPayload);
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
