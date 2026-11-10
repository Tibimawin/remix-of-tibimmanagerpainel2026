import React from 'react';
import { Smartphone, Laptop, Monitor, Tv, Star, Check, Zap, Sparkles } from 'lucide-react';
import { TMDBDetails } from '@/types/importacao';
import { cn } from '@/lib/utils';
import { TemplateProps } from './CyberGlowTemplate';

const FeedSquareTemplate = ({
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
  brandName = 'INFINITY STREAM'
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
    if (!text) return 'Adicionado ao catálogo com imagem em 4K e som espacial.';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const releaseYear = new Date(
    selectedContent.release_date || selectedContent.first_air_date || ''
  ).getFullYear() || '2026';

  const mediaTitle = selectedContent.title || selectedContent.name || 'Sem Título';

  return (
    <div className="relative w-[600px] h-[600px] bg-[#090B10] overflow-hidden flex flex-col p-6 font-sans text-white shadow-2xl rounded-none border border-neutral-800">
      {/* Background with Ambient Glow */}
      <div 
        className="absolute inset-0 z-0 scale-110"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/w1280${selectedContent.backdrop_path || selectedContent.poster_path})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `blur(${backgroundBlur}px)`,
        }}
      />
      
      {/* Dark Gradient Overlay */}
      <div 
        className="absolute inset-0 z-10 bg-gradient-to-r from-[#090B10]/95 via-[#090B10]/85 to-[#090B10]/75"
        style={{ opacity: overlayOpacity }}
      />

      {/* Decorative Radial Lighting */}
      <div 
        className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      {/* Top Header Row */}
      <div className="relative z-20 flex items-center justify-between pb-3 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          {showFeaturedLabel && featuredLabel.trim() && (
            <span 
              className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm backdrop-blur-md"
              style={{
                backgroundColor: `${accentColor}30`,
                borderColor: `${accentColor}80`,
                color: '#FFFFFF'
              }}
            >
              {featuredLabel}
            </span>
          )}
          <span className="text-[10px] font-bold text-white/70 bg-white/10 px-2 py-0.5 rounded">
            FEED 1:1
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
              alt="Brand Logo" 
              className="object-contain filter drop-shadow-md"
              style={{ maxHeight: `${Math.round(40 * (logoSize / 100))}px` }}
            />
          ) : (
            <div className="flex items-center gap-1.5 font-black text-xs tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>{brandName || 'INFINITY STREAM'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Split Section: Poster on Left, High-Conversion Details on Right */}
      <div className="relative z-20 flex-1 flex gap-5 items-center">
        {/* Left Side: 3D Poster */}
        <div className="relative flex-shrink-0 group">
          <div 
            className="relative rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black flex items-center justify-center"
            style={{
              width: `${posterWidth * 3.8}px`,
              height: `${posterHeight * 19}px`,
            }}
          >
            {selectedContent.poster_path ? (
              <img 
                src={`https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`} 
                alt={mediaTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-white/50">Sem Capa</span>
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
                  bottom: `${8 + statusY}px`,
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

        {/* Right Side: Media Info & Bullets */}
        <div className="flex-1 flex flex-col justify-center h-full gap-2">
          {/* Metadata Row */}
          <div className="flex items-center gap-2">
            {renderStars(selectedContent.vote_average || 8)}
            <span className="text-xs font-bold text-white">{(selectedContent.vote_average || 8).toFixed(1)}</span>
            <span className="text-white/40">•</span>
            <span className="text-[11px] font-semibold" style={{ color: infoColor }}>
              {releaseYear} • {selectedContent.media_type === 'tv' ? 'Série' : 'Filme'}
            </span>
          </div>

          {/* Title */}
          <h2 
            className="text-2xl font-black uppercase tracking-tight leading-tight line-clamp-2 drop-shadow-md"
            style={{ color: titleColor }}
          >
            {mediaTitle}
          </h2>

          {/* Genres */}
          {selectedContent.genres && selectedContent.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 my-0.5">
              {selectedContent.genres.slice(0, 3).map((g) => (
                <span 
                  key={g.id} 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/90 border border-white/10"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          {showSynopsis && (
            <p className="text-[11px] leading-relaxed line-clamp-2 text-white/80" style={{ color: synopsisColor }}>
              {truncateSynopsis(selectedContent.overview || '', synopsisLength)}
            </p>
          )}

          {/* High Conversion Bullets */}
          <div className="space-y-1.5 py-1.5 my-1 border-y border-white/10 text-[11px] font-semibold text-white/90">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>Qualidade 4K Ultra HD & Full HD</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>Servidor Estável Sem Travamentos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>Liberação Rápida e Imediata</span>
            </div>
          </div>

          {/* CTA Banner */}
          <div 
            className="p-2.5 rounded-xl flex items-center justify-between shadow-md"
            style={{ backgroundColor: accentColor, color: '#FFFFFF' }}
          >
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 fill-current animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">
                Solicite Seu Teste Grátis
              </span>
            </div>
            <span className="text-[10px] font-bold bg-black/40 px-2 py-0.5 rounded-full">
              Chame no WhatsApp
            </span>
          </div>
        </div>
      </div>

      {/* Footer Device Row */}
      <div className="relative z-20 flex items-center justify-between pt-3 mt-1 border-t border-white/10 text-white/70 text-xs">
        <span className="text-[10px] font-semibold" style={{ color: availableColor }}>
          Compatível com Smart TV, TV Box, Celular e PC
        </span>
        <div className="flex items-center gap-2.5">
          <Tv size={14} title="Smart TV" />
          <Smartphone size={14} title="Celular" />
          <Laptop size={14} title="PC" />
          <Monitor size={14} title="TV Box" />
        </div>
      </div>
    </div>
  );
};

export default FeedSquareTemplate;
