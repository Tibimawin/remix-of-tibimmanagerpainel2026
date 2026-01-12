
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
        
        return (
          <Card 
            key={index} 
            className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${metric.color}/20`}>
                <Icon className={`h-4 w-4 text-white`} style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <div className="text-3xl font-bold text-foreground">
                  {metric.value.toLocaleString()}
                </div>
                {metric.trend !== null && (
                  <Badge 
                    variant={
                      typeof metric.trend === 'number' && metric.trend > 0 
                        ? "default" 
                        : metric.trend === 0 
                          ? "secondary" 
                          : "outline"
                    }
                    className="text-xs"
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
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
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
