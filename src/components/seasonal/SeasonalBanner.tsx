import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeasonalThemeConfig } from '@/services/SeasonalThemeService';

interface SeasonalBannerProps {
  config: SeasonalThemeConfig;
}

export const SeasonalBanner: React.FC<SeasonalBannerProps> = ({ config }) => {
  const [isVisible, setIsVisible] = useState(() => {
    const dismissed = localStorage.getItem(`seasonal_banner_dismissed_${config.themeType}`);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      // Mostrar novamente após 24 horas
      return now.getTime() - dismissedDate.getTime() > 24 * 60 * 60 * 1000;
    }
    return true;
  });

  if (!config.effects.banner || !isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`seasonal_banner_dismissed_${config.themeType}`, new Date().toISOString());
  };

  const primaryColor = config.customTheme?.primaryColor || '#3b82f6';
  const secondaryColor = config.customTheme?.secondaryColor || '#8b5cf6';
  const message = config.customTheme?.bannerMessage || 'Tema sazonal ativo!';

  return (
    <div 
      className="relative mb-6 rounded-xl p-4 text-white shadow-lg overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
      }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative flex items-center justify-between">
        <p className="text-lg font-medium flex items-center gap-2">
          {message}
        </p>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="text-white hover:bg-white/20 rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
