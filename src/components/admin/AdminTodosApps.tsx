import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useConfig } from '@/contexts/ConfigContext';
import { useBaserowService } from '@/services/BaserowService';
import { FirebaseUser, FirebaseUserService } from '@/services/FirebaseUserService';
import { StreamingAppService, BaserowAppUser, StreamingAppMetrics, isUserOnline } from '@/services/StreamingAppService';
import { TopContentService, TopContentMetrics } from '@/services/TopContentService';
import { TopWatchedContents } from '@/components/app/TopWatchedContents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Smartphone,
  Search,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Unlink,
  Eye,
  Activity,
  Crown,
  Radio,
  BarChart3,
  Calendar,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const AdminTodosApps: React.FC = () => {
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Baserow data
  const [baserowUsers, setBaserowUsers] = useState<BaserowAppUser[]>([]);
  const [loadingBaserow, setLoadingBaserow] = useState(false);
  const [baserowError, setBaserowError] = useState<string | null>(null);

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_app' | 'without_app'>('all');

  // Modal para vincular/editar App ID
  const [selectedUser, setSelectedUser] = useState<FirebaseUser | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [appIdInput, setAppIdInput] = useState('');
  const [savingAppId, setSavingAppId] = useState(false);

  // Modal para pré-visualizar métricas do App
  const { config } = useConfig();
  const baserowService = useBaserowService();
  const [previewAppId, setPreviewAppId] = useState<string | null>(null);
  const [previewMetrics, setPreviewMetrics] = useState<StreamingAppMetrics | null>(null);
  const [previewTopContents, setPreviewTopContents] = useState<TopContentMetrics | null>(null);
  const [loadingPreviewTopContents, setLoadingPreviewTopContents] = useState(false);
  const [errorPreviewTopContents, setErrorPreviewTopContents] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const conteudosTableId = useMemo(() => {
    return (config?.tableIds?.conteudos || config?.conteudosTableId || '').trim();
  }, [config?.tableIds?.conteudos, config?.conteudosTableId]);

  const loadPreviewTopContents = async (appId: string) => {
    if (!conteudosTableId) {
      setPreviewTopContents(null);
      setErrorPreviewTopContents(null);
      return;
    }
    setLoadingPreviewTopContents(true);
    setErrorPreviewTopContents(null);
    try {
      let rawItems: any[] = [];
      if (config.apiToken && config.baseUrl) {
        // Carrega 1 página rápida de 100 conteúdos de forma atômica
        const res = await baserowService.getTableData(conteudosTableId, 1, 100);
        rawItems = Array.isArray(res?.results) ? res.results : [];
      } else if (config.apiToken) {
        rawItems = await TopContentService.fetchConteudosFromBaserow(
          conteudosTableId,
          config.apiToken,
          config.baseUrl || 'https://api.baserow.io',
          100
        );
      }
      const processed = TopContentService.processTopContents(rawItems, appId, 20);
      setPreviewTopContents(processed);
    } catch (err: any) {
      console.warn('Aviso ao buscar conteúdos do app no preview:', err?.message || err);
      setErrorPreviewTopContents(err?.message || 'Servidor de conteúdos temporariamente indisponível.');
    } finally {
      setLoadingPreviewTopContents(false);
    }
  };

  // Carregar usuários do Firebase
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const userList: FirebaseUser[] = [];
        snapshot.forEach((docSnap) => {
          userList.push({ uid: docSnap.id, ...docSnap.data() } as FirebaseUser);
        });
        setUsers(userList);
        setLoadingUsers(false);
      },
      (error) => {
        console.error('Erro ao buscar usuários do Firebase:', error);
        toast.error('Falha ao carregar clientes do Firebase');
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Carregar usuários da tabela 1405 do Baserow
  const loadBaserowUsers = async () => {
    setLoadingBaserow(true);
    setBaserowError(null);
    try {
      const data = await StreamingAppService.fetchAllAppUsers();
      setBaserowUsers(data);
    } catch (err: any) {
      console.error('Erro ao carregar dados do Baserow:', err);
      setBaserowError(err?.message || 'Não foi possível conectar à API do Baserow.');
    } finally {
      setLoadingBaserow(false);
    }
  };

  useEffect(() => {
    loadBaserowUsers();
  }, []);

  // Identificar App IDs existentes no Baserow com contagem
  const baserowAppsSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    baserowUsers.forEach((u) => {
      const id = (u.AppId || '').trim();
      if (id) {
        counts[id] = (counts[id] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([appId, count]) => ({ appId, count }));
  }, [baserowUsers]);

  // Contagem de usuários do Baserow por App ID (para exibição rápida)
  const baserowUserCountByAppId = useMemo(() => {
    const map = new Map<string, number>();
    baserowUsers.forEach((u) => {
      const id = (u.AppId || '').trim().toLowerCase();
      if (id) {
        map.set(id, (map.get(id) || 0) + 1);
      }
    });
    return map;
  }, [baserowUsers]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalClients = users.length;
    const withApp = users.filter((u) => !!u.app_id && u.app_id.trim() !== '').length;
    const withoutApp = totalClients - withApp;
    const uniqueLinkedAppIds = new Set(
      users.map((u) => (u.app_id || '').trim().toLowerCase()).filter(Boolean)
    ).size;

    return {
      totalClients,
      withApp,
      withoutApp,
      uniqueLinkedAppIds,
      totalBaserowRows: baserowUsers.length
    };
  }, [users, baserowUsers]);

  // Filtrar usuários
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        (u.name || '').toLowerCase().includes(search) ||
        (u.email || '').toLowerCase().includes(search) ||
        (u.app_id || '').toLowerCase().includes(search);

      if (!matchesSearch) return false;

      const hasApp = !!u.app_id && u.app_id.trim() !== '';
      if (filterType === 'with_app') return hasApp;
      if (filterType === 'without_app') return !hasApp;
      return true;
    });
  }, [users, searchTerm, filterType]);

  // Abrir modal de vínculo
  const handleOpenLinkModal = (user: FirebaseUser) => {
    setSelectedUser(user);
    setAppIdInput(user.app_id || '');
    setIsLinkModalOpen(true);
  };

  // Salvar App ID
  const handleSaveAppId = async () => {
    if (!selectedUser) return;
    setSavingAppId(true);
    try {
      const cleanAppId = appIdInput.trim();
      await FirebaseUserService.updateUserAppId(selectedUser.uid, cleanAppId);
      toast.success(
        cleanAppId
          ? `Aplicativo "${cleanAppId}" vinculado a ${selectedUser.name}!`
          : `Aplicativo desvinculado de ${selectedUser.name}.`
      );
      setIsLinkModalOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Erro ao salvar App ID:', error);
      toast.error(`Erro ao salvar: ${error?.message || 'Falha inesperada'}`);
    } finally {
      setSavingAppId(false);
    }
  };

  // Desvincular rápido
  const handleQuickUnlink = async (user: FirebaseUser) => {
    if (!window.confirm(`Deseja desvincular o aplicativo de ${user.name}?`)) return;
    try {
      await FirebaseUserService.updateUserAppId(user.uid, '');
      toast.success(`Aplicativo desvinculado de ${user.name}.`);
    } catch (error: any) {
      console.error('Erro ao desvincular:', error);
      toast.error('Erro ao desvincular aplicativo.');
    }
  };

  // Abrir pré-visualização de métricas do App
  const handleOpenPreview = (appId: string) => {
    if (!appId || !appId.trim()) return;
    setPreviewAppId(appId);
    
    // Filtrar usuários do Baserow com esse AppId e calcular métricas
    const cleanId = appId.trim().toLowerCase();
    const matching = baserowUsers.filter(
      (u) => (u.AppId || '').trim().toLowerCase() === cleanId
    );
    const metrics = StreamingAppService.calculateMetrics(matching);
    setPreviewMetrics(metrics);
    loadPreviewTopContents(appId);
    setIsPreviewModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Todos Apps</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie e vincule os aplicativos de streaming dos clientes com a base do Baserow
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBaserowUsers}
            disabled={loadingBaserow}
            className="border-border/60 hover:bg-muted/50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingBaserow ? 'animate-spin' : ''}`} />
            Atualizar Dados do Baserow
          </Button>
        </div>
      </div>

      {/* Alerta Baserow se houver erro */}
      {baserowError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-between text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Erro na comunicação com a API do Baserow: {baserowError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadBaserowUsers}>
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Clientes c/ App Vinculado
              </p>
              <h3 className="text-2xl font-bold text-blue-500 mt-1">{stats.withApp}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">de {stats.totalClients} clientes totais</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Clientes sem App
              </p>
              <h3 className="text-2xl font-bold text-amber-500 mt-1">{stats.withoutApp}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">precisam de vínculo</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Apps Únicos Ativos
              </p>
              <h3 className="text-2xl font-bold text-purple-500 mt-1">{stats.uniqueLinkedAppIds}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">vinculados no painel</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
              <Smartphone className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Base Total Baserow
              </p>
              <h3 className="text-2xl font-bold text-emerald-500 mt-1">{stats.totalBaserowRows}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">usuários na tabela 1405</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção com Apps Detectados no Baserow */}
      {baserowAppsSummary.length > 0 && (
        <Card className="border-border/40 bg-card/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="h-4 w-4 text-blue-500" />
              Identificadores (AppId) encontrados na Tabela 1405 do Baserow
            </CardTitle>
            <CardDescription>
              Estes são os AppIds que já possuem registros de usuários criados na tabela de streaming:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {baserowAppsSummary.map((item) => (
                <div
                  key={item.appId}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/30 text-xs"
                >
                  <span className="font-mono font-semibold text-foreground">{item.appId}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                    {item.count} usuário{item.count > 1 ? 's' : ''}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px] text-blue-500 hover:text-blue-600"
                    onClick={() => handleOpenPreview(item.appId)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver Métricas
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Gestão de Clientes & Vínculo */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Vínculo de Aplicativos aos Clientes
              </CardTitle>
              <CardDescription>
                Defina qual App ID cada cliente gerencia. O cliente verá apenas os usuários com o App ID dele.
              </CardDescription>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou app_id..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs w-full sm:w-64"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40 text-xs">
                <Button
                  size="sm"
                  variant={filterType === 'all' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2"
                  onClick={() => setFilterType('all')}
                >
                  Todos ({users.length})
                </Button>
                <Button
                  size="sm"
                  variant={filterType === 'with_app' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2 text-blue-500"
                  onClick={() => setFilterType('with_app')}
                >
                  Com App ({stats.withApp})
                </Button>
                <Button
                  size="sm"
                  variant={filterType === 'without_app' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2 text-amber-500"
                  onClick={() => setFilterType('without_app')}
                >
                  Sem App ({stats.withoutApp})
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Carregando clientes...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/60 rounded-xl">
              <Smartphone className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-semibold text-foreground">Nenhum cliente encontrado</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Tente alterar os termos da busca ou os filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Status Painel</th>
                    <th className="py-3 px-4">App ID Vinculado</th>
                    <th className="py-3 px-4">Usuários no Streaming</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredUsers.map((user) => {
                    const cleanAppId = (user.app_id || '').trim().toLowerCase();
                    const baserowCount = cleanAppId ? baserowUserCountByAppId.get(cleanAppId) || 0 : 0;
                    const hasApp = !!user.app_id && user.app_id.trim() !== '';

                    return (
                      <tr key={user.uid} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{user.email}</div>
                        </td>

                        <td className="py-3 px-4">
                          {user.isActive ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                              Ativo ({user.accessDays}d)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                              Inativo
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {hasApp ? (
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono text-xs">
                                <Smartphone className="h-3 w-3 mr-1" />
                                {user.app_id}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-amber-500" />
                              Nenhum app vinculado
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {hasApp ? (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="font-semibold text-foreground">{baserowCount}</span>
                              <span className="text-muted-foreground">usuários no app</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasApp && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-blue-500 hover:text-blue-600 border-blue-500/30"
                                onClick={() => handleOpenPreview(user.app_id!)}
                                title="Ver métricas como o cliente vê"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Métricas
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant={hasApp ? 'outline' : 'default'}
                              className={`h-8 text-xs ${!hasApp ? 'bg-primary text-primary-foreground' : ''}`}
                              onClick={() => handleOpenLinkModal(user)}
                            >
                              <LinkIcon className="h-3.5 w-3.5 mr-1" />
                              {hasApp ? 'Alterar App' : 'Vincular App'}
                            </Button>

                            {hasApp && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => handleQuickUnlink(user)}
                                title="Desvincular aplicativo"
                              >
                                <Unlink className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Vincular / Editar App ID */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-500" />
              Vincular Aplicativo de Streaming
            </DialogTitle>
            <DialogDescription>
              Selecione ou digite o identificador (App ID) que este cliente terá acesso no painel dele.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-lg border border-border/40 space-y-1">
                <p className="text-xs text-muted-foreground">Cliente Selecionado:</p>
                <p className="text-sm font-semibold text-foreground">{selectedUser.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appIdInput" className="text-sm font-semibold">
                  App ID (ex: millflix_app, supercine_app)
                </Label>
                <Input
                  id="appIdInput"
                  placeholder="Digite o App ID exato..."
                  value={appIdInput}
                  onChange={(e) => setAppIdInput(e.target.value)}
                  className="font-mono text-sm"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Dica: Deve ser idêntico ao valor preenchido na coluna <code className="bg-muted px-1 rounded">AppId</code> da tabela 1405 do Baserow.
                </p>
              </div>

              {/* Sugestões de Apps existentes no Baserow */}
              {baserowAppsSummary.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Apps já existentes na tabela do Baserow (clique para preencher):
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {baserowAppsSummary.map((item) => (
                      <Button
                        key={item.appId}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs font-mono border-blue-500/30 hover:bg-blue-500/10"
                        onClick={() => setAppIdInput(item.appId)}
                      >
                        {item.appId} ({item.count})
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLinkModalOpen(false)}
                  disabled={savingAppId}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveAppId}
                  disabled={savingAppId}
                  className="bg-primary"
                >
                  {savingAppId ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Vínculo'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Pré-visualizar Métricas do App */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Métricas do Aplicativo: <span className="font-mono text-primary">{previewAppId}</span>
            </DialogTitle>
            <DialogDescription>
              Esta é a visualização exata de métricas e usuários que o dono do app visualiza na página "Meus App".
            </DialogDescription>
          </DialogHeader>

          {previewMetrics && (
            <div className="space-y-6 py-2">
              {/* Cards de Métricas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card className="border-border/40 bg-emerald-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Online Agora</span>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {previewMetrics.onlineUsers}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Últimos 5 min</p>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-cyan-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Online Hoje</span>
                      <Radio className="h-3.5 w-3.5 text-cyan-500" />
                    </div>
                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                      {previewMetrics.onlineTodayUsers}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Acessaram hoje</p>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-amber-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Assinantes VIP</span>
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                      {previewMetrics.paidUsers}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Pagos e válidos</p>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-purple-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Usuários Grátis</span>
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                      {previewMetrics.freeUsers}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Status Grátis</p>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-blue-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Total no App</span>
                      <Smartphone className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {previewMetrics.totalUsers}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Total cadastrados</p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico Semanal */}
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Acessos nos Últimos 7 Dias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={previewMetrics.weeklyAccess}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                        <XAxis dataKey="dayName" stroke="#888888" fontSize={11} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                          labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="accessCount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Acessos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Conteúdos Mais Assistidos */}
              <TopWatchedContents
                metrics={previewTopContents}
                loading={loadingPreviewTopContents}
                onRefresh={() => previewAppId && loadPreviewTopContents(previewAppId)}
                isTableConfigured={Boolean(conteudosTableId && config.apiToken)}
                tableId={conteudosTableId}
                appId={previewAppId || undefined}
                error={errorPreviewTopContents}
              />

              {/* Tabela de Usuários do App */}
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Lista de Usuários deste Aplicativo ({previewMetrics.users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {previewMetrics.users.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      Nenhum usuário cadastrado com este AppId na tabela 1405 ainda.
                    </p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border/40 text-muted-foreground">
                            <th className="py-2 px-3">Nome</th>
                            <th className="py-2 px-3">E-mail</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Vencimento</th>
                            <th className="py-2 px-3">Último Acesso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {previewMetrics.users.map((u) => {
                            const online = isUserOnline(u.UltimoAcesso);
                            return (
                              <tr key={u.id} className="hover:bg-muted/30">
                                <td className="py-2 px-3 font-medium text-foreground">{u.Nome}</td>
                                <td className="py-2 px-3 text-muted-foreground">{u.Email}</td>
                                <td className="py-2 px-3">
                                  <Badge variant="outline" className="text-[10px] py-0">
                                    {u.Status || 'Grátis'}
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 text-muted-foreground">{u.Vencimento || '—'}</td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5">
                                    {online && (
                                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    )}
                                    <span>{u.UltimoAcesso || 'Nunca'}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTodosApps;
