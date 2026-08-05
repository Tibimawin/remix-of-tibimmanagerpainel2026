import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ImportContentInterface } from '@/components/ImportContentInterface';
import { useAutoImportService, ImportConfig, UserConfig, ImportContent, ImportEpisode } from '@/services/AutoImportService';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useGlobalImportConfig } from '@/hooks/useGlobalImportConfig';
import { useGlobalMiniseriesConfig } from '@/hooks/useGlobalMiniseriesConfig';
import { useConfig } from '@/contexts/ConfigContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { PermissionGate } from '@/components/PermissionGate';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { testBaserowConnection } from '@/utils/proxyRequest';
import {
  Download,
  Settings,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  TestTube,
  Save,
  Cloud,
  Loader2,
  Shield,
  Database,
  Zap,
  Info,
  Server,
  Key,
  Table2,
  Tv,
  Clapperboard,
  Sparkles,
  ListVideo,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { CloakService } from '@/services/CloakService';
import { syncNotificationService } from '@/services/SyncNotificationService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { ImportPreview, ContentPreview } from '@/components/ImportPreview';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ImportacaoAutomaticaLocationState {
  autoImportContents?: ContentPreview[];
}

export interface ImportacaoAutomaticaProps {
  /** 'padrao' = Importação Automática | 'miniseries' = Minisséries */
  variant?: 'padrao' | 'miniseries';
}

const ImportacaoAutomatica = ({ variant = 'padrao' }: ImportacaoAutomaticaProps) => {
  const isMiniseries = variant === 'miniseries';
  const [showConfig, setShowConfig] = useState(false);
  const [showImportInterface, setShowImportInterface] = useState(false);
  const [userConfig, setUserConfig] = useState<UserConfig>({
    apiToken: '',
    baseUrl: '',
    contentTableId: '',
    episodeTableId: ''
  });
  const [importConfig, setImportConfig] = useState<ImportConfig | null>(null);
  const [configValid, setConfigValid] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<{
    current: number;
    total: number;
    title: string;
    success: number;
    errors: number;
  }>({ current: 0, total: 0, title: '', success: 0, errors: 0 });
  const [episodeStatus, setEpisodeStatus] = useState<{
    seriesTitle: string;
    current: number;
    total: number;
    seasons: Set<string>;
    currentSeason: string;
    currentEpisode: string;
    episodeTitle: string;
  }>({ seriesTitle: '', current: 0, total: 0, seasons: new Set(), currentSeason: '', currentEpisode: '', episodeTitle: '' });
  const [enrichWithTmdb, setEnrichWithTmdb] = useState(true);

  const autoImportService = useAutoImportService();
  const { userInfo } = useSimpleAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hasTriggeredAutoImportRef = React.useRef(false);
  const { config: cloudConfig, updateConfig: updateCloudConfig, loading: cloudLoading } = useUserConfig();
  const { globalConfig: defaultGlobalConfig, loading: defaultGlobalLoading } = useGlobalImportConfig();
  const { globalConfig: miniGlobalConfig, loading: miniGlobalLoading } = useGlobalMiniseriesConfig();
  const globalConfig = isMiniseries ? miniGlobalConfig : defaultGlobalConfig;
  const globalConfigLoading = isMiniseries ? miniGlobalLoading : defaultGlobalLoading;
  const { config } = useConfig();
  const { mode: typeMode } = useTypeMode();
  const {
    permissions,
    loading: permissionsLoading,
    hasContentLimit,
    getRemainingContent,
    canAddMoreContent
  } = useUserPermissions();

  // Carregar configuração de destino do usuário (Firebase)
  useEffect(() => {
    if (cloudConfig) {
      const cloudUserConfig: UserConfig = {
        apiToken: cloudConfig.apiToken || '',
        baseUrl: cloudConfig.baseUrl || '',
        contentTableId: cloudConfig.tableIds?.conteudos || '',
        episodeTableId: cloudConfig.tableIds?.episodios || '',
        tableIds: cloudConfig.tableIds
      };
      setUserConfig(cloudUserConfig);
      validateUserConfig(cloudUserConfig);
    } else {
      const savedUserConfig = localStorage.getItem('user-baserow-config');
      if (savedUserConfig) {
        try {
          const parsed = JSON.parse(savedUserConfig);
          setUserConfig(parsed);
          validateUserConfig(parsed);
        } catch (error) {
          console.error('Erro ao carregar configuração do localStorage:', error);
        }
      }
    }
  }, [cloudConfig]);

  // Carregar configuração de origem global (definida pelo admin)
  useEffect(() => {
    if (globalConfig) {
      setImportConfig({
        sourceToken: globalConfig.sourceToken,
        sourceBaseUrl: globalConfig.sourceBaseUrl,
        contentTableId: globalConfig.contentTableId,
        episodeTableId: globalConfig.episodeTableId,
        episodeMatchType: globalConfig.episodeMatchType,
        episodeKeyField: globalConfig.episodeKeyField,
        episodeSearchField: globalConfig.episodeSearchField,
        isActive: globalConfig.isActive,
      });

      // Iniciar monitoramento de novos conteúdos
      syncNotificationService.startMonitoring({
        sourceToken: globalConfig.sourceToken,
        sourceBaseUrl: globalConfig.sourceBaseUrl,
        contentTableId: globalConfig.contentTableId,
        episodeTableId: globalConfig.episodeTableId,
        isActive: globalConfig.isActive,
      });
    } else if (!globalConfigLoading) {
      setImportConfig(null);
    }

    return () => {
      syncNotificationService.stopMonitoring();
    };
  }, [globalConfig, globalConfigLoading]);

  const validateUserConfig = (config: UserConfig) => {
    const isValid = config.apiToken && config.baseUrl && config.contentTableId;
    setConfigValid(!!isValid);
    return !!isValid;
  };

  const handleUserConfigChange = (field: keyof UserConfig, value: string) => {
    const newConfig = { ...userConfig, [field]: value };
    setUserConfig(newConfig);
    validateUserConfig(newConfig);
  };

  const testUserConnection = async () => {
    if (!validateUserConfig(userConfig)) {
      toast.error('Preencha todos os campos obrigatórios para testar a conexão.');
      return;
    }

    try {
      setTesting(true);
      
      const result = await testBaserowConnection(
        userConfig.baseUrl,
        userConfig.apiToken,
        userConfig.contentTableId
      );

      if (result.success) {
        toast.success(`Conexão bem-sucedida! ${result.count || 0} conteúdos encontrados.`);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro no teste de conexão:', error);
      toast.error(`Erro na conexão: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const saveUserConfig = async () => {
    if (!validateUserConfig(userConfig)) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      await updateCloudConfig({
        apiToken: userConfig.apiToken,
        baseUrl: userConfig.baseUrl,
        tableIds: {
          conteudos: userConfig.contentTableId,
          episodios: userConfig.episodeTableId || '',
          banners: cloudConfig?.tableIds?.banners || '',
          categorias: cloudConfig?.tableIds?.categorias || '',
          usuarios: cloudConfig?.tableIds?.usuarios || '',
          sessoes: cloudConfig?.tableIds?.sessoes || '',
          plataformas: cloudConfig?.tableIds?.plataformas || '',
          canaisTv: cloudConfig?.tableIds?.canaisTv || '',
          jogosDia: cloudConfig?.tableIds?.jogosDia || '',
        }
      });
      localStorage.setItem('user-baserow-config', JSON.stringify(userConfig));
      toast.success('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração na nuvem.');
    } finally {
      setSaving(false);
    }
  };

  const startImport = React.useCallback(async (
    selectedContents?: ContentPreview[],
    seriesSeasons?: Map<string, number[]>,
    seriesEpisodes?: Map<string, ImportEpisode[]>
  ) => {
    if (!importConfig) {
      toast.error('O administrador ainda não configurou a origem dos conteúdos.', {
        description: 'Entre em contato com o administrador do sistema.'
      });
      return;
    }

    const hasRequiredTableId = isMiniseries ? !!userConfig.tableIds?.miniseries : !!userConfig.contentTableId;

    if (!configValid || !hasRequiredTableId) {
      const fieldToFocus = isMiniseries ? 'miniseries' : 'conteudos';
      const tableName = isMiniseries ? 'Minisséries' : 'Conteúdos';
      
      toast.custom((t) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-white/10 rounded-xl p-4 shadow-xl max-w-md"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm mb-1">Tabela de {tableName} não configurada</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Você precisa configurar o ID da tabela de {tableName.toLowerCase()} nas configurações antes de importar.
              </p>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  toast.dismiss(t);
                  navigate('/configuracoes', { state: { focusField: fieldToFocus } });
                }}
              >
                <Settings className="w-4 h-4" />
                Configurar ID da Tabela
              </Button>
            </div>
          </div>
        </motion.div>
      ), { duration: 8000 });
      setShowConfig(true);
      return;
    }

    if (!canAddMoreContent()) {
      toast.error('Limite de importação mensal atingido!', {
        description: 'Entre em contato com o administrador para aumentar seu limite.'
      });
      return;
    }

    // If no content selected, open the full interface
    if (!selectedContents || selectedContents.length === 0) {
      setShowImportInterface(true);
      return;
    }

    // Direct import from preview
    setIsImporting(true);
    setShowProgressModal(true);
    setImportProgress(0);
    setImportStatus({ current: 0, total: selectedContents.length, title: '', success: 0, errors: 0 });
    setEpisodeStatus({ seriesTitle: '', current: 0, total: 0, seasons: new Set(), currentSeason: '', currentEpisode: '', episodeTitle: '' });

    try {
      // Debug: Log dos dados originais antes do mapeamento
      console.log('🔍 [DEBUG] Dados originais do preview (primeiro item):', selectedContents[0]);
      console.log('🔍 [DEBUG] Todos os campos disponíveis:', Object.keys(selectedContents[0] || {}));

      // Convert ContentPreview to ImportContent format
      const contentsToImport: ImportContent[] = selectedContents.map(content => {
        // Capturar todos os campos possíveis, independente do nome
        const anyContent = content as any;

        const mappedContent = {
          id: String(content.id),
          // Título: tentar Nome, Titulo, Title
          Titulo: content.Nome || anyContent.Titulo || anyContent.Title || 'Sem título',
          // Tipo: tentar Tipo, Type
          Tipo: (content.Tipo || anyContent.Type || 'Filme') as 'Filme' | 'Serie' | 'TV',
          // Ano: tentar Ano, Year
          Ano: content.Ano || anyContent.Year || anyContent.Ano,
          // Categoria: tentar Categoria, Category, Genero, Genre
          Categoria: content.Categoria || anyContent.Category || anyContent.Genero || anyContent.Genre,
          // Sinopse: tentar Sinopse, Synopsis, Description
          Sinopse: content.Sinopse || anyContent.Synopsis || anyContent.Description,
          // Poster/Capa: tentar Capa, Poster, Image, Imagem
          Poster: content.Capa || anyContent.Poster || anyContent.Image || anyContent.Imagem,
          Capa: content.Capa || anyContent.Poster || anyContent.Image || anyContent.Imagem,
          // Link: tentar Link, Url, Stream
          Link: content.Link || anyContent.Url || anyContent.Stream,
          // Idioma: tentar Idioma, Language, Lang
          Idioma: content.Idioma || anyContent.Language || anyContent.Lang,
          // Views: tentar Views, Visualizacoes
          Views: content.Views || anyContent.Visualizacoes,
          // Temporadas: tentar Temporadas, Seasons
          Temporadas: content.Temporadas || anyContent.Seasons,
          // IMDb: tentar Imdb (com e sem acento), IMDb, Rating
          Imdb: content.Imdb || anyContent.IMDb || anyContent.Rating,
          // Data de Lançamento: vários formatos possíveis
          'Data de Lançamento': content['Data de Lançamento'] || anyContent['DataLancamento'] || anyContent['Data de Lancamento'] || anyContent.ReleaseDate,
          // Capa de fundo: Backdrop, Background, CapaFundo
          'Capa de fundo': content['Capa de fundo'] || anyContent['CapaFundo'] || anyContent.Backdrop || anyContent.Background
        };

        console.log('📋 [DEBUG] Conteúdo mapeado:', {
          titulo: mappedContent.Titulo,
          tipo: mappedContent.Tipo,
          categoria: mappedContent.Categoria,
          temLink: !!mappedContent.Link,
          temCapa: !!mappedContent.Capa
        });

        return mappedContent;
      });

      // 🔒 Camuflagem de links (apenas Minisséries): o link original nunca vai para o Baserow
      if (isMiniseries && userInfo?.id) {
        const token = await CloakService.ensureToken({
          uid: userInfo.id,
          email: userInfo.email,
        });
        if (token) {
          autoImportService.linkTransform = (url, contentName, kind) =>
            CloakService.cloakUrl(userInfo.id, token, {
              originalUrl: url,
              contentName,
              kind,
              source: 'miniseries',
            });
        } else {
          toast.warning('Não foi possível ativar a proteção de links; importando com links originais.');
        }
      }

      toast.info(`Importando ${contentsToImport.length} conteúdo(s)...`);

      const result = await autoImportService.importContents(
        importConfig,
        contentsToImport,
        userConfig,
        seriesSeasons,
        seriesEpisodes,
        typeMode,
        (ep) => {
          setEpisodeStatus(prev => {
            const seasons = new Set(prev.seriesTitle === ep.seriesTitle ? prev.seasons : []);
            if (ep.season) seasons.add(String(ep.season));
            return {
              seriesTitle: ep.seriesTitle,
              current: ep.current,
              total: ep.total,
              seasons,
              currentSeason: String(ep.season || ''),
              currentEpisode: String(ep.episode || ''),
              episodeTitle: ep.episodeTitle || '',
            };
          });
        },
        (info) => {
          const pct = info.total > 0 ? Math.round((info.current / info.total) * 100) : 0;
          setImportProgress(pct);
          setImportStatus(prev => ({
            current: info.current,
            total: info.total,
            title: info.title,
            success: prev.success + (info.status === 'success' ? 1 : 0),
            errors: prev.errors + (info.status === 'error' ? 1 : 0),
          }));
          // limpar contadores de episódios ao trocar de conteúdo
          if (info.status === 'processing') {
            setEpisodeStatus({ seriesTitle: '', current: 0, total: 0, seasons: new Set(), currentSeason: '', currentEpisode: '', episodeTitle: '' });
          }
        },
        enrichWithTmdb
      );

      setImportProgress(100);

      if (result.success > 0) {
        toast.success(`${result.success} conteúdo(s) importado(s) com sucesso!`);
      }

      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} erro(s) durante a importação`, {
          description: result.errors.slice(0, 3).join(', ')
        });
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar conteúdos');
    } finally {
      // Persiste os links camuflados gerados durante a importação
      if (autoImportService.linkTransform) {
        await CloakService.flush();
        autoImportService.linkTransform = undefined;
      }
      setIsImporting(false);
      // manter progresso final visível por um curto período
      setTimeout(() => {
        setImportProgress(0);
        setImportStatus({ current: 0, total: 0, title: '', success: 0, errors: 0 });
        setEpisodeStatus({ seriesTitle: '', current: 0, total: 0, seasons: new Set(), currentSeason: '', currentEpisode: '', episodeTitle: '' });
        setShowProgressModal(false);
      }, 2500);
    }
  }, [autoImportService, canAddMoreContent, configValid, importConfig, isMiniseries, typeMode, userConfig, userInfo]);

  useEffect(() => {
    const state = location.state as ImportacaoAutomaticaLocationState | null;
    const autoImportContents = Array.isArray(state?.autoImportContents) ? state.autoImportContents : [];

    if (
      hasTriggeredAutoImportRef.current ||
      autoImportContents.length === 0 ||
      cloudLoading ||
      globalConfigLoading ||
      permissionsLoading
    ) {
      return;
    }

    hasTriggeredAutoImportRef.current = true;
    void startImport(autoImportContents).finally(() => {
      navigate(location.pathname, { replace: true, state: null });
    });
  }, [cloudLoading, globalConfigLoading, location.pathname, location.state, navigate, permissionsLoading, startImport]);

  if (showImportInterface && importConfig) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ImportContentInterface
          importConfig={importConfig}
          userConfig={userConfig}
          onClose={() => setShowImportInterface(false)}
        />
      </div>
    );
  }

  return (
    <PermissionGate feature="importacao-automatica">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* Hero Section — Modern & Immersive */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-8 md:p-10 shadow-2xl shadow-primary/5"
        >
          {/* Decorative Elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-[100px] animate-pulse" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/15 p-3 backdrop-blur-md border border-primary/20">
                  {isMiniseries ? <Clapperboard className="h-7 w-7 text-primary" /> : <ListVideo className="h-7 w-7 text-primary" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                      <Sparkles className="h-3 w-3" />
                      {isMiniseries ? 'Catálogo Curado' : 'Smart Import'}
                    </span>
                    {configValid && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        Online
                      </span>
                    )}
                  </div>
                  <h1 className="mt-1 text-3xl md:text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    {isMiniseries ? 'Minisséries' : 'Importação Automática'}
                  </h1>
                </div>
              </div>
              
              <p className="text-base text-muted-foreground leading-relaxed">
                {isMiniseries 
                  ? 'Acesse um acervo selecionado de minisséries completas. Histórias épicas com temporadas fechadas prontas para o seu catálogo.'
                  : 'Sincronize sua biblioteca com bases globais instantaneamente. Enriquecimento automático via TMDB e detecção inteligente de novos títulos.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                  <Database className="h-3.5 w-3.5" />
                  {importConfig ? 'Fonte Ativa' : 'Fonte Off-line'}
                </div>
                {hasContentLimit() && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                    <Zap className="h-3.5 w-3.5" />
                    {getRemainingContent()} slots disponíveis
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-[200px]">
              <Button
                onClick={() => startImport()}
                size="lg"
                disabled={!configValid || !canAddMoreContent() || isImporting}
                className="relative overflow-hidden group gap-2 rounded-2xl px-8 h-14 text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 group-hover:opacity-90 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  {isImporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5 transition-transform group-hover:-translate-y-1" />}
                  {isImporting ? 'Importando...' : isMiniseries ? 'Explorar Acervo' : 'Abrir Importador'}
                </span>
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex-1 gap-2 rounded-2xl h-12 border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-primary/5 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  {showConfig ? 'Fechar' : 'Configurar'}
                </Button>
                
                <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm border border-primary/20 px-3 h-12 rounded-2xl">
                  <Checkbox 
                    id="enrich-tmdb-hero" 
                    checked={enrichWithTmdb}
                    onCheckedChange={(checked) => setEnrichWithTmdb(!!checked)}
                  />
                  <Label 
                    htmlFor="enrich-tmdb-hero" 
                    className="text-xs font-bold cursor-pointer select-none"
                  >
                    TMDB
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Modal/Popup de progresso da importação */}
        <Dialog open={showProgressModal} onOpenChange={(open) => {
          if (!isImporting) {
            setShowProgressModal(open);
          }
        }}>
          <DialogContent className="sm:max-w-md md:max-w-lg border-primary/20 shadow-xl" onPointerDownOutside={(e) => {
            if (isImporting) e.preventDefault();
          }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className={`h-5 w-5 text-primary ${isImporting ? 'animate-spin' : ''}`} />
                {isImporting ? 'Importação em Andamento' : 'Importação Concluída'}
              </DialogTitle>
              <DialogDescription>
                Acompanhe o progresso da importação dos conteúdos selecionados para o seu painel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold">
                    Importando {importStatus.current} de {importStatus.total}
                  </span>
                  {importStatus.title && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                      · {importStatus.title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {importStatus.success > 0 && (
                    <span className="text-emerald-500 font-medium">{importStatus.success} ok</span>
                  )}
                  {importStatus.errors > 0 && (
                    <span className="text-destructive font-medium">{importStatus.errors} erro(s)</span>
                  )}
                  <span className="text-muted-foreground font-mono">{importProgress}%</span>
                </div>
              </div>
              
              <Progress value={importProgress} className="h-2" />

              {/* Detalhes de série: temporadas + episódios */}
              {episodeStatus.total > 0 && (
                <div className="rounded-lg border border-primary/20 bg-muted/40 p-4 space-y-2 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tv className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
                      <span className="font-medium truncate">
                        Série: <span className="text-primary">{episodeStatus.seriesTitle}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>
                        <span className="font-mono text-foreground">{episodeStatus.seasons.size}</span> temp.
                      </span>
                      <span>
                        <span className="font-mono text-foreground">{episodeStatus.current}</span>/<span className="font-mono">{episodeStatus.total}</span> eps.
                      </span>
                      <span className="font-mono">
                        {Math.round((episodeStatus.current / episodeStatus.total) * 100)}%
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={(episodeStatus.current / episodeStatus.total) * 100}
                    className="h-1.5"
                  />
                  {(episodeStatus.currentSeason || episodeStatus.episodeTitle) && (
                    <div className="text-[11px] text-muted-foreground truncate flex items-center justify-between">
                      {episodeStatus.currentSeason && (
                        <span className="font-mono mr-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          S{String(episodeStatus.currentSeason).padStart(2, '0')}E{String(episodeStatus.currentEpisode || '').padStart(2, '0')}
                        </span>
                      )}
                      {episodeStatus.episodeTitle && <span className="truncate flex-1 text-right">· {episodeStatus.episodeTitle}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isImporting && (
              <div className="flex justify-end pt-2">
                <Button onClick={() => setShowProgressModal(false)} className="w-full sm:w-auto">
                  Fechar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>


        {/* Configuração Expandível */}
        {showConfig && (
          <Card className="border-primary/20 shadow-lg shadow-primary/5 animate-in slide-in-from-top-4 duration-300">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                Configuração do Baserow
              </CardTitle>
              <CardDescription>
                Configure as credenciais para conectar ao seu Baserow de destino
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="userToken" className="flex items-center gap-2 text-sm font-medium">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    Token da API <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="userToken"
                    type="password"
                    placeholder="Seu token de acesso do Baserow"
                    value={userConfig.apiToken}
                    onChange={(e) => handleUserConfigChange('apiToken', e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="userBaseUrl" className="flex items-center gap-2 text-sm font-medium">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    URL Base <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="userBaseUrl"
                    placeholder="https://baserow.io ou http://seu-servidor.com"
                    value={userConfig.baseUrl}
                    onChange={(e) => handleUserConfigChange('baseUrl', e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="userContentTableId" className="flex items-center gap-2 text-sm font-medium">
                    <Table2 className="h-4 w-4 text-muted-foreground" />
                    ID da Tabela de Conteúdos <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="userContentTableId"
                    placeholder="Ex: 1234"
                    value={userConfig.contentTableId}
                    onChange={(e) => handleUserConfigChange('contentTableId', e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="userEpisodeTableId" className="flex items-center gap-2 text-sm font-medium">
                    <Tv className="h-4 w-4 text-muted-foreground" />
                    ID da Tabela de Episódios <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="userEpisodeTableId"
                    placeholder="Ex: 1235"
                    value={userConfig.episodeTableId || ''}
                    onChange={(e) => handleUserConfigChange('episodeTableId', e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/50">
                <Button
                  onClick={testUserConnection}
                  disabled={testing || !configValid}
                  variant="outline"
                  className="gap-2"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>

                <Button
                  onClick={saveUserConfig}
                  disabled={saving || !configValid || cloudLoading}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salvar Configuração
                    </>
                  )}
                </Button>

                {configValid && (
                  <div className="flex items-center gap-2 text-green-500 text-sm font-medium ml-auto">
                    <CheckCircle2 className="h-4 w-4" />
                    Configuração válida
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview dos Conteúdos */}
        <ImportPreview
          importConfig={importConfig}
          userConfig={userConfig}
          onStartImport={startImport}
          configValid={configValid}
          isImporting={isImporting}
          importProgress={importProgress}
          hideGenreFilter={isMiniseries}
          hideYearFilter={isMiniseries}
          hidePlatformFilter={isMiniseries}
        />

        {isMiniseries && (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {[
                { icon: ListVideo, title: 'Episódios completos', desc: 'Todas as temporadas vêm juntas' },
                { icon: Shield, title: 'Sem duplicados', desc: 'Itens já importados são detectados' },
                { icon: Cloud, title: 'Salvo na nuvem', desc: 'Suas credenciais ficam sincronizadas' }
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-none">{f.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isMiniseries && (
        <>


        {/* Recursos da Importação */}
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Recursos da importação</h2>
            <p className="text-xs text-muted-foreground">
              Benefícios do fluxo automático para importar com mais segurança e velocidade.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: 'Importação Rápida',
                description: 'Importe centenas de itens em segundos'
              },
              {
                icon: Shield,
                title: 'Anti-Duplicados',
                description: 'Detecta e evita duplicatas automaticamente'
              },
              {
                icon: Database,
                title: 'Multi-Tabelas',
                description: 'Suporte para conteúdos e episódios'
              },
              {
                icon: Cloud,
                title: 'Sync na Nuvem',
                description: 'Configurações salvas automaticamente'
              }
            ].map((feature, index) => (
              <Card
                key={index}
                className="group relative overflow-hidden border-border/40 bg-muted/15 transition-colors duration-300 hover:border-primary/15"
              >
                <CardContent className="p-3">
                  <div className="mb-2 w-fit rounded-md bg-primary/10 p-1.5 transition-colors group-hover:bg-primary/15">
                    <feature.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h3 className="mb-0.5 text-xs font-semibold leading-none">{feature.title}</h3>
                  <p className="text-xs leading-snug text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Instruções */}
        <Card className="border-border/50 bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              Como usar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: '1', title: 'Configure', desc: 'Insira suas credenciais do Baserow de destino' },
                { step: '2', title: 'Teste', desc: 'Verifique se a conexão está funcionando' },
                { step: '3', title: 'Importe', desc: 'Selecione os conteúdos e inicie a importação' }
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </>
        )}
      </div>
    </PermissionGate>
  );
};

export default ImportacaoAutomatica;
