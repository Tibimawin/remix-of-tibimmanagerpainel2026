import React, { createContext, useContext, useEffect, useState } from 'react';

export type TypeMode = 'singular' | 'plural' | 'tibim';

interface TypeModeContextType {
  mode: TypeMode;
  setMode: (mode: TypeMode) => void;
  toggleMode: () => void;
}

const DEFAULT_MODE: TypeMode = 'singular';
const STORAGE_KEY = 'type-mode';
const MODE_CYCLE: TypeMode[] = ['singular', 'plural', 'tibim'];

const TypeModeContext = createContext<TypeModeContextType | undefined>(undefined);

export const TypeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<TypeMode>(DEFAULT_MODE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'singular' || saved === 'plural' || saved === 'tibim') {
        setModeState(saved as TypeMode);
      }
    } catch {}
  }, []);

  const setMode = (newMode: TypeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {}
  };

  // Cicla entre os três modos: singular → plural → tibim → singular
  const toggleMode = () => {
    const currentIndex = MODE_CYCLE.indexOf(mode);
    const nextIndex = (currentIndex + 1) % MODE_CYCLE.length;
    setMode(MODE_CYCLE[nextIndex]);
  };

  return (
    <TypeModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </TypeModeContext.Provider>
  );
};

export const useTypeMode = () => {
  const ctx = useContext(TypeModeContext);
  if (!ctx) throw new Error('useTypeMode deve ser usado dentro de TypeModeProvider');
  return ctx;
};