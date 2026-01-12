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
}

export const tmdbService = new TmdbService();
