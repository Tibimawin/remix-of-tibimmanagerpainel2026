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

export interface SeasonUpdateInfo {
  nome: string;
  from: number;
  to: number;
  episodes: number;
  at: string;
}


export interface ImportResult {
  success: boolean;
  imported: number;
  updated?: number;
  ignored?: number;
  total: number;
  errors?: string[];
  seasonsUpdated?: SeasonUpdateInfo[];
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

  // Buscar a configuração global da tabela de origem (definida no painel admin)
  private async getSourceConfig() {
    const global = await UserConfigService.getGlobalSeriesUpdateConfig();
    return {
      token: global?.sourceToken || DEFAULT_SERIES_UPDATE_CONFIG.sourceToken,
      baseUrl: (global?.sourceBaseUrl || DEFAULT_SERIES_UPDATE_CONFIG.sourceBaseUrl).replace(/\/$/, ''),
      tableId: global?.sourceTableId || DEFAULT_SERIES_UPDATE_CONFIG.sourceTableId,
    };
  }

  // Fazer requisição para a tabela central usando credenciais do sistema
  private async makeSystemRequest(endpoint: string, options: RequestInit = {}, systemConfig?: { token: string; baseUrl: string }) {
    const source = systemConfig || (await this.getSourceConfig());

    const originalUrl = `${source.baseUrl}${endpoint}`;
    const method = options.method || 'GET';

    // 🔧 Usar proxy local configurado
    const proxyPayload = {
      url: originalUrl,
      method: method,
      token: source.token,
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

    const source = await this.getSourceConfig();
    console.log('🔍 Buscando episódios da tabela central ID:', source.tableId);

    while (hasMore) {
      try {
        console.log(`📖 Carregando página ${page}...`);

        const endpoint = `/api/database/rows/table/${source.tableId}/?user_field_names=true&page=${page}&size=${pageSize}`;
        const response = await this.makeSystemRequest(endpoint, {}, source);


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

  // Normalizar texto para comparação
  private normalize(value: any): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private normalizeNumber(value: any): string {
    const num = parseInt(String(value ?? '').replace(/\D/g, ''), 10);
    return isNaN(num) ? '' : String(num);
  }

  // Chaves de identificação de um episódio (nome + temporada + episódio, e link)
  private buildKeys(row: any): string[] {
    const nome = this.normalize(row.Nome ?? row.Titulo);
    const temporada = this.normalizeNumber(row.Temporada ?? row.Temporadas ?? row.Season);
    const episodio = this.normalizeNumber(
      row['Episódio'] ?? row.Episodio ?? row['Episódios'] ?? row.Episodios ?? row.Episode
    );
    const link = this.normalize(row.Link ?? row.Url);

    const keys: string[] = [];
    if (nome && (temporada || episodio)) keys.push(`te::${nome}|${temporada}|${episodio}`);
    if (link) keys.push(`link::${link}`);
    return keys;
  }

  // Índice leve: busca só os episódios relevantes (rápido para poucas seleções)
  private async loadTargetedIndex(episodes: UpdateEpisode[]): Promise<Map<string, any>> {
    const index = new Map<string, any>();
    const terms = Array.from(
      new Set(episodes.map(e => String(e.Titulo ?? '').trim()).filter(Boolean))
    );

    await Promise.all(
      terms.map(async term => {
        try {
          const res = await this.baserowService.getTableData(
            this.config.tableIds.episodios,
            1,
            50,
            term
          );
          (res?.results || []).forEach((row: any) => {
            this.buildKeys(row).forEach(key => {
              if (!index.has(key)) index.set(key, row);
            });
          });
        } catch (error) {
          console.warn(`⚠️ Busca falhou para "${term}":`, error);
        }
      })
    );

    console.log(`⚡ Índice direcionado: ${index.size} chaves de ${terms.length} buscas`);
    return index;
  }

  // Carregar índice dos episódios já existentes na tabela do usuário
  private async loadExistingIndex(episodes?: UpdateEpisode[]): Promise<Map<string, any>> {
    // Para poucas seleções, evitar varrer a tabela inteira
    if (episodes && episodes.length > 0 && episodes.length <= 30) {
      return this.loadTargetedIndex(episodes);
    }

    const index = new Map<string, any>();
    try {
      const existing = await this.baserowService.getAllTableData(this.config.tableIds.episodios);
      const rows = existing?.results || [];
      console.log(`📚 ${rows.length} episódios já existentes carregados para comparação`);
      rows.forEach((row: any) => {
        this.buildKeys(row).forEach(key => {
          if (!index.has(key)) index.set(key, row);
        });
      });
    } catch (error) {
      console.warn('⚠️ Não foi possível carregar episódios existentes, seguindo sem deduplicação:', error);
    }
    return index;
  }

  // Cache de conteúdos (séries) buscados durante a importação
  private contentCache = new Map<string, any | null>();

  private async findContentByName(nome: string): Promise<any | null> {
    const key = this.normalize(nome);
    if (!key) return null;
    if (this.contentCache.has(key)) return this.contentCache.get(key) ?? null;

    let found: any | null = null;
    try {
      // ⚠️ O Baserow usa busca textual simples (?search=), não "Campo=valor"
      const res = await this.baserowService.getTableData(
        this.config.tableIds.conteudos,
        1,
        20,
        nome
      );
      const rows = res?.results || [];
      found =
        rows.find((r: any) => this.normalize(r.Nome) === key) ||
        rows.find((r: any) => this.normalize(r.Nome).includes(key) || key.includes(this.normalize(r.Nome))) ||
        null;
    } catch (error) {
      console.warn('Erro ao buscar conteúdo associado:', error);
    }

    if (!found) console.warn(`⚠️ Conteúdo não encontrado na tabela Conteúdos para: "${nome}"`);
    this.contentCache.set(key, found);
    return found;
  }

  // Atualizar o número de temporadas na tabela de Conteúdos quando aumentou
  private async syncSeasonCounts(
    seriesMaxSeason: Map<string, { nome: string; maxSeason: number; row: any; episodes: number }>
  ): Promise<SeasonUpdateInfo[]> {
    const results: SeasonUpdateInfo[] = [];

    for (const [contentId, info] of seriesMaxSeason.entries()) {
      try {
        const row = info.row || {};
        // Descobrir qual coluna de temporadas existe na linha
        const field = ['Temporadas', 'Temporada', 'Seasons', 'Season'].find(f => f in row) || 'Temporadas';
        const currentRaw = row[field];
        const current = parseInt(String(currentRaw ?? '').replace(/\D/g, ''), 10) || 0;

        if (info.maxSeason > current) {
          const isNumeric = typeof currentRaw === 'number' || currentRaw == null;
          await this.baserowService.updateRow(
            this.config.tableIds.conteudos,
            String(contentId),
            { [field]: isNumeric ? info.maxSeason : String(info.maxSeason) }
          );
          results.push({
            nome: info.nome,
            from: current,
            to: info.maxSeason,
            episodes: info.episodes,
            at: new Date().toISOString(),
          });
          console.log(`📺 Temporadas atualizadas em "${info.nome}": ${current} → ${info.maxSeason}`);
        } else {
          console.log(`ℹ️ "${info.nome}" já está na temporada ${current} (importado: ${info.maxSeason})`);
        }
      } catch (error) {
        console.warn(`⚠️ Não foi possível atualizar temporadas de "${info.nome}":`, error);
      }
    }

    return results;
  }



  // Importar (ou atualizar) episódios selecionados para a tabela do usuário
  async importEpisodes(
    episodes: UpdateEpisode[],
    onProgress?: (progress: { processed: number; total: number; current?: string }) => void
  ): Promise<ImportResult> {
    let imported = 0;
    let updated = 0;
    let ignored = 0;
    const errors: string[] = [];
    const seriesMaxSeason = new Map<string, { nome: string; maxSeason: number; row: any; episodes: number }>();
    this.contentCache.clear();

    console.log(`🚀 Iniciando importação de ${episodes.length} episódios...`);

    const existingIndex = await this.loadExistingIndex(episodes);
    const throttleMs = episodes.length > 20 ? 100 : 0;
    let processed = 0;
    onProgress?.({ processed: 0, total: episodes.length });

    for (const episode of episodes) {
      try {
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

        // Tentar associar a conteúdo se houver série especificada
        if (episode.Serie) {
          const contentRow = await this.findContentByName(String(episode.Serie));
          if (contentRow) {
            episodePayload['Conteudo'] = [contentRow.id];

            // Registrar a maior temporada importada por série
            const seasonNum = parseInt(String(episode.Temporada ?? '').replace(/\D/g, ''), 10);
            if (!isNaN(seasonNum) && seasonNum > 0) {
              const key = String(contentRow.id);
              const prev = seriesMaxSeason.get(key);
              if (!prev || seasonNum > prev.maxSeason) {
                seriesMaxSeason.set(key, {
                  nome: contentRow.Nome || String(episode.Serie),
                  maxSeason: seasonNum,
                  row: contentRow
                });
              }
            }
          }
        }

        // Verificar se já existe (mesmo nome + temporada + episódio, ou mesmo link)
        const keys = this.buildKeys({
          Nome: episode.Titulo,
          Temporada: episode.Temporada,
          'Episódio': episode.Episodio,
          Link: episode.Link
        });
        const existingRow = keys.map(k => existingIndex.get(k)).find(Boolean);

        if (existingRow) {
          // Atualizar informações em vez de duplicar
          const updatePayload = { ...episodePayload };
          // Só enviar campos que realmente existem na linha do usuário
          Object.keys(updatePayload).forEach(field => {
            if (!(field in existingRow)) delete updatePayload[field];
          });

          if (Object.keys(updatePayload).length > 0) {
            await this.baserowService.updateRow(
              this.config.tableIds.episodios,
              String(existingRow.id),
              updatePayload
            );
            updated++;
            console.log(`♻️ Episódio atualizado (sem duplicar): ${episode.Titulo}`);
          } else {
            ignored++;
            console.log(`⏭️ Episódio ignorado (sem alterações): ${episode.Titulo}`);
          }

          // Manter o índice atualizado
          keys.forEach(k => existingIndex.set(k, { ...existingRow, ...updatePayload }));

          if (throttleMs) await new Promise(resolve => setTimeout(resolve, throttleMs));
          continue;
        }

        console.log('💾 Payload sendo enviado para a tabela:', episodePayload);

        // Criar episódio na tabela do usuário
        const created = await this.baserowService.createRow(this.config.tableIds.episodios, episodePayload);
        imported++;

        // Registrar no índice para evitar duplicatas dentro da mesma execução
        keys.forEach(k => existingIndex.set(k, created || episodePayload));

        console.log(`✅ Episódio importado: ${episode.Titulo}`);

        // Pequena pausa entre importações
        if (throttleMs) await new Promise(resolve => setTimeout(resolve, throttleMs));

      } catch (error) {
        console.error(`❌ Erro ao importar episódio ${episode.Titulo}:`, error);
        errors.push(`${episode.Titulo}: ${error}`);
      } finally {
        processed++;
        onProgress?.({ processed, total: episodes.length, current: episode.Titulo });
      }
    }

    console.log(`🎉 Importação concluída: ${imported} novos, ${updated} atualizados, ${ignored} ignorados de ${episodes.length}`);

    // Atualizar automaticamente o número de temporadas na tabela de Conteúdos
    const seasonsUpdated = await this.syncSeasonCounts(seriesMaxSeason);

    return {
      success: imported + updated > 0,
      imported,
      updated,
      ignored,
      total: episodes.length,
      errors: errors.length > 0 ? errors : undefined,
      seasonsUpdated: seasonsUpdated.length > 0 ? seasonsUpdated : undefined
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