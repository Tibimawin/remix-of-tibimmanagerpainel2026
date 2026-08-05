
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Database, Key, Cloud, User, Save, Loader2, Shield, Film, Tv, Image, FolderOpen, Users, Calendar, LayoutGrid, Play, RotateCcw, HelpCircle, Palette, CreditCard, Zap, Star, Smartphone, Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConfig } from '@/contexts/ConfigContext';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { useUserConfig } from '@/hooks/useUserConfig';
import { toast } from 'sonner';
import { PermissionGate } from '@/components/PermissionGate';
import { Badge } from '@/components/ui/badge';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import UserSecuritySettings from '@/components/UserSecuritySettings';
import { AppearanceSettings } from '@/components/AppearanceSettings';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useNavigate, useLocation } from 'react-router-dom';

// Componente para configurações do Tutorial
const TutorialSettings: React.FC = () => {
  const { restartOnboarding } = useOnboarding();
  const navigate = useNavigate();
  
  // Verificar status do tutorial
  const hasCompleted = localStorage.getItem('onboarding-completed') === 'true';
  const hasSkipped = localStorage.getItem('onboarding-skipped') === 'true';
  
  const getTutorialStatus = () => {
    if (hasCompleted) return { label: 'Completado', color: 'bg-green-500', icon: '✓' };
    if (hasSkipped) return { label: 'Pulado', color: 'bg-yellow-500', icon: '⏭️' };
    return { label: 'Pendente', color: 'bg-blue-500', icon: '⏳' };
  };
  
  const status = getTutorialStatus();

  const handleRestartTutorial = () => {
    restartOnboarding();
    toast.success('Tutorial reiniciado! Redirecionando para o Dashboard...');
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Tutorial do Sistema
        </CardTitle>
        <CardDescription>
          Gerencie o tutorial interativo do painel administrativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col space-y-4">
          {/* Status do Tutorial */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground mb-1">Status do Tutorial</h4>
                <p className="text-sm text-muted-foreground">
                  {hasCompleted 
                    ? 'Você completou o tutorial com sucesso!' 
                    : hasSkipped 
                      ? 'Você pulou o tutorial anteriormente.'
                      : 'O tutorial ainda não foi iniciado.'}
                </p>
              </div>
              <Badge className={`${status.color} text-white px-3 py-1`}>
                <span className="mr-1">{status.icon}</span>
                {status.label}
              </Badge>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border border-border/40">
            <h4 className="font-medium text-foreground mb-2">Sobre o Tutorial</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O tutorial interativo guia você pelas principais funcionalidades do painel administrativo, 
              incluindo navegação, gestão de conteúdo, modos de operação (Thiago/Francisco) e configurações. 
              Ele é exibido automaticamente para novos usuários, mas você pode reiniciá-lo a qualquer momento.
            </p>
          </div>

          <div className="bg-gradient-to-r from-primary/5 to-orange-500/5 rounded-lg p-4 border border-primary/20">
            <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              Reiniciar Tutorial
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Deseja rever o tutorial completo? Clique no botão abaixo para reiniciar o guia interativo.
            </p>
            <Button 
              onClick={handleRestartTutorial}
              className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reiniciar Tutorial
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>💡 <strong>Dica:</strong> O tutorial cobre navegação, gestão de conteúdo, modos Thiago/Francisco e configurações do sistema.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Configuracoes = () => {
  const { config, updateConfig, loading: configLoading } = useConfig();
  const { mode } = useTypeMode();
  const { config: userConfig, loading: userConfigLoading } = useUserConfig();
  const { userInfo } = useSimpleAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [saving, setSaving] = useState(false);

  const SAVE_TIMEOUT_MS = 15000;
  const [lastSaveStatus, setLastSaveStatus] = useState<'idle' | 'success' | 'error' | 'quota' | 'timeout'>('idle');
  const [lastSaveAt, setLastSaveAt] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    baseUrl: config?.baseUrl || '',
    apiToken: config?.apiToken || '',
    tableIds: {
      conteudos: config?.tableIds?.conteudos || '',
      episodios: config?.tableIds?.episodios || '',
      banners: config?.tableIds?.banners || '',
      categorias: config?.tableIds?.categorias || '',
      categoriasTV: config?.tableIds?.categoriasTV || '',
      categoriasAnime: config?.tableIds?.categoriasAnime || '',
      usuarios: config?.tableIds?.usuarios || '',
      sessoes: config?.tableIds?.sessoes || '',
      plataformas: config?.tableIds?.plataformas || '',
      canaisTv: config?.tableIds?.canaisTv || '',
      planos: config?.tableIds?.planos || '',
      // Tabelas do Modo Tibim
      carrosseu: config?.tableIds?.carrosseu || '',
      versao: config?.tableIds?.versao || '',
      pedido: config?.tableIds?.pedido || '',
      avaliacao: config?.tableIds?.avaliacao || '',
      plano2: config?.tableIds?.plano2 || '',
      categoriaFilmes: config?.tableIds?.categoriaFilmes || '',
      categoriaSeries: config?.tableIds?.categoriaSeries || '',
      categoriaDorama: config?.tableIds?.categoriaDorama || '',
      categoriaAnimes: config?.tableIds?.categoriaAnimes || '',
      categoriaNovelas: config?.tableIds?.categoriaNovelas || '',
      perfil: config?.tableIds?.perfil || '',
      meusAplicativos: config?.tableIds?.meusAplicativos || '',
      jogosDia: config?.tableIds?.jogosDia || '',
    }
  });

  // Atualizar formulário quando a configuração carregar
  useEffect(() => {
    if (config) {
      setFormData({
        baseUrl: config.baseUrl || '',
        apiToken: config.apiToken || '',
        tableIds: {
          conteudos: config.tableIds?.conteudos || '',
          episodios: config.tableIds?.episodios || '',
          banners: config.tableIds?.banners || '',
          categorias: config.tableIds?.categorias || '',
          categoriasTV: config.tableIds?.categoriasTV || '',
          categoriasAnime: config.tableIds?.categoriasAnime || '',
          usuarios: config.tableIds?.usuarios || '',
          sessoes: config.tableIds?.sessoes || '',
          plataformas: config.tableIds?.plataformas || '',
          canaisTv: config.tableIds?.canaisTv || '',
          planos: config.tableIds?.planos || '',
          // Tabelas do Modo Tibim
          carrosseu: config.tableIds?.carrosseu || '',
          versao: config.tableIds?.versao || '',
          pedido: config.tableIds?.pedido || '',
          avaliacao: config.tableIds?.avaliacao || '',
          plano2: config.tableIds?.plano2 || '',
          categoriaFilmes: config.tableIds?.categoriaFilmes || '',
          categoriaSeries: config.tableIds?.categoriaSeries || '',
          categoriaDorama: config.tableIds?.categoriaDorama || '',
          categoriaAnimes: config.tableIds?.categoriaAnimes || '',
          categoriaNovelas: config.tableIds?.categoriaNovelas || '',
          perfil: config.tableIds?.perfil || '',
          meusAplicativos: config.tableIds?.meusAplicativos || '',
          jogosDia: config.tableIds?.jogosDia || '',
        }
      });
    }
  }, [config]);

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('tableIds.')) {
      const tableField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        tableIds: {
          ...prev.tableIds,
          [tableField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    const isLoading = configLoading || userConfigLoading;

    // Evitar salvar enquanto ainda está carregando
    if (isLoading) {
      toast.error('As configurações ainda estão carregando. Aguarde alguns segundos e tente novamente.');
      return;
    }

    // Validar dados antes de salvar
    if (!formData.baseUrl || !formData.apiToken) {
      toast.error('URL do Baserow e Token da API são obrigatórios');
      return;
    }

    // Validar URL
    try {
      new URL(formData.baseUrl);
    } catch {
      toast.error('URL do Baserow inválida. Use o formato: http://seu-servidor.com');
      return;
    }

    console.log('💾 [CONFIG-UI] Iniciando salvamento de configurações...', {
      baseUrl: formData.baseUrl,
      apiTokenPreview: formData.apiToken?.slice(0, 4),
      tableIds: formData.tableIds,
    });

    try {
      setSaving(true);

      const savePromise = updateConfig(formData);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout ao salvar configurações do Baserow')),
          SAVE_TIMEOUT_MS,
        ),
      );

      await Promise.race([savePromise, timeoutPromise]);

      setLastSaveStatus('success');
      setLastSaveAt(new Date().toISOString());
      toast.success('Configurações salvas com sucesso!');
      console.log('✅ [CONFIG-UI] Configurações salvas com sucesso');
    } catch (error: any) {
      console.error('❌ [CONFIG-UI] Erro ao salvar configurações:', error);
      const message = String(error?.message || '');

      if (message.includes('Timeout ao salvar configurações')) {
        setLastSaveStatus('timeout');
        toast.error('Demorou muito para salvar. Verifique sua conexão e tente novamente.');
      } else if (
        message.toLowerCase().includes('quota') ||
        message.includes('resource-exhausted') ||
        message.includes('Quota exceeded')
      ) {
        setLastSaveStatus('quota');
        toast.error('Limite de uso do Firestore atingido. Tente novamente após o reset diário ou ajuste o uso.');
      } else if (message.includes('permission-denied')) {
        setLastSaveStatus('error');
        toast.error('Sem permissão para salvar configurações. Verifique suas credenciais de acesso.');
      } else {
        setLastSaveStatus('error');
        toast.error('Erro ao salvar configurações. Verifique sua conexão e tente novamente.');
      }

      setLastSaveAt(new Date().toISOString());
    } finally {
      setSaving(false);
      console.log('🔁 [CONFIG-UI] Estado de salvamento resetado (saving = false)');
    }
  };

  const handleTestConnection = async () => {
    try {
      setSaving(true);

      if (!formData.baseUrl || !formData.apiToken) {
        toast.error('URL do Baserow e Token da API são obrigatórios para testar');
        return;
      }

      toast.info('Testando conexão com o Baserow...');

      const { BaserowService } = await import('@/services/BaserowService');
      const testService = new BaserowService(formData.apiToken, formData.baseUrl);

      const testTableId = formData.tableIds.conteudos || formData.tableIds.episodios;

      if (!testTableId) {
        toast.warning('Configure pelo menos um ID de tabela para testar a conexão');
        return;
      }

      await testService.getTableData(testTableId, 1, 1);
      toast.success('✅ Conexão estabelecida com sucesso!');
    } catch (error: any) {
      console.error('Erro ao testar conexão:', error);
      if (error.message?.includes('401') || error.message?.includes('403')) {
        toast.error('❌ Token de API inválido');
      } else if (error.message?.includes('404')) {
        toast.error('❌ ID da tabela não encontrado');
      } else {
        toast.error('❌ Erro ao conectar ao Baserow');
      }
    } finally {
      setSaving(false);
    }
  };

  const isLoading = configLoading || userConfigLoading;

  return (
    <PermissionGate feature="configuracoes">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Configurações
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure as integrações e configurações do seu painel
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Salvo na Nuvem
            </Badge>
            {userConfig?.lastUpdated && (
              <Badge variant="secondary" className="text-xs">
                Atualizado: {new Date(userConfig.lastUpdated).toLocaleString('pt-BR')}
              </Badge>
            )}
          </div>
        </div>

        {/* Abas de Configurações */}
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Aparência</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="tutorial" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Tutorial</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-6 mt-6">
            {/* Configurações de API */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Configurações de API
                </CardTitle>
                <CardDescription>
                  Configure sua integração com Baserow e outras APIs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="baseUrl">URL do Baserow</Label>
                    <Input
                      id="baseUrl"
                      placeholder="https://seu-baserow.com"
                      value={formData.baseUrl}
                      onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiToken">Token da API</Label>
                    <Input
                      id="apiToken"
                      type="password"
                      placeholder="Seu token de API"
                      value={formData.apiToken}
                      onChange={(e) => handleInputChange('apiToken', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurações de Tabelas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  IDs das Tabelas
                </CardTitle>
                <CardDescription>
                  Configure os IDs das tabelas do Baserow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === 'tibim' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Conteúdos */}
                    <div className="space-y-1">
                      <Label htmlFor="conteudos" className="flex items-center gap-2">
                        <Film className="h-4 w-4 text-orange-500" />
                        Tabela de Conteúdos (Tibim)
                      </Label>
                      <Input
                        id="conteudos"
                        placeholder="ID da tabela"
                        value={formData.tableIds.conteudos}
                        onChange={(e) => handleInputChange('tableIds.conteudos', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Filmes, séries e outros conteúdos principais</p>
                    </div>

                    {/* Episódios */}
                    <div className="space-y-1">
                      <Label htmlFor="episodios" className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-orange-500" />
                        Tabela de Episódios (Tibim)
                      </Label>
                      <Input
                        id="episodios"
                        placeholder="ID da tabela"
                        value={formData.tableIds.episodios}
                        onChange={(e) => handleInputChange('tableIds.episodios', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Episódios de séries e animes</p>
                    </div>

                    {/* Canais de TV */}
                    <div className="space-y-1">
                      <Label htmlFor="canaisTv" className="flex items-center gap-2">
                        <Tv className="h-4 w-4 text-orange-500" />
                        Tabela de Canais de TV (Tibim)
                      </Label>
                      <Input
                        id="canaisTv"
                        placeholder="ID da tabela"
                        value={formData.tableIds.canaisTv}
                        onChange={(e) => handleInputChange('tableIds.canaisTv', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Canais de TV ao vivo e IPTV</p>
                    </div>

                    {/* Jogos do Dia */}
                    <div className="space-y-1" id="jogosDia-field">
                      <Label htmlFor="jogosDia" className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-orange-500" />
                        Tabela de Jogos do Dia (Tibim)
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">
                          Obrigatório
                        </span>
                      </Label>
                      <Input
                        id="jogosDia"
                        placeholder="ID da tabela"
                        value={formData.tableIds.jogosDia}
                        onChange={(e) => handleInputChange('tableIds.jogosDia', e.target.value)}
                        className="focus-visible:ring-yellow-500"
                      />
                      <p className="text-xs text-muted-foreground">Tabela destino para importação de jogos esportivos</p>
                    </div>

                    {/* Planos 1 */}
                    <div className="space-y-1">
                      <Label htmlFor="planos" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-orange-500" />
                        Tabela de Planos 1 (Tibim)
                      </Label>
                      <Input
                        id="planos"
                        placeholder="ID da tabela"
                        value={formData.tableIds.planos}
                        onChange={(e) => handleInputChange('tableIds.planos', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Tabela com os planos de assinatura principais</p>
                    </div>

                    {/* Planos 2 */}
                    <div className="space-y-1">
                      <Label htmlFor="plano2" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-orange-500" />
                        Tabela de Planos 2 (Tibim)
                      </Label>
                      <Input
                        id="plano2"
                        placeholder="ID da tabela"
                        value={formData.tableIds.plano2 || ''}
                        onChange={(e) => handleInputChange('tableIds.plano2', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Tabela com os planos de assinatura adicionais</p>
                    </div>

                    {/* Carrossel */}
                    <div className="space-y-1">
                      <Label htmlFor="carrosseu" className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-orange-500" />
                        Tabela de Carrossel (Tibim)
                      </Label>
                      <Input
                        id="carrosseu"
                        placeholder="ID da tabela"
                        value={formData.tableIds.carrosseu || ''}
                        onChange={(e) => handleInputChange('tableIds.carrosseu', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Banners e destaques rotativos</p>
                    </div>

                    {/* Versão */}
                    <div className="space-y-1">
                      <Label htmlFor="versao" className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-500" />
                        Tabela Versão (Tibim)
                      </Label>
                      <Input
                        id="versao"
                        placeholder="ID da tabela"
                        value={formData.tableIds.versao || ''}
                        onChange={(e) => handleInputChange('tableIds.versao', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Controle de atualizações da aplicação</p>
                    </div>

                    {/* Pedido */}
                    <div className="space-y-1">
                      <Label htmlFor="pedido" className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-500" />
                        Tabela Pedido (Tibim)
                      </Label>
                      <Input
                        id="pedido"
                        placeholder="ID da tabela"
                        value={formData.tableIds.pedido || ''}
                        onChange={(e) => handleInputChange('tableIds.pedido', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Pedidos de conteúdos feitos por usuários</p>
                    </div>

                    {/* Avaliação */}
                    <div className="space-y-1">
                      <Label htmlFor="avaliacao" className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-orange-500" />
                        Tabela Avaliação (Tibim)
                      </Label>
                      <Input
                        id="avaliacao"
                        placeholder="ID da tabela"
                        value={formData.tableIds.avaliacao || ''}
                        onChange={(e) => handleInputChange('tableIds.avaliacao', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Avaliações e comentários de usuários</p>
                    </div>

                    {/* Categoria Filmes */}
                    <div className="space-y-1">
                      <Label htmlFor="categoriaFilmes" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-orange-500" />
                        Categoria Filmes (Tibim)
                      </Label>
                      <Input
                        id="categoriaFilmes"
                        placeholder="ID da tabela"
                        value={formData.tableIds.categoriaFilmes || ''}
                        onChange={(e) => handleInputChange('tableIds.categoriaFilmes', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Categorias exclusivas para filmes</p>
                    </div>

                    {/* Categoria Séries */}
                    <div className="space-y-1">
                      <Label htmlFor="categoriaSeries" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-orange-500" />
                        Categoria Séries (Tibim)
                      </Label>
                      <Input
                        id="categoriaSeries"
                        placeholder="ID da tabela"
                        value={formData.tableIds.categoriaSeries || ''}
                        onChange={(e) => handleInputChange('tableIds.categoriaSeries', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Categorias exclusivas para séries</p>
                    </div>

                    {/* Categoria Dorama */}
                    <div className="space-y-1">
                      <Label htmlFor="categoriaDorama" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-orange-500" />
                        Categoria Dorama (Tibim)
                      </Label>
                      <Input
                        id="categoriaDorama"
                        placeholder="ID da tabela"
                        value={formData.tableIds.categoriaDorama || ''}
                        onChange={(e) => handleInputChange('tableIds.categoriaDorama', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Categorias exclusivas para doramas</p>
                    </div>

                    {/* Categoria Animes */}
                    <div className="space-y-1">
                      <Label htmlFor="categoriaAnimes" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-orange-500" />
                        Categoria Animes (Tibim)
                      </Label>
                      <Input
                        id="categoriaAnimes"
                        placeholder="ID da tabela"
                        value={formData.tableIds.categoriaAnimes || ''}
                        onChange={(e) => handleInputChange('tableIds.categoriaAnimes', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Categorias exclusivas para animes</p>
                    </div>

                    {/* Categoria Novelas */}
                    <div className="space-y-1">
                      <Label htmlFor="categoriaNovelas" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-orange-500" />
                        Categoria Novelas (Tibim)
                      </Label>
                      <Input
                        id="categoriaNovelas"
                        placeholder="ID da tabela"
                        value={formData.tableIds.categoriaNovelas || ''}
                        onChange={(e) => handleInputChange('tableIds.categoriaNovelas', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Categorias exclusivas para novelas</p>
                    </div>

                    {/* Perfil */}
                    <div className="space-y-1">
                      <Label htmlFor="perfil" className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-500" />
                        Tabela de Perfil (Tibim)
                      </Label>
                      <Input
                        id="perfil"
                        placeholder="ID da tabela"
                        value={formData.tableIds.perfil || ''}
                        onChange={(e) => handleInputChange('tableIds.perfil', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Perfis de visualização dos clientes</p>
                    </div>

                    {/* Meus Aplicativos */}
                    <div className="space-y-1">
                      <Label htmlFor="meusAplicativos" className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-orange-500" />
                        Tabela Meus Aplicativos (Tibim)
                      </Label>
                      <Input
                        id="meusAplicativos"
                        placeholder="ID da tabela"
                        value={formData.tableIds.meusAplicativos || ''}
                        onChange={(e) => handleInputChange('tableIds.meusAplicativos', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Aplicativos disponíveis para download dos clientes</p>
                    </div>

                    {/* Categoria TV */}
                    <div className="space-y-1">
                      <Label htmlFor="categoriasTV" className="flex items-center gap-2">
                        <Tv className="h-4 w-4 text-orange-500" />
                        Tabela Categoria TV (Tibim)
                      </Label>
                      <Input
                        id="categoriasTV"
                        placeholder="ID da tabela"
                        value={formData.tableIds.categoriasTV || ''}
                        onChange={(e) => handleInputChange('tableIds.categoriasTV', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Categorias específicas para canais de TV</p>
                    </div>

                    {/* Tabela de Usuários */}
                    <div className="space-y-1">
                      <Label htmlFor="usuarios" className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-500" />
                        Tabela de Usuários (Tibim)
                      </Label>
                      <Input
                        id="usuarios"
                        placeholder="ID da tabela"
                        value={formData.tableIds.usuarios || ''}
                        onChange={(e) => handleInputChange('tableIds.usuarios', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Usuários e gerenciamento de assinaturas</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tabela de Conteúdos */}
                    <div className="space-y-1">
                      <Label htmlFor="conteudos" className="flex items-center gap-2">
                        <Film className="h-4 w-4 text-primary" />
                        Tabela de Conteúdos
                      </Label>
                      <Input
                        id="conteudos"
                        placeholder="ID da tabela"
                        value={formData.tableIds.conteudos}
                        onChange={(e) => handleInputChange('tableIds.conteudos', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Filmes, séries e outros conteúdos principais</p>
                    </div>

                    {/* Tabela de Episódios */}
                    <div className="space-y-1">
                      <Label htmlFor="episodios" className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-primary" />
                        Tabela de Episódios
                      </Label>
                      <Input
                        id="episodios"
                        placeholder="ID da tabela"
                        value={formData.tableIds.episodios}
                        onChange={(e) => handleInputChange('tableIds.episodios', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Episódios de séries e animes</p>
                    </div>

                    {/* Tabela de Banners */}
                    <div className="space-y-1">
                      <Label htmlFor="banners" className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-primary" />
                        Tabela de Banners
                      </Label>
                      <Input
                        id="banners"
                        placeholder="ID da tabela"
                        value={formData.tableIds.banners}
                        onChange={(e) => handleInputChange('tableIds.banners', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Banners promocionais e destaques</p>
                    </div>

                    {/* Tabela de Categorias */}
                    <div className="space-y-1">
                      <Label htmlFor="categorias" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        Tabela de Categorias
                      </Label>
                      <Input
                        id="categorias"
                        placeholder="ID da tabela"
                        value={formData.tableIds.categorias}
                        onChange={(e) => handleInputChange('tableIds.categorias', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Categorias gerais de conteúdo (Ação, Comédia, etc.)</p>
                    </div>

                    {/* Tabela de Categorias TV */}
                    <div className="space-y-1">
                      <Label htmlFor="categoriasTV" className="flex items-center gap-2">
                        <Tv className="h-4 w-4 text-primary" />
                        Tabela de Categorias TV
                      </Label>
                      <Input
                        id="categoriasTV"
                        placeholder="ID da tabela"
                        value={formData.tableIds.categoriasTV}
                        onChange={(e) => handleInputChange('tableIds.categoriasTV', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Categorias específicas para canais de TV</p>
                    </div>

                    {/* Tabela de Categorias Anime (Plural Only) */}
                    {mode === 'plural' && (
                      <div className="space-y-1">
                        <Label htmlFor="categoriasAnime" className="flex items-center gap-2">
                          <Film className="h-4 w-4 text-primary" />
                          Tabela de Categorias Anime
                        </Label>
                        <Input
                          id="categoriasAnime"
                          placeholder="ID da tabela"
                          value={formData.tableIds.categoriasAnime}
                          onChange={(e) => handleInputChange('tableIds.categoriasAnime', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Categorias específicas para animes</p>
                      </div>
                    )}

                    {/* Tabela de Usuários */}
                    <div className="space-y-1">
                      <Label htmlFor="usuarios" className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Tabela de Usuários
                      </Label>
                      <Input
                        id="usuarios"
                        placeholder="ID da tabela"
                        value={formData.tableIds.usuarios}
                        onChange={(e) => handleInputChange('tableIds.usuarios', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Dados de usuários e assinaturas</p>
                    </div>

                    {/* Tabela de Sessões */}
                    <div className="space-y-1">
                      <Label htmlFor="sessoes" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        Tabela de Sessões
                      </Label>
                      <Input
                        id="sessoes"
                        placeholder="ID da tabela"
                        value={formData.tableIds.sessoes}
                        onChange={(e) => handleInputChange('tableIds.sessoes', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Sessões ativas e controle de acesso</p>
                    </div>

                    {/* Tabela de Plataformas */}
                    <div className="space-y-1">
                      <Label htmlFor="plataformas" className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                        Tabela de Plataformas
                      </Label>
                      <Input
                        id="plataformas"
                        placeholder="ID da tabela"
                        value={formData.tableIds.plataformas}
                        onChange={(e) => handleInputChange('tableIds.plataformas', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Plataformas de streaming disponíveis</p>
                    </div>

                    {/* Tabela de Canais de TV */}
                    <div className="space-y-1">
                      <Label htmlFor="canaisTv" className="flex items-center gap-2">
                        <Tv className="h-4 w-4 text-primary" />
                        Tabela de Canais de TV
                      </Label>
                      <Input
                        id="canaisTv"
                        placeholder="ID da tabela"
                        value={formData.tableIds.canaisTv}
                        onChange={(e) => handleInputChange('tableIds.canaisTv', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Canais de TV ao vivo e IPTV</p>
                    </div>

                    {/* Tabela de Planos */}
                    <div className="space-y-1">
                      <Label htmlFor="planos" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Tabela de Planos
                      </Label>
                      <Input
                        id="planos"
                        placeholder="ID da tabela"
                        value={formData.tableIds.planos}
                        onChange={(e) => handleInputChange('tableIds.planos', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Planos de assinatura disponíveis</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex justify-end gap-3 w-full">
                <Button
                  onClick={handleTestConnection}
                  disabled={saving || isLoading}
                  variant="outline"
                  className="px-6"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Testar Conexão
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || isLoading}
                  className="px-8"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
              {lastSaveAt && (
                <p className="text-xs text-muted-foreground">
                  Última tentativa de salvamento:{' '}
                  {new Date(lastSaveAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {' '}
                  —{' '}
                  {lastSaveStatus === 'success'
                    ? 'ok'
                    : lastSaveStatus === 'timeout'
                    ? 'demorou demais (timeout)'
                    : lastSaveStatus === 'quota'
                    ? 'falhou (limite diário do Firestore atingido)'
                    : lastSaveStatus === 'error'
                    ? 'falhou'
                    : ''}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="mt-6">
            <AppearanceSettings />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <UserSecuritySettings />
          </TabsContent>

          <TabsContent value="tutorial" className="mt-6">
            <TutorialSettings />
          </TabsContent>
        </Tabs>

        {/* Informações sobre o usuário atual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Usuário
            </CardTitle>
            <CardDescription>
              Dados da sua sessão atual e isolamento de configurações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium text-foreground">Email:</label>
                <div className="text-muted-foreground">{userInfo?.email || 'Não disponível'}</div>
              </div>
              <div>
                <label className="font-medium text-foreground">ID do Usuário:</label>
                <div className="text-muted-foreground font-mono text-xs">{userInfo?.id || 'Não disponível'}</div>
              </div>
              <div>
                <label className="font-medium text-foreground">Configuração Ativa:</label>
                <div className="text-muted-foreground">
                  {userConfig ? (
                    <Badge variant="default" className="text-xs">
                      Configurada ({userConfig.userId === userInfo?.id ? 'Válida' : 'ERRO!'})
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Não configurada</Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="font-medium text-foreground">Status de Isolamento:</label>
                <div className="text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    🔒 Dados Isolados por Usuário
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações sobre sincronização */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Sincronização de Dados
            </CardTitle>
            <CardDescription>
              Suas configurações são automaticamente sincronizadas e salvas na nuvem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Todas as suas configurações são salvas automaticamente na sua conta pessoal</p>
              <p>• Cada usuário possui configurações completamente isoladas e privadas</p>
              <p>• Você pode acessar suas configurações de qualquer dispositivo com seu login</p>
              <p>• As alterações são sincronizadas em tempo real apenas para sua conta</p>
              <p>• Backup automático e seguro de todas as suas configurações</p>
              <p>• Seus dados nunca são compartilhados com outros usuários</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
};

export default Configuracoes;
