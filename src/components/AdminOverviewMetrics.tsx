
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        
        const getMetricStyles = (title: string) => {
          switch (title) {
            case "Total de Usuários":
              return {
                iconColor: "text-blue-400",
                iconBg: "from-blue-500/15 to-blue-600/10 border-blue-500/20",
                badgeClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              };
            case "Usuários Ativos":
              return {
                iconColor: "text-emerald-400",
                iconBg: "from-emerald-500/15 to-emerald-600/10 border-emerald-500/20",
                badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              };
            case "Dispositivos Conectados":
              return {
                iconColor: "text-purple-400",
                iconBg: "from-purple-500/15 to-purple-600/10 border-purple-500/20",
                badgeClass: "bg-purple-500/10 text-purple-400 border border-purple-500/20"
              };
            default: // Atividades Registradas
              return {
                iconColor: "text-orange-400",
                iconBg: "from-orange-500/15 to-orange-600/10 border-orange-500/20",
                badgeClass: "bg-orange-500/10 text-orange-400 border border-orange-500/20"
              };
          }
        };

        const styles = getMetricStyles(metric.title);

        return (
          <Card 
            key={index} 
            className="bg-card/30 border-purple-500/10 backdrop-blur-md hover:border-purple-500/25 shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all duration-500 hover:-translate-y-1 rounded-2xl overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                {metric.title}
              </CardTitle>
              <div className={`flex items-center justify-center w-10 h-10 bg-gradient-to-br ${styles.iconBg} rounded-xl shadow-inner`}>
                <Icon className={`h-4 w-4 ${styles.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-baseline space-x-2">
                <div className="text-3xl font-extrabold text-foreground tracking-tight">
                  {(metric.value ?? 0).toLocaleString()}
                </div>
                {metric.trend !== null && (
                  <Badge 
                    className={`text-xs px-2 py-0.5 border-none ${styles.badgeClass}`}
                  >
                    {typeof metric.trend === 'number' ? (
                      metric.trendLabel === "Taxa ativa" || metric.trendLabel === "Taxa uso" ? (
                        <>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {metric.trend}%
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          +{metric.trend}
                        </>
                      )
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        {metric.trendLabel}: {metric.trend}
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center">
                <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminOverviewMetrics;
