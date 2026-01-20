import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const CUSTOMIZATION_KEY = 'panel-customization';

// Fontes disponíveis
export const AVAILABLE_FONTS = [
  { id: 'system', name: 'Sistema (Padrão)', value: 'ui-sans-serif, system-ui, sans-serif' },
  { id: 'inter', name: 'Inter', value: '"Inter", sans-serif' },
  { id: 'roboto', name: 'Roboto', value: '"Roboto", sans-serif' },
  { id: 'poppins', name: 'Poppins', value: '"Poppins", sans-serif' },
  { id: 'montserrat', name: 'Montserrat', value: '"Montserrat", sans-serif' },
  { id: 'opensans', name: 'Open Sans', value: '"Open Sans", sans-serif' },
  { id: 'lato', name: 'Lato', value: '"Lato", sans-serif' },
  { id: 'nunito', name: 'Nunito', value: '"Nunito", sans-serif' },
  { id: 'raleway', name: 'Raleway', value: '"Raleway", sans-serif' },
  { id: 'ubuntu', name: 'Ubuntu', value: '"Ubuntu", sans-serif' },
];

// Temas de cores disponíveis
export const AVAILABLE_THEMES = [
  { id: 'default', name: 'Padrão (Laranja)', primary: '24 95% 53%', accent: '24 95% 53%' },
  { id: 'blue', name: 'Azul', primary: '217 91% 60%', accent: '217 91% 60%' },
  { id: 'green', name: 'Verde', primary: '142 76% 36%', accent: '142 76% 36%' },
  { id: 'purple', name: 'Roxo', primary: '262 83% 58%', accent: '262 83% 58%' },
  { id: 'pink', name: 'Rosa', primary: '330 81% 60%', accent: '330 81% 60%' },
  { id: 'red', name: 'Vermelho', primary: '0 84% 60%', accent: '0 84% 60%' },
  { id: 'teal', name: 'Teal', primary: '174 84% 32%', accent: '174 84% 32%' },
  { id: 'amber', name: 'Âmbar', primary: '38 92% 50%', accent: '38 92% 50%' },
  { id: 'indigo', name: 'Índigo', primary: '239 84% 67%', accent: '239 84% 67%' },
  { id: 'cyan', name: 'Ciano', primary: '186 94% 41%', accent: '186 94% 41%' },
];

// Idiomas disponíveis
export const AVAILABLE_LANGUAGES = [
  { id: 'pt', name: 'Português', flag: '🇧🇷' },
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
];

interface FavoritePalette {
  id: string;
  name: string;
  color: string; // HEX color
  createdAt: number;
}

interface CustomizationSettings {
  fontId: string;
  themeId: string;
  customColor: string | null; // HEX color para cor personalizada
  fontSize: number; // percentage: 90, 100, 110, etc.
  favoritePalettes: FavoritePalette[];
  highContrast: boolean; // Modo de alto contraste para acessibilidade
  language: string; // Idioma do sistema: 'pt', 'en', 'es'
}

const DEFAULT_SETTINGS: CustomizationSettings = {
  fontId: 'system',
  themeId: 'default',
  customColor: null,
  fontSize: 100,
  favoritePalettes: [],
  highContrast: false,
  language: 'pt',
};

interface CustomizationContextType {
  settings: CustomizationSettings;
  setFont: (fontId: string) => void;
  setTheme: (themeId: string) => void;
  setCustomColor: (color: string | null) => void;
  setFontSize: (size: number) => void;
  setHighContrast: (enabled: boolean) => void;
  setLanguage: (language: string) => void;
  resetToDefaults: () => void;
  currentFont: typeof AVAILABLE_FONTS[0];
  currentTheme: typeof AVAILABLE_THEMES[0];
  currentLanguage: typeof AVAILABLE_LANGUAGES[0];
  activeColor: string; // HSL string da cor ativa (tema ou custom)
  // Favoritos
  addFavoritePalette: (name: string, color: string) => void;
  removeFavoritePalette: (id: string) => void;
  renameFavoritePalette: (id: string, newName: string) => void;
  applyFavoritePalette: (id: string) => void;
}

const CustomizationContext = createContext<CustomizationContextType | undefined>(undefined);

// Carregar fontes do Google Fonts
const loadGoogleFonts = () => {
  const fontsToLoad = AVAILABLE_FONTS
    .filter(f => f.id !== 'system')
    .map(f => f.name.replace(' ', '+'))
    .join('&family=');
  
  const linkId = 'google-fonts-customization';
  let link = document.getElementById(linkId) as HTMLLinkElement;
  
  if (!link) {
    link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontsToLoad}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }
};

// Converter HEX para HSL
const hexToHSL = (hex: string): string => {
  // Remove o # se existir
  hex = hex.replace(/^#/, '');
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const CustomizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CustomizationSettings>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMIZATION_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Carregar fontes do Google ao montar
  useEffect(() => {
    loadGoogleFonts();
  }, []);

  // Aplicar configurações no documento
  useEffect(() => {
    const font = AVAILABLE_FONTS.find(f => f.id === settings.fontId) || AVAILABLE_FONTS[0];
    const theme = AVAILABLE_THEMES.find(t => t.id === settings.themeId) || AVAILABLE_THEMES[0];

    // Aplicar fonte
    document.documentElement.style.setProperty('--font-family', font.value);
    document.body.style.fontFamily = font.value;

    // Aplicar tamanho da fonte
    document.documentElement.style.fontSize = `${settings.fontSize}%`;

    // Aplicar cor primária (custom ou do tema)
    const primaryColor = settings.customColor 
      ? hexToHSL(settings.customColor)
      : theme.primary;
    document.documentElement.style.setProperty('--primary', primaryColor);
    
    // Aplicar modo de alto contraste
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
      // Cores de alto contraste para melhor acessibilidade
      document.documentElement.style.setProperty('--background', '0 0% 0%');
      document.documentElement.style.setProperty('--foreground', '0 0% 100%');
      document.documentElement.style.setProperty('--card', '0 0% 5%');
      document.documentElement.style.setProperty('--card-foreground', '0 0% 100%');
      document.documentElement.style.setProperty('--muted', '0 0% 15%');
      document.documentElement.style.setProperty('--muted-foreground', '0 0% 85%');
      document.documentElement.style.setProperty('--border', '0 0% 40%');
      document.documentElement.style.setProperty('--input', '0 0% 20%');
    } else {
      document.documentElement.classList.remove('high-contrast');
      // Restaurar cores padrão do tema escuro
      document.documentElement.style.removeProperty('--background');
      document.documentElement.style.removeProperty('--foreground');
      document.documentElement.style.removeProperty('--card');
      document.documentElement.style.removeProperty('--card-foreground');
      document.documentElement.style.removeProperty('--muted');
      document.documentElement.style.removeProperty('--muted-foreground');
      document.documentElement.style.removeProperty('--border');
      document.documentElement.style.removeProperty('--input');
    }
    
    // Salvar no localStorage
    localStorage.setItem(CUSTOMIZATION_KEY, JSON.stringify(settings));
  }, [settings]);

  const setFont = useCallback((fontId: string) => {
    setSettings(prev => ({ ...prev, fontId }));
  }, []);

  const setTheme = useCallback((themeId: string) => {
    setSettings(prev => ({ ...prev, themeId, customColor: null })); // Limpa cor custom ao selecionar tema
  }, []);

  const setCustomColor = useCallback((customColor: string | null) => {
    setSettings(prev => ({ ...prev, customColor }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setSettings(prev => ({ ...prev, fontSize: Math.min(130, Math.max(80, fontSize)) }));
  }, []);

  const setHighContrast = useCallback((highContrast: boolean) => {
    setSettings(prev => ({ ...prev, highContrast }));
  }, []);

  const setLanguage = useCallback((language: string) => {
    setSettings(prev => ({ ...prev, language }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Gerenciamento de paletas favoritas
  const addFavoritePalette = useCallback((name: string, color: string) => {
    const newPalette: FavoritePalette = {
      id: `palette_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || `Cor ${settings.favoritePalettes.length + 1}`,
      color,
      createdAt: Date.now(),
    };
    setSettings(prev => ({
      ...prev,
      favoritePalettes: [...prev.favoritePalettes, newPalette],
    }));
  }, [settings.favoritePalettes.length]);

  const removeFavoritePalette = useCallback((id: string) => {
    setSettings(prev => ({
      ...prev,
      favoritePalettes: prev.favoritePalettes.filter(p => p.id !== id),
    }));
  }, []);

  const renameFavoritePalette = useCallback((id: string, newName: string) => {
    setSettings(prev => ({
      ...prev,
      favoritePalettes: prev.favoritePalettes.map(p =>
        p.id === id ? { ...p, name: newName.trim() } : p
      ),
    }));
  }, []);

  const applyFavoritePalette = useCallback((id: string) => {
    const palette = settings.favoritePalettes.find(p => p.id === id);
    if (palette) {
      setCustomColor(palette.color);
    }
  }, [settings.favoritePalettes, setCustomColor]);

  const currentFont = AVAILABLE_FONTS.find(f => f.id === settings.fontId) || AVAILABLE_FONTS[0];
  const currentTheme = AVAILABLE_THEMES.find(t => t.id === settings.themeId) || AVAILABLE_THEMES[0];
  const currentLanguage = AVAILABLE_LANGUAGES.find(l => l.id === settings.language) || AVAILABLE_LANGUAGES[0];
  const activeColor = settings.customColor 
    ? hexToHSL(settings.customColor) 
    : currentTheme.primary;

  return (
    <CustomizationContext.Provider
      value={{
        settings,
        setFont,
        setTheme,
        setCustomColor,
        setFontSize,
        setHighContrast,
        setLanguage,
        resetToDefaults,
        currentFont,
        currentTheme,
        currentLanguage,
        activeColor,
        addFavoritePalette,
        removeFavoritePalette,
        renameFavoritePalette,
        applyFavoritePalette,
      }}
    >
      {children}
    </CustomizationContext.Provider>
  );
};

export const useCustomization = (): CustomizationContextType => {
  const context = useContext(CustomizationContext);
  if (!context) {
    throw new Error('useCustomization must be used within a CustomizationProvider');
  }
  return context;
};
