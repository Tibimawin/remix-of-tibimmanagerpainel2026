import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  fetchCatalog, 
  fetchDetails, 
  searchMaxPlus,
  searchLocalCatalogMemory,
  MaxPlusCatalogItem, 
  MaxPlusContentDetails, 
  MAXPLUS_CATEGORIES 
} from '@/services/maxplusApi';
import { getTitleMatchVariants, normalizeTitle } from '@/services/maxplusImportEngine';
import { useConfig } from '@/contexts/ConfigContext';
import { useMaxPlusImport } from '@/contexts/MaxPlusImportContext';
import { toast } from 'sonner';

export function useMaxPlus() {
  const { isConfigured } = useConfig();
  const {
    items,
    setItems,
    selectedCategoryUrl,
    setSelectedCategoryUrl,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    hasMorePages,
    setHasMorePages,
    filterMode,
    setFilterMode,
    selectedItems,
    setSelectedItems,
    isImporting,
    importProgress,
    setImportProgress,
    importedTitles,
    setImportedTitles,
    engine,
    importMovie: contextImportMovie,
    importSeries: contextImportSeries,
    importSelectedBatch: contextImportSelectedBatch,
  } = useMaxPlusImport();

  const [loading, setLoading] = useState<boolean>(items.length === 0);
  const [searchingRemote, setSearchingRemote] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Detalhes & Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [currentDetails, setCurrentDetails] = useState<MaxPlusContentDetails | null>(null);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<MaxPlusCatalogItem | null>(null);

  const [loadingImportedCheck, setLoadingImportedCheck] = useState<boolean>(false);

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

  // Carregar catálogo de uma categoria com suporte à paginação e cancelamento de requisições antigas
  const loadCategory = useCallback(async (categoryUrl: string, page: number = 1) => {
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      setLoading(true);
      setSearchingRemote(false);
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

      const data = await fetchCatalog(targetUrl, { signal: controller.signal });
      if (controller.signal.aborted) return;

      setItems(data);
      setHasMorePages(Array.isArray(data) && data.length >= 10);

      // Atualizar verificação de importados para a nova página
      if (Array.isArray(data) && data.length > 0) {
        checkImportedStatusRef.current(data);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      console.error('Erro ao carregar categoria:', err);
      setError(err?.message || 'Falha ao carregar catálogo.');
      toast.error('Erro ao carregar catálogo do MaxPlus');
      setItems([]);
      setHasMorePages(false);
    } finally {
      if (fetchAbortRef.current === controller) {
        setLoading(false);
        setSearchingRemote(false);
      }
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

  // Buscar conteúdos com resultados locais instantâneos + busca completa no servidor
  const handleSearch = useCallback(async (query: string) => {
    const term = query.trim();
    if (!term) return;

    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    const localMatches = searchLocalCatalogMemory(term);

    try {
      setError(null);
      setSelectedCategoryUrl('');
      setSearchQuery(term);
      setCurrentPage(1);
      setHasMorePages(false);
      setSelectedItems([]);

      if (localMatches.length > 0) {
        setItems(localMatches);
        setLoading(false);
        setSearchingRemote(true);
      } else {
        setItems([]);
        setLoading(true);
        setSearchingRemote(true);
      }

      const remoteData = await searchMaxPlus(term, { signal: controller.signal });
      if (controller.signal.aborted) return;

      // Mescla resultados do servidor primeiro e mantém eventuais correspondências locais extras sem duplicar
      const mergedMap = new Map<string, MaxPlusCatalogItem>();
      remoteData.forEach((item) => {
        if (item?.link) mergedMap.set(item.link, item);
      });
      localMatches.forEach((item) => {
        if (item?.link && !mergedMap.has(item.link)) {
          mergedMap.set(item.link, item);
        }
      });

      const finalData = Array.from(mergedMap.values());
      setItems(finalData);

      if (finalData.length === 0) {
        toast.info(`Nenhum resultado encontrado para "${term}"`);
      } else {
        toast.success(`${finalData.length} títulos encontrados para "${term}"`);
        checkImportedStatusRef.current(finalData);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      console.error('Erro na pesquisa:', err);
      if (localMatches.length === 0) {
        setError(err?.message || 'Falha ao buscar títulos.');
        toast.error('Erro ao realizar busca no MaxPlus');
      }
    } finally {
      if (fetchAbortRef.current === controller) {
        setLoading(false);
        setSearchingRemote(false);
      }
    }
  }, []);

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

  // Importar Filme único (roda em background global)
  const importMovie = useCallback(async (details: MaxPlusContentDetails, fallbackCat?: string) => {
    await contextImportMovie(details, fallbackCat);
    lastCheckedFingerprintRef.current = '';
    checkImportedStatusRef.current(undefined, true);
  }, [contextImportMovie]);

  // Importar Série única (roda em background global)
  const importSeries = useCallback(async (
    details: MaxPlusContentDetails,
    fallbackCat?: string,
    selectedEps?: { seasonNum: number; episodeNum: number }[]
  ) => {
    await contextImportSeries(details, fallbackCat, selectedEps);
    lastCheckedFingerprintRef.current = '';
    checkImportedStatusRef.current(undefined, true);
  }, [contextImportSeries]);

  // Importar itens selecionados em Lote (roda em background global)
  const importSelectedBatch = useCallback(async () => {
    await contextImportSelectedBatch(selectedItems);
    lastCheckedFingerprintRef.current = '';
    checkImportedStatusRef.current(undefined, true);
  }, [contextImportSelectedBatch, selectedItems]);

  // Carrega categoria inicial apenas se o catálogo ainda estiver vazio
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (items.length === 0) {
        loadCategory(MAXPLUS_CATEGORIES[0].url);
      } else {
        setLoading(false);
      }
    }
  }, [loadCategory, items.length]);

  return {
    items,
    filteredItems,
    loading,
    searchingRemote,
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
