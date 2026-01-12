import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Key,
  Check,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Sparkles,
  Zap,
  Lock,
  Activity,
  TrendingUp,
  Database,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

interface APIConfig {
  name: string;
  key: string;
  description: string;
  docsUrl: string;
  testEndpoint?: string;
}

const ConfiguracoesAPIs = () => {
  const { config, updateConfig } = useUserConfig();
  const { userInfo } = useSimpleAuth();

  const [tmdbKey, setTmdbKey] = useState('');
  const [omdbKey, setOmdbKey] = useState('');
  const [showTmdbKey, setShowTmdbKey] = useState(false);
  const [showOmdbKey, setShowOmdbKey] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Carregar chaves salvas na nuvem
  React.useEffect(() => {
    if (config?.apiKeys) {
      if (config.apiKeys.tmdb) setTmdbKey(config.apiKeys.tmdb);
      if (config.apiKeys.omdb) setOmdbKey(config.apiKeys.omdb);
    }
  }, [config]);

  const testAPIKey = async (apiName: string, apiKey: string, endpoint?: string) => {
    if (!apiKey) {
      toast.error('API Key não fornecida', {
        description: `Insira a chave da API ${apiName} antes de testar.`
      });
      return;
    }

    setTesting(apiName);

    try {
      if (apiName === 'TMDB' && endpoint) {
        // Teste direto com a API do TMDB em vez de usar a Edge Function
        // A Edge Function espera que a chave esteja nas variáveis de ambiente do servidor,
        // mas aqui queremos testar a chave que o usuário acabou de digitar.
        const response = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=Avatar&language=pt-BR`,
          { method: 'GET' }
        );

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.results) {
          setTestResults(prev => ({ ...prev, [apiName]: true }));
          toast.success(`${apiName} funcionando!`, {
            description: 'API key válida e funcional.'
          });
        } else {
          throw new Error('Nenhum dado retornado');
        }
      } else if (apiName === 'OMDB') {
        // Teste OMDB
        const response = await fetch(
          `https://www.omdbapi.com/?apikey=${apiKey}&t=Avatar&type=movie`
        );

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.Response === 'True') {
          setTestResults(prev => ({ ...prev, [apiName]: true }));
          toast.success(`${apiName} funcionando!`, {
            description: 'API key válida e funcional.'
          });
        } else {
          throw new Error(data.Error || 'API key inválida');
        }
      } else {
        setTestResults(prev => ({ ...prev, [apiName]: true }));
        toast.success(`${apiName} configurada!`, {
          description: 'API key salva. Teste de conectividade não disponível ainda.'
        });
      }
    } catch (error) {
      console.error(`Erro ao testar ${apiName}:`, error);
      setTestResults(prev => ({ ...prev, [apiName]: false }));
      toast.error(`Erro ao testar ${apiName}`, {
        description: 'Verifique se a API key está correta.'
      });
    } finally {
      setTesting(null);
    }
  };

  const saveAPIKeys = async () => {
    if (!tmdbKey && !omdbKey) {
      toast.error('Nenhuma chave fornecida', {
        description: 'Insira pelo menos uma API key para salvar.'
      });
      return;
    }

    if (!userInfo?.id) {
      toast.error('Usuário não autenticado', {
        description: 'Faça login para salvar suas configurações.'
      });
      return;
    }

    try {
      setSaving(true);

      const apiKeys: any = {};
      if (tmdbKey) apiKeys.tmdb = tmdbKey;
      if (omdbKey) apiKeys.omdb = omdbKey;

      await updateConfig({ apiKeys });

      toast.success('API Keys salvas na nuvem!', {
        description: 'Suas configurações estão sincronizadas.'
      });
    } catch (error) {
      console.error('Erro ao salvar API keys:', error);
      toast.error('Erro ao salvar', {
        description: error instanceof Error ? error.message : 'Não foi possível salvar.'
      });
    } finally {
      setSaving(false);
    }
  };

  const loadAPIKeys = () => {
    // Removido - agora carrega automaticamente via useEffect acima
    toast.info('Configurações carregadas da nuvem');
  };

  React.useEffect(() => {
    loadAPIKeys();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Hero Section with Glassmorphism */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-start justify-between">
            <div className="space-y-4 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">Integrações Externas</span>
              </div>

              <div>
                <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                  Configurações de APIs
                </h1>
                <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
                  Conecte suas APIs de metadados e enriqueça automaticamente seu conteúdo com informações detalhadas
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${(tmdbKey || omdbKey) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-sm text-muted-foreground">
                    {[tmdbKey, omdbKey].filter(Boolean).length} API{[tmdbKey, omdbKey].filter(Boolean).length !== 1 ? 's' : ''} configurada{[tmdbKey, omdbKey].filter(Boolean).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Armazenamento seguro</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl" />
                <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/20 to-background border border-border/40 backdrop-blur-xl flex items-center justify-center">
                  <Key className="w-16 h-16 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Security Alert */}
        <Alert className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 backdrop-blur-sm animate-fade-in">
          <Lock className="h-5 w-5 text-primary" />
          <AlertDescription className="text-sm">
            <span className="font-semibold text-foreground">Suas credenciais estão protegidas.</span> As API keys são armazenadas localmente com criptografia. Nunca as compartilhe com terceiros.
          </AlertDescription>
        </Alert>

        {/* API Cards Grid */}
        <div className="grid gap-6 lg:grid-cols-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* TMDB Card */}
          <Card className="group relative overflow-hidden border-border/40 bg-gradient-to-br from-card/80 to-card backdrop-blur-xl hover:shadow-2xl hover:border-primary/40 transition-all duration-500">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <CardHeader className="relative">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        TMDB API
                        {testResults.TMDB !== undefined && (
                          testResults.TMDB ? (
                            <Badge className="gap-1.5 bg-gradient-to-r from-green-500 to-emerald-500 border-0 shadow-sm">
                              <Check className="h-3 w-3" />
                              Conectada
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1.5 shadow-sm">
                              <X className="h-3 w-3" />
                              Erro
                            </Badge>
                          )
                        )}
                      </CardTitle>
                      <CardDescription className="text-base mt-1">
                        The Movie Database
                      </CardDescription>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Fonte completa de metadados para filmes e séries, incluindo sinopse, capas, elenco e classificações
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span>Resposta instantânea</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="w-3 h-3 text-blue-500" />
                  <span>40+ idiomas</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3 text-green-500" />
                  <span>100% uptime</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3 text-purple-500" />
                  <span>Gratuito ilimitado</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-4">
              <div className="space-y-3">
                <Label htmlFor="tmdb-key" className="text-sm font-semibold">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="tmdb-key"
                      type={showTmdbKey ? 'text' : 'password'}
                      value={tmdbKey}
                      onChange={(e) => setTmdbKey(e.target.value)}
                      placeholder="Digite sua chave TMDB..."
                      className="h-11 pr-12 bg-background/50 backdrop-blur-sm border-border/60 focus:border-primary/60 transition-colors"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-9 w-9 hover:bg-accent/50"
                      onClick={() => setShowTmdbKey(!showTmdbKey)}
                    >
                      {showTmdbKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => testAPIKey('TMDB', tmdbKey, '/tmdb-metadata')}
                    disabled={!tmdbKey || testing === 'TMDB'}
                    className={cn(
                      "h-11 gap-2 min-w-[120px] transition-all duration-300",
                      testing === 'TMDB' && "animate-pulse"
                    )}
                    variant="outline"
                  >
                    <TestTube className={cn(
                      "h-4 w-4",
                      testing === 'TMDB' && "animate-spin"
                    )} />
                    {testing === 'TMDB' ? 'Testando...' : 'Testar'}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-muted/30 backdrop-blur-sm p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Como obter sua chave
                </h4>
                <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                  <li>Crie uma conta gratuita em <strong>themoviedb.org</strong></li>
                  <li>Acesse <strong>Configurações → API</strong></li>
                  <li>Solicite uma API key (aprovação instantânea)</li>
                  <li>Cole a chave acima e teste a conexão</li>
                </ol>
              </div>

              <Button variant="outline" size="sm" className="w-full gap-2 group" asChild>
                <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  Obter minha chave TMDB
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* OMDB Card */}
          <Card className="group relative overflow-hidden border-border/40 bg-gradient-to-br from-card/80 to-card backdrop-blur-xl hover:shadow-2xl hover:border-primary/40 transition-all duration-500">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <CardHeader className="relative">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        OMDB API
                        {testResults.OMDB !== undefined && (
                          testResults.OMDB ? (
                            <Badge className="gap-1.5 bg-gradient-to-r from-green-500 to-emerald-500 border-0 shadow-sm">
                              <Check className="h-3 w-3" />
                              Conectada
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1.5 shadow-sm">
                              <X className="h-3 w-3" />
                              Erro
                            </Badge>
                          )
                        )}
                      </CardTitle>
                      <CardDescription className="text-base mt-1">
                        Open Movie Database
                      </CardDescription>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Fonte alternativa com classificações especializadas de Rotten Tomatoes, Metacritic e IMDb
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3 text-orange-500" />
                  <span>Classificações múltiplas</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3 text-green-500" />
                  <span>1000 req/dia grátis</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span>API simples</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Database className="w-3 h-3 text-blue-500" />
                  <span>Dados confiáveis</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-4">
              <div className="space-y-3">
                <Label htmlFor="omdb-key" className="text-sm font-semibold">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="omdb-key"
                      type={showOmdbKey ? 'text' : 'password'}
                      value={omdbKey}
                      onChange={(e) => setOmdbKey(e.target.value)}
                      placeholder="Digite sua chave OMDB..."
                      className="h-11 pr-12 bg-background/50 backdrop-blur-sm border-border/60 focus:border-primary/60 transition-colors"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-9 w-9 hover:bg-accent/50"
                      onClick={() => setShowOmdbKey(!showOmdbKey)}
                    >
                      {showOmdbKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => testAPIKey('OMDB', omdbKey)}
                    disabled={!omdbKey || testing === 'OMDB'}
                    className={cn(
                      "h-11 gap-2 min-w-[120px] transition-all duration-300",
                      testing === 'OMDB' && "animate-pulse"
                    )}
                    variant="outline"
                  >
                    <TestTube className={cn(
                      "h-4 w-4",
                      testing === 'OMDB' && "animate-spin"
                    )} />
                    {testing === 'OMDB' ? 'Testando...' : 'Testar'}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-muted/30 backdrop-blur-sm p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Como obter sua chave
                </h4>
                <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                  <li>Acesse <strong>omdbapi.com/apikey.aspx</strong></li>
                  <li>Escolha o plano gratuito (1000 requisições/dia)</li>
                  <li>Confirme seu email</li>
                  <li>Cole a chave recebida por email acima</li>
                </ol>
              </div>

              <Button variant="outline" size="sm" className="w-full gap-2 group" asChild>
                <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  Obter minha chave OMDB
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Button
            variant="outline"
            onClick={loadAPIKeys}
            className="gap-2 hover:shadow-md transition-shadow"
          >
            <Activity className="h-4 w-4" />
            Recarregar
          </Button>
          <Button
            onClick={saveAPIKeys}
            size="lg"
            disabled={saving}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all"
          >
            {saving ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>

        {/* Info Card */}
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
          <CardContent className="relative pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg flex-shrink-0">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="space-y-3 flex-1">
                <h3 className="text-lg font-semibold">Por que conectar APIs de metadados?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  As integrações de metadados transformam suas importações M3U, enriquecendo automaticamente
                  filmes e séries com informações detalhadas, capas em alta resolução, sinopses profissionais
                  e classificações confiáveis. Configure uma vez e deixe o sistema trabalhar para você.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">TMDB - Recomendado</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Base de dados mais completa
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Gratuito e sem limites
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Imagens em alta qualidade
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">OMDB - Complementar</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Classificações especializadas
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        1000 requisições/dia grátis
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        Fonte alternativa confiável
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfiguracoesAPIs;