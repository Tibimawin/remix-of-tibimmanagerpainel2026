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
  MaxPlusEpisodeDetail,
  MaxPlusEpisodeResult
} from '@/services/maxplusApi';
import { mapToDatabaseKeys } from '@/utils/baserowHelpers';
import { tmdbService } from '@/services/TmdbService';
import { normalizeCategories } from '@/utils/categoryNormalizer';
import { upgradeToHighResTmdbImage } from '@/utils/imageQuality';

export interface ImportProgress {
  active: boolean;
  total: number;
  current: number;
  currentTitle: string;
  stage: string;
}

/**
 * Normaliza uma string de título removendo acentos, pontuação e múltiplos espaços
 */
export function normalizeTitle(s?: string | null): string {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Retorna variantes normalizadas de um título para correspondência flexível
 */
export function getTitleMatchVariants(rawTitle?: string | null): string[] {
  if (!rawTitle) return [];
  const base = String(rawTitle).trim();
  if (!base) return [];

  const norm = normalizeTitle(base);
  if (!norm) return [];

  const variants = new Set<string>();
  variants.add(norm);

  // Sem ano (ex: 2024, 2023, 2026, 1999)
  const noYear = norm.replace(/\b(19\d{2}|20\d{2})\b/g, '').replace(/\s+/g, ' ').trim();
  if (noYear && noYear !== norm) variants.add(noYear);

  // Sem termos de formato/idioma comuns
  const stripped = noYear
    .replace(/\b(dublado|legendado|nacional|completo|temporada|temp|filme|serie|hd|fhd|4k)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped && stripped.length >= 3) variants.add(stripped);

  // Prefixo antes de ":" ou " - " ou " – "
  if (base.includes(':')) {
    const prefix = normalizeTitle(base.split(':')[0]);
    if (prefix && prefix.length >= 3) variants.add(prefix);
    const suffix = normalizeTitle(base.split(':')[1]);
    if (suffix && suffix.length >= 4) variants.add(suffix);
  }
  if (base.includes(' - ')) {
    const prefix = normalizeTitle(base.split(' - ')[0]);
    if (prefix && prefix.length >= 3) variants.add(prefix);
    const suffix = normalizeTitle(base.split(' - ')[1]);
    if (suffix && suffix.length >= 4) variants.add(suffix);
  }
  if (base.includes(' – ')) {
    const prefix = normalizeTitle(base.split(' – ')[0]);
    if (prefix && prefix.length >= 3) variants.add(prefix);
    const suffix = normalizeTitle(base.split(' – ')[1]);
    if (suffix && suffix.length >= 4) variants.add(suffix);
  }

  // Primeiras 2 a 3 palavras significativas (ex: "academia sobrenatural", "mutante destino")
  const words = norm.split(' ').filter(w => w.length >= 3);
  if (words.length >= 2) {
    variants.add(words.slice(0, 2).join(' '));
  }
  if (words.length >= 3) {
    variants.add(words.slice(0, 3).join(' '));
  }

  return Array.from(variants);
}

/**
 * Compara dois títulos verificando se são o mesmo conteúdo (com tolerância a subtítulos, colons e variações)
 */
export function isTitleMatch(titleA?: string | null, titleB?: string | null): boolean {
  if (!titleA || !titleB) return false;
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);
  if (!normA || !normB) return false;

  // 1. Igualdade estrita normalizada
  if (normA === normB) return true;

  // 2. Interseção de variantes geradas
  const variantsA = getTitleMatchVariants(titleA);
  const variantsB = getTitleMatchVariants(titleB);
  if (variantsA.some(va => variantsB.includes(va))) return true;

  // 3. Prefixos antes de : ou -
  const prefixA = normalizeTitle(String(titleA).split(/[:\-–]/)[0]);
  const prefixB = normalizeTitle(String(titleB).split(/[:\-–]/)[0]);
  if (prefixA && prefixB && prefixA.length >= 4 && prefixB.length >= 4) {
    if (prefixA === prefixB) return true;
    if (normA.startsWith(prefixB) || normB.startsWith(prefixA)) return true;
  }

  // 4. Substring containment se um tiver tamanho significativo (>= 6)
  if (normA.length >= 6 && normB.includes(normA)) return true;
  if (normB.length >= 6 && normA.includes(normB)) return true;

  // 5. Comparação por palavras significativas (ignora stopwords)
  const stopWords = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'com', 'por', 'para', 'the', 'and', 'of', 'ao']);
  const tokensA = normA.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));
  const tokensB = normB.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));

  if (tokensA.length >= 2 && tokensB.length >= 2) {
    const smaller = tokensA.length <= tokensB.length ? tokensA : tokensB;
    const larger = tokensA.length <= tokensB.length ? tokensB : tokensA;
    const matchedCount = smaller.filter(t => larger.includes(t)).length;
    if (matchedCount === smaller.length && smaller.length >= 2) return true;
    if (matchedCount / smaller.length >= 0.75 && matchedCount >= 2) return true;
  }

  return false;
}

export class MaxPlusImportEngine {
  private baserowService: BaserowService;
  private conteudosTableId: string;
  private episodiosTableId: string;
  private conteudosKeysCache: string[] | null = null;
  private episodiosKeysCache: string[] | null = null;
  private hasFetchedRecentTableRows = false;

  // Cache estático em memória por sessão para evitar re-consultar títulos no Baserow
  private static verifiedImportedCache = new Set<string>();
  private static verifiedMissingCache = new Set<string>();

  public static markAsImported(title?: string | null, tableId?: string): void {
    if (!title) return;
    const variants = getTitleMatchVariants(title);
    variants.forEach(v => {
      MaxPlusImportEngine.verifiedImportedCache.add(v);
      MaxPlusImportEngine.verifiedMissingCache.delete(v);
    });

    // Salva no localStorage para persistência garantida entre recarregamentos
    try {
      if (typeof window !== 'undefined') {
        const keysToUpdate = ['maxplus_imported_global'];
        if (tableId) {
          keysToUpdate.push(`maxplus_imported_${tableId}`);
        }
        keysToUpdate.forEach(storageKey => {
          const existingStored = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const updated = Array.from(new Set([...existingStored, ...variants])).slice(-5000);
          localStorage.setItem(storageKey, JSON.stringify(updated));
        });
      }
    } catch {}
  }

  public static getKnownImportedTitles(tableId?: string): Set<string> {
    const set = new Set(MaxPlusImportEngine.verifiedImportedCache);
    try {
      if (typeof window !== 'undefined') {
        const keysToRead = ['maxplus_imported_global'];
        if (tableId) {
          keysToRead.push(`maxplus_imported_${tableId}`);
        }
        keysToRead.forEach(storageKey => {
          const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
          if (Array.isArray(stored)) {
            stored.forEach(t => {
              if (typeof t === 'string' && t) {
                set.add(t);
                MaxPlusImportEngine.verifiedImportedCache.add(t);
              }
            });
          }
        });
      }
    } catch {}
    return set;
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
   * Busca se o conteúdo já existe na tabela pelo Título / Nome com tolerância a subtítulos e colons
   */
  async findContentByName(titulo: string, tableId: string): Promise<Record<string, unknown> | null> {
    if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') return null;
    try {
      // 1. Tentar busca no Baserow com o termo limpo (prefixo ou primeiras 2 palavras)
      const basePrefix = titulo.split(/[:\-–]/)[0].trim();
      const searchQuery = (basePrefix.length >= 3 ? basePrefix : titulo)
        .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const data = await this.baserowService.getTableData(tableId, 1, 100, searchQuery);
      if (data?.results && data.results.length > 0) {
        const match = data.results.find((item: Record<string, unknown>) => {
          const itemTitle = String(item.Nome || item.Titulo || item.Title || '');
          return isTitleMatch(titulo, itemTitle);
        });
        if (match) return match;
      }

      // 2. Se não encontrou e o título tem múltiplas palavras, tenta com as 2 primeiras palavras
      const words = titulo.replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
      if (words.length >= 2) {
        const fallbackQuery = words.slice(0, 2).join(' ');
        if (fallbackQuery !== searchQuery) {
          const fallbackData = await this.baserowService.getTableData(tableId, 1, 50, fallbackQuery);
          if (fallbackData?.results && fallbackData.results.length > 0) {
            const match = fallbackData.results.find((item: Record<string, unknown>) => {
              const itemTitle = String(item.Nome || item.Titulo || item.Title || '');
              return isTitleMatch(titulo, itemTitle);
            });
            if (match) return match;
          }
        }
      }

      return null;
    } catch (err) {
      console.warn(`[MaxPlus] Erro ao buscar conteúdo existente "${titulo}":`, err);
      return null;
    }
  }

  /**
   * Busca conteúdos existentes por uma lista de títulos com cache persistido, varredura de recentes e busca direcionada
   */
  async findExistingContentsByTitles(titles: string[]): Promise<Set<string>> {
    const existingSet = new Set<string>();
    if (!this.conteudosTableId || !titles || titles.length === 0) {
      const known = MaxPlusImportEngine.getKnownImportedTitles(this.conteudosTableId);
      for (const t of known) {
        existingSet.add(t);
      }
      return existingSet;
    }

    try {
      // 1. Carrega imediatamente do cache local sincronizado (0ms)
      const known = MaxPlusImportEngine.getKnownImportedTitles(this.conteudosTableId);
      titles.forEach(t => {
        const variants = getTitleMatchVariants(t);
        for (const v of variants) {
          if (known.has(v)) {
            existingSet.add(v);
            break;
          }
        }
      });

      // 2. Indexa os registros da tabela do usuário no Baserow (até 1500 registros)
      if (!this.hasFetchedRecentTableRows) {
        this.hasFetchedRecentTableRows = true;
        try {
          const tableData = await this.baserowService.getAllTableData(
            this.conteudosTableId,
            undefined,
            1500
          );
          if (tableData?.results && Array.isArray(tableData.results)) {
            tableData.results.forEach((row: any) => {
              const name = row.Nome || row.Titulo || row.Title;
              if (name) {
                MaxPlusImportEngine.markAsImported(name, this.conteudosTableId);
                // Checa imediatamente contra a lista atual em exibição
                for (const t of titles) {
                  if (isTitleMatch(t, name)) {
                    MaxPlusImportEngine.markAsImported(t, this.conteudosTableId);
                    const variants = getTitleMatchVariants(t);
                    variants.forEach(v => existingSet.add(v));
                  }
                }
              }
            });
          }
        } catch (e) {
          console.warn('[MaxPlus] Não foi possível indexar tabela do Baserow:', e);
        }
      }

      // 3. Para os títulos pendentes na tela, realiza buscas direcionadas no Baserow
      const pendingTitles = titles.filter(t => {
        const variants = getTitleMatchVariants(t);
        return !variants.some(v => MaxPlusImportEngine.verifiedImportedCache.has(v));
      });

      if (pendingTitles.length > 0) {
        const BATCH_SIZE = 4;
        for (let i = 0; i < pendingTitles.length; i += BATCH_SIZE) {
          const batch = pendingTitles.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (rawTitle) => {
              try {
                // Tenta com o prefixo principal (antes de : ou -) ou as 2 primeiras palavras
                const basePrefix = rawTitle.split(/[:\-–]/)[0].trim();
                const searchKeyword = (basePrefix.length >= 3 ? basePrefix : rawTitle)
                  .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();

                if (!searchKeyword) return;

                const resp = await this.baserowService.getTableData(
                  this.conteudosTableId,
                  1,
                  25,
                  searchKeyword
                );

                if (resp?.results && Array.isArray(resp.results) && resp.results.length > 0) {
                  for (const row of resp.results) {
                    const rowName = row.Nome || row.Titulo || row.Title;
                    if (rowName && isTitleMatch(rawTitle, rowName)) {
                      MaxPlusImportEngine.markAsImported(rawTitle, this.conteudosTableId);
                      MaxPlusImportEngine.markAsImported(rowName, this.conteudosTableId);
                      const targetVariants = getTitleMatchVariants(rawTitle);
                      targetVariants.forEach(tv => existingSet.add(tv));
                      break;
                    }
                  }
                }
              } catch {
                // Silencioso - não trava a verificação
              }
            })
          );
        }
      }

      // 4. Alimenta existingSet com todos os confirmados
      titles.forEach(t => {
        const variants = getTitleMatchVariants(t);
        for (const v of variants) {
          if (MaxPlusImportEngine.verifiedImportedCache.has(v)) {
            existingSet.add(v);
            break;
          }
        }
      });
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
    // - Se for Dorama, SEMPRE contém 'Doramas'
    // - Contém SEMPRE o ano (ex: 2026 ou 2023)
    // - 'Lançamentos' apenas se for do ano atual (2026) / mês atual
    // - Plataforma de Streaming (ex: 'Prime Video', 'Netflix', 'Disney', 'Apple')
    const categoriaNormalizada = normalizeCategories({
      tipo: 'Filme',
      categorias: [data.generos, fallbackCategory].filter(Boolean).join(', '),
      ano: tmdbData?.ano,
      dataDeLancamento: tmdbData?.dataDeLancamento,
      titulo: data.nome,
      streamingPlatform: tmdbData?.streamingPlatform,
    });

    // Avaliação numérica do filme para a coluna Imdb (ex: "7.5" ou "5.0")
    const avaliacaoImdb = tmdbData?.imdb || (data.estrelas ? String(data.estrelas) : '');

    // 🖼️ Resolução Máxima: Converte qualquer Capa e Capa de Fundo do TMDb para a qualidade máxima ('original')
    const capaEmAltaResolucao = upgradeToHighResTmdbImage(data.imagem || tmdbData?.poster) || '';
    const capaDeFundoEmAltaResolucao = upgradeToHighResTmdbImage(tmdbData?.capaDeFundo) || '';

    const tableKeys = await this.getConteudosKeys();

    // 🔍 Estratégia de Upsert: verificar se o conteúdo já foi importado
    const existingContent = await this.findContentByName(data.nome, this.conteudosTableId);

    if (existingContent) {
      console.log(`🔄 [MaxPlus] Filme já existe no Baserow (ID: ${existingContent.id}), atualizando dados...`);
      const rawUpdatePayload = {
        Nome: data.nome,
        Capa: this.pick(capaEmAltaResolucao, existingContent.Capa || existingContent.Poster),
        Sinopse: this.pick(data.sinopse || tmdbData?.sinopse, existingContent.Sinopse),
        Categoria: normalizeCategories({
          tipo: 'Filme',
          categorias: [categoriaNormalizada, existingContent.Categoria as string].filter(Boolean).join(', '),
          ano: tmdbData?.ano || (existingContent.Ano as string) || (existingContent.ano as string),
          dataDeLancamento: tmdbData?.dataDeLancamento || (existingContent['Data de Lançamento'] as string) || (existingContent.data_lancamento as string),
          titulo: data.nome,
          streamingPlatform: tmdbData?.streamingPlatform,
        }),
        Link: this.pick(videoUrl, existingContent.Link),
        Tipo: 'Filme',
        Idioma: this.pick(idioma, existingContent.Idioma || existingContent.idioma) || idioma || 'Dublado',
        'TMDB ID': this.pick(tmdbData?.tmdbId, existingContent['TMDB ID'] || existingContent.tmdb_id),
        'Trailer': this.pick(tmdbData?.trailer, existingContent.Trailer || existingContent.trailer),
        'Ano': this.pick(tmdbData?.ano, existingContent.Ano || existingContent.ano),
        'Data de Lançamento': this.pick(tmdbData?.dataDeLancamento, existingContent['Data de Lançamento'] || existingContent.data_lancamento),
        'Capa de fundo': this.pick(capaDeFundoEmAltaResolucao, existingContent['Capa de fundo'] || existingContent.capa_de_fundo),
        'Imdb': this.pick(avaliacaoImdb, existingContent.Imdb || existingContent.imdb),
        Temporadas: '0',
      };

      const mappedUpdatePayload = tableKeys.length > 0 ? mapToDatabaseKeys(rawUpdatePayload, tableKeys) : rawUpdatePayload;
      await this.baserowService.updateRow(this.conteudosTableId, String(existingContent.id), mappedUpdatePayload);
      MaxPlusImportEngine.markAsImported(data.nome, this.conteudosTableId);
      return { success: true, id: String(existingContent.id), updated: true };
    }

    // Se não existir, cria um novo registro
    const rawPayload = {
      Nome: data.nome,
      Capa: capaEmAltaResolucao,
      Sinopse: data.sinopse || tmdbData?.sinopse || '',
      Categoria: categoriaNormalizada,
      Link: videoUrl,
      Tipo: 'Filme',
      Idioma: idioma || 'Dublado',
      'TMDB ID': tmdbData?.tmdbId || '',
      'Trailer': tmdbData?.trailer || '',
      'Ano': tmdbData?.ano || '',
      'Data de Lançamento': tmdbData?.dataDeLancamento || '',
      'Capa de fundo': capaDeFundoEmAltaResolucao,
      'Imdb': avaliacaoImdb,
      Temporadas: '0',
    };

    const mappedPayload = tableKeys.length > 0 ? mapToDatabaseKeys(rawPayload, tableKeys) : rawPayload;

    console.log('🎬 [MaxPlus] Importando novo filme no Baserow:', mappedPayload);
    const result = await this.baserowService.createRow(this.conteudosTableId, mappedPayload);
    MaxPlusImportEngine.markAsImported(data.nome, this.conteudosTableId);
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
    // - Se for Dorama, SEMPRE contém 'Doramas'
    // - Contém SEMPRE o ano (ex: 2026 ou 2023)
    // - 'Lançamentos' apenas se for do ano atual (2026) / mês atual
    // - Plataforma de Streaming (ex: 'Prime Video', 'Netflix', 'Disney', 'Apple')
    const categoriaNormalizada = normalizeCategories({
      tipo: 'Serie',
      categorias: [data.generos, fallbackCategory].filter(Boolean).join(', '),
      ano: tmdbData?.ano,
      dataDeLancamento: tmdbData?.dataDeLancamento,
      titulo: data.nome,
      streamingPlatform: tmdbData?.streamingPlatform,
    });

    const conteudosKeys = await this.getConteudosKeys();

    // 🖼️ Resolução Máxima: Converte qualquer Capa e Capa de Fundo do TMDb para a qualidade máxima ('original')
    const serieCapaEmAltaResolucao = upgradeToHighResTmdbImage(data.imagem || tmdbData?.poster) || '';
    const serieCapaDeFundoEmAltaResolucao = upgradeToHighResTmdbImage(tmdbData?.capaDeFundo) || '';

    // 🔢 Obter o número total de temporadas da série como String
    const qtdTemporadas = String(data.total_seasons || (data as any).temporadas || (data.seasons_details ? data.seasons_details.length : 1));

    // 1. Verifica se a Série já existe na tabela de conteúdos (Upsert)
    const existingSerie = await this.findContentByName(data.nome, this.conteudosTableId);
    let serieId = '';
    let isSerieUpdated = false;

    if (existingSerie) {
      console.log(`🔄 [MaxPlus] Série já existe no Baserow (ID: ${existingSerie.id}), atualizando registro...`);
      const rawSerieUpdate = {
        Nome: data.nome,
        Capa: this.pick(serieCapaEmAltaResolucao, existingSerie.Capa || existingSerie.Poster),
        Sinopse: this.pick(data.sinopse || tmdbData?.sinopse, existingSerie.Sinopse),
        Categoria: normalizeCategories({
          tipo: 'Serie',
          categorias: [categoriaNormalizada, existingSerie.Categoria as string].filter(Boolean).join(', '),
          ano: tmdbData?.ano || (existingSerie.Ano as string) || (existingSerie.ano as string),
          dataDeLancamento: tmdbData?.dataDeLancamento || (existingSerie['Data de Lançamento'] as string) || (existingSerie.data_lancamento as string),
          titulo: data.nome,
          streamingPlatform: tmdbData?.streamingPlatform,
        }),
        Tipo: 'Serie',
        Idioma: this.pick(serieIdioma, existingSerie.Idioma || existingSerie.idioma) || serieIdioma || 'Dublado',
        'TMDB ID': this.pick(tmdbData?.tmdbId, existingSerie['TMDB ID'] || existingSerie.tmdb_id),
        'Trailer': this.pick(tmdbData?.trailer, existingSerie.Trailer || existingSerie.trailer),
        'Ano': this.pick(tmdbData?.ano, existingSerie.Ano || existingSerie.ano),
        'Data de Lançamento': this.pick(tmdbData?.dataDeLancamento, existingSerie['Data de Lançamento'] || existingSerie.data_lancamento),
        'Capa de fundo': this.pick(serieCapaDeFundoEmAltaResolucao, existingSerie['Capa de fundo'] || existingSerie.capa_de_fundo),
        'Imdb': this.pick(avaliacaoImdb, existingSerie.Imdb || existingSerie.imdb),
        Temporadas: qtdTemporadas,
      };

      const mappedSerieUpdate = conteudosKeys.length > 0 ? mapToDatabaseKeys(rawSerieUpdate, conteudosKeys) : rawSerieUpdate;
      await this.baserowService.updateRow(this.conteudosTableId, String(existingSerie.id), mappedSerieUpdate);
      serieId = String(existingSerie.id);
      isSerieUpdated = true;
      MaxPlusImportEngine.markAsImported(data.nome, this.conteudosTableId);
    } else {
      const rawSeriePayload = {
        Nome: data.nome,
        Capa: serieCapaEmAltaResolucao,
        Sinopse: data.sinopse || tmdbData?.sinopse || '',
        Categoria: categoriaNormalizada,
        Tipo: 'Serie',
        Idioma: serieIdioma || 'Dublado',
        'TMDB ID': tmdbData?.tmdbId || '',
        'Trailer': tmdbData?.trailer || '',
        'Ano': tmdbData?.ano || '',
        'Data de Lançamento': tmdbData?.dataDeLancamento || '',
        'Capa de fundo': serieCapaDeFundoEmAltaResolucao,
        'Imdb': avaliacaoImdb,
        Temporadas: qtdTemporadas,
      };

      const mappedSeriePayload = conteudosKeys.length > 0 ? mapToDatabaseKeys(rawSeriePayload, conteudosKeys) : rawSeriePayload;
      console.log('📺 [MaxPlus] Criando novo registro da Série no Baserow:', mappedSeriePayload);
      const serieResult = await this.baserowService.createRow(this.conteudosTableId, mappedSeriePayload);
      serieId = String(serieResult?.id);
      MaxPlusImportEngine.markAsImported(data.nome, this.conteudosTableId);
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

    // 🔢 Ordenação estrita garantida: Temporada crescente (1, 2, 3...) e Episódio crescente (1, 2, 3, 4, 5...)
    allEpisodesToImport.sort((a, b) => {
      const sA = Number(a.seasonNum) || 0;
      const sB = Number(b.seasonNum) || 0;
      if (sA !== sB) return sA - sB;

      const eA = Number(a.episode.number) || 0;
      const eB = Number(b.episode.number) || 0;
      return eA - eB;
    });

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

    // 3. Processamento de episódios:
    // Passo A: Obter links dos vídeos em lote paralelo (rapidez no scraping)
    // Passo B: Gravação sequencial no Baserow para manter a ordem estrita (1, 2, 3, 4, 5...)
    const CONCURRENCY = 4;
    for (let i = 0; i < totalEpisodes; i += CONCURRENCY) {
      const batch = allEpisodesToImport.slice(i, i + CONCURRENCY);

      // Obtenção dos links em paralelo respeitando a ordem do array
      const preparedBatch = await Promise.all(batch.map(async (item, batchIdx) => {
        const itemIndex = i + batchIdx;
        const epNum = item.episode.number;
        const seasonNum = item.seasonNum;
        const epTitle = item.episode.title || `Episódio ${epNum}`;

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
        const epVideo = epData?.video || videoUrl || '';
        const isEpLegendado = Boolean(
          (epVideo && epVideo.includes('LEG')) ||
          (epVideo && (epVideo.toLowerCase().includes('leg.mp4') || epVideo.toLowerCase().includes('_leg')))
        );
        const epIdioma = epData?.idioma || (epVideo && isEpLegendado ? 'Legendado' : 'Dublado') || 'Dublado';

        return {
          item,
          itemIndex,
          epNum,
          seasonNum,
          epTitle,
          videoUrl,
          epIdioma,
        };
      }));

      // Inserção / Atualização sequencial no Baserow garantindo ordem estrita 1, 2, 3, 4, 5...
      for (const prep of preparedBatch) {
        const { itemIndex, epNum, seasonNum, epTitle, videoUrl, epIdioma } = prep;

        if (onProgress) {
          onProgress({
            active: true,
            total: totalEpisodes,
            current: Math.min(itemIndex + 1, totalEpisodes),
            currentTitle: `${data.nome} - T${seasonNum}E${epNum}: ${epTitle}`,
            stage: `Salvando episódio ${epNum} (T${seasonNum}) no Baserow (${Math.min(itemIndex + 1, totalEpisodes)}/${totalEpisodes})...`,
          });
        }

        try {
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
          console.error(`Erro ao salvar episódio T${seasonNum}E${epNum}:`, err);
        }
      }

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
  ): Promise<{ succeeded: number; failed: number; succeededTitles: string[] }> {
    let succeeded = 0;
    let failed = 0;
    const succeededTitles: string[] = [];
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
        // Carregar detalhes completos do item (com retry defensivo em caso de instabilidade)
        let details: MaxPlusContentDetails;
        try {
          details = await fetchDetails(item.link);
        } catch (initialErr) {
          console.warn(`[MaxPlus] Primeira tentativa de obter detalhes falhou para '${item.nome}', tentando novamente em 1.5s...`, initialErr);
          await new Promise((r) => setTimeout(r, 1500));
          details = await fetchDetails(item.link);
        }

        const isSeries = (details.total_seasons && details.total_seasons > 0) || 
                         (details.seasons_details && details.seasons_details.length > 0) ||
                         item.link.includes('/tvshows/');

        if (isSeries) {
          await this.importSeries(details, item.genres);
        } else {
          await this.importMovie(details, item.genres);
        }
        succeeded++;
        succeededTitles.push(item.nome);
        MaxPlusImportEngine.markAsImported(item.nome, this.conteudosTableId);
      } catch (error) {
        console.error(`Falha ao importar item ${item.nome}:`, error);
        failed++;
      }

      // Pequena pausa entre itens para não estressar o Baserow
      await new Promise(r => setTimeout(r, 200));
    }

    return { succeeded, failed, succeededTitles };
  }
}
