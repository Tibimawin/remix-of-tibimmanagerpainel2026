import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const AtualizacaoSeries = () => {
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState<any[]>([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [importing, setImporting] = useState(false);
  const [availableSeries, setAvailableSeries] = useState<string[]>([]);
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
  const isConfigured = cloudConfig?.apiToken && cloudConfig?.baseUrl && cloudConfig?.tableIds?.episodios;

  // Carregar episódios disponíveis
  const loadAvailableEpisodes = async () => {
    if (!isConfigured) {
      toast.error('Configure suas credenciais primeiro na página de Importação Automática');
      return;
    }

    setLoading(true);
    try {
      toast('Carregando episódios disponíveis...', { description: 'Buscando novos episódios das séries' });
      
      const episodesData = await seriesUpdateService.getAvailableEpisodes();
      setEpisodes(episodesData);
      setFilteredEpisodes(episodesData);
      
      // Extrair lista de séries únicas
      const series = [...new Set(episodesData.map(ep => ep.Serie || ep.Titulo).filter(Boolean))];
      setAvailableSeries(series.sort());
      
      toast.success(`${episodesData.length} episódios encontrados de ${series.length} séries`);
      
    } catch (error) {
      console.error('Erro ao carregar episódios:', error);
      toast.error('Erro ao carregar episódios disponíveis');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar episódios
  useEffect(() => {
    let filtered = episodes;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(ep => 
        (ep.Titulo || '').toLowerCase().includes(searchLower) ||
        (ep.Serie || '').toLowerCase().includes(searchLower) ||
        (ep.Sinopse || '').toLowerCase().includes(searchLower)
      );
    }

    if (seriesFilter && seriesFilter !== 'all') {
      filtered = filtered.filter(ep => 
        (ep.Serie || ep.Titulo) === seriesFilter
      );
    }

    setFilteredEpisodes(filtered);
  }, [episodes, searchTerm, seriesFilter]);

  // Selecionar/desselecionar episódio
  const toggleEpisode = (episodeId: string) => {
    const newSelected = new Set(selectedEpisodes);
    if (newSelected.has(episodeId)) {
      newSelected.delete(episodeId);
    } else {
      newSelected.add(episodeId);
    }
    setSelectedEpisodes(newSelected);
  };

  // Selecionar todos
  const selectAll = () => {
    if (selectedEpisodes.size === filteredEpisodes.length) {
      setSelectedEpisodes(new Set());
    } else {
      const allIds = filteredEpisodes.map(ep => ep.id);
      setSelectedEpisodes(new Set(allIds));
    }
  };

  // Importar episódios selecionados
  const importSelectedEpisodes = async () => {
    if (selectedEpisodes.size === 0) {
      toast.error('Selecione pelo menos um episódio para importar');
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
      const episodesToImport = filteredEpisodes.filter(ep => selectedEpisodes.has(ep.id));
      
      toast('Importando episódios...', { 
        description: `Importando ${episodesToImport.length} episódios selecionados` 
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
        if (result.seasonsUpdated?.length) partes.push(`${result.seasonsUpdated.length} série(s) com temporada atualizada`);
        toast.success(partes.join(' • ') || 'Importação concluída');
        setSelectedEpisodes(new Set());
        
        // Recarregar para atualizar a lista
        loadAvailableEpisodes();
      } else {
        toast.error(`${result.imported}/${episodesToImport.length} episódios importados`, {
          description: result.errors?.length > 0 ? 'Alguns episódios falharam na importação' : undefined
        });
      }
      
    } catch (error) {
      console.error('Erro ao importar episódios:', error);
      toast.error('Erro ao importar episódios');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Agrupar episódios por série
  const groupedEpisodes = filteredEpisodes.reduce((acc, episode) => {
    const seriesName = episode.Serie || episode.Titulo || 'Série Desconhecida';
    if (!acc[seriesName]) {
      acc[seriesName] = [];
    }
    acc[seriesName].push(episode);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <PermissionGate feature="atualizacao-series">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Tv className="h-8 w-8 text-primary" />
            Atualização de Séries
          </h1>
          <p className="text-muted-foreground mt-2">
            Importe novos episódios das séries mais recentes
          </p>
        </div>

        {/* Card de Limite de Importação */}
        {permissions && hasContentLimit() && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" />
                Limite de Importação Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Uso atual: <span className="font-medium">{permissions.currentMonthUsage}</span> de{' '}
                    <span className="font-medium">{permissions.monthlyContentLimit}</span> conteúdos
                  </p>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ 
                        width: `${Math.min((permissions.currentMonthUsage / permissions.monthlyContentLimit) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {getRemainingContent()} restantes
                  </p>
                  {!canAddMoreContent() && (
                    <div className="flex items-center gap-1 text-destructive text-sm mt-1">
                      <Lock className="h-3 w-3" />
                      Limite atingido
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status da Configuração */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Status da Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isConfigured ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">Configuração válida</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="text-orange-600 font-medium">
                    Configure suas credenciais na página de Importação Automática
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progresso da Importação */}
        {importing && progress && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                Importando episódios...
              </CardTitle>
              <CardDescription className="truncate">
                {progress.current ? `Último processado: ${progress.current}` : 'Preparando importação...'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progressPercent} />
              <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  <strong className="text-foreground">{progress.processed}</strong> de {progress.total} ({progressPercent}%)
                </span>
                <span>Tempo decorrido: {formatDuration(elapsed)}</span>
                <span>
                  {estimatedRemaining !== null
                    ? `Tempo restante estimado: ${formatDuration(estimatedRemaining)}`
                    : 'Calculando tempo restante...'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo da Última Importação */}
        {lastSummary && (
          <Card className="mb-6 border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <BarChart3 className="h-5 w-5" />
                Resumo da Última Importação
              </CardTitle>
              <CardDescription>
                Resultado da importação mais recente de episódios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-background rounded-lg p-4 border text-center">
                  <p className="text-2xl font-bold text-green-600">{lastSummary.created}</p>
                  <p className="text-sm text-muted-foreground">Criados</p>
                </div>
                <div className="bg-background rounded-lg p-4 border text-center">
                  <p className="text-2xl font-bold text-blue-600">{lastSummary.updated}</p>
                  <p className="text-sm text-muted-foreground">Atualizados</p>
                </div>
                <div className="bg-background rounded-lg p-4 border text-center">
                  <p className="text-2xl font-bold text-amber-600">{lastSummary.ignored}</p>
                  <p className="text-sm text-muted-foreground">Ignorados</p>
                </div>
                <div className="bg-background rounded-lg p-4 border text-center">
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{lastSummary.total}</p>
                  <p className="text-sm text-muted-foreground">Total Selecionados</p>
                </div>
              </div>

              {lastSummary.seasonsUpdated && lastSummary.seasonsUpdated.length > 0 && (
                <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
                  <p className="text-sm font-semibold mb-2 text-emerald-700 dark:text-emerald-400">
                    Temporada atualizada automaticamente em {lastSummary.seasonsUpdated.length} série(s)
                  </p>
                  <ul className="space-y-2">
                    {lastSummary.seasonsUpdated.map((s) => (
                      <li key={s.nome} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{s.nome}</span>:{' '}
                        <span className="font-mono">Temporadas {s.from} → {s.to}</span>
                        <span className="block text-xs">
                          {s.episodes} episódio(s) impactado(s)
                          {s.at ? ` • ${new Date(s.at).toLocaleString('pt-BR')}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* Controles de Filtro e Busca */}
        {isConfigured && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar episódios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="sm:w-64">
                  <select
                    value={seriesFilter}
                    onChange={(e) => setSeriesFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="">Todas as séries</option>
                    {availableSeries.map(series => (
                      <option key={series} value={series}>{series}</option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={loadAvailableEpisodes}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar
                </Button>
              </div>

              {episodes.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                      disabled={filteredEpisodes.length === 0}
                    >
                      <Checkbox 
                        checked={selectedEpisodes.size === filteredEpisodes.length && filteredEpisodes.length > 0}
                        className="mr-2"
                      />
                      {selectedEpisodes.size === filteredEpisodes.length ? 'Desselecionar todos' : 'Selecionar todos'}
                    </Button>
                    
                    <Badge variant="secondary">
                      {selectedEpisodes.size} selecionados
                    </Badge>
                  </div>

                  <Button
                    onClick={importSelectedEpisodes}
                    disabled={selectedEpisodes.size === 0 || importing || !canAddMoreContent()}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Importar {selectedEpisodes.size} episódios
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista de Episódios */}
        {isConfigured && (
          <Card>
            <CardHeader>
              <CardTitle>
                Episódios Disponíveis 
                {filteredEpisodes.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {filteredEpisodes.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Selecione os episódios que deseja importar para sua biblioteca
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!episodes.length && !loading ? (
                <div className="text-center py-12">
                  <Tv className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum episódio carregado</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique em "Atualizar" para carregar os episódios disponíveis
                  </p>
                  <Button onClick={loadAvailableEpisodes} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Carregar Episódios
                  </Button>
                </div>
              ) : loading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Carregando episódios...</p>
                </div>
              ) : filteredEpisodes.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum episódio encontrado com os filtros aplicados
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-6">
                    {Object.entries(groupedEpisodes).map(([seriesName, seriesEpisodes]) => (
                      <div key={seriesName} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-lg">{seriesName}</h4>
                          <Badge variant="outline">{(seriesEpisodes as any[]).length} episódios</Badge>
                        </div>
                        
                        <div className="grid gap-2 pl-4">
                          {(seriesEpisodes as any[]).map((episode) => (
                            <div
                              key={episode.id}
                              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => toggleEpisode(episode.id)}
                            >
                              <Checkbox
                                checked={selectedEpisodes.has(episode.id)}
                                onChange={() => toggleEpisode(episode.id)}
                              />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium truncate">
                                    {episode.Titulo}
                                  </h5>
                                  {episode.Temporada && episode.Episodio && (
                                    <Badge variant="secondary" className="text-xs">
                                      T{episode.Temporada}E{episode.Episodio}
                                    </Badge>
                                  )}
                                </div>
                                
                                {episode.Sinopse && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {episode.Sinopse}
                                  </p>
                                )}
                              </div>
                              
                              <Play className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                        
                        {seriesName !== Object.keys(groupedEpisodes)[Object.keys(groupedEpisodes).length - 1] && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionGate>
  );
};

export default AtualizacaoSeries;