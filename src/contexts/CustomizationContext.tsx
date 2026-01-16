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

interface CustomizationSettings {
  fontId: string;
  themeId: string;
  fontSize: number; // percentage: 90, 100, 110, etc.
}

const DEFAULT_SETTINGS: CustomizationSettings = {
  fontId: 'system',
  themeId: 'default',
  fontSize: 100,
};

interface CustomizationContextType {
  settings: CustomizationSettings;
  setFont: (fontId: string) => void;
  setTheme: (themeId: string) => void;
  setFontSize: (size: number) => void;
  resetToDefaults: () => void;
  currentFont: typeof AVAILABLE_FONTS[0];
  currentTheme: typeof AVAILABLE_THEMES[0];
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

    // Aplicar cor primária
    document.documentElement.style.setProperty('--primary', theme.primary);
    
    // Salvar no localStorage
    localStorage.setItem(CUSTOMIZATION_KEY, JSON.stringify(settings));
  }, [settings]);

  const setFont = useCallback((fontId: string) => {
    setSettings(prev => ({ ...prev, fontId }));
  }, []);

  const setTheme = useCallback((themeId: string) => {
    setSettings(prev => ({ ...prev, themeId }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setSettings(prev => ({ ...prev, fontSize: Math.min(130, Math.max(80, fontSize)) }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const currentFont = AVAILABLE_FONTS.find(f => f.id === settings.fontId) || AVAILABLE_FONTS[0];
  const currentTheme = AVAILABLE_THEMES.find(t => t.id === settings.themeId) || AVAILABLE_THEMES[0];

  return (
    <CustomizationContext.Provider
      value={{
        settings,
        setFont,
        setTheme,
        setFontSize,
        resetToDefaults,
        currentFont,
        currentTheme,
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
