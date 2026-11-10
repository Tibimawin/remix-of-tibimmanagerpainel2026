import React from 'react';
import { Smartphone, Laptop, Monitor, Tv, Star, Award, Clapperboard, Sparkles } from 'lucide-react';
import { TMDBDetails } from '@/types/importacao';
import { cn } from '@/lib/utils';
import { TemplateProps } from './CyberGlowTemplate';

const EditorialCineTemplate = ({
  selectedContent,
  backgroundBlur,
  overlayOpacity,
  logo,
  logoPosition,
  logoSize,
  logoX,
  logoY,
  featuredLabel,
  showFeaturedLabel = true,
  accentColor,
  posterWidth,
  posterHeight,
  statusLabel,
  showStatusLabel = true,
  statusHeight = 24,
  statusFontSize = 9,
  statusPaddingX = 12,
  statusX = 0,
  statusY = 0,
  statusAlign = 'center',
  showSynopsis,
  synopsisLength,
  titleColor = '#FFFFFF',
  infoColor = '#D4D4D8',
  synopsisColor = '#E4E4E7',
  availableColor = '#A1A1AA',
  brandName = 'PREMIERE'
}: TemplateProps) => {
  const renderStars = (vote: number) => {
    const stars = Math.round(vote / 2);
    return (
      <div className="flex gap-0.5 text-amber-300">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={11} fill={i < stars ? "currentColor" : "none"} />
        ))}
      </div>
    );
  };

  const truncateSynopsis = (text: string, length: number) => {
    if (!text) return 'Uma obra aclamada pela crítica, agora disponível para assistir com qualidade máxima e som espacial.';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const releaseYear = new Date(
    selectedContent.release_date || selectedContent.first_air_date || ''
  ).getFullYear() || '2026';

  const mediaTitle = selectedContent.title || selectedContent.name || 'Sem Título';

  return (
    <div className="relative w-[500px] h-[780px] bg-[#0c0d12] overflow-hidden flex flex-col p-7 font-sans text-white shadow-2xl rounded-none border border-neutral-700/60">
      {/* Background Ambience */}
      <div 
        className="absolute inset-0 z-0 scale-110"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/w1280${selectedContent.backdrop_path || selectedContent.poster_path})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `blur(${backgroundBlur}px)`,
        }}
      />
      
      {/* Matte Dark Gradient Overlay */}
      <div 
        className="absolute inset-0 z-10 bg-gradient-to-b from-[#0c0d12]/95 via-[#0c0d12]/80 to-[#0c0d12]/98"
        style={{ opacity: overlayOpacity }}
      />

      {/* Editorial Decorative Framing Line */}
      <div className="absolute inset-3 z-15 border border-white/10 pointer-events-none rounded-sm" />

      {/* Top Editorial Header */}
      <div className="relative z-20 flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4" style={{ color: accentColor }} />
          <span className="text-[10px] tracking-[0.25em] font-black uppercase text-white/90">
            CINEMA EM CASA
          </span>
          <span className="text-white/40">•</span>
          <span className="text-[10px] font-semibold text-white/60 tracking-wider">
            {releaseYear}
          </span>
        </div>

        {/* Logo Section */}
        <div 
          className={cn(
            "flex items-center",
            logoPosition === 'left' && "justify-start",
            logoPosition === 'center' && "justify-center",
            logoPosition === 'right' && "justify-end"
          )}
          style={{ transform: `translate(${logoX}%, ${logoY}%)` }}
        >
          {logo ? (
            <img 
              src={logo} 
              alt="Logo" 
              className="object-contain filter drop-shadow-md"
              style={{ maxHeight: `${Math.round(38 * (logoSize / 100))}px` }}
            />
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-3 h-3" style={{ color: accentColor }} />
              <span>{brandName || 'PREMIERE'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Center Layout: Poster with Editorial Laurels */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center my-3">
        {showFeaturedLabel && featuredLabel.trim() && (
          <div className="flex items-center gap-1.5 mb-2.5">
            <Award className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span 
              className="text-[10px] font-black tracking-[0.2em] uppercase"
              style={{ color: accentColor }}
            >
              {featuredLabel}
            </span>
            <Award className="w-3.5 h-3.5" style={{ color: accentColor }} />
          </div>
        )}

        {/* Minimalist Framed Poster */}
        <div className="relative p-1 rounded-lg border border-white/20 bg-white/5 backdrop-blur-md shadow-2xl">
          <div 
            className="relative rounded-md overflow-hidden bg-black flex items-center justify-center shadow-lg"
            style={{
              width: `${posterWidth * 4.2}px`,
              height: `${posterHeight * 21}px`,
            }}
          >
            {selectedContent.poster_path ? (
              <img 
                src={`https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`} 
                alt={mediaTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-white/50">Sem Cartaz</span>
            )}

            {/* Status Ribbon */}
            {showStatusLabel && statusLabel.trim() && (
              <div 
                className={cn(
                  "absolute z-30 flex items-center justify-center font-black uppercase tracking-widest shadow-xl",
                  statusAlign === 'left' && "left-2",
                  statusAlign === 'center' && "left-1/2 -translate-x-1/2",
                  statusAlign === 'right' && "right-2"
                )}
                style={{
                  bottom: `${10 + statusY}px`,
                  left: statusAlign === 'center' ? `calc(50% + ${statusX}px)` : undefined,
                  height: `${statusHeight}px`,
                  fontSize: `${statusFontSize}px`,
                  paddingLeft: `${statusPaddingX}px`,
                  paddingRight: `${statusPaddingX}px`,
                  backgroundColor: accentColor,
                  color: '#FFFFFF',
                  borderRadius: '2px',
                }}
              >
                {statusLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editorial Typography Body */}
      <div className="relative z-20 flex flex-col gap-2 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {renderStars(selectedContent.vote_average || 8)}
            <span className="text-xs font-bold text-white/90">
              {(selectedContent.vote_average || 8).toFixed(1)} / 10
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase" style={{ color: infoColor }}>
            <span>{selectedContent.media_type === 'tv' ? 'Série Oficial' : 'Longa-Metragem'}</span>
            <span>•</span>
            <span>{selectedContent.genres?.[0]?.name || 'Cinema'}</span>
          </div>
        </div>

        {/* Big Editorial Title */}
        <h1 
          className="text-2xl font-black tracking-tight leading-tight uppercase line-clamp-1 drop-shadow-sm font-serif"
          style={{ color: titleColor }}
        >
          {mediaTitle}
        </h1>

        {/* Synopsis */}
        {showSynopsis && (
          <p 
            className="text-[11px] leading-relaxed line-clamp-2 text-justify"
            style={{ color: synopsisColor }}
          >
            {truncateSynopsis(selectedContent.overview || '', synopsisLength)}
          </p>
        )}

        {/* Editorial Footer Capsule */}
        <div className="mt-1 pt-2 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            <span className="text-[10px] tracking-wider uppercase font-bold" style={{ color: availableColor }}>
              Disponível em Alta Definição
            </span>
          </div>

          <div className="flex items-center gap-2 text-white/70">
            <Tv size={13} title="Smart TV" />
            <Smartphone size={13} title="Mobile" />
            <Laptop size={13} title="Notebook" />
            <Monitor size={13} title="TV Box" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorialCineTemplate;
