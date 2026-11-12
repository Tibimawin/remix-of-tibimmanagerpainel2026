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
import { isDemoSessionActive } from '@/services/BaserowDemoData';

export interface ImportProgress {
  active: boolean;
  total: number;
  current: number;
  currentTitle: string;
  stage: string;
}

/**
 * Campos suportados para títulos de conteúdo no Baserow (idêntico ao AutoImportService / ImportPreview)
 */
export const CONTENT_TITLE_FIELDS = [
  'Nome',
  'Nome do Conteúdo',
  'Nome do Conteudo',
  'NomeConteudo',
  'Titulo',
  'Título',
  'Title',
  'TituloOriginal',
  'Título Original',
  'name',
];

/**
 * Obtém o título do registro considerando qualquer variação de nome de coluna no Baserow
 */
export function getContentTitle(record: any): string {
  if (!record || typeof record !== 'object') return '';
  for (const field of CONTENT_TITLE_FIELDS) {
    const value = record[field];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
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

  // Armazena o registro real do Baserow por ID e por Título para garantir ZERO duplicações
  private static existingRowById = new Map<string, Record<string, unknown>>();
  private static existingRowByTitle = new Map<string, Record<string, unknown>>();

  public static rememberExistingRow(row: Record<string, unknown>, tableId?: string): void {
    if (!row || !row.id) return;
    const rowId = String(row.id);
    MaxPlusImportEngine.existingRowById.set(rowId, row);

    const title = getContentTitle(row);
    if (title) {
      MaxPlusImportEngine.markAsImported(title, tableId);
      const norm = normalizeTitle(title);
      MaxPlusImportEngine.existingRowByTitle.set(norm, row);

      const variants = getTitleMatchVariants(title);
      variants.forEach(v => {
        MaxPlusImportEngine.existingRowByTitle.set(v, row);
      });

      const prefix = title.split(/[:\-–]/)[0].trim();
      if (prefix && prefix !== title) {
        MaxPlusImportEngine.existingRowByTitle.set(normalizeTitle(prefix), row);
      }

      // Persistir mapeamento título -> ID no localStorage
      try {
        if (typeof window !== 'undefined' && tableId) {
          const storageKey = `maxplus_title_to_id_${tableId}`;
          const currentMap = JSON.parse(localStorage.getItem(storageKey) || '{}');
          currentMap[norm] = rowId;
          variants.forEach(v => {
            currentMap[v] = rowId;
          });
          if (prefix && prefix !== title) {
            currentMap[normalizeTitle(prefix)] = rowId;
          }
          localStorage.setItem(storageKey, JSON.stringify(currentMap));
        }
      } catch {}
    }
  }

  public static getCachedRowForTitle(title: string, tableId?: string): Record<string, unknown> | null {
    if (!title) return null;
    const clean = title.trim();
    const norm = normalizeTitle(clean);

    if (MaxPlusImportEngine.existingRowByTitle.has(norm)) {
      return MaxPlusImportEngine.existingRowByTitle.get(norm)!;
    }

    const variants = getTitleMatchVariants(clean);
    for (const v of variants) {
      if (MaxPlusImportEngine.existingRowByTitle.has(v)) {
        return MaxPlusImportEngine.existingRowByTitle.get(v)!;
      }
    }

    const prefix = clean.split(/[:\-–]/)[0].trim();
    if (prefix && prefix !== clean) {
      const normPrefix = normalizeTitle(prefix);
      if (MaxPlusImportEngine.existingRowByTitle.has(normPrefix)) {
        return MaxPlusImportEngine.existingRowByTitle.get(normPrefix)!;
      }
    }

    // Busca por isTitleMatch em todos os cacheados
    for (const [cachedTitleNorm, row] of MaxPlusImportEngine.existingRowByTitle.entries()) {
      const rowTitle = getContentTitle(row);
      if (rowTitle && (isTitleMatch(clean, rowTitle) || cachedTitleNorm === norm)) {
        return row;
      }
    }

    // Tentar ler do localStorage se fornecido tableId
    try {
      if (typeof window !== 'undefined' && tableId) {
        const storageKey = `maxplus_title_to_id_${tableId}`;
        const map = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const foundId = map[norm] || variants.map(v => map[v]).find(Boolean);
        if (foundId) {
          return { id: foundId, Nome: title };
        }
      }
    } catch {}

    return null;
  }

  public static markAsImported(title?: string | null, tableId?: string): void {
    if (!title) return;
    const base = String(title).trim();
    if (!base) return;

    const norm = normalizeTitle(base);
    const variants = getTitleMatchVariants(base);
    variants.push(norm);

    // Também adiciona prefixo antes de : ou -
    const prefix = base.split(/[:\-–]/)[0].trim();
    if (prefix && prefix !== base) {
      variants.push(normalizeTitle(prefix));
      getTitleMatchVariants(prefix).forEach(v => variants.push(v));
    }

    const uniqueVariants = Array.from(new Set(variants.filter(Boolean)));

    uniqueVariants.forEach(v => {
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
          const updated = Array.from(new Set([...existingStored, ...uniqueVariants])).slice(-5000);
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
    this.conteudosTableId = conteudosTableId || (isDemoSessionActive() ? 'demo-conteudos' : '');
    this.episodiosTableId = episodiosTableId || (isDemoSessionActive() ? 'demo-episodios' : '');
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
   * Busca se o conteúdo já existe na tabela pelo Título / Nome (idêntico ao AutoImportService.ts)
   */
  async findContentByName(titulo: string, tableId: string): Promise<Record<string, unknown> | null> {
    if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') return null;
    const cleanTitle = titulo.trim();

    // 0. Cache em memória imediato de registros já identificados no Baserow (0ms)
    const cached = MaxPlusImportEngine.getCachedRowForTitle(cleanTitle, tableId);
    if (cached && cached.id) {
      console.log(`⚡ [MaxPlus] Conteúdo encontrado em cache imediato (ID ${cached.id}): "${cleanTitle}"`);
      return cached;
    }

    try {
      const basePrefix = cleanTitle.split(/[:\-–]/)[0].trim();
      const tableKeys = await this.getConteudosKeys();
      const titleColumn = tableKeys.find(k => CONTENT_TITLE_FIELDS.includes(k)) || 'Nome';

      // 1. Consulta direta por filtro exato (filter_type=OR) - Idêntico ao ImportPreview
      try {
        let filterParams = `?user_field_names=true&size=10&filter_type=OR`;
        filterParams += `&filter__${encodeURIComponent(titleColumn)}__equal=${encodeURIComponent(cleanTitle)}`;
        if (basePrefix && basePrefix !== cleanTitle && basePrefix.length >= 3) {
          filterParams += `&filter__${encodeURIComponent(titleColumn)}__equal=${encodeURIComponent(basePrefix)}`;
        }

        const resp = await this.baserowService.makeRequest(`/api/database/rows/table/${tableId}/${filterParams}`);
        if (resp.ok) {
          const resData = await resp.json();
          if (resData?.results && Array.isArray(resData.results) && resData.results.length > 0) {
            const match = resData.results.find((item: any) => {
              const itemTitle = getContentTitle(item);
              return (
                itemTitle.toLowerCase().trim() === cleanTitle.toLowerCase() ||
                isTitleMatch(cleanTitle, itemTitle)
              );
            }) || resData.results[0];

            if (match && match.id) {
              console.log(`✅ [MaxPlus] Conteúdo encontrado via filtro OR: ID ${match.id}, Título: "${getContentTitle(match)}"`);
              MaxPlusImportEngine.rememberExistingRow(match, tableId);
              return match;
            }
          }
        }
      } catch (orErr) {
        console.warn('[MaxPlus] Filtro OR em findContentByName falhou, continuando busca:', orErr);
      }

      // 2. Busca direta por termo via getTableData (Idêntico ao AutoImportService.ts)
      const data = await this.baserowService.getTableData(tableId, 1, 200, cleanTitle);
      if (data?.results && data.results.length > 0) {
        const exactMatch = data.results.find((item: any) => {
          const itemTitle = getContentTitle(item).toLowerCase().trim();
          return itemTitle === cleanTitle.toLowerCase();
        });
        if (exactMatch && exactMatch.id) {
          console.log(`✅ [MaxPlus] Match exato encontrado: ID ${exactMatch.id}, Título: "${getContentTitle(exactMatch)}"`);
          MaxPlusImportEngine.rememberExistingRow(exactMatch, tableId);
          return exactMatch;
        }

        const titleMatch = data.results.find((item: any) => {
          const itemTitle = getContentTitle(item);
          return isTitleMatch(cleanTitle, itemTitle);
        });
        if (titleMatch && titleMatch.id) {
          console.log(`✅ [MaxPlus] Match flexível encontrado: ID ${titleMatch.id}, Título: "${getContentTitle(titleMatch)}"`);
          MaxPlusImportEngine.rememberExistingRow(titleMatch, tableId);
          return titleMatch;
        }
      }

      // 3. Se tiver prefixo, busca pelo prefixo
      if (basePrefix && basePrefix !== cleanTitle && basePrefix.length >= 3) {
        const prefixData = await this.baserowService.getTableData(tableId, 1, 100, basePrefix);
        if (prefixData?.results && prefixData.results.length > 0) {
          const match = prefixData.results.find((item: any) => {
            const itemTitle = getContentTitle(item);
            return (
              itemTitle.toLowerCase().trim() === cleanTitle.toLowerCase() ||
              itemTitle.toLowerCase().trim() === basePrefix.toLowerCase() ||
              isTitleMatch(cleanTitle, itemTitle)
            );
          });
          if (match && match.id) {
            console.log(`✅ [MaxPlus] Match por prefixo encontrado: ID ${match.id}, Título: "${getContentTitle(match)}"`);
            MaxPlusImportEngine.rememberExistingRow(match, tableId);
            return match;
          }
        }
      }

      // 4. Última barreira de segurança: varredura dos 200 registros mais recentes do Baserow (-id)
      const recent = await this.baserowService.getTableData(tableId, 1, 200, undefined, '-id');
      if (recent?.results && Array.isArray(recent.results)) {
        for (const row of recent.results) {
          const rowTitle = getContentTitle(row);
          if (rowTitle && (rowTitle.toLowerCase().trim() === cleanTitle.toLowerCase() || isTitleMatch(cleanTitle, rowTitle))) {
            console.log(`✅ [MaxPlus] Encontrado em varredura recente (-id): ID ${row.id}, Título: "${rowTitle}"`);
            MaxPlusImportEngine.rememberExistingRow(row, tableId);
            return row;
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
   * Busca conteúdos existentes por uma lista de títulos usando a mesma lógica do ImportPreview / AutoImport:
   * 1. Consulta em lote com filter_type=OR e filtro de Nome/Título na tabela do Baserow
   * 2. Indexação dos registros mais recentes (-id)
   * 3. Busca individual de contingência (findContentByName)
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
        const norm = normalizeTitle(t);
        const variants = getTitleMatchVariants(t);
        for (const v of [norm, ...variants]) {
          if (known.has(v)) {
            existingSet.add(v);
            existingSet.add(norm);
            break;
          }
        }
      });

      // 2. ESTRATÉGIA DO IMPORT PREVIEW (AutoImport) OTIMIZADA:
      // Verifica apenas títulos ainda não conhecidos em lotes seguros de 25 (sem inundar o navegador)
      const uncachedNames = Array.from(
        new Set(
          titles
            .map(t => t.trim())
            .filter(t => {
              if (!t) return false;
              const norm = normalizeTitle(t);
              return !existingSet.has(norm);
            })
        )
      );

      // 3. ESTRATÉGIA DE RECENTES (executa apenas uma vez por sessão):
      // Indexa as 200 linhas mais recentes da tabela rapidamente antes dos lotes OR
      if (!this.hasFetchedRecentTableRows) {
        this.hasFetchedRecentTableRows = true;
        try {
          const recent = await this.baserowService.getTableData(
            this.conteudosTableId,
            1,
            200,
            undefined,
            '-id'
          );
          if (recent?.results && Array.isArray(recent.results)) {
            recent.results.forEach((row: any) => {
              MaxPlusImportEngine.rememberExistingRow(row, this.conteudosTableId);
              const rowTitle = getContentTitle(row);
              if (rowTitle) {
                MaxPlusImportEngine.markAsImported(rowTitle, this.conteudosTableId);
                for (const t of titles) {
                  if (
                    isTitleMatch(t, rowTitle) ||
                    normalizeTitle(t) === normalizeTitle(rowTitle) ||
                    t.toLowerCase().trim() === rowTitle.toLowerCase().trim()
                  ) {
                    MaxPlusImportEngine.markAsImported(t, this.conteudosTableId);
                    getTitleMatchVariants(t).forEach(v => existingSet.add(v));
                    existingSet.add(normalizeTitle(t));
                  }
                }
              }
            });
          }
        } catch (e) {
          console.warn('[MaxPlus] Não foi possível indexar tabela do Baserow:', e);
        }
      }

      // Filtrar apenas o que ainda não foi encontrado após o índice de recentes
      const remainingNames = uncachedNames.filter(name => !existingSet.has(normalizeTitle(name)));

      if (remainingNames.length > 0) {
        const tableKeys = await this.getConteudosKeys();
        const titleColumn = tableKeys.find(k => CONTENT_TITLE_FIELDS.includes(k)) || 'Nome';

        const CHUNK_SIZE = 25;
        const chunks: string[][] = [];
        for (let i = 0; i < remainingNames.length; i += CHUNK_SIZE) {
          chunks.push(remainingNames.slice(i, i + CHUNK_SIZE));
        }

        await Promise.all(
          chunks.map(async (chunk) => {
            let filterParams = `?user_field_names=true&size=200&filter_type=OR`;
            chunk.forEach(name => {
              filterParams += `&filter__${encodeURIComponent(titleColumn)}__equal=${encodeURIComponent(name)}`;
              const prefix = name.split(/[:\-–]/)[0].trim();
              if (prefix && prefix !== name && prefix.length >= 4) {
                filterParams += `&filter__${encodeURIComponent(titleColumn)}__equal=${encodeURIComponent(prefix)}`;
              }
            });

            try {
              const resp = await this.baserowService.makeRequest(
                `/api/database/rows/table/${this.conteudosTableId}/${filterParams}`
              );
              if (resp.ok) {
                const data = await resp.json();
                const results = Array.isArray(data?.results) ? data.results : [];
                results.forEach((row: any) => {
                  MaxPlusImportEngine.rememberExistingRow(row, this.conteudosTableId);
                  const rowTitle = getContentTitle(row);
                  if (rowTitle) {
                    MaxPlusImportEngine.markAsImported(rowTitle, this.conteudosTableId);
                    for (const t of chunk) {
                      if (
                        isTitleMatch(t, rowTitle) ||
                        normalizeTitle(t) === normalizeTitle(rowTitle) ||
                        t.toLowerCase().trim() === rowTitle.toLowerCase().trim()
                      ) {
                        MaxPlusImportEngine.markAsImported(t, this.conteudosTableId);
                        getTitleMatchVariants(t).forEach(v => existingSet.add(v));
                        existingSet.add(normalizeTitle(t));
                      }
                    }
                  }
                });
              }
            } catch (e) {
              console.warn('[MaxPlus] Filtro OR em lote:', e);
            }
          })
        );
      }

      // 5. Alimenta existingSet com todos os confirmados
      titles.forEach(t => {
        const norm = normalizeTitle(t);
        const variants = getTitleMatchVariants(t);
        for (const v of [norm, ...variants]) {
          if (MaxPlusImportEngine.verifiedImportedCache.has(v)) {
            existingSet.add(v);
            existingSet.add(norm);
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
      const cleanSerie = serieName.toLowerCase().trim();
      const basePrefix = cleanSerie.split(/[:\-–]/)[0].trim();

      const fetchTerm = (basePrefix.length >= 3 ? basePrefix : cleanSerie)
        .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const data = await this.baserowService.getTableData(tableId, 1, 200, fetchTerm || serieName.trim());
      const allResults: any[] = Array.isArray(data?.results) ? [...data.results] : [];

      // Se tiver prefixo distinto, tenta busca complementar para garantir cobertura máxima
      if (basePrefix && basePrefix !== cleanSerie && basePrefix.length >= 3) {
        try {
          const directData = await this.baserowService.getTableData(tableId, 1, 200, cleanSerie.slice(0, 30));
          if (directData?.results && Array.isArray(directData.results)) {
            for (const r of directData.results) {
              if (!allResults.some(item => item.id === r.id)) {
                allResults.push(r);
              }
            }
          }
        } catch {}
      }

      return allResults.filter((item: Record<string, unknown>) => {
        const itemSerie = String(item.Serie || item['Série'] || item.Nome || item.Titulo || getContentTitle(item) || '').toLowerCase().trim();
        return (
          itemSerie === cleanSerie ||
          itemSerie.includes(cleanSerie) ||
          cleanSerie.includes(itemSerie) ||
          (basePrefix.length >= 3 && (itemSerie === basePrefix || itemSerie.includes(basePrefix) || basePrefix.includes(itemSerie)))
        );
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
      const basePrefix = cleanSerie.split(/[:\-–]/)[0].trim();
      const targetSeason = String(season).trim();
      const targetEpisode = String(episode).trim();

      const fetchTerm = (basePrefix.length >= 3 ? basePrefix : cleanSerie)
        .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const data = await this.baserowService.getTableData(tableId, 1, 200, fetchTerm || serieName.trim());
      let candidateList = Array.isArray(data?.results) ? [...data.results] : [];

      if (candidateList.length === 0 && basePrefix && basePrefix !== cleanSerie && basePrefix.length >= 3) {
        try {
          const prefixData = await this.baserowService.getTableData(tableId, 1, 200, basePrefix);
          if (prefixData?.results && Array.isArray(prefixData.results)) {
            candidateList = prefixData.results;
          }
        } catch {}
      }

      if (candidateList.length === 0) return null;

      const match = candidateList.find((item: Record<string, unknown>) => {
        const itemSerie = String(item.Serie || item['Série'] || item.Nome || item.Titulo || getContentTitle(item) || '').toLowerCase().trim();
        const itemTemp = String(item.Temporada || item.Season || '').trim();
        const itemEp = String(item['Episódio'] || item.Episodio || item.Numero || item.Episode || '').trim();

        const matchSerie = 
          itemSerie === cleanSerie || 
          itemSerie.includes(cleanSerie) || 
          cleanSerie.includes(itemSerie) ||
          (basePrefix.length >= 3 && (itemSerie === basePrefix || itemSerie.includes(basePrefix) || basePrefix.includes(itemSerie)));
        
        const matchTemp = itemTemp === targetSeason || Number(itemTemp) === Number(targetSeason);
        const matchEp = itemEp === targetEpisode || Number(itemEp) === Number(targetEpisode);

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
    if (isDemoSessionActive()) {
      const demoResult = await this.baserowService.createRow(this.conteudosTableId, {
        Nome: data.nome,
        Capa: data.imagem,
        Sinopse: data.sinopse || 'Conteúdo demonstrativo.',
        Categoria: data.categoria || fallbackCategory || 'Filmes',
        Link: data.video || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        Tipo: 'Filme',
        Idioma: 'Dublado',
        'TMDB ID': '99999',
        'Trailer': '',
        'Ano': '2024',
        'Data de Lançamento': '2024-01-01',
        'Capa de fundo': data.imagem,
        'Imdb': '8.5',
        Temporadas: '0',
      });
      MaxPlusImportEngine.markAsImported(data.nome, this.conteudosTableId);
      return { success: true, id: String(demoResult.id) };
    }

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

    // 🎬 Enriquecimento TMDb + busca de chaves + checagem de existência em PARALELO para máxima velocidade
    const hintText = [data.video, data.link, data.imagem].filter(Boolean).join(' ');
    const tmdbPromise = (async () => {
      try {
        const fetchTmdb = tmdbService.getEnrichedDataForContent(data.nome, 'movie', hintText);
        const tmdbTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
        const res = await Promise.race([fetchTmdb, tmdbTimeout]);
        if (res) {
          console.log(`🎬 [MaxPlus] Metadados TMDb obtidos com sucesso para "${data.nome}":`, res);
        }
        return res;
      } catch (tmdbErr) {
        console.warn(`[MaxPlus] Aviso ao consultar TMDb para "${data.nome}":`, tmdbErr);
        return null;
      }
    })();

    const [tmdbData, tableKeys, existingContent] = await Promise.all([
      tmdbPromise,
      this.getConteudosKeys(),
      this.findContentByName(data.nome, this.conteudosTableId),
    ]);

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
      MaxPlusImportEngine.rememberExistingRow({ ...existingContent, ...mappedUpdatePayload, id: existingContent.id }, this.conteudosTableId);
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
      'Data de Lançamento': tmdbData?.dataDeLancamento || null,
      'Capa de fundo': capaDeFundoEmAltaResolucao,
      'Imdb': avaliacaoImdb,
      Temporadas: '0',
    };

    const mappedPayload = tableKeys.length > 0 ? mapToDatabaseKeys(rawPayload, tableKeys) : rawPayload;

    console.log('🎬 [MaxPlus] Importando novo filme no Baserow:', mappedPayload);
    const result = await this.baserowService.createRow(this.conteudosTableId, mappedPayload);
    if (result && result.id) {
      MaxPlusImportEngine.rememberExistingRow(result, this.conteudosTableId);
    }
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
    if (isDemoSessionActive()) {
      onProgress?.({
        active: true,
        total: 4,
        current: 1,
        currentTitle: data.nome,
        stage: `Salvando série "${data.nome}" no catálogo demonstrativo...`
      });
      const serieRow = await this.baserowService.createRow(this.conteudosTableId, {
        Nome: data.nome,
        Capa: data.imagem,
        Sinopse: data.sinopse || 'Série de demonstração com episódios simulados.',
        Categoria: data.categoria || fallbackCategory || 'Séries',
        Tipo: 'Serie',
        Idioma: 'Dublado',
        'TMDB ID': '99998',
        'Ano': '2024',
        Temporadas: String(data.total_seasons || 1),
      });

      const epCount = 4;
      for (let i = 1; i <= epCount; i++) {
        onProgress?.({
          active: true,
          total: epCount,
          current: i,
          currentTitle: `${data.nome} - Episódio ${i}`,
          stage: `Importando episódio ${i} de ${epCount}...`
        });
        await this.baserowService.createRow(this.episodiosTableId, {
          Nome: `Episódio ${i}`,
          Serie: data.nome,
          Temporada: '1',
          'Episódio': String(i),
          Link: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          Sinopse: `Sinopse demonstrativa do episódio ${i}.`,
          Conteudo: [serieRow.id]
        });
      }

      MaxPlusImportEngine.markAsImported(data.nome, this.conteudosTableId);
      return {
        success: true,
        serieId: String(serieRow.id),
        totalEpisodesImported: epCount,
        createdEpisodesCount: epCount,
        updatedEpisodesCount: 0
      };
    }

    if (!this.conteudosTableId) {
      throw new Error('ID da tabela de conteúdos não configurado.');
    }
    if (!this.episodiosTableId) {
      throw new Error('ID da tabela de episódios não configurado.');
    }

    // 📺 Enriquecimento TMDb + busca de chaves + checagem de existência em PARALELO para máxima velocidade
    const hintText = [data.link, data.imagem].filter(Boolean).join(' ');
    const tmdbPromise = (async () => {
      try {
        const fetchTmdb = tmdbService.getEnrichedDataForContent(data.nome, 'tv', hintText);
        const tmdbTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
        const res = await Promise.race([fetchTmdb, tmdbTimeout]);
        if (res) {
          console.log(`📺 [MaxPlus] Metadados TMDb obtidos com sucesso para série "${data.nome}":`, res);
        }
        return res;
      } catch (tmdbErr) {
        console.warn(`[MaxPlus] Aviso ao consultar TMDb para série "${data.nome}":`, tmdbErr);
        return null;
      }
    })();

    const [tmdbData, conteudosKeys, existingSerie, episodiosKeys, existingEpisodesList] = await Promise.all([
      tmdbPromise,
      this.getConteudosKeys(),
      this.findContentByName(data.nome, this.conteudosTableId),
      this.getEpisodiosKeys(),
      this.getExistingEpisodesForSeries(data.nome, this.episodiosTableId),
    ]);

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

    // 🖼️ Resolução Máxima: Converte qualquer Capa e Capa de Fundo do TMDb para a qualidade máxima ('original')
    const serieCapaEmAltaResolucao = upgradeToHighResTmdbImage(data.imagem || tmdbData?.poster) || '';
    const serieCapaDeFundoEmAltaResolucao = upgradeToHighResTmdbImage(tmdbData?.capaDeFundo) || '';

    // 🔢 Obter o número total de temporadas da série como String
    const qtdTemporadas = String(data.total_seasons || (data as any).temporadas || (data.seasons_details ? data.seasons_details.length : 1));

    // 1. Verifica se a Série já existe na tabela de conteúdos (Upsert)
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
      MaxPlusImportEngine.rememberExistingRow({ ...existingSerie, ...mappedSerieUpdate, id: existingSerie.id }, this.conteudosTableId);
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
        'Data de Lançamento': tmdbData?.dataDeLancamento || null,
        'Capa de fundo': serieCapaDeFundoEmAltaResolucao,
        'Imdb': avaliacaoImdb,
        Temporadas: qtdTemporadas,
      };

      const mappedSeriePayload = conteudosKeys.length > 0 ? mapToDatabaseKeys(rawSeriePayload, conteudosKeys) : rawSeriePayload;
      console.log('📺 [MaxPlus] Criando novo registro da Série no Baserow:', mappedSeriePayload);
      const serieResult = await this.baserowService.createRow(this.conteudosTableId, mappedSeriePayload);
      serieId = String(serieResult?.id);
      if (serieResult && serieResult.id) {
        MaxPlusImportEngine.rememberExistingRow(serieResult, this.conteudosTableId);
      }
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

    // 🔍 Mapa de episódios já pré-carregado em paralelo no início da importação
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

    // 3. Processamento de episódios em alta velocidade:
    // Passo A: Obter links dos vídeos em lote paralelo (CONCURRENCY = 8)
    // Passo B: Gravação em lote (createRowsBatch) mantendo a ordem estrita (1, 2, 3, 4, 5...)
    const CONCURRENCY = 8;
    for (let i = 0; i < totalEpisodes; i += CONCURRENCY) {
      const batch = allEpisodesToImport.slice(i, i + CONCURRENCY);

      if (onProgress) {
        onProgress({
          active: true,
          total: totalEpisodes,
          current: Math.min(i + 1, totalEpisodes),
          currentTitle: data.nome,
          stage: `Obtendo links dos episódios ${i + 1}–${Math.min(i + batch.length, totalEpisodes)} de ${totalEpisodes}...`,
        });
      }

      // Obtenção dos links em paralelo respeitando a ordem do array
      const preparedBatch = await Promise.all(batch.map(async (item, batchIdx) => {
        const itemIndex = i + batchIdx;
        const epNum = item.episode.number;
        const seasonNum = item.seasonNum;
        const epTitle = item.episode.title || `Episódio ${epNum}`;

        let videoUrl = '';
        let epData: MaxPlusEpisodeResult | null = null;

        // Buscar link direto do MP4 via fetchEpisode com timeout de 5s
        if (item.episode.link) {
          try {
            const fetchPromise = fetchEpisode(item.episode.link);
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
            epData = await Promise.race([fetchPromise, timeoutPromise]);
            videoUrl = epData?.video || '';
          } catch (epErr) {
            console.warn(`Aviso ao obter link do episódio T${seasonNum}E${epNum}:`, epErr);
          }
        }

        const epVideo = epData?.video || videoUrl || '';
        const isEpLegendado = Boolean(
          (epVideo && epVideo.includes('LEG')) ||
          (epVideo && (epVideo.toLowerCase().includes('leg.mp4') || epVideo.toLowerCase().includes('_leg')))
        );
        const epIdioma = epData?.idioma || (epVideo && isEpLegendado ? 'Legendado' : 'Dublado') || 'Dublado';

        return {
          itemIndex,
          epNum,
          seasonNum,
          epTitle,
          videoUrl,
          epIdioma,
        };
      }));

      // Separar novos episódios (para createRowsBatch) e existentes (para update em paralelo)
      const toCreate: { epKey: string; payload: Record<string, unknown>; seasonNum: number; epNum: number }[] = [];
      const toUpdate: { id: string; payload: Record<string, unknown>; seasonNum: number; epNum: number }[] = [];

      for (const prep of preparedBatch) {
        const { epNum, seasonNum, epTitle, videoUrl, epIdioma } = prep;
        const epKey = `${seasonNum}_${epNum}`;
        const existingEp = existingEpisodesMap.get(epKey) || null;

        if (existingEp && existingEp.id) {
          const rawEpUpdate: Record<string, unknown> = {
            Nome: data.nome,
            Serie: data.nome,
            Temporada: seasonNum,
            'Episódio': epNum,
            Link: this.pick(videoUrl, existingEp.Link || existingEp.link),
            Idioma: this.pick(epIdioma, existingEp.Idioma || existingEp.idioma) || epIdioma || 'Dublado',
            Sinopse: this.pick(epTitle, existingEp.Sinopse || existingEp.sinopse),
          };

          const conteudoLink = existingEp.Conteudo;
          const linkVazio = !conteudoLink || (Array.isArray(conteudoLink) && conteudoLink.length === 0);
          if (linkVazio && serieId) {
            rawEpUpdate.Conteudo = [serieId];
          }

          const mappedEpUpdate = episodiosKeys.length > 0
            ? mapToDatabaseKeys(rawEpUpdate, episodiosKeys)
            : rawEpUpdate;

          toUpdate.push({ id: String(existingEp.id), payload: mappedEpUpdate, seasonNum, epNum });
        } else {
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

          toCreate.push({ epKey, payload: mappedEpPayload, seasonNum, epNum });
        }
      }

      if (onProgress) {
        const lastPrep = preparedBatch[preparedBatch.length - 1];
        onProgress({
          active: true,
          total: totalEpisodes,
          current: Math.min(i + preparedBatch.length, totalEpisodes),
          currentTitle: `${data.nome} - T${lastPrep.seasonNum}E${lastPrep.epNum}: ${lastPrep.epTitle}`,
          stage: `Salvando lote no Baserow (${Math.min(i + preparedBatch.length, totalEpisodes)}/${totalEpisodes})...`,
        });
      }

      // Inserção em lote (1 única requisição HTTP preserva ordem estrita 1, 2, 3...)
      if (toCreate.length > 0) {
        try {
          const createdRows = await this.baserowService.createRowsBatch(
            this.episodiosTableId,
            toCreate.map(c => c.payload)
          );
          toCreate.forEach((entry, idx) => {
            if (createdRows[idx]) {
              existingEpisodesMap.set(entry.epKey, createdRows[idx]);
            }
          });
          createdEpisodesCount += createdRows.length;
          importedCount += createdRows.length;
        } catch (batchErr) {
          console.warn('⚠️ [MaxPlus] createRowsBatch falhou, fazendo fallback sequencial:', batchErr);
          for (const entry of toCreate) {
            try {
              const createdEp = await this.baserowService.createRow(this.episodiosTableId, entry.payload);
              if (createdEp) {
                existingEpisodesMap.set(entry.epKey, createdEp);
              }
              createdEpisodesCount++;
              importedCount++;
            } catch (epErr) {
              console.error(`Erro ao salvar episódio T${entry.seasonNum}E${entry.epNum}:`, epErr);
            }
          }
        }
      }

      // Atualizações de episódios existentes em paralelo
      if (toUpdate.length > 0) {
        await Promise.all(toUpdate.map(async (upd) => {
          try {
            await this.baserowService.updateRow(this.episodiosTableId, upd.id, upd.payload);
            updatedEpisodesCount++;
            importedCount++;
          } catch (updErr) {
            console.error(`Erro ao atualizar episódio T${upd.seasonNum}E${upd.epNum}:`, updErr);
          }
        }));
      }
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
   * Importa múltiplos itens de catálogo em lote (Batch) com pré-carregamento paralelo
   */
  async importBatch(
    items: MaxPlusCatalogItem[],
    onProgress?: (progress: ImportProgress) => void
  ): Promise<{ succeeded: number; failed: number; succeededTitles: string[] }> {
    let succeeded = 0;
    let failed = 0;
    const succeededTitles: string[] = [];
    const total = items.length;

    // Pré-carregamento paralelo de detalhes (janela de 3 itens à frente)
    const PREFETCH_AHEAD = 3;
    const detailsPromises = new Map<number, Promise<MaxPlusContentDetails>>();
    const getDetailsWithPrefetch = (idx: number): Promise<MaxPlusContentDetails> => {
      const existing = detailsPromises.get(idx);
      if (existing) return existing;
      const item = items[idx];
      const p = (async () => {
        try {
          return await fetchDetails(item.link);
        } catch (initialErr) {
          console.warn(`[MaxPlus] Primeira tentativa de obter detalhes falhou para '${item.nome}', tentando novamente em 1s...`, initialErr);
          await new Promise((r) => setTimeout(r, 1000));
          return await fetchDetails(item.link);
        }
      })();
      detailsPromises.set(idx, p);
      return p;
    };

    for (let i = 0; i < total; i++) {
      const item = items[i];

      // Dispara prefetch dos próximos itens em paralelo enquanto importa o atual
      for (let ahead = 1; ahead <= PREFETCH_AHEAD && i + ahead < total; ahead++) {
        getDetailsWithPrefetch(i + ahead);
      }

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
        const details = await getDetailsWithPrefetch(i);
        detailsPromises.delete(i);

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
    }

    return { succeeded, failed, succeededTitles };
  }
}
