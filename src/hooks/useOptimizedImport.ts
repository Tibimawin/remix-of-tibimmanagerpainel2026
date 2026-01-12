import { useState, useCallback, useRef } from 'react';
import { useBaserowService } from '@/services/BaserowService';
import { toast } from '@/hooks/use-toast';

interface ImportProgress {
  loading: boolean;
  progress: number;
  currentStep: string;
  totalItems: number;
  processedItems: number;
  error: string | null;
}

interface ImportData {
  results: any[];
  totalCount: number;
  hasMore: boolean;
}

interface UseOptimizedImportOptions {
  pageSize?: number;
  maxConcurrentRequests?: number;
  onProgress?: (progress: ImportProgress) => void;
}

export const useOptimizedImport = (
  tableId: string,
  options: UseOptimizedImportOptions = {}
) => {
  const {
    pageSize = 200,
    maxConcurrentRequests = 3,
    onProgress
  } = options;

  const [data, setData] = useState<ImportData>({
    results: [],
    totalCount: 0,
    hasMore: false
  });

  const [progress, setProgress] = useState<ImportProgress>({
    loading: false,
    progress: 0,
    currentStep: '',
    totalItems: 0,
    processedItems: 0,
    error: null
  });

  const baserowService = useBaserowService();
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateProgress = useCallback((updates: Partial<ImportProgress>) => {
    setProgress(prev => {
      const newProgress = { ...prev, ...updates };
      onProgress?.(newProgress);
      return newProgress;
    });
  }, [onProgress]);

  // Carregar dados com processamento otimizado em lotes paralelos
  const loadImportData = useCallback(async (
    sourceTableId: string,
    sourceService: any,
    searchTerm: string = ''
  ) => {
    // Cancelar requisições anteriores
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    updateProgress({
      loading: true,
      progress: 0,
      currentStep: 'Iniciando carregamento de dados...',
      totalItems: 0,
      processedItems: 0,
      error: null
    });

    try {
      let allData: any[] = [];
      let page = 1;
      let hasMore = true;
      let totalCount = 0;

      updateProgress({
        currentStep: 'Carregando dados da fonte...',
        progress: 5
      });

      // Primeira requisição para obter total
      const firstBatch = await sourceService.getTableData(
        sourceTableId,
        1,
        pageSize,
        searchTerm
      );

      if (firstBatch.results && firstBatch.results.length > 0) {
        allData = firstBatch.results;
        totalCount = firstBatch.count || firstBatch.results.length;
        hasMore = !!firstBatch.next;
        page = 2;

        updateProgress({
          totalItems: totalCount,
          processedItems: firstBatch.results.length,
          progress: Math.min((firstBatch.results.length / totalCount) * 40, 40),
          currentStep: `Carregados ${firstBatch.results.length} de ${totalCount} itens...`
        });
      } else {
        updateProgress({
          loading: false,
          progress: 100,
          currentStep: 'Concluído',
          error: null
        });

        setData({
          results: [],
          totalCount: 0,
          hasMore: false
        });
        return;
      }

      // Carregar dados restantes em lotes paralelos
      while (hasMore) {
        const promises = [];
        
        // Fazer até N requisições paralelas
        for (let i = 0; i < maxConcurrentRequests && hasMore; i++) {
          const currentPage = page + i;
          promises.push(
            sourceService.getTableData(sourceTableId, currentPage, pageSize, searchTerm)
              .then(batch => ({ batch, pageNum: currentPage }))
              .catch(error => ({ error, pageNum: currentPage }))
          );
        }
        
        const results = await Promise.allSettled(promises);
        let batchesProcessed = 0;
        let hasError = false;
        
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const { batch, error } = result.value;
            
            if (error) {
              console.error('Erro em lote paralelo:', error);
              hasError = true;
              continue;
            }
            
            if (batch && batch.results && batch.results.length > 0) {
              allData = allData.concat(batch.results);
              batchesProcessed++;
              
              const currentProgress = Math.min((allData.length / totalCount) * 40, 40);
              updateProgress({
                processedItems: allData.length,
                progress: currentProgress,
                currentStep: `Carregados ${allData.length} de ${totalCount} itens...`
              });
              
              if (!batch.next) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }
        }
        
        if (hasError && batchesProcessed === 0) {
          throw new Error('Erro ao carregar dados em lotes paralelos');
        }
        
        page += batchesProcessed || maxConcurrentRequests;
        
        if (batchesProcessed === 0) {
          hasMore = false;
        }

        // Pequena pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      updateProgress({
        progress: 50,
        currentStep: 'Processando e organizando dados...',
        processedItems: allData.length
      });

      // Processar e otimizar dados em chunks
      const chunkSize = 1000;
      const processedData = [];
      
      for (let i = 0; i < allData.length; i += chunkSize) {
        const chunk = allData.slice(i, i + chunkSize);
        
        // Processar chunk (limpar, validar, etc.)
        const processedChunk = chunk.map(item => ({
          ...item,
          // Adicionar campos processados se necessário
          _processed: true,
          _originalId: item.id
        }));
        
        processedData.push(...processedChunk);

        // Atualizar progresso de processamento
        const processProgress = 50 + ((i + chunkSize) / allData.length) * 40;
        updateProgress({
          progress: Math.min(processProgress, 90),
          currentStep: `Processando dados... ${Math.min(i + chunkSize, allData.length)} de ${allData.length}`
        });
        
        // Yield controle para manter UI responsiva
        if (i % (chunkSize * 2) === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      updateProgress({
        progress: 95,
        currentStep: 'Finalizando...'
      });

      setData({
        results: processedData,
        totalCount,
        hasMore: false
      });

      updateProgress({
        loading: false,
        progress: 100,
        currentStep: `Concluído! ${processedData.length} itens carregados`,
        processedItems: processedData.length,
        error: null
      });

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao carregar dados de importação:', error);
        updateProgress({
          loading: false,
          error: error.message || 'Erro ao carregar dados'
        });
        toast.error('Erro ao carregar dados para importação');
      }
    }
  }, [baserowService, pageSize, maxConcurrentRequests, updateProgress]);

  // Importar dados selecionados com progresso
  const importSelectedData = useCallback(async (
    selectedItems: any[],
    targetTableId: string,
    fieldMapping: Record<string, string> = {}
  ) => {
    if (selectedItems.length === 0) {
      toast.error('Nenhum item selecionado para importação');
      return;
    }

    updateProgress({
      loading: true,
      progress: 0,
      currentStep: 'Iniciando importação...',
      totalItems: selectedItems.length,
      processedItems: 0,
      error: null
    });

    try {
      let importedCount = 0;
      let errorCount = 0;
      const batchSize = 10; // Importar em lotes menores para estabilidade

      for (let i = 0; i < selectedItems.length; i += batchSize) {
        const batch = selectedItems.slice(i, i + batchSize);
        
        updateProgress({
          currentStep: `Importando lote ${Math.floor(i / batchSize) + 1}...`,
          progress: (i / selectedItems.length) * 90
        });

        // Processar lote
        for (const item of batch) {
          try {
            // Mapear campos se necessário
            const mappedItem = Object.keys(fieldMapping).length > 0
              ? Object.entries(fieldMapping).reduce((acc, [source, target]) => {
                  acc[target] = item[source];
                  return acc;
                }, {} as any)
              : item;

            // Remover campos internos
            delete mappedItem._processed;
            delete mappedItem._originalId;
            delete mappedItem.id;

            await baserowService.createRow(targetTableId, mappedItem);
            importedCount++;
          } catch (error: any) {
            console.error(`Erro ao importar item:`, error);
            errorCount++;
          }

          updateProgress({
            processedItems: importedCount + errorCount,
            progress: ((importedCount + errorCount) / selectedItems.length) * 90
          });
        }

        // Pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      updateProgress({
        loading: false,
        progress: 100,
        currentStep: `Concluído! ${importedCount} itens importados`,
        processedItems: selectedItems.length,
        error: errorCount > 0 ? `${errorCount} itens com erro` : null
      });

      if (importedCount > 0) {
        toast.success(`${importedCount} itens importados com sucesso!`);
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} itens não puderam ser importados`);
      }

      return { importedCount, errorCount };

    } catch (error: any) {
      console.error('Erro na importação:', error);
      updateProgress({
        loading: false,
        error: error.message || 'Erro durante a importação'
      });
      toast.error('Erro durante a importação');
      throw error;
    }
  }, [baserowService, updateProgress]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    data: data.results,
    totalCount: data.totalCount,
    progress,
    loadImportData,
    importSelectedData,
    cleanup
  };
};