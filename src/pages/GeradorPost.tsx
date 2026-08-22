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
  Sparkles
} from 'lucide-react';
import { tmdbService } from '@/services/TmdbService';
import { TMDBSearchResult, TMDBDetails } from '@/types/importacao';
import GeradorBannerEsportes from '@/components/duplicados/GeradorBannerEsportes';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';

const GeradorPost = ({ type = 'post' }: { type?: 'post' | 'banner' }) => {
  // States for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContent, setSelectedContent] = useState<TMDBDetails | null>(null);

  // States for customization
  const [logo, setLogo] = useState<string | null>(localStorage.getItem('gerador-post-logo'));
  const [logoSize, setLogoSize] = useState(100);
  const [logoPosition, setLogoPosition] = useState<'left' | 'center' | 'right'>('right');
  const [logoX, setLogoX] = useState(0);
  const [logoY, setLogoY] = useState(0);
  const [posterWidth, setPosterWidth] = useState(55);
  const [posterHeight, setPosterHeight] = useState(14);
  const [accentColor, setAccentColor] = useState('#e50914'); // Netflix Red
  const [statusLabel, setStatusLabel] = useState('LANÇAMENTOS');
  const [featuredLabel, setFeaturedLabel] = useState('FILME EM DESTAQUE');
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
  }, [searchQuery]);

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

  const downloadImage = async () => {
    if (!previewRef.current) return;

    try {
      toast.loading('Gerando imagem...', { id: 'download' });
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        quality: 0.95,
        pixelRatio: 2, // High resolution
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

            <Tabs defaultValue="visual" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted/20">
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
                  <Layout className="w-3.5 h-3.5 mr-1" />
                  Layout
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visual" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cor de Destaque</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        value={accentColor} 
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-12 h-10 p-1 bg-transparent border-border/40"
                      />
                      <Input 
                        type="text" 
                        value={accentColor} 
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 bg-muted/50"
                      />
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
                  <div className="space-y-2">
                    <Label>Rótulo Superior (Poster)</Label>
                    <Input 
                      value={statusLabel} 
                      onChange={(e) => setStatusLabel(e.target.value)}
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rótulo Superior (Geral)</Label>
                    <Input 
                      value={featuredLabel} 
                      onChange={(e) => setFeaturedLabel(e.target.value)}
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Tipo de Destaque</Label>
                    <div className="flex gap-1">
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
                    </div>
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
              </TabsContent>
            </Tabs>

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
          </div>

          {/* Right Column: Preview */}
          <div className="flex-1 flex justify-center items-start">
            <div className="sticky top-24 w-full flex flex-col items-center">
              {!selectedContent ? (
                <div className="w-full aspect-video flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-xl bg-muted/10 text-muted-foreground p-12 text-center">
                  <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                  <h3 className="text-xl font-medium mb-2">Sua arte aparecerá aqui</h3>
                  <p className="max-w-xs mx-auto">Busque um filme ou série à esquerda para começar a personalizar seu post.</p>
                </div>
              ) : (
                <>
                  <div 
                    ref={previewRef}
                    className="relative w-[500px] h-[750px] bg-black overflow-hidden flex flex-col p-8 font-sans text-white shadow-2xl rounded-sm"
                  >
                    {/* Background with Blur */}
                    <div 
                      className="absolute inset-0 z-0 scale-110"
                      style={{
                        backgroundImage: `url(https://image.tmdb.org/t/p/w1280${selectedContent.backdrop_path})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: `blur(${backgroundBlur}px)`,
                      }}
                    />
                    
                    {/* Overlay */}
                    <div 
                      className="absolute inset-0 z-10"
                      style={{ 
                        backgroundColor: 'black',
                        opacity: overlayOpacity
                      }}
                    />
                    
                    {/* Content Layer */}
                    <div className="relative z-20 flex flex-col h-full items-center">
                      {/* Logo Section */}
                      <div 
                        className={cn(
                          "w-full flex mb-6",
                          logoPosition === 'left' && "justify-start",
                          logoPosition === 'center' && "justify-center",
                          logoPosition === 'right' && "justify-end"
                        )}
                        style={{
                          transform: `translate(${logoX}%, ${logoY}%)`
                        }}
                      >
                        {logo ? (
                          <img 
                            src={logo} 
                            alt="Brand Logo" 
                            style={{ width: `${logoSize}%` }} 
                            className="max-h-16 object-contain"
                          />
                        ) : (
                          <div className="h-8" />
                        )}
                      </div>

                      {/* Featured Section */}
                      <div className="w-full space-y-2 mb-8 text-center">
                        <Badge 
                          className="bg-primary/20 text-primary border-primary/30 text-[10px] px-3 py-0.5 tracking-[0.2em] font-black italic rounded-sm uppercase"
                          style={{ color: accentColor, borderColor: `${accentColor}30`, backgroundColor: `${accentColor}20` }}
                        >
                          {featuredLabel}
                        </Badge>
                      </div>

                      {/* Smartphone Frame with Poster */}
                      <div className="relative w-full flex justify-center mb-8">
                        <div 
                          className="relative shadow-2xl overflow-hidden rounded-[2.5rem] border-[6px] border-[#1a1a1a]"
                          style={{ 
                            width: `${posterWidth}%`,
                            aspectRatio: `9 / ${posterHeight}`,
                            maxWidth: '280px'
                          }}
                        >
                          {/* Screen Reflections/Gloss */}
                          <div className="absolute inset-0 z-30 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent opacity-50" />
                          
                          {/* Inner Screen */}
                          <div className="absolute inset-0 z-20 bg-black flex flex-col">
                            {/* Poster Image */}
                            <img 
                              src={`https://image.tmdb.org/t/p/w780${selectedContent.poster_path}`} 
                              alt={selectedContent.title || selectedContent.name}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Poster Overlay Label */}
                            <div className="absolute top-6 left-0 right-0 flex justify-center z-30">
                              <Badge 
                                className="text-[9px] px-3 py-0.5 font-black rounded-full bg-white text-black shadow-lg"
                              >
                                {statusLabel}
                              </Badge>
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute bottom-6 left-6 z-30 flex items-center gap-1 opacity-80">
                              <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-tighter italic">Live Now</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Info Section */}
                      <div className="mt-auto space-y-4 text-center">
                        <div className="flex justify-center mb-1">
                          {renderStars(selectedContent.vote_average)}
                        </div>

                        <h1 className="text-4xl font-black uppercase tracking-widest leading-none drop-shadow-xl">
                          {selectedContent.title || selectedContent.name}
                        </h1>

                        <div className="flex items-center justify-center gap-3 text-sm text-gray-300 font-medium">
                          <span>{selectedContent.genres?.slice(0, 3).map(g => g.name).join(' • ')}</span>
                          <span>•</span>
                          <span>{new Date(selectedContent.release_date || selectedContent.first_air_date || '').getFullYear()}</span>
                        </div>

                        {showSynopsis && (
                          <p className="text-sm text-gray-300 leading-relaxed max-w-[90%] mx-auto font-medium">
                            {truncateSynopsis(selectedContent.overview, synopsisLength)}
                          </p>
                        )}

                        <div className="pt-6 border-t border-white/10 flex flex-col items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 font-bold">|</span>
                            <span className="text-[11px] font-black tracking-[0.3em] uppercase">Disponível em</span>
                          </div>
                          <div className="flex gap-4 items-center">
                            <div className="flex items-center justify-center border border-white/30 rounded-md w-10 h-8">
                              <Smartphone size={18} strokeWidth={1.5} />
                            </div>
                            <div className="flex items-center justify-center border border-white/30 rounded-md w-10 h-8">
                              <Laptop size={18} strokeWidth={1.5} />
                            </div>
                            <div className="flex items-center justify-center border border-white/30 rounded-md w-10 h-8">
                              <div className="relative">
                                <Monitor size={18} strokeWidth={1.5} />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[6px] font-bold">SMART</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-center border border-white/30 rounded-md w-10 h-8 relative">
                              <Tv size={18} strokeWidth={1.5} />
                              <span className="absolute -right-1 bottom-0 text-[8px] font-bold">TV</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <GeradorBannerEsportes />
      )}
    </div>
  );
};

export default GeradorPost;
