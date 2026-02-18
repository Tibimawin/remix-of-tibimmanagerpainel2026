import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, TestTube, Info, Cloud, Loader2, Tv, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { ImportConfig } from '@/services/AutoImportService';
import { useGlobalImportConfig } from '@/hooks/useGlobalImportConfig';
import { useAdminConfig } from '@/contexts/AdminConfigContext';
import { testBaserowConnection } from '@/utils/proxyRequest';

const AdminImportConfig = () => {
  const { globalConfig, loading, saveGlobalImportConfig } = useGlobalImportConfig();
  const { adminConfig, updateAdminConfig, loading: adminLoading } = useAdminConfig();
  
  const [config, setConfig] = useState<ImportConfig>({
    sourceToken: '',
    sourceBaseUrl: '',
    contentTableId: '',
    episodeTableId: '',
    isActive: false,
    episodeMatchType: 'custom',
    episodeKeyField: 'Serie',
    episodeSearchField: 'Nome'
  });
  
  const [canaisTvConfig, setCanaisTvConfig] = useState({
    sourceToken: '',
    sourceBaseUrl: '',
    sourceTableId: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingCanais, setIsTestingCanais] = useState(false);
  const [isSavingCanais, setIsSavingCanais] = useState(false);

  // Carregar configuração quando globalConfig estiver disponível
  useEffect(() => {
    if (globalConfig) {
      console.log('Carregando configuração global de importação do Firebase:', globalConfig);
      const configToLoad = {
        ...globalConfig,
        episodeMatchType: globalConfig.episodeMatchType as 'contains' | 'exact' | 'custom' || 'custom'
      };
      setConfig(configToLoad);
    }
  }, [globalConfig]);

  // Carregar configuração de canais TV quando adminConfig estiver disponível
  useEffect(() => {
    if (adminConfig?.canaisTv) {
      console.log('Carregando configuração de canais TV:', adminConfig.canaisTv);
      setCanaisTvConfig({
        sourceToken: adminConfig.canaisTv.sourceToken,
        sourceBaseUrl: adminConfig.canaisTv.sourceBaseUrl,
        sourceTableId: adminConfig.canaisTv.sourceTableId
      });
    }
  }, [adminConfig]);

  const handleInputChange = (field: keyof ImportConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleCanaisTvChange = (field: string, value: string) => {
    setCanaisTvConfig(prev => ({ ...prev, [field]: value }));
  };

  const testCanaisTvConnection = async () => {
    if (!canaisTvConfig.sourceToken || !canaisTvConfig.sourceBaseUrl || !canaisTvConfig.sourceTableId) {
      toast.error('Preencha todos os campos dos canais TV para testar a conexão.');
      return;
    }

    try {
      setIsTestingCanais(true);
      
      const result = await testBaserowConnection(
        canaisTvConfig.sourceBaseUrl,
        canaisTvConfig.sourceToken,
        canaisTvConfig.sourceTableId
      );

      if (result.success) {
        toast.success(`Conexão com canais TV bem-sucedida! ${result.count || 0} canais encontrados.`);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro no teste de conexão dos canais TV:', error);
      toast.error(`Erro na conexão dos canais TV: ${error}`);
    } finally {
      setIsTestingCanais(false);
    }
  };

  const saveCanaisTvConfig = async () => {
    if (!canaisTvConfig.sourceToken || !canaisTvConfig.sourceBaseUrl || !canaisTvConfig.sourceTableId) {
      toast.error('Preencha todos os campos dos canais TV.');
      return;
    }

    try {
      setIsSavingCanais(true);
      console.log('Salvando configuração de canais TV:', canaisTvConfig);
      
      await updateAdminConfig({
        canaisTv: canaisTvConfig
      });
      
      toast.success('Configuração de canais TV salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração de canais TV:', error);
      toast.error('Erro ao salvar configuração de canais TV.');
    } finally {
      setIsSavingCanais(false);
    }
  };

  const testConnection = async () => {
    if (!config.sourceToken || !config.sourceBaseUrl || !config.contentTableId) {
      toast.error('Preencha todos os campos obrigatórios para testar a conexão.');
      return;
    }

    try {
      setIsTesting(true);
      
      const result = await testBaserowConnection(
        config.sourceBaseUrl,
        config.sourceToken,
        config.contentTableId
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
      setIsTesting(false);
    }
  };

  const saveConfig = async () => {
    if (!config.sourceToken || !config.sourceBaseUrl || !config.contentTableId) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Salvando configuração global de importação:', config);
      
      await saveGlobalImportConfig({
        sourceToken: config.sourceToken,
        sourceBaseUrl: config.sourceBaseUrl,
        contentTableId: config.contentTableId,
        episodeTableId: config.episodeTableId,
        episodeMatchType: config.episodeMatchType || 'custom',
        episodeKeyField: config.episodeKeyField || 'Serie',
        episodeSearchField: config.episodeSearchField || 'Nome',
        isActive: config.isActive,
      });
      
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="import-automatica" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import-automatica">Importação Automática</TabsTrigger>
          <TabsTrigger value="canais-tv">Canais TV</TabsTrigger>
        </TabsList>

        <TabsContent value="import-automatica" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configuração de Importação Automática</CardTitle>
                  <CardDescription>
                    Configure as credenciais do Baserow de origem para permitir que os usuários importem conteúdos automaticamente.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Configuração Global
                  </Badge>
                  {globalConfig?.updatedAt && (
                    <Badge variant="secondary" className="text-xs">
                      Salvo: {new Date(globalConfig.updatedAt).toLocaleString('pt-BR')}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Configurações básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configurações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceToken">Token do Baserow de Origem *</Label>
                    <Input
                      id="sourceToken"
                      type="password"
                      placeholder="Token de acesso do Baserow"
                      value={config.sourceToken}
                      onChange={(e) => handleInputChange('sourceToken', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sourceBaseUrl">URL Base do Baserow *</Label>
                    <Input
                      id="sourceBaseUrl"
                      placeholder="http://exemplo.com ou https://baserow.io"
                      value={config.sourceBaseUrl}
                      onChange={(e) => handleInputChange('sourceBaseUrl', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contentTableId">ID da Tabela de Conteúdos *</Label>
                    <Input
                      id="contentTableId"
                      placeholder="ID da tabela (ex: 123)"
                      value={config.contentTableId}
                      onChange={(e) => handleInputChange('contentTableId', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="episodeTableId">ID da Tabela de Episódios</Label>
                    <Input
                      id="episodeTableId"
                      placeholder="ID da tabela (ex: 456)"
                      value={config.episodeTableId}
                      onChange={(e) => handleInputChange('episodeTableId', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Configurações avançadas de episódios */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configurações de Importação de Episódios</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Como funciona a busca de episódios:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Campo Personalizado (Recomendado):</strong> Usa o campo "Serie" para correspondência exata com o nome da série</li>
                        <li><strong>Contém:</strong> Busca episódios cujo campo selecionado contém o nome da série</li>
                        <li><strong>Exato:</strong> Busca apenas correspondência exata do nome no campo selecionado</li>
                      </ul>
                      <p className="mt-2 font-medium">💡 Dica: O modo "Campo Personalizado" com o campo "Serie" é o mais preciso para associar episódios às séries.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="episodeMatchType">Tipo de Correspondência</Label>
                    <Select 
                      value={config.episodeMatchType || 'custom'} 
                      onValueChange={(value) => handleInputChange('episodeMatchType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Campo Personalizado (Recomendado)</SelectItem>
                        <SelectItem value="contains">Contém</SelectItem>
                        <SelectItem value="exact">Exato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {config.episodeMatchType === 'custom' ? (
                    <div className="space-y-2">
                      <Label htmlFor="episodeKeyField">Campo Personalizado</Label>
                      <Input
                        id="episodeKeyField"
                        placeholder="Serie"
                        value={config.episodeKeyField || 'Serie'}
                        onChange={(e) => handleInputChange('episodeKeyField', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Campo que contém o nome da série (correspondência exata)</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="episodeSearchField">Campo de Busca</Label>
                      <Input
                        id="episodeSearchField"
                        placeholder="Nome do campo (ex: Nome, Serie)"
                        value={config.episodeSearchField || 'Nome'}
                        onChange={(e) => handleInputChange('episodeSearchField', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Campo onde buscar o nome da série nos episódios</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Campos Importados</Label>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• Nome (título do episódio)</div>
                      <div>• Link (URL do episódio)</div>
                      <div>• Temporada</div>
                      <div>• Episódio</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={config.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Ativar importação automática para usuários</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={testConnection}
                  disabled={isTesting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
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
                  onClick={saveConfig}
                  disabled={isSaving || loading}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
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
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Como configurar:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. Insira o token de acesso do seu Baserow de origem</li>
                  <li>2. Configure a URL base (HTTP ou HTTPS)</li>
                  <li>3. Insira os IDs das tabelas de conteúdos e episódios</li>
                  <li>4. Configure o tipo de busca de episódios (recomendado: "Campo Personalizado")</li>
                  <li>5. Teste a conexão para verificar se está funcionando</li>
                  <li>6. Ative a funcionalidade para os usuários</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="canais-tv" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tv className="h-5 w-5" />
                    Configuração de Canais TV
                  </CardTitle>
                  <CardDescription>
                    Configure as credenciais do Baserow de origem para permitir que os usuários importem canais de TV.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Configuração Global
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configurações da Origem dos Canais TV</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="canais-sourceToken">Token do Baserow de Origem *</Label>
                    <Input
                      id="canais-sourceToken"
                      type="password"
                      placeholder="Token de acesso do Baserow"
                      value={canaisTvConfig.sourceToken}
                      onChange={(e) => handleCanaisTvChange('sourceToken', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="canais-sourceBaseUrl">URL Base do Baserow *</Label>
                    <Input
                      id="canais-sourceBaseUrl"
                      placeholder="http://exemplo.com ou https://baserow.io"
                      value={canaisTvConfig.sourceBaseUrl}
                      onChange={(e) => handleCanaisTvChange('sourceBaseUrl', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="canais-sourceTableId">ID da Tabela de Canais *</Label>
                    <Input
                      id="canais-sourceTableId"
                      placeholder="ID da tabela (ex: 1783)"
                      value={canaisTvConfig.sourceTableId}
                      onChange={(e) => handleCanaisTvChange('sourceTableId', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={testCanaisTvConnection}
                  disabled={isTestingCanais}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isTestingCanais ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
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
                  onClick={saveCanaisTvConfig}
                  disabled={isSavingCanais || adminLoading}
                  className="flex items-center gap-2"
                >
                  {isSavingCanais ? (
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
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Como funciona:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. Configure as credenciais de origem dos canais TV aqui (apenas admins)</li>
                  <li>2. Os usuários poderão buscar e importar canais usando essas credenciais</li>
                  <li>3. Os canais serão importados diretamente para a tabela de Conteúdos do usuário</li>
                  <li>4. Os usuários não precisam saber das credenciais de origem</li>
                  <li>5. Teste a conexão para verificar se está funcionando</li>
                </ul>
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> Esta configuração é global e aplicada a todos os usuários. 
                    Apenas administradores podem alterar essas credenciais.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminImportConfig;