import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Film,
  Tv,
  RefreshCw,
  Eye,
  Calendar,
  Star,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Package,
  Search,
  X,
  Tags,
  ArrowUpDown,
  CheckSquare,
  Square,
  Loader2,
  Download,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ImportConfig, UserConfig } from '@/services/AutoImportService';
import { makeProxyRequest } from '@/utils/proxyRequest';

export interface ContentPreview {
  id: number;
  Nome?: string;
  Tipo?: string;
  Capa?: string;
  Categoria?: string;
  IMDb?: string;
  Ano?: string;
  Link?: string;
  Sinopse?: string;
  Idioma?: string;
  Views?: string;
  Temporadas?: string;
  Imdb?: string;
  'Data de Lançamento'?: string;
  'Capa de fundo'?: string;
}

interface ExistingContentSnapshot {
  titles: Set<string>;
  titleYears: Set<string>;
  imdbs: Set<string>;
  links: Set<string>;
  total: number;
}

interface PreviewHighlightStatus {
  isAlreadyImported: boolean;
  isDuplicateInPreview: boolean;
  matchReasons: string[];
}

interface ImportPreviewProps {
  importConfig: ImportConfig | null;
  userConfig?: UserConfig | null;
  onStartImport: (selectedContents?: ContentPreview[]) => void;
  configValid: boolean;
  isImporting?: boolean;
  importProgress?: number;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  importConfig,
  userConfig,
  onStartImport,
  configValid,
  isImporting = false,
  importProgress = 0
}) => {
  const [previews, setPreviews] = useState<ContentPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [cachedTotalPages, setCachedTotalPages] = useState<number>(0);
  const [typeCounts, setTypeCounts] = useState({ total: 0, filmes: 0, series: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'filme' | 'serie'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [highlightFilter, setHighlightFilter] = useState<'all' | 'imported' | 'duplicates'>('all');
  const [sortBy, setSortBy] = useState<'nome' | 'ano' | 'rating'>('nome');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [existingContentSnapshot, setExistingContentSnapshot] = useState<ExistingContentSnapshot>({
    titles: new Set(),
    titleYears: new Set(),
    imdbs: new Set(),
    links: new Set(),
    total: 0,
  });
  const [loadingExistingContent, setLoadingExistingContent] = useState(false);
  const pageSize = 30;

  // Keywords to exclude (TV channels, specific channel packages, etc.)
  const EXCLUDED_KEYWORDS = useMemo(() => [
    'tv', 'canais', 'canal', 'hbo', 'telecine', 'premiere', 'combate', 
    'sportv', 'espn', 'globo', 'sbt', 'record', 'band', 'redetv', 
    'aovivo', 'ao vivo', '24h', '24 horas', 'bbb', 'fazenda', 
    'pay-per-view', 'ppv', 'adulto', 'xxx', '+18', 'sexo', 'erotico'
  ], []);

  const isCategoryAllowed = (category: string) => {
    if (!category) return false;
    const lowerCat = category.toLowerCase();
    return !EXCLUDED_KEYWORDS.some(keyword => lowerCat.includes(keyword));
  };

  const normalizeText = (value?: string | null) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const normalizeImdb = (value?: string | null) =>
    (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '')
      .trim();

  const normalizeLink = (value?: string | null) =>
    (value || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

  const previewHighlightMap = useMemo(() => {
    const titleCounts = new Map<string, number>();
    const titleYearCounts = new Map<string, number>();

    previews.forEach((content) => {
      const normalizedTitle = normalizeText(content.Nome);
      const normalizedYear = normalizeText(content.Ano);
      const titleYearKey = normalizedTitle && normalizedYear ? `${normalizedTitle}|${normalizedYear}` : '';

      if (normalizedTitle) {
        titleCounts.set(normalizedTitle, (titleCounts.get(normalizedTitle) || 0) + 1);
      }

      if (titleYearKey) {
        titleYearCounts.set(titleYearKey, (titleYearCounts.get(titleYearKey) || 0) + 1);
      }
    });

    return new Map<number, PreviewHighlightStatus>(
      previews.map((content) => {
        const normalizedTitle = normalizeText(content.Nome);
        const normalizedYear = normalizeText(content.Ano);
        const normalizedImdb = normalizeImdb(content.Imdb || content.IMDb);
        const normalizedLink = normalizeLink(content.Link);
        const titleYearKey = normalizedTitle && normalizedYear ? `${normalizedTitle}|${normalizedYear}` : '';
        const matchReasons: string[] = [];

        const isDuplicateInPreview = Boolean(
          (normalizedTitle && (titleCounts.get(normalizedTitle) || 0) > 1) ||
          (titleYearKey && (titleYearCounts.get(titleYearKey) || 0) > 1)
        );

        if (normalizedImdb && existingContentSnapshot.imdbs.has(normalizedImdb)) {
          matchReasons.push('IMDb já existe');
        }
        if (normalizedLink && existingContentSnapshot.links.has(normalizedLink)) {
          matchReasons.push('Link já existe');
        }
        if (titleYearKey && existingContentSnapshot.titleYears.has(titleYearKey)) {
          matchReasons.push('Título e ano já importados');
        } else if (normalizedTitle && existingContentSnapshot.titles.has(normalizedTitle)) {
          matchReasons.push('Título já importado');
        }
        if (isDuplicateInPreview) {
          matchReasons.push('Duplicado no preview');
        }

        return [
          content.id,
          {
            isAlreadyImported: matchReasons.some(reason => reason !== 'Duplicado no preview'),
            isDuplicateInPreview,
            matchReasons,
          },
        ];
      })
    );
  }, [previews, existingContentSnapshot]);

  const baseFilteredPreviews = useMemo(() => {
    let filtered = previews;

    filtered = filtered.filter(content => {
      if (!content.Categoria) return true;
      return isCategoryAllowed(content.Categoria);
    });

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(content => 
        content.Nome?.toLowerCase().includes(term) ||
        content.Categoria?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [previews, searchTerm, isCategoryAllowed]);

  const highlightFilterCounts = useMemo(() => {
    let imported = 0;
    let duplicates = 0;

    baseFilteredPreviews.forEach((content) => {
      const highlight = previewHighlightMap.get(content.id);

      if (highlight?.isAlreadyImported) {
        imported += 1;
      }

      if (highlight?.isDuplicateInPreview) {
        duplicates += 1;
      }
    });

    return {
      all: baseFilteredPreviews.length,
      imported,
      duplicates,
    };
  }, [baseFilteredPreviews, previewHighlightMap]);

  // Local filtering and sorting
  const filteredPreviews = useMemo(() => {
    let filtered = baseFilteredPreviews;

    if (highlightFilter !== 'all') {
      filtered = filtered.filter((content) => {
        const highlight = previewHighlightMap.get(content.id);

        if (highlightFilter === 'imported') {
          return Boolean(highlight?.isAlreadyImported);
        }

        if (highlightFilter === 'duplicates') {
          return Boolean(highlight?.isDuplicateInPreview);
        }

        return true;
      });
    }
    
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return (a.Nome || '').localeCompare(b.Nome || '');
        case 'ano':
          const anoA = parseInt(a.Ano || '0') || 0;
          const anoB = parseInt(b.Ano || '0') || 0;
          return anoB - anoA;
        case 'rating':
          const ratingA = parseFloat(a.Imdb || a.IMDb || '0') || 0;
          const ratingB = parseFloat(b.Imdb || b.IMDb || '0') || 0;
          return ratingB - ratingA;
        default:
          return 0;
      }
    });
  }, [baseFilteredPreviews, sortBy, highlightFilter, previewHighlightMap]);

  const makeApiRequest = async <T = any>(url: string): Promise<T> => {
    if (!importConfig) {
      throw new Error('Configuração de origem não disponível');
    }

    const result = await makeProxyRequest({
      url,
      method: 'GET',
      token: importConfig.sourceToken,
      body: null,
    });

    if (!result.ok) {
      throw new Error(result.error || `Erro ${result.status} ao acessar proxy central`);
    }

    return result.data as T;
  };

  const fetchTypeCounts = async () => {
    if (!importConfig) return;
    const baseUrl = `${importConfig.sourceBaseUrl}/api/database/rows/table/${importConfig.contentTableId}/?user_field_names=true&size=1`;
    
    try {
      const totalData = await makeApiRequest<{ count?: number }>(baseUrl);
      await new Promise(r => setTimeout(r, 300));
      const filmesData = await makeApiRequest<{ count?: number }>(`${baseUrl}&filter__Tipo__equal=Filme`);
      await new Promise(r => setTimeout(r, 300));
      const seriesData = await makeApiRequest<{ count?: number }>(`${baseUrl}&filter__Tipo__equal=Serie`);

      setTypeCounts({
        total: totalData.count || 0,
        filmes: filmesData.count || 0,
        series: seriesData.count || 0
      });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('403')) {
        setError('Token pode estar expirado ou Baserow está temporariamente indisponível. Tente novamente.');
      }
    }
  };

  const fetchCategories = async () => {
    if (!importConfig || !importConfig.sourceToken || !importConfig.sourceBaseUrl || !importConfig.contentTableId) {
      return;
    }

    setLoadingCategories(true);
    try {
      const url = `${importConfig.sourceBaseUrl}/api/database/rows/table/${importConfig.contentTableId}/?user_field_names=true&size=200`;
      const data = await makeApiRequest<{ results?: ContentPreview[] }>(url);
      const categories = new Set<string>();

      (data.results || []).forEach((item: ContentPreview) => {
        if (item.Categoria) {
          item.Categoria.split(',').forEach(cat => {
            const trimmed = cat.trim();
            if (trimmed && isCategoryAllowed(trimmed)) {
              categories.add(trimmed);
            }
          });
        }
      });

      setAvailableCategories(Array.from(categories).sort());
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchPreview = async (filterType?: 'all' | 'filme' | 'serie', category?: string, page: number = 1, options?: { forceApiPage?: number; skipInversion?: boolean }) => {
    if (!importConfig || !importConfig.sourceToken || !importConfig.sourceBaseUrl || !importConfig.contentTableId) {
      return;
    }

    const { forceApiPage, skipInversion = false } = options || {};

    setLoading(true);
    setError(null);

    try {
      // Build URL with optional filters
      let filterQuery = '';
      if (filterType === 'filme') {
        filterQuery += '&filter__Tipo__equal=Filme';
      } else if (filterType === 'serie') {
        filterQuery += '&filter__Tipo__equal=Serie';
      }
      
      if (category && category !== 'all') {
        filterQuery += `&filter__Categoria__contains=${encodeURIComponent(category)}`;
      }
      
      // Calculate the inverted API page
      // If we have cachedTotalPages and not skipping inversion, use inverted pagination
      // Page 1 in UI = Last page in API, Page 2 in UI = Second-to-last in API, etc.
      let apiPage = forceApiPage || page;
      if (cachedTotalPages > 0 && !forceApiPage && !skipInversion) {
        apiPage = cachedTotalPages - page + 1;
        if (apiPage < 1) apiPage = 1;
      }
      
      const originalUrl = `${importConfig.sourceBaseUrl}/api/database/rows/table/${importConfig.contentTableId}/?user_field_names=true&size=${pageSize}&page=${apiPage}${filterQuery}`;
      const data = await makeApiRequest<{ count?: number; results?: ContentPreview[] }>(originalUrl);
      const count = data.count || 0;
      const newTotalPages = Math.ceil(count / pageSize);

      setTotalCount(count);

      if (skipInversion && newTotalPages > 0) {
        setCachedTotalPages(newTotalPages);
        setInitialLoadDone(true);

        if (newTotalPages > 1 && page === 1) {
          fetchPreview(filterType, category, 1, { forceApiPage: newTotalPages });
          return;
        }
      }

      setCachedTotalPages(newTotalPages);

      const reversedResults = [...(data.results || [])].reverse();
      setPreviews(reversedResults);

    } catch (err) {
      console.error('Erro ao buscar preview:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      const isUpstreamDown = message.includes('HTML') || message.includes('502') || message.includes('500');
      if (isUpstreamDown) {
        setError('O servidor Baserow está temporariamente indisponível ou sobrecarregado. Aguarde alguns segundos e tente novamente.');
      } else {
        setError(`Falha ao carregar preview: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (configValid && importConfig) {
      setCachedTotalPages(0);
      setInitialLoadDone(false);
      fetchPreview(typeFilter, categoryFilter, 1, { skipInversion: true });
      fetchTypeCounts();
      fetchCategories();
    }
  }, [configValid, importConfig?.sourceToken, importConfig?.sourceBaseUrl, importConfig?.contentTableId]);

  useEffect(() => {
    const fetchExistingContentSnapshot = async () => {
      if (!configValid || !userConfig?.apiToken || !userConfig?.baseUrl || !userConfig?.contentTableId) {
        setExistingContentSnapshot({ titles: new Set(), titleYears: new Set(), imdbs: new Set(), links: new Set(), total: 0 });
        return;
      }

      setLoadingExistingContent(true);
      try {
        // Paginate to fetch ALL existing content (not just first 200)
        const PAGE_SIZE = 200;
        const allResults: ContentPreview[] = [];
        let page = 1;
        let totalReported = 0;
        const MAX_PAGES = 50; // safety cap (up to 10k items)

        // First request to learn the total count
        while (page <= MAX_PAGES) {
          const url = `${userConfig.baseUrl}/api/database/rows/table/${userConfig.contentTableId}/?user_field_names=true&size=${PAGE_SIZE}&page=${page}`;
          const data = await makeProxyRequest({
            url,
            method: 'GET',
            token: userConfig.apiToken,
            body: null,
          });

          if (!data.ok) {
            throw new Error(data.error || 'Erro ao buscar conteúdos já importados');
          }

          const pageResults = Array.isArray(data.data?.results) ? data.data.results : [];
          totalReported = data.data?.count ?? totalReported;
          allResults.push(...pageResults);

          if (pageResults.length < PAGE_SIZE) break;
          if (totalReported && allResults.length >= totalReported) break;

          page += 1;
          // small delay to be gentle with rate limits
          await new Promise((r) => setTimeout(r, 120));
        }

        const snapshot: ExistingContentSnapshot = {
          titles: new Set(),
          titleYears: new Set(),
          imdbs: new Set(),
          links: new Set(),
          total: totalReported || allResults.length,
        };

        allResults.forEach((item: ContentPreview) => {
          const normalizedTitle = normalizeText(item.Nome);
          const normalizedYear = normalizeText(item.Ano);
          const normalizedImdb = normalizeImdb(item.Imdb || item.IMDb);
          const normalizedLink = normalizeLink(item.Link);

          if (normalizedTitle) snapshot.titles.add(normalizedTitle);
          if (normalizedTitle && normalizedYear) snapshot.titleYears.add(`${normalizedTitle}|${normalizedYear}`);
          if (normalizedImdb) snapshot.imdbs.add(normalizedImdb);
          if (normalizedLink) snapshot.links.add(normalizedLink);
        });

        setExistingContentSnapshot(snapshot);
      } catch (err) {
        console.error('Erro ao buscar conteúdos existentes do destino:', err);
        setExistingContentSnapshot({ titles: new Set(), titleYears: new Set(), imdbs: new Set(), links: new Set(), total: 0 });
      } finally {
        setLoadingExistingContent(false);
      }
    };

    fetchExistingContentSnapshot();
  }, [configValid, userConfig?.apiToken, userConfig?.baseUrl, userConfig?.contentTableId]);

  // Fetch when filters change (reset to page 1)
  useEffect(() => {
    if (configValid && importConfig) {
      setCurrentPage(1);
      setCachedTotalPages(0);
      setInitialLoadDone(false);
      fetchPreview(typeFilter, categoryFilter, 1, { skipInversion: true });
    }
  }, [typeFilter, categoryFilter]);

  // Fetch when page changes
  useEffect(() => {
    if (configValid && currentPage > 0 && initialLoadDone) {
      fetchPreview(typeFilter, categoryFilter, currentPage);
    }
  }, [currentPage]);

  const handleRefresh = () => {
    setCurrentPage(1);
    setCachedTotalPages(0);
    setInitialLoadDone(false);
    fetchPreview(typeFilter, categoryFilter, 1, { skipInversion: true });
    fetchCategories();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setHighlightFilter('all');
    setSortBy('nome');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    // Skip items already imported in the user's database
    const visibleIds = filteredPreviews
      .filter(p => !previewHighlightMap.get(p.id)?.isAlreadyImported)
      .map(p => p.id);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      visibleIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  const selectOnlyNew = () => {
    const newIds = filteredPreviews
      .filter(p => !previewHighlightMap.get(p.id)?.isAlreadyImported && !previewHighlightMap.get(p.id)?.isDuplicateInPreview)
      .map(p => p.id);
    setSelectedIds(new Set(newIds));
  };

  const deselectAllVisible = () => {
    const visibleIds = new Set(filteredPreviews.map(p => p.id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      visibleIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  };

  const clearAllSelections = () => {
    setSelectedIds(new Set());
  };

  const allVisibleSelected = filteredPreviews.length > 0 && 
    filteredPreviews.every(p => selectedIds.has(p.id));

  const someVisibleSelected = filteredPreviews.some(p => selectedIds.has(p.id));

  const handleImport = () => {
    if (selectedIds.size > 0) {
      // Get the full content data for selected items
      const selectedContents = previews.filter(p => selectedIds.has(p.id));
      onStartImport(selectedContents);
    } else {
      onStartImport();
    }
  };

  if (!configValid || !importConfig) {
    return null;
  }

  const getTypeIcon = (tipo?: string) => {
    const t = tipo?.toLowerCase();
    if (t === 'filme') return <Film className="h-3.5 w-3.5" />;
    if (t === 'série' || t === 'serie') return <Tv className="h-3.5 w-3.5" />;
    return <Package className="h-3.5 w-3.5" />;
  };

  const getTypeBadgeVariant = (tipo?: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple" => {
    const t = tipo?.toLowerCase();
    if (t === 'filme') return 'info';
    if (t === 'série' || t === 'serie') return 'purple';
    return 'secondary';
  };

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/5 overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Preview dos Conteúdos</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalCount > 0 ? `${totalCount.toLocaleString()} conteúdos disponíveis` : 'Carregando...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              onClick={handleImport}
              size="sm"
              className="gap-2"
              disabled={isImporting || loading}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  {selectedIds.size > 0 ? `Importar ${selectedIds.size}` : 'Importar Todos'}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Search Bar */}
        {previews.length > 0 && (
          <div className="px-6 py-3 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 bg-muted/30"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Filters Bar */}
        {(typeCounts.total > 0 || totalCount > 0) && (
          <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-muted/30 border-b border-border/50">
            {/* Type Filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('all')}
                className="h-7 text-xs gap-1.5"
              >
                <Package className="h-3.5 w-3.5" />
                Todos ({typeCounts.total.toLocaleString()})
              </Button>
              <Button
                variant={typeFilter === 'filme' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('filme')}
                className="h-7 text-xs gap-1.5"
              >
                <Film className="h-3.5 w-3.5" />
                Filmes ({typeCounts.filmes.toLocaleString()})
              </Button>
              <Button
                variant={typeFilter === 'serie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('serie')}
                className="h-7 text-xs gap-1.5"
              >
                <Tv className="h-3.5 w-3.5" />
                Séries ({typeCounts.series.toLocaleString()})
              </Button>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'nome' | 'ano' | 'rating')}>
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome (A-Z)</SelectItem>
                  <SelectItem value="ano">Ano (Recentes)</SelectItem>
                  <SelectItem value="rating">Rating (Melhor)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Highlight Filter */}
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <Select value={highlightFilter} onValueChange={(v) => setHighlightFilter(v as 'all' | 'imported' | 'duplicates')}>
                <SelectTrigger className="h-7 w-[220px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status ({highlightFilterCounts.all})</SelectItem>
                  <SelectItem value="imported">Só já importados ({highlightFilterCounts.imported})</SelectItem>
                  <SelectItem value="duplicates">Só duplicados ({highlightFilterCounts.duplicates})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear filters button */}
            {(typeFilter !== 'all' || categoryFilter !== 'all' || highlightFilter !== 'all' || sortBy !== 'nome' || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {/* Categories Carousel */}
        {availableCategories.length > 0 && (
          <div className="px-6 py-3 border-b border-border/50 bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Tags className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Categorias</span>
              <span className="text-xs text-muted-foreground">({availableCategories.length})</span>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex w-max items-center gap-2 pb-2">
                <Button
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                  className="h-8 text-xs rounded-full shrink-0"
                >
                  Todas
                </Button>
                {availableCategories.map((category) => (
                  <Button
                    key={category}
                    variant={categoryFilter === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(category)}
                    className="h-8 text-xs rounded-full shrink-0"
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-5 p-6">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="p-3 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Tentar novamente
            </Button>
          </div>
        ) : previews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="p-3 rounded-full bg-muted mb-4">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum conteúdo encontrado na fonte</p>
          </div>
        ) : filteredPreviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="p-3 rounded-full bg-muted mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum resultado para "{searchTerm}"</p>
            <Button variant="link" size="sm" onClick={() => setSearchTerm('')} className="mt-2">
              Limpar busca
            </Button>
          </div>
        ) : (
          <>
            {/* Selection Controls */}
            <div className="space-y-3 border-b border-border/50 px-6 py-3 bg-muted/20">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {loadingExistingContent ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Verificando conteúdos já importados...
                  </span>
                ) : (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {existingContentSnapshot.total} no destino analisados
                    </Badge>
                    <Badge variant="warning" className="text-xs">
                      {filteredPreviews.filter(content => previewHighlightMap.get(content.id)?.isAlreadyImported).length} já importado{filteredPreviews.filter(content => previewHighlightMap.get(content.id)?.isAlreadyImported).length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="destructive" className="text-xs">
                      {filteredPreviews.filter(content => previewHighlightMap.get(content.id)?.isDuplicateInPreview).length} duplicado{filteredPreviews.filter(content => previewHighlightMap.get(content.id)?.isDuplicateInPreview).length !== 1 ? 's' : ''} no preview
                    </Badge>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={allVisibleSelected ? deselectAllVisible : selectAllVisible}
                  className="h-7 text-xs gap-1.5"
                >
                  {allVisibleSelected ? (
                    <CheckSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  {allVisibleSelected ? 'Desmarcar página' : 'Selecionar página (só novos)'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectOnlyNew}
                  className="h-7 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Selecionar só novos
                </Button>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-260px)] min-h-[780px] rounded-md border">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-5 p-6">
                {filteredPreviews.map((content) => {
                  const isSelected = selectedIds.has(content.id);
                  const highlight = previewHighlightMap.get(content.id);
                  const isAlreadyImported = highlight?.isAlreadyImported;
                  const isDuplicateInPreview = highlight?.isDuplicateInPreview;
                  return (
                    <div
                      key={content.id}
                      onClick={() => toggleSelection(content.id)}
                      className={`group relative bg-card rounded-lg border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer ${
                        isAlreadyImported
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : isDuplicateInPreview
                            ? 'border-destructive/40 bg-destructive/5'
                            : isSelected 
                              ? 'border-primary ring-2 ring-primary/20' 
                              : 'border-border/50 hover:border-primary/30'
                      }`}
                    >
                      <div 
                        className={`absolute top-2 right-2 z-10 p-1 rounded-md transition-all ${
                          isSelected ? 'bg-primary' : 'bg-black/50 opacity-0 group-hover:opacity-100'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(content.id)}
                          className="border-white data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                      
                      <div className="aspect-[2/3] relative overflow-hidden bg-muted">
                        {content.Capa ? (
                          <img
                            src={content.Capa}
                            alt={content.Nome || 'Conteúdo'}
                            className={`w-full h-full object-cover transition-transform duration-500 ${isAlreadyImported ? 'opacity-70' : 'group-hover:scale-105'}`}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getTypeIcon(content.Tipo)}
                          </div>
                        )}
                        
                        {content.Tipo && (
                          <Badge
                            variant={getTypeBadgeVariant(content.Tipo)}
                            className="absolute top-2 left-2 text-xs gap-1"
                          >
                            {getTypeIcon(content.Tipo)}
                            {content.Tipo}
                          </Badge>
                        )}

                        <div className="absolute left-2 right-2 top-10 z-10 flex flex-wrap gap-1">
                          {isAlreadyImported && (
                            <Badge variant="warning" className="text-[10px]">
                              Já importado
                            </Badge>
                          )}
                          {isDuplicateInPreview && (
                            <Badge variant="destructive" className="text-[10px]">
                              Duplicado
                            </Badge>
                          )}
                        </div>

                        {content.IMDb && (
                          <Badge
                            variant="warning"
                            className="absolute bottom-16 right-2 text-xs gap-1"
                          >
                            <Star className="h-3 w-3 fill-current" />
                            {content.IMDb}
                          </Badge>
                        )}

                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                        <h4 className="font-medium text-sm line-clamp-2 leading-tight mb-1">
                          {content.Nome || 'Sem título'}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-white/70 mb-1">
                          {content.Ano && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {content.Ano}
                            </span>
                          )}
                          {content.Categoria && (
                            <span className="truncate">{content.Categoria}</span>
                          )}
                        </div>
                        {highlight?.matchReasons?.length ? (
                          <div className="rounded-md bg-black/45 px-2 py-1 text-[10px] text-white/85 line-clamp-2">
                            {highlight.matchReasons.join(' • ')}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Footer with Pagination and CTA */}
        {previews.length > 0 && (
          <div className="flex flex-col gap-3 px-6 py-4 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 border-t border-border/50">
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {/* First page */}
                  {currentPage > 2 && (
                    <>
                      <Button
                        variant={currentPage === 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => goToPage(1)}
                        className="h-8 w-8 p-0 text-xs"
                      >
                        1
                      </Button>
                      {currentPage > 3 && <span className="text-muted-foreground px-1">...</span>}
                    </>
                  )}
                  
                  {/* Previous page */}
                  {currentPage > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      className="h-8 w-8 p-0 text-xs"
                    >
                      {currentPage - 1}
                    </Button>
                  )}
                  
                  {/* Current page */}
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {currentPage}
                  </Button>
                  
                  {/* Next page */}
                  {currentPage < totalPages && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      className="h-8 w-8 p-0 text-xs"
                    >
                      {currentPage + 1}
                    </Button>
                  )}
                  
                  {/* Last page */}
                  {currentPage < totalPages - 1 && (
                    <>
                      {currentPage < totalPages - 2 && <span className="text-muted-foreground px-1">...</span>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(totalPages)}
                        className="h-8 w-8 p-0 text-xs"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <span className="text-xs text-muted-foreground ml-2">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
            )}
            
            {/* Import Progress Bar */}
            {isImporting && (
              <div className="space-y-2 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Importando conteúdos...</span>
                  <span className="font-medium text-primary">{Math.round(importProgress)}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}
            
            {/* Info and CTA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} de {totalCount.toLocaleString()} conteúdos
                  {(searchTerm || typeFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'nome') && ` (filtrado)`}
                </p>
                {selectedIds.size > 0 && (
                  <Badge variant="success" className="text-xs">
                    {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && !isImporting && (
                  <Button variant="outline" size="sm" onClick={clearAllSelections} className="gap-2">
                    <X className="h-4 w-4" />
                    Limpar seleção
                  </Button>
                )}
                <Button onClick={handleImport} className="gap-2" disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      {selectedIds.size > 0 ? `Importar ${selectedIds.size} selecionados` : 'Ver Todos e Importar'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
