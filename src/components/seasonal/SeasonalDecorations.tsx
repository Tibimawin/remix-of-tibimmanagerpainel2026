import React, { useMemo } from 'react';
import { SeasonalThemeConfig } from '@/services/SeasonalThemeService';

interface SeasonalDecorationsProps {
  config: SeasonalThemeConfig;
}

export const SeasonalDecorations: React.FC<SeasonalDecorationsProps> = ({ config }) => {
  const decorations = useMemo(() => {
    switch (config.themeType) {
      case 'christmas':
        return {
          topLeft: '🎅',
          topRight: '🔔',
          bottomLeft: '🎁',
          bottomRight: '🎄',
          topEmoji: '🌲'
        };
      case 'new_year':
        return {
          topLeft: '🥂',
          topRight: '🎆',
          bottomLeft: '🎊',
          bottomRight: '🎉',
          topEmoji: '⭐'
        };
      case 'carnival':
        return {
          topLeft: '🎭',
          topRight: '💃',
          bottomLeft: '🎺',
          bottomRight: '🎊',
          topEmoji: '🎉'
        };
      case 'valentines':
        return {
          topLeft: '💕',
          topRight: '💘',
          bottomLeft: '🌹',
          bottomRight: '❤️',
          topEmoji: '💖'
        };
      case 'sao_joao':
        return {
          topLeft: '🌽',
          topRight: '🎆',
          bottomLeft: '🪗',
          bottomRight: '🔥',
          topEmoji: '🎇'
        };
      case 'easter':
        return {
          topLeft: '🐰',
          topRight: '🌷',
          bottomLeft: '🥚',
          bottomRight: '🐣',
          topEmoji: '🌸'
        };
      case 'halloween':
        return {
          topLeft: '👻',
          topRight: '🦇',
          bottomLeft: '🕷️',
          bottomRight: '🎃',
          topEmoji: '🕸️'
        };
      case 'custom':
        const emoji = config.customTheme?.bannerEmoji || '✨';
        return {
          topLeft: emoji,
          topRight: emoji,
          bottomLeft: emoji,
          bottomRight: emoji,
          topEmoji: emoji
        };
      default:
        return null;
    }
  }, [config.themeType, config.customTheme?.bannerEmoji]);

  if (!config.effects.decorations || !decorations) return null;

  const primaryColor = config.customTheme?.primaryColor || '#3b82f6';

  return (
    <>
      {/* Top decorative bar */}
      <div className="fixed top-0 left-0 right-0 h-12 pointer-events-none z-[9998] overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{ background: `linear-gradient(to bottom, ${primaryColor}, transparent)` }}
        />
        
        <div className="flex justify-around items-center h-full pt-1">
          {Array.from({ length: 15 }).map((_, i) => (
            <span
              key={i}
              className="text-2xl opacity-70 animate-bounce"
              style={{ 
                animationDelay: `${i * 0.1}s`,
                animationDuration: '2s'
              }}
            >
              {decorations.topEmoji}
            </span>
          ))}
        </div>
      </div>

      {/* Corner decorations */}
      <div className="fixed top-16 left-4 pointer-events-none z-[9998] animate-bounce" style={{ animationDuration: '3s' }}>
        <span className="text-4xl drop-shadow-lg">{decorations.topLeft}</span>
      </div>

      <div className="fixed top-16 right-4 pointer-events-none z-[9998] animate-bounce" style={{ animationDuration: '2.5s' }}>
        <span className="text-4xl drop-shadow-lg">{decorations.topRight}</span>
      </div>

      <div className="fixed bottom-20 left-4 pointer-events-none z-[9998] animate-bounce" style={{ animationDuration: '2.8s' }}>
        <span className="text-4xl drop-shadow-lg">{decorations.bottomLeft}</span>
      </div>

      <div className="fixed bottom-8 right-8 pointer-events-none z-[9998]">
        <div className="relative animate-float">
          <span className="text-7xl drop-shadow-2xl">{decorations.bottomRight}</span>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};
