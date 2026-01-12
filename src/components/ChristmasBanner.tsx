import React, { useState } from 'react';
import { X, Gift, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

export const ChristmasBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(() => {
        // Verificar se o usuário já fechou o banner hoje
        const lastClosed = localStorage.getItem('christmas-banner-closed');
        const today = new Date().toDateString();
        return lastClosed !== today;
    });

    const handleClose = () => {
        const today = new Date().toDateString();
        localStorage.setItem('christmas-banner-closed', today);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-green-600 to-red-600 text-white shadow-2xl mb-6 rounded-xl animate-in slide-in-from-top">
            {/* Neve caindo no banner */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 15 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute animate-fall-banner"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${Math.random() * 3 + 2}s`,
                        }}
                    >
                        ❄️
                    </div>
                ))}
            </div>

            {/* Conteúdo */}
            <div className="relative px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-5xl animate-bounce">🎅</div>

                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                            Feliz Natal! 🎄
                            <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                        </h3>
                        <p className="text-sm opacity-90 mt-1">
                            Desejamos a você e sua família um Natal cheio de alegria, paz e prosperidade! 🎁✨
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Presente animado */}
                    <div className="text-4xl animate-bounce-slow hidden sm:block">
                        🎁
                    </div>

                    {/* Botão fechar */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClose}
                        className="text-white hover:bg-white/20 rounded-full h-8 w-8 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Luzes decorativas */}
            <div className="absolute bottom-0 left-0 right-0 h-1 flex">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 animate-pulse"
                        style={{
                            backgroundColor: ['#ff0000', '#00ff00', '#ffff00', '#0000ff'][i % 4],
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '1s',
                        }}
                    />
                ))}
            </div>

            <style>{`
        @keyframes fall-banner {
          from {
            transform: translateY(-10px);
            opacity: 1;
          }
          to {
            transform: translateY(100px);
            opacity: 0;
          }
        }
        
        .animate-fall-banner {
          animation: fall-banner linear infinite;
        }
      `}</style>
        </div>
    );
};
