import { useState, useEffect, useCallback } from 'react';
import { SeasonalThemeService, SeasonalThemeConfig, SeasonalThemeType } from '@/services/SeasonalThemeService';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const useSeasonalTheme = () => {
  const [config, setConfig] = useState<SeasonalThemeConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar config inicial
    const loadConfig = async () => {
      try {
        const savedConfig = await SeasonalThemeService.getConfig();
        setConfig(savedConfig);
      } catch (error) {
        console.error('Erro ao carregar tema sazonal:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();

    // Listener em tempo real para mudanças
    try {
      const unsubscribe = onSnapshot(
        doc(db, 'app_config', 'seasonal_theme_config'),
        (docSnap) => {
          if (docSnap.exists()) {
            setConfig(docSnap.data() as SeasonalThemeConfig);
          }
        },
        (error) => {
          console.error('Erro no listener de tema sazonal:', error);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Erro ao configurar listener:', error);
    }
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
