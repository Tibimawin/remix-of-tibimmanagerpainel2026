import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, RefreshCw, Eye, EyeOff, CheckCircle, XCircle, Code, Terminal, Zap, Shield, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ApiKeyService, ApiKeyData } from '@/services/ApiKeyService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

const MinhaApi = () => {
  const { userInfo } = useSimpleAuth();
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [testEndpoint, setTestEndpoint] = useState('conteudos');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const loadKeys = async () => {
    if (!userInfo?.id) {
      console.log('⚠️ [MinhaApi] userInfo.id não disponível, pulando carregamento');
      return;
    }
    try {
      setLoading(true);
      console.log('🔑 [MinhaApi] Carregando chaves para userId:', userInfo.id, 'email:', userInfo.email);
      const userKeys = await ApiKeyService.listUserKeys(userInfo.id);
      console.log('🔑 [MinhaApi] Chaves encontradas:', userKeys.length, userKeys.map(k => ({ id: k.id, userId: k.userId, name: k.name })));
      setKeys(userKeys);
    } catch (err: any) {
      console.error('❌ [MinhaApi] Erro ao carregar chaves:', err.message, err);
      toast.error('Erro ao carregar chaves: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadKeys(); }, [userInfo?.id]);

  const handleGenerate = async () => {
    if (!userInfo?.id || !userInfo?.email) return;
    try {
      setGenerating(true);
      await ApiKeyService.generateApiKey(userInfo.id, userInfo.email, newKeyName || 'Minha API Key');
      setNewKeyName('');
      toast.success('API Key gerada com sucesso!');
      loadKeys();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar chave');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await ApiKeyService.revokeKey(keyId);
      toast.success('Chave desativada');
      loadKeys();
    } catch { toast.error('Erro ao desativar chave'); }
  };

  const handleActivate = async (keyId: string) => {
    try {
      await ApiKeyService.activateKey(keyId);
      toast.success('Chave reativada');
      loadKeys();
    } catch { toast.error('Erro ao reativar chave'); }
  };

  const handleDelete = async (keyId: string) => {
    try {
      await ApiKeyService.deleteKey(keyId);
      toast.success('Chave excluída');
      loadKeys();
    } catch { toast.error('Erro ao excluir chave'); }
  };

  const handleRegenerate = async (keyId: string) => {
    try {
      await ApiKeyService.regenerateKey(keyId);
      toast.success('Nova chave gerada!');
      loadKeys();
    } catch { toast.error('Erro ao regenerar chave'); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key: string) => key.substring(0, 12) + '••••••••••••••••••••';

  const handleTestApi = async () => {
    const activeKey = keys.find(k => k.active);
    if (!activeKey) {
      toast.error('Nenhuma chave ativa para testar');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const url = `/api/public-api?api_key=${activeKey.key}&endpoint=${testEndpoint}&size=2`;
      const resp = await fetch(url);
      const data = await resp.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResult(JSON.stringify({ error: 'Erro ao testar API' }, null, 2));
    } finally {
      setTesting(false);
    }
  };

  const baseUrl = window.location.origin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="w-7 h-7 text-primary" />
            Integração API
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere chaves de API para integrar conteúdos no seu site ou aplicativo
          </p>
        </div>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="w-4 h-4" /> Minhas Chaves
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Documentação
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Testar API
          </TabsTrigger>
        </TabsList>

        {/* === KEYS TAB === */}
        <TabsContent value="keys" className="space-y-4">
          {/* Generate new key */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" /> Gerar Nova Chave
              </CardTitle>
              <CardDescription>Máximo de 3 chaves por conta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="Nome da chave (ex: Meu Site, App Mobile)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleGenerate} disabled={generating || keys.length >= 3}>
                  {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Gerar
                </Button>
              </div>
              {keys.length >= 3 && (
                <p className="text-sm text-destructive mt-2">Limite de 3 chaves atingido. Exclua uma para gerar outra.</p>
              )}
            </CardContent>
          </Card>

          {/* Keys list */}
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Carregando chaves...
              </CardContent>
            </Card>
          ) : keys.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma chave de API gerada ainda</p>
                <p className="text-sm text-muted-foreground mt-1">Clique em "Gerar" acima para criar sua primeira chave</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {keys.map((apiKey) => (
                <Card key={apiKey.id} className={!apiKey.active ? 'opacity-60' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{apiKey.name}</span>
                          <Badge variant={apiKey.active ? 'default' : 'secondary'}>
                            {apiKey.active ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Ativa</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> Inativa</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                            {visibleKeys[apiKey.id!] ? apiKey.key : maskKey(apiKey.key)}
                          </code>
                          <Button variant="ghost" size="icon" onClick={() => toggleKeyVisibility(apiKey.id!)}>
                            {visibleKeys[apiKey.id!] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(apiKey.key)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>Requisições: {apiKey.requestCount || 0}</span>
                          <span>Limite: {apiKey.rateLimit}/min</span>
                          {apiKey.lastUsedAt && (
                            <span>Último uso: {new Date(apiKey.lastUsedAt.seconds * 1000).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {apiKey.active ? (
                          <Button variant="outline" size="sm" onClick={() => handleRevoke(apiKey.id!)}>
                            Desativar
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleActivate(apiKey.id!)}>
                            Reativar
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <RefreshCw className="w-3 h-3 mr-1" /> Regenerar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Regenerar chave?</DialogTitle>
                              <DialogDescription>
                                A chave atual será substituída. Todos os sistemas que usam esta chave precisarão ser atualizados.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancelar</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button variant="destructive" onClick={() => handleRegenerate(apiKey.id!)}>
                                  Confirmar
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Excluir chave?</DialogTitle>
                              <DialogDescription>
                                Esta ação é irreversível. A chave "{apiKey.name}" será permanentemente excluída.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancelar</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button variant="destructive" onClick={() => handleDelete(apiKey.id!)}>
                                  Excluir
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* === DOCS TAB === */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> Início Rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Base URL</h3>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-2 rounded text-sm font-mono flex-1 text-muted-foreground">
                    {baseUrl}/api/public-api
                  </code>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${baseUrl}/api/public-api`)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Autenticação</h3>
                <p className="text-sm text-muted-foreground">
                  Envie sua API Key via header <code className="bg-muted px-1 rounded">X-API-Key</code> ou query param <code className="bg-muted px-1 rounded">?api_key=</code>
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Endpoints Disponíveis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { endpoint: 'conteudos', desc: 'Lista de filmes e séries' },
                    { endpoint: 'episodios', desc: 'Episódios de séries' },
                    { endpoint: 'categorias', desc: 'Categorias disponíveis' },
                    { endpoint: 'busca', desc: 'Buscar conteúdos (requer ?q=)' },
                  ].map(({ endpoint, desc }) => (
                    <div key={endpoint} className="bg-muted/50 p-3 rounded-lg border border-border">
                      <code className="text-sm font-mono text-primary">?endpoint={endpoint}</code>
                      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Parâmetros</h3>
                <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-1">
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">page</span> — Página (padrão: 1)</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">size</span> — Itens por página (padrão: 20, máx: 100)</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">search</span> — Filtrar por texto</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">order_by</span> — Ordenar resultados</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">q</span> — Termo de busca (apenas para endpoint=busca)</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Campos Retornados</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Cada item retornado contém os seguintes campos. Campos sensíveis são automaticamente removidos por segurança.
                </p>
                <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-1">
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">id</span> — Identificador único</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Nome</span> — Nome do conteúdo</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Capa</span> — URL da imagem de capa</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Categoria</span> — Categorias do conteúdo</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Sinopse</span> — Descrição do conteúdo</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Tipo</span> — Tipo (Filme, Série, TV, Anime)</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Idioma</span> — Idioma do conteúdo</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Views</span> — Número de visualizações</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Data</span> — Data de cadastro</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Temporadas</span> — Temporadas (para séries)</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Imdb</span> — ID do IMDb</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Edição</span> — Data da última edição</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Capa de fundo</span> — URL do banner de fundo</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Data de Lançamento</span> — Data de lançamento original</p>
                  <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">Trailer</span> — URL do trailer</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20 mt-2">
                  <p className="text-sm font-semibold text-destructive mb-1">🔒 Campos removidos por segurança:</p>
                  <p className="text-sm text-muted-foreground">
                    <code className="bg-muted px-1 rounded">Link</code>, <code className="bg-muted px-1 rounded">Favoritos</code>, <code className="bg-muted px-1 rounded">Histórico</code>, <code className="bg-muted px-1 rounded">UID</code> — Estes campos contêm dados internos e são automaticamente filtrados das respostas da API.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" /> Exemplos de Código
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* cURL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline">cURL</Badge>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(
                    `curl "${baseUrl}/api/public-api?endpoint=conteudos&page=1&size=20" \\\n  -H "X-API-Key: SUA_API_KEY"`
                  )}>
                    <Copy className="w-3 h-3 mr-1" /> Copiar
                  </Button>
                </div>
                <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground">
{`curl "${baseUrl}/api/public-api?endpoint=conteudos&page=1&size=20" \\
  -H "X-API-Key: SUA_API_KEY"`}
                </pre>
              </div>

              {/* JavaScript */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline">JavaScript</Badge>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(
`const response = await fetch(
  '${baseUrl}/api/public-api?endpoint=conteudos&page=1&size=20',
  { headers: { 'X-API-Key': 'SUA_API_KEY' } }
);
const data = await response.json();
console.log(data.results);`
                  )}>
                    <Copy className="w-3 h-3 mr-1" /> Copiar
                  </Button>
                </div>
                <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground">
{`const response = await fetch(
  '${baseUrl}/api/public-api?endpoint=conteudos&page=1&size=20',
  { headers: { 'X-API-Key': 'SUA_API_KEY' } }
);
const data = await response.json();
console.log(data.results);`}
                </pre>
              </div>

              {/* Python */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline">Python</Badge>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(
`import requests

url = "${baseUrl}/api/public-api"
params = {"endpoint": "conteudos", "page": 1, "size": 20}
headers = {"X-API-Key": "SUA_API_KEY"}

response = requests.get(url, params=params, headers=headers)
data = response.json()
print(data["results"])`
                  )}>
                    <Copy className="w-3 h-3 mr-1" /> Copiar
                  </Button>
                </div>
                <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground">
{`import requests

url = "${baseUrl}/api/public-api"
params = {"endpoint": "conteudos", "page": 1, "size": 20}
headers = {"X-API-Key": "SUA_API_KEY"}

response = requests.get(url, params=params, headers=headers)
data = response.json()
print(data["results"])`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Response example */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" /> Exemplo de Resposta JSON
              </CardTitle>
              <CardDescription>Estrutura retornada ao chamar o endpoint de conteúdos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(JSON.stringify({
                    success: true,
                    endpoint: "conteudos",
                    page: 1,
                    size: 2,
                    count: 6504,
                    next: true,
                    previous: false,
                    results: [
                      {
                        id: 1,
                        Nome: "Nome do Conteúdo",
                        Capa: "https://image.tmdb.org/t/p/w780/exemplo.jpg",
                        Categoria: "Ação, Drama",
                        Sinopse: "Descrição do conteúdo...",
                        Tipo: "Filme",
                        Idioma: "DUB",
                        Views: "150",
                        Data: "2026-02-18",
                        Temporadas: "0",
                        Imdb: "7.5",
                        "Edição": "2026-03-10",
                        "Capa de fundo": "https://image.tmdb.org/t/p/original/exemplo.jpg",
                        "Data de Lançamento": "15/01/2026",
                        Trailer: null
                      }
                    ]
                  }, null, 2))}
                >
                  <Copy className="w-3 h-3 mr-1" /> Copiar
                </Button>
                <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto max-h-[500px] text-muted-foreground">
{`{
  "success": true,
  "endpoint": "conteudos",
  "page": 1,
  "size": 2,
  "count": 6504,
  "next": true,
  "previous": false,
  "results": [
    {
      "id": 1,
      "Nome": "Nome do Conteúdo",
      "Capa": "https://image.tmdb.org/t/p/w780/exemplo.jpg",
      "Categoria": "Ação, Drama",
      "Sinopse": "Descrição do conteúdo...",
      "Tipo": "Filme",
      "Idioma": "DUB",
      "Views": "150",
      "Data": "2026-02-18",
      "Temporadas": "0",
      "Imdb": "7.5",
      "Edição": "2026-03-10",
      "Capa de fundo": "https://image.tmdb.org/.../exemplo.jpg",
      "Data de Lançamento": "15/01/2026",
      "Trailer": null
    }
  ]
}`}
                </pre>
              </div>

              <div className="mt-4 bg-muted/50 rounded-lg p-3 border border-border space-y-1">
                <p className="text-sm font-semibold text-foreground mb-2">Campos da resposta:</p>
                <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">success</span> — Se a requisição foi bem-sucedida</p>
                <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">endpoint</span> — Endpoint consultado</p>
                <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">page</span> / <span className="text-primary">size</span> — Página atual e itens por página</p>
                <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">count</span> — Total de registros disponíveis</p>
                <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">next</span> / <span className="text-primary">previous</span> — Se existem mais páginas</p>
                <p className="text-sm font-mono text-muted-foreground"><span className="text-primary">results</span> — Array com os itens</p>
              </div>
            </CardContent>
          </Card>

          {/* Error responses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" /> Respostas de Erro
              </CardTitle>
              <CardDescription>Possíveis erros retornados pela API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive">401</Badge>
                  <span className="text-sm font-semibold text-foreground">API Key não fornecida</span>
                </div>
                <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground">
{`{
  "error": "API Key obrigatória",
  "hint": "Envie via header X-API-Key ou query param ?api_key=sua_chave"
}`}
                </pre>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive">403</Badge>
                  <span className="text-sm font-semibold text-foreground">API Key inválida ou desativada</span>
                </div>
                <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground">
{`{
  "error": "API Key inválida ou desativada"
}`}
                </pre>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive">403</Badge>
                  <span className="text-sm font-semibold text-foreground">Endpoint não permitido</span>
                </div>
                <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground">
{`{
  "error": "Endpoint 'episodios' não permitido para esta chave"
}`}
                </pre>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">400</Badge>
                  <span className="text-sm font-semibold text-foreground">Endpoint não informado</span>
                </div>
                <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground">
{`{
  "error": "Endpoint obrigatório",
  "endpoints_disponiveis": ["conteudos", "episodios", "categorias", "busca"],
  "exemplo": "/api/public-api?api_key=pk_live_xxx&endpoint=conteudos"
}`}
                </pre>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">400</Badge>
                  <span className="text-sm font-semibold text-foreground">Busca sem termo</span>
                </div>
                <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground">
{`{
  "error": "Parâmetro \\"q\\" obrigatório para busca"
}`}
                </pre>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">405</Badge>
                  <span className="text-sm font-semibold text-foreground">Método não permitido</span>
                </div>
                <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto text-muted-foreground">
{`{
  "error": "Método não permitido. Use GET."
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Nunca compartilhe sua API Key publicamente ou em repositórios</p>
              <p>• Use variáveis de ambiente para armazenar a chave no seu código</p>
              <p>• Cada chave tem um limite de requisições por minuto</p>
              <p>• Chaves podem ser revogadas a qualquer momento</p>
              <p>• Dados sensíveis são automaticamente removidos das respostas</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TEST TAB === */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" /> Testar sua API
              </CardTitle>
              <CardDescription>Teste seus endpoints diretamente aqui</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {keys.filter(k => k.active).length === 0 ? (
                <p className="text-muted-foreground text-sm">Gere uma chave ativa primeiro para testar</p>
              ) : (
                <>
                  <div className="flex gap-3">
                    <select
                      value={testEndpoint}
                      onChange={(e) => setTestEndpoint(e.target.value)}
                      className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                    >
                      <option value="conteudos">Conteúdos</option>
                      <option value="episodios">Episódios</option>
                      <option value="categorias">Categorias</option>
                    </select>
                    <Button onClick={handleTestApi} disabled={testing}>
                      {testing ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
                      Executar
                    </Button>
                  </div>

                  {testResult && (
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(testResult)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto max-h-96 text-muted-foreground">
                        {testResult}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MinhaApi;
