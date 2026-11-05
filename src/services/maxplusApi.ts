import { upgradeToHighResTmdbImage } from '@/utils/imageQuality';

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

const WORKING_VERCEL_ALIAS = 'https://tibimmanagerpainel2026-git-main-apktibim-1235s-projects.vercel.app';

/**
 * Executa requisição para a API MaxPlus com múltiplas camadas de resiliência:
 * 1. Tenta proxy local (/api/maxplus-proxy ou /api/maxplus) - imune a CORS, Brave Shields e extensões.
 * 2. Tenta upstream direto (https://api-tibimmanagerpainel.vercel.app/api/maxplus) com credentials: 'omit'.
 * 3. Tenta alias Vercel (https://.../api/maxplus-proxy).
 * 4. Inclui retentativa automática (retry) em caso de falha transitória de rede.
 */
async function executeMaxPlusRequest<T = any>(params: Record<string, string>): Promise<T> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  const queryString = searchParams.toString();

  // Candidatos de URL em ordem de resiliência
  const candidates: string[] = [
    // 1. Proxy do mesmo host (Zero CORS, zero conflito com extensões)
    `/api/maxplus-proxy?${queryString}`,
    `/api/maxplus?${queryString}`,
    // 2. Upstream direto
    `${MAXPLUS_API_BASE}?${queryString}`,
    // 3. Proxy na Vercel pública
    `${WORKING_VERCEL_ALIAS}/api/maxplus-proxy?${queryString}`,
  ];

  let lastError: unknown = null;

  for (let c = 0; c < candidates.length; c++) {
    const candidateUrl = candidates[c];
    const isDirectUpstream = candidateUrl.startsWith(MAXPLUS_API_BASE);
    const maxTries = isDirectUpstream ? 2 : 1;

    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const response = await fetch(candidateUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // 🛡️ CRÍTICO: 'omit' impede que extensões (ex: api-sniffer) ou o browser enviem credenciais
          // que conflitem com o header 'Access-Control-Allow-Origin: *', gerando 'TypeError: Failed to fetch'
          credentials: 'omit',
          mode: 'cors',
          cache: 'no-store',
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const json = await response.json();
          return json as T;
        }

        // Se deu 404 no endpoint local inicial, pula rapidamente para o próximo candidato
        if (response.status === 404 && !isDirectUpstream) {
          break;
        }

        lastError = new Error(`Servidor retornou status HTTP ${response.status}`);
      } catch (err: any) {
        lastError = err;
        if (attempt < maxTries) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }
  }

  const errorMsg = lastError instanceof Error ? lastError.message : 'Falha ao conectar à API MaxPlus';
  console.error('❌ [MaxPlusApi] Falha em todos os endpoints candidatos:', errorMsg);
  throw new Error(errorMsg);
}

/**
 * 1. fetchCatalog: busca lista de itens por categoria ou url
 */
export async function fetchCatalog(categoryUrl: string): Promise<MaxPlusCatalogItem[]> {
  try {
    const data = await executeMaxPlusRequest<MaxPlusCatalogItem[]>({ url: categoryUrl });

    if (!Array.isArray(data)) {
      console.warn('Resposta do catálogo não é um array:', data);
      return [];
    }

    return data.map((item) => ({
      ...item,
      imagem: upgradeToHighResTmdbImage(item.imagem),
    }));
  } catch (error: unknown) {
    console.error('Erro em fetchCatalog:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao conectar à API MaxPlus';
    throw new Error(msg);
  }
}

/**
 * 2. fetchDetails: busca detalhes completos do conteúdo (filme ou série)
 */
export async function fetchDetails(contentUrl: string): Promise<MaxPlusContentDetails> {
  try {
    const cleanUrl = String(contentUrl || '').trim();
    if (!cleanUrl) {
      throw new Error('URL de conteúdo inválida ou vazia');
    }

    const data = await executeMaxPlusRequest<MaxPlusContentDetails>({ id: cleanUrl });

    if (data && typeof data === 'object') {
      data.imagem = upgradeToHighResTmdbImage(data.imagem);
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
  try {
    const cleanUrl = String(episodeUrl || '').trim();
    if (!cleanUrl) {
      throw new Error('URL de episódio inválida ou vazia');
    }

    const data = await executeMaxPlusRequest<MaxPlusEpisodeResult>({ ep: cleanUrl });
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
export async function searchMaxPlus(term: string): Promise<MaxPlusCatalogItem[]> {
  const searchUrl = `http://apps.zynner.site/pesquisar-2/?q=${encodeURIComponent(term)}`;
  return fetchCatalog(searchUrl);
}
