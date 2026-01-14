
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ColorOption {
  name: string;
  hue: number;
  preview: string;
}

export const colorOptions: ColorOption[] = [
  { name: 'Esmeralda', hue: 160, preview: 'from-emerald-400 to-emerald-600' },
  { name: 'Azul', hue: 217, preview: 'from-blue-400 to-blue-600' },
  { name: 'Violeta', hue: 271, preview: 'from-violet-400 to-violet-600' },
  { name: 'Rosa', hue: 330, preview: 'from-pink-400 to-pink-600' },
  { name: 'Âmbar', hue: 38, preview: 'from-amber-400 to-amber-600' },
  { name: 'Vermelho', hue: 0, preview: 'from-red-400 to-red-600' },
  { name: 'Ciano', hue: 187, preview: 'from-cyan-400 to-cyan-600' },
  { name: 'Lima', hue: 84, preview: 'from-lime-400 to-lime-600' },
];

interface CustomColorContextType {
  primaryHue: number;
  setColor: (hue: number) => void;
  currentColor: ColorOption | undefined;
}

const CustomColorContext = createContext<CustomColorContextType | undefined>(undefined);

export const CustomColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [primaryHue, setPrimaryHue] = useState<number>(() => {
    const saved = localStorage.getItem('custom-primary-hue');
    return saved ? parseInt(saved, 10) : 160; // Default: Emerald
  });

  useEffect(() => {
    // Aplicar a cor customizada nas variáveis CSS
    const root = document.documentElement;
    root.style.setProperty('--primary-hue', primaryHue.toString());
    
    // Salvar preferência
    localStorage.setItem('custom-primary-hue', primaryHue.toString());
  }, [primaryHue]);

  const setColor = (hue: number) => {
    setPrimaryHue(hue);
  };

  const currentColor = colorOptions.find(c => c.hue === primaryHue);

  return (
    <CustomColorContext.Provider value={{ primaryHue, setColor, currentColor }}>
      {children}
    </CustomColorContext.Provider>
  );
};

export const useCustomColor = () => {
  const context = useContext(CustomColorContext);
  if (!context) {
    throw new Error('useCustomColor deve ser usado dentro de CustomColorProvider');
  }
  return context;
};
