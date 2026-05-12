import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImportContentInterface } from '@/components/ImportContentInterface';
import { useAutoImportService, ImportConfig, UserConfig, ImportContent } from '@/services/AutoImportService';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useGlobalImportConfig } from '@/hooks/useGlobalImportConfig';
import { useGlobalAutomationConfig } from '@/hooks/useGlobalAutomationConfig';
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
  AlertCircle,
  CheckCircle2,
  TestTube,
  Save,
  Cloud,
  Loader2,
  Shield,
  Lock,
  Sparkles,
  Database,
  Zap,
  ArrowRight,
  Info,
  Server,
  Key,
  Table2,
  Tv
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { ImportPreview, ContentPreview } from '@/components/ImportPreview';

interface ImportacaoAutomaticaLocationState {
  autoImportContents?: ContentPreview[];
}

const ImportacaoAutomatica = () => {
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
  const [importProgress, setImportProgress] = useState(0);

  const autoImportService = useAutoImportService();
  const location = useLocation();
  const navigate = useNavigate();
  const hasTriggeredAutoImportRef = React.useRef(false);
  const { config: cloudConfig, updateConfig: updateCloudConfig, loading: cloudLoading } = useUserConfig();
  const { globalConfig, loading: globalConfigLoading } = useGlobalImportConfig();
  const { isEnabled: globalAutomationEnabled, loading: globalAutomationLoading } = useGlobalAutomationConfig();
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
    } else if (!globalConfigLoading) {
      setImportConfig(null);
    }
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

  const startImport = React.useCallback(async (selectedContents?: ContentPreview[]) => {
    if (!importConfig) {
      toast.error('O administrador ainda não configurou a origem dos conteúdos.', {
        description: 'Entre em contato com o administrador do sistema.'
      });
      return;
    }

    if (!configValid) {
      toast.error('Configure suas credenciais do Baserow antes de importar.');
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
    setImportProgress(0);

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

      toast.info(`Importando ${contentsToImport.length} conteúdo(s)...`);

      const result = await autoImportService.importContents(
        importConfig,
        contentsToImport,
        userConfig,
        undefined,
        undefined,
        typeMode
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
      setIsImporting(false);
      setImportProgress(0);
    }
  }, [autoImportService, canAddMoreContent, configValid, importConfig, typeMode, userConfig]);

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

  const usagePercentage = permissions ? Math.min((permissions.currentMonthUsage / permissions.monthlyContentLimit) * 100, 100) : 0;

  return (
    <PermissionGate feature="importacao-automatica">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {/* Kill-switch global ATIVO (admin desativou) */}
        {!globalAutomationLoading && !globalAutomationEnabled && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 flex items-start gap-4">
            <Lock className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-destructive">
                Automação desativada pelo administrador
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                A importação automática está temporariamente indisponível para todos os usuários.
                Nenhuma requisição será feita ao servidor de origem até que seja reativada no painel administrativo.
              </p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-background border border-primary/20 p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="absolute top-4 right-4 opacity-20">
            <Sparkles className="h-32 w-32 text-primary animate-pulse" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Zap className="h-4 w-4" />
              Importação Inteligente
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Importação <span className="text-primary">Automática</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl">
              Importe filmes, séries e episódios de outros Baserows com apenas alguns cliques.
              Sistema otimizado para importações em massa com detecção automática de duplicados.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                onClick={() => startImport()}
                size="lg"
                disabled={!configValid || !canAddMoreContent() || isImporting || !globalAutomationEnabled}
                className="group gap-2 text-base px-6"
              >
                {isImporting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                )}
                {isImporting ? 'Importando...' : 'Iniciar Importação'}
                {!isImporting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowConfig(!showConfig)}
                className="gap-2"
              >
                <Settings className="h-5 w-5" />
                {showConfig ? 'Ocultar' : 'Configurar'} Credenciais
              </Button>
            </div>
          </div>
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Limite de Importação */}
          {permissions && hasContentLimit() && (
            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Shield className="h-5 w-5 text-primary" />
                  Limite Mensal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-primary">{getRemainingContent()}</p>
                    <p className="text-xs text-muted-foreground">restantes este mês</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {permissions.currentMonthUsage}/{permissions.monthlyContentLimit}
                    </p>
                    <p className="text-xs text-muted-foreground">utilizados</p>
                  </div>
                </div>
                <Progress value={usagePercentage} className="h-2" />
                {!canAddMoreContent() && (
                  <div className="flex items-center gap-1 text-destructive text-xs font-medium">
                    <Lock className="h-3 w-3" />
                    Limite atingido
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status da Configuração */}
          <Card className={`relative overflow-hidden border-${configValid ? 'green-500/20' : 'orange-500/20'} bg-gradient-to-br from-card to-${configValid ? 'green' : 'orange'}-500/5`}>
            <div className={`absolute top-0 right-0 w-20 h-20 bg-${configValid ? 'green' : 'orange'}-500/10 rounded-full blur-2xl`} />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                {configValid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                )}
                Credenciais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${configValid ? 'text-green-500' : 'text-orange-500'}`}>
                {configValid ? 'Configurado' : 'Pendente'}
              </p>
              <p className="text-xs text-muted-foreground">
                {configValid ? 'Pronto para importar' : 'Configure suas credenciais'}
              </p>
            </CardContent>
          </Card>

          {/* Sincronização */}
          <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-card to-accent/5">
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent/10 rounded-full blur-2xl" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Cloud className="h-5 w-5 text-accent" />
                Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-accent">Ativo</p>
              <p className="text-xs text-muted-foreground">Configurações salvas na nuvem</p>
            </CardContent>
          </Card>
        </div>

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
        />

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
      </div>
    </PermissionGate>
  );
};

export default ImportacaoAutomatica;
