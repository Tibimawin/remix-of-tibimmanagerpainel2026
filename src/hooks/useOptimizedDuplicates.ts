import { useState, useCallback, useMemo, useRef } from 'react';
import { useBaserowService } from '@/services/BaserowService';
import { getValueByPossibleKeys } from '@/utils/baserowHelpers';

import { safeJsonStringify } from '@/utils/safeJson';

export interface DuplicateGroup {
  key: string;
  records: any[];
  fields: string[];
}

export type MatchMode = 'nome' | 'nome-tipo' | 'nome-link' | 'link' | 'serie-t-e' | 'serie-t-e-link';

export const MATCH_MODE_FIELDS: Record<MatchMode, string[]> = {
  nome: ['Nome'],
  'nome-tipo': ['Nome', 'Tipo'],
  'nome-link': ['Nome', 'Link'],
  link: ['Link'],
  'serie-t-e': ['Serie', 'Temporada', 'Episodio'],
  'serie-t-e-link': ['Serie', 'Temporada', 'Episodio', 'Link'],
};

export const MATCH_MODE_LABELS: Record<MatchMode, string> = {
  nome: 'Mesmo nome',
  'nome-tipo': 'Mesmo nome + tipo',
  'nome-link': 'Mesmo nome + link',
  link: 'Mesmo link',
  'serie-t-e': 'Série + Temporada + Episódio',
  'serie-t-e-link': 'Série + Temporada + Episódio + Link',
};

/** Normaliza um valor para comparação: minúsculo, sem acentos, sem pontuação extra */
export const normalizeValue = (value: any): string => {
  if (value === undefined || value === null) return '';
  let raw: any = value;
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      raw = value.map(v => (typeof v === 'object' ? (v?.value ?? v?.name ?? v?.url ?? '') : String(v))).join(' ');
    } else {
      raw = value?.value ?? value?.name ?? value?.url ?? value?.title ?? safeJsonStringify(value);
    }
  }
  return String(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9:/._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildKey = (record: any, fields: string[]): string | null => {
  const parts = fields.map(field => normalizeValue(getValueByPossibleKeys(record, field)));
  // A chave principal (primeiro campo) precisa existir; os demais entram como "vazio"
  if (!parts[0]) return null;
  return parts.map(p => p || '∅').join('|');
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Options {
  initialLimit?: number;
  batchSize?: number;
}

export const useOptimizedDuplicates = (
  tableId: string,
  fieldsOrMode: string[] | MatchMode = 'nome-link',
  options: Options = {}
) => {
  const { initialLimit = 20000, batchSize = 200 } = options;

  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsScanned, setRecordsScanned] = useState(0);
  const [currentLimit, setCurrentLimit] = useState(initialLimit);
  const [hasMoreData, setHasMoreData] = useState(false);

  const [matchMode, setMatchMode] = useState<MatchMode>(
    Array.isArray(fieldsOrMode) ? 'nome-link' : fieldsOrMode
  );

  const baserowService = useBaserowService();
  const cancelRef = useRef(false);

  const fields = useMemo(() => MATCH_MODE_FIELDS[matchMode], [matchMode]);

  const fetchPage = useCallback(
    async (page: number): Promise<{ results: any[]; count: number } | null> => {
      let lastError: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const data = await baserowService.getTableData(tableId, page, batchSize);
          return { results: data?.results || [], count: data?.count || 0 };
        } catch (err) {
          lastError = err;
          await sleep(300 * attempt);
        }
      }
      console.error(`Falha ao carregar página ${page} após 3 tentativas`, lastError);
      return null;
    },
    [baserowService, batchSize]
  );

  const scan = useCallback(
    async (limit: number) => {
      if (!tableId) {
        setError('Tabela não configurada');
        return;
      }

      cancelRef.current = false;
      setLoading(true);
      setError(null);
      setProgress(0);
      setRawRecords([]);
      setRecordsScanned(0);

      try {
        const all: any[] = [];
        let page = 1;
        let total = 0;
        let failedPages = 0;

        while (all.length < limit && !cancelRef.current) {
          const result = await fetchPage(page);

          if (!result) {
            failedPages++;
            if (failedPages >= 3) throw new Error('Falha repetida ao carregar dados do servidor.');
            page++;
            continue;
          }

          if (page === 1) {
            total = result.count;
            setTotalRecords(total);
          }

          if (result.results.length === 0) break;

          all.push(...result.results);
          setRecordsScanned(all.length);

          const target = total > 0 ? Math.min(total, limit) : limit;
          setProgress(Math.min(99, Math.round((all.length / target) * 100)));

          if (result.results.length < batchSize) break;
          page++;
          await sleep(20);
        }

        const trimmed = all.slice(0, limit);
        setRawRecords(trimmed);
        setRecordsScanned(trimmed.length);
        setHasMoreData(total > trimmed.length);
        setCurrentLimit(limit);
        setProgress(100);
      } catch (err: any) {
        console.error('Erro ao buscar duplicados:', err);
        setError(err?.message || 'Erro ao processar duplicados');
      } finally {
        setLoading(false);
      }
    },
    [tableId, fetchPage, batchSize]
  );

  const findDuplicates = useCallback(
    (expandLimit: boolean = false) => scan(expandLimit ? currentLimit + initialLimit : currentLimit),
    [scan, currentLimit, initialLimit]
  );

  const expandSearch = useCallback(() => scan(currentLimit + initialLimit), [scan, currentLimit, initialLimit]);

  const scanAll = useCallback(() => scan(Number.MAX_SAFE_INTEGER), [scan]);

  const cancelScan = useCallback(() => {
    cancelRef.current = true;
  }, []);

  /** Remove registros já excluídos sem refazer a varredura completa */
  const removeRecordsLocally = useCallback((ids: Array<string | number>) => {
    const set = new Set(ids.map(String));
    setRawRecords(prev => prev.filter(r => !set.has(String(r.id))));
  }, []);

  const duplicates: DuplicateGroup[] = useMemo(() => {
    const groups = new Map<string, any[]>();

    for (const record of rawRecords) {
      const key = buildKey(record, fields);
      if (!key) continue;
      const bucket = groups.get(key);
      if (bucket) bucket.push(record);
      else groups.set(key, [record]);
    }

    return Array.from(groups.entries())
      .filter(([, records]) => records.length > 1)
      .map(([key, records]) => ({
        key,
        records: [...records].sort((a, b) => Number(a.id || 0) - Number(b.id || 0)),
        fields,
      }))
      .sort((a, b) => b.records.length - a.records.length);
  }, [rawRecords, fields]);

  const totalExcedentes = useMemo(
    () => duplicates.reduce((acc, g) => acc + g.records.length - 1, 0),
    [duplicates]
  );

  return {
    duplicates,
    loading,
    progress,
    error,
    findDuplicates,
    expandSearch,
    scanAll,
    cancelScan,
    removeRecordsLocally,
    currentLimit,
    totalRecords,
    recordsScanned,
    hasMoreData,
    totalExcedentes,
    matchMode,
    setMatchMode,
  };
};
