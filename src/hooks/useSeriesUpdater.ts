import { useState } from 'react';
import { toast } from 'sonner';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { tmdbService } from '@/services/TmdbService';
import { maxPlusService } from '@/services/MaxPlusService';
import { useSystemLogs } from '@/hooks/useSystemLogs';

export interface EpisodeUpdate {
  nome: string;
  temporada: number;
  episodio: number;
  link: string;
  isNew: boolean;
}

export interface SeriesUpdate {
  contentId: number;
  seriesName: string;
  currentSeasons: number;
  availableSeasons: number;
  newEpisodes: EpisodeUpdate[];
  existingEpisodes: any[];
}

export const useSeriesUpdater = () => {
  const [loading, setLoading] = useState(false);
  const [updateData, setUpdateData] = useState<SeriesUpdate | null>(null);
  const baserowService = useBaserowService();
  const { config } = useConfig();
  const { addLog } = useSystemLogs();

  const checkForUpdates = async (content: any) => {
    setLoading(true);
    try {
      toast('Verificando atualizações...', { description: `Buscando novos episódios para "${content.Nome}"` });
      
      // Buscar episódios existentes da série
      const existingEpisodes = await baserowService.getTableData(
        config.tableIds.episodios, 
        1, 
        1000,
        `Conteudo=${content.id}`
      );

      console.log('Episódios existentes:', existingEpisodes);

      // Buscar dados atualizados no TMDB
      const tmdbData = await tmdbService.search(content.Nome, 'tv');
      
      if (!tmdbData) {
        toast.error('Não foi possível encontrar a série no TMDB');
        return null;
      }

      // Buscar dados do MaxPlus para obter links dos episódios
      const maxPlusData = await maxPlusService.searchContent(content.Nome);
      
      if (!maxPlusData || !maxPlusData.episodios) {
        toast.error('Não foi possível encontrar episódios atualizados');
        return null;
      }

      // Comparar episódios existentes com os disponíveis
      const newEpisodes: EpisodeUpdate[] = [];
      const existingEpisodeMap = new Map();
      
      existingEpisodes.results?.forEach((ep: any) => {
        const temporadaRaw = ep.Temporada ?? ep.temporada ?? ep.Temporadas ?? ep.season ?? ep.Season ?? 1;
        const episodioRaw = ep['Episódio'] ?? ep.Episodio ?? ep['Episódios'] ?? ep.episode ?? ep.Episode ?? 1;
        const temporada = typeof temporadaRaw === 'number' ? temporadaRaw : parseInt(String(temporadaRaw)) || 1;
        const episodio = typeof episodioRaw === 'number' ? episodioRaw : parseInt(String(episodioRaw)) || 1;
        const key = `${temporada}-${episodio}`;
        existingEpisodeMap.set(key, ep);
      });

      maxPlusData.episodios.forEach((ep: any) => {
        // Garantir que temporada e episódio sejam números válidos
        // Tentar diferentes possibilidades de nomes para os campos
        const temporadaValue = ep.temporada || ep.Temporada || ep.Temporadas || ep.season || ep.Season || 1;
        const episodioValue = ep.episodio || ep.Episodio || ep['Episódio'] || ep['Episódios'] || ep.episode || ep.Episode || 1;
        
        const temporada = typeof temporadaValue === 'number' ? temporadaValue : parseInt(String(temporadaValue)) || 1;
        const episodio = typeof episodioValue === 'number' ? episodioValue : parseInt(String(episodioValue)) || 1;
        
        const key = `${temporada}-${episodio}`;
        const isNew = !existingEpisodeMap.has(key);
        
        console.log('Processando episódio (estrutura completa):', {
          nome: ep.nome || ep.Nome,
          temporada,
          episodio,
          link: ep.link || ep.Link,
          camposOriginais: {
            temporada: ep.temporada,
            Temporada: ep.Temporada,
            Temporadas: ep.Temporadas,
            episodio: ep.episodio,
            Episodio: ep.Episodio,
            'Episódios': ep['Episódios'],
            episode: ep.episode
          },
          objetoCompleto: ep
        });
        
        newEpisodes.push({
          nome: ep.nome || ep.Nome,
          temporada,
          episodio,
          link: ep.link || ep.Link,
          isNew
        });
      });

      const onlyNewEpisodes = newEpisodes.filter(ep => ep.isNew);
      
      const updateInfo: SeriesUpdate = {
        contentId: content.id,
        seriesName: content.Nome,
        currentSeasons: existingEpisodes.results?.length > 0 
          ? Math.max(...existingEpisodes.results.map((ep: any) => ep.Temporada)) 
          : 0,
        availableSeasons: tmdbData.seasons?.length || 0,
        newEpisodes: onlyNewEpisodes,
        existingEpisodes: existingEpisodes.results || []
      };

      setUpdateData(updateInfo);
      
      if (onlyNewEpisodes.length > 0) {
        toast.success(`${onlyNewEpisodes.length} novos episódios encontrados!`);
      } else {
        toast.info('Nenhum episódio novo encontrado');
      }

      return updateInfo;
      
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
      toast.error('Erro ao verificar atualizações');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const applyUpdates = async (selectedEpisodes: EpisodeUpdate[]) => {
    if (!updateData) return;
    
    setLoading(true);
    try {
      toast('Importando novos episódios...');
      
      let importedCount = 0;
      
      for (const episode of selectedEpisodes) {
        try {
          // Garantir que os valores sejam números válidos
          const temporada = typeof episode.temporada === 'number' ? episode.temporada : parseInt(String(episode.temporada)) || 1;
          const episodio = typeof episode.episodio === 'number' ? episode.episodio : parseInt(String(episode.episodio)) || 1;
          
          console.log('Criando episódio:', {
            nome: episode.nome,
            temporada,
            episodio,
            link: episode.link
          });
          
          const episodePayload = {
            'Nome': episode.nome,
            'Temporada': temporada,
            'Episódio': episodio,
            'Episodio': episodio, // fallback para variações sem acento
            'Episódios': episodio, // fallback para colunas no plural
            'Link': episode.link,
            'Conteudo': [updateData.contentId]
          };
          
          await baserowService.createRow(config.tableIds.episodios, episodePayload);
          importedCount++;
          
          // Pequena pausa entre importações
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Erro ao importar episódio ${episode.nome}:`, error);
        }
      }
      
      if (importedCount === selectedEpisodes.length) {
        toast.success(`${importedCount} episódios importados com sucesso!`);
      } else {
        toast.success(`${importedCount}/${selectedEpisodes.length} episódios importados`);
      }
      
      addLog('Atualizou série', `${updateData.seriesName}: ${importedCount} novos episódios`);
      setUpdateData(null);
      
    } catch (error) {
      console.error('Erro ao aplicar atualizações:', error);
      toast.error('Erro ao importar episódios');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    updateData,
    checkForUpdates,
    applyUpdates,
    setUpdateData
  };
};