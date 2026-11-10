import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Laptop, Monitor, Tv, Star, Zap, Sparkles, ShieldCheck, Film, Volume2 } from 'lucide-react';
import { TMDBDetails } from '@/types/importacao';
import { cn } from '@/lib/utils';

export interface TemplateProps {
  selectedContent: TMDBDetails;
  backgroundBlur: number;
  overlayOpacity: number;
  logo: string | null;
  logoPosition: 'left' | 'center' | 'right';
  logoSize: number;
  logoX: number;
  logoY: number;
  featuredLabel: string;
  showFeaturedLabel?: boolean;
  accentColor: string;
  posterWidth: number;
  posterHeight: number;
  statusLabel: string;
  showStatusLabel?: boolean;
  statusHeight?: number;
  statusFontSize?: number;
  statusPaddingX?: number;
  statusX?: number;
  statusY?: number;
  statusAlign?: 'left' | 'center' | 'right';
  showSynopsis: boolean;
  synopsisLength: number;
  titleColor?: string;
  infoColor?: string;
  synopsisColor?: string;
  availableColor?: string;
  brandName?: string;
}

const CyberGlowTemplate = ({
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
  infoColor = '#94A3B8',
  synopsisColor = '#CBD5E1',
  availableColor = '#94A3B8',
  brandName = 'INFINITY STREAM'
}: TemplateProps) => {
  const renderStars = (vote: number) => {
    const stars = Math.round(vote / 2);
    return (
      <div className="flex gap-0.5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={13} fill={i < stars ? "currentColor" : "none"} />
        ))}
      </div>
    );
  };

  const truncateSynopsis = (text: string, length: number) => {
    if (!text) return 'Prepare-se para uma experiência cinematográfica imperdível com gráficos e som em alta definição.';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const releaseYear = new Date(
    selectedContent.release_date || selectedContent.first_air_date || ''
  ).getFullYear() || '2026';

  const mediaTitle = selectedContent.title || selectedContent.name || 'Título Indisponível';

  return (
    <div className="relative w-[500px] h-[780px] bg-[#07090E] overflow-hidden flex flex-col p-6 font-sans text-white shadow-2xl rounded-none border border-white/10">
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
      
      {/* Dark Cyberpunk Vignette Overlay */}
      <div 
        className="absolute inset-0 z-10 bg-gradient-to-b from-[#05070B]/90 via-[#07090E]/80 to-[#030407]/98"
        style={{ opacity: overlayOpacity }}
      />

      {/* Cyber Grid Lines & Neon Radial Highlights */}
      <div 
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />
      <div 
        className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      {/* Futuristic Header Bar */}
      <div className="relative z-20 flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        {/* Left Tag: Cyber Pill */}
        <div className="flex items-center gap-1.5">
          <div 
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border border-white/20"
            style={{ 
              backgroundColor: `${accentColor}25`,
              color: accentColor,
              borderColor: `${accentColor}60`
            }}
          >
            <Zap className="w-3 h-3 animate-pulse" />
            <span>4K ULTRA HD</span>
          </div>

          <div className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-bold text-white/80 border border-white/10">
            HDR10+
          </div>
          <div className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-bold text-white/80 border border-white/10 flex items-center gap-1">
            <Volume2 className="w-2.5 h-2.5" /> 5.1
          </div>
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
              className="object-contain filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
              style={{ maxHeight: `${Math.round(40 * (logoSize / 100))}px` }}
            />
          ) : (
            <div className="flex items-center gap-1.5 font-black text-xs tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span className="bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                {brandName || 'INFINITY STREAM'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Center Section: Glowing 3D Glass Poster */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center my-1">
        {/* Optional Top Featured Label */}
        {showFeaturedLabel && featuredLabel.trim() && (
          <div className="mb-2.5">
            <span 
              className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm backdrop-blur-md"
              style={{
                backgroundColor: `${accentColor}30`,
                borderColor: `${accentColor}80`,
                color: '#FFFFFF'
              }}
            >
              {featuredLabel}
            </span>
          </div>
        )}

        {/* Poster Wrapper with Cyber Neon Frame */}
        <div className="relative group">
          {/* Neon Glow Aura */}
          <div 
            className="absolute -inset-1.5 rounded-2xl blur-md opacity-70 transition duration-500"
            style={{ backgroundColor: accentColor }}
          />

          {/* Poster Container */}
          <div 
            className="relative rounded-xl overflow-hidden border border-white/30 shadow-2xl bg-black/80 flex items-center justify-center"
            style={{
              width: `${posterWidth * 4.4}px`,
              height: `${posterHeight * 22}px`,
            }}
          >
            {selectedContent.poster_path ? (
              <img 
                src={`https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`} 
                alt={mediaTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center text-white/50">
                <Film className="w-12 h-12 mb-2" />
                <span className="text-xs">Sem Capa</span>
              </div>
            )}

            {/* Poster Inner Specular Reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />

            {/* Status / Category Ribbon Badge */}
            {showStatusLabel && statusLabel.trim() && (
              <div 
                className={cn(
                  "absolute z-30 flex items-center justify-center font-black uppercase tracking-wider shadow-lg",
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
                  borderRadius: '9999px',
                  boxShadow: `0 4px 15px ${accentColor}80`,
                }}
              >
                {statusLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Info Section */}
      <div className="relative z-20 flex flex-col gap-2 pt-2 pb-1">
        {/* Rating and Metadata Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {renderStars(selectedContent.vote_average || 8)}
            <span className="text-xs font-bold text-white/90">
              {(selectedContent.vote_average || 8.0).toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: infoColor }}>
            <span>{releaseYear}</span>
            <span>•</span>
            <span>{selectedContent.media_type === 'tv' ? 'Série Completa' : 'Filme'}</span>
            {selectedContent.genres && selectedContent.genres.length > 0 && (
              <>
                <span>•</span>
                <span className="text-white/80">{selectedContent.genres.slice(0, 2).map(g => g.name).join(', ')}</span>
              </>
            )}
          </div>
        </div>

        {/* Media Title */}
        <h2 
          className="text-2xl font-black tracking-tight leading-tight uppercase line-clamp-1 drop-shadow-md"
          style={{ color: titleColor }}
        >
          {mediaTitle}
        </h2>

        {/* Synopsis */}
        {showSynopsis && (
          <p 
            className="text-[11px] leading-relaxed line-clamp-2"
            style={{ color: synopsisColor }}
          >
            {truncateSynopsis(selectedContent.overview || '', synopsisLength)}
          </p>
        )}

        {/* High Conversion Cyber Call To Action & Devices */}
        <div 
          className="mt-2 p-2.5 rounded-xl border border-white/10 flex items-center justify-between backdrop-blur-md"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shadow-md"
              style={{ backgroundColor: accentColor }}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-white tracking-wide uppercase">
                Assista Sem Travamentos
              </span>
              <span className="text-[9px]" style={{ color: availableColor }}>
                Disponível em todos os aparelhos
              </span>
            </div>
          </div>

          {/* Device Icons Capsule */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 text-white/80">
            <Tv size={13} title="Smart TV" />
            <Smartphone size={13} title="Celular" />
            <Laptop size={13} title="Computador" />
            <Monitor size={13} title="TV Box" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyberGlowTemplate;
