import { TMDBSearchResult, TMDBDetails } from '@/types/importacao';

export interface TmdbData {
  id: number;
  imdb_id?: string;
  nome: string;
  linkCapa?: string;
  sinopse?: string;
  categoria?: string;
  seasons?: { name: string; episode_count: number; season_number: number }[];
}

const API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkNjAxZGY4NWE5ODg2OTRjMGU5ZDE3YzM3ZmMwYmJmZSIsIm5iZiI6MTcyNjUyNjk4OC43NDk1NDQsInN1YiI6IjY1ZmY2MDNlMzc4MDYyMDE3YzM5ZjQ3YiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.YOjsoQ-yyANqpVA0dq99GwNYdUCZ3H9LITQNAyZegxI';
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IMAGE_BASE_URL_HD = 'https://image.tmdb.org/t/p/w780';
const IMAGE_BASE_URL_ORIGINAL = 'https://image.tmdb.org/t/p/original';

class TmdbService {
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('TMDB Request URL:', url);

    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
    };

    console.log('TMDB Request options:', options);

    const response = await fetch(url, options);
    console.log('TMDB Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('TMDB API Error:', errorData);
      throw new Error(`TMDB API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('TMDB Response data:', data);
    return data;
  }

  async search(query: string, type: 'movie' | 'tv'): Promise<TmdbData | null> {
    try {
      console.log(`Searching TMDB for: "${query}" as ${type}`);

      const searchResults = await this.makeRequest<{ results: any[] }>(
        `/search/${type}?query=${encodeURIComponent(query)}&language=pt-BR&page=1`
      );

      console.log('Search results:', searchResults);

      if (!searchResults.results || searchResults.results.length === 0) {
        console.warn(`No TMDB results found for query: "${query}"`);
        return null;
      }

      const firstResult = searchResults.results[0];
      console.log('First result:', firstResult);

      const details = await this.makeRequest<any>(`/${type}/${firstResult.id}?language=pt-BR`);
      console.log('Details:', details);

      const tmdbData: TmdbData = {
        id: details.id,
        imdb_id: details.imdb_id,
        nome: type === 'tv' ? details.name : details.title,
        linkCapa: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : undefined,
        sinopse: details.overview || 'Sinopse não encontrada.',
        categoria: details.genres?.map((g: any) => g.name).join(', ') || '',
        seasons: type === 'tv'
          ? details.seasons?.filter((s: any) => s.name !== 'Especiais' && s.episode_count > 0)
          : undefined,
      };

      console.log('Final TMDB data:', tmdbData);
      return tmdbData;

    } catch (error) {
      console.error('Error fetching data from TMDB:', error);
      return null;
    }
  }

  // 🆕 MÉTODOS PARA IMPORTAÇÃO ZYNNER

  /**
   * Busca multi-search (filmes e séries juntos)
   */
  async searchMulti(query: string): Promise<TMDBSearchResult[]> {
    console.log('🔍 Multi-search TMDB:', query);

    const data = await this.makeRequest<{ results: any[] }>(
      `/search/multi?query=${encodeURIComponent(query)}&language=pt-BR&page=1`
    );

    // Filtrar apenas filmes e séries
    const results = (data.results || []).filter((item: any) =>
      item.media_type === 'movie' || item.media_type === 'tv'
    );

    console.log(`✅ Encontrados ${results.length} resultados`);
    return results;
  }

  /**
   * Busca detalhes completos de filme
   */
  async getMovieDetails(movieId: number): Promise<TMDBDetails> {
    console.log('🎬 Detalhes do filme:', movieId);

    const data = await this.makeRequest<any>(
      `/movie/${movieId}?language=pt-BR&append_to_response=external_ids`
    );

    return data;
  }

  /**
   * Busca detalhes completos de série
   */
  async getTVDetails(tvId: number): Promise<TMDBDetails> {
    console.log('📺 Detalhes da série:', tvId);

    const data = await this.makeRequest<any>(
      `/tv/${tvId}?language=pt-BR&append_to_response=external_ids`
    );

    // Filtrar temporadas especiais
    if (data.seasons) {
      data.seasons = data.seasons.filter((season: any) => season.season_number > 0);
    }

    return data;
  }

  /**
   * Busca detalhes baseado no tipo
   */
  async getDetails(id: number, mediaType: 'movie' | 'tv'): Promise<TMDBDetails> {
    if (mediaType === 'movie') {
      return this.getMovieDetails(id);
    } else {
      return this.getTVDetails(id);
    }
  }

  /**
   * Gera URL da imagem em diferentes tamanhos
   */
  getImageUrl(path: string | null, size: 'w200' | 'w500' | 'w780' | 'original' = 'w780'): string {
    if (!path) return '/placeholder-poster.jpg';

    const baseUrls = {
      w200: 'https://image.tmdb.org/t/p/w200',
      w500: IMAGE_BASE_URL,
      w780: IMAGE_BASE_URL_HD,
      original: IMAGE_BASE_URL_ORIGINAL,
    };

    return `${baseUrls[size]}${path}`;
  }

  /**
   * Formata data para DD/MM/YYYY
   */
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';

    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  /**
   * Formata duração para "XX min"
   */
  formatRuntime(runtime: number | undefined | number[]): string {
    if (!runtime) return '';

    // Para séries, pode ser um array
    if (Array.isArray(runtime)) {
      runtime = runtime[0] || 0;
    }

    return `${runtime} min`;
  }

  /**
   * Extrai gêneros como string
   */
  getGenres(genres: { id: number; name: string }[] = []): string {
    if (!genres || genres.length === 0) return '';
    return genres.map(g => g.name).join(', ');
  }

  /**
   * Converte nota para string
   */
  formatVoteAverage(vote: number): string {
    return vote.toFixed(1);
  }

  /**
   * Enriquecimento completo de metadados para gravação no Baserow:
   * TMDB ID, Trailer, Ano, Data de Lançamento, Capa de fundo, Imdb
   */
  async getEnrichedDataForContent(
    title: string,
    type: 'movie' | 'tv' = 'movie',
    hintUrlOrText?: string
  ): Promise<TmdbEnrichedData | null> {
    try {
      let matchedId: number | null = null;
      let matchedType: 'movie' | 'tv' = type;
      let imdbId: string = '';

      // 1. Tenta extrair IMDb ID (ex: tt36647890) de URLs ou textos fornecidos
      const textToScan = `${title} ${hintUrlOrText || ''}`;
      const imdbMatch = textToScan.match(/(tt\d{6,10})/i);
      if (imdbMatch && imdbMatch[1]) {
        imdbId = imdbMatch[1].toLowerCase();
        try {
          const findData = await this.makeRequest<{
            movie_results?: Array<{ id: number }>;
            tv_results?: Array<{ id: number }>;
          }>(`/find/${imdbId}?external_source=imdb_id&language=pt-BR`);
          if (findData.movie_results && findData.movie_results.length > 0) {
            matchedId = findData.movie_results[0].id;
            matchedType = 'movie';
          } else if (findData.tv_results && findData.tv_results.length > 0) {
            matchedId = findData.tv_results[0].id;
            matchedType = 'tv';
          }
        } catch (findErr) {
          console.warn(`[TMDB] Falha no find por IMDb ${imdbId}:`, findErr);
        }
      }

      // 2. Se não achou por IMDb, busca por título limpo
      if (!matchedId) {
        const cleanTitle = title
          .replace(/\((19|20)\d{2}\)/g, '')
          .replace(/\[.*?\]/g, '')
          .replace(/\b(dublado|legendado|completo|hd|fhd|4k|filme|serie|série|temporada)\b/gi, '')
          .trim();

        const searchUrl = `/search/${matchedType}?query=${encodeURIComponent(cleanTitle || title)}&language=pt-BR&page=1`;
        const searchResults = await this.makeRequest<{ results: Array<{ id: number }> }>(searchUrl);

        if (searchResults.results && searchResults.results.length > 0) {
          matchedId = searchResults.results[0].id;
        } else {
          // Tenta multi-search sem language se nada foi retornado
          const multi = await this.makeRequest<{ results: Array<{ id: number; media_type?: string }> }>(
            `/search/multi?query=${encodeURIComponent(cleanTitle || title)}&page=1`
          );
          const firstValid = (multi.results || []).find(
            (r) => r.media_type === 'movie' || r.media_type === 'tv'
          );
          if (firstValid) {
            matchedId = firstValid.id;
            matchedType = firstValid.media_type as 'movie' | 'tv';
          }
        }
      }

      if (!matchedId) {
        console.warn(`[TMDB] Nenhum resultado encontrado para "${title}"`);
        return null;
      }

      // 3. Obter detalhes completos com vídeos e external_ids
      const details = await this.makeRequest<{
        id: number;
        release_date?: string;
        first_air_date?: string;
        backdrop_path?: string;
        poster_path?: string;
        overview?: string;
        imdb_id?: string;
        vote_average?: number;
        external_ids?: { imdb_id?: string };
        videos?: { results?: Array<{ site?: string; type?: string; key?: string }> };
      }>(
        `/${matchedType}/${matchedId}?language=pt-BR&append_to_response=external_ids,videos`
      );

      // Extrai data e ano
      const dataDeLancamento = details.release_date || details.first_air_date || '';
      const ano = dataDeLancamento ? dataDeLancamento.slice(0, 4) : '';

      // Extrai Capa de fundo (Backdrop)
      const capaDeFundo = details.backdrop_path 
        ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` 
        : '';

      // Extrai Avaliação (Nota numérica, ex: "7.5" ou "8.0") para a coluna Imdb
      let avaliacaoNota = '';
      if (typeof details.vote_average === 'number' && details.vote_average > 0) {
        avaliacaoNota = details.vote_average.toFixed(1);
      }

      // Extrai Trailer (procura trailer no YouTube)
      let trailerUrl = '';
      let videosList = details.videos?.results || [];

      // Se não encontrou vídeos em pt-BR, busca em en-US
      if (videosList.length === 0) {
        try {
          const fallbackVideos = await this.makeRequest<{ results: Array<{ site?: string; type?: string; key?: string }> }>(
            `/${matchedType}/${matchedId}/videos?language=en-US`
          );
          videosList = fallbackVideos.results || [];
        } catch {
          // ignora
        }
      }

      if (videosList.length > 0) {
        const ytTrailer = 
          videosList.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
          videosList.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ||
          videosList.find((v) => v.site === 'YouTube');

        if (ytTrailer?.key) {
          trailerUrl = `https://www.youtube.com/watch?v=${ytTrailer.key}`;
        }
      }

      return {
        tmdbId: String(details.id),
        trailer: trailerUrl,
        ano,
        dataDeLancamento,
        capaDeFundo,
        imdb: avaliacaoNota,
        poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : undefined,
        sinopse: details.overview || undefined,
      };
    } catch (err) {
      console.error(`[TMDB] Erro ao obter metadados enriquecidos para "${title}":`, err);
      return null;
    }
  }
}

export interface TmdbEnrichedData {
  tmdbId: string;
  trailer: string;
  ano: string;
  dataDeLancamento: string;
  capaDeFundo: string;
  imdb: string;
  poster?: string;
  sinopse?: string;
}

export const tmdbService = new TmdbService();
