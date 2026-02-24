import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Film, Tv, Radio, Image, Languages, Shield, Sparkles, StopCircle, PauseCircle, PlayCircle, Star, Database, Globe, Eye, EyeOff, Save, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Função de normalização para comparação robusta de nomes
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, '')     // remove pontuação
    .replace(/\s+/g, ' ')            // normaliza espaços
    .trim();
}
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { UserConfigService } from '@/services/UserConfigService';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useM3UImport } from '@/contexts/M3UImportContext';

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

interface TMDBPreviewCache {
  [key: string]: {
    poster?: string | null;
    overview?: string;
    rating?: string;
    loading?: boolean;
  };
}

const M3UImporter = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<'file' | 'dns'>('file');
  const [dnsUrl, setDnsUrl] = useState('');
  const [dnsUsername, setDnsUsername] = useState('');
  const [dnsPassword, setDnsPassword] = useState('');
  const [showDnsPassword, setShowDnsPassword] = useState(false);
  const [isFetchingDns, setIsFetchingDns] = useState(false);
  const [dnsFetchPhase, setDnsFetchPhase] = useState<'idle' | 'connecting' | 'downloading' | 'validating'>('idle');
  const [dnsFetchElapsed, setDnsFetchElapsed] = useState(0);
  const dnsFetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [dnsContentLoaded, setDnsContentLoaded] = useState(false);
  const [dnsM3UContent, setDnsM3UContent] = useState<string | null>(null);
  const [hasSavedDnsConfig, setHasSavedDnsConfig] = useState(false);
  const [pendingAutoFetch, setPendingAutoFetch] = useState(false);
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
  const [tmdbPreviewCache, setTmdbPreviewCache] = useState<TMDBPreviewCache>({});
  const [loadingTmdbPreview, setLoadingTmdbPreview] = useState(false);
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

  // ✅ Retomada de importação
  const RESUME_KEY = 'm3u-import-resume';
  const [resumeState, setResumeState] = useState<{
    parsedItems: M3UItem[];
    ignoreDuplicates: boolean;
    enrichWithTMDB: boolean;
    namingMode: 'singular' | 'plural';
    importMode: 'automatic' | 'manual';
    importFilters: { movies: boolean; series: boolean; tv: boolean };
    seriesStartIdx: number;
    filmesStartIdx: number;
    canaisStartIdx: number;
    savedAt: string;
  } | null>(null);
  // índices de retomada usados durante a execução do handleImport
  const resumeIdxRef = useRef({ series: 0, filmes: 0, canais: 0 });

  const { config } = useConfig();
  const baserowService = useBaserowService();
  const { addLog } = useSystemLogs();
  const { userInfo } = useSimpleAuth();
  const { config: userConfig } = useUserConfig();
  const { updateProgress: updateGlobalProgress, clearProgress: clearGlobalProgress } = useM3UImport();

  // Verificar se a chave TMDB está configurada
  const tmdbKeyConfigured = !!(userConfig as any)?.apiKeys?.tmdb;

  // ✅ Espelha estado local de importação para o contexto global (barra persistente)
  useEffect(() => {
    updateGlobalProgress({
      isImporting,
      isPaused,
      current: progress.current,
      total: progress.total,
      percentage: progress.percentage,
      currentType: progress.currentType,
      currentItem: progress.currentItem,
      stats,
    });
  }, [isImporting, isPaused, progress, stats]);

  // ✅ Avisa o usuário ao tentar fechar a aba/navegador durante importação ativa
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isImporting) return;
      e.preventDefault();
      e.returnValue = 'A importação M3U está em andamento. Se sair, o processo será cancelado. Tem certeza?';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isImporting]);

  // Buscar prévia TMDB para itens do preview (limitado aos primeiros para não sobrecarregar)
  useEffect(() => {
    if (!showPreview || !enrichWithTMDB || !tmdbKeyConfigured) return;

    // Agrupar inline para não depender da função definida abaixo
    const seriesMap = new Map<string, string>();
    const filmesArr: string[] = [];
    parsedItems.forEach(item => {
      if ((item.type === 'Episódio' || item.type === 'Serie') && item.seriesName) {
        if (!seriesMap.has(item.seriesName.toLowerCase())) seriesMap.set(item.seriesName.toLowerCase(), item.seriesName);
      } else if (item.type === 'Serie') {
        if (!seriesMap.has(item.name.toLowerCase())) seriesMap.set(item.name.toLowerCase(), item.name);
      } else if (item.type === 'Filme') {
        filmesArr.push(item.name);
      }
    });

    const itemsToFetch: { name: string; type: 'Filme' | 'Serie' }[] = [
      ...filmesArr.slice(0, 8).map(name => ({ name, type: 'Filme' as const })),
      ...Array.from(seriesMap.values()).slice(0, 8).map(name => ({ name, type: 'Serie' as const }))
    ];

    if (itemsToFetch.length === 0) return;

    setLoadingTmdbPreview(true);
    setTmdbPreviewCache({});

    let cancelled = false;

    const fetchOneTMDB = async (title: string, type: 'Filme' | 'Serie') => {
      let tmdbKey: string | null = (userConfig as any)?.apiKeys?.tmdb || null;
      if (!tmdbKey && userInfo?.id) {
        try {
          const freshConfig = await UserConfigService.getUserConfig(userInfo.id);
          tmdbKey = (freshConfig as any)?.apiKeys?.tmdb || null;
        } catch { /* ignore */ }
      }
      if (!tmdbKey) return null;

      const cleanTitle = title
        .replace(/\s*\(\d{4}\)\s*(LEG|DUB|DUBLADO|LEGENDADO)?\s*$/i, '')
        .replace(/\s+(LEG|DUB|DUBLADO|LEGENDADO)\s*$/i, '')
        .trim();
      const mediaType = type === 'Serie' ? 'tv' : 'movie';

      const searchRes = await fetch(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${tmdbKey}&query=${encodeURIComponent(cleanTitle)}&language=pt-BR`);
      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();
      if (!searchData.results?.length) return null;
      const first = searchData.results[0];

      let details = first;
      try {
        const detRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${first.id}?api_key=${tmdbKey}&language=pt-BR`);
        if (detRes.ok) details = await detRes.json();
      } catch { /* ignore */ }

      const vote = Number(details.vote_average || first.vote_average || 0);
      const rating = vote > 0 ? `${vote.toFixed(1)}/10` : '';
      const posterPath = details.poster_path || first.poster_path;

      return {
        poster: posterPath ? `https://image.tmdb.org/t/p/w92${posterPath}` : null,
        overview: details.overview || first.overview || '',
        rating
      };
    };

    const fetchAll = async () => {
      for (const item of itemsToFetch) {
        if (cancelled) break;
        const key = `${item.type}::${item.name}`;
        setTmdbPreviewCache(prev => ({ ...prev, [key]: { loading: true } }));
        try {
          const data = await fetchOneTMDB(item.name, item.type);
          if (!cancelled) {
            setTmdbPreviewCache(prev => ({
              ...prev,
              [key]: { poster: data?.poster || null, overview: data?.overview || '', rating: data?.rating || '', loading: false }
            }));
          }
        } catch {
          if (!cancelled) setTmdbPreviewCache(prev => ({ ...prev, [key]: { loading: false } }));
        }
        await new Promise(r => setTimeout(r, 300));
      }
      if (!cancelled) setLoadingTmdbPreview(false);
    };

    fetchAll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, enrichWithTMDB, tmdbKeyConfigured]);

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
           else if (typeUpper.includes('SERIE') || typeUpper.includes('SÉRIE') || typeUpper.includes('SERIES')) type = 'Serie';
           else if (typeUpper.includes('TV') || typeUpper.includes('CANAL') || typeUpper.includes('CANAIS')) type = 'TV';
        }
        // Fallback: se a URL contém /series/, forçar tipo Serie
        if (type === 'Filme' && url.includes('/series/')) {
          type = 'Serie';
        }

        // Detectar Episódio (Sxx Eyy)
        // Regex para capturar Nome da Série, Temporada e Episódio
        // Ex: "Big Mouth S01 E01" -> Name: "Big Mouth", S: 01, E: 01
        const episodeMatch = name.match(/(.*?)\s+S(\d+)\s*E(\d+)/i);
        
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

  // Carregar credenciais DNS salvas
  useEffect(() => {
    if (userInfo?.id) {
      UserConfigService.getDnsConfig(userInfo.id).then(config => {
        if (config && config.dnsUrl && config.dnsUsername && config.dnsPassword) {
          setHasSavedDnsConfig(true);
          if (sourceType === 'dns') {
            setDnsUrl(config.dnsUrl);
            setDnsUsername(config.dnsUsername);
            setDnsPassword(config.dnsPassword);
          }
        }
      });
    }
  }, [sourceType, userInfo?.id]);

  // Recarregar lista usando credenciais salvas
  const handleQuickReload = async () => {
    if (!userInfo?.id) return;
    const config = await UserConfigService.getDnsConfig(userInfo.id);
    if (!config?.dnsUrl || !config?.dnsUsername || !config?.dnsPassword) {
      toast.error('Nenhuma credencial salva', {
        description: 'Conecte-se via DNS/IPTV pelo menos uma vez para salvar as credenciais.'
      });
      return;
    }
    setSourceType('dns');
    setDnsUrl(config.dnsUrl);
    setDnsUsername(config.dnsUsername);
    setDnsPassword(config.dnsPassword);
    setPendingAutoFetch(true);
  };

  // Limpar credenciais DNS salvas
  const handleClearDnsConfig = async () => {
    if (!userInfo?.id) return;
    try {
      await UserConfigService.updateUserConfig(userInfo.id, { dnsConfig: null } as any);
      setHasSavedDnsConfig(false);
      setDnsUrl('');
      setDnsUsername('');
      setDnsPassword('');
      toast.success('Credenciais DNS removidas com sucesso');
    } catch (error) {
      toast.error('Erro ao remover credenciais DNS');
    }
  };

  // Buscar lista M3U via DNS/IPTV
  const handleFetchDNS = async () => {
    if (!dnsUrl || !dnsUsername || !dnsPassword) {
      toast.error('Preencha todos os campos', {
        description: 'URL do servidor, usuário e senha são obrigatórios.'
      });
      return;
    }

    setIsFetchingDns(true);
    setDnsContentLoaded(false);
    setDnsM3UContent(null);
    setDnsFetchPhase('connecting');
    setDnsFetchElapsed(0);

    // Start elapsed timer
    const startTime = Date.now();
    dnsFetchTimerRef.current = setInterval(() => {
      setDnsFetchElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      // Normalizar URL (remover barra final)
      const baseUrl = dnsUrl.replace(/\/+$/, '');
      const m3uUrl = `${baseUrl}/get.php?username=${encodeURIComponent(dnsUsername)}&password=${encodeURIComponent(dnsPassword)}&type=m3u_plus`;

      console.log('[DNS] Fetching M3U from:', m3uUrl);

      // Detectar ambiente para proxy
      const isLovablePreview = window.location.hostname.includes('lovable.app');
      const proxyBase = isLovablePreview 
        ? 'https://pixel-perfect-clone-4083.lovable.app'
        : '';

      setDnsFetchPhase('downloading');

      const response = await fetch(`${proxyBase}/api/m3u-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: m3uUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();

      setDnsFetchPhase('validating');

      if (!content || content.length < 10) {
        throw new Error('Resposta vazia do servidor. Verifique as credenciais.');
      }

      if (!content.includes('#EXTM3U') && !content.includes('#EXTINF')) {
        throw new Error('O conteúdo retornado não é um arquivo M3U válido. Verifique as credenciais.');
      }

      setDnsM3UContent(content);
      setDnsContentLoaded(true);

      toast.success('Lista M3U carregada!', {
        description: `${(content.length / 1024).toFixed(0)} KB recebidos em ${Math.floor((Date.now() - startTime) / 1000)}s.`
      });

      // Salvar credenciais para uso futuro
      if (userInfo?.id) {
        UserConfigService.saveDnsConfig(userInfo.id, { dnsUrl, dnsUsername, dnsPassword }).catch(err => {
          console.warn('Falha ao salvar credenciais DNS:', err);
        });
      }
    } catch (error: any) {
      console.error('[DNS] Error:', error);
      toast.error('Erro ao buscar lista', {
        description: error.message || 'Não foi possível conectar ao servidor IPTV.',
        duration: 8000,
      });
    } finally {
      setIsFetchingDns(false);
      setDnsFetchPhase('idle');
      if (dnsFetchTimerRef.current) {
        clearInterval(dnsFetchTimerRef.current);
        dnsFetchTimerRef.current = null;
      }
    }
  };

  // Auto-fetch quando pendingAutoFetch é ativado (via quick reload)
  useEffect(() => {
    if (pendingAutoFetch && dnsUrl && dnsUsername && dnsPassword && !isFetchingDns) {
      setPendingAutoFetch(false);
      handleFetchDNS();
    }
  }, [pendingAutoFetch, dnsUrl, dnsUsername, dnsPassword]);

  const handlePreviewImport = () => {
    // Determinar conteúdo M3U (arquivo ou DNS)
    if (sourceType === 'dns') {
      if (!dnsM3UContent) {
        toast.error('Busque a lista primeiro', {
          description: 'Clique em "Buscar Lista" para carregar o conteúdo do servidor.'
        });
        return;
      }
      processM3UContent(dnsM3UContent);
    } else {
      if (!selectedFile) {
        toast.error('Dados incompletos', {
          description: 'Selecione um arquivo M3U primeiro.'
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        processM3UContent(content);
      };
      reader.readAsText(selectedFile);
    }
  };

  const processM3UContent = (content: string) => {
    try {
      const items = parseM3UAdvanced(content);
      
      if (items.length === 0) {
        toast.error('Conteúdo vazio', {
          description: 'Nenhum conteúdo válido encontrado no M3U.'
        });
        return;
      }

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
      
      toast.success('Conteúdo processado!', {
        description: `${items.length} itens encontrados`
      });
    } catch (error) {
      console.error('Erro ao processar M3U:', error);
      toast.error('Erro no conteúdo', {
        description: 'Não foi possível processar o conteúdo M3U. Verifique o formato.'
      });
    }
  };



  // Buscar metadados do TMDB com limpeza de título, search + details
  const fetchTMDBMetadata = async (title: string, type: 'Filme' | 'Serie') => {
    try {
      // 1. Recuperar chave TMDB: primeiro do estado reativo, depois fallback ao Firestore
      let tmdbKey: string | null = (userConfig as any)?.apiKeys?.tmdb || null;

      if (!tmdbKey && userInfo?.id) {
        try {
          const freshConfig = await UserConfigService.getUserConfig(userInfo.id);
          tmdbKey = (freshConfig as any)?.apiKeys?.tmdb || null;
        } catch (e) {
          console.warn('Fallback Firestore falhou:', e);
        }
      }

      if (!tmdbKey) {
        console.warn('Chave TMDB não configurada');
        return null;
      }

      // 2. Limpar título antes de buscar
      const cleanTitle = title
        .replace(/\s*\(\d{4}\)\s*(LEG|DUB|DUBLADO|LEGENDADO)?\s*$/i, '')
        .replace(/\s+(LEG|DUB|DUBLADO|LEGENDADO)\s*$/i, '')
        .trim();

      const mediaType = type === 'Serie' ? 'tv' : 'movie';

      // 3. Chamada Search
      const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${tmdbKey}&query=${encodeURIComponent(cleanTitle)}&language=pt-BR`;
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) {
        console.error('TMDB search falhou:', searchResponse.status);
        return null;
      }

      const searchData = await searchResponse.json();
      if (!searchData.results || searchData.results.length === 0) return null;

      const firstResult = searchData.results[0];

      // 3. Chamada Details para dados completos
      let details = firstResult;
      try {
        const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${firstResult.id}?api_key=${tmdbKey}&language=pt-BR`;
        const detailsResponse = await fetch(detailsUrl);
        if (detailsResponse.ok) {
          details = await detailsResponse.json();
        }
      } catch (e) {
        console.warn('Falha ao buscar detalhes TMDB, usando firstResult:', e);
      }

      // 4. Formatar dados retornados
      const vote = Number(details.vote_average || firstResult.vote_average || 0);
      const rating = vote > 0 ? `${vote.toFixed(1)}/10` : '';

      const rawDate = details.release_date || details.first_air_date || firstResult.release_date || firstResult.first_air_date || '';
      let release_date = '';
      const dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        release_date = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
      }

      const posterPath = details.poster_path || firstResult.poster_path;
      const backdropPath = details.backdrop_path || firstResult.backdrop_path;

      return {
        title: details.title || details.name || firstResult.title || firstResult.name,
        overview: details.overview || firstResult.overview || '',
        rating,
        release_date,
        poster: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
        backdrop: backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : null,
        genres: details.genres?.map((g: any) => g.name) || []
      };
    } catch (error) {
      console.error('Erro ao buscar metadados TMDB:', error);
      return null;
    }
  };

  // ✅ Flag no sessionStorage para impedir logout automático durante importação
  useEffect(() => {
    if (isImporting) {
      sessionStorage.setItem('m3u-import-active', 'true');
    } else {
      sessionStorage.removeItem('m3u-import-active');
    }
    return () => {
      // Limpar flag ao desmontar o componente
      if (!isImporting) sessionStorage.removeItem('m3u-import-active');
    };
  }, [isImporting]);

  const handleStopImport = () => {
    abortRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
    sessionStorage.removeItem('m3u-import-active');
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

    // Aviso se TMDB ativo mas chave não configurada
    if (enrichWithTMDB) {
      let tmdbKey: string | null = (userConfig as any)?.apiKeys?.tmdb || null;
      if (!tmdbKey && userInfo?.id) {
        try {
          const freshConfig = await UserConfigService.getUserConfig(userInfo.id);
          tmdbKey = (freshConfig as any)?.apiKeys?.tmdb || null;
        } catch (e) { /* ignore */ }
      }
      if (!tmdbKey) {
        toast.warning('Chave TMDB não configurada', {
          description: 'Vá em Configurações → APIs e adicione sua chave do TMDB para enriquecer os dados.'
        });
      }
    }

    setIsImporting(true);
    abortRef.current = false;
    pauseRef.current = false;
    setIsPaused(false);
    
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // 🚀 Cache TMDB por sessão para evitar buscas repetidas
    const tmdbCache = new Map<string, any>();

    const fetchTMDBCached = async (title: string, type: 'Filme' | 'Serie') => {
      const cacheKey = `${type}::${title.toLowerCase().trim()}`;
      if (tmdbCache.has(cacheKey)) return tmdbCache.get(cacheKey);
      const result = await fetchTMDBMetadata(title, type);
      tmdbCache.set(cacheKey, result);
      return result;
    };

    // 🚀 Buscar TMDB em paralelo (até 3 simultâneos)
    const fetchTMDBParallel = async (items: { title: string; type: 'Filme' | 'Serie' }[]) => {
      const results: (any | null)[] = [];
      const PARALLEL = 3;
      for (let i = 0; i < items.length; i += PARALLEL) {
        if (abortRef.current) break;
        await checkPause();
        const chunk = items.slice(i, i + PARALLEL);
        const chunkResults = await Promise.all(
          chunk.map(item => fetchTMDBCached(item.title, item.type))
        );
        results.push(...chunkResults);
        // Delay entre chunks para respeitar rate limit TMDB (40 req/10s)
        if (i + PARALLEL < items.length) {
          await new Promise(r => setTimeout(r, 150));
        }
      }
      return results;
    };

    try {
      const grouped = groupSeriesAndEpisodes(parsedItems);
      
      const totalItems = grouped.series.length + 
                        grouped.series.reduce((sum, s) => sum + s.episodes.length, 0) +
                        grouped.filmes.length + 
                        grouped.canais.length;
      
      setProgress({ current: 0, total: totalItems, percentage: 0, currentType: '', currentItem: '' });
      
      // Buscar conteúdos existentes se a opção de ignorar duplicados estiver ativa
      let existingNames = new Set<string>();
      let duplicateCheckActive = ignoreDuplicates;
      if (ignoreDuplicates) {
        try {
          setProgress(prev => ({ ...prev, currentItem: 'Carregando conteúdos existentes para verificação de duplicados...' }));
          const { results } = await baserowService.getAllTableData(config.tableIds.conteudos);
          existingNames = new Set(results.map((item: any) => {
            const nome = item.Nome;
            return nome ? normalizeName(nome) : '';
          }).filter(Boolean));
          toast.success(`Verificação de duplicados ativa`, {
            description: `${existingNames.size} conteúdos existentes carregados para comparação.`,
            icon: <Database className="w-4 h-4" />,
          });
          console.log(`✅ Duplicados: ${existingNames.size} nomes existentes carregados`);
        } catch (error) {
          console.error('Erro ao buscar conteúdos existentes:', error);
          toast.warning('Falha ao carregar conteúdos existentes', {
            description: 'A verificação de duplicados foi desativada para esta sessão. Os itens serão importados sem verificação.',
            duration: 8000,
          });
          duplicateCheckActive = false;
        }
      }

      // ✅ Inicializar índices de retomada
      resumeIdxRef.current = { series: 0, filmes: 0, canais: 0 };

      // ✅ Helper para salvar progresso no localStorage (throttled: a cada 5 itens)
      let saveCounter = 0;
      const saveResumeState = (seriesIdx: number, filmesIdx: number, canaisIdx: number, currentStats: ImportStats) => {
        saveCounter++;
        if (saveCounter % 5 !== 0) return;
        try {
          localStorage.setItem(RESUME_KEY, JSON.stringify({
            parsedItems,
            ignoreDuplicates,
            enrichWithTMDB,
            namingMode,
            importMode,
            importFilters,
            seriesStartIdx: seriesIdx,
            filmesStartIdx: filmesIdx,
            canaisStartIdx: canaisIdx,
            savedAt: new Date().toISOString(),
            stats: currentStats,
          }));
        } catch { /* localStorage pode estar cheio */ }
      };

      let processedCount = 0;
      const updateProgressCount = (count: number, type: ImportProgress['currentType'], item: string) => {
        processedCount += count;
        setProgress({
          current: processedCount,
          total: totalItems,
          percentage: Math.round((processedCount / totalItems) * 100),
          currentType: type,
          currentItem: item
        });
      };

      // 1. Importar Séries e Episódios
      if (importFilters.series) {
        for (let sIdx = resumeIdxRef.current.series; sIdx < grouped.series.length; sIdx++) {
          const series = grouped.series[sIdx];
          if (abortRef.current) break;
          await checkPause();
          resumeIdxRef.current.series = sIdx;
          saveResumeState(sIdx, resumeIdxRef.current.filmes, resumeIdxRef.current.canais, stats);

          let currentSeriesId: number | null = null;

          try {
            updateProgressCount(1, 'Séries', series.name);
            
            // Verificar duplicado (usa normalização)
            if (duplicateCheckActive && existingNames.has(normalizeName(series.name))) {
              duplicateCount++;
              // Contar episódios como processados também
              updateProgressCount(series.episodes.length, 'Episódios', `${series.name} (duplicado)`);
              continue;
            }
            
            // Buscar metadados do TMDB se habilitado (usa cache)
            let tmdbData = null;
            if (enrichWithTMDB) {
              tmdbData = await fetchTMDBCached(series.name, 'Serie');
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
              Imdb: tmdbData?.rating || '',
              'Capa de fundo': tmdbData?.backdrop || '',
              'Data de Lançamento': tmdbData?.release_date || ''
            };
            
            // Séries são criadas individualmente (precisamos do ID para vincular episódios)
            const createdSeries = await baserowService.createRow(config.tableIds.conteudos, seriesData);
            currentSeriesId = createdSeries.id;
            successCount++;
            // ✅ Atualizar existingNames com o nome salvo (pode ser do TMDB)
            existingNames.add(normalizeName(seriesData.Nome));
            // Também adicionar o nome original do M3U
            existingNames.add(normalizeName(series.name));
          } catch (error) {
            console.error('Erro ao importar série:', error);
            errorCount++;
          }

          // 🚀 Importar episódios em LOTE se a série foi criada com sucesso
          if (currentSeriesId) {
            const EPISODE_BATCH_SIZE = 100;
            const episodeBatches: any[][] = [];
            let currentBatch: any[] = [];

            for (const episode of series.episodes) {
              currentBatch.push({
                Nome: episode.seriesName || series.name,
                Temporada: episode.season || 1,
                'Episódio': episode.episode || 1,
                Link: episode.url,
                Conteudo: [currentSeriesId]
              });

              if (currentBatch.length >= EPISODE_BATCH_SIZE) {
                episodeBatches.push(currentBatch);
                currentBatch = [];
              }
            }
            if (currentBatch.length > 0) episodeBatches.push(currentBatch);

            for (const batch of episodeBatches) {
              if (abortRef.current) break;
              await checkPause();

              try {
                updateProgressCount(batch.length, 'Episódios', `${series.name} (${batch.length} eps em lote)`);
                await baserowService.createRowsBatch(config.tableIds.episodios, batch);
                successCount += batch.length;
              } catch (error) {
                console.error(`Erro ao importar lote de episódios de ${series.name}:`, error);
                // Fallback: tentar um por um
                for (const epData of batch) {
                  try {
                    await baserowService.createRow(config.tableIds.episodios, epData);
                    successCount++;
                  } catch (epError) {
                    console.error('Erro ao importar episódio individual:', epError);
                    errorCount++;
                  }
                }
              }
            }
          } else {
            // Série falhou, contar episódios como processados
            updateProgressCount(series.episodes.length, 'Episódios', `${series.name} (série falhou)`);
          }
        }
      }
      
      // 3. 🚀 Importar Filmes em LOTE
      if (importFilters.movies) {
        // Filtrar duplicados primeiro
        const filmesToImport = grouped.filmes.slice(resumeIdxRef.current.filmes).filter(filme => {
          if (duplicateCheckActive && existingNames.has(normalizeName(filme.name))) {
            duplicateCount++;
            return false;
          }
          return true;
        });

        // Contar filmes duplicados como processados
        const filmesSkipped = grouped.filmes.length - resumeIdxRef.current.filmes - filmesToImport.length;
        if (filmesSkipped > 0) {
          updateProgressCount(filmesSkipped, 'Filmes', 'Duplicados ignorados');
        }

        // Buscar TMDB em paralelo se habilitado
        let tmdbResults: (any | null)[] = [];
        if (enrichWithTMDB && filmesToImport.length > 0) {
          updateProgressCount(0, 'Filmes', 'Buscando metadados TMDB...');
          tmdbResults = await fetchTMDBParallel(
            filmesToImport.map(f => ({ title: f.name, type: 'Filme' as const }))
          );
        }

        // Preparar dados dos filmes e enviar em lotes
        const FILME_BATCH_SIZE = 100;
        const filmesData: any[] = [];

        for (let i = 0; i < filmesToImport.length; i++) {
          if (abortRef.current) break;
          const filme = filmesToImport[i];
          const tmdbData = tmdbResults[i] || null;

          let category = tmdbData?.genres?.join(', ') || filme.category || '';
          if (category) category += ', ';
          category += 'Filmes';

          filmesData.push({
            Nome: tmdbData?.title || filme.name,
            Capa: tmdbData?.poster || filme.logo || '',
            Categoria: category,
            Sinopse: tmdbData?.overview || '',
            Link: filme.url,
            Tipo: namingMode === 'plural' ? 'Filmes' : 'Filme',
            Idioma: filme.language || 'DUBLADO',
            Views: 0,
            Imdb: tmdbData?.rating || '',
            'Capa de fundo': tmdbData?.backdrop || '',
            'Data de Lançamento': tmdbData?.release_date || ''
          });
        }

        // Enviar em lotes
        for (let i = 0; i < filmesData.length; i += FILME_BATCH_SIZE) {
          if (abortRef.current) break;
          await checkPause();
          const batch = filmesData.slice(i, i + FILME_BATCH_SIZE);

          try {
            updateProgressCount(batch.length, 'Filmes', `Importando lote de ${batch.length} filmes...`);
            await baserowService.createRowsBatch(config.tableIds.conteudos, batch);
            successCount += batch.length;
            // ✅ Atualizar existingNames com nomes dos filmes importados
            for (const filmeData of batch) {
              existingNames.add(normalizeName(filmeData.Nome));
            }
          } catch (error) {
            console.error('Erro ao importar lote de filmes:', error);
            // Fallback: um por um
            for (const filmeData of batch) {
              try {
                await baserowService.createRow(config.tableIds.conteudos, filmeData);
                successCount++;
              } catch (fErr) {
                console.error('Erro ao importar filme individual:', fErr);
                errorCount++;
              }
            }
          }

          resumeIdxRef.current.filmes = resumeIdxRef.current.filmes + i + batch.length;
          saveResumeState(resumeIdxRef.current.series, resumeIdxRef.current.filmes, resumeIdxRef.current.canais, stats);
        }
      }
      
      // 4. 🚀 Importar Canais TV em LOTE
      if (importFilters.tv) {
        const canaisToImport = grouped.canais.slice(resumeIdxRef.current.canais).filter(canal => {
          if (duplicateCheckActive && existingNames.has(normalizeName(canal.name))) {
            duplicateCount++;
            return false;
          }
          return true;
        });

        const canaisSkipped = grouped.canais.length - resumeIdxRef.current.canais - canaisToImport.length;
        if (canaisSkipped > 0) {
          updateProgressCount(canaisSkipped, 'Canais', 'Duplicados ignorados');
        }

        const CANAL_BATCH_SIZE = 100;
        const canaisData: any[] = [];

        for (const canal of canaisToImport) {
          if (abortRef.current) break;
          let category = canal.category || '';
          if (category) category += ', ';
          category += 'TV';

          canaisData.push({
            Nome: canal.name,
            Capa: canal.logo || '',
            Categoria: category,
            Link: canal.url,
            Tipo: 'TV',
            Idioma: 'Ao Vivo',
            Views: 0
          });
        }

        const targetTableId = (namingMode === 'plural' && config.tableIds.canaisTv) 
          ? config.tableIds.canaisTv 
          : config.tableIds.conteudos;

        for (let i = 0; i < canaisData.length; i += CANAL_BATCH_SIZE) {
          if (abortRef.current) break;
          await checkPause();
          const batch = canaisData.slice(i, i + CANAL_BATCH_SIZE);

          try {
            updateProgressCount(batch.length, 'Canais', `Importando lote de ${batch.length} canais...`);
            await baserowService.createRowsBatch(targetTableId, batch);
            successCount += batch.length;
            // ✅ Atualizar existingNames com nomes dos canais importados
            for (const canalData of batch) {
              existingNames.add(normalizeName(canalData.Nome));
            }
          } catch (error) {
            console.error('Erro ao importar lote de canais:', error);
            // Fallback: um por um
            for (const canalData of batch) {
              try {
                await baserowService.createRow(targetTableId, canalData);
                successCount++;
              } catch (cErr) {
                console.error('Erro ao importar canal individual:', cErr);
                errorCount++;
              }
            }
          }

          resumeIdxRef.current.canais = resumeIdxRef.current.canais + i + batch.length;
          saveResumeState(resumeIdxRef.current.series, resumeIdxRef.current.filmes, resumeIdxRef.current.canais, stats);
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
      // ✅ Limpar estado salvo ao finalizar (sucesso, erro ou parada)
      localStorage.removeItem(RESUME_KEY);
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
      {/* ✅ Banner de retomada de importação interrompida */}
      {resumeState && !isImporting && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 shrink-0 mt-0.5">
                <PlayCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Importação interrompida encontrada</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {resumeState.parsedItems.length} itens · Interrompida em{' '}
                  <span className="font-medium">
                    {resumeState.seriesStartIdx + resumeState.filmesStartIdx + resumeState.canaisStartIdx}
                  </span>{' '}
                  processados · {new Date(resumeState.savedAt).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setParsedItems(resumeState.parsedItems);
                  setIgnoreDuplicates(resumeState.ignoreDuplicates);
                  setEnrichWithTMDB(resumeState.enrichWithTMDB);
                  setNamingMode(resumeState.namingMode);
                  setImportMode(resumeState.importMode);
                  setImportFilters(resumeState.importFilters);
                  resumeIdxRef.current = {
                    series: resumeState.seriesStartIdx,
                    filmes: resumeState.filmesStartIdx,
                    canais: resumeState.canaisStartIdx,
                  };
                  setResumeState(null);
                  setTimeout(() => handleImport(), 100);
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Continuar importação
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  localStorage.removeItem(RESUME_KEY);
                  setResumeState(null);
                }}
              >
                Descartar
              </Button>
            </div>
          </div>
        </div>
      )}

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
                  Thiago (Padrão)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="plural" id="mode-plural" />
                <Label htmlFor="mode-plural" className="cursor-pointer">
                  Francisco
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {namingMode === 'plural' 
                ? 'Canais de TV serão enviados para a tabela "Canais TV".' 
                : 'Todo conteúdo será enviado para a tabela "Conteúdos".'}
            </p>
          </div>

          {/* Filtro de Tipo de Conteúdo */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Tipo de Lista para Importar</Label>
            <p className="text-sm text-muted-foreground">
              Escolha quais tipos de conteúdo deseja importar da lista M3U
            </p>
            <div className="flex justify-end gap-2 mb-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setImportFilters({ movies: true, series: true, tv: true })}
              >
                Selecionar Todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setImportFilters({ movies: false, series: false, tv: false })}
              >
                Desmarcar Todos
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setImportFilters(prev => ({ ...prev, movies: !prev.movies }))}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  importFilters.movies
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-muted bg-muted/30 text-muted-foreground hover:border-muted-foreground/30'
                }`}
              >
                <Film className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">Filmes</div>
                  <div className="text-xs opacity-70">Importar filmes da lista</div>
                </div>
                <Checkbox
                  checked={importFilters.movies}
                  className="ml-auto pointer-events-none"
                />
              </button>
              <button
                onClick={() => setImportFilters(prev => ({ ...prev, series: !prev.series }))}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  importFilters.series
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-muted bg-muted/30 text-muted-foreground hover:border-muted-foreground/30'
                }`}
              >
                <Tv className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">Séries</div>
                  <div className="text-xs opacity-70">Séries e episódios</div>
                </div>
                <Checkbox
                  checked={importFilters.series}
                  className="ml-auto pointer-events-none"
                />
              </button>
              <button
                onClick={() => setImportFilters(prev => ({ ...prev, tv: !prev.tv }))}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  importFilters.tv
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-muted bg-muted/30 text-muted-foreground hover:border-muted-foreground/30'
                }`}
              >
                <Radio className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">Canais TV</div>
                  <div className="text-xs opacity-70">Canais ao vivo</div>
                </div>
                <Checkbox
                  checked={importFilters.tv}
                  className="ml-auto pointer-events-none"
                />
              </button>
            </div>
            {!importFilters.movies && !importFilters.series && !importFilters.tv && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Selecione pelo menos um tipo de conteúdo
              </p>
            )}
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="enrich-tmdb" className="text-base font-medium cursor-pointer">
                    Enriquecer com TMDB
                  </Label>
                  {enrichWithTMDB && (
                    tmdbKeyConfigured ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        Pronto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        Sem chave
                      </span>
                    )
                  )}
                </div>
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

          {/* Fonte de Dados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Fonte de Dados</Label>
              {hasSavedDnsConfig && !isFetchingDns && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={handleQuickReload}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Recarregar via DNS salvo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
                    onClick={handleClearDnsConfig}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Esquecer
                  </Button>
                </div>
              )}
            </div>
            <RadioGroup value={sourceType} onValueChange={(v) => { setSourceType(v as any); setDnsContentLoaded(false); setDnsM3UContent(null); }} className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="file" id="source-file" />
                <Label htmlFor="source-file" className="cursor-pointer flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Arquivo M3U
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dns" id="source-dns" />
                <Label htmlFor="source-dns" className="cursor-pointer flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Fonte DNS/IPTV
                </Label>
              </div>
            </RadioGroup>

            {sourceType === 'file' ? (
              <div className="space-y-3">
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
            ) : (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Conecte diretamente ao seu servidor IPTV (Xtream Codes). O sistema buscará a lista M3U automaticamente.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dns-url" className="text-sm">URL do Servidor</Label>
                    <Input
                      id="dns-url"
                      placeholder="http://servidor.com"
                      value={dnsUrl}
                      onChange={(e) => setDnsUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dns-user" className="text-sm">Usuário</Label>
                    <Input
                      id="dns-user"
                      placeholder="seu_usuario"
                      value={dnsUsername}
                      onChange={(e) => setDnsUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dns-pass" className="text-sm">Senha</Label>
                    <div className="relative">
                      <Input
                        id="dns-pass"
                        type={showDnsPassword ? 'text' : 'password'}
                        placeholder="sua_senha"
                        value={dnsPassword}
                        onChange={(e) => setDnsPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDnsPassword(!showDnsPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showDnsPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleFetchDNS}
                      disabled={isFetchingDns || !dnsUrl || !dnsUsername || !dnsPassword}
                      variant="secondary"
                    >
                      {isFetchingDns ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {dnsFetchPhase === 'connecting' ? 'Conectando...' : dnsFetchPhase === 'downloading' ? 'Baixando...' : 'Validando...'}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Buscar Lista
                        </>
                      )}
                    </Button>
                    {dnsContentLoaded && !isFetchingDns && (
                      <div className="flex items-center gap-2 text-sm text-green-500">
                        <CheckCircle className="h-4 w-4" />
                        Lista carregada com sucesso
                      </div>
                    )}
                  </div>

                  {isFetchingDns && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {dnsFetchPhase === 'connecting' && '🔌 Conectando ao servidor...'}
                          {dnsFetchPhase === 'downloading' && '📥 Baixando lista M3U...'}
                          {dnsFetchPhase === 'validating' && '✅ Validando conteúdo...'}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {dnsFetchElapsed}s
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${dnsFetchPhase === 'connecting' || dnsFetchPhase === 'downloading' || dnsFetchPhase === 'validating' ? 'bg-primary' : 'bg-muted'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${dnsFetchPhase === 'downloading' || dnsFetchPhase === 'validating' ? 'bg-primary' : 'bg-muted'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${dnsFetchPhase === 'validating' ? 'bg-primary' : 'bg-muted'}`} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dnsFetchPhase === 'connecting' && 'Estabelecendo conexão com o servidor IPTV...'}
                        {dnsFetchPhase === 'downloading' && 'Isso pode levar alguns minutos para listas grandes.'}
                        {dnsFetchPhase === 'validating' && 'Verificando se o conteúdo é um arquivo M3U válido...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botão de Preview */}
          <Button
            onClick={handlePreviewImport}
            disabled={
              (sourceType === 'file' ? !selectedFile : !dnsContentLoaded) || 
              (!importFilters.movies && !importFilters.series && !importFilters.tv)
            }
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
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle className="text-2xl">Preview da Importação</DialogTitle>
            <DialogDescription>
              {parsedItems.length} itens processados • Modo: {importMode === 'automatic' ? 'Automático' : 'Manual'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 space-y-4">
            {/* Filtros de Importação */}
            <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-muted/30">
              <div className="w-full flex items-center justify-between">
                <Label className="text-sm font-semibold text-muted-foreground">Selecione o que importar:</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setImportFilters({ movies: true, series: true, tv: true })}>Todos</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setImportFilters({ movies: false, series: false, tv: false })}>Nenhum</Button>
                </div>
              </div>
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
                  {enrichWithTMDB && tmdbKeyConfigured && loadingTmdbPreview && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-normal">
                      <Loader2 className="h-3 w-3 animate-spin" /> buscando TMDB...
                    </span>
                  )}
                </h3>
                <ScrollArea className="h-56 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {enrichWithTMDB && tmdbKeyConfigured && <TableHead className="w-12">Capa</TableHead>}
                        <TableHead>Nome</TableHead>
                        <TableHead>Eps</TableHead>
                        {enrichWithTMDB && tmdbKeyConfigured && <TableHead>Nota</TableHead>}
                        {enrichWithTMDB && tmdbKeyConfigured && <TableHead>Sinopse</TableHead>}
                        {!(enrichWithTMDB && tmdbKeyConfigured) && <TableHead>Categoria</TableHead>}
                        <TableHead>Idioma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped.series.slice(0, 20).map((series, index) => {
                        const cacheKey = `Serie::${series.name}`;
                        const tmdb = tmdbPreviewCache[cacheKey];
                        return (
                          <TableRow key={index}>
                            {enrichWithTMDB && tmdbKeyConfigured && (
                              <TableCell className="p-1">
                                {tmdb?.loading ? (
                                  <div className="w-10 h-14 bg-muted rounded animate-pulse" />
                                ) : tmdb?.poster ? (
                                  <img src={tmdb.poster} alt={series.name} className="w-10 h-14 object-cover rounded shadow" />
                                ) : (
                                  <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                    <Tv className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="font-medium text-sm">{series.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{series.episodes.length}</Badge>
                            </TableCell>
                            {enrichWithTMDB && tmdbKeyConfigured && (
                              <TableCell className="text-xs whitespace-nowrap">
                                {tmdb?.rating ? (
                                  <span className="flex items-center gap-1 text-yellow-500 font-medium">
                                    <Star className="h-3 w-3 fill-yellow-500" />{tmdb.rating}
                                  </span>
                                ) : tmdb?.loading ? (
                                  <span className="text-muted-foreground">...</span>
                                ) : '-'}
                              </TableCell>
                            )}
                            {enrichWithTMDB && tmdbKeyConfigured && (
                              <TableCell className="text-xs text-muted-foreground max-w-xs">
                                <span className="line-clamp-2">{tmdb?.overview || (tmdb?.loading ? '...' : '-')}</span>
                              </TableCell>
                            )}
                            {!(enrichWithTMDB && tmdbKeyConfigured) && (
                              <TableCell className="text-xs">{series.category || '-'}</TableCell>
                            )}
                            <TableCell>
                              {series.language && (
                                <Badge variant="outline" className="text-xs">
                                  <Languages className="h-3 w-3 mr-1" />
                                  {series.language}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                  {enrichWithTMDB && tmdbKeyConfigured && loadingTmdbPreview && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-normal">
                      <Loader2 className="h-3 w-3 animate-spin" /> buscando TMDB...
                    </span>
                  )}
                </h3>
                <ScrollArea className="h-48 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {enrichWithTMDB && tmdbKeyConfigured && <TableHead className="w-12">Capa</TableHead>}
                        <TableHead>Nome</TableHead>
                        {enrichWithTMDB && tmdbKeyConfigured && <TableHead>Nota</TableHead>}
                        {enrichWithTMDB && tmdbKeyConfigured && <TableHead>Sinopse</TableHead>}
                        {!(enrichWithTMDB && tmdbKeyConfigured) && <TableHead>Categoria</TableHead>}
                        <TableHead>Idioma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped.filmes.slice(0, 15).map((filme, index) => {
                        const cacheKey = `Filme::${filme.name}`;
                        const tmdb = tmdbPreviewCache[cacheKey];
                        return (
                          <TableRow key={index}>
                            {enrichWithTMDB && tmdbKeyConfigured && (
                              <TableCell className="p-1">
                                {tmdb?.loading ? (
                                  <div className="w-10 h-14 bg-muted rounded animate-pulse" />
                                ) : tmdb?.poster ? (
                                  <img src={tmdb.poster} alt={filme.name} className="w-10 h-14 object-cover rounded shadow" />
                                ) : (
                                  <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                    <Film className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="font-medium text-sm">{filme.name}</TableCell>
                            {enrichWithTMDB && tmdbKeyConfigured && (
                              <TableCell className="text-xs whitespace-nowrap">
                                {tmdb?.rating ? (
                                  <span className="flex items-center gap-1 text-yellow-500 font-medium">
                                    <Star className="h-3 w-3 fill-yellow-500" />{tmdb.rating}
                                  </span>
                                ) : tmdb?.loading ? (
                                  <span className="text-muted-foreground">...</span>
                                ) : '-'}
                              </TableCell>
                            )}
                            {enrichWithTMDB && tmdbKeyConfigured && (
                              <TableCell className="text-xs text-muted-foreground max-w-xs">
                                <span className="line-clamp-2">{tmdb?.overview || (tmdb?.loading ? '...' : '-')}</span>
                              </TableCell>
                            )}
                            {!(enrichWithTMDB && tmdbKeyConfigured) && (
                              <TableCell className="text-xs">{filme.category || '-'}</TableCell>
                            )}
                            <TableCell>
                              {filme.language && (
                                <Badge variant="outline" className="text-xs">
                                  <Languages className="h-3 w-3 mr-1" />
                                  {filme.language}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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

          {/* Footer fixo */}
          <div className="shrink-0 px-6 pb-6 pt-4 border-t bg-background">
            {/* Barra de Progresso */}
            {isImporting && (
              <div className="space-y-2 mb-4 p-3 border rounded-lg bg-muted/30">
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

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isImporting}>
                Cancelar
              </Button>

              {isImporting && (
                <Button variant="outline" onClick={handleTogglePause}>
                  {isPaused ? (
                    <>
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Retomar
                    </>
                  ) : (
                    <>
                      <PauseCircle className="h-4 w-4 mr-1" />
                      Pausar
                    </>
                  )}
                </Button>
              )}

              {isImporting && (
                <Button variant="destructive" onClick={handleStopImport}>
                  <StopCircle className="h-4 w-4 mr-1" />
                  Parar
                </Button>
              )}

              <Button onClick={handleImport} disabled={isImporting} size="lg">
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Confirmar Importação
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default M3UImporter;