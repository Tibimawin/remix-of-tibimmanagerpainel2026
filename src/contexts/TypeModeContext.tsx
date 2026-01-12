import React, { createContext, useContext, useEffect, useState } from 'react';

type TypeMode = 'singular' | 'plural';

interface TypeModeContextType {
  mode: TypeMode;
  setMode: (mode: TypeMode) => void;
  toggleMode: () => void;
}

const DEFAULT_MODE: TypeMode = 'singular';
const STORAGE_KEY = 'type-mode';

const TypeModeContext = createContext<TypeModeContextType | undefined>(undefined);

export const TypeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<TypeMode>(DEFAULT_MODE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'singular' || saved === 'plural') {
        setModeState(saved);
      }
    } catch {}
  }, []);

  const setMode = (newMode: TypeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {}
  };

  const toggleMode = () => {
    setMode(mode === 'singular' ? 'plural' : 'singular');
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