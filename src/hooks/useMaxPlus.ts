import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  fetchCatalog, 
  fetchDetails, 
  searchMaxPlus,
  MaxPlusCatalogItem, 
  MaxPlusContentDetails, 
  MAXPLUS_CATEGORIES 
} from '@/services/maxplusApi';
import { MaxPlusImportEngine, ImportProgress, getTitleMatchVariants, normalizeTitle } from '@/services/maxplusImportEngine';
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMorePages, setHasMorePages] = useState<boolean>(true);

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

  // Detecção de Conteúdos já importados no Baserow com hidratação imediata
  const conteudosId = config.tableIds?.conteudos || config.conteudosTableId || '';
  const [importedTitles, setImportedTitles] = useState<Set<string>>(() => 
    MaxPlusImportEngine.getKnownImportedTitles(conteudosId)
  );
  const [loadingImportedCheck, setLoadingImportedCheck] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'all' | 'imported' | 'pending'>('all');

  // Hidratação quando a configuração de tabelas for carregada
  useEffect(() => {
    if (conteudosId) {
      const stored = MaxPlusImportEngine.getKnownImportedTitles(conteudosId);
      if (stored.size > 0) {
        setImportedTitles(prev => {
          const next = new Set(prev);
          stored.forEach(t => next.add(t));
          return next;
        });
      }
    }
  }, [conteudosId]);

  // Instância do motor de importação
  const engine = useMemo(() => {
    const conteudosId = config.tableIds?.conteudos || config.conteudosTableId || '';
    const episodiosId = config.tableIds?.episodios || config.episodiosTableId || '';
    return new MaxPlusImportEngine(baserowService, conteudosId, episodiosId);
  }, [config.tableIds?.conteudos, config.conteudosTableId, config.tableIds?.episodios, config.episodiosTableId, baserowService]);

  const engineRef = useRef(engine);
  engineRef.current = engine;

  const isConfiguredRef = useRef(isConfigured);
  isConfiguredRef.current = isConfigured;

  const checkingRef = useRef(false);
  const lastCheckedFingerprintRef = useRef<string>('');

  // Checar quais conteúdos da lista já existem no Baserow (com cache de alta performance e proteção anti-loop)
  const checkImportedStatus = useCallback(async (catalogItems?: MaxPlusCatalogItem[], force = false) => {
    const list = catalogItems || items;
    if (!list || list.length === 0 || !isConfiguredRef.current) return;

    const names = list.map(i => i.nome).filter(Boolean);
    if (names.length === 0) return;

    const fingerprint = names.slice().sort().join('::');
    if (!force && fingerprint === lastCheckedFingerprintRef.current) {
      return;
    }
    if (checkingRef.current) return;

    checkingRef.current = true;
    lastCheckedFingerprintRef.current = fingerprint;

    try {
      setLoadingImportedCheck(true);
      const detected = await engineRef.current.findExistingContentsByTitles(names);
      
      if (detected.size > 0) {
        setImportedTitles(prev => {
          let hasNew = false;
          for (const t of detected) {
            if (!prev.has(t)) {
              hasNew = true;
              break;
            }
          }
          if (!hasNew) return prev;
          const next = new Set(prev);
          detected.forEach(t => next.add(t));
          return next;
        });
      }
    } catch (err) {
      console.warn('[MaxPlus] Erro ao verificar conteúdos importados no Baserow:', err);
    } finally {
      checkingRef.current = false;
      setLoadingImportedCheck(false);
    }
  }, [items]);

  const checkImportedStatusRef = useRef(checkImportedStatus);
  checkImportedStatusRef.current = checkImportedStatus;

  // Quando isConfigured se torna true OU quando items mudam com isConfigured = true,
  // verificar o status no Baserow automaticamente
  const prevIsConfiguredRef = useRef(isConfigured);
  useEffect(() => {
    if (isConfigured && items.length > 0) {
      if (!prevIsConfiguredRef.current) {
        lastCheckedFingerprintRef.current = '';
        checkImportedStatusRef.current(items, true);
      } else {
        checkImportedStatusRef.current(items, false);
      }
    }
    prevIsConfiguredRef.current = isConfigured;
  }, [isConfigured, items]);

  // Verificar se um item específico já foi importado (com a mesma lógica do ImportPreview / AutoImport)
  const isItemImported = useCallback((title?: string | null): boolean => {
    if (!title) return false;
    const raw = String(title).trim();
    if (!raw) return false;

    // 1. Normalização padrão idêntica ao AutoImport (normalizeText)
    const norm = normalizeTitle(raw);
    if (importedTitles.has(norm)) return true;

    // 2. Variantes de título (sem ano, sem tags)
    const variants = getTitleMatchVariants(raw);
    if (variants.some(v => importedTitles.has(v))) return true;

    // 3. Checagem por prefixo (antes de ":" ou " - " ou " – ")
    const prefix = raw.split(/[:\-–]/)[0]?.trim();
    if (prefix && prefix !== raw && prefix.length >= 3) {
      const normPrefix = normalizeTitle(prefix);
      if (importedTitles.has(normPrefix)) return true;
      const prefixVariants = getTitleMatchVariants(prefix);
      if (prefixVariants.some(v => importedTitles.has(v))) return true;
    }

    return false;
  }, [importedTitles]);

  // Itens filtrados de acordo com filterMode
  const filteredItems = useMemo(() => {
    if (filterMode === 'all') return items;
    if (filterMode === 'imported') {
      return items.filter(item => isItemImported(item.nome));
    }
    if (filterMode === 'pending') {
      return items.filter(item => !isItemImported(item.nome));
    }
    return items;
  }, [items, filterMode, isItemImported]);

  // Quantidade de itens na tela que já estão no banco
  const importedCountOnScreen = useMemo(() => {
    return items.filter(item => isItemImported(item.nome)).length;
  }, [items, isItemImported]);

  // Carregar catálogo de uma categoria com suporte à paginação
  const loadCategory = useCallback(async (categoryUrl: string, page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedCategoryUrl(categoryUrl);
      setCurrentPage(page);
      setSearchQuery('');
      setSelectedItems([]);

      let targetUrl = categoryUrl;
      // Destaques (home) não possui rota de páginas (/page/N/), as demais possuem
      if (page > 1 && categoryUrl !== 'http://apps.zynner.site/') {
        const clean = categoryUrl.replace(/\/$/, '');
        targetUrl = `${clean}/page/${page}/`;
      }

      const data = await fetchCatalog(targetUrl);
      setItems(data);
      setHasMorePages(Array.isArray(data) && data.length >= 10);

      // Atualizar verificação de importados para a nova página
      if (Array.isArray(data) && data.length > 0) {
        checkImportedStatusRef.current(data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar categoria:', err);
      setError(err?.message || 'Falha ao carregar catálogo.');
      toast.error('Erro ao carregar catálogo do MaxPlus');
      setItems([]);
      setHasMorePages(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Navegar diretamente para uma página
  const goToPage = useCallback(async (page: number) => {
    if (page < 1) return;
    if (selectedCategoryUrl) {
      await loadCategory(selectedCategoryUrl, page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedCategoryUrl, loadCategory]);

  // Buscar conteúdos
  const handleSearch = useCallback(async (query: string) => {
    const term = query.trim();
    if (!term) return;

    try {
      setLoading(true);
      setError(null);
      setSelectedCategoryUrl('');
      setCurrentPage(1);
      setHasMorePages(false);
      setSelectedItems([]);

      const data = await searchMaxPlus(term);
      setItems(data);

      if (data.length === 0) {
        toast.info(`Nenhum resultado encontrado para "${term}"`);
      } else {
        toast.success(`${data.length} títulos encontrados para "${term}"`);
        checkImportedStatus(data);
      }
    } catch (err: any) {
      console.error('Erro na pesquisa:', err);
      setError(err?.message || 'Falha ao buscar títulos.');
      toast.error('Erro ao realizar busca no MaxPlus');
    } finally {
      setLoading(false);
    }
  }, [checkImportedStatus]);

  // Abrir modal de detalhes limpo
  const openDetails = useCallback(async (item: MaxPlusCatalogItem) => {
    // 🧹 Limpa imediatamente qualquer dado ou progresso residual anterior
    setCurrentDetails(null);
    setSelectedCatalogItem(item);
    setImportProgress({ active: false, total: 0, current: 0, currentTitle: '', stage: '' });
    setDetailsLoading(true);
    setDetailsModalOpen(true);

    try {
      const details = await fetchDetails(item.link);
      setCurrentDetails(details);
    } catch (err: any) {
      console.error('Erro ao carregar detalhes:', err);
      toast.error('Não foi possível carregar os detalhes deste título');
      setDetailsModalOpen(false);
      setCurrentDetails(null);
      setSelectedCatalogItem(null);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsModalOpen(false);
    setCurrentDetails(null);
    setSelectedCatalogItem(null);
    setDetailsLoading(false);
    setImportProgress({ active: false, total: 0, current: 0, currentTitle: '', stage: '' });
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
    if (!isConfiguredRef.current) {
      toast.error('Configure as credenciais e tabelas do Baserow nas Configurações.');
      return;
    }

    try {
      setIsImporting(true);
      toast.loading(`Importando filme "${details.nome}"...`, { id: 'import-movie' });

      const res = await engineRef.current.importMovie(details, fallbackCat);

      // Marca o título imediatamente como importado no estado local com todas as variantes
      const variants = getTitleMatchVariants(details.nome);
      if (variants.length > 0) {
        setImportedTitles(prev => {
          const next = new Set(prev);
          variants.forEach(v => next.add(v));
          return next;
        });
      }

      if (res?.updated) {
        toast.success(`Filme "${details.nome}" atualizado no Baserow com sucesso!`, { id: 'import-movie' });
      } else {
        toast.success(`Filme "${details.nome}" importado com sucesso!`, { id: 'import-movie' });
      }

      // Re-sincroniza em background
      lastCheckedFingerprintRef.current = '';
      checkImportedStatusRef.current(undefined, true);
    } catch (err: any) {
      console.error('Erro ao importar filme:', err);
      toast.error(`Falha ao importar filme: ${err?.message || 'Erro desconhecido'}`, { id: 'import-movie' });
    } finally {
      setIsImporting(false);
    }
  }, []);

  // Importar Série única (com episódios)
  const importSeries = useCallback(async (
    details: MaxPlusContentDetails, 
    fallbackCat?: string,
    selectedEps?: { seasonNum: number; episodeNum: number }[]
  ) => {
    if (!isConfiguredRef.current) {
      toast.error('Configure as credenciais e tabelas do Baserow nas Configurações.');
      return;
    }

    try {
      setIsImporting(true);
      toast.loading(`Iniciando importação de "${details.nome}"...`, { id: 'import-series' });

      const result = await engineRef.current.importSeries(
        details, 
        fallbackCat, 
        (progress) => setImportProgress(progress),
        selectedEps
      );

      // Marca o título imediatamente como importado no estado local com todas as variantes
      const variants = getTitleMatchVariants(details.nome);
      if (variants.length > 0) {
        setImportedTitles(prev => {
          const next = new Set(prev);
          variants.forEach(v => next.add(v));
          return next;
        });
      }

      const actionMsg = result.updated ? 'atualizada' : 'importada';
      let epDetail = `${result.totalEpisodesImported} episódios processados`;
      if (result.createdEpisodesCount > 0 && result.updatedEpisodesCount > 0) {
        epDetail = `${result.createdEpisodesCount} novos episódios criados, ${result.updatedEpisodesCount} atualizados`;
      } else if (result.updatedEpisodesCount > 0) {
        epDetail = `${result.updatedEpisodesCount} episódios atualizados`;
      } else if (result.createdEpisodesCount > 0) {
        epDetail = `${result.createdEpisodesCount} episódios criados`;
      }

      toast.success(
        `Série "${details.nome}" ${actionMsg} com sucesso! (${epDetail})`, 
        { id: 'import-series', duration: 5500 }
      );

      // Re-sincroniza em background
      lastCheckedFingerprintRef.current = '';
      checkImportedStatusRef.current(undefined, true);
    } catch (err: any) {
      console.error('Erro ao importar série:', err);
      toast.error(`Falha ao importar série: ${err?.message || 'Erro desconhecido'}`, { id: 'import-series' });
    } finally {
      setIsImporting(false);
      setImportProgress({ active: false, total: 0, current: 0, currentTitle: '', stage: '' });
    }
  }, []);

  // Importar itens selecionados em Lote (Batch)
  const importSelectedBatch = useCallback(async () => {
    if (selectedItems.length === 0) {
      toast.info('Selecione pelo menos um item para importar.');
      return;
    }
    if (!isConfiguredRef.current) {
      toast.error('Configure as credenciais e tabelas do Baserow nas Configurações.');
      return;
    }

    try {
      setIsImporting(true);
      toast.loading(`Importando ${selectedItems.length} itens em lote...`, { id: 'import-batch' });

      const result = await engineRef.current.importBatch(selectedItems, (progress) => {
        setImportProgress(progress);
      });

      // Atualiza imediatamente todos os títulos importados no estado do React
      if (result.succeededTitles && result.succeededTitles.length > 0) {
        setImportedTitles(prev => {
          const next = new Set(prev);
          result.succeededTitles.forEach(title => {
            const variants = getTitleMatchVariants(title);
            variants.forEach(v => next.add(v));
          });
          return next;
        });
      }

      toast.success(
        `Lote concluído: ${result.succeeded} importados com sucesso${result.failed > 0 ? `, ${result.failed} falhas` : ''}!`,
        { id: 'import-batch', duration: 6000 }
      );
      setSelectedItems([]);

      // Re-sincroniza os itens importados após conclusão do lote
      lastCheckedFingerprintRef.current = '';
      checkImportedStatusRef.current(undefined, true);
    } catch (err: any) {
      console.error('Erro na importação em lote:', err);
      toast.error(`Falha no lote: ${err?.message || 'Erro desconhecido'}`, { id: 'import-batch' });
    } finally {
      setIsImporting(false);
      setImportProgress({ active: false, total: 0, current: 0, currentTitle: '', stage: '' });
    }
  }, [selectedItems]);

  // Carrega categoria inicial apenas uma vez ao montar
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      loadCategory(MAXPLUS_CATEGORIES[0].url);
    }
  }, [loadCategory]);

  return {
    items,
    filteredItems,
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
    importedTitles,
    loadingImportedCheck,
    isItemImported,
    filterMode,
    setFilterMode,
    importedCountOnScreen,
    checkImportedStatus,
    loadCategory,
    handleSearch,
    openDetails,
    closeDetails,
    toggleSelectItem,
    toggleSelectAll,
    importMovie,
    importSeries,
    importSelectedBatch,
    currentPage,
    setCurrentPage,
    hasMorePages,
    goToPage,
  };
}
