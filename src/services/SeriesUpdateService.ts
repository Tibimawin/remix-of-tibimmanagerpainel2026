import { useBaserowService } from './BaserowService';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useConfig } from '@/contexts/ConfigContext';
import { BASEROW_PROXY_CONFIG } from '../config/proxyConfig';
import { UserConfigService } from './UserConfigService';
import { DEFAULT_SERIES_UPDATE_CONFIG } from '@/hooks/useGlobalSeriesUpdateConfig';


export interface UpdateEpisode {
  id: string;
  Titulo: string;
  Serie?: string;
  Temporada?: string | number;
  Episodio?: string | number;
  Link?: string;
  Sinopse?: string;
  [key: string]: any;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  total: number;
  errors?: string[];
}

class SeriesUpdateService {
  private baserowService: any;
  private userConfig: any;
  private config: any;

  constructor(baserowService: any, userConfig: any, config: any) {
    this.baserowService = baserowService;
    this.userConfig = userConfig;
    this.config = config;
  }

  // Fazer requisição para a tabela central usando credenciais do sistema
  private async makeSystemRequest(endpoint: string, options: RequestInit = {}) {
    const systemConfig = {
      token: 'TH0lxs0P4EzApqjqMXjEqHvtRsjemFgn',
      baseUrl: 'http://213.199.56.115'
    };

    const originalUrl = `${systemConfig.baseUrl}${endpoint}`;
    const method = options.method || 'GET';

    // 🔧 Usar proxy local configurado
    const proxyPayload = {
      url: originalUrl,
      method: method,
      token: systemConfig.token,
      body: options.body || null
    };

    return fetch(BASEROW_PROXY_CONFIG.ACTIVE_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proxyPayload)
    });
  }

  // Buscar todos os episódios disponíveis da tabela central
  async getAvailableEpisodes(): Promise<UpdateEpisode[]> {
    const allEpisodes: UpdateEpisode[] = [];
    let page = 1;
    let hasMore = true;
    const pageSize = 200;

    console.log('🔍 Buscando episódios da tabela central ID:', SERIES_UPDATE_TABLE_ID);

    while (hasMore) {
      try {
        console.log(`📖 Carregando página ${page}...`);

        const endpoint = `/api/database/rows/table/${SERIES_UPDATE_TABLE_ID}/?user_field_names=true&page=${page}&size=${pageSize}`;
        const response = await this.makeSystemRequest(endpoint);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Erro ao buscar episódios:', response.status, errorText);

          if (response.status === 429) {
            console.log('⏳ Rate limit, aguardando...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }

          throw new Error(`Erro ao buscar episódios: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const pageResults = data.results || [];

        console.log(`📊 Página ${page}: ${pageResults.length} episódios encontrados`);

        if (pageResults.length > 0) {
          // Filtrar e formatar episódios
          const formattedEpisodes = pageResults
            .filter((ep: any) => ep.Titulo || ep.Nome) // Apenas episódios com título
            .map((ep: any) => {
              console.log('📋 Dados do episódio da tabela central:', ep);

              // Debug: vamos ver todos os campos disponíveis
              console.log('🔍 Campos disponíveis no episódio da tabela 3777:', Object.keys(ep));
              console.log('📋 Valores dos campos de episódio:', {
                'Episódios': ep['Episódios'],
                'Episodio': ep['Episodio'],
                'Episode': ep['Episode'],
                'Episódio': ep['Episódio']
              });

              return {
                id: ep.id,
                Titulo: ep.Titulo || ep.Nome || 'Episódio sem título',
                Serie: ep.Serie || ep.Conteudo || '',
                Temporada: ep.Temporadas || ep.Temporada || ep.Season || '',
                Episodio: ep['Episódios'] || ep['Episódio'] || ep.Episodio || ep.Episode || '',
                Link: ep.Link || ep.Url || '',
                Sinopse: ep.Sinopse || ep.Description || ep.Synopsis || '',
                ...ep // Manter outros campos
              };
            });

          allEpisodes.push(...formattedEpisodes);

          if (pageResults.length < pageSize || !data.next) {
            hasMore = false;
          } else {
            page++;
            // Pequena pausa para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } else {
          hasMore = false;
        }

      } catch (error) {
        console.error(`Erro ao carregar página ${page}:`, error);
        throw error;
      }
    }

    console.log(`✅ Total de episódios carregados: ${allEpisodes.length}`);

    // Ordenar por ID decrescente (mais recentes primeiro)
    allEpisodes.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

    return allEpisodes;
  }

  // Verificar se um episódio já existe na tabela do usuário
  private async episodeExists(episode: UpdateEpisode): Promise<boolean> {
    try {
      const searchFields = [];

      // Buscar por título
      if (episode.Titulo) {
        searchFields.push(`Titulo=${encodeURIComponent(episode.Titulo)}`);
        searchFields.push(`Nome=${encodeURIComponent(episode.Titulo)}`);
      }

      // Buscar por temporada e episódio se disponível
      if (episode.Temporada && episode.Episodio && episode.Serie) {
        searchFields.push(`Temporada=${episode.Temporada}`);
        searchFields.push(`Episodio=${episode.Episodio}`);
      }

      // Fazer busca simples na tabela de episódios do usuário
      const existingEpisodes = await this.baserowService.getTableData(
        this.config.tableIds.episodios,
        1,
        10, // Busca pequena apenas para verificar existência
        searchFields.length > 0 ? searchFields[0] : '' // Usar primeiro critério
      );

      if (existingEpisodes.results && existingEpisodes.results.length > 0) {
        // Verificar se algum episódio corresponde
        return existingEpisodes.results.some((existing: any) => {
          const titleMatch = existing.Titulo === episode.Titulo || existing.Nome === episode.Titulo;

          if (episode.Temporada && episode.Episodio) {
            const seasonMatch = existing.Temporada == episode.Temporada;
            const existingEpisodeValue = existing['Episódio'] ?? existing.Episodio ?? existing['Episódios'];
            const episodeMatch = existingEpisodeValue == episode.Episodio;
            return titleMatch || (seasonMatch && episodeMatch);
          }

          return titleMatch;
        });
      }

      return false;
    } catch (error) {
      console.warn('Erro ao verificar existência do episódio, assumindo que não existe:', error);
      return false;
    }
  }

  // Importar episódios selecionados para a tabela do usuário
  async importEpisodes(episodes: UpdateEpisode[]): Promise<ImportResult> {
    let imported = 0;
    const errors: string[] = [];

    console.log(`🚀 Iniciando importação de ${episodes.length} episódios...`);

    for (const episode of episodes) {
      try {
        // Verificar se o episódio já existe
        const exists = await this.episodeExists(episode);

        if (exists) {
          console.log(`⏭️ Episódio já existe, pulando: ${episode.Titulo}`);
          continue;
        }

        // Preparar payload para a tabela do usuário
        const episodePayload: any = {
          'Nome': episode.Titulo,
          'Titulo': episode.Titulo,
        };

        // Adicionar campos opcionais se disponíveis
        if (episode.Temporada) {
          const temporadaNum = Number(episode.Temporada);
          episodePayload['Temporada'] = isNaN(temporadaNum) ? episode.Temporada : temporadaNum;
        }
        if (episode.Episodio) {
          const episodioNum = Number(episode.Episodio);
          const val = isNaN(episodioNum) ? episode.Episodio : episodioNum;
          episodePayload['Episódio'] = val;
          episodePayload['Episodio'] = val; // fallback sem acento
          episodePayload['Episódios'] = val; // fallback plural com acento
          episodePayload['Episodios'] = val; // fallback plural sem acento
        }
        if (episode.Link) episodePayload['Link'] = episode.Link;
        if (episode.Sinopse) episodePayload['Sinopse'] = episode.Sinopse;

        console.log('💾 Payload sendo enviado para a tabela:', episodePayload);

        // Tentar associar a conteúdo se houver série especificada
        if (episode.Serie) {
          try {
            const existingContent = await this.baserowService.getTableData(
              this.config.tableIds.conteudos,
              1,
              5,
              `Nome=${encodeURIComponent(episode.Serie)}`
            );

            if (existingContent.results && existingContent.results.length > 0) {
              episodePayload['Conteudo'] = [existingContent.results[0].id];
            }
          } catch (error) {
            console.warn('Erro ao buscar conteúdo associado:', error);
          }
        }

        // Criar episódio na tabela do usuário
        await this.baserowService.createRow(this.config.tableIds.episodios, episodePayload);
        imported++;

        console.log(`✅ Episódio importado: ${episode.Titulo}`);

        // Pequena pausa entre importações
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Erro ao importar episódio ${episode.Titulo}:`, error);
        errors.push(`${episode.Titulo}: ${error}`);
      }
    }

    console.log(`🎉 Importação concluída: ${imported}/${episodes.length} episódios importados`);

    return {
      success: imported > 0,
      imported,
      total: episodes.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Hook para usar o service
export const useSeriesUpdateService = () => {
  const baserowService = useBaserowService();
  const { config: userConfig } = useUserConfig();
  const { config } = useConfig();

  return new SeriesUpdateService(baserowService, userConfig, config);
};