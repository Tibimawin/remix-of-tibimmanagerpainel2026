import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Film,
  Sparkles,
  Volume2,
  VolumeX,
  Video,
  Monitor,
  Smartphone,
  Flame,
  Award,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { TMDBDetails } from '@/types/importacao';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type VideoTemplateType = 'reels-neon' | 'cinema-widescreen' | 'glitch-cyber' | 'imax-gold';

interface VideoPostGeneratorProps {
  selectedContent: TMDBDetails;
  accentColor: string;
  statusLabel: string;
  showStatusLabel?: boolean;
  featuredLabel: string;
  showFeaturedLabel?: boolean;
  statusHeight?: number;
  statusFontSize?: number;
  statusY?: number;
  logo: string | null;
  onToggleStatusLabel?: (show: boolean) => void;
  onToggleFeaturedLabel?: (show: boolean) => void;
}

export const VideoPostGenerator: React.FC<VideoPostGeneratorProps> = ({
  selectedContent,
  accentColor,
  statusLabel,
  showStatusLabel = true,
  featuredLabel,
  showFeaturedLabel = true,
  statusHeight = 28,
  statusFontSize = 14,
  statusY = 0,
  logo,
  onToggleStatusLabel,
  onToggleFeaturedLabel,
}) => {
  const [videoTemplate, setVideoTemplate] = useState<VideoTemplateType>('reels-neon');
  const [duration, setDuration] = useState<number>(5); // seconds
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);

  // Sincronização dos estados de visibilidade dos rótulos
  const [internalShowStatusLabel, setInternalShowStatusLabel] = useState(showStatusLabel);
  const [internalShowFeaturedLabel, setInternalShowFeaturedLabel] = useState(showFeaturedLabel);

  useEffect(() => {
    setInternalShowStatusLabel(showStatusLabel);
  }, [showStatusLabel]);

  useEffect(() => {
    setInternalShowFeaturedLabel(showFeaturedLabel);
  }, [showFeaturedLabel]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const audioContextRef = useRef<AudioContext | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  // Loaded images refs
  const posterImgRef = useRef<HTMLImageElement | null>(null);
  const backdropImgRef = useRef<HTMLImageElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);

  // Dimensões do canvas baseadas no template selecionado
  const canvasWidth = videoTemplate === 'cinema-widescreen' ? 1280 : 720;
  const canvasHeight = videoTemplate === 'cinema-widescreen' ? 720 : 1280;

  // Carrega as imagens
  useEffect(() => {
    let active = true;
    setImagesLoaded(false);

    const loadImg = (src: string): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    const posterUrl = selectedContent.poster_path
      ? `https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`
      : '';
    const backdropUrl = selectedContent.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${selectedContent.backdrop_path}`
      : posterUrl;

    Promise.all([
      loadImg(posterUrl),
      loadImg(backdropUrl),
      logo ? loadImg(logo) : Promise.resolve(null),
    ]).then(([poster, backdrop, logoImg]) => {
      if (!active) return;
      posterImgRef.current = poster;
      backdropImgRef.current = backdrop;
      logoImgRef.current = logoImg;
      setImagesLoaded(true);
      startTimeRef.current = Date.now();
    });

    return () => {
      active = false;
    };
  }, [selectedContent, logo]);

  // Renderizador: Reels Neon (Vertical 9:16)
  const renderReelsNeon = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    progress: number,
    elapsedSec: number
  ) => {
    // Stories Progress Bar no topo
    const barY = 24;
    const barH = 5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(30, barY, W - 60, barH, 3);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(30, barY, (W - 60) * progress, barH, 3);
    ctx.fill();

    // Top Header: Logo ou Marca
    const logoY = 60;
    if (logoImgRef.current) {
      const logoAspect = logoImgRef.current.width / logoImgRef.current.height;
      const lw = 140;
      const lh = lw / logoAspect;
      ctx.drawImage(logoImgRef.current, 36, logoY, lw, lh);
    } else {
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('CINESTREAM', 36, logoY + 20);
    }

    // Featured Badge Top Right
    if (internalShowFeaturedLabel && featuredLabel) {
      const featText = featuredLabel;
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      const featWidth = ctx.measureText(featText).width + 30;
      const featX = W - featWidth - 36;
      ctx.fillStyle = `${accentColor}40`;
      ctx.beginPath();
      ctx.roundRect(featX, logoY, featWidth, 34, 17);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(featText, featX + 15, logoY + 23);
    }

    // Poster Central Flutuante com Glow
    const poster = posterImgRef.current;
    if (poster) {
      const pw = W * 0.62;
      const ph = pw * 1.48;
      const px = (W - pw) / 2;
      // Movimento suave de respiração/flutuação
      const floatOffset = Math.sin(elapsedSec * 2) * 8;
      const py = 150 + floatOffset;

      // Glow Neon ao redor do poster
      const pulseGlow = (Math.sin(elapsedSec * 3) + 1) * 0.5;
      ctx.save();
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 30 + pulseGlow * 25;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 24);
      ctx.stroke();
      ctx.restore();

      // Desenha Poster
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 24);
      ctx.clip();
      ctx.drawImage(poster, px, py, pw, ph);

      // Feixe de luz correndo na diagonal pela capa
      const lightSweepX = px - pw + (pw * 3) * ((elapsedSec * 0.4) % 1);
      const sweepGrad = ctx.createLinearGradient(lightSweepX, py, lightSweepX + 140, py + ph);
      sweepGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sweepGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.28)');
      sweepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(px, py, pw, ph);
      ctx.restore();

      // Rótulo Superior Customizável (ex: LANÇAMENTOS)
      if (internalShowStatusLabel && statusLabel) {
        ctx.save();
        const baseBadgeY = py + 20 + statusY;
        const bHeight = Math.max(statusHeight, 22);
        const bFontSize = Math.max(statusFontSize, 11);
        ctx.font = `900 ${bFontSize}px system-ui, -apple-system, sans-serif`;
        const textMetrics = ctx.measureText(statusLabel);
        const bWidth = textMetrics.width + 36;
        const bx = px + (pw - bWidth) / 2;

        // Shadow do badge
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(bx, baseBadgeY, bWidth, bHeight, bHeight / 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.fillText(statusLabel, bx + 18, baseBadgeY + bHeight / 2 + bFontSize / 3);
        ctx.restore();
      }
    }

    // Informações Inferiores: Título, Gênero e Ano
    const infoY = H - 380;
    const titleText = (selectedContent.title || selectedContent.name || '').toUpperCase();
    ctx.save();
    ctx.font = '900 38px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 20;

    // Se o título for muito longo, encurta
    const displayTitle = ctx.measureText(titleText).width > W - 80 ? (ctx.font = '900 30px system-ui, -apple-system, sans-serif', titleText) : titleText;
    ctx.fillText(displayTitle, W / 2, infoY);
    ctx.restore();

    // Ano e Gêneros
    const releaseYear = new Date(
      selectedContent.release_date || selectedContent.first_air_date || ''
    ).getFullYear() || '2026';
    const genres = selectedContent.genres?.slice(0, 3).map((g) => g.name).join(' • ') || 'Filme';

    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'center';
    ctx.fillText(`${releaseYear}  |  ${genres.toUpperCase()}`, W / 2, infoY + 40);

    // Barras de Áudio / Equalizador Sonoro Animado
    const eqY = H - 240;
    const barCount = 20;
    const barWidth = 6;
    const barGap = 6;
    const totalEqWidth = barCount * (barWidth + barGap);
    const eqStartX = (W - totalEqWidth) / 2;

    for (let b = 0; b < barCount; b++) {
      const freq = Math.sin(elapsedSec * 6 + b * 0.7) * 0.5 + 0.5;
      const bHeight = 12 + freq * 36;
      ctx.fillStyle = b % 2 === 0 ? accentColor : '#ffffff';
      ctx.beginPath();
      ctx.roundRect(eqStartX + b * (barWidth + barGap), eqY - bHeight / 2, barWidth, bHeight, 3);
      ctx.fill();
    }

    // Call to Action Box no Rodapé
    const ctaY = H - 140;
    ctx.save();
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 25;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(40, ctaY, W - 80, 68, 20);
    ctx.fill();
    ctx.restore();

    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('ASSISTA AGORA NA SUA LISTA', W / 2, ctaY + 42);
  }, [accentColor, featuredLabel, internalShowFeaturedLabel, statusHeight, statusFontSize, statusLabel, internalShowStatusLabel, statusY, selectedContent]);

  // Renderizador: Cinema Widescreen (16:9)
  const renderCinemaWidescreen = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    progress: number,
    elapsedSec: number
  ) => {
    // Backdrop Pan lateral
    // Layout 2 colunas: Esquerda (Texto & Info), Direita (Poster 3D)
    const poster = posterImgRef.current;
    if (poster) {
      const pw = 340;
      const ph = 500;
      const px = W - pw - 90;
      const py = (H - ph) / 2 + Math.sin(elapsedSec * 1.5) * 6;

      ctx.save();
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 40;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.clip();
      ctx.drawImage(poster, px, py, pw, ph);

      // Shimmer sweep
      const sweepX = px - pw + (pw * 3) * ((elapsedSec * 0.35) % 1);
      const sweepGrad = ctx.createLinearGradient(sweepX, py, sweepX + 160, py + ph);
      sweepGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sweepGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
      sweepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(px, py, pw, ph);
      ctx.restore();

      // Status Badge no Poster
      if (internalShowStatusLabel && statusLabel) {
        ctx.save();
        const baseBadgeY = py + 20 + statusY;
        const bHeight = Math.max(statusHeight, 24);
        const bFontSize = Math.max(statusFontSize, 12);
        ctx.font = `900 ${bFontSize}px system-ui, -apple-system, sans-serif`;
        const bWidth = ctx.measureText(statusLabel).width + 36;
        const bx = px + (pw - bWidth) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(bx, baseBadgeY, bWidth, bHeight, bHeight / 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.fillText(statusLabel, bx + 18, baseBadgeY + bHeight / 2 + bFontSize / 3);
        ctx.restore();
      }
    }

    // Lado Esquerdo: Tipografia Cinemática
    const leftX = 80;
    let textY = 160;

    // Tag Destaque
    if (internalShowFeaturedLabel && featuredLabel) {
      ctx.font = '900 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = accentColor;
      ctx.textAlign = 'left';
      ctx.fillText(featuredLabel.toUpperCase(), leftX, textY);
      textY += 60;
    } else {
      textY += 20;
    }

    // Título Grande
    ctx.font = '900 52px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    const titleText = (selectedContent.title || selectedContent.name || '').toUpperCase();
    ctx.fillText(titleText.length > 25 ? titleText.slice(0, 25) + '...' : titleText, leftX, textY);

    textY += 45;

    // Metadados
    const releaseYear = new Date(
      selectedContent.release_date || selectedContent.first_air_date || ''
    ).getFullYear() || '2026';
    const genres = selectedContent.genres?.slice(0, 3).map((g) => g.name).join(' • ') || 'Cinema';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`${releaseYear}  •  ${genres}  •  ULTRA HD 4K`, leftX, textY);

    textY += 45;

    // Sinopse
    if (selectedContent.overview) {
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      const words = selectedContent.overview.slice(0, 160) + '...';
      ctx.fillText(words, leftX, textY);
    }

    // Botão CTA
    const btnY = H - 180;
    ctx.save();
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 30;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(leftX, btnY, 280, 56, 14);
    ctx.fill();
    ctx.restore();

    ctx.font = '900 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ASSISTIR TRAILER', leftX + 45, btnY + 35);
  }, [accentColor, featuredLabel, internalShowFeaturedLabel, statusHeight, statusFontSize, statusLabel, internalShowStatusLabel, statusY, selectedContent]);

  // Renderizador: IMAX Gold / Cartaz Dourado (Vertical 9:16)
  const renderImaxGold = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    progress: number,
    elapsedSec: number
  ) => {
    // Header sutil de luxo
    const logoY = 60;
    if (logoImgRef.current) {
      const logoAspect = logoImgRef.current.width / logoImgRef.current.height;
      const lw = 130;
      const lh = lw / logoAspect;
      ctx.drawImage(logoImgRef.current, 36, logoY, lw, lh);
    } else {
      ctx.font = '900 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('CINEMA GOLD', 36, logoY + 18);
    }

    // Featured Badge Top Right (Dourado / Accent)
    if (internalShowFeaturedLabel && featuredLabel) {
      const featText = featuredLabel;
      ctx.font = '900 13px system-ui, -apple-system, sans-serif';
      const featWidth = ctx.measureText(featText).width + 30;
      const featX = W - featWidth - 36;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.beginPath();
      ctx.roundRect(featX, logoY, featWidth, 32, 16);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fef3c7';
      ctx.fillText(featText, featX + 15, logoY + 21);
    }

    // Poster Central Flutuante com Golden Rim Light
    const poster = posterImgRef.current;
    if (poster) {
      const pw = W * 0.64;
      const ph = pw * 1.48;
      const px = (W - pw) / 2;
      const floatOffset = Math.sin(elapsedSec * 1.8) * 6;
      const py = 140 + floatOffset;

      // Glow Dourado
      ctx.save();
      ctx.shadowColor = accentColor || '#f59e0b';
      ctx.shadowBlur = 35 + Math.sin(elapsedSec * 2.5) * 15;
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 20);
      ctx.stroke();
      ctx.restore();

      // Desenha o Poster
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 20);
      ctx.clip();
      ctx.drawImage(poster, px, py, pw, ph);

      // Reflexo de lente dourada passando
      const shineX = px - pw + (pw * 3) * ((elapsedSec * 0.3) % 1);
      const shineGrad = ctx.createLinearGradient(shineX, py, shineX + 130, py + ph);
      shineGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
      shineGrad.addColorStop(0.5, 'rgba(254, 243, 199, 0.35)');
      shineGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = shineGrad;
      ctx.fillRect(px, py, pw, ph);
      ctx.restore();

      // Rótulo Superior Customizável (ex: LANÇAMENTOS)
      if (internalShowStatusLabel && statusLabel) {
        ctx.save();
        const baseBadgeY = py + 20 + statusY;
        const bHeight = Math.max(statusHeight, 22);
        const bFontSize = Math.max(statusFontSize, 11);
        ctx.font = `900 ${bFontSize}px system-ui, -apple-system, sans-serif`;
        const textMetrics = ctx.measureText(statusLabel);
        const bWidth = textMetrics.width + 36;
        const bx = px + (pw - bWidth) / 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 15;
        const badgeGrad = ctx.createLinearGradient(bx, baseBadgeY, bx + bWidth, baseBadgeY + bHeight);
        badgeGrad.addColorStop(0, '#fef08a');
        badgeGrad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = badgeGrad;
        ctx.beginPath();
        ctx.roundRect(bx, baseBadgeY, bWidth, bHeight, bHeight / 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.fillText(statusLabel, bx + 18, baseBadgeY + bHeight / 2 + bFontSize / 3);
        ctx.restore();
      }
    }

    // Informações Inferiores Elegantes
    const infoY = H - 390;
    const titleText = (selectedContent.title || selectedContent.name || '').toUpperCase();
    ctx.save();
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 20;

    const displayTitle = ctx.measureText(titleText).width > W - 80 ? (ctx.font = '900 28px system-ui, -apple-system, sans-serif', titleText) : titleText;
    ctx.fillText(displayTitle, W / 2, infoY);

    // Avaliação por estrelas douradas
    const starsY = infoY + 40;
    const voteAvg = selectedContent.vote_average || 8.5;
    const starsCount = Math.round(voteAvg / 2);
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('★'.repeat(starsCount) + '☆'.repeat(5 - starsCount), W / 2, starsY);

    // Gêneros e Ano
    const metaY = starsY + 38;
    const releaseYear = new Date(
      selectedContent.release_date || selectedContent.first_air_date || ''
    ).getFullYear() || '2026';
    const genres = selectedContent.genres?.slice(0, 2).map((g) => g.name).join(' • ') || 'Exclusivo';
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText(`${releaseYear}  •  ${genres}  •  IMAX EXPERIENCE`, W / 2, metaY);
    ctx.restore();

    // CTA Box no Rodapé
    const ctaY = H - 140;
    ctx.save();
    ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
    ctx.shadowBlur = 25;
    const ctaGrad = ctx.createLinearGradient(40, ctaY, W - 40, ctaY + 68);
    ctaGrad.addColorStop(0, '#f59e0b');
    ctaGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = ctaGrad;
    ctx.beginPath();
    ctx.roundRect(40, ctaY, W - 80, 68, 20);
    ctx.fill();
    ctx.restore();

    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('DISPONÍVEL AGORA EM ALTA DEFINIÇÃO', W / 2, ctaY + 42);
  }, [accentColor, featuredLabel, internalShowFeaturedLabel, statusHeight, statusFontSize, statusLabel, internalShowStatusLabel, statusY, selectedContent]);

  // Renderizador: Glitch Cyber (Vertical 9:16)
  const renderGlitchCyber = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    progress: number,
    elapsedSec: number
  ) => {
    // Efeito scanlines CRT
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Roda base similar a Reels Neon com estética cyberpunk
    renderReelsNeon(ctx, W, H, progress, elapsedSec);

    // Glitch flash estroboscópico sutil a cada 1.5s
    const isGlitchMoment = Math.sin(elapsedSec * 4) > 0.94;
    if (isGlitchMoment) {
      ctx.fillStyle = `${accentColor}30`;
      ctx.fillRect(0, (elapsedSec * 250) % H, W, 25);
    }
  }, [accentColor, renderReelsNeon]);

  // Função para desenhar cada frame da animação no canvas
  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, elapsedSec: number) => {
      const W = canvasWidth;
      const H = canvasHeight;
      const progress = (elapsedSec % duration) / duration; // 0 to 1

      // Limpa fundo
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      // 1. Desenha backdrop com efeito dinâmico
      const backdrop = backdropImgRef.current || posterImgRef.current;
      if (backdrop) {
        ctx.save();
        // Zoom Ken Burns sutil
        const scale = 1 + progress * 0.12;
        const panX = Math.sin(progress * Math.PI) * 25;
        const panY = Math.cos(progress * Math.PI) * 15;

        ctx.translate(W / 2 + panX, H / 2 + panY);
        ctx.scale(scale, scale);
        ctx.drawImage(backdrop, -W / 2, -H / 2, W, H);
        ctx.restore();

        // Overlay escuro com vinheta cinematográfica
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, 'rgba(5, 5, 10, 0.75)');
        gradient.addColorStop(0.5, 'rgba(5, 5, 10, 0.65)');
        gradient.addColorStop(1, 'rgba(5, 5, 10, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Partículas flutuantes / Embers
      const numParticles = 28;
      for (let i = 0; i < numParticles; i++) {
        const pProgress = (elapsedSec * 0.3 + i * 0.15) % 1;
        const px = ((i * 137.5) % W) + Math.sin(elapsedSec + i) * 20;
        const py = H - pProgress * (H + 50);
        const pSize = 1.5 + (i % 3) * 1.5;
        const pAlpha = Math.sin(pProgress * Math.PI) * 0.7;

        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = pAlpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // 3. Renderização específica de cada template
      if (videoTemplate === 'cinema-widescreen') {
        renderCinemaWidescreen(ctx, W, H, progress, elapsedSec);
      } else if (videoTemplate === 'glitch-cyber') {
        renderGlitchCyber(ctx, W, H, progress, elapsedSec);
      } else if (videoTemplate === 'imax-gold') {
        renderImaxGold(ctx, W, H, progress, elapsedSec);
      } else {
        renderReelsNeon(ctx, W, H, progress, elapsedSec);
      }
    },
    [
      canvasWidth,
      canvasHeight,
      duration,
      videoTemplate,
      accentColor,
      renderCinemaWidescreen,
      renderGlitchCyber,
      renderImaxGold,
      renderReelsNeon,
    ]
  );

  // Loop de Animação com requestAnimationFrame
  useEffect(() => {
    if (!imagesLoaded) return;

    let animId: number;
    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const now = Date.now();
          const elapsedSec = (now - startTimeRef.current) / 1000;
          drawFrame(ctx, elapsedSec);
        }
      }
      if (isPlaying || isRecordingRef.current) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    animFrameIdRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [imagesLoaded, isPlaying, drawFrame]);

  // Função para sintetizar áudio de trailer/teaser cinematográfico usando Web Audio API
  const createAudioTrack = (): MediaStreamTrack | null => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const dest = ctx.createMediaStreamDestination();

      // Oscilador de grave cinematográfico (sub bass drone)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, ctx.currentTime); // A1 note
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + duration);

      // Low pass filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, ctx.currentTime);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start();

      return dest.stream.getAudioTracks()[0] || null;
    } catch {
      return null;
    }
  };

  // Função para Gravar e Baixar o Vídeo (.webm ou .mp4)
  const handleRecordVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error('Canvas não inicializado.');
      return;
    }

    try {
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingProgress(0);
      toast.loading(`Gravando vídeo (${duration}s)...`, { id: 'video-record' });

      // Reseta timer de animação
      startTimeRef.current = Date.now();

      // Captura o stream do canvas a 30 FPS
      const canvasStream = canvas.captureStream(30);

      // Adiciona faixa de áudio se habilitada
      const audioTrack = includeAudio ? createAudioTrack() : null;
      const combinedTracks = [...canvasStream.getVideoTracks()];
      if (audioTrack) {
        combinedTracks.push(audioTrack);
      }
      const finalStream = new MediaStream(combinedTracks);

      // Identifica o melhor formato suportado
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(finalStream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        videoBitsPerSecond: 6000000, // 6 Mbps para alta qualidade
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const recordStartTime = Date.now();
      const intervalTimer = setInterval(() => {
        const elapsed = (Date.now() - recordStartTime) / 1000;
        const pct = Math.min(Math.round((elapsed / duration) * 100), 99);
        setRecordingProgress(pct);
      }, 100);

      recorder.onstop = () => {
        clearInterval(intervalTimer);
        setRecordingProgress(100);
        setIsRecording(false);
        isRecordingRef.current = false;

        const blob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        const filename = `video-${(selectedContent.title || selectedContent.name || 'teaser')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')}-${videoTemplate}.webm`;
        a.href = videoUrl;
        a.download = filename;
        a.click();

        setTimeout(() => URL.revokeObjectURL(videoUrl), 10000);
        toast.success('Vídeo gravado e baixado com sucesso!', { id: 'video-record' });
      };

      recorder.start();

      // Finaliza a gravação após a duração especificada
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, duration * 1000);
    } catch (err: any) {
      console.error('Erro na gravação de vídeo:', err);
      setIsRecording(false);
      isRecordingRef.current = false;
      toast.error('Erro ao gravar vídeo: ' + (err.message || 'Falha no MediaRecorder'), {
        id: 'video-record',
      });
    }
  };

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6 items-start">
      {/* Controles do Vídeo */}
      <div className="w-full xl:w-80 space-y-5 flex-shrink-0">
        <Card className="border-border/40 bg-card/40 backdrop-blur-md">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-wider">
              <Film size={18} />
              <span>Modelos de Vídeo</span>
            </div>

            {/* Seletor de Modelo de Vídeo */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVideoTemplate('reels-neon')}
                className={cn(
                  'flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all',
                  videoTemplate === 'reels-neon'
                    ? 'border-primary bg-primary/20 text-white shadow-md'
                    : 'border-border/40 hover:bg-muted/30 text-muted-foreground'
                )}
              >
                <Smartphone size={20} className="mb-1" />
                <span>Reels Neon</span>
                <span className="text-[9px] opacity-70">9:16 Vertical</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoTemplate('cinema-widescreen')}
                className={cn(
                  'flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all',
                  videoTemplate === 'cinema-widescreen'
                    ? 'border-primary bg-primary/20 text-white shadow-md'
                    : 'border-border/40 hover:bg-muted/30 text-muted-foreground'
                )}
              >
                <Monitor size={20} className="mb-1" />
                <span>Trailer 16:9</span>
                <span className="text-[9px] opacity-70">Widescreen</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoTemplate('glitch-cyber')}
                className={cn(
                  'flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all',
                  videoTemplate === 'glitch-cyber'
                    ? 'border-primary bg-primary/20 text-white shadow-md'
                    : 'border-border/40 hover:bg-muted/30 text-muted-foreground'
                )}
              >
                <Sparkles size={20} className="mb-1" />
                <span>Cyberpunk</span>
                <span className="text-[9px] opacity-70">9:16 Glitch</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoTemplate('imax-gold')}
                className={cn(
                  'flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all',
                  videoTemplate === 'imax-gold'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-md'
                    : 'border-border/40 hover:bg-muted/30 text-muted-foreground'
                )}
              >
                <Award size={20} className="mb-1 text-amber-400" />
                <span>IMAX Gold</span>
                <span className="text-[9px] opacity-70">9:16 Dourado</span>
              </button>
            </div>

            {/* Exibição de Rótulos (Geral e Poster) */}
            <div className="space-y-2.5 pt-2 border-t border-border/30">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Exibição de Rótulos
              </Label>
              
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium block">Rótulo Superior (Geral)</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {featuredLabel || 'FILME EM DESTAQUE'}
                  </span>
                </div>
                <Switch
                  checked={internalShowFeaturedLabel}
                  onCheckedChange={(checked) => {
                    setInternalShowFeaturedLabel(checked);
                    onToggleFeaturedLabel?.(checked);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/30">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium block">Rótulo Superior (Poster)</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {statusLabel || 'LANÇAMENTOS'}
                  </span>
                </div>
                <Switch
                  checked={internalShowStatusLabel}
                  onCheckedChange={(checked) => {
                    setInternalShowStatusLabel(checked);
                    onToggleStatusLabel?.(checked);
                  }}
                />
              </div>
            </div>

            {/* Duração do Vídeo */}
            <div className="space-y-2 pt-2 border-t border-border/30">
              <div className="flex justify-between text-xs">
                <Label>Duração do Vídeo</Label>
                <span className="font-mono text-primary font-bold">{duration} segundos</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[3, 5, 8, 10].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={duration === d ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs font-bold"
                    onClick={() => setDuration(d)}
                  >
                    {d}s
                  </Button>
                ))}
              </div>
            </div>

            {/* Áudio / Trilha Sonora */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="space-y-0.5">
                <Label className="text-xs">Trilha Sonora Teaser</Label>
                <p className="text-[10px] text-muted-foreground">Áudio sintetizado no vídeo</p>
              </div>
              <Switch
                checked={includeAudio}
                onCheckedChange={setIncludeAudio}
              />
            </div>

            {/* Play/Pause e Preview */}
            <div className="flex gap-2 pt-2 border-t border-border/30">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <>
                    <Pause size={14} className="mr-1.5" /> Pausar
                  </>
                ) : (
                  <>
                    <Play size={14} className="mr-1.5" /> Reproduzir
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  startTimeRef.current = Date.now();
                }}
                title="Reiniciar animação"
              >
                <RotateCcw size={14} />
              </Button>
            </div>

            {/* Botão de Gravar e Baixar Vídeo */}
            <Button
              type="button"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider text-xs shadow-lg"
              disabled={isRecording || !imagesLoaded}
              onClick={handleRecordVideo}
            >
              {isRecording ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Gravando Vídeo ({recordingProgress}%)
                </>
              ) : (
                <>
                  <Video size={16} className="mr-2" />
                  Gravar & Baixar Vídeo ({duration}s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Área de Visualização do Canvas do Vídeo */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className={cn(
            'relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-black flex items-center justify-center',
            videoTemplate === 'cinema-widescreen'
              ? 'max-w-[640px] aspect-[16/9] w-full'
              : 'max-w-[360px] aspect-[9/16] w-full'
          )}
        >
          {!imagesLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30">
              <Loader2 size={32} className="animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground font-medium">Carregando animação...</p>
            </div>
          )}

          {/* O Canvas Real onde roda a renderização e gravação */}
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full h-full object-contain"
          />

          {/* Badge flutuante de indicador de reprodução ao vivo */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-bold">
            <div className={cn("w-2 h-2 rounded-full", isPlaying ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
            <span>{isRecording ? `GRAVANDO ${recordingProgress}%` : isPlaying ? 'AO VIVO' : 'PAUSADO'}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground text-center">
          🎬 O vídeo é renderizado a 30 FPS e exportado em alta definição diretamente no seu navegador.
        </p>
      </div>
    </div>
  );
};

export default VideoPostGenerator;
