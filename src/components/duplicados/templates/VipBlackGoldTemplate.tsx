import React from 'react';
import { Smartphone, Laptop, Monitor, Tv, Star, Crown, Shield, Sparkles } from 'lucide-react';
import { TMDBDetails } from '@/types/importacao';
import { cn } from '@/lib/utils';
import { TemplateProps } from './CyberGlowTemplate';

const VipBlackGoldTemplate = ({
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
  infoColor = '#E2E8F0',
  synopsisColor = '#CBD5E1',
  availableColor = '#D4AF37',
  brandName = 'INFINITY VIP'
}: TemplateProps) => {
  const renderStars = (vote: number) => {
    const stars = Math.round(vote / 2);
    return (
      <div className="flex gap-0.5 text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={13} fill={i < stars ? "currentColor" : "none"} />
        ))}
      </div>
    );
  };

  const truncateSynopsis = (text: string, length: number) => {
    if (!text) return 'Experiência audiovisual de alto padrão com servidores dedicados e estabilidade máxima.';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const releaseYear = new Date(
    selectedContent.release_date || selectedContent.first_air_date || ''
  ).getFullYear() || '2026';

  const mediaTitle = selectedContent.title || selectedContent.name || 'Sem Título';

  return (
    <div className="relative w-[500px] h-[780px] bg-[#070709] overflow-hidden flex flex-col p-6 font-sans text-white shadow-2xl rounded-none border border-amber-500/30">
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
      
      {/* Dark Luxury Vignette Overlay */}
      <div 
        className="absolute inset-0 z-10 bg-gradient-to-b from-black/95 via-black/80 to-[#0c0a06]/98"
        style={{ opacity: overlayOpacity }}
      />

      {/* Gold Radial Lighting Accents */}
      <div className="absolute -top-24 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none bg-amber-500" />
      <div className="absolute -bottom-24 left-0 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none bg-amber-500" />

      {/* Luxury Border Inset */}
      <div className="absolute inset-2.5 z-15 border border-amber-400/20 rounded-lg pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between pb-3 mb-2 border-b border-amber-400/20">
        <div className="flex items-center gap-2 flex-nowrap flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md whitespace-nowrap flex-shrink-0">
            <Crown className="w-3.5 h-3.5 fill-black flex-shrink-0" />
            <span>ACESSO VIP</span>
          </div>
          <span className="text-[10px] font-bold text-amber-200/90 px-2 py-0.5 rounded border border-amber-400/20 bg-black/50 whitespace-nowrap flex-shrink-0">
            PREMIUM
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
              className="object-contain filter drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]"
              style={{ maxHeight: `${Math.round(40 * (logoSize / 100))}px` }}
            />
          ) : (
            <div className="flex items-center gap-1.5 font-black text-xs tracking-widest uppercase text-amber-300 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>{brandName || 'INFINITY VIP'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Center Poster with Golden Bevel */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center my-1">
        {showFeaturedLabel && featuredLabel.trim() && (
          <div className="mb-2.5 relative z-30">
            <span 
              className="text-[10px] font-black uppercase tracking-[0.2em] px-3.5 py-1 rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-200 shadow-md backdrop-blur-md whitespace-nowrap inline-block"
            >
              {featuredLabel}
            </span>
          </div>
        )}

        {/* Poster Wrapper */}
        <div className="relative group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 opacity-60 blur-sm" />
          
          <div 
            className="relative rounded-xl overflow-hidden border-2 border-amber-300/60 shadow-2xl bg-black flex items-center justify-center max-h-[350px]"
            style={{
              width: `${posterWidth * 4.2}px`,
              height: `${posterHeight * 20.5}px`,
            }}
          >
            {selectedContent.poster_path ? (
              <img 
                src={`https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`} 
                alt={mediaTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-amber-200/50">Sem Capa</span>
            )}

            {/* Status Ribbon on Poster */}
            {showStatusLabel && statusLabel.trim() && (
              <div 
                className={cn(
                  "absolute z-30 flex items-center justify-center font-black uppercase tracking-wider shadow-xl",
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
                  backgroundColor: accentColor || '#D4AF37',
                  color: '#FFFFFF',
                  borderRadius: '9999px',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.6)'
                }}
              >
                {statusLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Metadata & Info */}
      <div className="relative z-20 flex flex-col gap-2 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {renderStars(selectedContent.vote_average || 8)}
            <span className="text-xs font-bold text-amber-300">
              {(selectedContent.vote_average || 8.0).toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: infoColor }}>
            <span>{releaseYear}</span>
            <span>•</span>
            <span className="text-amber-200/90">{selectedContent.media_type === 'tv' ? 'Série' : 'Filme'}</span>
            {selectedContent.genres && selectedContent.genres.length > 0 && (
              <>
                <span>•</span>
                <span>{selectedContent.genres[0].name}</span>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 
          className="text-2xl font-black uppercase tracking-tight leading-tight line-clamp-1 drop-shadow-md"
          style={{ color: titleColor }}
        >
          {mediaTitle}
        </h2>

        {/* Synopsis */}
        {showSynopsis && (
          <p 
            className="text-[11px] leading-relaxed line-clamp-2 text-white/80"
            style={{ color: synopsisColor }}
          >
            {truncateSynopsis(selectedContent.overview || '', synopsisLength)}
          </p>
        )}

        {/* VIP Callout Bar */}
        <div className="mt-2 p-2.5 rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black shadow-md flex-shrink-0">
              <Shield className="w-4 h-4 fill-black" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-black text-amber-200 tracking-wide uppercase whitespace-nowrap">
                Servidor Dedicado VIP
              </span>
              <span className="text-[9px] text-white/70 whitespace-nowrap">
                Transmissão Fluida em Ultra HD 4K
              </span>
            </div>
          </div>

          {/* Devices */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 border border-amber-400/30 text-amber-300">
            <Tv size={13} title="Smart TV" />
            <Smartphone size={13} title="Celular" />
            <Laptop size={13} title="Notebook" />
            <Monitor size={13} title="TV Box" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipBlackGoldTemplate;
