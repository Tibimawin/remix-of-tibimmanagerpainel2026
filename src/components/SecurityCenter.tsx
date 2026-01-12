import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useActiveSessions } from '@/hooks/useActiveSessions';
import { useLoginIPs } from '@/hooks/useLoginIPs';
import { useLoginAttempts } from '@/hooks/useLoginAttempts';
import { toast } from 'sonner';
import { 
  Shield, 
  Users, 
  LogOut, 
  MapPin, 
  AlertTriangle, 
  Eye,
  Construction,
  Circle,
  RefreshCw,
  Globe,
  Wifi,
  TrendingUp
} from 'lucide-react';

export const SecurityCenter: React.FC = () => {
  const { sessions, isLoading, onlineCount, refreshSessions, forceLogout } = useActiveSessions();
  const { 
    loginIPs, 
    isLoading: isLoadingIPs, 
    uniqueIPs, 
    refreshIPs, 
    getIPsByRisk,
    getMostActiveIPs 
  } = useLoginIPs();
  const {
    attempts,
    isLoading: isLoadingAttempts,
    failedAttempts,
    suspiciousIPs,
    totalAttempts,
    successfulAttempts,
    failedAttemptsCount,
    refreshAttempts,
    getAttemptsByTimeframe,
    getMostTargetedEmails
  } = useLoginAttempts();

  const handleForceLogout = async (userId: string, email: string, userName: string) => {
    if (window.confirm(`Tem certeza que deseja forçar o logout de ${userName} (${email})?`)) {
      const success = await forceLogout(userId, email);
      if (success) {
        toast.success(`Logout forçado com sucesso para ${userName}`);
      } else {
        toast.error('Erro ao forçar logout');
      }
    }
  };

  const handleMassLogout = async () => {
    if (window.confirm(`Tem certeza que deseja forçar o logout de TODOS os usuários ativos? Esta ação irá desconectar ${sessions.length} usuários.`)) {
      let successCount = 0;
      let failCount = 0;
      
      for (const session of sessions) {
        try {
          const success = await forceLogout(session.id, session.email);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} usuários desconectados com sucesso`);
      }
      if (failCount > 0) {
        toast.error(`Falha ao desconectar ${failCount} usuários`);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'recent': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">🟢 Online</Badge>;
      case 'recent': return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">🟡 Recente</Badge>;
      default: return <Badge variant="secondary">⚫ Offline</Badge>;
    }
  };

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">🟢 Baixo</Badge>;
      case 'medium': return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">🟡 Médio</Badge>;
      case 'high': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">🔴 Alto</Badge>;
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary via-primary/80 to-accent rounded-xl shadow-lg">
          <Shield className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            🔒 Central de Segurança
          </h1>
          <p className="text-muted-foreground">
            Monitoramento e controle de segurança do sistema
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active-sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active-sessions" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Sessões Ativas</span>
          </TabsTrigger>
          <TabsTrigger value="force-logout" className="flex items-center space-x-2">
            <LogOut className="w-4 h-4" />
            <span>Forçar Logout</span>
          </TabsTrigger>
          <TabsTrigger value="login-ips" className="flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>IPs de Login</span>
          </TabsTrigger>
          <TabsTrigger value="login-attempts" className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Tentativas de Login</span>
          </TabsTrigger>
        </TabsList>

        {/* Sessões Ativas */}
        <TabsContent value="active-sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Sessões Ativas</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    🔴 AO VIVO
                  </Badge>
                </div>
                <Button 
                  onClick={refreshSessions} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
              <CardDescription>
                Usuários com atividade nos últimos 15 minutos • {onlineCount} online agora
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando sessões ativas...</p>
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-4">
                  {/* Resumo */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 modern-card bg-green-500/5 border border-green-500/20">
                      <div className="text-2xl font-bold text-green-500">{onlineCount}</div>
                      <div className="text-sm text-muted-foreground">Online Agora</div>
                    </div>
                    <div className="text-center p-4 modern-card bg-yellow-500/5 border border-yellow-500/20">
                      <div className="text-2xl font-bold text-yellow-500">{sessions.filter(s => s.status === 'recent').length}</div>
                      <div className="text-sm text-muted-foreground">Recentemente Ativo</div>
                    </div>
                    <div className="text-center p-4 modern-card bg-primary/5 border border-primary/20">
                      <div className="text-2xl font-bold text-primary">{sessions.length}</div>
                      <div className="text-sm text-muted-foreground">Total de Sessões</div>
                    </div>
                  </div>

                  {/* Tabela de Sessões */}
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40">
                        <TableHead>Status</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Último Login</TableHead>
                        <TableHead>Tempo</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id} className="border-border/40">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Circle className={`w-3 h-3 fill-current ${getStatusColor(session.status)}`} />
                              {getStatusBadge(session.status)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{session.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{session.email}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(session.lastLogin).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{session.timeAgo}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleForceLogout(session.id, session.email, session.nome)}
                              className="text-destructive hover:text-destructive"
                            >
                              <LogOut className="w-3 h-3 mr-1" />
                              Forçar Logout
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Nenhuma Sessão Ativa</h3>
                    <p className="text-muted-foreground mt-2">
                      Não há usuários com atividade recente nos últimos 15 minutos.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forçar Logout */}
        <TabsContent value="force-logout" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <LogOut className="w-5 h-5" />
                  <span>Forçar Logout</span>
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    🔴 ATIVO
                  </Badge>
                </div>
                <Button 
                  onClick={refreshSessions} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
              <CardDescription>
                Force o logout de usuários específicos ou de todas as sessões ativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Ações em Massa */}
                <Card className="bg-gradient-to-r from-red-500/5 to-orange-500/5 border border-red-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span>Ações de Emergência</span>
                    </CardTitle>
                    <CardDescription>
                      Use com cautela - estas ações afetarão todos os usuários conectados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border">
                      <div>
                        <h4 className="font-semibold text-foreground">Logout em Massa</h4>
                        <p className="text-sm text-muted-foreground">
                          Forçar logout de todos os {sessions.length} usuários ativos imediatamente
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleMassLogout}
                        disabled={isLoading || sessions.length === 0}
                        className="ml-4"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Desconectar Todos
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de Usuários Ativos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Usuários Ativos para Logout Individual</span>
                    </CardTitle>
                    <CardDescription>
                      {sessions.length} usuários disponíveis para logout forçado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Carregando usuários ativos...</p>
                      </div>
                    ) : sessions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/40">
                            <TableHead>Status</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Último Login</TableHead>
                            <TableHead>Tempo Ativo</TableHead>
                            <TableHead>Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessions.map((session) => (
                            <TableRow key={session.id} className="border-border/40">
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Circle className={`w-3 h-3 fill-current ${getStatusColor(session.status)}`} />
                                  {getStatusBadge(session.status)}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{session.nome}</TableCell>
                              <TableCell className="text-muted-foreground">{session.email}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(session.lastLogin).toLocaleString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{session.timeAgo}</TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleForceLogout(session.id, session.email, session.nome)}
                                  className="text-destructive-foreground"
                                >
                                  <LogOut className="w-3 h-3 mr-1" />
                                  Forçar Logout
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 space-y-4">
                        <Users className="w-16 h-16 mx-auto text-muted-foreground" />
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">Nenhum Usuário Ativo</h3>
                          <p className="text-muted-foreground mt-2">
                            Não há usuários conectados no momento para forçar logout.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IPs de Login */}
        <TabsContent value="login-ips" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>IPs de Login</span>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    🌐 ATIVO
                  </Badge>
                </div>
                <Button 
                  onClick={refreshIPs} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoadingIPs}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingIPs ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
              <CardDescription>
                Monitoramento de endereços IP utilizados para acesso ao sistema • {uniqueIPs} IPs únicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingIPs ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando dados de IPs...</p>
                </div>
              ) : loginIPs.length > 0 ? (
                <div className="space-y-6">
                  {/* Estatísticas */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 modern-card bg-blue-500/5 border border-blue-500/20">
                      <div className="text-2xl font-bold text-blue-500">{uniqueIPs}</div>
                      <div className="text-sm text-muted-foreground">IPs Únicos</div>
                    </div>
                    <div className="text-center p-4 modern-card bg-green-500/5 border border-green-500/20">
                      <div className="text-2xl font-bold text-green-500">{getIPsByRisk('low').length}</div>
                      <div className="text-sm text-muted-foreground">Baixo Risco</div>
                    </div>
                    <div className="text-center p-4 modern-card bg-yellow-500/5 border border-yellow-500/20">
                      <div className="text-2xl font-bold text-yellow-500">{getIPsByRisk('medium').length}</div>
                      <div className="text-sm text-muted-foreground">Médio Risco</div>
                    </div>
                    <div className="text-center p-4 modern-card bg-red-500/5 border border-red-500/20">
                      <div className="text-2xl font-bold text-red-500">{getIPsByRisk('high').length}</div>
                      <div className="text-sm text-muted-foreground">Alto Risco</div>
                    </div>
                  </div>

                  {/* IPs Mais Ativos */}
                  <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-lg">
                        <TrendingUp className="w-5 h-5" />
                        <span>IPs Mais Ativos</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getMostActiveIPs().slice(0, 6).map((ipData, index) => (
                          <div key={ipData.ip} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                                <span className="text-sm font-bold text-primary">#{index + 1}</span>
                              </div>
                              <div>
                                <div className="font-medium">{ipData.ip}</div>
                                <div className="text-sm text-muted-foreground">{ipData.userCount} usuário(s)</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-primary">{ipData.totalLogins}</div>
                              <div className="text-sm text-muted-foreground">logins</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tabela Detalhada */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Globe className="w-5 h-5" />
                        <span>Todos os IPs de Login</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/40">
                            <TableHead>IP Address</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Localização</TableHead>
                            <TableHead>Dispositivo</TableHead>
                            <TableHead>Último Login</TableHead>
                            <TableHead>Total Logins</TableHead>
                            <TableHead>Risco</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loginIPs.slice(0, 20).map((ipData) => (
                            <TableRow key={`${ipData.id}-${ipData.ip}`} className="border-border/40">
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Wifi className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-mono text-sm">{ipData.ip}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{ipData.nome}</div>
                                  <div className="text-sm text-muted-foreground">{ipData.email}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{ipData.location}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{ipData.device}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {ipData.lastLogin !== 'N/A' ? new Date(ipData.lastLogin.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3')).toLocaleString('pt-BR') : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono">
                                  {ipData.loginCount}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {getRiskBadge(ipData.risk)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {loginIPs.length > 20 && (
                        <div className="text-center mt-4">
                          <Badge variant="outline" className="text-muted-foreground">
                            Mostrando 20 de {loginIPs.length} registros
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <MapPin className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Nenhum Dado de IP</h3>
                    <p className="text-muted-foreground mt-2">
                      Não há registros de IPs de login disponíveis no momento.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tentativas de Login */}
        <TabsContent value="login-attempts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Tentativas de Login</span>
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                    🔍 MONITORAMENTO
                  </Badge>
                </div>
                <Button 
                  onClick={refreshAttempts} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoadingAttempts}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAttempts ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
              <CardDescription>
                Monitore tentativas de login, detecte padrões suspeitos e analise segurança • Últimos 7 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAttempts ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando tentativas de login...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Estatísticas Gerais */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 modern-card bg-blue-500/5 border border-blue-500/20">
                      <div className="text-2xl font-bold text-blue-500">{totalAttempts}</div>
                      <div className="text-sm text-muted-foreground">Total Tentativas</div>
                    </div>
                    <div className="text-center p-4 modern-card bg-green-500/5 border border-green-500/20">
                      <div className="text-2xl font-bold text-green-500">{successfulAttempts}</div>
                      <div className="text-sm text-muted-foreground">Sucessos</div>
                    </div>
                    <div className="text-center p-4 modern-card bg-red-500/5 border border-red-500/20">
                      <div className="text-2xl font-bold text-red-500">{failedAttemptsCount}</div>
                      <div className="text-sm text-muted-foreground">Falhas</div>
                    </div>
                    <div className="text-center p-4 modern-card bg-orange-500/5 border border-orange-500/20">
                      <div className="text-2xl font-bold text-orange-500">{suspiciousIPs.length}</div>
                      <div className="text-sm text-muted-foreground">IPs Suspeitos</div>
                    </div>
                  </div>

                  {/* Análise de Tempo */}
                  <Card className="bg-gradient-to-r from-orange-500/5 to-red-500/5 border border-orange-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-lg">
                        <TrendingUp className="w-5 h-5" />
                        <span>Análise Temporal</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-background/50 rounded-lg border">
                          <div className="text-lg font-bold text-foreground">{getAttemptsByTimeframe(1).length}</div>
                          <div className="text-sm text-muted-foreground">Última Hora</div>
                        </div>
                        <div className="text-center p-3 bg-background/50 rounded-lg border">
                          <div className="text-lg font-bold text-foreground">{getAttemptsByTimeframe(24).length}</div>
                          <div className="text-sm text-muted-foreground">Últimas 24h</div>
                        </div>
                        <div className="text-center p-3 bg-background/50 rounded-lg border">
                          <div className="text-lg font-bold text-foreground">{getAttemptsByTimeframe(168).length}</div>
                          <div className="text-sm text-muted-foreground">Última Semana</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Emails Mais Atacados */}
                  {getMostTargetedEmails().length > 0 && (
                    <Card className="bg-gradient-to-r from-red-500/5 to-pink-500/5 border border-red-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Emails Mais Atacados</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {getMostTargetedEmails().slice(0, 6).map((emailData, index) => (
                            <div key={emailData.email} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-red-500/10 rounded-full">
                                  <span className="text-sm font-bold text-red-500">#{index + 1}</span>
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{emailData.email}</div>
                                  <div className="text-xs text-muted-foreground">Email alvo</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-red-500">{emailData.attempts}</div>
                                <div className="text-xs text-muted-foreground">falhas</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* IPs Suspeitos */}
                  {suspiciousIPs.length > 0 && (
                    <Card className="bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border border-yellow-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          <span>IPs Suspeitos</span>
                          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            Alto Risco
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          IPs com 5+ tentativas de login falhadas
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {suspiciousIPs.map((ip) => (
                            <div key={ip} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-yellow-500/20">
                              <div className="flex items-center space-x-2">
                                <Wifi className="w-4 h-4 text-yellow-500" />
                                <span className="font-mono text-sm">{ip}</span>
                              </div>
                              <Badge variant="destructive" className="text-xs">
                                BLOQUEAR
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tabela de Tentativas Recentes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Eye className="w-5 h-5" />
                        <span>Tentativas Recentes</span>
                      </CardTitle>
                      <CardDescription>
                        Últimas {Math.min(failedAttempts.length, 20)} tentativas de login falhadas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {failedAttempts.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/40">
                              <TableHead>Timestamp</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>IP</TableHead>
                              <TableHead>Localização</TableHead>
                              <TableHead>Erro</TableHead>
                              <TableHead>Risco</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {failedAttempts.slice(0, 20).map((attempt) => (
                              <TableRow key={attempt.id} className="border-border/40">
                                <TableCell className="text-muted-foreground text-sm">
                                  {new Date(attempt.timestamp).toLocaleString('pt-BR')}
                                </TableCell>
                                <TableCell className="font-medium">{attempt.email}</TableCell>
                                <TableCell>
                                  <span className="font-mono text-sm">{attempt.ip}</span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{attempt.location}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {attempt.errorMessage || 'Credenciais inválidas'}
                                </TableCell>
                                <TableCell>
                                  {getRiskBadge(attempt.risk)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-12 space-y-4">
                          <Eye className="w-16 h-16 mx-auto text-muted-foreground" />
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Nenhuma Tentativa Falhada</h3>
                            <p className="text-muted-foreground mt-2">
                              Não há tentativas de login falhadas registradas nos últimos 7 dias.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};