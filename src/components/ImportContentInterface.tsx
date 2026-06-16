import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAutoImportService, ImportConfig, ImportContent, UserConfig } from '@/services/AutoImportService';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useUserActionHistory } from '@/hooks/useUserActionHistory';
import { UserPermissionsService } from '@/services/UserPermissionsService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { Search, Download, RefreshCw, X, Filter, CheckCircle, AlertCircle, Lock, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SeasonSelectionDialog } from './SeasonSelectionDialog';
import { useTypeMode } from '@/contexts/TypeModeContext';

interface ImportContentInterfaceProps {
  importConfig: ImportConfig;
  userConfig: UserConfig;
  onClose: () => void;
}

export const ImportContentInterface: React.FC<ImportContentInterfaceProps> = ({
  importConfig,
  userConfig,
  onClose
}) => {
  const [contents, setContents] = useState<ImportContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedContents, setSelectedContents] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const pageSize = 50; // Aumentar para carregar mais dados por vez
  
  // Season selection state
  const [seasonSelectionOpen, setSeasonSelectionOpen] = useState(false);
  const [currentSeriesForSeasonSelection, setCurrentSeriesForSeasonSelection] = useState<ImportContent | null>(null);
  const [seriesSeasons, setSeriesSeasons] = useState<Map<string, number[]>>(new Map());
  const [seriesEpisodes, setSeriesEpisodes] = useState<Map<string, any[]>>(new Map());
  const [seriesSelectedEpisodes, setSeriesSelectedEpisodes] = useState<Map<string, string[]>>(new Map());
  const [pendingEpisodes, setPendingEpisodes] = useState<string[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  
  // Episode import progress tracking
  const [episodeProgress, setEpisodeProgress] = useState<{
    seriesTitle: string;
    current: number;
    total: number;
    episodes: Array<{
      title: string;
      season: string;
      episode: string;
      status: 'pending' | 'processing' | 'success' | 'error';
    }>;
  } | null>(null);

  // Removido: rastreamento de histórico de importação e lista de nomes importados

  const autoImportService = useAutoImportService();
  const { userInfo } = useSimpleAuth();
  const { canAddMoreContent, getRemainingContent } = useUserPermissions();
  const { mode, setMode } = useTypeMode();
  const { addAction } = useUserActionHistory();

  const loadContents = async (page = 1, search = '', type = 'all', forceRefresh = false) => {
    try {
      const loadingState = forceRefresh ? setRefreshing : setLoading;
      loadingState(true);
      setLoadProgress(0);
      setProgressStep('Iniciando carregamento...');
      
      if (forceRefresh) {
        console.log('Forçando atualização dos conteúdos...');
        toast.info('Atualizando lista de conteúdos...');
      }
      
      setProgressStep('Conectando ao servidor...');
      setLoadProgress(20);
      
      console.log('Carregando conteúdos...', { page, search, type, forceRefresh });
      
      setProgressStep('Carregando dados...');
      setLoadProgress(40);
      
      const response = await autoImportService.getAvailableContents(
        importConfig,
        page,
        pageSize,
        type,
        search
      );
      
      setProgressStep('Processando dados...');
      setLoadProgress(70);
      
      // Simular processamento para mostrar progresso
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setContents(response.results);
      setTotalCount(response.count);
      setCurrentPage(page);
      
      setProgressStep('Finalizando...');
      setLoadProgress(90);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (forceRefresh) {
        toast.success('Lista de conteúdos atualizada!');
      }
      
      setLoadProgress(100);
      setProgressStep(`${response.results.length} conteúdos carregados`);
      
      console.log(`Carregados ${response.results.length} de ${response.count} conteúdos`);
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error);
      toast.error('Erro ao carregar conteúdos disponíveis');
      setProgressStep('Erro no carregamento');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
        setLoadProgress(0);
        setProgressStep('');
      }, 500);
    }
  };

  useEffect(() => {
    loadContents(1, searchTerm, typeFilter);
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    loadContents(1, searchTerm, typeFilter);
  };

  const handleRefresh = () => {
    // Limpar seleções e resetar para primeira página
    setSelectedContents(new Set());
    setCurrentPage(1);
    // Forçar atualização completa
    loadContents(1, searchTerm, typeFilter, true);
  };

  const handleSelectContent = async (contentId: string, checked: boolean) => {
    const content = contents.find(c => c.id === contentId);
    
    if (checked && content?.Tipo === 'Serie') {
      // Carregar episódios se ainda não foram carregados
      if (!seriesEpisodes.has(contentId)) {
        setLoadingEpisodes(true);
        try {
          toast.info('Carregando episódios...', {
            description: `Buscando episódios de "${content.Titulo}"`
          });
          
          const episodes = await autoImportService.getSeriesEpisodesOptimized(
            importConfig,
            content.Titulo
          );
          
          const newSeriesEpisodes = new Map(seriesEpisodes);
          newSeriesEpisodes.set(contentId, episodes);
          setSeriesEpisodes(newSeriesEpisodes);
          
          toast.success(`${episodes.length} episódios encontrados!`);
        } catch (error) {
          console.error('Erro ao carregar episódios:', error);
          toast.error('Erro ao carregar episódios da série');
        } finally {
          setLoadingEpisodes(false);
        }
      }
      
      // Inicializar pendingEpisodes do estado salvo ou todos os episódios
      const existingSelected = seriesSelectedEpisodes.get(contentId);
      const allEps = seriesEpisodes.get(contentId) || [];
      if (existingSelected && existingSelected.length > 0) {
        setPendingEpisodes(existingSelected);
      } else {
        setPendingEpisodes(allEps.map((ep: any) => ep.id));
      }
      
      // Abrir dialog de seleção de temporadas
      setCurrentSeriesForSeasonSelection(content);
      setSeasonSelectionOpen(true);
    } else {
      const newSelected = new Set(selectedContents);
      if (checked) {
        newSelected.add(contentId);
      } else {
        newSelected.delete(contentId);
        // Remover temporadas e episódios selecionados se desmarcar
        const newSeriesSeasons = new Map(seriesSeasons);
        newSeriesSeasons.delete(contentId);
        setSeriesSeasons(newSeriesSeasons);
        const newSelectedEpisodes = new Map(seriesSelectedEpisodes);
        newSelectedEpisodes.delete(contentId);
        setSeriesSelectedEpisodes(newSelectedEpisodes);
      }
      setSelectedContents(newSelected);
    }
  };

  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();

        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);

        oscillator2.frequency.value = 1000;
        oscillator2.type = 'sine';

        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.5);
      }, 150);
    } catch (error) {
      console.error('Erro ao tocar som:', error);
    }
  };

  const handleImportAllSeasons = async (content: ImportContent) => {
    // Carregar episódios se ainda não foram carregados
    if (!seriesEpisodes.has(content.id)) {
      setLoadingEpisodes(true);
      try {
        toast.info('Carregando episódios...', {
          description: `Buscando episódios de "${content.Titulo}"`
        });
        
        const episodes = await autoImportService.getSeriesEpisodesOptimized(
          importConfig,
          content.Titulo
        );
        
        const newSeriesEpisodes = new Map(seriesEpisodes);
        newSeriesEpisodes.set(content.id, episodes);
        setSeriesEpisodes(newSeriesEpisodes);
        
        toast.success(`${episodes.length} episódios encontrados!`);
      } catch (error) {
        console.error('Erro ao carregar episódios:', error);
        toast.error('Erro ao carregar episódios da série');
        setLoadingEpisodes(false);
        return;
      } finally {
        setLoadingEpisodes(false);
      }
    }
    
    const newSelected = new Set(selectedContents);
    newSelected.add(content.id);
    setSelectedContents(newSelected);
    
    // Selecionar todos os episódios por padrão
    const allEpisodes = seriesEpisodes.get(content.id) || [];
    const newSelectedEpisodes = new Map(seriesSelectedEpisodes);
    newSelectedEpisodes.set(content.id, allEpisodes.map((ep: any) => ep.id));
    setSeriesSelectedEpisodes(newSelectedEpisodes);
    
    // Não definir temporadas específicas no map para importar todas
    const newSeriesSeasons = new Map(seriesSeasons);
    newSeriesSeasons.delete(content.id); // Remove qualquer seleção prévia
    setSeriesSeasons(newSeriesSeasons);
    
    toast.success('Série adicionada', {
      description: `"${content.Titulo}" será importada com todos os episódios.`
    });
  };

  const handleSeasonSelectionConfirm = () => {
    if (currentSeriesForSeasonSelection) {
      const newSelected = new Set(selectedContents);
      newSelected.add(currentSeriesForSeasonSelection.id);
      setSelectedContents(newSelected);
      
      // Salvar episódios selecionados
      const newSelectedEpisodes = new Map(seriesSelectedEpisodes);
      newSelectedEpisodes.set(currentSeriesForSeasonSelection.id, pendingEpisodes);
      setSeriesSelectedEpisodes(newSelectedEpisodes);
      
      setSeasonSelectionOpen(false);
      setCurrentSeriesForSeasonSelection(null);
      
      toast.success('Temporadas selecionadas', {
        description: `Série "${currentSeriesForSeasonSelection.Titulo}" será importada com ${pendingEpisodes.length} episódio(s) selecionado(s).`
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(contents.map(content => content.id));
      setSelectedContents(allIds);
    } else {
      setSelectedContents(new Set());
    }
  };

  const handleImport = async () => {
    if (selectedContents.size === 0) {
      toast.error('Selecione pelo menos um conteúdo para importar');
      return;
    }

    // Verificar limite antes da importação
    const remainingContent = getRemainingContent();
    if (remainingContent !== -1 && selectedContents.size > remainingContent) {
      toast.error('Limite de importação excedido!', {
        description: `Você pode importar apenas ${remainingContent} conteúdo(s) restantes este mês.`
      });
      return;
    }

    if (!canAddMoreContent()) {
      toast.error('Limite mensal de importação atingido!', {
        description: 'Entre em contato com o administrador para aumentar seu limite.'
      });
      return;
    }

    try {
      setImporting(true);
      setImportProgress(0);
      setProgressStep('Preparando importação...');
      
      const contentsToImport = contents.filter(content => selectedContents.has(content.id));
      
      toast('Iniciando importação...', {
        description: `Importando ${contentsToImport.length} conteúdo(s)`
      });

      setProgressStep('Processando conteúdos...');
      setImportProgress(20);

      // Simular progresso durante importação
      let currentProgress = 20;
      const progressInterval = setInterval(() => {
        currentProgress += 5;
        if (currentProgress <= 80) {
          setImportProgress(currentProgress);
          setProgressStep(`Importando ${Math.floor((currentProgress - 20) / 60 * contentsToImport.length)} de ${contentsToImport.length} conteúdos...`);
        }
      }, 300);

      // Filtrar episódios pelos selecionados antes de importar
      const filteredSeriesEpisodes = new Map(seriesEpisodes);
      seriesSelectedEpisodes.forEach((selectedEpIds, contentId) => {
        const allEps = seriesEpisodes.get(contentId);
        if (allEps && selectedEpIds.length > 0) {
          filteredSeriesEpisodes.set(contentId, allEps.filter((ep: any) => selectedEpIds.includes(ep.id)));
        }
      });

      const result = await autoImportService.importContents(
        importConfig,
        contentsToImport,
        userConfig,
        seriesSeasons,
        filteredSeriesEpisodes,
        mode,
        (progress) => {
          setEpisodeProgress(prev => {
            // Initialize or update episode progress
            if (!prev || prev.seriesTitle !== progress.seriesTitle) {
              return {
                seriesTitle: progress.seriesTitle,
                current: progress.current,
                total: progress.total,
                episodes: [{
                  title: progress.episodeTitle,
                  season: progress.season,
                  episode: progress.episode,
                  status: progress.status
                }]
              };
            }
            
            // Update existing progress
            const existingEpisodeIndex = prev.episodes.findIndex(
              ep => ep.season === progress.season && ep.episode === progress.episode
            );
            
            const updatedEpisodes = [...prev.episodes];
            if (existingEpisodeIndex >= 0) {
              updatedEpisodes[existingEpisodeIndex] = {
                title: progress.episodeTitle,
                season: progress.season,
                episode: progress.episode,
                status: progress.status
              };
            } else {
              updatedEpisodes.push({
                title: progress.episodeTitle,
                season: progress.season,
                episode: progress.episode,
                status: progress.status
              });
            }
            
            return {
              seriesTitle: progress.seriesTitle,
              current: progress.current,
              total: progress.total,
              episodes: updatedEpisodes
            };
          });
        }
      );

      clearInterval(progressInterval);
      setImportProgress(90);
      setProgressStep('Finalizando importação...');

      if (result.success > 0) {
        // Atualizar o contador de uso no Firebase
        if (userInfo?.id) {
          try {
            await UserPermissionsService.incrementContentUsage(userInfo.id, result.success);
            console.log(`Uso atualizado: +${result.success} conteúdos importados`);
          } catch (error) {
            console.error('Erro ao atualizar uso de conteúdos:', error);
          }
        }
        
        setImportProgress(100);
        setProgressStep(`${result.success} conteúdos importados com sucesso!`);

        // Registrar ação de importação no Histórico de Ações
        try {
          const namesImported = contentsToImport.map(c => c.Titulo || 'Sem título');
          addAction?.(
            'Importação concluída',
            `${result.success} conteúdo(s) importado(s)`,
            'import',
            false,
            { names: namesImported, count: result.success }
          );
        } catch (e) {
          console.error('Erro ao registrar histórico de importação:', e);
        }

        // Tocar som de notificação
        playSuccessSound();
        
        toast.success(`${result.success} conteúdo(s) importado(s) com sucesso!`);
      }

      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          toast.error(error);
        });
      }

      // Limpar seleção após importação
      setSelectedContents(new Set());
      setSeriesSeasons(new Map());
      setSeriesEpisodes(new Map());
      setSeriesSelectedEpisodes(new Map());
      
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro durante a importação');
      setProgressStep('Erro na importação');
    } finally {
      setTimeout(() => {
        setImporting(false);
        setImportProgress(0);
        setProgressStep('');
        setEpisodeProgress(null);
      }, 2000);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importar Conteúdos
          </CardTitle>
          <CardDescription>
            Selecione os conteúdos que deseja importar para seu sistema
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Buscar</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="search"
                placeholder="Digite o nome do conteúdo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading || refreshing}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
        </div>
          <div className="sm:w-48">
            <Label htmlFor="type">Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="filme">Filmes</SelectItem>
                <SelectItem value="serie">Séries</SelectItem>
                <SelectItem value="dorama">Doramas</SelectItem>
                <SelectItem value="anime">Animes</SelectItem>
                <SelectItem value="novela">Novelas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="sm:w-32 flex items-end">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading || refreshing}
              title="Atualizar lista de conteúdos"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Informações e Limite */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {totalCount > 0 ? (
              <>Mostrando {contents.length} de {totalCount} conteúdos</>
            ) : (
              'Nenhum conteúdo encontrado'
            )}
            {getRemainingContent() !== -1 && (
              <div className="text-xs text-primary mt-1">
                Limite restante: {getRemainingContent()} conteúdos
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={contents.length > 0 && selectedContents.size === contents.length}
              onCheckedChange={handleSelectAll}
              disabled={contents.length === 0 || !canAddMoreContent()}
            />
            <Label className="text-sm">Selecionar todos ({selectedContents.size})</Label>
          </div>
        </div>

        {/* Barra de progresso de carregamento */}
        {(loading || refreshing) && (
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="font-medium">{refreshing ? 'Atualizando lista de conteúdos...' : 'Carregando conteúdos disponíveis...'}</span>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={loadProgress} className="w-full mb-2" />
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {progressStep || 'Processando...'}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Carregamento otimizado em lotes para melhor performance
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Barra de progresso de importação */}
        {importing && (
          <Card className="mb-4 border-green-600/20 bg-green-600/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                  <span className="font-medium text-green-600">Importando conteúdos selecionados...</span>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={importProgress} className="w-full mb-2" />
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {progressStep || 'Importando...'}
                  </div>
                  
                  {/* Episode Progress Indicator */}
                  {episodeProgress && (
                    <div className="mt-4 pt-4 border-t border-border/40">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">
                          {episodeProgress.seriesTitle}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Episódios importados:</span>
                          <span className="font-semibold text-green-600">
                            {episodeProgress.current}/{episodeProgress.total}
                          </span>
                        </div>
                        <Progress 
                          value={(episodeProgress.current / episodeProgress.total) * 100} 
                          className="h-2"
                        />
                        
                        {/* Last 3 episodes status */}
                        <ScrollArea className="h-24 w-full rounded-md border border-border/40 mt-3">
                          <div className="p-2 space-y-1">
                            {episodeProgress.episodes.slice(-5).reverse().map((ep, idx) => (
                              <div 
                                key={`${ep.season}-${ep.episode}-${idx}`}
                                className="flex items-center gap-2 text-xs"
                              >
                                {ep.status === 'processing' && (
                                  <Loader2 className="h-3 w-3 animate-spin text-blue-500 flex-shrink-0" />
                                )}
                                {ep.status === 'success' && (
                                  <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                )}
                                {ep.status === 'error' && (
                                  <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                )}
                                <span className="text-muted-foreground truncate">
                                  S{ep.season}E{ep.episode} - {ep.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    Não feche esta janela durante a importação
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de conteúdos */}
        <ScrollArea className="h-96 border rounded-lg">
          {(loading || refreshing) && !importing ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {progressStep || (refreshing ? 'Atualizando...' : 'Carregando...')}
                </span>
              </div>
            </div>
          ) : contents.length > 0 ? (
            <div className="p-4 space-y-2">
              {contents.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedContents.has(content.id)}
                    onCheckedChange={(checked) => handleSelectContent(content.id, checked as boolean)}
                    disabled={!canAddMoreContent() && !selectedContents.has(content.id)}
                  />
                  
                  {/* Logo do conteúdo */}
                  <div className="flex-shrink-0">
                    {content.Poster || content.Capa ? (
                      <img 
                        src={content.Poster || content.Capa || '/placeholder.svg'}
                        alt={content.Titulo}
                        className="w-12 h-12 md:w-16 md:h-16 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-muted flex items-center justify-center rounded border">
                        <span className="text-xs text-muted-foreground">Sem Imagem</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{content.Titulo}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {content.Tipo}
                      </Badge>
                    </div>
                    {content.Categoria && (
                      <p className="text-xs text-muted-foreground truncate">
                        {content.Categoria}
                      </p>
                    )}
                    {content.Sinopse && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {content.Sinopse}
                      </p>
                    )}
                    {content.Tipo === 'Serie' && selectedContents.has(content.id) && seriesSeasons.has(content.id) && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {seriesSeasons.get(content.id)?.length || 0} temporada(s) selecionada(s)
                        </Badge>
                      </div>
                    )}
                    {content.Tipo === 'Serie' && selectedContents.has(content.id) && !seriesSeasons.has(content.id) && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs text-primary">
                          Todas as temporadas
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Botão de ação rápida para séries */}
                  {content.Tipo === 'Serie' && !selectedContents.has(content.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImportAllSeasons(content)}
                      disabled={!canAddMoreContent()}
                      title="Importar todas as temporadas"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Todas
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Nenhum conteúdo encontrado</p>
            </div>
          )}
        </ScrollArea>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || loading || refreshing}
              onClick={() => loadContents(currentPage - 1, searchTerm, typeFilter)}
            >
              Anterior
            </Button>
            <span className="px-3 py-1 text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || loading || refreshing}
              onClick={() => loadContents(currentPage + 1, searchTerm, typeFilter)}
            >
              Próxima
            </Button>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedContents.size > 0 && (
              <span>{selectedContents.size} conteúdo(s) selecionado(s)</span>
            )}
            {!canAddMoreContent() && (
              <div className="flex items-center gap-1 text-destructive text-xs mt-1">
                <Lock className="h-3 w-3" />
                Limite mensal atingido
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={importing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={selectedContents.size === 0 || importing || !canAddMoreContent()}
            >
              {importing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Importar ({selectedContents.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Season Selection Dialog */}
      {currentSeriesForSeasonSelection && (
        <SeasonSelectionDialog
          open={seasonSelectionOpen}
          onOpenChange={setSeasonSelectionOpen}
          seriesTitle={currentSeriesForSeasonSelection.Titulo}
          totalSeasons={parseInt(currentSeriesForSeasonSelection.Temporadas || '1')}
          selectedSeasons={seriesSeasons.get(currentSeriesForSeasonSelection.id) || []}
          selectedEpisodes={pendingEpisodes}
          episodes={seriesEpisodes.get(currentSeriesForSeasonSelection.id) || []}
          loadingEpisodes={loadingEpisodes}
          onSeasonsChange={(seasons) => {
            const newSeriesSeasons = new Map(seriesSeasons);
            newSeriesSeasons.set(currentSeriesForSeasonSelection.id, seasons);
            setSeriesSeasons(newSeriesSeasons);
          }}
          onEpisodesChange={setPendingEpisodes}
          onConfirm={handleSeasonSelectionConfirm}
        />
      )}

    </Card>
  );
};
