
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: (checked: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // Padrão continua escuro

  useEffect(() => {
    // Verifica preferência salva no localStorage
    const saved = localStorage.getItem('theme-preference');
    
    // Define o tema inicial
    const shouldBeDark = saved ? saved === 'dark' : true;
    setIsDark(shouldBeDark);
  }, []);

  useEffect(() => {
    // Aplica a classe dark e o color-scheme no html
    const htmlElement = document.documentElement;
    if (isDark) {
      htmlElement.classList.add('dark');
      htmlElement.style.colorScheme = 'dark';
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.style.colorScheme = 'light';
    }
    
    // Salva a preferência
    localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
};
