import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Star, Flame, Sparkles, Volume2, ShieldCheck, Film } from 'lucide-react';
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

const StoriesTemplate: React.FC<TemplateProps> = ({
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
  synopsisColor = 'rgba(212,212,216,0.9)',
  availableColor = '#FFFFFF'
}) => {
  const renderStars = (vote: number) => {
    const stars = Math.round(vote / 2);
    return (
      <div className="flex gap-1 text-yellow-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} fill={i < stars ? 'currentColor' : 'none'} />
        ))}
      </div>
    );
  };

  const truncateSynopsis = (text: string, length: number) => {
    if (!text) return 'Sinopse não disponível para este título.';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const releaseYear = new Date(
    selectedContent.release_date || selectedContent.first_air_date || ''
  ).getFullYear() || '2026';

  return (
    <div className="relative w-[480px] h-[850px] bg-neutral-950 overflow-hidden flex flex-col p-6 font-sans text-white shadow-2xl rounded-2xl border border-white/10">
      {/* Background Poster / Backdrop with Blur */}
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
        className="absolute inset-0 z-10 bg-gradient-to-b from-black/80 via-black/60 to-black/95"
        style={{ opacity: overlayOpacity }}
      />

      {/* Stories Progress Bar Header */}
      <div className="relative z-20 flex gap-1.5 w-full mb-4">
        <div className="h-1 flex-1 rounded-full bg-white/80" />
        <div className="h-1 flex-1 rounded-full bg-white/40" />
        <div className="h-1 flex-1 rounded-full bg-white/20" />
      </div>

      {/* Header with Logo and Tags */}
      <div className="relative z-20 flex items-center justify-between mb-4">
        {/* Logo Section */}
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
              alt="Logo"
              style={{ width: `${logoSize * 0.8}%` }}
              className="max-h-12 object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15">
              <Sparkles size={14} style={{ color: accentColor }} />
              <span className="text-xs font-black tracking-wider uppercase">CineStream</span>
            </div>
          )}
        </div>

        {/* Top Badges */}
        {showFeaturedLabel && featuredLabel?.trim() ? (
          <div className="flex items-center gap-2">
            <Badge
              className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 border rounded-md"
              style={{
                backgroundColor: `${accentColor}25`,
                color: accentColor,
                borderColor: `${accentColor}50`,
              }}
            >
              <Flame size={12} className="mr-1 inline-block" />
              {featuredLabel.trim()}
            </Badge>
          </div>
        ) : null}
      </div>

      {/* Poster Central com Efeito Glassmorphism & Shadow */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center my-2">
        <div
          className="relative rounded-2xl overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.8)] border-2 border-white/20 bg-neutral-900 group"
          style={{
            width: `${posterWidth}%`,
            aspectRatio: `9 / ${posterHeight}`,
            maxWidth: '310px',
          }}
        >
          {/* Capa do Filme */}
          <img
            src={`https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`}
            alt={selectedContent.title || selectedContent.name}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />

          {/* Brilho Superior */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

          {/* Rótulo Superior Customizável (ex: LANÇAMENTOS) */}
          {showStatusLabel && statusLabel?.trim() ? (
            <div
              className={cn(
                'absolute top-3 left-3 right-3 flex z-30 pointer-events-none',
                statusAlign === 'left' && 'justify-start',
                statusAlign === 'center' && 'justify-center',
                statusAlign === 'right' && 'justify-end'
              )}
              style={{ transform: `translate(${statusX}%, ${statusY}%)` }}
            >
              <Badge
                className="font-black rounded-full bg-white text-black shadow-2xl inline-flex items-center justify-center transition-all border-none"
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

          {/* Badges de Qualidade no Poster */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-30">
            <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white border border-white/10 uppercase">
              4K ULTRA HD
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/90 text-black font-black text-[10px]">
              <Star size={10} fill="currentColor" />
              <span>{(selectedContent.vote_average || 7.5).toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section / Footer do Story */}
      <div className="relative z-20 mt-auto pt-4 space-y-3">
        {/* Título Principal */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black uppercase tracking-tight leading-tight drop-shadow-md text-white">
            {selectedContent.title || selectedContent.name}
          </h1>

          <div className="flex items-center justify-center gap-2 text-xs text-neutral-300 font-semibold">
            <span>{releaseYear}</span>
            <span>•</span>
            <span className="text-primary font-bold" style={{ color: accentColor }}>
              {selectedContent.genres?.slice(0, 2).map((g) => g.name).join(' / ') || 'Ação'}
            </span>
            {selectedContent.runtime && (
              <>
                <span>•</span>
                <span>{selectedContent.runtime} min</span>
              </>
            )}
          </div>
        </div>

        {/* Avaliação em estrelas */}
        <div className="flex justify-center items-center gap-2">
          {renderStars(selectedContent.vote_average)}
        </div>

        {/* Sinopse */}
        {showSynopsis && (
          <p className="text-xs text-neutral-300/90 leading-relaxed text-center line-clamp-3 max-w-[92%] mx-auto bg-black/40 backdrop-blur-md p-2.5 rounded-xl border border-white/5">
            {truncateSynopsis(selectedContent.overview, synopsisLength)}
          </p>
        )}

        {/* Bottom CTA / Disponibilidade */}
        <div className="pt-2">
          <div
            className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-between shadow-xl border border-white/20"
            style={{
              backgroundColor: accentColor,
              color: '#ffffff',
            }}
          >
            <div className="flex items-center gap-2">
              <Film size={16} />
              <span>DISPONÍVEL NO CATÁLOGO</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold bg-black/30 px-2 py-1 rounded-md">
              <ShieldCheck size={12} />
              <span>100% ONLINE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoriesTemplate;
