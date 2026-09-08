import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { FirebaseUserService, FirebaseUser } from '@/services/FirebaseUserService';
import {
  StreamingAppService,
  BaserowAppUser,
  StreamingAppMetrics,
  isUserOnline,
  isUserPaidVip
} from '@/services/StreamingAppService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Users,
  Crown,
  Activity,
  BarChart3,
  RefreshCw,
  Search,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

export const MeusApp: React.FC = () => {
  const { userInfo } = useSimpleAuth();
  
  // Dados do usuário logado no Firestore
  const [currentUserData, setCurrentUserData] = useState<FirebaseUser | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(true);

  // Dados do aplicativo e métricas do Baserow
  const [metrics, setMetrics] = useState<StreamingAppMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Filtros da tabela de usuários
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'vip' | 'free'>('all');

  // 1. Carregar o registro do usuário logado para obter seu app_id
  const fetchCurrentUserRecord = useCallback(async () => {
    if (!userInfo?.id) return;
    setLoadingUserData(true);
    try {
      const userRecord = await FirebaseUserService.getUserById(userInfo.id);
      setCurrentUserData(userRecord);
    } catch (err) {
      console.error('Erro ao buscar dados do usuário logado:', err);
    } finally {
      setLoadingUserData(false);
    }
  }, [userInfo?.id]);

  useEffect(() => {
    fetchCurrentUserRecord();
  }, [fetchCurrentUserRecord]);

  const appId = useMemo(() => {
    return (currentUserData?.app_id || '').trim();
  }, [currentUserData?.app_id]);

  // 2. Carregar e calcular métricas do Baserow filtrando por AppId
  const loadAppMetrics = useCallback(async () => {
    if (!appId) {
      setMetrics(null);
      return;
    }

    setLoadingMetrics(true);
    setErrorMetrics(null);

    try {
      console.log(`📱 Buscando métricas para o app_id: "${appId}"...`);
      const appUsers = await StreamingAppService.getUsersByAppId(appId);
      const calculatedMetrics = StreamingAppService.calculateMetrics(appUsers);
      setMetrics(calculatedMetrics);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      console.error('Erro ao carregar métricas do app:', err);
      setErrorMetrics(err?.message || 'Falha ao buscar dados no servidor do aplicativo.');
      toast.error('Erro ao atualizar métricas do aplicativo.');
    } finally {
      setLoadingMetrics(false);
    }
  }, [appId]);

  useEffect(() => {
    if (appId) {
      loadAppMetrics();
    }
  }, [appId, loadAppMetrics]);

  // Auto-refresh opcional a cada 60 segundos se houver app vinculado
  useEffect(() => {
    if (!appId) return;
    const interval = setInterval(() => {
      loadAppMetrics();
    }, 60000);
    return () => clearInterval(interval);
  }, [appId, loadAppMetrics]);

  // Filtragem da lista de usuários
  const filteredUsers = useMemo(() => {
    if (!metrics?.users) return [];

    const now = new Date();
    return metrics.users.filter((user) => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        (user.Nome || '').toLowerCase().includes(search) ||
        (user.Email || '').toLowerCase().includes(search);

      if (!matchesSearch) return false;

      const online = isUserOnline(user.UltimoAcesso, now);
      const isPaid = isUserPaidVip(user.Status, user.Vencimento, now);

      if (statusFilter === 'online') return online;
      if (statusFilter === 'vip') return isPaid;
      if (statusFilter === 'free') return !isPaid;
      return true;
    });
  }, [metrics?.users, searchTerm, statusFilter]);

  // Loading do perfil
  if (loadingUserData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <RefreshCw className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm">Identificando aplicativo vinculado à sua conta...</p>
      </div>
    );
  }

  // Caso não tenha app_id vinculado: Exibir aviso amigável
  if (!appId) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in-up">
        <Card className="border-border/50 shadow-lg overflow-hidden bg-card/80 backdrop-blur-sm">
          <div className="h-2 bg-amber-500 w-full" />
          <CardHeader className="text-center pb-4 pt-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
              <Smartphone className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Nenhum aplicativo vinculado
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground max-w-md mx-auto mt-2">
              Sua conta ainda não possui um identificador de aplicativo (<code className="font-mono text-foreground font-semibold">app_id</code>) associado.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pb-8 text-center">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/40 text-sm text-muted-foreground max-w-lg mx-auto text-left space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>O que fazer agora?</span>
              </div>
              <p className="text-xs leading-relaxed">
                Entre em contato com o administrador do sistema para que ele vincule o seu aplicativo ao seu painel. Assim que o vínculo for realizado, as métricas em tempo real de usuários online, assinantes VIP e acessos semanais aparecerão aqui automaticamente.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCurrentUserRecord}
                className="w-full sm:w-auto border-border/60"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-fade-in-up">
      {/* Header com Identificação do App e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Meus App</h1>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono text-xs">
                  {appId}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Métricas e monitoramento em tempo real dos usuários do seu aplicativo de streaming
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefreshedAt && (
            <span className="text-xs text-muted-foreground hidden md:inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Atualizado às {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={loadAppMetrics}
            disabled={loadingMetrics}
            className="border-border/60 hover:bg-muted/50 text-xs shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingMetrics ? 'animate-spin' : ''}`} />
            Atualizar Métricas
          </Button>
        </div>
      </div>

      {/* Erro ao carregar métricas */}
      {errorMetrics && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-between text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMetrics}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadAppMetrics}>
            Tentar Novamente
          </Button>
        </div>
      )}

      {/* Grid de 4 Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Usuários Online Agora */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Usuários Online
              </span>
              <span className="relative flex h-3 w-3" title="Online nos últimos 5 minutos">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-black tracking-tight text-emerald-500">
                {metrics ? metrics.onlineUsers : '—'}
              </h3>
              <span className="text-xs text-muted-foreground">agora</span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Activity className="h-3 w-3 text-emerald-500" />
              Acessaram nos últimos 5 minutos
            </p>
          </CardContent>
        </Card>

        {/* 2. Assinantes Pagos / VIP */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Assinantes VIP
              </span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Crown className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-black tracking-tight text-amber-500">
                {metrics ? metrics.paidUsers : '—'}
              </h3>
              <span className="text-xs text-muted-foreground">assinantes</span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-amber-500" />
              Status pago e vencimento válido
            </p>
          </CardContent>
        </Card>

        {/* 3. Usuários Grátis */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-sm relative overflow-hidden group hover:border-purple-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Usuários Grátis
              </span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                <Users className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-black tracking-tight text-purple-500">
                {metrics ? metrics.freeUsers : '—'}
              </h3>
              <span className="text-xs text-muted-foreground">contas</span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1">
              Acesso padrão ou não pagantes
            </p>
          </CardContent>
        </Card>

        {/* 4. Total de Usuários do App */}
        <Card className="border-border/40 bg-card/70 backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/40 transition-colors">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total do App
              </span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <Smartphone className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-black tracking-tight text-blue-500">
                {metrics ? metrics.totalUsers : '—'}
              </h3>
              <span className="text-xs text-muted-foreground">cadastrados</span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1">
              Com AppId: <span className="font-mono">{appId}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Acessos Semanal */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Gráfico de Acessos Semanal
              </CardTitle>
              <CardDescription className="text-xs">
                Distribuição de acessos diários (Seg a Dom) baseado no Último Acesso dos últimos 7 dias
              </CardDescription>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto text-[11px] border-border/60">
              Últimos 7 dias
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMetrics && !metrics ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Carregando dados de acesso...
            </div>
          ) : metrics && metrics.weeklyAccess.length > 0 ? (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.weeklyAccess} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="dayName"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#374151', opacity: 0.2 }}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#374151', opacity: 0.2 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
                    }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '12px' }}
                    itemStyle={{ color: '#60a5fa', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} usuários`, 'Acessos']}
                  />
                  <Bar
                    dataKey="accessCount"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
              Nenhum dado de acesso registrado no período.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Usuários do App */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Usuários do Aplicativo
              </CardTitle>
              <CardDescription className="text-xs">
                Contas registradas com o identificador <span className="font-mono text-foreground font-semibold">{appId}</span>
              </CardDescription>
            </div>

            {/* Controles de Busca e Filtro */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs w-full sm:w-60"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40 text-xs">
                <Button
                  size="sm"
                  variant={statusFilter === 'all' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter('all')}
                >
                  Todos ({metrics?.users.length || 0})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'online' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5 text-emerald-500"
                  onClick={() => setStatusFilter('online')}
                >
                  Online ({metrics?.onlineUsers || 0})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'vip' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5 text-amber-500"
                  onClick={() => setStatusFilter('vip')}
                >
                  VIP ({metrics?.paidUsers || 0})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'free' ? 'default' : 'ghost'}
                  className="h-7 text-xs px-2.5 text-purple-500"
                  onClick={() => setStatusFilter('free')}
                >
                  Grátis ({metrics?.freeUsers || 0})
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loadingMetrics && !metrics ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Carregando lista de usuários...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/60 rounded-xl">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-semibold text-foreground">Nenhum usuário encontrado</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {searchTerm || statusFilter !== 'all'
                  ? 'Nenhum usuário corresponde aos filtros selecionados.'
                  : 'Nenhum usuário cadastrado neste aplicativo até o momento.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Último Acesso</th>
                    <th className="py-3 px-4 text-right">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredUsers.map((user) => {
                    const online = isUserOnline(user.UltimoAcesso);
                    const isPaid = isUserPaidVip(user.Status, user.Vencimento);

                    return (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground flex items-center gap-2">
                            <span>{user.Nome || 'Sem Nome'}</span>
                            {online && (
                              <span
                                className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                                title="Usuário online agora"
                              />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{user.Email}</div>
                        </td>

                        <td className="py-3 px-4">
                          {isPaid ? (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold">
                              <Crown className="h-3 w-3 mr-1" />
                              {user.Status || 'VIP'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {user.Status || 'Grátis'}
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {user.Vencimento ? (
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="h-3.5 w-3.5 opacity-60" />
                              {user.Vencimento}
                            </span>
                          ) : (
                            <span className="italic opacity-60">Sem vencimento</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {user.UltimoAcesso ? (
                            <span className="font-mono flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 opacity-60" />
                              {user.UltimoAcesso}
                            </span>
                          ) : (
                            <span className="italic opacity-50">Nunca acessou</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {online ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-medium">
                              Online Agora
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Offline</span>
                          )}
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
  );
};

export default MeusApp;
