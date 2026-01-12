
import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Activity, Calendar, TrendingUp } from 'lucide-react';
import { subDays, format } from 'date-fns';

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

interface OverviewChartsProps {
  users: User[];
  logs: ActivityLog[];
}

const OverviewCharts: React.FC<OverviewChartsProps> = ({ users, logs }) => {
  // Mover a função calculateRemainingDays para fora do useMemo
  const calculateRemainingDays = (user: User) => {
    try {
      if (!user.Pagamento || !user.Dias) {
        return 0;
      }
      
      const dias = Number(user.Dias) || 0;
      const pagamento = new Date(user.Pagamento);
      
      // Verificar se a data é válida
      if (isNaN(pagamento.getTime())) {
        console.warn('Data de pagamento inválida para usuário:', user.Email, user.Pagamento);
        return 0;
      }
      
      const hoje = new Date();
      const diffDays = Math.floor((hoje.getTime() - pagamento.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, dias - diffDays);
    } catch (error) {
      console.error('Erro ao calcular dias restantes:', error);
      return 0;
    }
  };

  const chartData = useMemo(() => {
    const now = new Date();
    const last7Days = [];
    
    // Dados dos últimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dayLogs = logs.filter(log => {
        try {
          const logDate = new Date(log.timestamp);
          if (isNaN(logDate.getTime())) {
            console.warn('Data inválida no log:', log.timestamp);
            return false;
          }
          return format(logDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        } catch (error) {
          console.warn('Erro ao processar data do log:', log.timestamp, error);
          return false;
        }
      });
      
      last7Days.push({
        date: format(date, 'dd/MM'),
        atividades: dayLogs.length,
        logins: dayLogs.filter(log => log.action.toLowerCase().includes('login')).length
      });
    }

    // Status dos usuários com validação de datas
    const activeUsers = users.filter(user => {
      const diasRestantes = calculateRemainingDays(user);
      return diasRestantes > 0;
    }).length;

    const expiredUsers = users.length - activeUsers;

    const userStatusData = [
      { name: 'Ativos', value: activeUsers, color: '#10b981' },
      { name: 'Expirados', value: expiredUsers, color: '#ef4444' }
    ];

    // Distribuição de logins
    const loginDistribution = users.map(user => ({
      nome: user.Nome || 'Sem nome',
      logins: user.Logins || 0
    })).sort((a, b) => b.logins - a.logins).slice(0, 5);

    return {
      last7Days,
      userStatusData,
      loginDistribution
    };
  }, [users, logs, calculateRemainingDays]);

  const chartConfig = {
    atividades: {
      label: "Atividades",
      color: "#3b82f6",
    },
    logins: {
      label: "Logins",
      color: "#10b981",
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Atividades dos Últimos 7 Dias */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Atividades dos Últimos 7 Dias
          </CardTitle>
          <CardDescription className="text-slate-400">
            Número de atividades e logins por dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="atividades" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="logins" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Status dos Usuários */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Status dos Usuários
          </CardTitle>
          <CardDescription className="text-slate-400">
            Distribuição entre usuários ativos e expirados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.userStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.userStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Top 5 Usuários por Logins */}
      <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Top 5 Usuários por Logins
          </CardTitle>
          <CardDescription className="text-slate-400">
            Usuários mais ativos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.loginDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="nome" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="logins" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewCharts;
