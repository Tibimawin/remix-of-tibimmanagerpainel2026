const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkNjAxZGY4NWE5ODg2OTRjMGU5ZDE3YzM3ZmMwYmJmZSIsIm5iZiI6MTcyNjUyNjk4OC43NDk1NDQsInN1YiI6IjY1ZmY2MDNlMzc4MDYyMDE3YzM5ZjQ3YiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.YOjsoQ-yyANqpVA0dq99GwNYdUCZ3H9LITQNAyZegxI';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export interface ContentData {
  nome: string;
  capa: string;
  capa_fundo: string;
  views: number;
  idioma: 'DUB' | 'LEG';
  tipo: 'Filme' | 'Série' | 'TV';
  sinopse: string;
  categoria: string;
  temporadas?: number;
  imdb: string;
  data_lancamento: string;
  duracao: string;
  link: string;
}

class ContentSearchService {
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${TMDB_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${TMDB_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`TMDb API error: ${response.statusText}`);
    }

    return response.json();
  }

  async searchByNameOrId(query: string): Promise<ContentData | null> {
    try {
      console.log('Buscando no TMDb:', query);

      // Verificar se é um ID numérico
      const isNumericId = /^\d+$/.test(query.trim());
      
      let movieData = null;
      let tvData = null;

      if (isNumericId) {
        // Buscar por ID específico
        try {
          movieData = await this.makeRequest(`/movie/${query}?language=pt-BR`);
        } catch (error) {
          console.log('Não encontrado como filme, tentando como série...');
        }
        
        if (!movieData) {
          try {
            tvData = await this.makeRequest(`/tv/${query}?language=pt-BR`);
          } catch (error) {
            console.log('Não encontrado como série');
          }
        }
      } else {
        // Buscar por nome - tentar filmes primeiro
        const movieResults = await this.makeRequest<{ results: any[] }>(
          `/search/movie?query=${encodeURIComponent(query)}&language=pt-BR&page=1`
        );

        if (movieResults.results && movieResults.results.length > 0) {
          const movieId = movieResults.results[0].id;
          movieData = await this.makeRequest(`/movie/${movieId}?language=pt-BR`);
        }

        // Se não encontrou filme, tentar série
        if (!movieData) {
          const tvResults = await this.makeRequest<{ results: any[] }>(
            `/search/tv?query=${encodeURIComponent(query)}&language=pt-BR&page=1`
          );

          if (tvResults.results && tvResults.results.length > 0) {
            const tvId = tvResults.results[0].id;
            tvData = await this.makeRequest(`/tv/${tvId}?language=pt-BR`);
          }
        }
      }

      const data = movieData || tvData;
      if (!data) {
        console.log('Conteúdo não encontrado');
        return null;
      }

      // Montar objeto com dados formatados
      const contentData: ContentData = {
        nome: data.title || data.name || '',
        capa: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : '',
        capa_fundo: data.backdrop_path ? `${IMAGE_BASE_URL}${data.backdrop_path}` : '',
        views: 0,
        idioma: 'DUB',
        tipo: movieData ? 'Filme' : 'Série',
        sinopse: data.overview || '',
        categoria: data.genres?.map((g: any) => g.name).join(', ') || '',
        imdb: data.vote_average ? `${data.vote_average.toFixed(1)}/10` : '',
        data_lancamento: data.release_date || data.first_air_date || '',
        duracao: this.formatDuration(data.runtime || data.episode_run_time?.[0] || 0),
        link: data.homepage || '',
      };

      // Se for série, adicionar temporadas
      if (tvData && data.number_of_seasons) {
        contentData.temporadas = data.number_of_seasons;
      }

      console.log('Dados encontrados:', contentData);
      return contentData;

    } catch (error) {
      console.error('Erro ao buscar no TMDb:', error);
      throw error;
    }
  }

  private formatDuration(minutes: number): string {
    if (!minutes) return '';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  }
}

export const contentSearchService = new ContentSearchService();
