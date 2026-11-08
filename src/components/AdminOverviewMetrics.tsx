
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Smartphone, Activity, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface AdminOverviewMetricsProps {
  users: any[];
  logs: any[];
}

const AdminOverviewMetrics: React.FC<AdminOverviewMetricsProps> = ({ users, logs }) => {
  // Calcular métricas usando a estrutura correta do Firebase
  const totalUsuarios = users.length;
  
  // Usuários ativos: verificar se isActive é true e se não expirou
  const usuariosAtivos = users.filter(user => {
    if (!user.isActive) return false;
    
    try {
      const expirationDate = new Date(user.expiryDate);
      const today = new Date();
      return expirationDate > today;
    } catch {
      return false;
    }
  }).length;
  
  // Dispositivos únicos: usuários que fizeram login (têm deviceInfo ou lastLogin)
  const dispositivosUnicos = users.filter(user => 
    user.deviceInfo || user.lastLogin || user.totalLogins > 0
  ).length;
  
  const atividadesRegistradas = logs.length;
  
  // Calcular atividades recentes (últimas 24h)
  const hojeTimestamp = new Date();
  hojeTimestamp.setHours(0, 0, 0, 0);
  const atividadesRecentes = logs.filter(log => {
    try {
      const logDate = new Date(log.timestamp);
      return logDate >= hojeTimestamp;
    } catch {
      return false;
    }
  }).length;

  // Calcular usuários criados nas últimas 24h
  const novosUsuarios = users.filter(user => {
    try {
      const createdDate = new Date(user.createdAt);
      return createdDate >= hojeTimestamp;
    } catch {
      return false;
    }
  }).length;

  console.log('Métricas calculadas:', {
    totalUsuarios,
    usuariosAtivos,
    dispositivosUnicos,
    atividadesRegistradas,
    atividadesRecentes,
    novosUsuarios
  });

  const metrics = [
    {
      title: "Total de Usuários",
      value: totalUsuarios,
      description: "Cadastrados no sistema",
      icon: Users,
      color: "bg-blue-500",
      trend: novosUsuarios > 0 ? novosUsuarios : null,
      trendLabel: "Novos hoje"
    },
    {
      title: "Usuários Ativos",
      value: usuariosAtivos,
      description: "Com acesso válido",
      icon: UserCheck,
      color: "bg-green-500",
      trend: totalUsuarios > 0 ? Math.round((usuariosAtivos / totalUsuarios) * 100) : 0,
      trendLabel: "Taxa ativa"
    },
    {
      title: "Dispositivos Conectados",
      value: dispositivosUnicos,
      description: "Usuários que fizeram login",
      icon: Smartphone,
      color: "bg-purple-500",
      trend: usuariosAtivos > 0 ? Math.round((dispositivosUnicos / usuariosAtivos) * 100) : 0,
      trendLabel: "Taxa uso"
    },
    {
      title: "Atividades Registradas",
      value: atividadesRegistradas,
      description: "Logs de sistema",
      icon: Activity,
      color: "bg-orange-500",
      trend: atividadesRecentes,
      trendLabel: "Hoje"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;

        const getMetricStyles = (title: string) => {
          switch (title) {
            case "Total de Usuários":
              return {
                iconColor: "text-blue-400",
                iconBg: "from-blue-500/15 to-blue-600/10 border-blue-500/25",
                badgeClass: "bg-blue-500/10 text-blue-300 border border-blue-500/25"
              };
            case "Usuários Ativos":
              return {
                iconColor: "text-emerald-400",
                iconBg: "from-emerald-500/15 to-emerald-600/10 border-emerald-500/25",
                badgeClass: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
              };
            case "Dispositivos Conectados":
              return {
                iconColor: "text-purple-400",
                iconBg: "from-purple-500/15 to-purple-600/10 border-purple-500/25",
                badgeClass: "bg-purple-500/10 text-purple-300 border border-purple-500/25"
              };
            default: // Atividades Registradas
              return {
                iconColor: "text-amber-400",
                iconBg: "from-amber-500/15 to-amber-600/10 border-amber-500/25",
                badgeClass: "bg-amber-500/10 text-amber-300 border border-amber-500/25"
              };
          }
        };

        const styles = getMetricStyles(metric.title);

        return (
          <Card
            key={index}
            className="bg-card/40 border border-purple-500/15 backdrop-blur-md hover:border-purple-500/30 transition-all duration-300 rounded-xl overflow-hidden shadow-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                {metric.title}
              </CardTitle>
              <div className={`flex items-center justify-center w-9 h-9 bg-gradient-to-br ${styles.iconBg} rounded-lg border shadow-inner`}>
                <Icon className={`h-4 w-4 ${styles.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground tracking-tight">
                  {(metric.value ?? 0).toLocaleString()}
                </div>
                {metric.trend !== null && (
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-mono tabular-nums px-2 py-0.5 ${styles.badgeClass}`}
                  >
                    {typeof metric.trend === 'number' ? (
                      metric.trendLabel === "Taxa ativa" || metric.trendLabel === "Taxa uso" ? (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {metric.trend}%
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          +{metric.trend} hoje
                        </span>
                      )
                    ) : (
                      <span>{metric.trendLabel}: {metric.trend}</span>
                    )}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{metric.description}</span>
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminOverviewMetrics;
