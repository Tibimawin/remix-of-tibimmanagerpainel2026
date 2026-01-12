const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/maxplus-proxy`;

export interface MaxPlusContent {
  id: string;
  title: string;
  poster: string;
  type: 'movie' | 'series';
  category: string;
  url: string;
}

export interface MaxPlusDetails {
  id: string;
  title: string;
  poster: string;
  synopsis: string;
  genre: string;
  type: 'movie' | 'series';
  category: string;
  link?: string;
  seasons?: MaxPlusSeason[];
}

export interface MaxPlusSeason {
  season: number;
  episodes: MaxPlusEpisode[];
}

export interface MaxPlusEpisode {
  id: string;
  title: string;
  season: number;
  episode: number;
  link?: string;
}

export const CATEGORIES = [
  { name: 'Lançamentos', url: 'https://new.zynner.site/category/lancamentos/' },
  { name: 'Filmes', url: 'https://new.zynner.site/category/filmes/' },
  { name: 'Séries', url: 'https://new.zynner.site/category/series/' },
  { name: 'Ação', url: 'https://new.zynner.site/category/acao/' },
  { name: 'Comédia', url: 'https://new.zynner.site/category/comedia/' },
  { name: 'Drama', url: 'https://new.zynner.site/category/drama/' },
  { name: 'Terror', url: 'https://new.zynner.site/category/terror/' },
  { name: 'Animação', url: 'https://new.zynner.site/category/animacao/' },
];

class MaxPlusImportService {

  private async callEdgeFunction(action: string, params: any): Promise<any> {
    if (!SUPABASE_URL) {
      throw new Error('Configuração ausente: VITE_SUPABASE_URL. Defina a URL do Supabase para usar o proxy MaxPlus.');
    }

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, params }),
      });

      const rawText = await response.text();

      if (!response.ok) {
        let message = `Falha na requisição: ${response.status}`;
        try {
          const errJson = JSON.parse(rawText);
          if (errJson?.error) message += ` - ${errJson.error}`;
          if (errJson?.details) message += ` (${errJson.details})`;
        } catch {}
        console.error('MaxPlus Edge Function erro:', message);
        throw new Error(message);
      }

      // resposta OK
      try {
        return JSON.parse(rawText);
      } catch {
        // se não for JSON válido
        throw new Error('Resposta inválida da função (não é JSON)');
      }
    } catch (error) {
      console.error('Erro ao chamar Edge Function MaxPlus:', error);
      throw error;
    }
  }

  async listContent(categoryUrl: string): Promise<MaxPlusContent[]> {
    try {
      const data = await this.callEdgeFunction('list', { categoryUrl });
      return data.contents || [];
    } catch (error) {
      console.error('Erro ao listar conteúdos:', error);
      throw error;
    }
  }

  async getDetails(contentId: string): Promise<MaxPlusDetails> {
    try {
      const data = await this.callEdgeFunction('details', { contentId });
      return data;
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
      throw error;
    }
  }

  async getEpisodeLink(episodeId: string): Promise<string> {
    try {
      const data = await this.callEdgeFunction('episode', { episodeId });
      return data.link || '';
    } catch (error) {
      console.error('Erro ao buscar link do episódio:', error);
      throw error;
    }
  }

  async searchContent(query: string): Promise<MaxPlusContent[]> {
    try {
      // Busca em todas as categorias
      const searchPromises = CATEGORIES.map(cat => this.listContent(cat.url));
      const results = await Promise.all(searchPromises);
      const allContent = results.flat();
      
      // Filtrar por query
      const filtered = allContent.filter(content => 
        content.title.toLowerCase().includes(query.toLowerCase())
      );
      
      return filtered;
    } catch (error) {
      console.error('Erro ao buscar conteúdo:', error);
      throw error;
    }
  }
}

export const maxPlusImportService = new MaxPlusImportService();
