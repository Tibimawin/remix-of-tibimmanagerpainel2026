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
    <div className="mb-8 space-y-6">
      {/* Title Section */}
      <div className="flex items-center space-x-4 animate-fade-in">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/20">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {currentView.title}
          </h1>
          <p className="text-muted-foreground mt-1">{currentView.description}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
        <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40 hover:shadow-soft transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {users.filter(user => user.Status_Ativo === 'Ativo').length} ativos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40 hover:shadow-soft transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dispositivos</p>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(user => user.IMEI).length}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-lg">
                <Shield className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs border-accent/30 text-accent">
                Únicos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40 hover:shadow-soft transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Atividades</p>
                <p className="text-2xl font-bold text-foreground">{logs.length}</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="default" className="text-xs">
                Registradas
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card bg-gradient-to-br from-card to-card/80 border-border/40 hover:shadow-soft transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sistema</p>
                <p className="text-2xl font-bold text-green-500">Online</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 bg-green-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-500">Operacional</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};