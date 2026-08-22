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
...
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
          </div>
        </div>
      ) : (
        <GeradorBannerEsportes />
      )}
    </div>
  );
};

export default GeradorPost;