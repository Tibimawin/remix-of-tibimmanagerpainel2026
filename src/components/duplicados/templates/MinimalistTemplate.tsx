import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Tv, Video, Clapperboard, Calendar, Globe } from 'lucide-react';
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
}

const MinimalistTemplate: React.FC<TemplateProps> = ({
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
  infoColor = '#D4D4D4',
  synopsisColor = 'rgba(212,212,216,0.8)',
  availableColor = '#A1A1AA'
}) => {
  const renderStars = (vote: number) => {
    const stars = Math.round(vote / 2);
    return (
      <div className="flex gap-1 text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={13} fill={i < stars ? 'currentColor' : 'none'} />
        ))}
      </div>
    );
  };

  const truncateSynopsis = (text: string, length: number) => {
    if (!text) return 'Uma experiência cinematográfica exclusiva e imperdível.';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const releaseYear = new Date(
    selectedContent.release_date || selectedContent.first_air_date || ''
  ).getFullYear() || '2026';

  return (
    <div className="relative w-[490px] h-[780px] bg-[#0c0d11] overflow-hidden flex flex-col p-7 font-sans text-white shadow-2xl rounded-sm border border-neutral-800">
      {/* Background Ambience */}
      <div
        className="absolute inset-0 z-0 scale-105"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/w1280${selectedContent.backdrop_path})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `blur(${backgroundBlur + 2}px)`,
        }}
      />

      {/* Dark Cinematic Vignette */}
      <div
        className="absolute inset-0 z-10 bg-gradient-to-b from-[#0c0d11]/90 via-[#0c0d11]/75 to-[#0c0d11]/98"
        style={{ opacity: overlayOpacity }}
      />

      {/* Elegant Outer Border Inset */}
      <div className="absolute inset-3 z-15 border border-white/10 rounded-sm pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between pb-3 border-b border-white/10">
        <div
          className={cn(
            'flex items-center',
            logoPosition === 'left' && 'justify-start',
            logoPosition === 'center' && 'justify-center flex-1',
            logoPosition === 'right' && 'justify-end flex-1'
          )}
          style={{ transform: `translate(${logoX}%, ${logoY}%)` }}
        >
          {logo ? (
            <img
              src={logo}
              alt="Brand Logo"
              style={{ width: `${logoSize * 0.75}%` }}
              className="max-h-11 object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <Clapperboard size={16} style={{ color: accentColor }} />
              <span className="text-xs font-black tracking-[0.25em] uppercase text-white/90">
                PREMIERE EXCLUSIVE
              </span>
            </div>
          )}
        </div>

        {showFeaturedLabel && featuredLabel?.trim() ? (
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-white/5 border border-white/10">
            <Award size={13} style={{ color: accentColor }} />
            <span>{featuredLabel.trim()}</span>
          </div>
        ) : null}
      </div>

      {/* Main Content Area: Grid with Poster & Editorial Block */}
      <div className="relative z-20 flex-1 flex gap-6 items-center my-4">
        {/* Left / Center Poster */}
        <div
          className="relative rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/20 flex-shrink-0"
          style={{
            width: `${posterWidth}%`,
            aspectRatio: `9 / ${posterHeight}`,
            maxWidth: '220px',
          }}
        >
          <img
            src={`https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`}
            alt={selectedContent.title || selectedContent.name}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />

          {/* Rótulo Superior Customizável */}
          {showStatusLabel && statusLabel?.trim() ? (
            <div
              className={cn(
                'absolute top-2.5 left-2.5 right-2.5 flex z-30 pointer-events-none',
                statusAlign === 'left' && 'justify-start',
                statusAlign === 'center' && 'justify-center',
                statusAlign === 'right' && 'justify-end'
              )}
              style={{ transform: `translate(${statusX}%, ${statusY}%)` }}
            >
              <Badge
                className="font-black rounded bg-white text-black shadow-2xl inline-flex items-center justify-center transition-all border-none"
                style={{
                  height: `${statusHeight}px`,
                  fontSize: `${statusFontSize}px`,
                  paddingLeft: `${statusPaddingX}px`,
                  paddingRight: `${statusPaddingX}px`,
                  lineHeight: 1,
                }}
              >
                {statusLabel.trim()}
              </Badge>
            </div>
          ) : null}

          <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-center border border-white/10">
            <span className="text-[9px] font-mono tracking-widest text-white/80 uppercase">
              IMAX QUALITY
            </span>
          </div>
        </div>

        {/* Right Editorial Info */}
        <div className="flex-1 flex flex-col justify-center space-y-3">
          <div className="flex items-center gap-2">
            {renderStars(selectedContent.vote_average)}
            <span className="text-xs font-bold text-white/70">
              ({(selectedContent.vote_average || 8.0).toFixed(1)}/10)
            </span>
          </div>

          <h1 className="text-2xl font-black uppercase tracking-tight leading-tight drop-shadow-md" style={{ color: titleColor }}>
            {selectedContent.title || selectedContent.name}
          </h1>

          <div className="flex flex-wrap gap-1.5">
            {selectedContent.genres?.slice(0, 3).map((g) => (
              <span
                key={g.id}
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 border border-white/5"
                style={{ color: infoColor }}
              >
                {g.name}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono" style={{ color: infoColor }}>
            <span className="flex items-center gap-1">
              <Calendar size={12} style={{ color: accentColor }} />
              {releaseYear}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Globe size={12} />
              {(selectedContent.original_language || 'EN').toUpperCase()}
            </span>
          </div>

          {showSynopsis && (
            <p className="text-xs leading-relaxed line-clamp-4 border-l-2 pl-2.5" style={{ color: synopsisColor, borderColor: accentColor }}>
              {truncateSynopsis(selectedContent.overview, synopsisLength)}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Editorial Credits Strip */}
      <div className="relative z-20 pt-3 border-t border-white/10 mt-auto flex items-center justify-between text-neutral-400">
        <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest">
          <span className="flex items-center gap-1 text-white">
            <Video size={13} style={{ color: accentColor }} />
            Full HD & 4K
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-white">
            <Tv size={13} />
            Smart TV / Mobile
          </span>
        </div>

        <div
          className="px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-white shadow-md"
          style={{ backgroundColor: accentColor }}
        >
          Assista Já
        </div>
      </div>
    </div>
  );
};

export default MinimalistTemplate;
