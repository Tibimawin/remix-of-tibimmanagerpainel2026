import { useState, useCallback, useRef } from 'react';
import { useBaserowService } from '@/services/BaserowService';

interface DuplicateGroup {
  key: string;
  records: any[];
  fields: string[];
}

// Hook específico para duplicados com processamento ultra-otimizado
export const useOptimizedDuplicates = (tableId: string, fields: string[], initialLimit: number = 5000) => {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentLimit, setCurrentLimit] = useState(initialLimit);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(false);
  const baserowService = useBaserowService();
  const workerRef = useRef<Worker | null>(null);

  const findDuplicates = useCallback(async (expandLimit: boolean = false) => {
    setLoading(true);
    setProgress(0);
    setError(null);
    setDuplicates([]);

    try {
      let allData: any[] = [];
      let page = 1;
      let hasMore = true;
      let totalProcessed = 0;
      let actualTotalCount = 0;

      // Determinar limite atual
      const limit = expandLimit ? currentLimit + initialLimit : currentLimit;

      // Carregar dados em lotes maiores e paralelos com limite
      const batchSize = 200;
      const maxParallelRequests = 3;
      
      while (hasMore && totalProcessed < limit) {
        const promises = [];
        
        // Fazer até 3 requisições paralelas
        for (let i = 0; i < maxParallelRequests && hasMore && totalProcessed + (batchSize * (i + 1)) <= limit; i++) {
          promises.push(
            baserowService.getTableData(tableId, page + i, batchSize)
              .then(batch => ({ batch, pageNum: page + i }))
          );
        }
        
        const results = await Promise.allSettled(promises);
        let batchesProcessed = 0;
        
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const { batch, pageNum } = result.value;
            
            if (batch.results && batch.results.length > 0) {
              // Limitar registros adicionados para não exceder o limite
              const remainingSlots = limit - totalProcessed;
              const recordsToAdd = batch.results.slice(0, remainingSlots);
              
              allData = allData.concat(recordsToAdd);
              totalProcessed += recordsToAdd.length;
              batchesProcessed++;
              
              // Guardar contagem total real
              if (actualTotalCount === 0) {
                actualTotalCount = batch.count || 0;
              }
              
              // Atualizar progresso baseado no limite atual
              setProgress(Math.min((totalProcessed / limit) * 50, 50));
              
              if (!batch.next || totalProcessed >= limit) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }
        }
        
        page += batchesProcessed || 1;
        
        if (batchesProcessed === 0 || totalProcessed >= limit) {
          hasMore = false;
        }

        // Pausa menor para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Atualizar informações sobre dados restantes
      setTotalRecords(actualTotalCount);
      setHasMoreData(totalProcessed < actualTotalCount);
      if (expandLimit) {
        setCurrentLimit(limit);
      }

      // Processar duplicados usando Map para performance máxima
      const groups = new Map<string, any[]>();
      const chunkSize = 2000;
      
      for (let i = 0; i < allData.length; i += chunkSize) {
        const chunk = allData.slice(i, i + chunkSize);
        
        // Processar chunk usando algoritmo otimizado
        chunk.forEach(record => {
          const key = fields
            .map(field => {
              const value = record[field];
              return value ? value.toString().toLowerCase().trim() : '';
            })
            .filter(v => v.length > 0)
            .join('|');
          
          if (key && key !== '') {
            if (!groups.has(key)) {
              groups.set(key, []);
            }
            groups.get(key)!.push(record);
          }
        });

        // Atualizar progresso de processamento
        setProgress(50 + ((i + chunkSize) / allData.length) * 50);
        
        // Yield controle para manter UI responsiva
        if (i % (chunkSize * 2) === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      // Filtrar apenas grupos com duplicados e ordenar por tamanho
      const duplicateGroups = Array.from(groups.entries())
        .filter(([_, records]) => records.length > 1)
        .map(([key, records]) => ({ 
          key, 
          records: records.sort((a, b) => (a.id || 0) - (b.id || 0)), 
          fields 
        }))
        .sort((a, b) => b.records.length - a.records.length); // Maiores grupos primeiro

      setDuplicates(duplicateGroups);
      setProgress(100);
      
    } catch (error: any) {
      console.error('Erro ao buscar duplicados:', error);
      setError(error.message || 'Erro ao processar duplicados');
    } finally {
      setLoading(false);
    }
  }, [tableId, fields, baserowService, currentLimit, initialLimit]);

  const expandSearch = useCallback(() => {
    findDuplicates(true);
  }, [findDuplicates]);

  return {
    duplicates,
    loading,
    progress,
    error,
    findDuplicates,
    expandSearch,
    currentLimit,
    totalRecords,
    hasMoreData
  };
};