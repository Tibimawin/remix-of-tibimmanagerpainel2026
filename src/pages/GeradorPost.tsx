import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  Type, 
  Palette, 
  Layout, 
  Star, 
  Smartphone, 
  Monitor, 
  Tv, 
  Laptop,
  Loader2,
  Trash2,
  History,
  Sparkles,
  Video,
  Flame,
  Film,
  Pipette,
  Check,
  RotateCcw,
  Zap,
  Crown,
  Clapperboard,
  Award,
  Layers
} from 'lucide-react';
import { tmdbService } from '@/services/TmdbService';
import { TMDBSearchResult, TMDBDetails } from '@/types/importacao';
import GeradorBannerEsportes from '@/components/duplicados/GeradorBannerEsportes';
import SmartphoneTemplate from '@/components/duplicados/templates/SmartphoneTemplate';
import CinematicTemplate from '@/components/duplicados/templates/CinematicTemplate';
import StoriesTemplate from '@/components/duplicados/templates/StoriesTemplate';
import MinimalistTemplate from '@/components/duplicados/templates/MinimalistTemplate';
import CyberGlowTemplate from '@/components/duplicados/templates/CyberGlowTemplate';
import StreamingUiTemplate from '@/components/duplicados/templates/StreamingUiTemplate';
import EditorialCineTemplate from '@/components/duplicados/templates/EditorialCineTemplate';
import FeedSquareTemplate from '@/components/duplicados/templates/FeedSquareTemplate';
import VipBlackGoldTemplate from '@/components/duplicados/templates/VipBlackGoldTemplate';
import VideoPostGenerator from '@/components/duplicados/VideoPostGenerator';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';
import { PermissionGate } from '@/components/PermissionGate';

// Paleta completa de cores de destaque para cinema e streaming
const PRESET_ACCENT_COLORS = [
  { name: 'Vermelho Netflix', value: '#E50914' },
  { name: 'Vermelho Rubi', value: '#DC2626' },
  { name: 'Laranja Fogo', value: '#F97316' },
  { name: 'Dourado / Âmbar IMAX', value: '#F59E0B' },
  { name: 'Amarelo Canário', value: '#EAB308' },
  { name: 'Verde Lima Neon', value: '#84CC16' },
  { name: 'Verde Esmeralda', value: '#10B981' },
  { name: 'Verde Menta', value: '#14B8A6' },
  { name: 'Ciano Prime Video', value: '#06B6D4' },
  { name: 'Azul Céu', value: '#0EA5E9' },
  { name: 'Azul Disney', value: '#3B82F6' },
  { name: 'Índigo Cyber', value: '#6366F1' },
  { name: 'Roxo Neon HBO', value: '#8B5CF6' },
  { name: 'Púrpura Vibrante', value: '#A855F7' },
  { name: 'Fúcsia Elétrico', value: '#D946EF' },
  { name: 'Rosa Choque', value: '#EC4899' },
  { name: 'Dourado Metálico', value: '#D97706' },
  { name: 'Branco Puro', value: '#FFFFFF' },
];

// Conteúdo padrão para não iniciar a tela vazia
const DEFAULT_DEMO_CONTENT: TMDBDetails = {
  id: 558449,
  title: 'Gladiador II',
  name: 'Gladiador II',
  overview: 'Anos após testemunhar a morte do herói Maximus, Lucius é forçado a lutar no Coliseu depois que sua terra natal é dominada pelos tirânicos imperadores romanos.',
  poster_path: '/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
  backdrop_path: '/euYIwmqkmz95mnXvufEmbL69ovr.jpg',
  release_date: '2024-11-13',
  vote_average: 7.8,
  vote_count: 2450,
  genres: [
    { id: 28, name: 'Ação' },
    { id: 12, name: 'Aventura' },
    { id: 18, name: 'Drama' }
  ],
  media_type: 'movie',
  status: 'Released',
  runtime: 148,
};

const PRESET_CONTENTS: Record<string, TMDBDetails> = {
  gladiador: DEFAULT_DEMO_CONTENT,
  duna: {
    id: 693134,
    title: 'Duna: Parte 2',
    name: 'Duna: Parte 2',
    overview: 'Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família.',
    poster_path: '/czembW0Rk1Ke7ra2Ns6Yzyzn4CW.jpg',
    backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s52009S.jpg',
    release_date: '2024-02-27',
    vote_average: 8.2,
    vote_count: 5300,
    genres: [{ id: 878, name: 'Ficção Científica' }, { id: 12, name: 'Aventura' }],
    media_type: 'movie',
    runtime: 166,
  },
  avatar: {
    id: 76600,
    title: 'Avatar: O Caminho da Água',
    name: 'Avatar: O Caminho da Água',
    overview: 'Jake Sully e Neytiri formaram uma família e fazem de tudo para ficarem juntos, explorando os oceanos fascinantes de Pandora.',
    poster_path: '/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
    backdrop_path: '/s16H6tpK2utvwDtzZ8Qy4qm5Emw.jpg',
    release_date: '2022-12-14',
    vote_average: 7.7,
    vote_count: 11000,
    genres: [{ id: 878, name: 'Ficção Científica' }, { id: 12, name: 'Aventura' }, { id: 28, name: 'Ação' }],
    media_type: 'movie',
    runtime: 192,
  },
  deadpool: {
    id: 533535,
    title: 'Deadpool & Wolverine',
    name: 'Deadpool & Wolverine',
    overview: 'Wade Wilson leva uma vida calma até ser recrutado pela TVA para proteger o multiverso ao lado de uma variante do Wolverine.',
    poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop_path: '/yDHYTjA3R0jFYba16jBB1jv8vE1.jpg',
    release_date: '2024-07-24',
    vote_average: 7.7,
    vote_count: 6100,
    genres: [{ id: 28, name: 'Ação' }, { id: 35, name: 'Comédia' }],
    media_type: 'movie',
    runtime: 128,
  },
  stranger: {
    id: 66732,
    title: 'Stranger Things',
    name: 'Stranger Things',
    overview: 'Quando um garoto desaparece, sua mãe, um delegado e seus amigos descobrem conspirações secretas e forças sobrenaturais.',
    poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdrop_path: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    release_date: '2016-07-15',
    vote_average: 8.6,
    vote_count: 17000,
    genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }, { id: 18, name: 'Drama' }],
    media_type: 'tv',
    runtime: 50,
  }
};

const POPULAR_SUGGESTIONS = [
  { label: 'Gladiador II', key: 'gladiador', query: 'Gladiador II' },
  { label: 'Duna 2', key: 'duna', query: 'Duna Parte 2' },
  { label: 'Avatar 2', key: 'avatar', query: 'Avatar Caminho da Agua' },
  { label: 'Deadpool & Wolverine', key: 'deadpool', query: 'Deadpool' },
  { label: 'Stranger Things', key: 'stranger', query: 'Stranger Things' },
];

const GeradorPost = ({ type = 'post' }: { type?: 'post' | 'banner' }) => {
  // States for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContent, setSelectedContent] = useState<TMDBDetails | null>(DEFAULT_DEMO_CONTENT);

  // Mode: Post de Imagem ou Vídeo Animado
  const [postMode, setPostMode] = useState<'image' | 'video'>('image');

  // Zoom da pré-visualização (auto ajusta ao tamanho da coluna para evitar cortes)
  const [previewZoom, setPreviewZoom] = useState<'auto' | 60 | 80 | 100>('auto');

  // States for customization (9 modelos de imagem)
  const [selectedTemplate, setSelectedTemplate] = useState<
    'smartphone' | 'cinematic' | 'stories' | 'minimalist' | 'cyberglow' | 'streamui' | 'editorial' | 'feedsquare' | 'vipgold'
  >('smartphone');
  const [logo, setLogo] = useState<string | null>(localStorage.getItem('gerador-post-logo'));
  const [brandName, setBrandName] = useState(() => localStorage.getItem('gerador-post-brand-name') || 'INFINITY STREAM TV');
  const [logoSize, setLogoSize] = useState(100);
  const [logoPosition, setLogoPosition] = useState<'left' | 'center' | 'right'>('right');
  const [logoX, setLogoX] = useState(0);
  const [logoY, setLogoY] = useState(0);
  const [posterWidth, setPosterWidth] = useState(55);
  const [posterHeight, setPosterHeight] = useState(14);
  const [accentColor, setAccentColor] = useState('#e50914'); // Netflix Red
  const [statusLabel, setStatusLabel] = useState('LANÇAMENTOS');
  const [showStatusLabel, setShowStatusLabel] = useState(true);
  const [statusHeight, setStatusHeight] = useState(24);
  const [statusFontSize, setStatusFontSize] = useState(9);
  const [statusPaddingX, setStatusPaddingX] = useState(12);
  const [statusX, setStatusX] = useState(0);
  const [statusY, setStatusY] = useState(0);
  const [statusAlign, setStatusAlign] = useState<'left' | 'center' | 'right'>('center');
  const [featuredLabel, setFeaturedLabel] = useState('FILME EM DESTAQUE');
  const [showFeaturedLabel, setShowFeaturedLabel] = useState(true);
  const [showSynopsis, setShowSynopsis] = useState(true);
  const [synopsisLength, setSynopsisLength] = useState(250);
  const [backgroundBlur, setBackgroundBlur] = useState(8);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  // Cores dos textos inferiores (título, informações, sinopse e rodapé)
  const [titleColor, setTitlecolor] = useState('#FFFFFF');
  const [infoColor, setInfoColor] = useState('#D1D5DB');
  const [synopsisColor, setSynopsisColor] = useState('#D1D5DB');
  const [availableColor, setAvailableColor] = useState('#9CA3AF');
  const BOTTOM_TEXT_COLOR_DEFAULTS = { titleColor: '#FFFFFF', infoColor: '#D1D5DB', synopsisColor: '#D1D5DB', availableColor: '#9CA3AF' };

  // Resolução de exportação: 2 (Full HD 2x), 3 (Ultra HD 3x), 4 (Cinema 4K 4x)
  const [exportQuality, setExportQuality] = useState<number>(() => {
    const saved = localStorage.getItem('gerador-post-quality');
    return saved ? Number(saved) : 3; // Padrão 3x Ultra HD (~1500px a 2400px)
  });

  const handleSetQuality = (quality: number) => {
    setExportQuality(quality);
    localStorage.setItem('gerador-post-quality', String(quality));
  };

  const previewRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await tmdbService.searchMulti(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Erro ao pesquisar no TMDB');
      } finally {
        setIsSearching(false);
      }
    }, 500)
  ).current;

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleSelectContent = async (result: TMDBSearchResult) => {
    try {
      const details = await tmdbService.getDetails(result.id, result.media_type as 'movie' | 'tv');
      setSelectedContent(details);
      setSearchResults([]);
      setSearchQuery('');
      
      // Auto update featured label based on type
      if (result.media_type === 'tv') {
        setFeaturedLabel('SÉRIE EM DESTAQUE');
      } else {
        setFeaturedLabel('FILME EM DESTAQUE');
      }
    } catch (error) {
      console.error('Fetch details error:', error);
      toast.error('Erro ao carregar detalhes do conteúdo');
    }
  };

  const handleSelectPreset = async (item: typeof POPULAR_SUGGESTIONS[0]) => {
    if (PRESET_CONTENTS[item.key]) {
      setSelectedContent(PRESET_CONTENTS[item.key]);
      setFeaturedLabel(PRESET_CONTENTS[item.key].media_type === 'tv' ? 'SÉRIE EM DESTAQUE' : 'FILME EM DESTAQUE');
      toast.success(`Carregado: ${item.label}`);
      return;
    }
    try {
      setIsSearching(true);
      const results = await tmdbService.searchMulti(item.query);
      if (results && results.length > 0) {
        await handleSelectContent(results[0]);
      }
    } catch {
      // fallback
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogo(base64);
        localStorage.setItem('gerador-post-logo', base64);
        toast.success('Logo carregada com sucesso');
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    setLogo(null);
    localStorage.removeItem('gerador-post-logo');
  };

  const getScaleFactor = () => {
    if (previewZoom === 60) return 0.6;
    if (previewZoom === 80) return 0.8;
    if (previewZoom === 100) return 1.0;
    // 'auto':
    if (selectedTemplate === 'cinematic') return 0.72;
    if (selectedTemplate === 'stories') return 0.74;
    if (selectedTemplate === 'minimalist') return 0.78;
    if (selectedTemplate === 'cyberglow') return 0.76;
    if (selectedTemplate === 'streamui') return 0.74;
    if (selectedTemplate === 'editorial') return 0.76;
    if (selectedTemplate === 'feedsquare') return 0.75;
    if (selectedTemplate === 'vipgold') return 0.76;
    return 0.78; // smartphone
  };

  const scale = getScaleFactor();

  const downloadImage = async () => {
    if (!previewRef.current) return;

    try {
      const qualityLabels: Record<number, string> = {
        2: 'Full HD (2x)',
        3: 'Ultra HD 2K (3x)',
        4: 'Cinema 4K (4x)'
      };
      const currentQualityLabel = qualityLabels[exportQuality] || `${exportQuality}x`;

      toast.loading(`Gerando arte em ${currentQualityLabel}...`, { id: 'download' });

      // O nó alvo é o elemento do modelo em si (primeiro filho) para ignorar o scale() do contêiner pai
      const targetNode = (previewRef.current.firstElementChild as HTMLElement) || previewRef.current;
      const naturalWidth = targetNode.offsetWidth || 500;
      const naturalHeight = targetNode.offsetHeight || 780;

      const dataUrl = await toPng(targetNode, {
        cacheBust: true,
        quality: 1,
        pixelRatio: exportQuality, // 2x, 3x ou 4x gera resolução Full HD a Cinema 4K
        width: naturalWidth,
        height: naturalHeight,
        canvasWidth: naturalWidth,
        canvasHeight: naturalHeight,
        skipFonts: true, // Previne SecurityError com stylesheets externas
        backgroundColor: '#07090E', // Garante 100% de fundo sólido, eliminando cantos transparentes/brancos
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          margin: '0',
        },
      });
      
      const link = document.createElement('a');
      const safeTitle = (selectedContent?.title || selectedContent?.name || 'gerador')
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, '_')
        .substring(0, 30);
      link.download = `post-${safeTitle}-${selectedTemplate}-${exportQuality}x.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success(`Imagem ${currentQualityLabel} baixada com sucesso!`, { id: 'download' });
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Erro ao gerar imagem em alta resolução', { id: 'download' });
    }
  };

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

  const posterThumb = selectedContent?.poster_path
    ? `https://image.tmdb.org/t/p/w200${selectedContent.poster_path}`
    : null;
  const backdropThumb = selectedContent?.backdrop_path
    ? `https://image.tmdb.org/t/p/w300${selectedContent.backdrop_path}`
    : (posterThumb || null);

  return (
    <PermissionGate feature={type === 'banner' ? 'gerador-banner' : 'gerador-post'}>
      <div className="container mx-auto py-4 px-4 max-w-7xl animate-fade-in">
      {type === 'post' ? (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column: Controls (painel com rolagem independente que não move a preview) */}
          <div className="w-full lg:w-[420px] lg:flex-shrink-0 space-y-6 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-2 lg:sticky lg:top-4 custom-scrollbar">
            <Card className="netflix-card border-primary/20 bg-black/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Buscar Conteúdo
                  </div>
                  {selectedContent && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedContent(null)}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Limpar
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>Pesquise o filme ou série no TMDB</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Ex: A Odisseia, Avatar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-muted/50 border-border/40"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-primary" />
                  )}
                </div>

                {/* Sugestões Rápidas de Destaques */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-primary" /> Populares:
                  </span>
                  {POPULAR_SUGGESTIONS.map((sug) => {
                    const isSelected = selectedContent?.title === sug.label || selectedContent?.name === sug.label;
                    return (
                      <button
                        key={sug.key}
                        type="button"
                        onClick={() => handleSelectPreset(sug)}
                        className={cn(
                          "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-all",
                          isSelected
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-muted/40 hover:bg-muted border-border/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {sug.label}
                      </button>
                    );
                  })}
                </div>

                {searchResults.length > 0 && (
                  <ScrollArea className="h-64 rounded-md border border-border/40 p-2 bg-muted/20">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleSelectContent(result)}
                        className="flex items-center gap-3 w-full p-2 hover:bg-primary/10 rounded-lg transition-colors text-left"
                      >
                        <img
                          src={result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : '/placeholder-poster.jpg'}
                          alt={result.title || result.name}
                          className="w-12 h-18 object-cover rounded shadow-sm"
                        />
                        <div className="flex-1 overflow-hidden">
                          <p className="font-medium truncate">{result.title || result.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.media_type === 'movie' ? 'Filme' : 'Série'} • {new Date(result.release_date || result.first_air_date || '').getFullYear() || 'N/A'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Seletor de Tipo de Post: Imagem vs Vídeo Animado */}
            <div className="flex bg-muted/20 p-1.5 rounded-xl border border-border/40 gap-1.5 shadow-sm">
              <Button
                type="button"
                variant={postMode === 'image' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'flex-1 text-xs font-black uppercase tracking-wider h-9 transition-all',
                  postMode === 'image' && 'bg-primary text-white shadow-md'
                )}
                onClick={() => setPostMode('image')}
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                Post Imagem (9 Modelos)
              </Button>
              <Button
                type="button"
                variant={postMode === 'video' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'flex-1 text-xs font-black uppercase tracking-wider h-9 transition-all',
                  postMode === 'video' && 'bg-primary text-white shadow-md'
                )}
                onClick={() => setPostMode('video')}
              >
                <Video className="w-3.5 h-3.5 mr-1.5" />
                Vídeo Animado 🎬
              </Button>
            </div>

            <Tabs defaultValue="visual" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-muted/20">
                <TabsTrigger value="template" className="data-[state=active]:bg-primary/20 px-0 text-xs">
                  <Layout className="w-3.5 h-3.5 mr-1" />
                  Modelos
                </TabsTrigger>
                <TabsTrigger value="visual" className="data-[state=active]:bg-primary/20 px-0 text-xs">
                  <Palette className="w-3.5 h-3.5 mr-1" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="labels" className="data-[state=active]:bg-primary/20 px-0 text-xs">
                  <Type className="w-3.5 h-3.5 mr-1" />
                  Textos
                </TabsTrigger>
                <TabsTrigger value="logo" className="data-[state=active]:bg-primary/20 px-0 text-xs">
                  <ImageIcon className="w-3.5 h-3.5 mr-1" />
                  Logo
                </TabsTrigger>
                <TabsTrigger value="layout" className="data-[state=active]:bg-primary/20 px-0 text-xs">
                  <Monitor className="w-3.5 h-3.5 mr-1" />
                  Ajustes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="space-y-4 pt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-semibold text-white/90">9 Modelos Profissionais Disponíveis</span>
                  <span className="text-[10px] text-primary font-bold">5 Novos Adicionados ✨</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                  {/* Modelo 1: Smartphone */}
                  <button
                    onClick={() => setSelectedTemplate('smartphone')}
                    className={cn(
                      "group relative min-h-[195px] border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.02] text-left p-2.5 flex flex-col justify-between",
                      selectedTemplate === 'smartphone' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,9,20,0.35)] ring-1 ring-primary/50" : "border-border/40 hover:border-primary/50 bg-muted/20"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">9:16</span>
                      {selectedTemplate === 'smartphone' && <span className="text-[9px] font-black text-primary flex items-center gap-0.5"><Check size={11} /> ATIVO</span>}
                    </div>
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950/90 border border-white/10 relative my-1.5 flex items-center justify-center p-1 group-hover:border-primary/40 transition-all shadow-inner">
                      <div className="h-[84px] w-[48px] rounded-[9px] bg-neutral-900 border-2 border-neutral-700 shadow-md relative overflow-hidden flex flex-col justify-between p-0.5">
                        <div className="w-3.5 h-1 bg-black rounded-full mx-auto" />
                        <div className="flex-1 rounded-[3px] overflow-hidden relative bg-neutral-800 flex flex-col justify-end p-0.5">
                          {posterThumb ? (
                            <img src={posterThumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-neutral-900 to-neutral-800" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                          <div className="relative z-10 w-full bg-red-600 rounded-[2px] py-0.2 text-[5px] font-black text-center text-white leading-tight">
                            ASSISTA
                          </div>
                        </div>
                        <div className="w-4 h-0.5 bg-white/40 rounded-full mx-auto mt-0.5" />
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black leading-tight text-white">1. Smartphone</div>
                      <div className="text-[9px] text-muted-foreground">Mockup de celular</div>
                    </div>
                  </button>

                  {/* Modelo 2: Cinemático */}
                  <button
                    onClick={() => setSelectedTemplate('cinematic')}
                    className={cn(
                      "group relative min-h-[195px] border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.02] text-left p-2.5 flex flex-col justify-between",
                      selectedTemplate === 'cinematic' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,9,20,0.35)] ring-1 ring-primary/50" : "border-border/40 hover:border-primary/50 bg-muted/20"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">16:9</span>
                      {selectedTemplate === 'cinematic' && <span className="text-[9px] font-black text-primary flex items-center gap-0.5"><Check size={11} /> ATIVO</span>}
                    </div>
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950/90 border border-white/10 relative my-1.5 flex items-center justify-center p-1.5 group-hover:border-primary/40 transition-all shadow-inner">
                      <div className="w-full h-[66px] rounded-[5px] bg-black border border-neutral-700/80 shadow-md relative overflow-hidden flex">
                        <div className="w-[36%] h-full relative border-r border-white/10 overflow-hidden flex-shrink-0 bg-neutral-900">
                          {posterThumb ? (
                            <img src={posterThumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-blue-950 to-neutral-900 flex items-center justify-center">
                              <Film size={10} className="text-white/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 h-full relative p-1 flex flex-col justify-between overflow-hidden">
                          {backdropThumb && (
                            <img src={backdropThumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35 filter blur-[0.5px]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent" />
                          <div className="relative z-10 flex items-center gap-1">
                            <span className="bg-red-600 text-white text-[5px] font-black px-1 rounded-[2px]">CINEMA</span>
                            <span className="text-[5px] text-yellow-400">★★★★★</span>
                          </div>
                          <div className="relative z-10 space-y-0.5">
                            <div className="h-1 w-4/5 bg-white/80 rounded-full" />
                            <div className="h-0.5 w-1/2 bg-white/40 rounded-full" />
                          </div>
                          <div className="relative z-10 flex gap-0.5">
                            <span className="text-[4px] bg-white/20 text-white px-0.5 rounded">4K</span>
                            <span className="text-[4px] bg-white/20 text-white px-0.5 rounded">DUB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black leading-tight text-white">2. Cinemático</div>
                      <div className="text-[9px] text-muted-foreground">Banner horizontal</div>
                    </div>
                  </button>

                  {/* Modelo 3: Stories Neon */}
                  <button
                    onClick={() => setSelectedTemplate('stories')}
                    className={cn(
                      "group relative min-h-[195px] border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.02] text-left p-2.5 flex flex-col justify-between",
                      selectedTemplate === 'stories' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,9,20,0.35)] ring-1 ring-primary/50" : "border-border/40 hover:border-primary/50 bg-muted/20"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">9:16</span>
                      {selectedTemplate === 'stories' && <span className="text-[9px] font-black text-primary flex items-center gap-0.5"><Check size={11} /> ATIVO</span>}
                    </div>
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950/90 border border-white/10 relative my-1.5 flex items-center justify-center p-1 group-hover:border-primary/40 transition-all shadow-inner">
                      <div className="h-[84px] w-[48px] rounded-[6px] border border-pink-500/60 shadow-[0_0_8px_rgba(236,72,153,0.35)] bg-gradient-to-b from-purple-950/90 via-neutral-950 to-pink-950/90 relative overflow-hidden flex flex-col justify-between p-0.5">
                        <div className="flex gap-0.5 w-full">
                          <div className="h-[1.5px] flex-1 bg-white rounded-full" />
                          <div className="h-[1.5px] flex-1 bg-white/40 rounded-full" />
                          <div className="h-[1.5px] flex-1 bg-white/40 rounded-full" />
                        </div>
                        <div className="h-[46px] w-[32px] mx-auto rounded-[3px] overflow-hidden shadow-md border border-pink-400/60 relative my-auto">
                          {posterThumb ? (
                            <img src={posterThumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-pink-600 to-purple-900" />
                          )}
                        </div>
                        <div className="w-full bg-gradient-to-r from-pink-600 to-rose-500 rounded-[2px] py-0.2 text-[5px] font-black text-center text-white tracking-tighter">
                          DISPONÍVEL
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black leading-tight text-white">3. Stories Neon</div>
                      <div className="text-[9px] text-muted-foreground">Stories Instagram</div>
                    </div>
                  </button>

                  {/* Modelo 4: Cartaz IMAX */}
                  <button
                    onClick={() => setSelectedTemplate('minimalist')}
                    className={cn(
                      "group relative min-h-[195px] border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.02] text-left p-2.5 flex flex-col justify-between",
                      selectedTemplate === 'minimalist' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,9,20,0.35)] ring-1 ring-primary/50" : "border-border/40 hover:border-primary/50 bg-muted/20"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">2:3</span>
                      {selectedTemplate === 'minimalist' && <span className="text-[9px] font-black text-primary flex items-center gap-0.5"><Check size={11} /> ATIVO</span>}
                    </div>
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950/90 border border-white/10 relative my-1.5 flex items-center justify-center p-1 group-hover:border-primary/40 transition-all shadow-inner">
                      <div className="h-[84px] w-[52px] rounded-[4px] border border-neutral-700 bg-neutral-950 relative overflow-hidden flex flex-col justify-between p-0.5 shadow-md">
                        <div className="text-center text-[5px] font-black tracking-widest text-amber-300 border-b border-amber-300/30 pb-0.5">
                          IMAX EXPERIENCE
                        </div>
                        <div className="h-[46px] w-[32px] mx-auto rounded-[2px] overflow-hidden shadow-md border border-white/20 relative my-auto">
                          {posterThumb ? (
                            <img src={posterThumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-neutral-800 to-black" />
                          )}
                        </div>
                        <div className="space-y-0.5 text-center">
                          <div className="h-0.5 w-7 bg-white/80 rounded-full mx-auto" />
                          <div className="flex justify-center gap-0.5 text-[4px] text-amber-400">★★★★★</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black leading-tight text-white">4. Cartaz IMAX</div>
                      <div className="text-[9px] text-muted-foreground">Elegante minimalista</div>
                    </div>
                  </button>

                  {/* Modelo 5: Cyber Glow (Novo) */}
                  <button
                    onClick={() => setSelectedTemplate('cyberglow')}
                    className={cn(
                      "group relative min-h-[195px] border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.02] text-left p-2.5 flex flex-col justify-between",
                      selectedTemplate === 'cyberglow' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,9,20,0.35)] ring-1 ring-primary/50" : "border-border/40 hover:border-primary/50 bg-muted/20"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">9:14</span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-black">NOVO ✨</span>
                    </div>
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950/90 border border-white/10 relative my-1.5 flex items-center justify-center p-1 group-hover:border-primary/40 transition-all shadow-inner">
                      <div className="h-[84px] w-[52px] rounded-[4px] border border-cyan-400/70 shadow-[0_0_10px_rgba(6,182,212,0.4)] bg-[#07090E] relative overflow-hidden flex flex-col justify-between p-0.5">
                        <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-cyan-400" />
                        <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-cyan-400" />
                        <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-cyan-400" />
                        <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-cyan-400" />
                        <div className="text-[5px] font-black tracking-tighter text-cyan-300 text-center flex items-center justify-center gap-0.5">
                          <span className="w-1 h-1 bg-cyan-400 rounded-full" /> CYBER GLOW
                        </div>
                        <div className="h-[44px] w-[30px] mx-auto rounded-[3px] overflow-hidden shadow-[0_0_8px_rgba(6,182,212,0.5)] border border-cyan-300 relative my-auto">
                          {posterThumb ? (
                            <img src={posterThumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-cyan-900 to-purple-950" />
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[4px] font-bold px-0.5">
                          <span className="px-0.5 bg-cyan-500/30 text-cyan-200 rounded-[2px] border border-cyan-400/40">4K HDR</span>
                          <span className="px-0.5 bg-amber-500/30 text-amber-200 rounded-[2px] border border-amber-400/40">DOLBY</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black leading-tight text-white">5. Cyber Glow</div>
                      <div className="text-[9px] text-muted-foreground">Ultra Neon 4K & HDR</div>
                    </div>
                  </button>

                  {/* Modelo 6: Streaming UI (Novo) */}
                  <button
                    onClick={() => setSelectedTemplate('streamui')}
                    className={cn(
                      "group relative min-h-[195px] border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.02] text-left p-2.5 flex flex-col justify-between",
                      selectedTemplate === 'streamui' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,9,20,0.35)] ring-1 ring-primary/50" : "border-border/40 hover:border-primary/50 bg-muted/20"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">2:3</span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-600 text-white">NOVO ✨</span>
                    </div>
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950/90 border border-white/10 relative my-1.5 flex items-center justify-center p-1 group-hover:border-primary/40 transition-all shadow-inner">
                      <div className="h-[84px] w-[54px] rounded-[5px] border border-neutral-700 bg-[#0A0D14] relative overflow-hidden flex flex-col justify-between shadow-md">
                        <div className="h-[40px] w-full relative overflow-hidden bg-neutral-800">
                          {backdropThumb ? (
                            <img src={backdropThumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-red-950 to-neutral-900" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] to-transparent" />
                          <div className="absolute top-0.5 left-0.5 bg-red-600 text-white text-[4px] font-black px-1 rounded-full">
                            STREAM+
                          </div>
                          <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-white/90 rounded-full flex items-center justify-center text-black text-[5px]">
                            ▶
                          </div>
                        </div>
                        <div className="flex-1 p-0.5 flex flex-col justify-between bg-[#0A0D14]">
                          <div className="space-y-0.5">
                            <div className="h-0.5 w-4/5 bg-white/90 rounded-full" />
                            <div className="h-0.5 w-1/2 bg-white/40 rounded-full" />
                          </div>
                          <div className="flex items-center gap-0.5">
                            <span className="text-[4px] bg-red-600/30 text-red-300 font-bold px-0.5 rounded">TOP 10</span>
                            <span className="text-[4px] text-white/50">2026</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black leading-tight text-white">6. Streaming UI</div>
                      <div className="text-[9px] text-muted-foreground">Estilo Netflix / Apple TV</div>
                    </div>
                  </button>

                  {/* Modelo 7: Editorial Cine (Novo) */}
                  <button
                    onClick={() => setSelectedTemplate('editorial')}
                    className={cn(
                      "group relative min-h-[195px] border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.02] text-left p-2.5 flex flex-col justify-between",
                      selectedTemplate === 'editorial' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,9,20,0.35)] ring-1 ring-primary/50" : "border-border/40 hover:border-primary/50 bg-muted/20"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">2:3</span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-600 text-white">NOVO ✨</span>
                    </div>
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950/90 border border-white/10 relative my-1.5 flex items-center justify-center p-1 group-hover:border-primary/40 transition-all shadow-inner">
                      <div className="h-[84px] w-[52px] rounded-[4px] border border-purple-500/40 bg-[#0C0D12] relative overflow-hidden flex flex-col justify-between p-0.5 shadow-md">
                        <div className="flex justify-between items-center border-b border-white/10 pb-0.5">
                          <span className="text-[5px] font-serif font-black tracking-widest text-white">CINEPHILE</span>
                          <span className="text-[4px] text-purple-400 font-mono">N° 42</span>
                        </div>
                        <div className="flex gap-1 items-center my-auto">
                          <div className="w-[20px] h-[34px] rounded-[2px] overflow-hidden border border-white/20 flex-shrink-0 relative">
                            {posterThumb ? (
                              <img src={posterThumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-purple-900" />
                            )}
                          </div>
                          <div className="flex-1 space-y-0.5 overflow-hidden">
                            <div className="h-0.5 w-full bg-white/90 rounded-full" />
                            <div className="h-0.5 w-4/5 bg-white/40 rounded-full" />
                            <div className="h-0.5 w-3/5 bg-white/30 rounded-full" />
                          </div>
                        </div>
                        <div className="text-[4px] text-center text-amber-300 font-serif border-t border-white/10 pt-0.5">
                          ★ OFFICIAL 2026 ★
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black leading-tight text-white">7. Editorial Cine</div>
                      <div className="text-[9px] text-muted-foreground">Revista & Festival</div>
                    </div>
                  </button>

                  {/* Modelo 8: Feed 1:1 Quadrado (Novo) */}
                  <button
                    onClick={() => setSelectedTemplate('feedsquare')}
                    className={cn(
                      "group relative min-h-[195px] border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.02] text-left p-2.5 flex flex-col justify-between",
                      selectedTemplate === 'feedsquare' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,9,20,0.35)] ring-1 ring-primary/50" : "border-border/40 hover:border-primary/50 bg-muted/20"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">1:1</span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-600 text-white">FEED 1:1</span>
                    </div>
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950/90 border border-white/10 relative my-1.5 flex items-center justify-center p-1 group-hover:border-primary/40 transition-all shadow-inner">
                      <div className="w-[70px] h-[70px] rounded-[5px] border border-emerald-500/40 bg-[#090B10] relative overflow-hidden flex flex-col justify-between p-0.5 shadow-md">
                        <div className="flex justify-between items-center">
                          <span className="text-[5px] font-black text-white/90">POST 1:1</span>
                          <span className="text-[4px] bg-emerald-500/30 text-emerald-300 font-bold px-0.5 rounded">FEED</span>
                        </div>
                        <div className="flex gap-1 items-center">
                          <div className="w-[26px] h-[36px] rounded-[2px] overflow-hidden border border-white/20 flex-shrink-0 relative">
                            {posterThumb ? (
                              <img src={posterThumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-emerald-950" />
                            )}
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div className="h-0.5 w-full bg-white/90 rounded-full" />
                            <div className="h-0.5 w-3/4 bg-white/40 rounded-full" />
                            <div className="text-[4px] text-emerald-400 font-bold">DISPONÍVEL</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[4px] text-white/40 pt-0.5 border-t border-white/5">
                          <span>Insta</span>
                          <span>WhatsApp</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black leading-tight text-white">8. Feed Quadrado</div>
                      <div className="text-[9px] text-muted-foreground">Instagram & WhatsApp</div>
                    </div>
                  </button>

                  {/* Modelo 9: VIP Black & Gold (Novo) */}
                  <button
                    onClick={() => setSelectedTemplate('vipgold')}
                    className={cn(
                      "group relative min-h-[195px] border-2 rounded-xl overflow-hidden transition-all hover:scale-[1.02] text-left p-2.5 flex flex-col justify-between",
                      selectedTemplate === 'vipgold' ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,9,20,0.35)] ring-1 ring-primary/50" : "border-border/40 hover:border-primary/50 bg-muted/20"
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">2:3</span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-black">VIP GOLD</span>
                    </div>
                    {/* Visual Mockup Preview */}
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-neutral-950/90 border border-white/10 relative my-1.5 flex items-center justify-center p-1 group-hover:border-primary/40 transition-all shadow-inner">
                      <div className="h-[84px] w-[52px] rounded-[4px] border border-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.4)] bg-gradient-to-b from-neutral-950 via-[#141005] to-black relative overflow-hidden flex flex-col justify-between p-0.5">
                        <div className="flex justify-between items-center border-b border-amber-400/30 pb-0.5">
                          <Crown size={7} className="text-amber-400" />
                          <span className="text-[5px] font-black tracking-widest text-amber-300">VIP GOLD</span>
                          <Crown size={7} className="text-amber-400" />
                        </div>
                        <div className="h-[44px] w-[30px] mx-auto rounded-[2px] overflow-hidden shadow-[0_0_8px_rgba(245,158,11,0.4)] border border-amber-400/80 relative my-auto">
                          {posterThumb ? (
                            <img src={posterThumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-amber-950 to-neutral-950" />
                          )}
                        </div>
                        <div className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black text-[5px] font-black text-center rounded-[2px] py-0.2 tracking-tighter">
                          ACESSO VIP
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black leading-tight text-white">9. VIP Black & Gold</div>
                      <div className="text-[9px] text-muted-foreground">Luxo & Conversão</div>
                    </div>
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="visual" className="space-y-4 pt-4">
                <div className="space-y-4">
                  {/* Seletor Avançado de Cor de Destaque */}
                  <div className="space-y-3 p-3.5 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="font-semibold text-sm">Cor de Destaque</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Escolha qualquer cor livremente ou use presets de cinema
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white/50 shadow-sm"
                          style={{ backgroundColor: accentColor }}
                          title={`Cor atual: ${accentColor}`}
                        />
                        <span className="font-mono text-xs font-bold">{accentColor.toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Controles de Seleção Livre de Cores */}
                    <div className="flex items-center gap-2">
                      <div className="relative group flex-shrink-0">
                        <input 
                          type="color" 
                          value={accentColor.startsWith('#') && accentColor.length === 7 ? accentColor : '#E50914'} 
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                          title="Clique para abrir o seletor completo de todas as cores"
                        />
                        <div 
                          className="w-12 h-10 rounded-lg border-2 border-border/60 shadow-sm flex items-center justify-center cursor-pointer transition-transform group-hover:scale-105"
                          style={{ backgroundColor: accentColor }}
                        >
                          <Palette className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                        </div>
                      </div>

                      <div className="relative flex-1">
                        <Input 
                          type="text" 
                          value={accentColor} 
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val && !val.startsWith('#') && !val.startsWith('rgb')) {
                              val = '#' + val;
                            }
                            setAccentColor(val);
                          }}
                          placeholder="#E50914"
                          className="bg-muted/50 font-mono text-xs uppercase"
                        />
                      </div>

                      {typeof window !== 'undefined' && 'EyeDropper' in window && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 flex-shrink-0"
                          onClick={async () => {
                            try {
                              // @ts-expect-error EyeDropper is a modern browser API
                              const eyeDropper = new window.EyeDropper();
                              const result = await eyeDropper.open();
                              if (result?.sRGBHex) {
                                setAccentColor(result.sRGBHex);
                                toast.success(`Cor capturada: ${result.sRGBHex}`);
                              }
                            } catch {
                              // Cancelled
                            }
                          }}
                          title="Capturar qualquer cor da tela (Conta-gotas)"
                        >
                          <Pipette className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Paleta Completa de Cores Rápidas */}
                    <div className="space-y-1.5 pt-1 border-t border-border/30">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Paleta de Cores de Cinema & Streaming
                      </Label>
                      <div className="grid grid-cols-6 gap-2">
                        {PRESET_ACCENT_COLORS.map((c) => {
                          const isSelected = accentColor.toLowerCase() === c.value.toLowerCase();
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setAccentColor(c.value)}
                              className={cn(
                                "group relative h-7 rounded-md transition-all flex items-center justify-center border shadow-sm hover:scale-110",
                                isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-white" : "border-black/20 hover:border-white/50"
                              )}
                              style={{ backgroundColor: c.value }}
                              title={`${c.name} (${c.value})`}
                            >
                              {isSelected && (
                                <Check className={cn(
                                  "w-3.5 h-3.5 drop-shadow-md",
                                  c.value === '#FFFFFF' || c.value === '#EAB308' || c.value === '#84CC16' ? "text-black" : "text-white"
                                )} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Cores dos Textos Inferiores */}
                  <div className="space-y-3 p-3.5 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="font-semibold text-sm">Cores dos Textos Inferiores</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Título, informações, sinopse e rodapé (independente da cor de destaque)
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setTitlecolor(BOTTOM_TEXT_COLOR_DEFAULTS.titleColor);
                          setInfoColor(BOTTOM_TEXT_COLOR_DEFAULTS.infoColor);
                          setSynopsisColor(BOTTOM_TEXT_COLOR_DEFAULTS.synopsisColor);
                          setAvailableColor(BOTTOM_TEXT_COLOR_DEFAULTS.availableColor);
                        }}
                        title="Voltar todas as cores dos textos para o padrão"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restaurar
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {[
                        { label: 'Título', value: titleColor, setValue: setTitlecolor },
                        { label: 'Informações (ano / gêneros)', value: infoColor, setValue: setInfoColor },
                        { label: 'Sinopse', value: synopsisColor, setValue: setSynopsisColor },
                        { label: 'Rodapé (Disponível em)', value: availableColor, setValue: setAvailableColor }
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2">
                          <div className="relative group flex-shrink-0">
                            <input
                              type="color"
                              value={row.value.startsWith('#') && row.value.length === 7 ? row.value : '#FFFFFF'}
                              onChange={(e) => row.setValue(e.target.value)}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                              title={`Cor do texto: ${row.label}`}
                            />
                            <div
                              className="w-10 h-8 rounded-lg border-2 border-border/60 shadow-sm flex items-center justify-center cursor-pointer transition-transform group-hover:scale-105"
                              style={{ backgroundColor: row.value }}
                            >
                              <Type className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                            </div>
                          </div>
                          <Input
                            type="text"
                            value={row.value}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val && !val.startsWith('#') && !val.startsWith('rgb')) {
                                val = '#' + val;
                              }
                              row.setValue(val);
                            }}
                            className="bg-muted/50 font-mono text-xs uppercase flex-1"
                            placeholder="#FFFFFF"
                          />
                          <span className="text-[11px] text-muted-foreground w-[120px] flex-shrink-0 truncate">{row.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Blur do Fundo ({backgroundBlur}px)</Label>
                    </div>
                    <Slider
                      value={[backgroundBlur]}
                      onValueChange={([val]) => setBackgroundBlur(val)}
                      max={20}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Opacidade do Overlay ({overlayOpacity})</Label>
                    </div>
                    <Slider
                      value={[overlayOpacity]}
                      onValueChange={([val]) => setOverlayOpacity(val)}
                      max={1}
                      step={0.1}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="labels" className="space-y-4 pt-4">
                <div className="space-y-4">
                  {/* Botão para Esvaziar / Limpar Ambos */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatusLabel('');
                        setFeaturedLabel('');
                        toast.info('Texto de ambos os rótulos foi esvaziado.');
                      }}
                      className="text-xs h-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Esvaziar Ambos os Rótulos
                    </Button>
                  </div>

                  {/* Rótulo Superior (Poster) */}
                  <div className="space-y-3 rounded-lg border border-border/50 p-3.5 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="toggle-status-label" className="font-semibold text-sm cursor-pointer">
                            Rótulo Superior (Poster)
                          </Label>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                            showStatusLabel && statusLabel.trim() ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {showStatusLabel && statusLabel.trim() ? 'Ativado' : 'Desativado / Vazio'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Exibe faixa ou selo sobre o poster (ex: {statusLabel || 'Vazio'})
                        </p>
                      </div>
                      <Switch 
                        id="toggle-status-label"
                        checked={showStatusLabel} 
                        onCheckedChange={setShowStatusLabel} 
                      />
                    </div>

                    {showStatusLabel ? (
                      <>
                        <div className="space-y-2 pt-2 border-t border-border/40">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Texto do Rótulo</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setStatusLabel('')}
                              disabled={!statusLabel}
                              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive"
                              title="Esvaziar texto do rótulo para remover o espaço na arte"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Esvaziar
                            </Button>
                          </div>
                          <Input 
                            value={statusLabel} 
                            onChange={(e) => setStatusLabel(e.target.value)}
                            className="bg-muted/50"
                            placeholder="Deixe vazio ou digite (ex: LANÇAMENTOS)"
                          />
                          {!statusLabel.trim() && (
                            <p className="text-[11px] text-amber-500/90 italic">
                              Campo vazio: o espaço do rótulo sobre a capa está 100% esvaziado.
                            </p>
                          )}
                        </div>

                        <div className="space-y-3 pt-2 border-t border-border/40">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            Posição do Rótulo (Poster)
                          </Label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['left', 'center', 'right'] as const).map((pos) => (
                              <Button
                                key={pos}
                                variant={statusAlign === pos ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusAlign(pos)}
                                className="text-xs"
                              >
                                {pos === 'left' ? 'Esquerda' : pos === 'center' ? 'Centro' : 'Direita'}
                              </Button>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <Label>Altura do Container ({statusHeight}px)</Label>
                            <Slider
                              value={[statusHeight]}
                              onValueChange={([val]) => setStatusHeight(val)}
                              max={64}
                              min={14}
                              step={1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tamanho do Texto ({statusFontSize}px)</Label>
                            <Slider
                              value={[statusFontSize]}
                              onValueChange={([val]) => setStatusFontSize(val)}
                              max={18}
                              min={7}
                              step={1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ajuste Horizontal ({statusX}%)</Label>
                            <Slider
                              value={[statusX]}
                              onValueChange={([val]) => setStatusX(val)}
                              max={100}
                              min={-100}
                              step={1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ajuste Vertical ({statusY}%)</Label>
                            <Slider
                              value={[statusY]}
                              onValueChange={([val]) => setStatusY(val)}
                              max={1200}
                              min={0}
                              step={10}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setStatusHeight(24);
                              setStatusFontSize(9);
                              setStatusPaddingX(12);
                              setStatusX(0);
                              setStatusY(0);
                              setStatusAlign('center');
                            }}
                          >
                            Redefinir dimensões
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground italic pt-1 border-t border-border/30">
                        Rótulo do poster desativado e espaço esvaziado na arte. Ative a chave para exibi-lo.
                      </p>
                    )}
                  </div>

                  {/* Rótulo Superior (Geral) */}
                  <div className="space-y-3 rounded-lg border border-border/50 p-3.5 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="toggle-featured-label" className="font-semibold text-sm cursor-pointer">
                            Rótulo Superior (Geral)
                          </Label>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                            showFeaturedLabel && featuredLabel.trim() ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {showFeaturedLabel && featuredLabel.trim() ? 'Ativado' : 'Desativado / Vazio'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Exibe tag de destaque no topo geral (ex: {featuredLabel || 'Vazio'})
                        </p>
                      </div>
                      <Switch 
                        id="toggle-featured-label"
                        checked={showFeaturedLabel} 
                        onCheckedChange={setShowFeaturedLabel} 
                      />
                    </div>

                    {showFeaturedLabel ? (
                      <>
                        <div className="space-y-2 pt-2 border-t border-border/40">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Texto do Rótulo Geral</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setFeaturedLabel('')}
                              disabled={!featuredLabel}
                              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive"
                              title="Esvaziar texto do rótulo para remover o espaço na arte"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Esvaziar
                            </Button>
                          </div>
                          <Input 
                            value={featuredLabel} 
                            onChange={(e) => setFeaturedLabel(e.target.value)}
                            className="bg-muted/50"
                            placeholder="Deixe vazio ou digite (ex: FILME EM DESTAQUE)"
                          />
                          {!featuredLabel.trim() && (
                            <p className="text-[11px] text-amber-500/90 italic">
                              Campo vazio: o espaço do rótulo superior está 100% esvaziado.
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <Label className="text-xs">Presets Rápidos</Label>
                          <div className="flex gap-1 flex-wrap">
                            <Button 
                              variant={featuredLabel.includes('FILME') ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={() => setFeaturedLabel('FILME EM DESTAQUE')}
                              className="h-7 text-[10px] px-2"
                            >
                              Filme
                            </Button>
                            <Button 
                              variant={featuredLabel.includes('SÉRIE') ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={() => setFeaturedLabel('SÉRIE EM DESTAQUE')}
                              className="h-7 text-[10px] px-2"
                            >
                              Série
                            </Button>
                            <Button 
                              variant={featuredLabel.includes('ORIGINAL') ? 'default' : 'outline'} 
                              size="sm" 
                              onClick={() => setFeaturedLabel('ORIGINAL STREAMING')}
                              className="h-7 text-[10px] px-2"
                            >
                              Original
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground italic pt-1 border-t border-border/30">
                        Rótulo geral desativado e espaço esvaziado na arte. Ative a chave para exibi-lo.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-synopsis">Mostrar Sinopse</Label>
                    <Switch
                      id="show-synopsis"
                      checked={showSynopsis}
                      onCheckedChange={setShowSynopsis}
                    />
                  </div>
                  {showSynopsis && (
                    <div className="space-y-2">
                      <Label>Tamanho da Sinopse ({synopsisLength} caracteres)</Label>
                      <Slider
                        value={[synopsisLength]}
                        onValueChange={([val]) => setSynopsisLength(val)}
                        max={500}
                        min={50}
                        step={10}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="logo" className="space-y-4 pt-4">
                <div className="space-y-4">
                  {/* Nome da Marca / App Editável */}
                  <div className="space-y-2 p-3.5 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-sm">Nome da Marca / App</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setBrandName('INFINITY STREAM TV');
                          localStorage.setItem('gerador-post-brand-name', 'INFINITY STREAM TV');
                        }}
                      >
                        Padrão
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Texto exibido no topo da arte quando não houver imagem de logo
                    </p>
                    <Input
                      value={brandName}
                      onChange={(e) => {
                        setBrandName(e.target.value);
                        localStorage.setItem('gerador-post-brand-name', e.target.value);
                      }}
                      placeholder="Ex: INFINITY STREAM TV, MEU APP..."
                      className="bg-muted/50 font-bold uppercase tracking-wider text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Logo da Marca (Imagem)</Label>
                    <div className="flex flex-col gap-4">
                      {logo ? (
                        <div className="relative group rounded-lg overflow-hidden border border-border/40 bg-muted/20 p-4 flex items-center justify-center">
                          <img src={logo} alt="Custom Logo" className="max-h-24 object-contain" />
                          <button
                            onClick={clearLogo}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border/40 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Upload da Logo (PNG/SVG)</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tamanho da Logo ({logoSize}%)</Label>
                      <Slider
                        value={[logoSize]}
                        onValueChange={([val]) => setLogoSize(val)}
                        max={200}
                        min={20}
                        step={5}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Posição da Logo</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          variant={logoPosition === 'left' ? 'default' : 'outline'} 
                          size="sm" 
                          onClick={() => setLogoPosition('left')}
                          className="text-xs"
                        >
                          Esquerda
                        </Button>
                        <Button 
                          variant={logoPosition === 'center' ? 'default' : 'outline'} 
                          size="sm" 
                          onClick={() => setLogoPosition('center')}
                          className="text-xs"
                        >
                          Centro
                        </Button>
                        <Button 
                          variant={logoPosition === 'right' ? 'default' : 'outline'} 
                          size="sm" 
                          onClick={() => setLogoPosition('right')}
                          className="text-xs"
                        >
                          Direita
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Ajuste Horizontal ({logoX}%)</Label>
                        <Slider
                          value={[logoX]}
                          onValueChange={([val]) => setLogoX(val)}
                          max={50}
                          min={-50}
                          step={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ajuste Vertical ({logoY}%)</Label>
                        <Slider
                          value={[logoY]}
                          onValueChange={([val]) => setLogoY(val)}
                          max={50}
                          min={-50}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="layout" className="space-y-4 pt-4">
                <div className="space-y-4">
                  {/* Container do Rótulo Superior (Lançamentos / Destaque) */}
                  <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs uppercase tracking-wide font-semibold text-primary">
                          Container do Rótulo ({statusLabel || 'Lançamentos'})
                        </Label>
                        <p className="text-[10px] text-muted-foreground">Exibir rótulo sobre a capa do poster</p>
                      </div>
                      <Switch 
                        checked={showStatusLabel} 
                        onCheckedChange={setShowStatusLabel} 
                      />
                    </div>

                    {showStatusLabel ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <Label>Altura do Container ({statusHeight}px)</Label>
                            <span className="text-muted-foreground">{statusHeight}px</span>
                          </div>
                          <Slider
                            value={[statusHeight]}
                            onValueChange={([val]) => setStatusHeight(val)}
                            max={64}
                            min={14}
                            step={1}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <Label>Posição Vertical / Altura ({statusY}%)</Label>
                            <span className="text-muted-foreground">{statusY}%</span>
                          </div>
                          <Slider
                            value={[statusY]}
                            onValueChange={([val]) => setStatusY(val)}
                            max={1200}
                            min={0}
                            step={10}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <Label>Tamanho do Texto ({statusFontSize}px)</Label>
                            <span className="text-muted-foreground">{statusFontSize}px</span>
                          </div>
                          <Slider
                            value={[statusFontSize]}
                            onValueChange={([val]) => setStatusFontSize(val)}
                            max={18}
                            min={7}
                            step={1}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <Label>Largura / Espaçamento Interno ({statusPaddingX}px)</Label>
                            <span className="text-muted-foreground">{statusPaddingX}px</span>
                          </div>
                          <Slider
                            value={[statusPaddingX]}
                            onValueChange={([val]) => setStatusPaddingX(val)}
                            max={36}
                            min={4}
                            step={1}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Alinhamento Horizontal</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['left', 'center', 'right'] as const).map((pos) => (
                              <Button
                                key={pos}
                                variant={statusAlign === pos ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusAlign(pos)}
                                className="text-xs h-7"
                              >
                                {pos === 'left' ? 'Esquerda' : pos === 'center' ? 'Centro' : 'Direita'}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <Label>Ajuste Horizontal ({statusX}%)</Label>
                            <span className="text-muted-foreground">{statusX}%</span>
                          </div>
                          <Slider
                            value={[statusX]}
                            onValueChange={([val]) => setStatusX(val)}
                            max={100}
                            min={-100}
                            step={1}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground italic pt-1">
                        Rótulo do poster desativado. Ative a chave acima para ajustar tamanho e posição.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/50 p-3 bg-muted/10">
                    <Label className="text-xs uppercase tracking-wide font-semibold text-primary">
                      Ajustes da Capa / Poster
                    </Label>
                    <div className="space-y-2">
                      <Label>Largura da Capa ({posterWidth}%)</Label>
                      <Slider
                        value={[posterWidth]}
                        onValueChange={([val]) => setPosterWidth(val)}
                        max={100}
                        min={20}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Proporção Altura ({posterHeight})</Label>
                      <Slider
                        value={[posterHeight]}
                        onValueChange={([val]) => setPosterHeight(val)}
                        max={20}
                        min={10}
                        step={0.5}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {postMode === 'image' && (
              <div className="space-y-3 pt-2">
                {/* Seletor de Resolução / Qualidade */}
                <div className="p-3 rounded-xl border border-border/50 bg-black/40 backdrop-blur-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <Label className="text-xs font-bold text-white">Resolução de Download</Label>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/40 font-black uppercase">
                      {exportQuality === 4 ? 'Cinema 4K (4x)' : exportQuality === 3 ? 'Ultra HD 2K (3x)' : 'Full HD (2x)'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={exportQuality === 2 ? 'default' : 'outline'}
                      className={cn("text-[11px] h-8 font-bold", exportQuality === 2 ? "bg-primary text-white" : "border-border/60 hover:bg-muted/40 text-muted-foreground")}
                      onClick={() => handleSetQuality(2)}
                    >
                      Full HD (2x)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={exportQuality === 3 ? 'default' : 'outline'}
                      className={cn("text-[11px] h-8 font-bold", exportQuality === 3 ? "bg-primary text-white" : "border-border/60 hover:bg-muted/40 text-muted-foreground")}
                      onClick={() => handleSetQuality(3)}
                    >
                      Ultra HD (3x) ✨
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={exportQuality === 4 ? 'default' : 'outline'}
                      className={cn("text-[11px] h-8 font-bold", exportQuality === 4 ? "bg-primary text-white" : "border-border/60 hover:bg-muted/40 text-muted-foreground")}
                      onClick={() => handleSetQuality(4)}
                    >
                      Cinema 4K (4x) 🔥
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {exportQuality === 4
                      ? 'Resolução máxima ultra nítida (~2000px a 3200px): ideal para telões e impressões.'
                      : exportQuality === 3
                      ? 'Recomendado (~1500px a 2400px): máxima nitidez para Instagram e WhatsApp.'
                      : 'Resolução padrão (~1000px a 1500px) com download mais leve e rápido.'}
                  </p>
                </div>

                <Button 
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black text-sm shadow-lg shadow-primary/25 transition-all hover:scale-[1.01]"
                  disabled={!selectedContent}
                  onClick={downloadImage}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Baixar em {exportQuality === 4 ? '4K Ultra HD' : exportQuality === 3 ? 'Ultra HD 2K' : 'Full HD'} (PNG)
                </Button>

                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-0.5 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Fundo 100% Sólido (Sem cantos brancos)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-white/80">
                      {exportQuality === 4 ? 'Até 3200px' : exportQuality === 3 ? 'Até 2400px' : 'Até 1500px'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Preview (fixo no topo durante o scroll) */}
          <div className="flex-1 w-full flex justify-center items-start lg:sticky lg:top-4 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto custom-scrollbar">
            <div className="w-full flex flex-col items-center">
              
              {/* Barra de Controles da Pré-Visualização */}
              <div className="w-full flex items-center justify-between bg-black/40 backdrop-blur-md border border-border/40 rounded-xl px-4 py-2.5 mb-4 text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-bold text-muted-foreground hidden sm:inline">Modelo:</span>
                  <Badge variant="outline" className="text-primary border-primary/40 font-black uppercase text-[10px] tracking-wider">
                    {postMode === 'video' ? 'Vídeo Animado' : (
                      selectedTemplate === 'smartphone' ? '1. Smartphone (9:16)' :
                      selectedTemplate === 'cinematic' ? '2. Cinemático (16:9)' :
                      selectedTemplate === 'stories' ? '3. Stories Neon (9:16)' :
                      selectedTemplate === 'minimalist' ? '4. Cartaz IMAX (2:3)' :
                      selectedTemplate === 'cyberglow' ? '5. Cyber Glow (9:14)' :
                      selectedTemplate === 'streamui' ? '6. Streaming UI (2:3)' :
                      selectedTemplate === 'editorial' ? '7. Editorial Cine (2:3)' :
                      selectedTemplate === 'feedsquare' ? '8. Feed Quadrado (1:1)' :
                      '9. VIP Black & Gold (2:3)'
                    )}
                  </Badge>
                </div>

                {postMode === 'image' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground mr-1">Zoom:</span>
                    {(['auto', 60, 80, 100] as const).map((z) => (
                      <Button
                        key={z}
                        type="button"
                        variant={previewZoom === z ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-[11px] font-bold"
                        onClick={() => setPreviewZoom(z)}
                      >
                        {z === 'auto' ? 'Ajustar' : `${z}%`}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {!selectedContent ? (
                <div className="w-full aspect-video flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-xl bg-muted/10 text-muted-foreground p-12 text-center">
                  <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                  <h3 className="text-xl font-medium mb-2">Sua arte ou vídeo aparecerá aqui</h3>
                  <p className="max-w-xs mx-auto">Busque um filme ou série à esquerda para começar a personalizar sua arte ou vídeo.</p>
                </div>
              ) : postMode === 'video' ? (
                <div className="w-full flex justify-center">
                  <VideoPostGenerator
                    selectedContent={selectedContent}
                    accentColor={accentColor}
                    statusLabel={statusLabel}
                    showStatusLabel={showStatusLabel}
                    featuredLabel={featuredLabel}
                    showFeaturedLabel={showFeaturedLabel}
                    statusHeight={statusHeight}
                    statusFontSize={statusFontSize}
                    statusY={statusY}
                    logo={logo}
                    onToggleStatusLabel={setShowStatusLabel}
                    onToggleFeaturedLabel={setShowFeaturedLabel}
                  />
                </div>
              ) : (
                <div className="w-full flex justify-center items-start overflow-hidden py-2 min-h-[500px]">
                  <div
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.2s ease-out',
                    }}
                  >
                    <div ref={previewRef} className="flex justify-center items-center shadow-2xl rounded-none overflow-hidden bg-black">
                      {selectedTemplate === 'smartphone' && (
                        <SmartphoneTemplate
                          selectedContent={selectedContent}
                          backgroundBlur={backgroundBlur}
                          overlayOpacity={overlayOpacity}
                          logo={logo}
                          logoPosition={logoPosition}
                          logoSize={logoSize}
                          logoX={logoX}
                          logoY={logoY}
                          featuredLabel={featuredLabel}
                          showFeaturedLabel={showFeaturedLabel}
                          accentColor={accentColor}
                          posterWidth={posterWidth}
                          posterHeight={posterHeight}
                          statusLabel={statusLabel}
                          showStatusLabel={showStatusLabel}
                          statusHeight={statusHeight}
                          statusFontSize={statusFontSize}
                          statusPaddingX={statusPaddingX}
                          statusX={statusX}
                          statusY={statusY}
                          statusAlign={statusAlign}
                          showSynopsis={showSynopsis}
                          synopsisLength={synopsisLength}
                          titleColor={titleColor}
                          infoColor={infoColor}
                          synopsisColor={synopsisColor}
                          availableColor={availableColor}
                        />
                      )}
                      {selectedTemplate === 'cinematic' && (
                        <CinematicTemplate
                          selectedContent={selectedContent}
                          backgroundBlur={backgroundBlur}
                          overlayOpacity={overlayOpacity}
                          logo={logo}
                          logoPosition={logoPosition}
                          logoSize={logoSize}
                          logoX={logoX}
                          logoY={logoY}
                          featuredLabel={featuredLabel}
                          showFeaturedLabel={showFeaturedLabel}
                          accentColor={accentColor}
                          posterWidth={posterWidth}
                          posterHeight={posterHeight}
                          statusLabel={statusLabel}
                          showStatusLabel={showStatusLabel}
                          statusHeight={statusHeight}
                          statusFontSize={statusFontSize}
                          statusPaddingX={statusPaddingX}
                          statusX={statusX}
                          statusY={statusY}
                          statusAlign={statusAlign}
                          showSynopsis={showSynopsis}
                          synopsisLength={synopsisLength}
                          titleColor={titleColor}
                          infoColor={infoColor}
                          synopsisColor={synopsisColor}
                          availableColor={availableColor}
                        />
                      )}
                      {selectedTemplate === 'stories' && (
                        <StoriesTemplate
                          selectedContent={selectedContent}
                          backgroundBlur={backgroundBlur}
                          overlayOpacity={overlayOpacity}
                          logo={logo}
                          logoPosition={logoPosition}
                          logoSize={logoSize}
                          logoX={logoX}
                          logoY={logoY}
                          featuredLabel={featuredLabel}
                          showFeaturedLabel={showFeaturedLabel}
                          accentColor={accentColor}
                          posterWidth={posterWidth}
                          posterHeight={posterHeight}
                          statusLabel={statusLabel}
                          showStatusLabel={showStatusLabel}
                          statusHeight={statusHeight}
                          statusFontSize={statusFontSize}
                          statusPaddingX={statusPaddingX}
                          statusX={statusX}
                          statusY={statusY}
                          statusAlign={statusAlign}
                          showSynopsis={showSynopsis}
                          synopsisLength={synopsisLength}
                          titleColor={titleColor}
                          infoColor={infoColor}
                          synopsisColor={synopsisColor}
                          availableColor={availableColor}
                        />
                      )}
                      {selectedTemplate === 'minimalist' && (
                        <MinimalistTemplate
                          selectedContent={selectedContent}
                          backgroundBlur={backgroundBlur}
                          overlayOpacity={overlayOpacity}
                          logo={logo}
                          logoPosition={logoPosition}
                          logoSize={logoSize}
                          logoX={logoX}
                          logoY={logoY}
                          featuredLabel={featuredLabel}
                          showFeaturedLabel={showFeaturedLabel}
                          accentColor={accentColor}
                          posterWidth={posterWidth}
                          posterHeight={posterHeight}
                          statusLabel={statusLabel}
                          showStatusLabel={showStatusLabel}
                          statusHeight={statusHeight}
                          statusFontSize={statusFontSize}
                          statusPaddingX={statusPaddingX}
                          statusX={statusX}
                          statusY={statusY}
                          statusAlign={statusAlign}
                          showSynopsis={showSynopsis}
                          synopsisLength={synopsisLength}
                          titleColor={titleColor}
                          infoColor={infoColor}
                          synopsisColor={synopsisColor}
                          availableColor={availableColor}
                        />
                      )}
                      {selectedTemplate === 'cyberglow' && (
                        <CyberGlowTemplate
                          selectedContent={selectedContent}
                          backgroundBlur={backgroundBlur}
                          overlayOpacity={overlayOpacity}
                          logo={logo}
                          logoPosition={logoPosition}
                          logoSize={logoSize}
                          logoX={logoX}
                          logoY={logoY}
                          featuredLabel={featuredLabel}
                          showFeaturedLabel={showFeaturedLabel}
                          accentColor={accentColor}
                          posterWidth={posterWidth}
                          posterHeight={posterHeight}
                          statusLabel={statusLabel}
                          showStatusLabel={showStatusLabel}
                          statusHeight={statusHeight}
                          statusFontSize={statusFontSize}
                          statusPaddingX={statusPaddingX}
                          statusX={statusX}
                          statusY={statusY}
                          statusAlign={statusAlign}
                          showSynopsis={showSynopsis}
                          synopsisLength={synopsisLength}
                          titleColor={titleColor}
                          infoColor={infoColor}
                          synopsisColor={synopsisColor}
                          availableColor={availableColor}
                          brandName={brandName}
                        />
                      )}
                      {selectedTemplate === 'streamui' && (
                        <StreamingUiTemplate
                          selectedContent={selectedContent}
                          backgroundBlur={backgroundBlur}
                          overlayOpacity={overlayOpacity}
                          logo={logo}
                          logoPosition={logoPosition}
                          logoSize={logoSize}
                          logoX={logoX}
                          logoY={logoY}
                          featuredLabel={featuredLabel}
                          showFeaturedLabel={showFeaturedLabel}
                          accentColor={accentColor}
                          posterWidth={posterWidth}
                          posterHeight={posterHeight}
                          statusLabel={statusLabel}
                          showStatusLabel={showStatusLabel}
                          statusHeight={statusHeight}
                          statusFontSize={statusFontSize}
                          statusPaddingX={statusPaddingX}
                          statusX={statusX}
                          statusY={statusY}
                          statusAlign={statusAlign}
                          showSynopsis={showSynopsis}
                          synopsisLength={synopsisLength}
                          titleColor={titleColor}
                          infoColor={infoColor}
                          synopsisColor={synopsisColor}
                          availableColor={availableColor}
                          brandName={brandName}
                        />
                      )}
                      {selectedTemplate === 'editorial' && (
                        <EditorialCineTemplate
                          selectedContent={selectedContent}
                          backgroundBlur={backgroundBlur}
                          overlayOpacity={overlayOpacity}
                          logo={logo}
                          logoPosition={logoPosition}
                          logoSize={logoSize}
                          logoX={logoX}
                          logoY={logoY}
                          featuredLabel={featuredLabel}
                          showFeaturedLabel={showFeaturedLabel}
                          accentColor={accentColor}
                          posterWidth={posterWidth}
                          posterHeight={posterHeight}
                          statusLabel={statusLabel}
                          showStatusLabel={showStatusLabel}
                          statusHeight={statusHeight}
                          statusFontSize={statusFontSize}
                          statusPaddingX={statusPaddingX}
                          statusX={statusX}
                          statusY={statusY}
                          statusAlign={statusAlign}
                          showSynopsis={showSynopsis}
                          synopsisLength={synopsisLength}
                          titleColor={titleColor}
                          infoColor={infoColor}
                          synopsisColor={synopsisColor}
                          availableColor={availableColor}
                          brandName={brandName}
                        />
                      )}
                      {selectedTemplate === 'feedsquare' && (
                        <FeedSquareTemplate
                          selectedContent={selectedContent}
                          backgroundBlur={backgroundBlur}
                          overlayOpacity={overlayOpacity}
                          logo={logo}
                          logoPosition={logoPosition}
                          logoSize={logoSize}
                          logoX={logoX}
                          logoY={logoY}
                          featuredLabel={featuredLabel}
                          showFeaturedLabel={showFeaturedLabel}
                          accentColor={accentColor}
                          posterWidth={posterWidth}
                          posterHeight={posterHeight}
                          statusLabel={statusLabel}
                          showStatusLabel={showStatusLabel}
                          statusHeight={statusHeight}
                          statusFontSize={statusFontSize}
                          statusPaddingX={statusPaddingX}
                          statusX={statusX}
                          statusY={statusY}
                          statusAlign={statusAlign}
                          showSynopsis={showSynopsis}
                          synopsisLength={synopsisLength}
                          titleColor={titleColor}
                          infoColor={infoColor}
                          synopsisColor={synopsisColor}
                          availableColor={availableColor}
                          brandName={brandName}
                        />
                      )}
                      {selectedTemplate === 'vipgold' && (
                        <VipBlackGoldTemplate
                          selectedContent={selectedContent}
                          backgroundBlur={backgroundBlur}
                          overlayOpacity={overlayOpacity}
                          logo={logo}
                          logoPosition={logoPosition}
                          logoSize={logoSize}
                          logoX={logoX}
                          logoY={logoY}
                          featuredLabel={featuredLabel}
                          showFeaturedLabel={showFeaturedLabel}
                          accentColor={accentColor}
                          posterWidth={posterWidth}
                          posterHeight={posterHeight}
                          statusLabel={statusLabel}
                          showStatusLabel={showStatusLabel}
                          statusHeight={statusHeight}
                          statusFontSize={statusFontSize}
                          statusPaddingX={statusPaddingX}
                          statusX={statusX}
                          statusY={statusY}
                          statusAlign={statusAlign}
                          showSynopsis={showSynopsis}
                          synopsisLength={synopsisLength}
                          titleColor={titleColor}
                          infoColor={infoColor}
                          synopsisColor={synopsisColor}
                          availableColor={availableColor}
                          brandName={brandName}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <GeradorBannerEsportes />
      )}
      </div>
    </PermissionGate>
  );
};

export default GeradorPost;
