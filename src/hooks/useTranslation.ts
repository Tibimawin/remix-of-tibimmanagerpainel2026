import { useCustomization } from '@/contexts/CustomizationContext';
import { translations, Language } from '@/i18n/translations';

export const useTranslation = () => {
  const { settings } = useCustomization();
  const language = (settings.language || 'pt') as Language;

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = translations[language]?.[key] || translations['pt'][key] || key;
    
    if (params) {
      return Object.entries(params).reduce(
        (acc, [paramKey, paramValue]) => acc.replace(`{${paramKey}}`, String(paramValue)),
        translation
      );
    }
    
    return translation;
  };

  return { t, language };
};
