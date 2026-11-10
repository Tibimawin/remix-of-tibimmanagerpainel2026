import React from 'react';
import { Smartphone, Laptop, Monitor, Tv, Star, Play, Plus, TrendingUp, CheckCircle2 } from 'lucide-react';
import { TMDBDetails } from '@/types/importacao';
import { cn } from '@/lib/utils';
import { TemplateProps } from './CyberGlowTemplate';

const StreamingUiTemplate = ({
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
  infoColor = '#CBD5E1',
  synopsisColor = '#E2E8F0',
  availableColor = '#94A3B8',
  brandName = 'STREAM+'
}: TemplateProps) => {
  const renderStars = (vote: number) => {
    const stars = Math.round(vote / 2);
    return (
      <div className="flex gap-0.5 text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={12} fill={i < stars ? "currentColor" : "none"} />
        ))}
      </div>
    );
  };

  const truncateSynopsis = (text: string, length: number) => {
    if (!text) return 'Adicionado ao catálogo com exclusividade. Assista agora em qualquer tela.';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const releaseYear = new Date(
    selectedContent.release_date || selectedContent.first_air_date || ''
  ).getFullYear() || '2026';

  const mediaTitle = selectedContent.title || selectedContent.name || 'Sem Título';

  return (
    <div className="relative w-[520px] h-[780px] bg-[#0A0D14] overflow-hidden flex flex-col font-sans text-white shadow-2xl rounded-none border border-neutral-800">
      {/* Cinematic Hero Backdrop (Top Half Bleed) */}
      <div className="relative w-full h-[360px] overflow-hidden">
        <div 
          className="absolute inset-0 scale-105"
          style={{
            backgroundImage: `url(https://image.tmdb.org/t/p/w1280${selectedContent.backdrop_path || selectedContent.poster_path})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            filter: `blur(${Math.max(0, backgroundBlur - 4)}px)`,
          }}
        />
        {/* Soft Vignette and Bottom Bleed Gradient */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/50 to-transparent"
          style={{ opacity: overlayOpacity }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0D14]/80 via-transparent to-[#0A0D14]/80" />

        {/* Top Header Bar */}
        <div className="relative z-20 flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-2">
            <div 
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md border border-white/20"
              style={{ backgroundColor: accentColor, color: '#FFFFFF' }}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>#1 NO APP HOJE</span>
            </div>
            {showFeaturedLabel && featuredLabel.trim() && (
              <span className="text-[10px] font-bold text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 uppercase tracking-wider">
                {featuredLabel}
              </span>
            )}
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
                alt="Brand Logo" 
                className="object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                style={{ maxHeight: `${Math.round(42 * (logoSize / 100))}px` }}
              />
            ) : (
              <span className="font-black text-sm tracking-widest uppercase bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                {brandName || 'STREAM+'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Floating Content Body overlapping the backdrop */}
      <div className="relative z-20 flex-1 flex flex-col px-6 -mt-20">
        <div className="flex gap-5 items-end mb-4">
          {/* 3D Floating Mini Poster */}
          <div className="relative flex-shrink-0 group">
            <div 
              className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black/80 flex items-center justify-center transition-transform"
              style={{
                width: `${posterWidth * 2.8}px`,
                height: `${posterHeight * 13}px`,
              }}
            >
              {selectedContent.poster_path ? (
                <img 
                  src={`https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`} 
                  alt={mediaTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-white/60">Sem Capa</span>
              )}

              {/* Status Ribbon on Poster */}
              {showStatusLabel && statusLabel.trim() && (
                <div 
                  className={cn(
                    "absolute z-30 flex items-center justify-center font-black uppercase tracking-wider shadow-md",
                    statusAlign === 'left' && "left-1.5",
                    statusAlign === 'center' && "left-1/2 -translate-x-1/2",
                    statusAlign === 'right' && "right-1.5"
                  )}
                  style={{
                    bottom: `${6 + statusY}px`,
                    left: statusAlign === 'center' ? `calc(50% + ${statusX}px)` : undefined,
                    height: `${statusHeight}px`,
                    fontSize: `${statusFontSize}px`,
                    paddingLeft: `${statusPaddingX}px`,
                    paddingRight: `${statusPaddingX}px`,
                    backgroundColor: accentColor,
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                  }}
                >
                  {statusLabel}
                </div>
              )}
            </div>
          </div>

          {/* Title & Metadata next to poster */}
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-white text-black uppercase">
                ORIGINAL
              </span>
              <span className="text-[10px] font-bold text-white/80 border border-white/20 px-1.5 py-0.2 rounded">
                16+
              </span>
              <span className="text-[10px] font-bold text-white/80 border border-white/20 px-1.5 py-0.2 rounded">
                4K
              </span>
              <div className="flex items-center gap-1 ml-auto">
                {renderStars(selectedContent.vote_average || 8)}
                <span className="text-xs font-bold text-white">{(selectedContent.vote_average || 8).toFixed(1)}</span>
              </div>
            </div>

            <h1 
              className="text-2xl font-black tracking-tight leading-tight uppercase line-clamp-2 drop-shadow-md"
              style={{ color: titleColor }}
            >
              {mediaTitle}
            </h1>

            <div className="flex items-center gap-2 text-[11px] font-semibold mt-1" style={{ color: infoColor }}>
              <span>{releaseYear}</span>
              <span>•</span>
              <span>{selectedContent.media_type === 'tv' ? 'Série' : 'Filme'}</span>
              {selectedContent.genres && selectedContent.genres.length > 0 && (
                <>
                  <span>•</span>
                  <span>{selectedContent.genres.slice(0, 2).map(g => g.name).join(', ')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Synopsis Section */}
        {showSynopsis && (
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md mb-3">
            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: synopsisColor }}>
              {truncateSynopsis(selectedContent.overview || '', synopsisLength)}
            </p>
          </div>
        )}

        {/* Mockup Streaming Actions */}
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
            style={{ backgroundColor: accentColor, color: '#FFFFFF' }}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Assistir Agora</span>
          </div>

          <div className="h-11 px-4 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center gap-1.5 font-bold text-xs text-white/90">
            <Plus className="w-4 h-4" />
            <span>Minha Lista</span>
          </div>
        </div>

        {/* Streaming Features & Devices Footer */}
        <div className="mt-auto pb-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Servidor Anti-Travamento 100% Estável</span>
          </div>

          <div className="flex items-center gap-2.5 text-white/60">
            <Tv size={14} title="Smart TV" />
            <Smartphone size={14} title="Celular" />
            <Laptop size={14} title="Computador" />
            <Monitor size={14} title="TV Box" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingUiTemplate;
