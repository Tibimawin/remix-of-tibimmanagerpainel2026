import React from 'react';

export const ChristmasDecorations: React.FC = () => {
    return (
        <>
            {/* Guirlanda no topo */}
            <div className="fixed top-0 left-0 right-0 h-16 pointer-events-none z-[9998] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-green-900/30 to-transparent" />

                {/* Galhos de pinheiro */}
                <div className="flex justify-around items-start h-full">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="relative"
                            style={{
                                transform: `translateY(-${Math.random() * 30}px)`,
                            }}
                        >
                            <div className="text-4xl opacity-80">🌲</div>

                            {/* Luzes decorativas */}
                            {Math.random() > 0.5 && (
                                <div
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full animate-pulse"
                                    style={{
                                        backgroundColor: ['#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff'][
                                            Math.floor(Math.random() * 5)
                                        ],
                                        boxShadow: `0 0 10px currentColor`,
                                        animationDuration: `${Math.random() * 2 + 1}s`,
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Árvore de Natal flutuante no canto */}
            <div className="fixed bottom-8 right-8 pointer-events-none z-[9998] animate-bounce-slow">
                <div className="relative">
                    <div className="text-8xl filter drop-shadow-2xl">🎄</div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 text-3xl animate-pulse">⭐</div>

                    {/* Presentes embaixo da árvore */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                        <div className="text-2xl">🎁</div>
                        <div className="text-2xl">🎁</div>
                    </div>
                </div>
            </div>

            {/* Sino decorativo */}
            <div className="fixed top-24 right-16 pointer-events-none z-[9998] animate-swing">
                <div className="text-4xl filter drop-shadow-lg">🔔</div>
            </div>

            <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes swing {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        
        .animate-swing {
          animation: swing 2s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>
        </>
    );
};
