
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Database, Key, Cloud, User, Save, Loader2, Shield } from 'lucide-react';
import { useConfig } from '@/contexts/ConfigContext';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { useUserConfig } from '@/hooks/useUserConfig';
import { toast } from 'sonner';
import { PermissionGate } from '@/components/PermissionGate';
import { Badge } from '@/components/ui/badge';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import UserSecuritySettings from '@/components/UserSecuritySettings';

const Configuracoes = () => {
  const { config, updateConfig, loading: configLoading } = useConfig();
  const { mode } = useTypeMode();
  const { config: userConfig, loading: userConfigLoading } = useUserConfig();
  const { userInfo } = useSimpleAuth();
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
      canaisTv: config?.tableIds?.canaisTv || ''
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
          canaisTv: config.tableIds?.canaisTv || ''
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Configurações de API
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Segurança da Conta
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="conteudos">Tabela de Conteúdos</Label>
                    <Input
                      id="conteudos"
                      placeholder="ID da tabela"
                      value={formData.tableIds.conteudos}
                      onChange={(e) => handleInputChange('tableIds.conteudos', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="episodios">Tabela de Episódios</Label>
                    <Input
                      id="episodios"
                      placeholder="ID da tabela"
                      value={formData.tableIds.episodios}
                      onChange={(e) => handleInputChange('tableIds.episodios', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="banners">Tabela de Banners</Label>
                    <Input
                      id="banners"
                      placeholder="ID da tabela"
                      value={formData.tableIds.banners}
                      onChange={(e) => handleInputChange('tableIds.banners', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="categorias">Tabela de Categorias</Label>
                    <Input
                      id="categorias"
                      placeholder="ID da tabela"
                      value={formData.tableIds.categorias}
                      onChange={(e) => handleInputChange('tableIds.categorias', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoriasTV" className="flex items-center gap-2">
                      Tabela de Categorias TV
                      <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs px-1.5 py-0.5 animate-pulse">
                        NOVO
                      </Badge>
                    </Label>
                    <Input
                      id="categoriasTV"
                      placeholder="ID da tabela"
                      value={formData.tableIds.categoriasTV}
                      onChange={(e) => handleInputChange('tableIds.categoriasTV', e.target.value)}
                    />
                  </div>
                  {mode === 'plural' && (
                    <div>
                      <Label htmlFor="categoriasAnime" className="flex items-center gap-2">
                        Tabela de Categorias Anime
                        <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs px-1.5 py-0.5 animate-pulse">
                          NOVO
                        </Badge>
                      </Label>
                      <Input
                        id="categoriasAnime"
                        placeholder="ID da tabela"
                        value={formData.tableIds.categoriasAnime}
                        onChange={(e) => handleInputChange('tableIds.categoriasAnime', e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="usuarios">Tabela de Usuários</Label>
                    <Input
                      id="usuarios"
                      placeholder="ID da tabela"
                      value={formData.tableIds.usuarios}
                      onChange={(e) => handleInputChange('tableIds.usuarios', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessoes">Tabela de Sessões</Label>
                    <Input
                      id="sessoes"
                      placeholder="ID da tabela"
                      value={formData.tableIds.sessoes}
                      onChange={(e) => handleInputChange('tableIds.sessoes', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="plataformas">Tabela de Plataformas</Label>
                    <Input
                      id="plataformas"
                      placeholder="ID da tabela"
                      value={formData.tableIds.plataformas}
                      onChange={(e) => handleInputChange('tableIds.plataformas', e.target.value)}
                    />
                  </div>
                  {mode === 'plural' && (
                    <div>
                      <Label htmlFor="canaisTv" className="flex items-center gap-2">
                        Tabela de Canais de TV
                        <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs px-1.5 py-0.5 animate-pulse">
                          NOVO
                        </Badge>
                      </Label>
                      <Input
                        id="canaisTv"
                        placeholder="ID da tabela"
                        value={formData.tableIds.canaisTv}
                        onChange={(e) => handleInputChange('tableIds.canaisTv', e.target.value)}
                      />
                    </div>
                  )}
                </div>
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

          <TabsContent value="security" className="mt-6">
            <UserSecuritySettings />
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
