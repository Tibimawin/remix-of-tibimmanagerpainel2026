import { useState } from 'react';
import { toast } from 'sonner';
import { maxPlusImportService, MaxPlusContent, MaxPlusDetails, MaxPlusEpisode } from '@/services/MaxPlusImportService';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { normalizeCategories } from '@/utils/categoryNormalizer';

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
    setSelectedContent(null);
    setDetailsLoading(true);
    try {
      const details = await maxPlusImportService.getDetails(contentId);
      setSelectedContent(details);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
      console.error(error);
      setSelectedContent(null);
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
      const isLeg = Boolean(
        (content.link && content.link.includes('LEG')) ||
        (content.link && (content.link.toLowerCase().includes('leg.mp4') || content.link.toLowerCase().includes('_leg')))
      );
      const idioma = (content as any).idioma || (content.link && isLeg ? 'Legendado' : 'Dublado') || 'Dublado';

      const payload = {
        Nome: content.title,
        Link: content.link || '',
        Tipo: 'Filme',
        Sinopse: content.synopsis,
        Categoria: normalizeCategories({
          tipo: 'Filme',
          categorias: [content.category, (content as any).genre].filter(Boolean).join(', '),
          titulo: content.title,
        }),
        Capa: content.poster,
        Idioma: idioma,
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
      const isLeg = Boolean(
        (content.link && content.link.includes('LEG')) ||
        (content.poster && content.poster.includes('LEG'))
      );
      const idioma = (content as any).idioma || (content.link && isLeg ? 'Legendado' : 'Dublado') || 'Dublado';

      const payload = {
        Nome: content.title,
        Link: content.poster,
        Tipo: 'Serie',
        Sinopse: content.synopsis,
        Categoria: normalizeCategories({
          tipo: 'Serie',
          categorias: [content.category, (content as any).genre].filter(Boolean).join(', '),
          titulo: content.title,
        }),
        Capa: content.poster,
        Idioma: idioma,
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

    // Garantir ordenação estrita crescente de temporada e episódio
    const sortedEpisodes = [...episodes].sort((a, b) => {
      const sA = Number(a.season) || 0;
      const sB = Number(b.season) || 0;
      if (sA !== sB) return sA - sB;
      return (Number(a.episode) || 0) - (Number(b.episode) || 0);
    });

    const total = sortedEpisodes.length;
    setImportProgress({ current: 0, total });
    
    const BATCH_SIZE = 5;

    try {
      for (let i = 0; i < sortedEpisodes.length; i += BATCH_SIZE) {
        const batch = sortedEpisodes.slice(i, i + BATCH_SIZE);
        
        // 1. Obter os links em paralelo preservando a ordem do lote
        const preparedBatch = await Promise.all(
          batch.map(async (episode) => {
            try {
              const link = await maxPlusImportService.getEpisodeLink(episode.id);
              const isLeg = Boolean(
                (link && link.includes('LEG')) ||
                (link && (link.toLowerCase().includes('leg.mp4') || link.toLowerCase().includes('_leg')))
              );
              const epIdioma = (episode as any).idioma || (link && isLeg ? 'Legendado' : 'Dublado') || 'Dublado';
              return { episode, link, epIdioma };
            } catch (err) {
              return { episode, link: '', epIdioma: 'Dublado' };
            }
          })
        );

        // 2. Inserir sequencialmente no Baserow para manter a ordem exata (1, 2, 3, 4, 5...)
        for (const item of preparedBatch) {
          try {
            const payload = {
              Nome: item.episode.title,
              Temporada: item.episode.season.toString(),
              'Episódio': item.episode.episode.toString(),
              Link: item.link,
              Idioma: item.epIdioma,
              Conteudo: [contentId],
            };

            await baserowService.createRow(config.tableIds.episodios, payload);
            setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
          } catch (error) {
            console.error(`Erro ao importar episódio ${item.episode.episode}:`, error);
          }
        }
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

      // Ordenar episódios numericamente
      allEpisodes.sort((a, b) => {
        const sA = Number(a.season) || 0;
        const sB = Number(b.season) || 0;
        if (sA !== sB) return sA - sB;
        return (Number(a.episode) || 0) - (Number(b.episode) || 0);
      });

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
    closeDetails: () => {
      setSelectedContent(null);
      setImportProgress({ current: 0, total: 0 });
    },
    importMovie,
    importSeries,
    importEpisodes,
    importSeriesWithEpisodes,
  };
};
