import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  MaxPlusCatalogItem,
  MaxPlusContentDetails,
  MAXPLUS_CATEGORIES,
} from '@/services/maxplusApi';
import {
  MaxPlusImportEngine,
  ImportProgress,
  getTitleMatchVariants,
} from '@/services/maxplusImportEngine';
import { useConfig } from '@/contexts/ConfigContext';
import { useBaserowService } from '@/services/BaserowService';
import { isDemoSessionActive } from '@/services/BaserowDemoData';
import { toast } from 'sonner';

interface MaxPlusImportContextValue {
  // Catálogo persistente entre trocas de página
  items: MaxPlusCatalogItem[];
  setItems: React.Dispatch<React.SetStateAction<MaxPlusCatalogItem[]>>;
  selectedCategoryUrl: string;
  setSelectedCategoryUrl: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  hasMorePages: boolean;
  setHasMorePages: React.Dispatch<React.SetStateAction<boolean>>;
  filterMode: 'all' | 'imported' | 'pending';
  setFilterMode: React.Dispatch<React.SetStateAction<'all' | 'imported' | 'pending'>>;
  selectedItems: MaxPlusCatalogItem[];
  setSelectedItems: React.Dispatch<React.SetStateAction<MaxPlusCatalogItem[]>>;

  // Estado global de importação (persiste em background ao navegar)
  isImporting: boolean;
  importProgress: ImportProgress;
  setImportProgress: React.Dispatch<React.SetStateAction<ImportProgress>>;
  importedTitles: Set<string>;
  setImportedTitles: React.Dispatch<React.SetStateAction<Set<string>>>;

  // Motor & ações de importação em background
  engine: MaxPlusImportEngine;
  importMovie: (details: MaxPlusContentDetails, fallbackCat?: string) => Promise<void>;
  importSeries: (
    details: MaxPlusContentDetails,
    fallbackCat?: string,
    selectedEps?: { seasonNum: number; episodeNum: number }[]
  ) => Promise<void>;
  importSelectedBatch: (itemsToImport?: MaxPlusCatalogItem[]) => Promise<void>;
}

const defaultProgress: ImportProgress = {
  active: false,
  total: 0,
  current: 0,
  currentTitle: '',
  stage: '',
};

const MaxPlusImportContext = createContext<MaxPlusImportContextValue | null>(null);

export const MaxPlusImportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config, isConfigured } = useConfig();
  const baserowService = useBaserowService();

  const [items, setItems] = useState<MaxPlusCatalogItem[]>([]);
  const [selectedCategoryUrl, setSelectedCategoryUrl] = useState<string>(MAXPLUS_CATEGORIES[0].url);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMorePages, setHasMorePages] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'imported' | 'pending'>('all');
  const [selectedItems, setSelectedItems] = useState<MaxPlusCatalogItem[]>([]);

  const [importProgress, setImportProgress] = useState<ImportProgress>(defaultProgress);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const conteudosId = config.tableIds?.conteudos || config.conteudosTableId || '';
  const episodiosId = config.tableIds?.episodios || config.episodiosTableId || '';

  const [importedTitles, setImportedTitles] = useState<Set<string>>(() =>
    MaxPlusImportEngine.getKnownImportedTitles(conteudosId)
  );

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

  const engine = useMemo(() => {
    return new MaxPlusImportEngine(baserowService, conteudosId, episodiosId);
  }, [baserowService, conteudosId, episodiosId]);

  const engineRef = useRef(engine);
  engineRef.current = engine;

  const isConfiguredRef = useRef(isConfigured);
  isConfiguredRef.current = isConfigured;

  const selectedItemsRef = useRef(selectedItems);
  selectedItemsRef.current = selectedItems;

  const markTitleLocally = useCallback((title: string) => {
    const variants = getTitleMatchVariants(title);
    if (variants.length > 0) {
      setImportedTitles(prev => {
        const next = new Set(prev);
        variants.forEach(v => next.add(v));
        return next;
      });
    }
  }, []);

  const importMovie = useCallback(async (details: MaxPlusContentDetails, fallbackCat?: string) => {
    if (!isConfiguredRef.current && !isDemoSessionActive()) {
      toast.error('Configure as credenciais e tabelas do Baserow nas Configurações.');
      return;
    }

    try {
      setIsImporting(true);
      setImportProgress({
        active: true,
        total: 1,
        current: 1,
        currentTitle: details.nome,
        stage: `Importando filme "${details.nome}"...`,
      });
      toast.loading(`Importando filme "${details.nome}"...`, { id: 'import-movie' });

      const res = await engineRef.current.importMovie(details, fallbackCat);
      markTitleLocally(details.nome);

      if (res?.updated) {
        toast.success(`Filme "${details.nome}" atualizado no Baserow com sucesso!`, { id: 'import-movie' });
      } else {
        toast.success(`Filme "${details.nome}" importado com sucesso!`, { id: 'import-movie' });
      }
    } catch (err: any) {
      console.error('Erro ao importar filme:', err);
      toast.error(`Falha ao importar filme: ${err?.message || 'Erro desconhecido'}`, { id: 'import-movie' });
    } finally {
      setIsImporting(false);
      setImportProgress(defaultProgress);
    }
  }, [markTitleLocally]);

  const importSeries = useCallback(async (
    details: MaxPlusContentDetails,
    fallbackCat?: string,
    selectedEps?: { seasonNum: number; episodeNum: number }[]
  ) => {
    if (!isConfiguredRef.current && !isDemoSessionActive()) {
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

      markTitleLocally(details.nome);

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
    } catch (err: any) {
      console.error('Erro ao importar série:', err);
      toast.error(`Falha ao importar série: ${err?.message || 'Erro desconhecido'}`, { id: 'import-series' });
    } finally {
      setIsImporting(false);
      setImportProgress(defaultProgress);
    }
  }, [markTitleLocally]);

  const importSelectedBatch = useCallback(async (itemsToImport?: MaxPlusCatalogItem[]) => {
    const targetItems = itemsToImport || selectedItemsRef.current;
    if (targetItems.length === 0) {
      toast.info('Selecione pelo menos um item para importar.');
      return;
    }
    if (!isConfiguredRef.current && !isDemoSessionActive()) {
      toast.error('Configure as credenciais e tabelas do Baserow nas Configurações.');
      return;
    }

    try {
      setIsImporting(true);
      toast.loading(`Importando ${targetItems.length} itens em lote...`, { id: 'import-batch' });

      const result = await engineRef.current.importBatch(targetItems, (progress) => {
        setImportProgress(progress);
      });

      if (result.succeededTitles && result.succeededTitles.length > 0) {
        result.succeededTitles.forEach(title => markTitleLocally(title));
      }

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
      setImportProgress(defaultProgress);
    }
  }, [markTitleLocally]);

  const value = useMemo<MaxPlusImportContextValue>(() => ({
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
    importMovie,
    importSeries,
    importSelectedBatch,
  }), [
    items,
    selectedCategoryUrl,
    searchQuery,
    currentPage,
    hasMorePages,
    filterMode,
    selectedItems,
    isImporting,
    importProgress,
    importedTitles,
    engine,
    importMovie,
    importSeries,
    importSelectedBatch,
  ]);

  return (
    <MaxPlusImportContext.Provider value={value}>
      {children}
    </MaxPlusImportContext.Provider>
  );
};

export const useMaxPlusImport = () => {
  const ctx = useContext(MaxPlusImportContext);
  if (!ctx) {
    throw new Error('useMaxPlusImport must be used within a MaxPlusImportProvider');
  }
  return ctx;
};
