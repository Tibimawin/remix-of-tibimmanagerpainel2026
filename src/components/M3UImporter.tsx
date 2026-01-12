import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useConfig } from '@/contexts/ConfigContext';
import { useBaserowService } from '@/services/BaserowService';
import { useSystemLogs } from '@/hooks/useSystemLogs';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Film, Tv, Radio, Image, Languages, Shield, Sparkles, StopCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

interface M3UItem {
  name: string;
  url: string;
  logo?: string;
  category?: string;
  type: 'Filme' | 'Serie' | 'TV' | 'Episódio';
  language?: string;
  season?: number;
  episode?: number;
  seriesName?: string;
  synopsis?: string;
}

interface ImportStats {
  filmes: number;
  series: number;
  episodios: number;
  canais: number;
}

interface ImportProgress {
  current: number;
  total: number;
  percentage: number;
  currentType: 'Séries' | 'Episódios' | 'Filmes' | 'Canais' | '';
  currentItem: string;
}

interface SeriesGroup {
  name: string;
  logo?: string;
  category?: string;
  language?: string;
  episodes: M3UItem[];
  url?: string;
}

const M3UImporter = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'automatic' | 'manual'>('automatic');
  const [namingMode, setNamingMode] = useState<'singular' | 'plural'>('singular');
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true);
  const [enrichWithTMDB, setEnrichWithTMDB] = useState(true);
  const [parsedItems, setParsedItems] = useState<M3UItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFilters, setImportFilters] = useState({
    movies: true,
    series: true,
    tv: true
  });
  const abortRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef(false);
  const [stats, setStats] = useState<ImportStats>({ filmes: 0, series: 0, episodios: 0, canais: 0 });
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    currentType: '',
    currentItem: ''
  });
  const { config } = useConfig();
  const baserowService = useBaserowService();
  const { addLog } = useSystemLogs();

  // Parser M3U Avançado
  const parseM3UAdvanced = (content: string): M3UItem[] => {
    const items: M3UItem[] = [];
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF:')) {
        const line = lines[i];
        const url = lines[i + 1];
        
        if (!url || url.startsWith('#')) continue;
        
        // Extrair tvg-logo
        const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
        const logo = logoMatch?.[1];
        
        // Extrair tvg-name ou nome após a vírgula
        const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
        const nameMatch = line.match(/,([^,]+)$/);
        let name = tvgNameMatch?.[1] || nameMatch?.[1]?.trim() || 'Sem nome';
        
        // Extrair group-title (Tipo | Categoria)
        const groupMatch = line.match(/group-title="([^"]*)"/i);
        const groupTitleFull = groupMatch?.[1] || '';
        const [typeRaw, categoryRaw] = groupTitleFull.split('|').map(s => s.trim());
        
        const category = categoryRaw || groupTitleFull; // Fallback se não tiver |
        
        // Detectar tipo base
        let type: 'Filme' | 'Serie' | 'TV' | 'Episódio' = 'Filme';
        if (typeRaw) {
           const typeUpper = typeRaw.toUpperCase();
           if (typeUpper.includes('FILME')) type = 'Filme';
           else if (typeUpper.includes('SERIE') || typeUpper.includes('SÉRIE')) type = 'Serie';
           else if (typeUpper.includes('TV') || typeUpper.includes('CANAL') || typeUpper.includes('CANAIS')) type = 'TV';
        }

        // Detectar Episódio (Sxx Eyy)
        // Regex para capturar Nome da Série, Temporada e Episódio
        // Ex: "Big Mouth S01 E01" -> Name: "Big Mouth", S: 01, E: 01
        const episodeMatch = name.match(/(.*?)\s+S(\d+)\s+E(\d+)/i);
        
        let season: number | undefined;
        let episode: number | undefined;
        let seriesName: string | undefined;

        if (episodeMatch) {
            type = 'Episódio';
            seriesName = episodeMatch[1].trim();
            season = parseInt(episodeMatch[2], 10);
            episode = parseInt(episodeMatch[3], 10);
            
            // Nome do episódio deve ser apenas o nome da série conforme regra
            name = seriesName; 
        } else if (type === 'Serie') {
            // Se for marcado como Série mas não tem padrão de episódio, 
            // assumimos que é uma entrada de série (talvez canal 24h ou algo assim)
            // ou mantemos como Série para ser criado em Conteúdos
            seriesName = name;
        }

        // Detectar idioma (mantendo lógica existente auxiliar)
        let language: string | undefined;
        const textToCheck = `${name} ${category || ''}`.toUpperCase();
        if (textToCheck.includes('DUB') || textToCheck.includes('DUBLADO') || textToCheck.includes('DUAL')) {
          language = 'DUBLADO';
        } else if (textToCheck.includes('LEG') || textToCheck.includes('LEGENDADO') || textToCheck.includes('SUB')) {
          language = 'LEGENDADO';
        }
        
        items.push({
          name,
          url,
          logo,
          category,
          type,
          language,
          season,
          episode,
          seriesName
        });
        
        i++; // Pular a próxima linha (URL)
      }
    }
    
    return items;
  };

  // Agrupar séries e episódios
  const groupSeriesAndEpisodes = (items: M3UItem[]): { series: SeriesGroup[], filmes: M3UItem[], canais: M3UItem[] } => {
    const seriesMap = new Map<string, SeriesGroup>();
    const filmes: M3UItem[] = [];
    const canais: M3UItem[] = [];
    
    items.forEach(item => {
      if (item.type === 'Episódio' && item.seriesName) {
        const seriesKey = item.seriesName.toLowerCase();
        if (!seriesMap.has(seriesKey)) {
          seriesMap.set(seriesKey, {
            name: item.seriesName,
            logo: item.logo,
            category: item.category,
            language: item.language,
            episodes: [],
            url: undefined
          });
        }
        seriesMap.get(seriesKey)!.episodes.push(item);
      } else if (item.type === 'Filme') {
        filmes.push(item);
      } else if (item.type === 'TV') {
        canais.push(item);
      } else if (item.type === 'Serie') {
        // Série sem episódios detectados
        const seriesKey = item.name.toLowerCase();
        if (!seriesMap.has(seriesKey)) {
          seriesMap.set(seriesKey, {
            name: item.name,
            logo: item.logo,
            category: item.category,
            language: item.language,
            episodes: [],
            url: item.url
          });
        } else {
          // Se já existe (criado por episódios), atualiza a URL com a da série
          const existing = seriesMap.get(seriesKey);
          if (existing) existing.url = item.url;
        }
      }
    });
    
    return {
      series: Array.from(seriesMap.values()),
      filmes,
      canais
    };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.m3u') && !file.name.toLowerCase().endsWith('.m3u8')) {
      toast.error('Arquivo inválido', {
        description: 'Por favor, selecione um arquivo .m3u ou .m3u8 válido.'
      });
      return;
    }

    setSelectedFile(file);
  };

  const handlePreviewImport = () => {
    if (!selectedFile) {
      toast.error('Dados incompletos', {
        description: 'Selecione um arquivo M3U primeiro.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const items = parseM3UAdvanced(content);
        
        if (items.length === 0) {
          toast.error('Arquivo vazio', {
            description: 'Nenhum conteúdo válido encontrado no arquivo M3U.'
          });
          return;
        }

        // Calcular estatísticas
        const grouped = groupSeriesAndEpisodes(items);
        const newStats: ImportStats = {
          filmes: grouped.filmes.length,
          series: grouped.series.length,
          episodios: grouped.series.reduce((sum, s) => sum + s.episodes.length, 0),
          canais: grouped.canais.length
        };
        
        setStats(newStats);
        setParsedItems(items);
        setShowPreview(true);
        
        toast.success('Arquivo processado!', {
          description: `${items.length} itens encontrados`
        });
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        toast.error('Erro no arquivo', {
          description: 'Não foi possível processar o arquivo M3U. Verifique o formato.'
        });
      }
    };
    
    reader.readAsText(selectedFile);
  };

  // Buscar metadados do TMDB
  const fetchTMDBMetadata = async (title: string, type: 'Filme' | 'Serie') => {
    try {
      // Tentar usar a API Key local primeiro
      const savedKeys = localStorage.getItem('api_keys');
      if (savedKeys) {
        const keys = JSON.parse(savedKeys);
        if (keys.tmdb_key) {
          const mediaType = type === 'Serie' ? 'tv' : 'movie';
          const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${keys.tmdb_key}&query=${encodeURIComponent(title)}&language=pt-BR`;
          
          const response = await fetch(searchUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              const result = data.results[0];
              return {
                title: result.title || result.name,
                overview: result.overview,
                rating: result.vote_average,
                release_date: result.release_date || result.first_air_date,
                poster: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
                backdrop: result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : null,
                genres: [] // Generos não vêm na busca simples, mas ok
              };
            }
          }
        }
      }

      // Fallback para a Edge Function
      const { data, error } = await supabase.functions.invoke('tmdb-metadata', {
        body: { title, type }
      });
      
      if (error) throw error;
      return data?.metadata || null;
    } catch (error) {
      console.error('Erro ao buscar metadados TMDB:', error);
      return null;
    }
  };

  const handleStopImport = () => {
    abortRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
    toast.info('Parando importação...', {
      description: 'A importação será interrompida após o item atual.'
    });
  };

  const handleTogglePause = () => {
    pauseRef.current = !pauseRef.current;
    setIsPaused(pauseRef.current);
  };

  const checkPause = async () => {
    while (pauseRef.current) {
      if (abortRef.current) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const handleImport = async () => {
    if (!config?.tableIds?.conteudos || !config?.tableIds?.episodios) {
      toast.error('Configuração necessária', {
        description: 'Configure os IDs das tabelas primeiro.'
      });
      return;
    }

    setIsImporting(true);
    abortRef.current = false;
    pauseRef.current = false;
    setIsPaused(false);
    
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    try {
      const grouped = groupSeriesAndEpisodes(parsedItems);
      
      // Calcular total de itens a importar
      const totalItems = grouped.series.length + 
                        grouped.series.reduce((sum, s) => sum + s.episodes.length, 0) +
                        grouped.filmes.length + 
                        grouped.canais.length;
      
      setProgress({ current: 0, total: totalItems, percentage: 0, currentType: '', currentItem: '' });
      
      // Buscar conteúdos existentes se a opção de ignorar duplicados estiver ativa
      let existingNames = new Set<string>();
      if (ignoreDuplicates) {
        try {
          const { results } = await baserowService.getAllTableData(config.tableIds.conteudos);
          existingNames = new Set(results.map((item: any) => item.Nome?.toLowerCase().trim()).filter(Boolean));
        } catch (error) {
          console.error('Erro ao buscar conteúdos existentes:', error);
        }
      }
      
      // 1. Importar Séries e Episódios
      if (importFilters.series) {
        for (const series of grouped.series) {
          if (abortRef.current) break;
          await checkPause();
          
          let currentSeriesId: number | null = null;

          try {
            setProgress(prev => ({
              ...prev,
              current: prev.current + 1,
              percentage: Math.round(((prev.current + 1) / prev.total) * 100),
              currentType: 'Séries',
              currentItem: series.name
            }));
            
            // Verificar duplicado
            if (ignoreDuplicates && existingNames.has(series.name.toLowerCase().trim())) {
              duplicateCount++;
              continue;
            }
            
            // Buscar metadados do TMDB se habilitado
            let tmdbData = null;
            if (enrichWithTMDB) {
              tmdbData = await fetchTMDBMetadata(series.name, 'Serie');
            }
            
            let category = tmdbData?.genres?.join(', ') || series.category || '';
            if (category) category += ', ';
            category += 'Series';

            const seriesData = {
              Nome: tmdbData?.title || series.name,
              Capa: tmdbData?.poster || series.logo || '',
              Categoria: category,
              Sinopse: tmdbData?.overview || '',
              Link: series.url || series.logo || '',
              Tipo: namingMode === 'plural' ? 'Series' : 'Serie',
              Idioma: series.language || 'DUBLADO',
              Views: 0,
              Temporadas: Math.max(...series.episodes.map(e => e.season || 0)),
              Imdb: tmdbData?.rating || 0,
              'Capa de fundo': tmdbData?.backdrop || '',
              'Data de Lançamento': tmdbData?.release_date || ''
            };
            
            const createdSeries = await baserowService.createRow(config.tableIds.conteudos, seriesData);
            currentSeriesId = createdSeries.id;
            successCount++;
            
            // Pequena pausa para evitar sobrecarga
            await new Promise(resolve => setTimeout(resolve, enrichWithTMDB ? 300 : 50));
          } catch (error) {
            console.error('Erro ao importar série:', error);
            errorCount++;
          }

          // Importar episódios se a série foi criada com sucesso
          if (currentSeriesId) {
            for (const episode of series.episodes) {
              if (abortRef.current) break;
              await checkPause();

              try {
                setProgress(prev => ({
                  ...prev,
                  current: prev.current + 1,
                  percentage: Math.round(((prev.current + 1) / prev.total) * 100),
                  currentType: 'Episódios',
                  currentItem: `${series.name} - S${episode.season}E${episode.episode}`
                }));
                
                const episodeData = {
                  Nome: episode.seriesName || series.name,
                  Temporada: episode.season || 1,
                  Episódio: episode.episode || 1,
                  Link: episode.url,
                  Conteudo: [currentSeriesId]
                };
                
                await baserowService.createRow(config.tableIds.episodios, episodeData);
                successCount++;
                
                // Pequena pausa
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (error) {
                console.error('Erro ao importar episódio:', error);
                errorCount++;
              }
            }
          }
        }
      }
      
      // 3. Importar Filmes
      if (importFilters.movies) {
        for (const filme of grouped.filmes) {
          if (abortRef.current) break;
          await checkPause();
          
          try {
            setProgress(prev => ({
              ...prev,
              current: prev.current + 1,
              percentage: Math.round(((prev.current + 1) / prev.total) * 100),
              currentType: 'Filmes',
              currentItem: filme.name
            }));
            
            // Verificar duplicado
            if (ignoreDuplicates && existingNames.has(filme.name.toLowerCase().trim())) {
              duplicateCount++;
              continue;
            }
            
            // Buscar metadados do TMDB se habilitado
            let tmdbData = null;
            if (enrichWithTMDB) {
              tmdbData = await fetchTMDBMetadata(filme.name, 'Filme');
            }
            
            let category = tmdbData?.genres?.join(', ') || filme.category || '';
            if (category) category += ', ';
            category += 'Filmes';

            const filmeData = {
              Nome: tmdbData?.title || filme.name,
              Capa: tmdbData?.poster || filme.logo || '',
              Categoria: category,
              Sinopse: tmdbData?.overview || '',
              Link: filme.url,
              Tipo: namingMode === 'plural' ? 'Filmes' : 'Filme',
              Idioma: filme.language || 'DUBLADO',
              Views: 0,
              Imdb: tmdbData?.rating || 0,
              'Capa de fundo': tmdbData?.backdrop || '',
              'Data de Lançamento': tmdbData?.release_date || ''
            };
            
            await baserowService.createRow(config.tableIds.conteudos, filmeData);
            successCount++;
            
            await new Promise(resolve => setTimeout(resolve, enrichWithTMDB ? 300 : 50));
          } catch (error) {
            console.error('Erro ao importar filme:', error);
            errorCount++;
          }
        }
      }
      
      // 4. Importar Canais TV
      if (importFilters.tv) {
        for (const canal of grouped.canais) {
          if (abortRef.current) break;
          await checkPause();
          
          try {
            setProgress(prev => ({
              ...prev,
              current: prev.current + 1,
              percentage: Math.round(((prev.current + 1) / prev.total) * 100),
              currentType: 'Canais',
              currentItem: canal.name
            }));
            
            // Verificar duplicado
            if (ignoreDuplicates && existingNames.has(canal.name.toLowerCase().trim())) {
              duplicateCount++;
              continue;
            }
            
            let category = canal.category || '';
            if (category) category += ', ';
            category += 'TV';

            const canalData = {
              Nome: canal.name,
              Capa: canal.logo || '',
              Categoria: category,
              Link: canal.url,
              Tipo: 'TV',
              Idioma: 'Ao Vivo',
              Views: 0
            };
            
            const targetTableId = (namingMode === 'plural' && config.tableIds.canaisTv) 
              ? config.tableIds.canaisTv 
              : config.tableIds.conteudos;

            await baserowService.createRow(targetTableId, canalData);
            successCount++;
            
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error) {
            console.error('Erro ao importar canal:', error);
            errorCount++;
          }
        }
      }

      if (abortRef.current) {
        toast.info('Importação cancelada', {
          description: 'O processo foi interrompido pelo usuário.'
        });
      } else if (successCount > 0) {
        const description = [
          `${successCount} itens importados`,
          duplicateCount > 0 ? `${duplicateCount} duplicados ignorados` : '',
          errorCount > 0 ? `${errorCount} com erro` : ''
        ].filter(Boolean).join(', ');
        
        toast.success('Importação concluída!', { description });

        // Tocar som de sucesso
        try {
          const audio = new Audio('/success.mp3');
          audio.play().catch(e => console.error('Erro ao tocar som:', e));
        } catch (error) {
          console.error('Erro ao inicializar áudio:', error);
        }
        
        addLog(
          'Importou lista M3U',
          `${stats.series} séries, ${stats.episodios} episódios, ${stats.filmes} filmes, ${stats.canais} canais${duplicateCount > 0 ? `, ${duplicateCount} duplicados` : ''}${errorCount > 0 ? `, ${errorCount} erros` : ''}`
        );
      } else {
        toast.error('Erro na importação', {
          description: duplicateCount > 0 
            ? `Todos os ${duplicateCount} itens já existem na biblioteca.`
            : 'Nenhum item foi importado com sucesso.'
        });
      }
    } catch (error) {
      console.error('Erro durante importação:', error);
      toast.error('Erro', {
        description: 'Erro durante o processo de importação.'
      });
    } finally {
      setIsImporting(false);
      setShowPreview(false);
      setParsedItems([]);
      setSelectedFile(null);
      setStats({ filmes: 0, series: 0, episodios: 0, canais: 0 });
      setProgress({ current: 0, total: 0, percentage: 0, currentType: '', currentItem: '' });
    }
  };

  const grouped = parsedItems.length > 0 ? groupSeriesAndEpisodes(parsedItems) : { series: [], filmes: [], canais: [] };

  return (
    <>
      <Card className="netflix-card">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Importador M3U Inteligente
          </CardTitle>
          <CardDescription>
            Importação automática com detecção de tipo, idioma e organização de episódios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estrutura de Conteúdo */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Estrutura de Conteúdo</Label>
            <RadioGroup value={namingMode} onValueChange={(v) => setNamingMode(v as any)} className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="singular" id="mode-singular" />
                <Label htmlFor="mode-singular" className="cursor-pointer">
                  Filme/Serie (Padrão)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="plural" id="mode-plural" />
                <Label htmlFor="mode-plural" className="cursor-pointer">
                  Filmes/Series
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {namingMode === 'plural' 
                ? 'Canais de TV serão enviados para a tabela "Canais TV".' 
                : 'Todo conteúdo será enviado para a tabela "Conteúdos".'}
            </p>
          </div>

          {/* Modo de Importação */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Modo de Importação</Label>
            <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="automatic" id="automatic" />
                <Label htmlFor="automatic" className="cursor-pointer">
                  <div>
                    <div className="font-medium">Automático (Recomendado)</div>
                    <div className="text-xs text-muted-foreground">Detecta tipo, idioma e organiza episódios automaticamente</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="cursor-pointer">
                  <div>
                    <div className="font-medium">Manual</div>
                    <div className="text-xs text-muted-foreground">Você define o tipo manualmente</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Opção de Ignorar Duplicados */}
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="ignore-duplicates" className="text-base font-medium cursor-pointer">
                  Ignorar Duplicados
                </Label>
                <p className="text-sm text-muted-foreground">
                  Verifica nomes existentes e ignora conteúdos já importados
                </p>
              </div>
            </div>
            <Switch
              id="ignore-duplicates"
              checked={ignoreDuplicates}
              onCheckedChange={setIgnoreDuplicates}
            />
          </div>

          {/* Opção de Enriquecer com TMDB */}
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="enrich-tmdb" className="text-base font-medium cursor-pointer">
                  Enriquecer com TMDB
                </Label>
                <p className="text-sm text-muted-foreground">
                  Adiciona automaticamente sinopse, capa HD, ano, gêneros e classificação
                </p>
              </div>
            </div>
            <Switch
              id="enrich-tmdb"
              checked={enrichWithTMDB}
              onCheckedChange={setEnrichWithTMDB}
            />
          </div>

          {/* Upload do Arquivo */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Arquivo M3U / M3U8</Label>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Input
                  type="file"
                  accept=".m3u,.m3u8"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <CheckCircle className="h-4 w-4" />
                  {selectedFile.name}
                </div>
              )}
            </div>
          </div>

          {/* Botão de Preview */}
          <Button
            onClick={handlePreviewImport}
            disabled={!selectedFile}
            className="w-full"
            size="lg"
          >
            <Upload className="h-4 w-4 mr-2" />
            Processar e Visualizar
          </Button>
        </CardContent>
      </Card>

      {/* Dialog de Preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Preview da Importação</DialogTitle>
            <DialogDescription>
              {parsedItems.length} itens processados • Modo: {importMode === 'automatic' ? 'Automático' : 'Manual'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Filtros de Importação */}
            <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-muted/30">
              <Label className="w-full text-sm font-semibold text-muted-foreground">Selecione o que importar:</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-movies" 
                  checked={importFilters.movies}
                  onCheckedChange={(checked) => setImportFilters(prev => ({ ...prev, movies: !!checked }))}
                />
                <Label htmlFor="filter-movies" className="cursor-pointer flex items-center gap-1">
                  <Film className="h-4 w-4" /> Filmes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-series" 
                  checked={importFilters.series}
                  onCheckedChange={(checked) => setImportFilters(prev => ({ ...prev, series: !!checked }))}
                />
                <Label htmlFor="filter-series" className="cursor-pointer flex items-center gap-1">
                  <Tv className="h-4 w-4" /> Séries e Episódios
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-tv" 
                  checked={importFilters.tv}
                  onCheckedChange={(checked) => setImportFilters(prev => ({ ...prev, tv: !!checked }))}
                />
                <Label htmlFor="filter-tv" className="cursor-pointer flex items-center gap-1">
                  <Radio className="h-4 w-4" /> Canais TV
                </Label>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Film className="h-5 w-5 text-blue-400" />
                    <div>
                      <div className="text-2xl font-bold">{stats.filmes}</div>
                      <div className="text-xs text-muted-foreground">Filmes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-500/10 border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Tv className="h-5 w-5 text-purple-400" />
                    <div>
                      <div className="text-2xl font-bold">{stats.series}</div>
                      <div className="text-xs text-muted-foreground">Séries</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="text-2xl font-bold">{stats.episodios}</div>
                      <div className="text-xs text-muted-foreground">Episódios</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-orange-400" />
                    <div>
                      <div className="text-2xl font-bold">{stats.canais}</div>
                      <div className="text-xs text-muted-foreground">Canais TV</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview das Séries */}
            {grouped.series.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Tv className="h-4 w-4" />
                  Séries ({grouped.series.length})
                </h3>
                <ScrollArea className="h-48 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Episódios</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Idioma</TableHead>
                        <TableHead>Capa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped.series.slice(0, 20).map((series, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{series.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{series.episodes.length} eps</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{series.category || '-'}</TableCell>
                          <TableCell>
                            {series.language && (
                              <Badge variant="outline" className="text-xs">
                                <Languages className="h-3 w-3 mr-1" />
                                {series.language}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {series.logo && (
                              <Image className="h-4 w-4 text-green-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {grouped.series.length > 20 && (
                    <div className="p-2 text-center text-sm text-muted-foreground bg-muted/30">
                      ... e mais {grouped.series.length - 20} série(s)
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Preview dos Filmes */}
            {grouped.filmes.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  Filmes ({grouped.filmes.length})
                </h3>
                <ScrollArea className="h-40 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Idioma</TableHead>
                        <TableHead>Capa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped.filmes.slice(0, 15).map((filme, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{filme.name}</TableCell>
                          <TableCell className="text-xs">{filme.category || '-'}</TableCell>
                          <TableCell>
                            {filme.language && (
                              <Badge variant="outline" className="text-xs">
                                <Languages className="h-3 w-3 mr-1" />
                                {filme.language}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {filme.logo && (
                              <Image className="h-4 w-4 text-green-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {grouped.filmes.length > 15 && (
                    <div className="p-2 text-center text-sm text-muted-foreground bg-muted/30">
                      ... e mais {grouped.filmes.length - 15} filme(s)
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Preview dos Canais */}
            {grouped.canais.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Canais TV ({grouped.canais.length})
                </h3>
                <ScrollArea className="h-32 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Capa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped.canais.slice(0, 10).map((canal, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{canal.name}</TableCell>
                          <TableCell className="text-xs">{canal.category || '-'}</TableCell>
                          <TableCell>
                            {canal.logo && (
                              <Image className="h-4 w-4 text-green-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {grouped.canais.length > 10 && (
                    <div className="p-2 text-center text-sm text-muted-foreground bg-muted/30">
                      ... e mais {grouped.canais.length - 10} canal(is)
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Barra de Progresso */}
          {isImporting && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {progress.currentType && `Importando ${progress.currentType}...`}
                </span>
                <span className="text-muted-foreground">
                  {progress.current} / {progress.total} ({progress.percentage}%)
                </span>
              </div>
              
              <Progress value={progress.percentage} className="h-2" />
              
              {progress.currentItem && (
                <p className="text-xs text-muted-foreground truncate">
                  {progress.currentItem}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isImporting}>
              Cancelar
            </Button>
            
            {isImporting && (
              <Button variant="outline" onClick={handleTogglePause} className="mr-2">
                {isPaused ? (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Retomar
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Pausar
                  </>
                )}
              </Button>
            )}

            {isImporting && (
              <Button variant="destructive" onClick={handleStopImport} className="mr-2">
                <StopCircle className="h-4 w-4 mr-2" />
                Parar
              </Button>
            )}

            <Button onClick={handleImport} disabled={isImporting} size="lg">
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Importação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default M3UImporter;