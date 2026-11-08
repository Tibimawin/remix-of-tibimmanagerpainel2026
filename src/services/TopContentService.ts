import { makeProxyRequest } from '@/utils/proxyRequest';
import { logger } from '@/utils/logger';

export interface TopContentItem {
  id: string | number;
  nome: string;
  capa: string | null;
  views: number;
  categoria: string;
  tipo: string;
  imdb?: string | number;
  ano?: string | number;
  rank: number;
}

export interface TopContentMetrics {
  items: TopContentItem[];
  totalViews: number;
  averageViews: number;
  topItem: TopContentItem | null;
  totalCatalogCount: number;
}

/**
 * Extrai a URL da capa a partir de campos variados do Baserow
 */
export function extractContentCover(item: any): string | null {
  if (!item) return null;

  const raw =
    item.Capa ??
    item.capa ??
    item['Capa de fundo'] ??
    item.CapaDeFundo ??
    item.Poster ??
    item.poster_path ??
    item.Banner ??
    item.banner ??
    item.Imagem ??
    item.imagem;

  if (!raw) return null;

  // Se for string direta
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image')) {
      return trimmed;
    }
    // Se for caminho relativo
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  // Se for array de arquivos do Baserow [{ url: "...", thumbnails: { ... } }]
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === 'string') return first.trim();
    if (first && typeof first === 'object') {
      if (first.url && typeof first.url === 'string') return first.url;
      if (first.thumbnails?.card_cover?.url) return first.thumbnails.card_cover.url;
      if (first.thumbnails?.small?.url) return first.thumbnails.small.url;
    }
  }

  return null;
}

/**
 * Extrai o número de visualizações de campos variados do Baserow
 */
export function extractContentViews(item: any): number {
  if (!item) return 0;

  const val =
    item.Visualizações ??
    item.visualizacoes ??
    item.Visualizacoes ??
    item['Visualização'] ??
    item.Views ??
    item.views ??
    item.Acessos ??
    item.acessos ??
    item.Visualizacao;

  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Math.max(0, Math.round(val));
  }

  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) return 0;
    const parsed = parseInt(clean, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Extrai o título ou nome do conteúdo
 */
export function extractContentTitle(item: any): string {
  if (!item) return 'Conteúdo sem título';

  const val =
    item.Nome ??
    item.nome ??
    item.Titulo ??
    item.titulo ??
    item.Title ??
    item.title ??
    item.Name;

  if (typeof val === 'string' && val.trim()) {
    return val.trim();
  }

  return `Conteúdo #${item.id || 'N/A'}`;
}

/**
 * Extrai a categoria do conteúdo
 */
export function extractContentCategory(item: any): string {
  if (!item) return 'Geral';

  const val =
    item.Categoria ??
    item.categoria ??
    item.Genero ??
    item.genero ??
    item.Genre ??
    item.Categorias;

  if (Array.isArray(val)) {
    return val
      .map(v => (typeof v === 'object' && v?.value ? v.value : String(v)))
      .filter(Boolean)
      .join(', ') || 'Geral';
  }

  if (typeof val === 'object' && val !== null) {
    if (val.value) return String(val.value);
    if (val.name) return String(val.name);
  }

  if (typeof val === 'string' && val.trim()) {
    return val.trim();
  }

  return 'Geral';
}

/**
 * Extrai o tipo do conteúdo (Filme, Série, etc.)
 */
export function extractContentType(item: any): string {
  if (!item) return 'Filme';

  const val = item.Tipo ?? item.tipo ?? item.Type ?? item.type;

  if (typeof val === 'object' && val !== null && val.value) {
    return String(val.value);
  }

  if (typeof val === 'string' && val.trim()) {
    return val.trim();
  }

  return 'Filme';
}

/**
 * Extrai o ano ou data de lançamento
 */
export function extractContentYear(item: any): string | undefined {
  if (!item) return undefined;

  const val = item.Ano ?? item.ano ?? item['Data de Lançamento'] ?? item.DataLancamento ?? item.Year;
  if (!val) return undefined;

  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    const match = val.match(/\b(19\d\d|20\d\d)\b/);
    if (match) return match[1];
    return val.slice(0, 10);
  }

  return undefined;
}

/**
 * Extrai a nota IMDb / Avaliação
 */
export function extractContentRating(item: any): string | undefined {
  if (!item) return undefined;

  const val = item.Imdb ?? item.imdb ?? item.IMDB ?? item.Nota ?? item.nota ?? item.Rating;
  if (!val) return undefined;

  if (typeof val === 'number') return val.toFixed(1);
  if (typeof val === 'string') {
    const clean = val.trim();
    if (clean) return clean;
  }

  return undefined;
}

export const TopContentService = {
  /**
   * Processa uma lista bruta de conteúdos e calcula o ranking Top 20 (ou Top 10)
   */
  processTopContents(rawItems: any[], appId?: string | null, limit: number = 20): TopContentMetrics {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return {
        items: [],
        totalViews: 0,
        averageViews: 0,
        topItem: null,
        totalCatalogCount: 0
      };
    }

    // 1. Filtrar por AppId se houver coluna AppId ou app_id em algum registro
    let itemsToProcess = rawItems;
    if (appId && appId.trim()) {
      const targetAppId = appId.trim().toLowerCase();
      const hasAppIdColumn = rawItems.some(i => {
        const itemAppId = i.AppId ?? i.app_id ?? i.AppID ?? i.Aplicativo;
        return itemAppId !== undefined && itemAppId !== null && String(itemAppId).trim() !== '';
      });

      if (hasAppIdColumn) {
        const matching = rawItems.filter(i => {
          const itemAppId = String(i.AppId ?? i.app_id ?? i.AppID ?? i.Aplicativo ?? '').trim().toLowerCase();
          return itemAppId === targetAppId;
        });
        if (matching.length > 0) {
          itemsToProcess = matching;
        }
      }
    }

    // 2. Mapear cada registro para nosso formato padronizado
    const mappedItems: TopContentItem[] = itemsToProcess.map((item, index) => {
      return {
        id: item.id ?? index,
        nome: extractContentTitle(item),
        capa: extractContentCover(item),
        views: extractContentViews(item),
        categoria: extractContentCategory(item),
        tipo: extractContentType(item),
        ano: extractContentYear(item),
        imdb: extractContentRating(item),
        rank: 0
      };
    });

    // 3. Ordenar decrescente pelo número de visualizações
    // Se houver empate ou views = 0, mantém ordem secundária pelo ID
    mappedItems.sort((a, b) => {
      if (b.views !== a.views) {
        return b.views - a.views;
      }
      return Number(b.id) - Number(a.id);
    });

    // 4. Selecionar o limite solicitado (ex: Top 20 ou Top 10)
    const topItems = mappedItems.slice(0, limit).map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    // 5. Cálculos estatísticos
    const totalViews = topItems.reduce((acc, curr) => acc + curr.views, 0);
    const averageViews = topItems.length > 0 ? Math.round(totalViews / topItems.length) : 0;
    const topItem = topItems.length > 0 ? topItems[0] : null;

    return {
      items: topItems,
      totalViews,
      averageViews,
      topItem,
      totalCatalogCount: itemsToProcess.length
    };
  },

  /**
   * Busca conteúdos diretamente via Baserow usando o token e URL configurados
   */
  async fetchConteudosFromBaserow(
    tableId: string,
    apiToken: string,
    baseUrl: string,
    maxRecords: number = 200
  ): Promise<any[]> {
    if (!tableId || !apiToken) {
      return [];
    }

    try {
      const cleanBaseUrl = (baseUrl || 'https://api.baserow.io').replace(/\/+$/, '');
      const url = `${cleanBaseUrl}/api/database/rows/table/${tableId}/?user_field_names=true&size=${Math.min(maxRecords, 200)}`;

      logger.debug(`[TopContentService] Buscando conteúdos da tabela ${tableId}...`);

      const response = await makeProxyRequest({
        url,
        method: 'GET',
        token: apiToken
      });

      if (!response.ok) {
        throw new Error(response.error || `Erro ao consultar conteúdos do Baserow (Status ${response.status})`);
      }

      const results = response.data?.results;
      if (Array.isArray(results)) {
        return results;
      }
      return [];
    } catch (err) {
      logger.error('[TopContentService] Falha ao carregar conteúdos:', err);
      throw err;
    }
  }
};
