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

/**
 * 1. fetchCatalog: busca lista de itens por categoria ou url
 * GET https://api-tibimmanagerpainel.vercel.app/api/maxplus?url=${encodeURIComponent(categoryUrl)}
 */
export async function fetchCatalog(categoryUrl: string): Promise<MaxPlusCatalogItem[]> {
  try {
    const url = `${MAXPLUS_API_BASE}?url=${encodeURIComponent(categoryUrl)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao carregar catálogo: status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      console.warn('Resposta do catálogo não é um array:', data);
      return [];
    }

    return data;
  } catch (error: unknown) {
    console.error('Erro em fetchCatalog:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao conectar à API MaxPlus';
    throw new Error(msg);
  }
}

/**
 * 2. fetchDetails: busca detalhes completos do conteúdo (filme ou série)
 * GET https://api-tibimmanagerpainel.vercel.app/api/maxplus?id=${encodeURIComponent(contentUrl)}
 */
export async function fetchDetails(contentUrl: string): Promise<MaxPlusContentDetails> {
  try {
    const url = `${MAXPLUS_API_BASE}?id=${encodeURIComponent(contentUrl)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao obter detalhes: status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: unknown) {
    console.error('Erro em fetchDetails:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao carregar detalhes do conteúdo';
    throw new Error(msg);
  }
}

/**
 * 3. fetchEpisode: busca o link direto de vídeo MP4 do episódio
 * GET https://api-tibimmanagerpainel.vercel.app/api/maxplus?ep=${encodeURIComponent(episodeUrl)}
 */
export async function fetchEpisode(episodeUrl: string): Promise<MaxPlusEpisodeResult> {
  try {
    const url = `${MAXPLUS_API_BASE}?ep=${encodeURIComponent(episodeUrl)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao obter episódio: status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: unknown) {
    console.error('Erro em fetchEpisode:', error);
    const msg = error instanceof Error ? error.message : 'Erro ao resolver link do episódio';
    throw new Error(msg);
  }
}

/**
 * Helper para buscar por termo de pesquisa
 * GET https://api-tibimmanagerpainel.vercel.app/api/maxplus?url=${encodeURIComponent('http://apps.zynner.site/pesquisar-2/?q=' + termo)}
 */
export async function searchMaxPlus(term: string): Promise<MaxPlusCatalogItem[]> {
  const searchUrl = `http://apps.zynner.site/pesquisar-2/?q=${encodeURIComponent(term)}`;
  return fetchCatalog(searchUrl);
}
