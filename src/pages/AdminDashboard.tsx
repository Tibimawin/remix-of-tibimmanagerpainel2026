import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { FirebaseUserService, FirebaseUser } from '@/services/FirebaseUserService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, Menu, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useRealtimeLogs } from '@/hooks/useRealtimeLogs';
import { useRealtimeActivities } from '@/hooks/useRealtimeActivities';
import DateRangeFilter from '@/components/DateRangeFilter';
import VisualMetricsDashboard from '@/components/VisualMetricsDashboard';
import AdminProducts from '@/components/AdminProducts';
import AdminUsers from '@/components/AdminUsers';
import AdminNotifications from '@/components/AdminNotifications';
import AdminChat from '@/components/AdminChat';
import AdminImportConfig from '@/components/AdminImportConfig';
import AdminPlans from '@/components/AdminPlans';
import AdminUserPermissions from '@/components/AdminUserPermissions';
import { AdminSeriesCorrection } from '@/components/AdminSeriesCorrection';
import { AdminSuportePrioritario } from '@/components/AdminSuportePrioritario';
import { AdminOffers } from '@/components/AdminOffers';
import AdminWhatsApp from '@/components/AdminWhatsApp';
import { AdminMaintenanceControl } from '@/components/AdminMaintenanceControl';
import { AdminAccessExpiredSettings } from '@/components/AdminAccessExpiredSettings';
import { AdminFirebaseUsers } from '@/components/AdminFirebaseUsers';
import AdminExpirationNotifications from '@/components/AdminExpirationNotifications';
import AdminAnnouncements from '@/components/AdminAnnouncements';
import AdminUserActionHistory from '@/components/AdminUserActionHistory';
import { AdminReferrals } from '@/components/AdminReferrals';
import { AdminAlertCenter } from '@/components/AdminAlertCenter';
import { AdminSystemUpdates } from '@/components/AdminSystemUpdates';
import AdminPlanosSolicitados from '@/pages/AdminPlanosSolicitados';
import AdminOverviewMetrics from '@/components/AdminOverviewMetrics';
import { SecurityCenter } from '@/components/SecurityCenter';
import { AdminSeasonalTheme } from '@/components/AdminSeasonalTheme';
import { AdminRegistrationControl } from '@/components/AdminRegistrationControl';
import AdminFinancialDashboard from '@/components/AdminFinancialDashboard';
import AdminPlanosConfig from '@/components/AdminPlanosConfig';
import AdminSeriesUpdateConfig from '@/components/AdminSeriesUpdateConfig';
import AdminMiniseriesConfig from '@/components/AdminMiniseriesConfig';
import AdminApiKeys from '@/components/AdminApiKeys';
import AdminProtectedChannels from '@/components/AdminProtectedChannels';
import AdminCloakLinks from '@/components/AdminCloakLinks';
import AdminCloakDashboard from '@/components/AdminCloakDashboard';
import AdminPushCenter from '@/components/AdminPushCenter';
import { AdminSidebar, AdminView } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { Button } from '@/components/ui/button';

const AdminDashboard = () => {
  console.log('=== ADMIN DASHBOARD INICIANDO ===');

  const { adminUser, logout } = useAdminAuth();
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const { logs: oldLogs, loadLogs } = useActivityLogger();
  const { logs: realtimeLogs, isLoading: logsLoading } = useRealtimeLogs();
  const { activities: recentActivities, isLoading: activitiesLoading } = useRealtimeActivities();
  const { maintenanceState, isMaintenanceActive } = useMaintenanceMode();

  // Usar logs em tempo real do Firebase quando disponíveis, senão usar logs antigos
  const logs = realtimeLogs.length > 0 ? realtimeLogs : oldLogs;

  console.log('AdminUser do contexto:', adminUser);
  console.log('Logs de atividade carregados:', logs.length);

  // Função para fazer parse robusto de IMEI (objetos únicos ou concatenados)
  const parseIMEIField = (imeiString: string) => {
    if (!imeiString || typeof imeiString !== 'string') {
      return [];
    }

    try {
      // Primeiro tenta fazer parse direto (caso seja um array válido)
      const parsed = JSON.parse(imeiString);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // Se for um objeto único, converte para array
      if (typeof parsed === 'object') {
        return [parsed];
      }
    } catch {
      // Se falhar, tenta tratar como objetos concatenados
      try {
        // Usar regex para encontrar objetos JSON concatenados
        const jsonObjects = [];
        const regex = /\{[^}]*\}/g;
        let match;

        while ((match = regex.exec(imeiString)) !== null) {
          try {
            const obj = JSON.parse(match[0]);
            jsonObjects.push(obj);
          } catch (parseError) {
            console.warn('Erro ao fazer parse de objeto individual:', match[0], parseError);
          }
        }

        return jsonObjects;
      } catch (error) {
        console.warn('Erro ao fazer parse do IMEI concatenado:', error, 'Valor:', imeiString);
        return [];
      }
    }

    return [];
  };

  // Função auxiliar para fazer parse seguro do IMEI (compatibilidade)
  const safeParseIMEI = (imeiString: string) => {
    const devices = parseIMEIField(imeiString);
    // Retorna o primeiro dispositivo para compatibilidade
    return devices.length > 0 ? devices[0] : null;
  };

  const fetchUsers = async () => {
    try {
      console.log('=== BUSCANDO USUARIOS ===');
      const userList = await FirebaseUserService.getAllUsers();
      console.log('Usuários encontrados:', userList.length);
      setUsers(userList);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro: Não foi possível carregar os usuários.');
      setUsers([]);
    }
  };

  const refreshData = async () => {
    console.log('=== ATUALIZANDO DADOS ===');
    setIsRefreshing(true);
    try {
      await fetchUsers();
      await loadLogs(); // Recarregar logs centralizados
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      console.error('Erro no refresh:', error);
      toast.error('Erro ao atualizar os dados.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('=== useEffect ADMIN DASHBOARD ===');
    const loadData = async () => {
      setIsLoading(true);

      try {
        await fetchUsers();
        loadLogs();
        console.log('Dados carregados com sucesso');
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const renderContent = () => {
    console.log('Renderizando view:', activeView);

    const filteredActivities = recentActivities.filter(activity => {
      const matchesSearch = 
        activity.userEmail?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        activity.action?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        activity.details?.toLowerCase().includes(activitySearch.toLowerCase());
      
      const matchesFilter = activityFilter === 'all' || 
        (activityFilter === 'error' && (activity.action?.toLowerCase().includes('erro') || activity.action?.toLowerCase().includes('fail'))) ||
        (activityFilter === 'auth' && (activity.action?.toLowerCase().includes('login') || activity.action?.toLowerCase().includes('auth'))) ||
        (activityFilter === 'payment' && (activity.action?.toLowerCase().includes('pagamento') || activity.action?.toLowerCase().includes('pix')));

      return matchesSearch && matchesFilter;
    });

    switch (activeView) {
      case 'overview':
        // Converter FirebaseUser para User para o dashboard
        const convertedUsersOverview = users.map(user => ({
          id: user.uid,
          Nome: user.name,
          Email: user.email,
          Logins: user.totalLogins || 0,
          Dias: user.expiryDate ? Math.floor((new Date(user.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0,
          Pagamento: user.isActive ? 'Ativo' : 'Expirado'
        }));

        return (
          <div className="space-y-8">
            {/* Central de Alertas em Tempo Real */}
            <AdminAlertCenter />

            {/* Métricas Resumidas */}
            <AdminOverviewMetrics users={users} logs={logs} />

            {/* Gráficos em Tempo Real */}
            <VisualMetricsDashboard users={convertedUsersOverview} logs={logs} />

            {/* Atividades Recentes - Tempo Real */}
            <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Atividades Recentes
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        🔴 AO VIVO
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Últimas {Math.min(filteredActivities.length, 15)} atividades filtradas (Monitoramento Global)
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por usuário ou ação..."
                        className="pl-9 w-full sm:w-[250px] bg-background/50"
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                      />
                    </div>
                    <Select value={activityFilter} onValueChange={setActivityFilter}>
                      <SelectTrigger className="w-full sm:w-[150px] bg-background/50">
                        <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Filtrar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos Eventos</SelectItem>
                        <SelectItem value="auth">Autenticação</SelectItem>
                        <SelectItem value="payment">Pagamentos</SelectItem>
                        <SelectItem value="error">Erros/Falhas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando atividades em tempo real...</p>
                  </div>
                ) : filteredActivities.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredActivities.slice(0, 15).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 modern-card bg-gradient-to-r from-card/80 to-card/60 border border-border/30 hover:shadow-soft transition-all duration-300 animate-pulse-once">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                              {log.userEmail}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500">
                              Firebase
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground font-medium">{log.action}</p>
                          {log.details && (
                            <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="flex items-center justify-center w-16 h-16 bg-muted/20 rounded-full mb-4 mx-auto">
                      <Activity className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium">Nenhuma atividade registrada</p>
                    <p className="text-xs text-muted-foreground mt-1">As atividades aparecerão aqui quando os usuários interagirem com o sistema</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case 'users':
        return (
          <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40">
            <CardHeader>
              <CardTitle className="text-foreground">Lista de Usuários com IMEI</CardTitle>
              <CardDescription className="text-muted-foreground">
                Dados obtidos diretamente da base de dados incluindo IMEI dos dispositivos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-muted/20">
                      <TableHead className="text-muted-foreground font-medium">ID</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Nome</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Email</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Total Logins</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Dispositivos</TableHead>
                      <TableHead className="text-muted-foreground font-medium">Último IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      return (
                        <TableRow key={user.uid} className="border-border/40 hover:bg-muted/10 transition-colors">
                          <TableCell className="text-muted-foreground font-mono">{user.uid}</TableCell>
                          <TableCell className="text-foreground font-medium">{user.name || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell className="text-muted-foreground">
                            <Badge variant="outline" className="font-mono">
                              {user.totalLogins || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "destructive"}>
                              {user.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {user.deviceInfo ? (
                              <div className="p-2 bg-muted/20 rounded border border-border/20">
                                <div className="text-accent font-mono text-xs">{user.deviceInfo.imei || '-'}</div>
                                <div className="text-xs">{user.deviceInfo.dispositivo || '-'}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">{user.deviceInfo?.ip || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      case 'activity':
        return (
          <Card className="modern-card bg-card border-border/40">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                Logs de Atividade - Tempo Real
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  🔴 AO VIVO
                </Badge>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Todas as ações dos usuários em tempo real via Firebase ({logs.length} registros)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando logs em tempo real...</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2 px-2">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40">
                      <TableHead className="text-muted-foreground">Data/Hora</TableHead>
                      <TableHead className="text-muted-foreground">Usuário</TableHead>
                      <TableHead className="text-muted-foreground">Ação</TableHead>
                      <TableHead className="text-muted-foreground">Detalhes</TableHead>
                      <TableHead className="text-muted-foreground">Fonte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="border-border/40 animate-fade-in">
                        <TableCell className="text-muted-foreground">{new Date(log.timestamp).toLocaleString('pt-BR') || '-'}</TableCell>
                        <TableCell className="text-foreground">{log.userEmail || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={log.action.includes('Erro') ? 'destructive' :
                              log.action.includes('Login') || log.action.includes('Online') ? 'default' : 'secondary'}
                          >
                            {log.action || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{log.details || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                            Firebase Realtime
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'date-logs':
        return <DateRangeFilter logs={logs} />;
      case 'metrics':
        // Converter FirebaseUser para User para o dashboard
        const convertedUsers = users.map(user => ({
          id: user.uid,
          Nome: user.name,
          Email: user.email,
          Logins: user.totalLogins || 0,
          Dias: Math.floor((new Date(user.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
          Pagamento: user.isActive ? 'Ativo' : 'Expirado'
        }));
        return <VisualMetricsDashboard users={convertedUsers} logs={logs} />;
      case 'products':
        return <AdminProducts />;
      case 'notifications':
        return <AdminNotifications />;
      case 'user-management':
        return <AdminUsers onUserCreated={refreshData} />;
      case 'firebase-users':
        return <AdminFirebaseUsers />;
      case 'registration-control':
        return <AdminRegistrationControl />;
      case 'plans':
        return <AdminPlans />;
      case 'plan-requests':
        return <AdminPlanosSolicitados />;
      case 'offers':
        return <AdminOffers />;
      case 'user-permissions':
        return <AdminUserPermissions />;
      case 'import-config':
        return <AdminImportConfig />;
      case 'series-correction':
        return <AdminSeriesCorrection />;
      case 'chat':
        return <AdminChat />;
      case 'suporte-prioritario':
        return <AdminSuportePrioritario />;
      case 'security-center':
        return <SecurityCenter />;
      case 'whatsapp':
        return <AdminWhatsApp />;
      case 'maintenance':
        return <AdminMaintenanceControl />;
      case 'access-expired-config':
        return <AdminAccessExpiredSettings />;
      case 'expiration-notifications':
        return <AdminExpirationNotifications />;
      case 'announcements':
        return <AdminAnnouncements />;
      case 'user-action-history':
        return <AdminUserActionHistory />;
      case 'referrals':
        return <AdminReferrals />;
      case 'system-updates':
        return <AdminSystemUpdates />;
      case 'seasonal-theme':
        return <AdminSeasonalTheme />;
      case 'financial':
        return <AdminFinancialDashboard />;
      case 'planos-config':
        return <AdminPlanosConfig />;
      case 'series-update-config':
        return <AdminSeriesUpdateConfig />;
      case 'miniseries-config':
        return <AdminMiniseriesConfig />;
      case 'api-keys':
        return <AdminApiKeys />;
      case 'protected-channels':
        return <AdminProtectedChannels />;
      case 'cloak-links':
        return <AdminCloakLinks />;
      case 'cloak-dashboard':
        return <AdminCloakDashboard />;
      case 'push-center':
        return <AdminPushCenter />;
      default:
        return <div className="text-foreground">Selecione uma opção do menu</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex w-full overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        activeView={activeView}
        onViewChange={(view) => { setActiveView(view); setMobileNavOpen(false); }}
        adminUser={adminUser}
        isRefreshing={isRefreshing}
        onRefresh={refreshData}
        onLogout={logout}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
      />

      {/* Main Content */}
      <div id="admin-main-content" className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto scroll-smooth custom-scrollbar">
          <div className="flex flex-col min-h-full">
            {/* Topbar mobile */}
            <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 h-14 border-b border-purple-500/10 bg-card/80 backdrop-blur-md">
              <Button
                variant="outline"
                size="icon"
                aria-label="Abrir menu"
                className="border-purple-500/20 bg-purple-500/5"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <span className="text-sm font-semibold text-foreground truncate">Admin Panel</span>
            </div>
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto space-y-4">
                {/* Banner de manutenção fixo quando ativo */}
                {isMaintenanceActive && maintenanceState && (
                  <Card className="modern-card border-destructive/40 bg-destructive/10">
                    <CardContent className="py-3 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-destructive/20 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                            Sistema em modo de manutenção
                            <Badge variant="outline" className="border-destructive/40 text-destructive text-[11px]">
                              VISÍVEL PARA TODOS OS USUÁRIOS
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {maintenanceState.message || 'Os usuários estão vendo a página de manutenção neste momento.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {maintenanceState.estimatedEnd && (
                          <span className="text-xs text-muted-foreground hidden sm:inline-flex">
                            Previsto até: {new Date(maintenanceState.estimatedEnd).toLocaleString('pt-BR')}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/50 text-destructive hover:bg-destructive/10"
                          onClick={() => setActiveView('maintenance')}
                       >
                          Ajustar manutenção
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Header */}
                <AdminHeader
                  activeView={activeView}
                  users={users}
                  logs={logs}
                />

                {/* Content */}
                <div className="animate-fade-in-up">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
