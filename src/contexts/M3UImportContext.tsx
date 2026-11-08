import React, { createContext, useContext, useState, useCallback } from 'react';

export interface M3UImportProgress {
  isImporting: boolean;
  isPaused: boolean;
  current: number;
  total: number;
  percentage: number;
  currentType: string;
  currentItem: string;
  stats: { filmes: number; series: number; episodios: number; canais: number };
  startedAt: number | null;
  itemsPerSecond: number;
}

interface M3UImportContextValue {
  progress: M3UImportProgress;
  updateProgress: (data: Partial<M3UImportProgress>) => void;
  clearProgress: () => void;
}

const defaultProgress: M3UImportProgress = {
  isImporting: false,
  isPaused: false,
  current: 0,
  total: 0,
  percentage: 0,
  currentType: '',
  currentItem: '',
  stats: { filmes: 0, series: 0, episodios: 0, canais: 0 },
  startedAt: null,
  itemsPerSecond: 0,
};

const M3UImportContext = createContext<M3UImportContextValue>({
  progress: defaultProgress,
  updateProgress: () => {},
  clearProgress: () => {},
});

export const M3UImportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<M3UImportProgress>(defaultProgress);

  const updateProgress = useCallback((data: Partial<M3UImportProgress>) => {
    setProgress(prev => {
      const next = { ...prev, ...data };
      // Auto-set startedAt on first import tick
      if (next.isImporting && !next.startedAt) {
        next.startedAt = Date.now();
      }
      // Calculate items/second
      if (next.startedAt && next.current > 0) {
        const elapsedSec = (Date.now() - next.startedAt) / 1000;
        next.itemsPerSecond = elapsedSec > 0 ? Math.round((next.current / elapsedSec) * 10) / 10 : 0;
      }
      return next;
    });
  }, []);

  const clearProgress = useCallback(() => {
    setProgress(defaultProgress);
  }, []);

  return (
    <M3UImportContext.Provider value={{ progress, updateProgress, clearProgress }}>
      {children}
    </M3UImportContext.Provider>
  );
};

export const useM3UImport = () => useContext(M3UImportContext);
