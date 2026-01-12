import { useState } from 'react';
import { toast } from 'sonner';
import { maxPlusImportService, MaxPlusContent, MaxPlusDetails, MaxPlusEpisode } from '@/services/MaxPlusImportService';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { useSystemLogs } from '@/hooks/useSystemLogs';

export const useMaxPlusImport = () => {
  const [contents, setContents] = useState<MaxPlusContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<MaxPlusDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  
  const baserowService = useBaserowService();
  const { config } = useConfig();
  const { addLog } = useSystemLogs();

  const loadCategory = async (categoryUrl: string) => {
    setLoading(true);
    try {
      const data = await maxPlusImportService.listContent(categoryUrl);
      setContents(data);
    } catch (error) {
      toast.error('Erro ao carregar categoria');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const searchContent = async (query: string) => {
    if (!query.trim()) {
      setContents([]);
      return;
    }
    
    setLoading(true);
    setSearchQuery(query);
    try {
      const data = await maxPlusImportService.searchContent(query);
      setContents(data);
      if (data.length === 0) {
        toast.info('Nenhum resultado encontrado');
      }
    } catch (error) {
      toast.error('Erro ao buscar conteúdo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (contentId: string) => {
    setDetailsLoading(true);
    try {
      const details = await maxPlusImportService.getDetails(contentId);
      setSelectedContent(details);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const importMovie = async (content: MaxPlusDetails) => {
    if (!config.tableIds.conteudos) {
      toast.error('Configure a tabela de conteúdos primeiro');
      return;
    }

    try {
      const payload = {
        Nome: content.title,
        Link: content.link || '',
        Tipo: 'Filme',
        Sinopse: content.synopsis,
        Categoria: content.category,
        Capa: content.poster,
        Idioma: 'Português',
        Views: '0',
      };

      await baserowService.createRow(config.tableIds.conteudos, payload);
      toast.success('Filme importado com sucesso!');
      addLog('Importou filme do MaxPlus', `Nome: ${content.title}`);
    } catch (error) {
      toast.error('Erro ao importar filme');
      console.error(error);
      throw error;
    }
  };

  const importSeries = async (content: MaxPlusDetails) => {
    if (!config.tableIds.conteudos) {
      toast.error('Configure a tabela de conteúdos primeiro');
      return;
    }

    try {
      const payload = {
        Nome: content.title,
        Link: content.poster,
        Tipo: 'Serie',
        Sinopse: content.synopsis,
        Categoria: content.category,
        Capa: content.poster,
        Idioma: 'Português',
        Views: '0',
        Temporadas: content.seasons?.length.toString() || '1',
      };

      const createdContent = await baserowService.createRow(config.tableIds.conteudos, payload);
      toast.success('Série importada com sucesso!');
      addLog('Importou série do MaxPlus', `Nome: ${content.title}`);
      return createdContent;
    } catch (error) {
      toast.error('Erro ao importar série');
      console.error(error);
      throw error;
    }
  };

  const importEpisodes = async (
    episodes: MaxPlusEpisode[], 
    contentId: number,
    seriesName: string
  ) => {
    if (!config.tableIds.episodios) {
      toast.error('Configure a tabela de episódios primeiro');
      return;
    }

    const total = episodes.length;
    setImportProgress({ current: 0, total });
    
    // Aumentado para 30 para importação super rápida
    const BATCH_SIZE = 30;

    try {
      for (let i = 0; i < episodes.length; i += BATCH_SIZE) {
        const batch = episodes.slice(i, i + BATCH_SIZE);
        
        // Processar todos do lote em paralelo
        await Promise.allSettled(
          batch.map(async (episode) => {
            try {
              const link = await maxPlusImportService.getEpisodeLink(episode.id);
              
              const payload = {
                Nome: episode.title,
                Temporada: episode.season.toString(),
                Episódio: episode.episode.toString(),
                Link: link,
                Conteudo: [contentId],
              };

              await baserowService.createRow(config.tableIds.episodios, payload);
              setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
            } catch (error) {
              console.error(`Erro ao importar episódio ${episode.episode}:`, error);
            }
          })
        );
      }

      toast.success(`${total} episódios importados!`);
      addLog('Importou episódios do MaxPlus', `Série: ${seriesName}, Total: ${total}`);
    } catch (error) {
      toast.error('Erro ao importar episódios');
      console.error(error);
    } finally {
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const importSeriesWithEpisodes = async (content: MaxPlusDetails, selectedSeasons?: number[]) => {
    try {
      const createdContent = await importSeries(content);
      if (!createdContent) return;

      const allEpisodes: MaxPlusEpisode[] = [];
      
      if (content.seasons) {
        const seasonsToImport = selectedSeasons 
          ? content.seasons.filter(s => selectedSeasons.includes(s.season))
          : content.seasons;

        seasonsToImport.forEach(season => {
          allEpisodes.push(...season.episodes);
        });
      }

      if (allEpisodes.length > 0) {
        await importEpisodes(allEpisodes, createdContent.id, content.title);
      }
    } catch (error) {
      console.error('Erro ao importar série com episódios:', error);
    }
  };

  return {
    contents,
    selectedContent,
    loading,
    detailsLoading,
    importProgress,
    searchQuery,
    setSearchQuery,
    loadCategory,
    searchContent,
    loadDetails,
    closeDetails: () => setSelectedContent(null),
    importMovie,
    importSeries,
    importEpisodes,
    importSeriesWithEpisodes,
  };
};
