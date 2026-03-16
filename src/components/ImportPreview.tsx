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
  Download
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

interface ImportPreviewProps {
  importConfig: ImportConfig | null;
  onStartImport: (selectedContents?: ContentPreview[]) => void;
  configValid: boolean;
  isImporting?: boolean;
  importProgress?: number;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  importConfig,
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
  const [sortBy, setSortBy] = useState<'nome' | 'ano' | 'rating'>('nome');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const pageSize = 12;

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

  // Local filtering and sorting
  const filteredPreviews = useMemo(() => {
    let filtered = previews;
    
    // Filter out unwanted categories from content
    filtered = filtered.filter(content => {
      if (!content.Categoria) return true;
      // Check if any of the content's categories are allowed
      // If a content has MULTIPLE categories, we keep it if at least one is allowed?
      // Or we remove it if it matches any excluded keyword?
      // User said "retira todas as categorias...". 
      // Safest is to remove content if its category string contains excluded keywords.
      return isCategoryAllowed(content.Categoria);
    });

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(content => 
        content.Nome?.toLowerCase().includes(term) ||
        content.Categoria?.toLowerCase().includes(term)
      );
    }
    
    // Sort results
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return (a.Nome || '').localeCompare(b.Nome || '');
        case 'ano':
          const anoA = parseInt(a.Ano || '0') || 0;
          const anoB = parseInt(b.Ano || '0') || 0;
          return anoB - anoA; // Most recent first
        case 'rating':
          const ratingA = parseFloat(a.Imdb || '0') || 0;
          const ratingB = parseFloat(b.Imdb || '0') || 0;
          return ratingB - ratingA; // Highest rating first
        default:
          return 0;
      }
    });
  }, [previews, searchTerm, sortBy]);

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
        makeApiRequest<{ count?: number }>(`${baseUrl}&filter__Tipo__equal=Serie`)
      ]);

      setTypeCounts({
        total: totalData.count || 0,
        filmes: filmesData.count || 0,
        series: seriesData.count || 0
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
    const visibleIds = filteredPreviews.map(p => p.id);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      visibleIds.forEach(id => newSet.add(id));
      return newSet;
    });
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

            {/* Category Filter */}
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

            {/* Clear filters button */}
            {(typeFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'nome' || searchTerm) && (
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

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
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
            <div className="flex items-center gap-3 px-6 py-2 bg-muted/20 border-b border-border/50">
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
                {allVisibleSelected ? 'Desmarcar página' : 'Selecionar página'}
              </Button>
              {selectedIds.size > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ScrollArea className="h-[650px] rounded-md border">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
                {filteredPreviews.map((content) => {
                  const isSelected = selectedIds.has(content.id);
                  return (
                    <div
                      key={content.id}
                      onClick={() => toggleSelection(content.id)}
                      className={`group relative bg-card rounded-lg border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer ${
                        isSelected 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border/50 hover:border-primary/30'
                      }`}
                    >
                      {/* Selection Checkbox */}
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
                      
                      {/* Poster */}
                      <div className="aspect-[2/3] relative overflow-hidden bg-muted">
                        {content.Capa ? (
                          <img
                            src={content.Capa}
                            alt={content.Nome || 'Conteúdo'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                        
                        {/* Type Badge */}
                        {content.Tipo && (
                          <Badge
                            variant={getTypeBadgeVariant(content.Tipo)}
                            className="absolute top-2 left-2 text-xs gap-1"
                          >
                            {getTypeIcon(content.Tipo)}
                            {content.Tipo}
                          </Badge>
                        )}

                        {/* Rating Badge - moved to avoid overlap with checkbox */}
                        {content.IMDb && (
                          <Badge
                            variant="warning"
                            className="absolute bottom-16 right-2 text-xs gap-1"
                          >
                            <Star className="h-3 w-3 fill-current" />
                            {content.IMDb}
                          </Badge>
                        )}

                        {/* Gradient Overlay */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                      </div>

                      {/* Content Info */}
                      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                        <h4 className="font-medium text-sm line-clamp-2 leading-tight mb-1">
                          {content.Nome || 'Sem título'}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-white/70">
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
