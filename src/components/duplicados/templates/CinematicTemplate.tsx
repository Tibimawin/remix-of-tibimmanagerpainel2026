import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Laptop, Monitor, Tv, Star, Play } from 'lucide-react';
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

const CinematicTemplate = ({
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
  statusAlign = 'right',
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
    <div className="relative w-[750px] h-[500px] bg-black overflow-hidden flex flex-col font-sans text-white shadow-2xl rounded-sm">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/w1280${selectedContent.backdrop_path})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `blur(${backgroundBlur}px)`,
        }}
      />
      
      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0 z-10 bg-gradient-to-r from-black via-black/80 to-transparent"
        style={{ opacity: overlayOpacity }}
      />
      
      {/* Content Layer */}
      <div className="relative z-20 flex h-full p-10 gap-8">
        {/* Left Section: Info */}
        <div className="flex-1 flex flex-col justify-center space-y-6">
          <div 
            className={cn(
              "w-full flex mb-2",
              logoPosition === 'left' && "justify-start",
              logoPosition === 'center' && "justify-center",
              logoPosition === 'right' && "justify-end"
            )}
            style={{
              transform: `translate(${logoX}%, ${logoY}%)`
            }}
          >
            {logo && (
              <img 
                src={logo} 
                alt="Brand Logo" 
                style={{ width: `${logoSize / 2}%` }} 
                className="max-h-12 object-contain"
              />
            )}
          </div>

          <Badge 
            className="w-fit bg-primary/20 text-primary border-primary/30 text-[10px] px-3 py-1 tracking-[0.2em] font-black italic rounded-sm uppercase"
            style={{ color: accentColor, borderColor: `${accentColor}30`, backgroundColor: `${accentColor}20` }}
          >
            {featuredLabel}
          </Badge>

          <h1 className="text-5xl font-black uppercase tracking-tight leading-none drop-shadow-2xl">
            {selectedContent.title || selectedContent.name}
          </h1>

          <div className="flex items-center gap-4 text-sm font-bold text-white/80">
            {renderStars(selectedContent.vote_average)}
            <span>•</span>
            <span>{new Date(selectedContent.release_date || selectedContent.first_air_date || '').getFullYear()}</span>
            <span>•</span>
            <span className="text-primary" style={{ color: accentColor }}>{selectedContent.genres?.[0]?.name}</span>
          </div>

          {showSynopsis && (
            <p className="text-base text-gray-300 leading-relaxed max-w-lg font-medium">
              {truncateSynopsis(selectedContent.overview, synopsisLength)}
            </p>
          )}

          <div className="flex gap-4 pt-4">
             <div className="flex items-center gap-3">
               <div className="flex gap-2">
                 <Smartphone size={16} className="text-white/60" />
                 <Laptop size={16} className="text-white/60" />
                 <Tv size={16} className="text-white/60" />
               </div>
               <span className="text-[10px] font-black tracking-widest uppercase text-white/40">Disponível agora</span>
             </div>
          </div>
        </div>

        {/* Right Section: Poster */}
        <div className="flex-none flex items-center">
          <div 
            className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg border-2 border-white/10 overflow-hidden transform rotate-3"
            style={{ 
              width: `${posterWidth * 4}px`,
              aspectRatio: `9 / ${posterHeight}`,
            }}
          >
            <img 
              src={`https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`} 
              alt={selectedContent.title || selectedContent.name}
              className="w-full h-full object-cover"
            />
            <div
              className={cn(
                "absolute top-3 left-3 right-3 flex",
                statusAlign === 'left' && "justify-start",
                statusAlign === 'center' && "justify-center",
                statusAlign === 'right' && "justify-end"
              )}
              style={{ transform: `translate(${statusX}%, ${statusY}%)` }}
            >
              <Badge className="bg-white text-black font-black text-[10px] px-2 py-0.5 rounded-sm shadow-xl">
                {statusLabel}
              </Badge>
            </div>
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
               <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                 <Play className="fill-white text-white ml-1" size={24} />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aesthetic Border Accent */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  );
};

export default CinematicTemplate;
