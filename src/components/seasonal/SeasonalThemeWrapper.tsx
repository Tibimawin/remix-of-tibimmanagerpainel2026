import React from 'react';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { SeasonalParticles } from './SeasonalParticles';
import { SeasonalBanner } from './SeasonalBanner';
import { SeasonalDecorations } from './SeasonalDecorations';

interface SeasonalThemeWrapperProps {
  showBanner?: boolean;
}

export const SeasonalThemeWrapper: React.FC<SeasonalThemeWrapperProps> = ({ showBanner = true }) => {
  const { config, loading } = useSeasonalTheme();

  if (loading || !config || !config.enabled || config.themeType === 'none') {
    return null;
  }

  return (
    <>
      {showBanner && <SeasonalBanner config={config} />}
      <SeasonalDecorations config={config} />
      <SeasonalParticles config={config} />
    </>
  );
};

export const SeasonalThemeBanner: React.FC = () => {
  const { config, loading } = useSeasonalTheme();

  if (loading || !config || !config.enabled || config.themeType === 'none') {
    return null;
  }

  return <SeasonalBanner config={config} />;
};

export const SeasonalThemeEffects: React.FC = () => {
  const { config, loading } = useSeasonalTheme();

  if (loading || !config || !config.enabled || config.themeType === 'none') {
    return null;
  }

  return (
    <>
      <SeasonalDecorations config={config} />
      <SeasonalParticles config={config} />
    </>
  );
};
