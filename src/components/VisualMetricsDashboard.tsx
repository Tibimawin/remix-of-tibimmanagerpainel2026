
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { subDays, format, isAfter } from 'date-fns';

interface User {
  id: string;
  Nome: string;
  Email: string;
  Logins: number;
  Dias: number;
  Pagamento: string;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  details?: string;
}

interface VisualMetricsDashboardProps {
  users: User[];
  logs: ActivityLog[];
}

const VisualMetricsDashboard: React.FC<VisualMetricsDashboardProps> = ({ users, logs }) => {
  const metrics = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    
    // Usuários ativos nos últimos 7 dias (com base nos logs)
    const activeUsers = new Set(
      logs
        .filter(log => {
          try {
            const logDate = new Date(log.timestamp);
            if (isNaN(logDate.getTime())) {
              console.warn('Data inválida no log:', log.timestamp);
              return false;
            }
            return isAfter(logDate, sevenDaysAgo);
          } catch (error) {
            console.warn('Erro ao processar data do log:', log.timestamp, error);
            return false;
          }
        })
        .map(log => log.userEmail)
    ).size;

    // Ações por dia (últimos 7 dias)
    const actionsByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dayLogs = logs.filter(log => {
        try {
          const logDate = new Date(log.timestamp);
          if (isNaN(logDate.getTime())) {
            return false;
          }
          return format(logDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        } catch (error) {
          return false;
        }
      });
      
      actionsByDay.push({
        date: format(date, 'dd/MM'),
        actions: dayLogs.length,
        logins: dayLogs.filter(log => log.action.toLowerCase().includes('login')).length,
        other: dayLogs.filter(log => !log.action.toLowerCase().includes('login')).length
      });
    }

    // Ações por tipo
    const actionsByType = logs.reduce((acc, log) => {
      let type = 'Outras';
      const action = log.action.toLowerCase();
      
      if (action.includes('login')) type = 'Login';
      else if (action.includes('criar') || action.includes('create')) type = 'Criar';
      else if (action.includes('editar') || action.includes('edit')) type = 'Editar';
      else if (action.includes('deletar') || action.includes('delete')) type = 'Deletar';
      
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pieData = Object.entries(actionsByType).map(([name, value]) => ({
      name,
      value,
      percentage: logs.length > 0 ? Math.round((value / logs.length) * 100) : 0
    }));

    // Ações com possíveis erros (baseado em palavras-chave)
    const errorActions = logs.filter(log => 
      log.action.toLowerCase().includes('erro') ||
      log.action.toLowerCase().includes('falha') ||
      log.action.toLowerCase().includes('error') ||
      log.details?.toLowerCase().includes('erro') ||
      log.details?.toLowerCase().includes('falha')
    );

    return {
      activeUsers,
      totalActions: logs.length,
      actionsByDay,
      pieData,
      errorActions
    };
  }, [users, logs]);

  const chartConfig = {
    actions: {
      label: "Ações",
      color: "#3b82f6",
    },
    logins: {
      label: "Logins",
      color: "#10b981",
    },
    other: {
      label: "Outras",
      color: "#f59e0b",
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Usuários Ativos (7 dias)</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.activeUsers}</div>
            <p className="text-xs text-slate-400">Únicos com atividade</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total de Ações</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.totalActions}</div>
            <p className="text-xs text-slate-400">Todas as atividades</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Média Diária</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {Math.round(metrics.totalActions / 7)}
            </div>
            <p className="text-xs text-slate-400">Ações por dia</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Possíveis Erros</CardTitle>
            <AlertTriangle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.errorActions.length}</div>
            <p className="text-xs text-slate-400">Ações com problemas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Ações por Dia */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Ações por Dia (Últimos 7 dias)</CardTitle>
            <CardDescription className="text-slate-400">
              Distribuição das atividades diárias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.actionsByDay.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.actionsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="logins" stackId="a" fill="#10b981" />
                    <Bar dataKey="other" stackId="a" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-slate-400">Nenhum dado disponível para exibir</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Ações por Tipo */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Ações por Tipo</CardTitle>
            <CardDescription className="text-slate-400">
              Distribuição dos tipos de atividades
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.pieData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {metrics.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-slate-400">Nenhum dado disponível para exibir</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Erros */}
      {metrics.errorActions.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Ações com Possíveis Erros</CardTitle>
            <CardDescription className="text-slate-400">
              Atividades que podem ter apresentado problemas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Data/Hora</TableHead>
                  <TableHead className="text-slate-300">Usuário</TableHead>
                  <TableHead className="text-slate-300">Ação</TableHead>
                  <TableHead className="text-slate-300">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.errorActions.slice(0, 10).map((log) => (
                  <TableRow key={log.id} className="border-slate-700">
                    <TableCell className="text-slate-300">{log.timestamp}</TableCell>
                    <TableCell className="text-white">{log.userEmail}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Erro</Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">{log.details || log.action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VisualMetricsDashboard;
