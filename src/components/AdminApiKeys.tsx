import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Key, RefreshCw, Shield, Copy, Trash2, Search, BarChart3, TrendingUp, AlertTriangle, Ban, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeyService, ApiKeyData } from '@/services/ApiKeyService';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface UserSubStatus {
  hasApiFeature: boolean;
  isExpired: boolean;
  planName: string;
  expiryDate: string | null;
}

const AdminApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userStatuses, setUserStatuses] = useState<Record<string, UserSubStatus>>({});

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const allKeys = await ApiKeyService.listAllKeys();
      setKeys(allKeys);
    } catch (error) {
      console.error('Erro ao carregar API Keys:', error);
      toast.error('Erro ao carregar API Keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // Fetch subscription statuses for all unique users
  useEffect(() => {
    const fetchStatuses = async () => {
      const uniqueUserIds = [...new Set(keys.map(k => k.userId))];
      const statuses: Record<string, UserSubStatus> = {};
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          statuses[uid] = await ApiKeyService.getUserSubscriptionStatus(uid);
        })
      );
      setUserStatuses(statuses);
    };
    if (keys.length > 0) fetchStatuses();
  }, [keys]);

  const handleBulkDisableExpired = async () => {
    const expiredUserIds = Object.entries(userStatuses)
      .filter(([_, s]) => s.isExpired || !s.hasApiFeature)
      .map(([uid]) => uid);
    
    if (expiredUserIds.length === 0) {
      toast.info('Nenhum usuário com assinatura expirada encontrado');
      return;
    }

    let totalDisabled = 0;
    for (const uid of expiredUserIds) {
      const count = await ApiKeyService.disableAllUserKeys(uid);
      totalDisabled += count;
    }
    toast.success(`${totalDisabled} chaves bloqueadas de ${expiredUserIds.length} usuários expirados`);
    fetchKeys();
  };

  const handleDisableUserKeys = async (userId: string) => {
    const count = await ApiKeyService.disableAllUserKeys(userId);
    toast.success(`${count} chaves bloqueadas`);
    fetchKeys();
  };

  const handleEnableUserKeys = async (userId: string) => {
    const count = await ApiKeyService.enableAllUserKeys(userId);
    toast.success(`${count} chaves ativadas`);
    fetchKeys();
  };

  const handleToggleKey = async (key: ApiKeyData) => {
    try {
      if (key.active) {
        await ApiKeyService.revokeKey(key.id!);
        toast.success(`Chave de ${key.userEmail} bloqueada`);
      } else {
        await ApiKeyService.activateKey(key.id!);
        toast.success(`Chave de ${key.userEmail} desbloqueada`);
      }
      fetchKeys();
    } catch (error) {
      toast.error('Erro ao alterar status da chave');
    }
  };

  const handleDeleteKey = async (key: ApiKeyData) => {
    if (!confirm(`Tem certeza que deseja excluir a chave "${key.name}" de ${key.userEmail}?`)) return;
    try {
      await ApiKeyService.deleteKey(key.id!);
      toast.success('Chave excluída');
      fetchKeys();
    } catch (error) {
      toast.error('Erro ao excluir chave');
    }
  };

  const copyKey = (keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    toast.success('Chave copiada!');
  };

  const filteredKeys = keys.filter(k =>
    k.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
    k.name?.toLowerCase().includes(search.toLowerCase()) ||
    k.key?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = keys.filter(k => k.active).length;
  const inactiveCount = keys.length - activeCount;
  const totalRequests = keys.reduce((sum, k) => sum + (k.requestCount || 0), 0);
  const expiredUsersCount = useMemo(() => 
    Object.values(userStatuses).filter(s => s.isExpired || !s.hasApiFeature).length
  , [userStatuses]);

  // Chart data: requests per user (top 10)
  const requestsByUser = useMemo(() => {
    const userMap: Record<string, number> = {};
    keys.forEach(k => {
      const email = k.userEmail?.split('@')[0] || 'unknown';
      userMap[email] = (userMap[email] || 0) + (k.requestCount || 0);
    });
    return Object.entries(userMap)
      .map(([name, requests]) => ({ name, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);
  }, [keys]);

  // Chart data: keys created over time (simulated daily from createdAt)
  const keysOverTime = useMemo(() => {
    const dayMap: Record<string, number> = {};
    keys.forEach(k => {
      if (k.createdAt) {
        const date = k.createdAt.seconds
          ? new Date(k.createdAt.seconds * 1000)
          : new Date(k.createdAt);
        const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dayMap[day] = (dayMap[day] || 0) + 1;
      }
    });
    return Object.entries(dayMap)
      .map(([day, count]) => ({ day, count }))
      .slice(-14); // Last 14 days
  }, [keys]);

  // Pie chart: active vs inactive
  const statusData = useMemo(() => [
    { name: 'Ativas', value: activeCount },
    { name: 'Bloqueadas', value: inactiveCount }
  ], [activeCount, inactiveCount]);

  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))'];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Visão Geral & Gráficos
          </TabsTrigger>
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Gerenciar Chaves
          </TabsTrigger>
        </TabsList>

        {/* Tab: Overview & Charts */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="modern-card border-border/40">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{keys.length}</p>
                    <p className="text-xs text-muted-foreground">Total de Chaves</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="modern-card border-border/40">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">Chaves Ativas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="modern-card border-border/40">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalRequests.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total de Requisições</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requests per user */}
            <Card className="modern-card border-border/40">
              <CardHeader>
                <CardTitle className="text-foreground text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Requisições por Usuário (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requestsByUser.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={requestsByUser} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhum dado de requisições ainda
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Keys created over time */}
            <Card className="modern-card border-border/40">
              <CardHeader>
                <CardTitle className="text-foreground text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Chaves Criadas por Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {keysOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={keysOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhuma chave criada ainda
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pie chart */}
          <Card className="modern-card border-border/40">
            <CardHeader>
              <CardTitle className="text-foreground text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Status das Chaves
              </CardTitle>
            </CardHeader>
            <CardContent>
              {keys.length > 0 ? (
                <div className="flex items-center justify-center gap-8">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                        {statusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm text-foreground">Ativas: {activeCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span className="text-sm text-foreground">Bloqueadas: {inactiveCount}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma chave encontrada
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Manage Keys */}
        <TabsContent value="keys" className="space-y-6">
          <Card className="modern-card border-border/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    API Keys dos Usuários
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Gerencie todas as chaves de API geradas pelos usuários
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {expiredUsersCount > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleBulkDisableExpired}>
                      <Ban className="w-4 h-4 mr-2" />
                      Bloquear Expirados ({expiredUsersCount})
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={fetchKeys} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email, nome ou chave..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando chaves...</p>
                </div>
              ) : filteredKeys.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-medium">Nenhuma API Key encontrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search ? 'Nenhum resultado para essa busca' : 'Os usuários ainda não geraram chaves de API'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40">
                        <TableHead className="text-muted-foreground">Usuário</TableHead>
                        <TableHead className="text-muted-foreground">Assinatura</TableHead>
                        <TableHead className="text-muted-foreground">Nome da Chave</TableHead>
                        <TableHead className="text-muted-foreground">Chave</TableHead>
                        <TableHead className="text-muted-foreground">Requisições</TableHead>
                        <TableHead className="text-muted-foreground">Último Uso</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredKeys.map((apiKey) => {
                        const subStatus = userStatuses[apiKey.userId];
                        const isSubActive = subStatus && !subStatus.isExpired && subStatus.hasApiFeature;
                        return (
                        <TableRow key={apiKey.id} className={`border-border/40 hover:bg-muted/10 ${!isSubActive ? 'opacity-60' : ''}`}>
                          <TableCell className="text-foreground font-medium">
                            <div>
                              <p className="text-sm">{apiKey.userEmail}</p>
                              <p className="text-xs text-muted-foreground font-mono">{apiKey.userId?.slice(0, 8)}...</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {subStatus ? (
                              <div className="space-y-1">
                                <Badge variant={isSubActive ? 'default' : 'destructive'} className="text-xs">
                                  {subStatus.isExpired ? 'Expirado' : !subStatus.hasApiFeature ? 'Sem API' : 'Ativo'}
                                </Badge>
                                <p className="text-xs text-muted-foreground">{subStatus.planName}</p>
                                {subStatus.expiryDate && (
                                  <p className="text-xs text-muted-foreground">
                                    {subStatus.isExpired ? 'Expirou:' : 'Expira:'} {subStatus.expiryDate}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Carregando...</span>
                            )}
                          </TableCell>
                          <TableCell className="text-foreground">{apiKey.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded font-mono">
                                {apiKey.key?.slice(0, 16)}...
                              </code>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyKey(apiKey.key)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {(apiKey.requestCount || 0).toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {apiKey.lastUsedAt
                              ? new Date(apiKey.lastUsedAt.seconds ? apiKey.lastUsedAt.seconds * 1000 : apiKey.lastUsedAt).toLocaleString('pt-BR')
                              : 'Nunca'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={apiKey.active}
                                onCheckedChange={() => handleToggleKey(apiKey)}
                              />
                              <Badge variant={apiKey.active ? 'default' : 'destructive'} className="text-xs">
                                {apiKey.active ? 'Ativa' : 'Bloqueada'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!isSubActive && apiKey.active && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  title="Bloquear todas as chaves deste usuário"
                                  onClick={() => handleDisableUserKeys(apiKey.userId)}
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                              {isSubActive && !apiKey.active && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:bg-primary/10"
                                  title="Ativar todas as chaves deste usuário"
                                  onClick={() => handleEnableUserKeys(apiKey.userId)}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteKey(apiKey)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminApiKeys;
