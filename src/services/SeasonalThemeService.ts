import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export type SeasonalThemeType = 
  | 'christmas' 
  | 'new_year' 
  | 'easter' 
  | 'halloween' 
  | 'custom' 
  | 'none';

export interface SeasonalThemeConfig {
  enabled: boolean;
  themeType: SeasonalThemeType;
  effects: {
    particles: boolean;
    banner: boolean;
    decorations: boolean;
  };
  customTheme?: {
    name: string;
    primaryColor: string;
    secondaryColor: string;
    particleEmoji: string;
    bannerMessage: string;
    bannerEmoji: string;
  };
  schedule?: {
    autoEnable: boolean;
    startDate?: string;
    endDate?: string;
  };
}

const DEFAULT_CONFIG: SeasonalThemeConfig = {
  enabled: false,
  themeType: 'none',
  effects: {
    particles: true,
    banner: true,
    decorations: true
  }
};

const THEME_DOC_ID = 'seasonal_theme_config';

export const SeasonalThemeService = {
  async getConfig(): Promise<SeasonalThemeConfig> {
    try {
      const docRef = doc(db, 'app_config', THEME_DOC_ID);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { ...DEFAULT_CONFIG, ...docSnap.data() } as SeasonalThemeConfig;
      }
      
      return DEFAULT_CONFIG;
    } catch (error) {
      console.error('Erro ao carregar config de tema sazonal:', error);
      // Fallback para localStorage
      const cached = localStorage.getItem('seasonal_theme_config');
      if (cached) {
        return JSON.parse(cached);
      }
      return DEFAULT_CONFIG;
    }
  },

  async saveConfig(config: SeasonalThemeConfig): Promise<void> {
    try {
      const docRef = doc(db, 'app_config', THEME_DOC_ID);
      await setDoc(docRef, config);
      // Também salvar no localStorage para cache
      localStorage.setItem('seasonal_theme_config', JSON.stringify(config));
    } catch (error) {
      console.error('Erro ao salvar config de tema sazonal:', error);
      // Fallback para localStorage
      localStorage.setItem('seasonal_theme_config', JSON.stringify(config));
    }
  },

  getThemePresets(): Record<SeasonalThemeType, Partial<SeasonalThemeConfig['customTheme']>> {
    return {
      christmas: {
        name: 'Natal',
        primaryColor: '#dc2626',
        secondaryColor: '#16a34a',
        particleEmoji: '❄️',
        bannerMessage: '🎄 Feliz Natal! Boas festas a todos! 🎅',
        bannerEmoji: '🎄'
      },
      new_year: {
        name: 'Ano Novo',
        primaryColor: '#eab308',
        secondaryColor: '#6366f1',
        particleEmoji: '🎊',
        bannerMessage: '🎆 Feliz Ano Novo! Que venha um ano incrível! 🎇',
        bannerEmoji: '🎆'
      },
      easter: {
        name: 'Páscoa',
        primaryColor: '#ec4899',
        secondaryColor: '#8b5cf6',
        particleEmoji: '🐰',
        bannerMessage: '🐣 Feliz Páscoa! Muita alegria e paz! 🐰',
        bannerEmoji: '🐣'
      },
      halloween: {
        name: 'Halloween',
        primaryColor: '#f97316',
        secondaryColor: '#7c3aed',
        particleEmoji: '🎃',
        bannerMessage: '🎃 Happy Halloween! Doces ou travessuras? 👻',
        bannerEmoji: '🎃'
      },
      custom: {
        name: 'Personalizado',
        primaryColor: '#3b82f6',
        secondaryColor: '#8b5cf6',
        particleEmoji: '✨',
        bannerMessage: 'Mensagem personalizada',
        bannerEmoji: '✨'
      },
      none: {
        name: 'Desativado'
      }
    };
  }
};
