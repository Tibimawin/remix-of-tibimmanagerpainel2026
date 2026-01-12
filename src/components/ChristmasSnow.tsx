import React, { useEffect, useState } from 'react';

interface Snowflake {
    id: number;
    left: number;
    animationDuration: number;
    opacity: number;
    size: number;
}

export const ChristmasSnow: React.FC = () => {
    const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

    useEffect(() => {
        // Criar 50 flocos de neve com posições e velocidades aleatórias
        const flakes: Snowflake[] = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            animationDuration: Math.random() * 3 + 2, // 2-5 segundos
            opacity: Math.random() * 0.6 + 0.4, // 0.4-1.0
            size: Math.random() * 4 + 2, // 2-6px
        }));

        setSnowflakes(flakes);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {snowflakes.map((flake) => (
                <div
                    key={flake.id}
                    className="absolute animate-fall"
                    style={{
                        left: `${flake.left}%`,
                        top: '-10px',
                        opacity: flake.opacity,
                        animation: `fall ${flake.animationDuration}s linear infinite`,
                        animationDelay: `${Math.random() * 2}s`,
                    }}
                >
                    <div
                        className="rounded-full bg-white"
                        style={{
                            width: `${flake.size}px`,
                            height: `${flake.size}px`,
                            boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
                        }}
                    />
                </div>
            ))}

            <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) translateX(${Math.random() * 100 - 50}px);
          }
        }
      `}</style>
        </div>
    );
};
