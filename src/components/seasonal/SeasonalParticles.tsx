import React, { useEffect, useState, useMemo } from 'react';
import { SeasonalThemeConfig } from '@/services/SeasonalThemeService';

interface Particle {
  id: number;
  left: number;
  animationDuration: number;
  opacity: number;
  size: number;
  delay: number;
}

interface SeasonalParticlesProps {
  config: SeasonalThemeConfig;
}

export const SeasonalParticles: React.FC<SeasonalParticlesProps> = ({ config }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const particleEmoji = useMemo(() => {
    return config.customTheme?.particleEmoji || '✨';
  }, [config.customTheme?.particleEmoji]);

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: Math.random() * 4 + 3,
      opacity: Math.random() * 0.5 + 0.5,
      size: Math.random() * 16 + 12,
      delay: Math.random() * 3
    }));

    setParticles(newParticles);
  }, []);

  if (!config.effects.particles) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-seasonal-fall"
          style={{
            left: `${particle.left}%`,
            top: '-30px',
            opacity: particle.opacity,
            fontSize: `${particle.size}px`,
            animationDuration: `${particle.animationDuration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          {particleEmoji}
        </div>
      ))}

      <style>{`
        @keyframes seasonal-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0.3;
          }
        }
        
        .animate-seasonal-fall {
          animation: seasonal-fall linear infinite;
        }
      `}</style>
    </div>
  );
};
