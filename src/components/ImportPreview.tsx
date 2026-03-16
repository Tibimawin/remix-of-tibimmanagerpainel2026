import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  Info,
  Link as LinkIcon,
  FileText,
  ImageIcon,
} from 'lucide-react';
import { ImportConfig } from '@/services/AutoImportService';
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

interface ImportPreviewProps {
  importConfig: ImportConfig | null;
  onStartImport: (selectedContents?: ContentPreview[]) => void;
  configValid: boolean;
  isImporting?: boolean;
  importProgress?: number;
}

type NormalizedPreview = ContentPreview & {
  normalizedTitle: string;
  normalizedType: string;
  normalizedRating: string;
  normalizedYear: string;
  normalizedSynopsis: string;
  normalizedBackdrop: string;
  normalizedCategories: string[];
  normalizedSeasons?: number;
  qualityIssues: string[];
  qualityLabel: 'Completo' | 'Revisar' | 'Crítico';
  qualityVariant: 'success' | 'warning' | 'destructive';
  hasPoster: boolean;
  hasLink: boolean;
  hasSynopsis: boolean;
};

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  importConfig,
  onStartImport,
  configValid,
  isImporting = false,
  importProgress = 0,
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
  const [sortBy, setSortBy] = useState<'nome' | 'ano' | 'rating'>('nome');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [detailContent, setDetailContent] = useState<ContentPreview | null>(null);
  const pageSize = 12;

  const EXCLUDED_KEYWORDS = useMemo(
    () => [
      'tv',
      'canais',
      'canal',
      'hbo',
      'telecine',
      'premiere',
      'combate',
      'sportv',
      'espn',
      'globo',
      'sbt',
      'record',
      'band',
      'redetv',
      'aovivo',
      'ao vivo',
      '24h',
      '24 horas',
      'bbb',
      'fazenda',
      'pay-per-view',
      'ppv',
      'adulto',
      'xxx',
      '+18',
      'sexo',
      'erotico',
    ],
    []
  );

  const isCategoryAllowed = (category: string) => {
    if (!category) return false;
    const lowerCat = category.toLowerCase();
    return !EXCLUDED_KEYWORDS.some(keyword => lowerCat.includes(keyword));
  };

  const normalizeContent = (content: ContentPreview): NormalizedPreview => {
    const normalizedCategories = (content.Categoria || '')
      .split(',')
      .map(category => category.trim())
      .filter(category => category && isCategoryAllowed(category));

    const normalizedRating = `${content.IMDb || content.Imdb || ''}`.trim();
    const normalizedReleaseDate = `${content['Data de Lançamento'] || ''}`.trim();
    const normalizedYear = `${content.Ano || normalizedReleaseDate.slice(0, 4) || ''}`.trim();
    const normalizedSynopsis = `${content.Sinopse || ''}`.trim();
    const normalizedBackdrop = `${content['Capa de fundo'] || ''}`.trim();
    const normalizedSeasons = Number(content.Temporadas || 0) || undefined;
    const qualityIssues: string[] = [];

    if (!content.Capa) qualityIssues.push('Sem capa');
    if (!content.Link) qualityIssues.push('Sem link');
    if (!normalizedSynopsis) qualityIssues.push('Sem sinopse');

    const qualityLabel =
      qualityIssues.length === 0 ? 'Completo' : qualityIssues.length === 1 ? 'Revisar' : 'Crítico';

    const qualityVariant =
      qualityLabel === 'Completo' ? 'success' : qualityLabel === 'Revisar' ? 'warning' : 'destructive';

    return {
      ...content,
      normalizedTitle: content.Nome || 'Sem título',
      normalizedType: content.Tipo || 'Conteúdo',
      normalizedRating,
      normalizedYear,
      normalizedSynopsis,
      normalizedBackdrop,
      normalizedCategories,
      normalizedSeasons,
      qualityIssues,
      qualityLabel,
      qualityVariant,
      hasPoster: !!content.Capa,
      hasLink: !!content.Link,
      hasSynopsis: !!normalizedSynopsis,
    };
  };

  const normalizedPreviews = useMemo(
    () => previews.map(normalizeContent),
    [previews, EXCLUDED_KEYWORDS]
  );

  const filteredPreviews = useMemo(() => {
    let filtered = normalizedPreviews.filter(content => {
      if (content.normalizedCategories.length === 0 && content.Categoria) {
        return false;
      }
      return true;
    });

    if (typeFilter !== 'all') {
      filtered = filtered.filter(content => {
        const type = content.normalizedType.toLowerCase();
        return typeFilter === 'filme' ? type === 'filme' : type === 'serie' || type === 'série';
      });
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(content => content.normalizedCategories.includes(categoryFilter));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(content =>
        content.normalizedTitle.toLowerCase().includes(term) ||
        content.normalizedCategories.some(category => category.toLowerCase().includes(term))
      );
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return a.normalizedTitle.localeCompare(b.normalizedTitle);
        case 'ano':
          return (parseInt(b.normalizedYear || '0', 10) || 0) - (parseInt(a.normalizedYear || '0', 10) || 0);
        case 'rating':
          return (parseFloat(b.normalizedRating || '0') || 0) - (parseFloat(a.normalizedRating || '0') || 0);
        default:
          return 0;
      }
    });
  }, [normalizedPreviews, searchTerm, sortBy, typeFilter, categoryFilter]);

  const detailPreview = useMemo(
    () => (detailContent ? normalizeContent(detailContent) : null),
    [detailContent, EXCLUDED_KEYWORDS]
  );

  const visibleCount = filteredPreviews.length;
  const selectedVisibleCount = filteredPreviews.filter(content => selectedIds.has(content.id)).length;
  const selectedTotalCount = selectedIds.size;
  const completeVisibleCount = filteredPreviews.filter(content => content.qualityLabel === 'Completo').length;

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
      const [totalData, filmesData, seriesData] = await Promise.all([
        makeApiRequest<{ count?: number }>(baseUrl),
        makeApiRequest<{ count?: number }>(`${baseUrl}&filter__Tipo__equal=Filme`),
        makeApiRequest<{ count?: number }>(`${baseUrl}&filter__Tipo__equal=Serie`),
      ]);

      setTypeCounts({
        total: totalData.count || 0,
        filmes: filmesData.count || 0,
        series: seriesData.count || 0,
      });
    } catch (err) {
      console.error('Erro ao buscar contagens:', err);
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

  const fetchPreview = async (
    filterType?: 'all' | 'filme' | 'serie',
    category?: string,
    page: number = 1,
    options?: { forceApiPage?: number; skipInversion?: boolean }
  ) => {
    if (!importConfig || !importConfig.sourceToken || !importConfig.sourceBaseUrl || !importConfig.contentTableId) {
      return;
    }

    const { forceApiPage, skipInversion = false } = options || {};

    setLoading(true);
    setError(null);

    try {
      let filterQuery = '';
      if (filterType === 'filme') {
        filterQuery += '&filter__Tipo__equal=Filme';
      } else if (filterType === 'serie') {
        filterQuery += '&filter__Tipo__equal=Serie';
      }

      if (category && category !== 'all') {
        filterQuery += `&filter__Categoria__contains=${encodeURIComponent(category)}`;
      }

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
      setPreviews([...(data.results || [])].reverse());
    } catch (err) {
      console.error('Erro ao buscar preview:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Falha ao carregar preview pelo proxy central: ${message}`);
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
    if (configValid && importConfig) {
      setCurrentPage(1);
      setCachedTotalPages(0);
      setInitialLoadDone(false);
      fetchPreview(typeFilter, categoryFilter, 1, { skipInversion: true });
    }
  }, [typeFilter, categoryFilter]);

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
    const visibleIds = filteredPreviews.map(content => content.id);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      visibleIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  const deselectAllVisible = () => {
    const visibleIds = new Set(filteredPreviews.map(content => content.id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      visibleIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  };

  const clearAllSelections = () => {
    setSelectedIds(new Set());
  };

  const allVisibleSelected = filteredPreviews.length > 0 && filteredPreviews.every(content => selectedIds.has(content.id));

  const handleImport = () => {
    if (selectedIds.size > 0) {
      const selectedContents = previews.filter(content => selectedIds.has(content.id));
      onStartImport(selectedContents);
    } else {
      onStartImport();
    }
  };

  const handleSingleImport = (content: ContentPreview) => {
    onStartImport([content]);
  };

  const getTypeIcon = (tipo?: string) => {
    const normalizedType = tipo?.toLowerCase();
    if (normalizedType === 'filme') return <Film className="h-3.5 w-3.5" />;
    if (normalizedType === 'série' || normalizedType === 'serie') return <Tv className="h-3.5 w-3.5" />;
    return <Package className="h-3.5 w-3.5" />;
  };

  const getTypeBadgeVariant = (
    tipo?: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' => {
    const normalizedType = tipo?.toLowerCase();
    if (normalizedType === 'filme') return 'info';
    if (normalizedType === 'série' || normalizedType === 'serie') return 'purple';
    return 'secondary';
  };

  if (!configValid || !importConfig) {
    return null;
  }

  return (
    <>
      <Card className="overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Preview dos Conteúdos</CardTitle>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {totalCount > 0 ? `${totalCount.toLocaleString()} conteúdos disponíveis` : 'Carregando preview...'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-border/50 bg-background/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Total</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{typeCounts.total.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Visíveis</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{visibleCount.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Selecionados</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{selectedTotalCount.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Completos</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{completeVisibleCount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedTotalCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedTotalCount} selecionado{selectedTotalCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {loadingCategories && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Categorias
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
              <Button onClick={handleImport} size="sm" className="gap-2" disabled={isImporting || loading}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    {selectedTotalCount > 0 ? `Importar ${selectedTotalCount}` : 'Importar Todos'}
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {previews.length > 0 && (
            <div className="border-b border-border/50 px-6 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou categoria..."
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  className="bg-muted/30 pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {(typeCounts.total > 0 || totalCount > 0) && (
            <div className="flex flex-wrap items-center gap-3 border-b border-border/50 bg-muted/30 px-6 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tipo:</span>
                <Button
                  variant={typeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('all')}
                  className="h-7 gap-1.5 text-xs"
                >
                  <Package className="h-3.5 w-3.5" />
                  Todos ({typeCounts.total.toLocaleString()})
                </Button>
                <Button
                  variant={typeFilter === 'filme' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('filme')}
                  className="h-7 gap-1.5 text-xs"
                >
                  <Film className="h-3.5 w-3.5" />
                  Filmes ({typeCounts.filmes.toLocaleString()})
                </Button>
                <Button
                  variant={typeFilter === 'serie' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('serie')}
                  className="h-7 gap-1.5 text-xs"
                >
                  <Tv className="h-3.5 w-3.5" />
                  Séries ({typeCounts.series.toLocaleString()})
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-muted-foreground" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-7 w-[180px] text-xs">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {availableCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={value => setSortBy(value as 'nome' | 'ano' | 'rating')}>
                  <SelectTrigger className="h-7 w-[150px] text-xs">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nome">Nome (A-Z)</SelectItem>
                    <SelectItem value="ano">Ano (Recentes)</SelectItem>
                    <SelectItem value="rating">IMDb (Maior)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(typeFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'nome' || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar filtros
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Tentar novamente
              </Button>
            </div>
          ) : previews.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-3">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum conteúdo encontrado na fonte</p>
            </div>
          ) : filteredPreviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-3">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum resultado para os filtros atuais</p>
              <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                Limpar filtros
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-6 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={allVisibleSelected ? deselectAllVisible : selectAllVisible}
                    className="h-8 gap-1.5 text-xs"
                  >
                    {allVisibleSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                    {allVisibleSelected ? 'Desmarcar visíveis' : 'Selecionar visíveis'}
                  </Button>
                  {selectedTotalCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllSelections} className="h-8 gap-1.5 text-xs">
                      <X className="h-3.5 w-3.5" />
                      Limpar seleção
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {visibleCount} visíveis
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedVisibleCount} visíveis selecionados
                  </Badge>
                  {selectedTotalCount > selectedVisibleCount && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedTotalCount} totais selecionados
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[720px] rounded-md border-0">
                <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredPreviews.map(content => {
                    const isSelected = selectedIds.has(content.id);

                    return (
                      <div
                        key={content.id}
                        onClick={() => toggleSelection(content.id)}
                        className={[
                          'group relative cursor-pointer overflow-hidden rounded-[1.4rem] border bg-card transition-all duration-300',
                          'hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10',
                          isSelected ? 'border-primary shadow-lg shadow-primary/15 ring-2 ring-primary/20' : 'border-border/60',
                        ].join(' ')}
                      >
                        <div className="relative aspect-[16/10] overflow-hidden border-b border-border/50 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/30">
                          {content.hasPoster ? (
                            <img
                              src={content.Capa}
                              alt={content.normalizedTitle}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                              onError={event => {
                                (event.target as HTMLImageElement).src = '/placeholder.svg';
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                              <ImageIcon className="h-10 w-10" />
                              <span className="text-xs">Sem capa</span>
                            </div>
                          )}

                          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                            <Badge variant={getTypeBadgeVariant(content.normalizedType)} className="gap-1 text-[11px]">
                              {getTypeIcon(content.normalizedType)}
                              {content.normalizedType}
                            </Badge>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 rounded-full border border-border/60 bg-background/80"
                                onClick={event => {
                                  event.stopPropagation();
                                  setDetailContent(content);
                                }}
                              >
                                <Info className="h-4 w-4" />
                              </Button>

                              <div
                                className={[
                                  'rounded-full border border-border/60 p-1.5 backdrop-blur-sm transition-all',
                                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-background/80 text-foreground',
                                ].join(' ')}
                                onClick={event => event.stopPropagation()}
                              >
                                <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(content.id)} />
                              </div>
                            </div>
                          </div>

                          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
                            <Badge variant={content.qualityVariant} className="text-[11px]">
                              {content.qualityLabel}
                            </Badge>
                            {content.normalizedRating && (
                              <Badge variant="warning" className="gap-1 text-[11px]">
                                <Star className="h-3 w-3 fill-current" />
                                {content.normalizedRating}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4 p-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="line-clamp-2 text-base font-bold leading-tight text-foreground">
                                {content.normalizedTitle}
                              </h4>
                              {isSelected && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {content.normalizedYear && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {content.normalizedYear}
                                </span>
                              )}
                              {content.Idioma && <Badge variant="outline" className="text-[11px]">{content.Idioma}</Badge>}
                              {content.normalizedSeasons ? (
                                <Badge variant="outline" className="text-[11px]">
                                  {content.normalizedSeasons} temp.
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex min-h-[2.5rem] flex-wrap gap-1.5">
                            {content.normalizedCategories.length > 0 ? (
                              content.normalizedCategories.slice(0, 3).map(category => (
                                <Badge key={category} variant="glass" className="text-[11px]">
                                  {category}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-[11px]">
                                Sem categoria válida
                              </Badge>
                            )}
                            {content.normalizedCategories.length > 3 && (
                              <Badge variant="outline" className="text-[11px]">
                                +{content.normalizedCategories.length - 3}
                              </Badge>
                            )}
                          </div>

                          <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-muted-foreground">
                            {content.normalizedSynopsis || 'Sinopse ainda não disponível para este conteúdo.'}
                          </p>

                          {content.qualityIssues.length > 0 && (
                            <div className="rounded-2xl border border-border/50 bg-muted/40 p-3">
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Pendências de qualidade
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {content.qualityIssues.map(issue => (
                                  <Badge key={issue} variant="outline" className="text-[11px]">
                                    {issue}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          {previews.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 px-6 py-4">
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
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
                        {currentPage > 3 && <span className="px-1 text-muted-foreground">...</span>}
                      </>
                    )}

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

                    <Button variant="default" size="sm" className="h-8 w-8 p-0 text-xs">
                      {currentPage}
                    </Button>

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

                    {currentPage < totalPages - 1 && (
                      <>
                        {currentPage < totalPages - 2 && <span className="px-1 text-muted-foreground">...</span>}
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

                  <span className="ml-2 text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                </div>
              )}

              {isImporting && (
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Importando conteúdos...</span>
                    <span className="font-medium text-primary">{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Mostrando {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} de {totalCount.toLocaleString()} conteúdos
                  </span>
                  {(searchTerm || typeFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'nome') && (
                    <Badge variant="outline" className="text-[11px]">
                      Filtros ativos
                    </Badge>
                  )}
                  {selectedTotalCount > 0 && (
                    <Badge variant="success" className="text-[11px]">
                      {selectedTotalCount} selecionado{selectedTotalCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedTotalCount > 0 && !isImporting && (
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
                        {selectedTotalCount > 0 ? `Importar ${selectedTotalCount} selecionados` : 'Ver Todos e Importar'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!detailContent} onOpenChange={open => !open && setDetailContent(null)}>
        <SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-xl">
          {detailPreview && (
            <div className="flex h-full flex-col">
              <div className="relative aspect-[16/9] border-b border-border/50 bg-gradient-to-br from-primary/15 via-accent/10 to-secondary/20">
                {detailPreview.normalizedBackdrop || detailPreview.Capa ? (
                  <img
                    src={detailPreview.normalizedBackdrop || detailPreview.Capa}
                    alt={detailPreview.normalizedTitle}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={event => {
                      (event.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
              </div>

              <ScrollArea className="h-[calc(100vh-16rem)] px-6 py-6">
                <div className="space-y-6 pb-8">
                  <SheetHeader className="space-y-3 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getTypeBadgeVariant(detailPreview.normalizedType)} className="gap-1 text-xs">
                        {getTypeIcon(detailPreview.normalizedType)}
                        {detailPreview.normalizedType}
                      </Badge>
                      <Badge variant={detailPreview.qualityVariant} className="text-xs">
                        {detailPreview.qualityLabel}
                      </Badge>
                      {detailPreview.normalizedRating && (
                        <Badge variant="warning" className="gap-1 text-xs">
                          <Star className="h-3 w-3 fill-current" />
                          {detailPreview.normalizedRating}
                        </Badge>
                      )}
                    </div>
                    <SheetTitle className="text-2xl font-bold leading-tight">
                      {detailPreview.normalizedTitle}
                    </SheetTitle>
                    <SheetDescription className="text-sm leading-relaxed">
                      Visual detalhado para revisar dados antes da importação.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ano</p>
                      <p className="mt-1 font-semibold text-foreground">{detailPreview.normalizedYear || 'Não informado'}</p>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Idioma</p>
                      <p className="mt-1 font-semibold text-foreground">{detailPreview.Idioma || 'Não informado'}</p>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Temporadas</p>
                      <p className="mt-1 font-semibold text-foreground">{detailPreview.normalizedSeasons || '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Link</p>
                      <p className="mt-1 font-semibold text-foreground">{detailPreview.hasLink ? 'Disponível' : 'Ausente'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Tags className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">Categorias</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detailPreview.normalizedCategories.length > 0 ? (
                        detailPreview.normalizedCategories.map(category => (
                          <Badge key={category} variant="glass" className="text-xs">
                            {category}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Sem categoria válida
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">Sinopse</h4>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                      {detailPreview.normalizedSynopsis || 'Sinopse não disponível para este conteúdo.'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">Checklist de qualidade</h4>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                      {detailPreview.qualityIssues.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {detailPreview.qualityIssues.map(issue => (
                            <Badge key={issue} variant="outline" className="text-xs">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Conteúdo completo para importação
                        </div>
                      )}
                    </div>
                  </div>

                  {detailPreview.Link && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold text-foreground">Link de origem</h4>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground break-all">
                        {detailPreview.Link}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant={selectedIds.has(detailPreview.id) ? 'secondary' : 'default'}
                      className="flex-1 gap-2"
                      onClick={() => toggleSelection(detailPreview.id)}
                    >
                      {selectedIds.has(detailPreview.id) ? (
                        <>
                          <CheckSquare className="h-4 w-4" />
                          Desselecionar
                        </>
                      ) : (
                        <>
                          <Square className="h-4 w-4" />
                          Selecionar conteúdo
                        </>
                      )}
                    </Button>
                    <Button className="flex-1 gap-2" onClick={() => handleSingleImport(detailPreview)}>
                      <Download className="h-4 w-4" />
                      Importar este item
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
