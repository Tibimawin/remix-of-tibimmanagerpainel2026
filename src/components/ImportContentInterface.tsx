import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Search, Download, RefreshCw, X, Filter, CheckCircle, AlertCircle, Lock, Clock, Loader2, Sparkles } from 'lucide-react';
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
  const [enrichWithTmdb, setEnrichWithTmdb] = useState(true);

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
    <Card className="border-none bg-transparent shadow-none">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8">
        <div>
          <CardTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Explorar Conteúdos
          </CardTitle>
          <CardDescription className="text-sm font-medium">
            Selecione os melhores títulos para o seu catálogo premium.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted/50 backdrop-blur-sm border border-border/50 p-1.5 rounded-2xl flex items-center gap-1">
            <Button 
              variant={mode === 'padrao' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setMode('padrao')}
              className="rounded-xl h-9 font-bold text-xs"
            >
              Padrão
            </Button>
            <Button 
              variant={mode === 'miniseries' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setMode('miniseries')}
              className="rounded-xl h-9 font-bold text-xs"
            >
              Mini
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} className="rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 p-0">
        {/* Modern Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-muted/30 p-4 rounded-[2rem] border border-border/50 backdrop-blur-sm">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar títulos, gêneros ou diretores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-11 h-12 bg-background/50 border-none rounded-2xl focus-visible:ring-primary/20 shadow-inner"
            />
          </div>
          <div className="md:col-span-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-12 bg-background/50 border-none rounded-2xl focus:ring-primary/20 shadow-inner font-semibold">
                <SelectValue placeholder="Categorias" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-primary/10">
                <SelectItem value="all" className="font-semibold">✨ Todos os Gêneros</SelectItem>
                <SelectItem value="filme" className="font-semibold">🎬 Filmes Blockbuster</SelectItem>
                <SelectItem value="serie" className="font-semibold">📺 Séries Originais</SelectItem>
                <SelectItem value="dorama" className="font-semibold">🍜 Doramas Populares</SelectItem>
                <SelectItem value="anime" className="font-semibold">🍥 Animes Épicos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button 
              onClick={handleSearch} 
              disabled={loading || refreshing}
              className="flex-1 h-12 rounded-2xl font-bold gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="h-12 w-12 rounded-2xl border-primary/20 hover:bg-primary/5"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Dynamic Content Grid */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {loading || refreshing ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 py-10"
              >
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="space-y-3 animate-pulse">
                    <div className="aspect-[2/3] bg-muted rounded-[1.5rem]" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </motion.div>
            ) : contents.length > 0 ? (
              <motion.div 
                key="grid"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 py-6"
              >
                {contents.map((content, index) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group relative aspect-[2/3] rounded-[1.5rem] overflow-hidden border-2 transition-all cursor-pointer shadow-lg hover:shadow-primary/20 ${
                      selectedContents.has(content.id) ? 'border-primary ring-4 ring-primary/20' : 'border-border/50 hover:border-primary/50'
                    }`}
                    onClick={() => handleSelectContent(content.id, !selectedContents.has(content.id))}
                  >
                    {/* Poster with Overlay */}
                    <img 
                      src={content.Poster || content.Capa || '/placeholder.svg'}
                      alt={content.Titulo}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <Badge className="bg-primary/90 backdrop-blur-md border-none text-[10px] font-black uppercase tracking-tighter">
                        {content.Tipo}
                      </Badge>
                      {content.Temporadas && (
                        <Badge variant="outline" className="bg-black/50 backdrop-blur-md border-white/20 text-white text-[9px] font-bold">
                          {content.Temporadas} TEMP
                        </Badge>
                      )}
                    </div>

                    <div className="absolute top-3 right-3">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                        selectedContents.has(content.id) ? 'bg-primary text-primary-foreground scale-110' : 'bg-black/40 text-white/50 border border-white/20'
                      }`}>
                        {selectedContents.has(content.id) ? <CheckCircle className="h-4 w-4" /> : <Download className="h-3 w-3" />}
                      </div>
                    </div>

                    {/* Content Info (Visible on Hover or for Title) */}
                    <div className="absolute bottom-0 inset-x-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <h4 className="text-white font-black tracking-tight text-sm line-clamp-2 leading-tight">
                        {content.Titulo}
                      </h4>
                      <p className="text-white/60 text-[10px] font-medium mt-1 truncate">
                        {content.Categoria}
                      </p>
                      
                      {content.Tipo === 'Serie' && !selectedContents.has(content.id) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full mt-3 h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter bg-white text-black hover:bg-primary hover:text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImportAllSeasons(content);
                          }}
                        >
                          Quick Import
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50"
              >
                <div className="bg-muted p-6 rounded-full mb-4">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Nada por aqui</h3>
                <p className="text-sm">Tente ajustar seus filtros para encontrar novos conteúdos.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Pagination & Global Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-border/50">
          <div className="flex items-center gap-4">
            {totalPages > 1 && (
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-2xl border border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === 1 || loading || refreshing}
                  onClick={() => loadContents(currentPage - 1, searchTerm, typeFilter)}
                  className="rounded-xl h-9"
                >
                  Anterior
                </Button>
                <span className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Página {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === totalPages || loading || refreshing}
                  onClick={() => loadContents(currentPage + 1, searchTerm, typeFilter)}
                  className="rounded-xl h-9"
                >
                  Próxima
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
              <Checkbox
                checked={contents.length > 0 && selectedContents.size === contents.length}
                onCheckedChange={handleSelectAll}
                disabled={contents.length === 0 || !canAddMoreContent()}
              />
              <Label className="text-xs font-bold text-primary uppercase tracking-tighter cursor-pointer">
                Selecionar Todos ({selectedContents.size})
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="flex-1 md:flex-none text-right mr-2">
              <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                Limite Mensal
              </p>
              <p className={`text-xs font-bold ${getRemainingContent() < 10 ? 'text-destructive' : 'text-foreground'}`}>
                {getRemainingContent() === -1 ? '∞ Ilimitado' : `${getRemainingContent()} Disponíveis`}
              </p>
            </div>

            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={importing}
              className="rounded-2xl h-12 px-6 font-bold"
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={handleImport} 
              disabled={selectedContents.size === 0 || importing || !canAddMoreContent()}
              className="relative overflow-hidden group rounded-2xl h-12 px-8 font-black uppercase tracking-tighter shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 group-hover:opacity-90 transition-opacity" />
              <span className="relative flex items-center gap-2">
                {importing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Importar ({selectedContents.size})
                  </>
                )}
              </span>
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
