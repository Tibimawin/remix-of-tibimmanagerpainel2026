import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useSeriesUpdateService } from '@/services/SeriesUpdateService';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useConfig } from '@/contexts/ConfigContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { PermissionGate } from '@/components/PermissionGate';
import { 
  Download, 
  Search, 
  Play, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Shield, 
  Lock,
  Tv,
  BarChart3,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const SERIES_PER_PAGE = 15;

const AtualizacaoSeries = () => {
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedSeries, setCollapsedSeries] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  
  const [progress, setProgress] = useState<{ processed: number; total: number; current?: string; startedAt: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastSummary, setLastSummary] = useState<{ created: number; updated: number; ignored: number; total: number; seasonsUpdated?: { nome: string; from: number; to: number; episodes?: number; at?: string }[] } | null>(null);

  const seriesUpdateService = useSeriesUpdateService();
  const { config: cloudConfig } = useUserConfig();
  const { config } = useConfig();
  const { 
    permissions, 
    hasContentLimit, 
    getRemainingContent, 
    canAddMoreContent 
  } = useUserPermissions();

  // Verificar se o usuário tem configuração válida
  const isConfigured = Boolean(cloudConfig?.apiToken && cloudConfig?.baseUrl && cloudConfig?.tableIds?.episodios);

  // Carregar episódios disponíveis
  const loadAvailableEpisodes = useCallback(async () => {
    if (!isConfigured) {
      toast.error('Configure suas credenciais primeiro na página de Configurações ou Importação');
      return;
    }

    setLoading(true);
    try {
      toast('Buscando atualizações de séries...', { description: 'Consultando catálogo de episódios mais recentes' });
      
      const episodesData = await seriesUpdateService.getAvailableEpisodes();
      setEpisodes(episodesData);
      setSelectedEpisodes(new Set());
      setCurrentPage(1);
      
      const uniqueSeriesCount = new Set(episodesData.map(ep => ep.Serie || ep.Titulo).filter(Boolean)).size;
      toast.success(`${episodesData.length} episódios encontrados de ${uniqueSeriesCount} séries`);
      
    } catch (error: any) {
      console.error('Erro ao carregar episódios:', error);
      toast.error(error.message || 'Erro ao carregar episódios disponíveis da central');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, seriesUpdateService]);

  // Carregar automaticamente na montagem se configurado e vazio
  useEffect(() => {
    if (isConfigured && episodes.length === 0 && !loading) {
      loadAvailableEpisodes();
    }
  }, [isConfigured]); // Executa uma vez se configurado

  // 1. Contagem otimizada O(N) de episódios por série em uma única passada
  const seriesCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      const name = ep.Serie || ep.Titulo;
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return counts;
  }, [episodes]);

  // 2. Lista ordenada de séries únicas
  const availableSeries = useMemo(() => {
    return Object.keys(seriesCounts).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [seriesCounts]);

  // 3. Filtragem instantânea sem cascata de re-renders
  const filteredEpisodes = useMemo(() => {
    if (!searchTerm.trim() && (!seriesFilter || seriesFilter === 'all')) {
      return episodes;
    }

    const searchLower = searchTerm.trim().toLowerCase();
    const hasSearch = searchLower.length > 0;
    const hasSeriesFilter = Boolean(seriesFilter && seriesFilter !== 'all');

    return episodes.filter(ep => {
      if (hasSeriesFilter) {
        const epSerie = ep.Serie || ep.Titulo;
        if (epSerie !== seriesFilter) return false;
      }

      if (hasSearch) {
        const titleMatch = (ep.Titulo || '').toLowerCase().includes(searchLower);
        const serieMatch = (ep.Serie || '').toLowerCase().includes(searchLower);
        const sinopseMatch = (ep.Sinopse || '').toLowerCase().includes(searchLower);
        if (!titleMatch && !serieMatch && !sinopseMatch) return false;
      }

      return true;
    });
  }, [episodes, searchTerm, seriesFilter]);

  // 4. Agrupamento estruturado por série
  const groupedEpisodes = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (let i = 0; i < filteredEpisodes.length; i++) {
      const ep = filteredEpisodes[i];
      const seriesName = ep.Serie || ep.Titulo || 'Série Desconhecida';
      if (!groups[seriesName]) {
        groups[seriesName] = [];
      }
      groups[seriesName].push(ep);
    }
    return groups;
  }, [filteredEpisodes]);

  // 5. Paginação das séries para evitar travar o DOM
  const groupedSeriesEntries = useMemo(() => {
    return Object.entries(groupedEpisodes);
  }, [groupedEpisodes]);

  const totalSeriesPages = Math.max(1, Math.ceil(groupedSeriesEntries.length / SERIES_PER_PAGE));

  const paginatedSeriesEntries = useMemo(() => {
    const start = (currentPage - 1) * SERIES_PER_PAGE;
    return groupedSeriesEntries.slice(start, start + SERIES_PER_PAGE);
  }, [groupedSeriesEntries, currentPage]);

  // Resetar página quando o filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, seriesFilter]);

  // Selecionar/desselecionar episódio individual
  const toggleEpisode = useCallback((episodeId: string) => {
    setSelectedEpisodes(prev => {
      const next = new Set(prev);
      if (next.has(episodeId)) {
        next.delete(episodeId);
      } else {
        next.add(episodeId);
      }
      return next;
    });
  }, []);

  // Selecionar todos os episódios de uma série específica
  const toggleSeriesEpisodes = useCallback((seriesName: string) => {
    const seriesEps = groupedEpisodes[seriesName] || [];
    const allSeriesIds = seriesEps.map(ep => ep.id);
    
    setSelectedEpisodes(prev => {
      const next = new Set(prev);
      const allSelected = allSeriesIds.every(id => next.has(id));
      
      if (allSelected) {
        allSeriesIds.forEach(id => next.delete(id));
      } else {
        allSeriesIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, [groupedEpisodes]);

  // Selecionar todos os episódios filtrados
  const selectAll = useCallback(() => {
    if (filteredEpisodes.length === 0) return;
    
    setSelectedEpisodes(prev => {
      if (prev.size === filteredEpisodes.length) {
        return new Set();
      } else {
        return new Set(filteredEpisodes.map(ep => ep.id));
      }
    });
  }, [filteredEpisodes]);

  // Desmarcar todos
  const clearSelection = useCallback(() => {
    setSelectedEpisodes(new Set());
  }, []);

  // Recolher/Expandir série
  const toggleCollapse = useCallback((seriesName: string) => {
    setCollapsedSeries(prev => {
      const next = new Set(prev);
      if (next.has(seriesName)) {
        next.delete(seriesName);
      } else {
        next.add(seriesName);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedSeries(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedSeries(new Set(groupedSeriesEntries.map(([name]) => name)));
  }, [groupedSeriesEntries]);

  // Importar episódios selecionados
  const importSelectedEpisodes = async () => {
    if (selectedEpisodes.size === 0) {
      toast.error('Selecione pelo menos um episódio para importar');
      return;
    }

    const targetTableId = config?.tableIds?.episodios;
    
    if (!targetTableId) {
      toast.custom((t) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-4 shadow-xl max-w-md"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm mb-1">Tabela de Episódios não configurada</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Você precisa configurar o ID da tabela de episódios nas configurações dos IDs das tabelas antes de importar.
              </p>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  toast.dismiss(t);
                  navigate('/configuracoes', { state: { focusField: 'episodios' } });
                }}
              >
                <Settings className="w-4 h-4" />
                Configurar ID da Tabela
              </Button>
            </div>
          </div>
        </motion.div>
      ), { duration: 8000 });
      return;
    }

    if (!canAddMoreContent() && selectedEpisodes.size > getRemainingContent()) {
      toast.error('Limite de importação excedido!', {
        description: `Você pode importar apenas mais ${getRemainingContent()} episódios este mês.`
      });
      return;
    }

    setImporting(true);
    try {
      const episodesToImport = episodes.filter(ep => selectedEpisodes.has(ep.id));
      
      toast('Importando episódios...', { 
        description: `Processando ${episodesToImport.length} episódios selecionados` 
      });

      setProgress({ processed: 0, total: episodesToImport.length, startedAt: Date.now() });

      const result = await seriesUpdateService.importEpisodes(episodesToImport, (p) => {
        setProgress(prev => ({
          processed: p.processed,
          total: p.total,
          current: p.current,
          startedAt: prev?.startedAt ?? Date.now()
        }));
      });

      const updatedCount = result.updated || 0;
      const ignoredCount = result.ignored || 0;

      setLastSummary({
        created: result.imported || 0,
        updated: updatedCount,
        ignored: ignoredCount,
        total: episodesToImport.length,
        seasonsUpdated: result.seasonsUpdated
      });

      if (result.success) {
        const partes: string[] = [];
        if (result.imported > 0) partes.push(`${result.imported} novos episódios`);
        if (updatedCount > 0) partes.push(`${updatedCount} atualizados`);
        if (ignoredCount > 0) partes.push(`${ignoredCount} ignorados`);
        if (result.seasonsUpdated?.length) partes.push(`${result.seasonsUpdated.length} série(s) sincronizada(s)`);
        
        toast.success(partes.join(' • ') || 'Importação concluída com sucesso!');
        setSelectedEpisodes(new Set());
      } else {
        toast.error(`${result.imported}/${episodesToImport.length} episódios importados`, {
          description: result.errors && result.errors.length > 0 ? 'Alguns episódios falharam na importação' : undefined
        });
      }
      
    } catch (error: any) {
      console.error('Erro ao importar episódios:', error);
      toast.error(error.message || 'Erro ao importar episódios');
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  // Cronômetro da importação em andamento
  useEffect(() => {
    if (!importing || !progress) return;
    const startedAt = progress.startedAt;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 500);
    return () => clearInterval(timer);
  }, [importing, progress?.startedAt]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  const estimatedRemaining = progress && progress.processed > 0
    ? ((elapsed / progress.processed) * (progress.total - progress.processed))
    : null;

  return (
    <PermissionGate feature="atualizacao-series">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Tv className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              Atualização de Séries
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Catálogo sincronizado com episódios recentes e atualização inteligente de temporadas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              id="btn-recarregar-series"
              onClick={loadAvailableEpisodes}
              disabled={loading || importing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Sincronizando...' : 'Atualizar Catálogo'}
            </Button>
          </div>
        </div>

        {/* Card de Limite de Importação */}
        {permissions && hasContentLimit() && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Shield className="h-4 w-4" />
                Limite de Importação Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 max-w-md">
                  <p className="text-xs text-muted-foreground">
                    Uso atual: <strong className="text-foreground">{permissions.currentMonthUsage}</strong> de{' '}
                    <strong className="text-foreground">{permissions.monthlyContentLimit}</strong> conteúdos
                  </p>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${Math.min((permissions.currentMonthUsage / permissions.monthlyContentLimit) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-primary">
                    {getRemainingContent()} restantes
                  </p>
                  {!canAddMoreContent() && (
                    <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium mt-0.5">
                      <Lock className="h-3 w-3" />
                      Limite atingido
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status da Configuração se ausente */}
        {!isConfigured && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">Configurações pendentes</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure o token e IDs das tabelas para habilitar a busca e importação direta.
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/configuracoes')}
                  className="gap-2 shrink-0"
                >
                  <Settings className="h-4 w-4" />
                  Ir para Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progresso da Importação */}
        {importing && progress && (
          <Card className="border-primary/40 bg-primary/5 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                Importando episódios para sua biblioteca...
              </CardTitle>
              <CardDescription className="truncate text-xs">
                {progress.current ? `Processando: ${progress.current}` : 'Iniciando importação...'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progressPercent} className="h-2.5" />
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">{progress.processed}</strong> de {progress.total} episódios ({progressPercent}%)
                </span>
                <span>Tempo decorrido: {formatDuration(elapsed)}</span>
                <span>
                  {estimatedRemaining !== null
                    ? `Restante: ~${formatDuration(estimatedRemaining)}`
                    : 'Calculando tempo estimado...'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo da Última Importação */}
        {lastSummary && !importing && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <BarChart3 className="h-4 w-4" />
                  Resultado da Última Importação
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLastSummary(null)} 
                  className="h-6 w-6 p-0 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card rounded-lg p-3 border text-center">
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{lastSummary.created}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Criados</p>
                </div>
                <div className="bg-card rounded-lg p-3 border text-center">
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{lastSummary.updated}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Atualizados</p>
                </div>
                <div className="bg-card rounded-lg p-3 border text-center">
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{lastSummary.ignored}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sem alterações</p>
                </div>
                <div className="bg-card rounded-lg p-3 border text-center">
                  <p className="text-xl font-bold text-foreground">{lastSummary.total}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Processados</p>
                </div>
              </div>

              {lastSummary.seasonsUpdated && lastSummary.seasonsUpdated.length > 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-card p-3">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Temporadas sincronizadas ({lastSummary.seasonsUpdated.length} séries)
                  </p>
                  <ul className="space-y-1.5 max-h-32 overflow-y-auto text-xs">
                    {lastSummary.seasonsUpdated.map((s) => (
                      <li key={s.nome} className="flex items-center justify-between text-muted-foreground border-b border-border/50 pb-1 last:border-0 last:pb-0">
                        <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">{s.nome}</span>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          T{s.from} → T{s.to} ({s.episodes} eps)
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Painel Principal de Filtros e Listagem */}
        {isConfigured && (
          <div className="space-y-4">
            
            {/* Barra de Busca e Filtros */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                
                {/* Linha 1: Input de Busca + Select de Série */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="input-busca-series"
                      placeholder="Buscar por episódio, série ou sinopse..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-8"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')} 
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="md:w-72 relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      id="select-filtro-series"
                      value={seriesFilter}
                      onChange={(e) => setSeriesFilter(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 border border-input bg-background rounded-md text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring transition-colors cursor-pointer"
                    >
                      <option value="">Todas as séries ({availableSeries.length})</option>
                      {availableSeries.map(series => (
                        <option key={series} value={series}>
                          {series} ({seriesCounts[series] || 0} eps)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Linha 2: Filtros Rápidos em Tags de Séries (Mais Populares/Primeiras) */}
                {availableSeries.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium uppercase tracking-wider text-[10px]">
                        Atalhos de Séries ({availableSeries.length})
                      </span>
                      {(searchTerm || seriesFilter) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchTerm('');
                            setSeriesFilter('');
                          }}
                          className="h-6 text-xs px-2"
                        >
                          Limpar Filtros
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 scrollbar-thin">
                      <Button
                        variant={seriesFilter === '' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeriesFilter('')}
                        className="h-7 text-xs px-2.5"
                      >
                        Todas
                        <Badge variant={seriesFilter === '' ? 'secondary' : 'outline'} className="ml-1.5 text-[10px] px-1 py-0 h-4">
                          {episodes.length}
                        </Badge>
                      </Button>

                      {availableSeries.slice(0, 30).map(series => {
                        const count = seriesCounts[series] || 0;
                        const isActive = seriesFilter === series;
                        return (
                          <Button
                            key={series}
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSeriesFilter(isActive ? '' : series)}
                            className="h-7 text-xs px-2.5 max-w-[200px]"
                            title={`${series} (${count} episódios)`}
                          >
                            <span className="truncate">{series}</span>
                            <Badge variant={isActive ? 'secondary' : 'outline'} className="ml-1.5 text-[10px] px-1 py-0 h-4 shrink-0">
                              {count}
                            </Badge>
                          </Button>
                        );
                      })}

                      {availableSeries.length > 30 && (
                        <span className="text-xs text-muted-foreground self-center px-1">
                          +{availableSeries.length - 30} séries no menu
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Linha 3: Barra de Ações em Lote e Contagem */}
                {episodes.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <Button
                        id="btn-selecionar-todos"
                        variant="outline"
                        size="sm"
                        onClick={selectAll}
                        disabled={filteredEpisodes.length === 0}
                        className="gap-2 h-8 text-xs"
                      >
                        {selectedEpisodes.size === filteredEpisodes.length && filteredEpisodes.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        {selectedEpisodes.size === filteredEpisodes.length && filteredEpisodes.length > 0
                          ? 'Desmarcar Todos'
                          : `Selecionar Todos (${filteredEpisodes.length})`}
                      </Button>

                      {selectedEpisodes.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSelection}
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Limpar Seleção
                        </Button>
                      )}

                      <Badge variant="secondary" className="text-xs px-2.5 py-1">
                        {selectedEpisodes.size} de {filteredEpisodes.length} selecionados
                      </Badge>
                    </div>

                    <Button
                      id="btn-importar-selecionados"
                      onClick={importSelectedEpisodes}
                      disabled={selectedEpisodes.size === 0 || importing || !canAddMoreContent()}
                      className="gap-2 h-9 px-4 ml-auto"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Importar Selecionados ({selectedEpisodes.size})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listagem de Séries e Episódios */}
            <Card>
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      Episódios Disponíveis
                      {filteredEpisodes.length > 0 && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {filteredEpisodes.length} encontrados em {groupedSeriesEntries.length} séries
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Selecione os episódios que deseja gravar em sua tabela
                    </CardDescription>
                  </div>

                  {groupedSeriesEntries.length > 0 && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={expandAll}
                        className="h-7 text-xs px-2"
                      >
                        Expandir Todas
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={collapseAll}
                        className="h-7 text-xs px-2"
                      >
                        Recolher Todas
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4">
                
                {/* Estado: Sem episódios carregados */}
                {!episodes.length && !loading && (
                  <div className="text-center py-12 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                      <Tv className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">Nenhum episódio em cache</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                      Clique no botão abaixo para buscar as atualizações recentes de séries na tabela central.
                    </p>
                    <Button onClick={loadAvailableEpisodes} disabled={loading} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Buscar Episódios Agora
                    </Button>
                  </div>
                )}

                {/* Estado: Carregando */}
                {loading && (
                  <div className="text-center py-16">
                    <Loader2 className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
                    <p className="text-sm font-medium">Carregando catálogo de episódios...</p>
                    <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos na primeira busca</p>
                  </div>
                )}

                {/* Estado: Nenhum resultado para a busca */}
                {episodes.length > 0 && filteredEpisodes.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">Nenhum episódio corresponde à busca</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">Tente buscar por outro termo ou limpe os filtros.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setSearchTerm(''); setSeriesFilter(''); }}
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                )}

                {/* Listagem Paginada de Séries (Ultra-rápida, sem travar o DOM) */}
                {paginatedSeriesEntries.length > 0 && !loading && (
                  <div className="space-y-4">
                    {paginatedSeriesEntries.map(([seriesName, seriesEpisodes]) => {
                      const isCollapsed = collapsedSeries.has(seriesName);
                      const seriesEpisodeIds = seriesEpisodes.map(ep => ep.id);
                      const selectedInSeriesCount = seriesEpisodeIds.filter(id => selectedEpisodes.has(id)).length;
                      const allSeriesSelected = selectedInSeriesCount === seriesEpisodes.length && seriesEpisodes.length > 0;
                      const someSeriesSelected = selectedInSeriesCount > 0 && !allSeriesSelected;

                      return (
                        <div 
                          key={seriesName} 
                          className="rounded-xl border border-border/80 bg-card overflow-hidden transition-all shadow-sm"
                        >
                          {/* Cabeçalho da Série */}
                          <div 
                            className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 hover:bg-muted/50 cursor-pointer select-none transition-colors border-b border-border/50"
                            onClick={() => toggleCollapse(seriesName)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Checkbox
                                id={`check-series-${seriesName}`}
                                checked={allSeriesSelected ? true : (someSeriesSelected ? 'indeterminate' : false)}
                                onCheckedChange={() => toggleSeriesEpisodes(seriesName)}
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0"
                              />
                              
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm sm:text-base truncate flex items-center gap-2">
                                  {seriesName}
                                  <Badge variant="outline" className="text-[11px] font-normal shrink-0">
                                    {seriesEpisodes.length} {seriesEpisodes.length === 1 ? 'ep' : 'eps'}
                                  </Badge>
                                </h4>
                                {selectedInSeriesCount > 0 && (
                                  <p className="text-xs text-primary font-medium mt-0.5">
                                    {selectedInSeriesCount} de {seriesEpisodes.length} selecionados
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSeriesEpisodes(seriesName);
                                }}
                                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                              >
                                {allSeriesSelected ? 'Desmarcar Série' : 'Marcar Série'}
                              </Button>

                              <button 
                                className="p-1 text-muted-foreground hover:text-foreground rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCollapse(seriesName);
                                }}
                              >
                                {isCollapsed ? (
                                  <ChevronDown className="h-5 w-5" />
                                ) : (
                                  <ChevronUp className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Lista de Episódios da Série */}
                          {!isCollapsed && (
                            <div className="p-2 sm:p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {seriesEpisodes.map((episode) => {
                                const isChecked = selectedEpisodes.has(episode.id);
                                return (
                                  <div
                                    key={episode.id}
                                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
                                      isChecked 
                                        ? 'border-primary/50 bg-primary/5 shadow-xs' 
                                        : 'border-border/60 hover:bg-muted/40'
                                    }`}
                                    onClick={() => toggleEpisode(episode.id)}
                                  >
                                    <Checkbox
                                      id={`check-ep-${episode.id}`}
                                      checked={isChecked}
                                      onCheckedChange={() => toggleEpisode(episode.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-0.5 shrink-0"
                                    />
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                        {(episode.Temporada || episode.Episodio) && (
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                                            T{episode.Temporada || '?'}E{episode.Episodio || '?'}
                                          </Badge>
                                        )}
                                        <span className="font-medium text-xs truncate text-foreground">
                                          {episode.Titulo}
                                        </span>
                                      </div>

                                      {episode.Sinopse && (
                                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-snug">
                                          {episode.Sinopse}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Controles de Paginação de Séries */}
                    {totalSeriesPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Mostrando página <strong className="text-foreground">{currentPage}</strong> de{' '}
                          <strong className="text-foreground">{totalSeriesPages}</strong> ({groupedSeriesEntries.length} séries)
                        </p>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          
                          <span className="text-xs px-2 font-medium">
                            {currentPage} / {totalSeriesPages}
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalSeriesPages, p + 1))}
                            disabled={currentPage === totalSeriesPages}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </PermissionGate>
  );
};

export default AtualizacaoSeries;
