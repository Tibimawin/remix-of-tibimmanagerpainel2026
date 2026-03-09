import { useState, useCallback, useEffect } from 'react';

export interface CleanupHistoryEntry {
  id: string;
  date: string;
  tableId: string;
  baseUrl: string;
  recordsDeleted: number;
  totalRecords: number;
  status: 'success' | 'partial' | 'error';
  durationSeconds: number;
}

const STORAGE_KEY = 'cleanup_history';
const MAX_ENTRIES = 50;

const loadHistory = (): CleanupHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const useCleanupHistory = () => {
  const [history, setHistory] = useState<CleanupHistoryEntry[]>(loadHistory);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch { /* ignore quota errors */ }
  }, [history]);

  const addEntry = useCallback((entry: Omit<CleanupHistoryEntry, 'id' | 'date'>) => {
    const newEntry: CleanupHistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toLocaleString('pt-BR'),
    };
    setHistory(prev => [newEntry, ...prev].slice(0, MAX_ENTRIES));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addEntry, clearHistory };
};
