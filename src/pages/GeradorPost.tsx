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
  RotateCcw
} from 'lucide-react';
import { tmdbService } from '@/services/TmdbService';
import { TMDBSearchResult, TMDBDetails } from '@/types/importacao';
import GeradorBannerEsportes from '@/components/duplicados/GeradorBannerEsportes';
import SmartphoneTemplate from '@/components/duplicados/templates/SmartphoneTemplate';
import CinematicTemplate from '@/components/duplicados/templates/CinematicTemplate';
import StoriesTemplate from '@/components/duplicados/templates/StoriesTemplate';
import MinimalistTemplate from '@/components/duplicados/templates/MinimalistTemplate';
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

  // States for customization (4 modelos de imagem)
  const [selectedTemplate, setSelectedTemplate] = useState<'smartphone' | 'cinematic' | 'stories' | 'minimalist'>('smartphone');
  const [logo, setLogo] = useState<string | null>(localStorage.getItem('gerador-post-logo'));
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
    return 0.78; // smartphone
  };

  const scale = getScaleFactor();

  const downloadImage = async () => {
    if (!previewRef.current) return;

    try {
      toast.loading('Gerando imagem em alta resolução...', { id: 'download' });
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        quality: 0.98,
        pixelRatio: 2, // High resolution
        skipFonts: true, // Prevents reading cross-origin CSSStyleSheet rules which triggers SecurityError
      });
      
      const link = document.createElement('a');
      link.download = `post-${selectedContent?.title || selectedContent?.name || 'gerador'}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Imagem baixada com sucesso!', { id: 'download' });
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Erro ao gerar imagem', { id: 'download' });
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

  return (
    <PermissionGate feature={type === 'banner' ? 'gerador-banner' : 'gerador-post'}>
      <div className="container mx-auto py-8 px-4 max-w-7xl animate-fade-in">
      {type === 'post' ? (
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column: Controls */}
          <div className="w-full lg:w-1/3 space-y-6">
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
                Post Imagem (4 Modelos)
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
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedTemplate('smartphone')}
                    className={cn(
                      "group relative aspect-[9/12] border-2 rounded-lg overflow-hidden transition-all hover:scale-105",
                      selectedTemplate === 'smartphone' ? "border-primary shadow-[0_0_15px_rgba(229,9,20,0.3)]" : "border-border/40 hover:border-primary/50"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                    <div className="absolute bottom-2 left-2 z-20 text-[10px] font-bold">1. Smartphone</div>
                    <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                       <Smartphone size={30} className="text-white/30 group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedTemplate('cinematic')}
                    className={cn(
                      "group relative aspect-[9/12] border-2 rounded-lg overflow-hidden transition-all hover:scale-105",
                      selectedTemplate === 'cinematic' ? "border-primary shadow-[0_0_15px_rgba(229,9,20,0.3)]" : "border-border/40 hover:border-primary/50"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                    <div className="absolute bottom-2 left-2 z-20 text-[10px] font-bold">2. Cinemático</div>
                    <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                       <Monitor size={30} className="text-white/30 group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedTemplate('stories')}
                    className={cn(
                      "group relative aspect-[9/12] border-2 rounded-lg overflow-hidden transition-all hover:scale-105",
                      selectedTemplate === 'stories' ? "border-primary shadow-[0_0_15px_rgba(229,9,20,0.3)]" : "border-border/40 hover:border-primary/50"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                    <div className="absolute bottom-2 left-2 z-20 text-[10px] font-bold">3. Stories Neon</div>
                    <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                       <Flame size={30} className="text-white/30 group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedTemplate('minimalist')}
                    className={cn(
                      "group relative aspect-[9/12] border-2 rounded-lg overflow-hidden transition-all hover:scale-105",
                      selectedTemplate === 'minimalist' ? "border-primary shadow-[0_0_15px_rgba(229,9,20,0.3)]" : "border-border/40 hover:border-primary/50"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                    <div className="absolute bottom-2 left-2 z-20 text-[10px] font-bold">4. Cartaz IMAX</div>
                    <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                       <Film size={30} className="text-white/30 group-hover:text-primary transition-colors" />
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
                  <div className="space-y-2">
                    <Label>Logo da Marca</Label>
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
              <>
                <Button 
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold"
                  disabled={!selectedContent}
                  onClick={downloadImage}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Baixar Imagem (PNG)
                </Button>

                <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary/20" />
                    Preview em tempo real
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary/20" />
                    Alta resolução (2x)
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Preview */}
          <div className="flex-1 flex justify-center items-start w-full">
            <div className="sticky top-20 w-full flex flex-col items-center">
              
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
                      '4. Cartaz IMAX (2:3)'
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
                    <div ref={previewRef} className="flex justify-center items-center shadow-2xl rounded-2xl overflow-hidden">
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
