import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  fetchCatalog, 
  fetchDetails, 
  searchMaxPlus,
  MaxPlusCatalogItem, 
  MaxPlusContentDetails, 
  MAXPLUS_CATEGORIES 
} from '@/services/maxplusApi';
import { MaxPlusImportEngine, ImportProgress } from '@/services/maxplusImportEngine';
import { useConfig } from '@/contexts/ConfigContext';
import { useBaserowService } from '@/services/BaserowService';
import { toast } from 'sonner';

export function useMaxPlus() {
  const { config, isConfigured } = useConfig();
  const baserowService = useBaserowService();

  const [items, setItems] = useState<MaxPlusCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryUrl, setSelectedCategoryUrl] = useState<string>(MAXPLUS_CATEGORIES[0].url);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Seleção em lote
  const [selectedItems, setSelectedItems] = useState<MaxPlusCatalogItem[]>([]);

  // Detalhes & Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [currentDetails, setCurrentDetails] = useState<MaxPlusContentDetails | null>(null);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<MaxPlusCatalogItem | null>(null);

  // Progresso de Importação
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    active: false,
    total: 0,
    current: 0,
    currentTitle: '',
    stage: '',
  });
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Instância do motor de importação
  const engine = useMemo(() => {
    const conteudosId = config.tableIds?.conteudos || config.conteudosTableId || '';
    const episodiosId = config.tableIds?.episodios || config.episodiosTableId || '';
    return new MaxPlusImportEngine(baserowService, conteudosId, episodiosId);
  }, [config, baserowService]);

  // Carregar catálogo de uma categoria
  const loadCategory = useCallback(async (categoryUrl: string) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedCategoryUrl(categoryUrl);
      setSearchQuery('');
      setSelectedItems([]);

      const data = await fetchCatalog(categoryUrl);
      setItems(data);
    } catch (err: any) {
      console.error('Erro ao carregar categoria:', err);
      setError(err?.message || 'Falha ao carregar catálogo.');
      toast.error('Erro ao carregar catálogo do MaxPlus');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar conteúdos
  const handleSearch = useCallback(async (query: string) => {
    const term = query.trim();
    if (!term) return;

    try {
      setLoading(true);
      setError(null);
      setSelectedCategoryUrl('');
      setSelectedItems([]);

      const data = await searchMaxPlus(term);
      setItems(data);

      if (data.length === 0) {
        toast.info(`Nenhum resultado encontrado para "${term}"`);
      } else {
        toast.success(`${data.length} títulos encontrados para "${term}"`);
      }
    } catch (err: any) {
      console.error('Erro na pesquisa:', err);
      setError(err?.message || 'Falha ao buscar títulos.');
      toast.error('Erro ao realizar busca no MaxPlus');
    } finally {
      setLoading(false);
    }
  }, []);

  // Abrir modal de detalhes
  const openDetails = useCallback(async (item: MaxPlusCatalogItem) => {
    try {
      setSelectedCatalogItem(item);
      setDetailsLoading(true);
      setDetailsModalOpen(true);
      setCurrentDetails(null);

      const details = await fetchDetails(item.link);
      setCurrentDetails(details);
    } catch (err: any) {
      console.error('Erro ao carregar detalhes:', err);
      toast.error('Não foi possível carregar os detalhes deste título');
      setDetailsModalOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsModalOpen(false);
    setCurrentDetails(null);
    setSelectedCatalogItem(null);
  }, []);

  // Seleção individual em lote
  const toggleSelectItem = useCallback((item: MaxPlusCatalogItem) => {
    setSelectedItems(prev => {
      const exists = prev.some(i => i.link === item.link);
      if (exists) {
        return prev.filter(i => i.link !== item.link);
      } else {
        return [...prev, item];
      }
    });
  }, []);

  // Selecionar todos os itens exibidos
  const toggleSelectAll = useCallback(() => {
    setSelectedItems(prev => {
      if (prev.length === items.length) {
        return [];
      } else {
        return [...items];
      }
    });
  }, [items]);

  // Importar Filme único
  const importMovie = useCallback(async (details: MaxPlusContentDetails, fallbackCat?: string) => {
    if (!isConfigured) {
      toast.error('Configure as credenciais e tabelas do Baserow nas Configurações.');
      return;
    }

    try {
      setIsImporting(true);
      toast.loading(`Importando filme "${details.nome}"...`, { id: 'import-movie' });

      await engine.importMovie(details, fallbackCat);

      toast.success(`Filme "${details.nome}" importado com sucesso!`, { id: 'import-movie' });
    } catch (err: any) {
      console.error('Erro ao importar filme:', err);
      toast.error(`Falha ao importar filme: ${err?.message || 'Erro desconhecido'}`, { id: 'import-movie' });
    } finally {
      setIsImporting(false);
    }
  }, [engine, isConfigured]);

  // Importar Série única (com episódios)
  const importSeries = useCallback(async (
    details: MaxPlusContentDetails, 
    fallbackCat?: string,
    selectedEps?: { seasonNum: number; episodeNum: number }[]
  ) => {
    if (!isConfigured) {
      toast.error('Configure as credenciais e tabelas do Baserow nas Configurações.');
      return;
    }

    try {
      setIsImporting(true);
      toast.loading(`Iniciando importação de "${details.nome}"...`, { id: 'import-series' });

      const result = await engine.importSeries(
        details, 
        fallbackCat, 
        (progress) => setImportProgress(progress),
        selectedEps
      );

      toast.success(
        `Série "${details.nome}" importada com sucesso! Total de ${result.totalEpisodesImported} episódios cadastrados.`, 
        { id: 'import-series', duration: 5000 }
      );
    } catch (err: any) {
      console.error('Erro ao importar série:', err);
      toast.error(`Falha ao importar série: ${err?.message || 'Erro desconhecido'}`, { id: 'import-series' });
    } finally {
      setIsImporting(false);
      setImportProgress({ active: false, total: 0, current: 0, currentTitle: '', stage: '' });
    }
  }, [engine, isConfigured]);

  // Importar itens selecionados em Lote (Batch)
  const importSelectedBatch = useCallback(async () => {
    if (selectedItems.length === 0) {
      toast.info('Selecione pelo menos um item para importar.');
      return;
    }
    if (!isConfigured) {
      toast.error('Configure as credenciais e tabelas do Baserow nas Configurações.');
      return;
    }

    try {
      setIsImporting(true);
      toast.loading(`Importando ${selectedItems.length} itens em lote...`, { id: 'import-batch' });

      const result = await engine.importBatch(selectedItems, (progress) => {
        setImportProgress(progress);
      });

      toast.success(
        `Lote concluído: ${result.succeeded} importados com sucesso${result.failed > 0 ? `, ${result.failed} falhas` : ''}!`,
        { id: 'import-batch', duration: 6000 }
      );
      setSelectedItems([]);
    } catch (err: any) {
      console.error('Erro na importação em lote:', err);
      toast.error(`Falha no lote: ${err?.message || 'Erro desconhecido'}`, { id: 'import-batch' });
    } finally {
      setIsImporting(false);
      setImportProgress({ active: false, total: 0, current: 0, currentTitle: '', stage: '' });
    }
  }, [selectedItems, engine, isConfigured]);

  // Carrega categoria inicial ao montar
  useEffect(() => {
    loadCategory(MAXPLUS_CATEGORIES[0].url);
  }, [loadCategory]);

  return {
    items,
    loading,
    error,
    selectedCategoryUrl,
    searchQuery,
    setSearchQuery,
    selectedItems,
    detailsModalOpen,
    detailsLoading,
    currentDetails,
    selectedCatalogItem,
    importProgress,
    isImporting,
    loadCategory,
    handleSearch,
    openDetails,
    closeDetails,
    toggleSelectItem,
    toggleSelectAll,
    importMovie,
    importSeries,
    importSelectedBatch,
  };
}
