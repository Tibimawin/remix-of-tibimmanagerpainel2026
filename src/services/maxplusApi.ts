import { upgradeToHighResTmdbImage, getOptimizedCardImageUrl } from '@/utils/imageQuality';
import { isDemoSessionActive, DEMO_MAXPLUS_CATALOG } from './BaserowDemoData';

/**
 * Serviço de integração com a API MaxPlus
 * API Base: https://api-tibimmanagerpainel.vercel.app/api/maxplus
 * Catálogo Base: http://apps.zynner.site/
 */

export const MAXPLUS_API_BASE = 'https://api-tibimmanagerpainel.vercel.app/api/maxplus';
export const MAXPLUS_CATALOG_BASE = 'http://apps.zynner.site/';

export interface MaxPlusCatalogItem {
  nome: string;
  imagem: string;
  link: string;
  genres?: string;
}

export interface MaxPlusEpisodeDetail {
  number: number;
  link: string;
  title: string;
  season?: number;
}

export interface MaxPlusSeasonDetail {
  number: number;
  title: string;
  episodes: MaxPlusEpisodeDetail[];
}

export interface MaxPlusContentDetails {
  nome: string;
  imagem: string;
  sinopse: string;
  generos?: string;
  'generos-links'?: string[];
  video?: string | null;
  server_used?: string | null;
  estrelas?: string;
  total_seasons?: number;
  seasons_details?: MaxPlusSeasonDetail[];
  idioma?: string | null;
  link?: string;
}

export interface MaxPlusEpisodeResult {
  video: string;
  server_used?: string;
  player_url?: string;
  idioma?: string | null;
}

export interface MaxPlusCategory {
  name: string;
  url: string;
  badge?: string;
}

export const MAXPLUS_CATEGORIES: MaxPlusCategory[] = [
  { name: 'Destaques', url: 'http://apps.zynner.site/' },
  { name: 'Lançamentos', url: 'http://apps.zynner.site/genre/lancamentos/' },
  { name: 'Filmes', url: 'http://apps.zynner.site/movies/' },
  { name: 'Séries', url: 'http://apps.zynner.site/tvshows/' },
  { name: 'Em Alta', url: 'http://apps.zynner.site/genre/em-alta/' },
  { name: 'Ação', url: 'http://apps.zynner.site/genre/acao/' },
  { name: 'Aventura', url: 'http://apps.zynner.site/genre/aventura/' },
  { name: 'Animação', url: 'http://apps.zynner.site/genre/animacao/' },
  { name: 'Animes', url: 'http://apps.zynner.site/genre/animes/' },
  { name: 'Comédia', url: 'http://apps.zynner.site/genre/comedia/' },
  { name: 'Crime', url: 'http://apps.zynner.site/genre/crime/' },
  { name: 'Documentário', url: 'http://apps.zynner.site/genre/documentario/' },
  { name: 'Doramas', url: 'http://apps.zynner.site/genre/dorama/' },
  { name: 'Dorama Dublado', url: 'http://apps.zynner.site/genre/dorama-dublado/' },
  { name: 'Dorama Chinês', url: 'http://apps.zynner.site/genre/dorama-chines/' },
  { name: 'Dorama Coreano', url: 'http://apps.zynner.site/genre/dorama-coreano/' },
  { name: 'Dorama Tailandês', url: 'http://apps.zynner.site/genre/dorama-tailandes/' },
  { name: 'Dorama Taiwanês', url: 'http://apps.zynner.site/genre/dorama-taiwanes/' },
  { name: 'Dorama Singapurense', url: 'http://apps.zynner.site/genre/dorama-singapurense/' },
  { name: 'Dorama Japonês', url: 'http://apps.zynner.site/genre/dorama-japones/' },
  { name: 'Drama', url: 'http://apps.zynner.site/genre/drama/' },
  { name: 'Família', url: 'http://apps.zynner.site/genre/familia/' },
  { name: 'Fantasia', url: 'http://apps.zynner.site/genre/fantasia/' },
  { name: 'Faroeste', url: 'http://apps.zynner.site/genre/faroeste/' },
  { name: 'Ficção Científica', url: 'http://apps.zynner.site/genre/ficcao-cientifica/' },
  { name: 'Guerra', url: 'http://apps.zynner.site/genre/guerra/' },
  { name: 'História', url: 'http://apps.zynner.site/genre/historia/' },
  { name: 'Kids', url: 'http://apps.zynner.site/genre/kids/' },
  { name: 'Desenhos', url: 'http://apps.zynner.site/genre/desenhos/' },
  { name: 'Mistério', url: 'http://apps.zynner.site/genre/misterio/' },
  { name: 'Novelas', url: 'http://apps.zynner.site/genre/novelas/' },
  { name: 'Novelas Mexicanas', url: 'http://apps.zynner.site/genre/novelas-mexicanas/' },
  { name: 'Novelas Nacionais', url: 'http://apps.zynner.site/genre/novelas-nacionais/' },
  { name: 'Novelas Turcas', url: 'http://apps.zynner.site/genre/novelas-turcas/' },
  { name: 'Romance', url: 'http://apps.zynner.site/genre/romance/' },
  { name: 'Suspense', url: 'http://apps.zynner.site/genre/thriller/' },
  { name: 'Terror', url: 'http://apps.zynner.site/genre/terror/' },
  { name: 'Cinema TV', url: 'http://apps.zynner.site/genre/cinema-tv/' },
];

const WORKING_VERCEL_ALIAS = (typeof window !== 'undefined' && window.location.origin && !window.location.hostname.includes('lovable'))
  ? window.location.origin
  : (import.meta.env.VITE_VERCEL_PROXY_BASE || 'https://tibimmanagerpainel.shop');

const CATALOG_CACHE_TTL_MS = 10 * 60 * 1000;
const DETAILS_CACHE_TTL_MS = 15 * 60 * 1000;
const MAXPLUS_STORAGE_PREFIX = 'maxplus_cache_v1:';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();
const catalogMemoryIndex = new Map<string, MaxPlusCatalogItem>();

function indexCatalogItems(items: MaxPlusCatalogItem[]) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item?.link && item?.nome) {
      catalogMemoryIndex.set(item.link, item);
    }
  }
}

export function searchLocalCatalogMemory(term: string): MaxPlusCatalogItem[] {
  const clean = term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!clean || clean.length < 2) return [];

  const tokens = clean.split(/\s+/).filter(Boolean);
  const results: MaxPlusCatalogItem[] = [];

  for (const item of catalogMemoryIndex.values()) {
    const titleNorm = (item.nome || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const genreNorm = (item.genres || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (tokens.every((tk) => titleNorm.includes(tk) || genreNorm.includes(tk))) {
      results.push(item);
    }
  }
  return results;
}

function readCache<T>(key: string, ttlMs: number): T | null {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < ttlMs) {
    return mem.data as T;
  }
  try {
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem(`${MAXPLUS_STORAGE_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheEntry<T>;
        if (parsed && Date.now() - parsed.timestamp < ttlMs) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    }
  } catch {
    // noop
  }
  return null;
}

function writeCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`${MAXPLUS_STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    }
  } catch {
    // sessionStorage pode encher — memória segue funcionando
  }
}

/**
 * Executa requisição para a API MaxPlus com múltiplas camadas de resiliência,
 * cache, deduplicação e suporte a cancelamento via AbortSignal.
 */
async function executeMaxPlusRequest<T = any>(
  params: Record<string, string>,
  options?: { signal?: AbortSignal; skipHttpCache?: boolean }
): Promise<T> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  const queryString = searchParams.toString();

  // Candidatos de URL em ordem de resiliência
  const candidates: string[] = [
    // 1. Proxy do mesmo host (Zero CORS, CDN Vercel Edge cache)
    `/api/maxplus-proxy?${queryString}`,
    `/api/maxplus?${queryString}`,
    // 2. Upstream direto
    `${MAXPLUS_API_BASE}?${queryString}`,
    // 3. Proxy na Vercel pública
    `${WORKING_VERCEL_ALIAS}/api/maxplus-proxy?${queryString}`,
  ];

  let lastError: unknown = null;

  for (let c = 0; c < candidates.length; c++) {
    if (options?.signal?.aborted) {
      throw new DOMException('Requisição cancelada', 'AbortError');
    }

    const candidateUrl = candidates[c];
    const isDirectUpstream = candidateUrl.startsWith(MAXPLUS_API_BASE);
    const maxTries = isDirectUpstream ? 2 : 1;

    for (let attempt = 1; attempt <= maxTries; attempt++) {
      if (options?.signal?.aborted) {
        throw new DOMException('Requisição cancelada', 'AbortError');
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 24000);
      const onExternalAbort = () => controller.abort();
      options?.signal?.addEventListener('abort', onExternalAbort, { once: true });

      try {
        const response = await fetch(candidateUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'omit',
          mode: 'cors',
          cache: options?.skipHttpCache ? 'no-store' : 'default',
          signal: controller.signal,
        });

        clearTimeout(timeout);
        options?.signal?.removeEventListener('abort', onExternalAbort);

        if (response.ok) {
          const json = await response.json();
          return json as T;
        }

        // Se deu 404 no endpoint local inicial (ex: dev local sem API), pula rápido
        if (response.status === 404 && !isDirectUpstream) {
          break;
        }

        lastError = new Error(`Servidor retornou status HTTP ${response.status}`);
      } catch (err: any) {
        clearTimeout(timeout);
        options?.signal?.removeEventListener('abort', onExternalAbort);

        if (options?.signal?.aborted) {
          throw err;
        }
        lastError = err;
        if (attempt < maxTries) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }
  }

  const errorMsg = lastError instanceof Error ? lastError.message : 'Falha ao conectar à API MaxPlus';
  console.error('❌ [MaxPlusApi] Falha em todos os endpoints candidatos:', errorMsg);
  throw new Error(errorMsg);
}

/**
 * 1. fetchCatalog: busca lista de itens por categoria ou url (com cache instantâneo)
 */
export async function fetchCatalog(
  categoryUrl: string,
  options?: { signal?: AbortSignal; forceRefresh?: boolean }
): Promise<MaxPlusCatalogItem[]> {
  if (isDemoSessionActive()) {
    const demo = DEMO_MAXPLUS_CATALOG.map((item) => ({
      ...item,
      imagem: getOptimizedCardImageUrl(item.imagem),
    }));
    indexCatalogItems(demo);
    return demo;
  }

  const cacheKey = `catalog:${categoryUrl}`;
  if (!options?.forceRefresh) {
    const cached = readCache<MaxPlusCatalogItem[]>(cacheKey, CATALOG_CACHE_TTL_MS);
    if (cached) {
      indexCatalogItems(cached);
      return cached;
    }
  }

  const existingInFlight = inFlightRequests.get(cacheKey);
  if (existingInFlight && !options?.signal) {
    return existingInFlight;
  }

  const reqPromise = (async () => {
    try {
      const data = await executeMaxPlusRequest<MaxPlusCatalogItem[]>(
        { url: categoryUrl },
        { signal: options?.signal }
      );

      if (!Array.isArray(data)) {
        console.warn('Resposta do catálogo não é um array:', data);
        return [];
      }

      const normalized = data.map((item) => ({
        ...item,
        imagem: getOptimizedCardImageUrl(item.imagem),
      }));

      indexCatalogItems(normalized);
      writeCache(cacheKey, normalized);
      return normalized;
    } catch (error: unknown) {
      if ((error as any)?.name === 'AbortError') {
        throw error;
      }
      console.error('Erro em fetchCatalog:', error);
      const msg = error instanceof Error ? error.message : 'Erro ao conectar à API MaxPlus';
      throw new Error(msg);
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (!options?.signal) {
    inFlightRequests.set(cacheKey, reqPromise);
  }
  return reqPromise;
}

/**
 * 2. fetchDetails: busca detalhes completos do conteúdo (filme ou série) com cache
 */
export async function fetchDetails(contentUrl: string): Promise<MaxPlusContentDetails> {
  if (isDemoSessionActive() || String(contentUrl).startsWith('demo://')) {
    const found = DEMO_MAXPLUS_CATALOG.find(i => i.link === contentUrl) || DEMO_MAXPLUS_CATALOG[0];
    return {
      nome: found.nome,
      imagem: upgradeToHighResTmdbImage(found.imagem),
      sinopse: 'Esta é uma prévia demonstrativa simulada do conteúdo para avaliação no painel.',
      generos: found.genres,
      estrelas: '8.8',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      server_used: 'Demo Server (Simulado)',
      idioma: 'Dublado',
      total_seasons: 2,
      seasons_details: [
        {
          number: 1,
          title: 'Temporada 1',
          episodes: [
            { number: 1, title: 'Episódio 1 - Piloto', link: 'demo://ep/1', season: 1 },
            { number: 2, title: 'Episódio 2 - O Começo', link: 'demo://ep/2', season: 1 }
          ]
        }
      ]
    };
  }

  try {
    const cleanUrl = String(contentUrl || '').trim();
    if (!cleanUrl) {
      throw new Error('URL de conteúdo inválida ou vazia');
    }

    const cacheKey = `details:${cleanUrl}`;
    const cached = readCache<MaxPlusContentDetails>(cacheKey, DETAILS_CACHE_TTL_MS);
    if (cached) {
      return cached;
    }

    const data = await executeMaxPlusRequest<MaxPlusContentDetails>({ id: cleanUrl });

    if (data && typeof data === 'object') {
      data.imagem = upgradeToHighResTmdbImage(data.imagem);
      writeCache(cacheKey, data);
    }
    return data;
  } catch (error: unknown) {
    console.error('Erro em fetchDetails:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao carregar detalhes do conteúdo';
    throw new Error(msg);
  }
}

/**
 * 3. fetchEpisode: busca o link direto de vídeo MP4 do episódio
 */
export async function fetchEpisode(episodeUrl: string): Promise<MaxPlusEpisodeResult> {
  if (isDemoSessionActive() || String(episodeUrl).startsWith('demo://')) {
    return {
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      idioma: 'Dublado',
      server_used: 'Demo Video Player'
    };
  }

  try {
    const cleanUrl = String(episodeUrl || '').trim();
    if (!cleanUrl) {
      throw new Error('URL de episódio inválida ou vazia');
    }

    const data = await executeMaxPlusRequest<MaxPlusEpisodeResult>({ ep: cleanUrl }, { skipHttpCache: true });
    return data;
  } catch (error: unknown) {
    console.error('Erro em fetchEpisode:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao resolver link do episódio';
    throw new Error(msg);
  }
}

/**
 * Helper para buscar por termo de pesquisa
 */
export async function searchMaxPlus(
  term: string,
  options?: { signal?: AbortSignal }
): Promise<MaxPlusCatalogItem[]> {
  if (isDemoSessionActive()) {
    const t = term.toLowerCase().trim();
    const filtered = DEMO_MAXPLUS_CATALOG.filter(item =>
      item.nome.toLowerCase().includes(t) || (item.genres && item.genres.toLowerCase().includes(t))
    );
    return filtered.map((item) => ({
      ...item,
      imagem: getOptimizedCardImageUrl(item.imagem),
    }));
  }

  const searchUrl = `http://apps.zynner.site/pesquisar-2/?q=${encodeURIComponent(term)}`;
  return fetchCatalog(searchUrl, { signal: options?.signal });
}
