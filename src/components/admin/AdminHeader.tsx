import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, Shield, Zap, AlertTriangle, Megaphone } from 'lucide-react';

interface AdminHeaderProps {
  activeView: string;
  users: any[];
  logs: any[];
}

const viewTitles: Record<string, { title: string; description: string; icon: any }> = {
  overview: {
    title: 'Visão Geral do Sistema',
    description: 'Acompanhe as principais métricas e atividades do sistema',
    icon: Shield
  },
  users: {
    title: 'Gerenciamento de Usuários',
    description: 'Visualize e gerencie todos os usuários cadastrados',
    icon: Users
  },
  activity: {
    title: 'Logs de Atividade',
    description: 'Monitore todas as ações realizadas no sistema',
    icon: Activity
  },
  'date-logs': {
    title: 'Logs por Período',
    description: 'Filtre e analise logs por intervalo de datas',
    icon: Activity
  },
  metrics: {
    title: 'Métricas Visuais',
    description: 'Gráficos e estatísticas detalhadas do sistema',
    icon: Zap
  },
  products: {
    title: 'Gerenciar Produtos',
    description: 'Configure e administre produtos disponíveis',
    icon: Shield
  },
  notifications: {
    title: 'Central de Notificações',
    description: 'Gerencie mensagens e alertas do sistema',
    icon: Shield
  },
  'user-management': {
    title: 'Cadastro de Usuários',
    description: 'Adicione novos usuários ao sistema',
    icon: Users
  },
  plans: {
    title: 'Gerenciar Planos',
    description: 'Configure planos e assinaturas disponíveis',
    icon: Shield
  },
  'plan-requests': {
    title: 'Solicitações de Planos',
    description: 'Analise e aprove solicitações de novos planos',
    icon: Shield
  },
  'user-permissions': {
    title: 'Permissões de Usuário',
    description: 'Configure níveis de acesso e permissões',
    icon: Users
  },
  'import-config': {
    title: 'Configurações de Importação',
    description: 'Gerencie configurações para importação de dados',
    icon: Shield
  },
  'series-correction': {
    title: 'Correção de Séries',
    description: 'Ferramentas para corrigir dados de séries',
    icon: Shield
  },
  chat: {
    title: 'Suporte ao Vivo',
    description: 'Interface de chat para suporte em tempo real',
    icon: Shield
  },
  'suporte-prioritario': {
    title: 'Suporte Prioritário',
    description: 'Atendimento especializado para clientes premium',
    icon: Shield
  },
  'expiration-notifications': {
    title: 'Notificações de Expiração',
    description: 'Gerenciar avisos de expiração de assinatura dos usuários',
    icon: AlertTriangle
  },
  'announcements': {
    title: 'Gerenciar Anúncios',
    description: 'Criar e gerenciar anúncios para os usuários do sistema',
    icon: Megaphone
  }
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({ activeView, users, logs }) => {
  const currentView = viewTitles[activeView] || viewTitles.overview;
  const Icon = currentView.icon;

  return (
    <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
      {/* Title Section */}
      <div className="flex items-center gap-3 sm:gap-4 animate-fade-in">
        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-fuchsia-500/10 rounded-xl border border-purple-500/20 shadow-md">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-purple-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent break-words">
            {currentView.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{currentView.description}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up">
        {/* Card 1: Usuários */}
        <Card className="bg-card/30 border-purple-500/10 backdrop-blur-md hover:border-purple-500/25 shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all duration-500 hover:-translate-y-1 rounded-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Total de Usuários</p>
                <p className="text-3xl font-bold text-foreground mt-2">{users.length}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500/15 to-purple-600/10 rounded-xl border border-purple-500/20 shadow-inner">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs px-2 py-0.5">
                {users.filter(user => user.isActive).length} ativos
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Dispositivos */}
        <Card className="bg-card/30 border-purple-500/10 backdrop-blur-md hover:border-purple-500/25 shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all duration-500 hover:-translate-y-1 rounded-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Dispositivos</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {users.filter(user => user.deviceInfo?.imei).length}
                </p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-fuchsia-500/15 to-fuchsia-600/10 rounded-xl border border-fuchsia-500/20 shadow-inner">
                <Shield className="w-5 h-5 text-fuchsia-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Badge variant="outline" className="text-xs border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/5 px-2 py-0.5">
                Únicos
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Atividades */}
        <Card className="bg-card/30 border-purple-500/10 backdrop-blur-md hover:border-purple-500/25 shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all duration-500 hover:-translate-y-1 rounded-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Atividades</p>
                <p className="text-3xl font-bold text-foreground mt-2">{logs.length}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-violet-500/15 to-violet-600/10 rounded-xl border border-violet-500/20 shadow-inner">
                <Activity className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs px-2 py-0.5">
                Registradas
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Status do Sistema */}
        <Card className="bg-card/30 border-purple-500/10 backdrop-blur-md hover:border-purple-500/25 shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all duration-500 hover:-translate-y-1 rounded-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Sistema</p>
                <p className="text-3xl font-bold text-emerald-400 mt-2">Online</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 rounded-xl border border-emerald-500/20 shadow-inner">
                <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-400 font-medium font-mono">Operacional</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};