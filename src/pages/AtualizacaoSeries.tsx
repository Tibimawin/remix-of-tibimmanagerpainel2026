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
  Tv
} from 'lucide-react';
import { toast } from 'sonner';

const AtualizacaoSeries = () => {
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState<any[]>([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [importing, setImporting] = useState(false);
  const [availableSeries, setAvailableSeries] = useState<string[]>([]);
  const [lastSummary, setLastSummary] = useState<{ created: number; updated: number; ignored: number; total: number } | null>(null);

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

      const result = await seriesUpdateService.importEpisodes(episodesToImport);
      const updatedCount = result.updated || 0;

      if (result.success) {
        const partes: string[] = [];
        if (result.imported > 0) partes.push(`${result.imported} novos episódios`);
        if (updatedCount > 0) partes.push(`${updatedCount} atualizados (sem duplicar)`);
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
    }
  };

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