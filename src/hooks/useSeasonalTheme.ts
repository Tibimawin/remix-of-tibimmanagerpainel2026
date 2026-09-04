import { useState, useEffect, useCallback } from 'react';
import { SeasonalThemeService, SeasonalThemeConfig, SeasonalThemeType } from '@/services/SeasonalThemeService';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Singleton compartilhado para evitar múltiplos listeners em páginas/layouts
let cachedConfig: SeasonalThemeConfig | null = null;
let isListenerInitialized = false;
const subscribers = new Set<(cfg: SeasonalThemeConfig | null) => void>();

function initSeasonalThemeListener() {
  if (isListenerInitialized) return;
  isListenerInitialized = true;

  SeasonalThemeService.getConfig()
    .then((saved) => {
      cachedConfig = saved;
      subscribers.forEach((fn) => fn(cachedConfig));
    })
    .catch((err) => {
      console.warn('Erro ao carregar tema sazonal:', err);
    });

  try {
    onSnapshot(
      doc(db, 'app_config', 'seasonal_theme_config'),
      (docSnap) => {
        if (docSnap.exists()) {
          cachedConfig = docSnap.data() as SeasonalThemeConfig;
          subscribers.forEach((fn) => fn(cachedConfig));
        }
      },
      (error) => {
        console.warn('Erro no listener compartilhado de tema sazonal:', error);
      }
    );
  } catch (error) {
    console.warn('Erro ao registrar listener singleton:', error);
  }
}

export const useSeasonalTheme = () => {
  const [config, setConfig] = useState<SeasonalThemeConfig | null>(cachedConfig);
  const [loading, setLoading] = useState<boolean>(cachedConfig === null);

  useEffect(() => {
    initSeasonalThemeListener();

    const handler = (newConfig: SeasonalThemeConfig | null) => {
      setConfig(newConfig);
      setLoading(false);
    };

    subscribers.add(handler);
    if (cachedConfig !== null) {
      setConfig(cachedConfig);
      setLoading(false);
    }

    return () => {
      subscribers.delete(handler);
    };
  }, []);

  const updateConfig = useCallback(async (newConfig: Partial<SeasonalThemeConfig>) => {
    if (!config) return;
    
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    await SeasonalThemeService.saveConfig(updatedConfig);
  }, [config]);

  const setThemeType = useCallback(async (themeType: SeasonalThemeType) => {
    const presets = SeasonalThemeService.getThemePresets();
    const preset = presets[themeType];
    
    await updateConfig({
      themeType,
      enabled: themeType !== 'none',
      customTheme: themeType !== 'none' && themeType !== 'custom' 
        ? preset as SeasonalThemeConfig['customTheme']
        : config?.customTheme
    });
  }, [config, updateConfig]);

  const toggleEffect = useCallback(async (effect: keyof SeasonalThemeConfig['effects']) => {
    if (!config) return;
    
    await updateConfig({
      effects: {
        ...config.effects,
        [effect]: !config.effects[effect]
      }
    });
  }, [config, updateConfig]);

  return {
    config,
    loading,
    updateConfig,
    setThemeType,
    toggleEffect,
    presets: SeasonalThemeService.getThemePresets()
  };
};
