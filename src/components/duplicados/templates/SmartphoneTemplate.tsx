import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Laptop, Monitor, Tv, Star } from 'lucide-react';
import { TMDBDetails } from '@/types/importacao';
import { cn } from '@/lib/utils';

interface TemplateProps {
  selectedContent: TMDBDetails;
  backgroundBlur: number;
  overlayOpacity: number;
  logo: string | null;
  logoPosition: 'left' | 'center' | 'right';
  logoSize: number;
  logoX: number;
  logoY: number;
  featuredLabel: string;
  accentColor: string;
  posterWidth: number;
  posterHeight: number;
  statusLabel: string;
  statusX?: number;
  statusY?: number;
  statusAlign?: 'left' | 'center' | 'right';
  showSynopsis: boolean;
  synopsisLength: number;
}

const SmartphoneTemplate = ({
  selectedContent,
  backgroundBlur,
  overlayOpacity,
  logo,
  logoPosition,
  logoSize,
  logoX,
  logoY,
  featuredLabel,
  accentColor,
  posterWidth,
  posterHeight,
  statusLabel,
  statusX = 0,
  statusY = 0,
  statusAlign = 'center',
  showSynopsis,
  synopsisLength
}: TemplateProps) => {
  const renderStars = (vote: number) => {
    const stars = Math.round(vote / 2);
    return (
      <div className="flex gap-0.5 text-yellow-500">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} fill={i < stars ? "currentColor" : "none"} />
        ))}
      </div>
    );
  };

  const truncateSynopsis = (text: string, length: number) => {
    if (!text) return 'Sinopse não disponível para este conteúdo.';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  return (
    <div className="relative w-[500px] h-[750px] bg-black overflow-hidden flex flex-col p-8 font-sans text-white shadow-2xl rounded-sm">
      {/* Background with Blur */}
      <div 
        className="absolute inset-0 z-0 scale-110"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/w1280${selectedContent.backdrop_path})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `blur(${backgroundBlur}px)`,
        }}
      />
      
      {/* Overlay */}
      <div 
        className="absolute inset-0 z-10"
        style={{ 
          backgroundColor: 'black',
          opacity: overlayOpacity
        }}
      />
      
      {/* Content Layer */}
      <div className="relative z-20 flex flex-col h-full items-center">
        {/* Logo Section */}
        <div 
          className={cn(
            "w-full flex mb-6",
            logoPosition === 'left' && "justify-start",
            logoPosition === 'center' && "justify-center",
            logoPosition === 'right' && "justify-end"
          )}
          style={{
            transform: `translate(${logoX}%, ${logoY}%)`
          }}
        >
          {logo ? (
            <img 
              src={logo} 
              alt="Brand Logo" 
              style={{ width: `${logoSize}%` }} 
              className="max-h-16 object-contain"
            />
          ) : (
            <div className="h-8" />
          )}
        </div>

        {/* Featured Section */}
        <div className="w-full space-y-2 mb-8 text-center">
          <Badge 
            className="bg-primary/20 text-primary border-primary/30 text-[10px] px-3 py-0.5 tracking-[0.2em] font-black italic rounded-sm uppercase"
            style={{ color: accentColor, borderColor: `${accentColor}30`, backgroundColor: `${accentColor}20` }}
          >
            {featuredLabel}
          </Badge>
        </div>

        {/* Smartphone Frame with Poster */}
        <div className="relative w-full flex justify-center mb-8">
          <div 
            className="relative shadow-2xl overflow-hidden rounded-[2.5rem] border-[6px] border-[#1a1a1a]"
            style={{ 
              width: `${posterWidth}%`,
              aspectRatio: `9 / ${posterHeight}`,
              maxWidth: '280px'
            }}
          >
            {/* Screen Reflections/Gloss */}
            <div className="absolute inset-0 z-30 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent opacity-50" />
            
            {/* Inner Screen */}
            <div className="absolute inset-0 z-20 bg-black flex flex-col">
              {/* Poster Image */}
              <img 
                src={`https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`} 
                alt={selectedContent.title || selectedContent.name}
                className="w-full h-full object-cover"
              />
              
              {/* Poster Overlay Label */}
              <div className="absolute top-6 left-0 right-0 flex justify-center z-30">
                <Badge 
                  className="text-[9px] px-3 py-0.5 font-black rounded-full bg-white text-black shadow-lg"
                >
                  {statusLabel}
                </Badge>
              </div>

              {/* Corner Accents */}
              <div className="absolute bottom-6 left-6 z-30 flex items-center gap-1 opacity-80">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-tighter italic">Live Now</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info Section */}
        <div className="mt-auto space-y-4 text-center">
          <div className="flex justify-center mb-1">
            {renderStars(selectedContent.vote_average)}
          </div>

          <h1 className="text-4xl font-black uppercase tracking-widest leading-none drop-shadow-xl">
            {selectedContent.title || selectedContent.name}
          </h1>

          <div className="flex items-center justify-center gap-3 text-sm text-gray-300 font-medium">
            <span>{selectedContent.genres?.slice(0, 3).map(g => g.name).join(' • ')}</span>
            <span>•</span>
            <span>{new Date(selectedContent.release_date || selectedContent.first_air_date || '').getFullYear()}</span>
          </div>

          {showSynopsis && (
            <p className="text-sm text-gray-300 leading-relaxed max-w-[90%] mx-auto font-medium">
              {truncateSynopsis(selectedContent.overview, synopsisLength)}
            </p>
          )}

          <div className="pt-6 border-t border-white/10 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white/40 font-bold">|</span>
              <span className="text-[11px] font-black tracking-[0.3em] uppercase">Disponível em</span>
            </div>
            <div className="flex gap-4 items-center">
              <div className="flex items-center justify-center border border-white/30 rounded-md w-10 h-8">
                <Smartphone size={18} strokeWidth={1.5} />
              </div>
              <div className="flex items-center justify-center border border-white/30 rounded-md w-10 h-8">
                <Laptop size={18} strokeWidth={1.5} />
              </div>
              <div className="flex items-center justify-center border border-white/30 rounded-md w-10 h-8">
                <div className="relative">
                  <Monitor size={18} strokeWidth={1.5} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[6px] font-bold">SMART</div>
                </div>
              </div>
              <div className="flex items-center justify-center border border-white/30 rounded-md w-10 h-8 relative">
                <Tv size={18} strokeWidth={1.5} />
                <span className="absolute -right-1 bottom-0 text-[8px] font-bold">TV</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartphoneTemplate;
