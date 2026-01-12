import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOptimizedBaserow } from './useOptimizedBaserow';
import { useConfig } from '@/contexts/ConfigContext';

interface SortOption {
  label: string;
  value: string;
}

interface UseOptimizedDataTableOptions {
  tableKey: string;
  columns: string[];
  sortOptions?: SortOption[];
  defaultSort?: string;
  formatters?: Record<string, (value: any) => any>;
  pageSize?: number;
}

export const useOptimizedDataTable = (options: UseOptimizedDataTableOptions) => {
  const { config } = useConfig();
  const {
    tableKey,
    columns,
    sortOptions = [],
    defaultSort = 'id_desc',
    formatters = {},
    pageSize = 50
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const tableId = config.tableIds?.[tableKey] || '';

  const {
    data,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    search,
    refresh
  } = useOptimizedBaserow(tableId, {
    pageSize,
    initialPageSize: 15, // Carregamento inicial mais rápido
    enableCache: true,
    enableBackground: true,
    maxConcurrentRequests: 4
  });

  // Aplicar busca quando o termo debounced muda
  useEffect(() => {
    search(debouncedSearch);
  }, [debouncedSearch, search]);

  // Dados formatados
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map(item => {
      const formatted = { ...item };
      
      // Aplicar formatadores
      Object.entries(formatters).forEach(([key, formatter]) => {
        if (formatted[key] !== undefined) {
          formatted[key] = formatter(formatted[key]);
        }
      });

      return formatted;
    });
  }, [data, formatters]);

  // Dados ordenados (ordenação local para dados já carregados)
  const sortedData = useMemo(() => {
    if (!formattedData || formattedData.length === 0) return [];

    const [field, direction] = sortBy.split('_');
    const isDesc = direction === 'desc';

    return [...formattedData].sort((a, b) => {
      let aVal = a[field] || a[field === 'id' ? 'id' : field];
      let bVal = b[field] || b[field === 'id' ? 'id' : field];

      // Tratamento especial para números
      if (field === 'id' || field === 'Temporada' || field === 'Episodio') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return isDesc ? 1 : -1;
      if (aVal > bVal) return isDesc ? -1 : 1;
      return 0;
    });
  }, [formattedData, sortBy]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleSort = useCallback((newSort: string) => {
    setSortBy(newSort);
  }, []);

  return {
    data: sortedData,
    loading,
    error,
    hasMore,
    totalCount,
    searchTerm,
    sortBy,
    columns,
    sortOptions,
    loadMore,
    handleSearch,
    handleSort,
    refresh
  };
};