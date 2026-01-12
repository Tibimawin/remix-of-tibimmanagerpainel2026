import { useState, useEffect, useCallback, useRef } from 'react';
import { useBaserowService } from '@/services/BaserowService';
import { toast } from '@/hooks/use-toast';

interface OptimizedData {
  results: any[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

interface UseOptimizedBaserowOptions {
  pageSize?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
  enableBackground?: boolean;
  initialPageSize?: number;
  maxConcurrentRequests?: number;
}

// Cache global para dados do Baserow
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const useOptimizedBaserow = (
  tableId: string, 
  options: UseOptimizedBaserowOptions = {}
) => {
  const {
    pageSize = 100,
    enableCache = true,
    cacheTimeout = 10 * 60 * 1000, // 10 minutos
    enableBackground = true,
    initialPageSize = 20,
    maxConcurrentRequests = 3
  } = options;

  const [data, setData] = useState<OptimizedData>({
    results: [],
    totalCount: 0,
    hasMore: true,
    loading: false,
    error: null
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const baserowService = useBaserowService();
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const requestQueueRef = useRef<Promise<any>[]>([]);

  // Função para obter dados do cache
  const getCachedData = useCallback((key: string) => {
    if (!enableCache) return null;
    
    const cached = dataCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      dataCache.delete(key);
      return null;
    }
    
    return cached.data;
  }, [enableCache]);

  // Função para armazenar dados no cache
  const setCachedData = useCallback((key: string, data: any) => {
    if (!enableCache) return;
    
    dataCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTimeout
    });
  }, [enableCache, cacheTimeout]);

  // Carregar dados com otimização agressiva
  const loadData = useCallback(async (
    page: number = 1, 
    search: string = '', 
    append: boolean = false
  ) => {
    // Cancelar requisições anteriores
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    // Usar página menor na primeira carga para acelerar
    const effectivePageSize = isInitialLoad ? initialPageSize : pageSize;
    const cacheKey = `${tableId}-${page}-${search}-${effectivePageSize}`;
    
    // Verificar cache primeiro
    const cachedData = getCachedData(cacheKey);
    if (cachedData && !append) {
      setData(prev => ({
        ...prev,
        results: cachedData.results,
        totalCount: cachedData.count,
        hasMore: cachedData.hasMore,
        loading: false,
        error: null
      }));
      setIsInitialLoad(false);
      return;
    }

    setData(prev => ({
      ...prev,
      loading: page === 1 ? true : prev.loading,
      error: null
    }));

    try {
      const result = await baserowService.getTableData(
        tableId,
        page,
        effectivePageSize,
        search
      );

      const hasMore = !!result.next;
      
      // Armazenar no cache
      setCachedData(cacheKey, {
        results: result.results,
        count: result.count,
        hasMore
      });

      setData(prev => ({
        ...prev,
        results: append ? [...prev.results, ...result.results] : result.results,
        totalCount: result.count,
        hasMore,
        loading: false,
        error: null
      }));

      setIsInitialLoad(false);

      // Pré-carregar próximas páginas em background se possível
      if (enableBackground && hasMore && page === 1 && !search) {
        setTimeout(() => {
          if (requestQueueRef.current.length < maxConcurrentRequests) {
            const preloadPromise = baserowService.getTableData(
              tableId,
              page + 1,
              pageSize,
              search
            ).then(nextResult => {
              const nextCacheKey = `${tableId}-${page + 1}-${search}-${pageSize}`;
              setCachedData(nextCacheKey, {
                results: nextResult.results,
                count: nextResult.count,
                hasMore: !!nextResult.next
              });
            }).catch(() => {
              // Ignorar erros de pré-carregamento
            });
            
            requestQueueRef.current.push(preloadPromise);
            preloadPromise.finally(() => {
              requestQueueRef.current = requestQueueRef.current.filter(p => p !== preloadPromise);
            });
          }
        }, 100);
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao carregar dados:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Erro ao carregar dados'
        }));
      }
    }
  }, [tableId, pageSize, initialPageSize, isInitialLoad, enableBackground, maxConcurrentRequests, baserowService, getCachedData, setCachedData]);

  // Carregar próxima página
  const loadMore = useCallback(() => {
    if (data.hasMore && !data.loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadData(nextPage, searchTerm, true);
    }
  }, [data.hasMore, data.loading, currentPage, searchTerm, loadData]);

  // Buscar com debounce
  const search = useCallback((term: string) => {
    setSearchTerm(term);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadData(1, term, false);
    }, 500); // Debounce de 500ms
  }, [loadData]);

  // Recarregar dados
  const refresh = useCallback(() => {
    // Limpar cache da tabela
    const keysToDelete = Array.from(dataCache.keys()).filter(key => 
      key.startsWith(`${tableId}-`)
    );
    keysToDelete.forEach(key => dataCache.delete(key));
    
    setCurrentPage(1);
    loadData(1, searchTerm, false);
  }, [tableId, searchTerm, loadData]);

  // Carregar dados iniciais
  useEffect(() => {
    if (tableId) {
      loadData(1, '', false);
    }
  }, [tableId, loadData]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    data: data.results,
    loading: data.loading,
    error: data.error,
    hasMore: data.hasMore,
    totalCount: data.totalCount,
    currentPage,
    searchTerm,
    loadMore,
    search,
    refresh
  };
};

// Hook específico para duplicados com processamento otimizado
export const useOptimizedDuplicates = (tableId: string, fields: string[]) => {
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const baserowService = useBaserowService();
  const workerRef = useRef<Worker | null>(null);

  const findDuplicates = useCallback(async () => {
    setLoading(true);
    setProgress(0);
    setError(null);
    setDuplicates([]);

    try {
      let allData: any[] = [];
      let page = 1;
      let hasMore = true;
      let totalProcessed = 0;

      // Carregar dados em lotes
      while (hasMore) {
        const batch = await baserowService.getTableData(tableId, page, 100);
        
        if (batch.results && batch.results.length > 0) {
          allData = allData.concat(batch.results);
          totalProcessed += batch.results.length;
          
          // Atualizar progresso
          setProgress(Math.min((totalProcessed / (batch.count || totalProcessed)) * 50, 50));
          
          page++;
          hasMore = !!batch.next;
        } else {
          hasMore = false;
        }

        // Pequena pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Processar duplicados em chunks para não travar a UI
      const chunkSize = 1000;
      const groups: { [key: string]: any[] } = {};
      
      for (let i = 0; i < allData.length; i += chunkSize) {
        const chunk = allData.slice(i, i + chunkSize);
        
        chunk.forEach(record => {
          const key = fields
            .map(field => (record[field] || '').toString().toLowerCase().trim())
            .join('-');
          
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(record);
        });

        // Atualizar progresso
        setProgress(50 + ((i + chunkSize) / allData.length) * 50);
        
        // Pequena pausa para manter a UI responsiva
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Filtrar apenas grupos com duplicados
      const duplicateGroups = Object.entries(groups)
        .filter(([_, records]) => records.length > 1)
        .map(([key, records]) => ({ key, records, fields }));

      setDuplicates(duplicateGroups);
      setProgress(100);
      
    } catch (error: any) {
      console.error('Erro ao buscar duplicados:', error);
      setError(error.message || 'Erro ao processar duplicados');
    } finally {
      setLoading(false);
    }
  }, [tableId, fields, baserowService]);

  return {
    duplicates,
    loading,
    progress,
    error,
    findDuplicates
  };
};