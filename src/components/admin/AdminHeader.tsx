import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, Activity, Shield, Zap, AlertTriangle, Megaphone, DollarSign,
  Key, Bell, Sparkles, Palette, Tag, RefreshCw, Settings, MessageCircle
} from 'lucide-react';

interface AdminHeaderProps {
  activeView: string;
  users: any[];
  logs: any[];
}

const viewTitles: Record<string, { title: string; description: string; icon: any }> = {
  overview: {
    title: 'Visão Geral do Sistema',
    description: 'Acompanhe as principais métricas e atividades do sistema em tempo real',
    icon: Shield
  },
  users: {
    title: 'Gerenciamento de Usuários',
    description: 'Visualize e gerencie todos os usuários cadastrados e seus dispositivos',
    icon: Users
  },
  activity: {
    title: 'Logs de Atividade em Tempo Real',
    description: 'Monitore todas as ações realizadas no sistema instantaneamente',
    icon: Activity
  },
  'user-action-history': {
    title: 'Histórico de Ações dos Usuários',
    description: 'Auditoria e rastreamento completo de eventos de cada assinante',
    icon: Activity
  },
  'date-logs': {
    title: 'Logs por Período',
    description: 'Filtre e analise logs por intervalo de datas customizado',
    icon: Activity
  },
  metrics: {
    title: 'Métricas Visuais & Gráficos',
    description: 'Gráficos analíticos e estatísticas de uso em tempo real',
    icon: Zap
  },
  products: {
    title: 'Gerenciar Produtos',
    description: 'Configure e administre produtos disponíveis no catálogo',
    icon: Shield
  },
  offers: {
    title: 'Ofertas & Promoções',
    description: 'Crie cupons, campanhas de desconto e ofertas especiais',
    icon: Tag
  },
  referrals: {
    title: 'Sistema de Indicações & Afiliados',
    description: 'Gerencie afiliados, links de indicação e recompensas',
    icon: Users
  },
  'api-keys': {
    title: 'Gerenciador de API Keys',
    description: 'Controle de chaves de API, limites de requisições e rotação segura',
    icon: Key
  },
  announcements: {
    title: 'Gerenciar Anúncios & Banners',
    description: 'Publique comunicados e avisos com exibição direta para os usuários',
    icon: Megaphone
  },
  'system-updates': {
    title: 'Atualizações do Sistema',
    description: 'Notas de lançamento, novidades e controle de versões do painel',
    icon: Sparkles
  },
  notifications: {
    title: 'Central de Notificações',
    description: 'Envie e gerencie mensagens e alertas operacionais',
    icon: Bell
  },
  'push-center': {
    title: 'Central de Push Web & Mobile',
    description: 'Dispare notificações push instantâneas para dispositivos conectados',
    icon: Bell
  },
  'expiration-notifications': {
    title: 'Notificações de Expiração',
    description: 'Configure avisos automáticos de vencimento e renovação de planos',
    icon: AlertTriangle
  },
  'user-management': {
    title: 'Cadastro Rápido de Usuários',
    description: 'Adicione e provisione novos clientes com liberação instantânea',
    icon: Users
  },
  'firebase-users': {
    title: 'Gerenciamento Direto Firebase',
    description: 'Usuários sincronizados e autenticação direta via Firestore/Auth',
    icon: Users
  },
  'registration-control': {
    title: 'Controle de Cadastro',
    description: 'Ative ou restrinja novos registros públicos no sistema',
    icon: Settings
  },
  plans: {
    title: 'Gerenciar Assinaturas & Planos',
    description: 'Controle de planos ativos, periodicidades e faturas',
    icon: DollarSign
  },
  'planos-config': {
    title: 'Configuração de Preços e Planos',
    description: 'Tabela de preços, telas simultâneas e benefícios de cada plano',
    icon: DollarSign
  },
  'plan-requests': {
    title: 'Solicitações de Planos Pendentes',
    description: 'Analise, aprove e libere solicitações de novos planos solicitados',
    icon: Shield
  },
  'user-permissions': {
    title: 'Permissões & Papéis de Acesso',
    description: 'Defina permissões de administrador, moderador e suporte',
    icon: Shield
  },
  financial: {
    title: 'Controle Financeiro & PIX',
    description: 'Faturamento consolidado, transações PIX e fluxo de receita',
    icon: DollarSign
  },
  'security-center': {
    title: 'Central de Segurança & Firewall',
    description: 'Detecção de ameaças, bloqueio por IP e integridade de sessões',
    icon: Shield
  },
  'protected-channels': {
    title: 'Canais Protegidos',
    description: 'Restrição de acesso a canais e conteúdos confidenciais',
    icon: Shield
  },
  'cloak-links': {
    title: 'Gerenciamento de Links Camuflados',
    description: 'Criação e proteção de URLs de streaming contra clonagem',
    icon: Shield
  },
  'cloak-dashboard': {
    title: 'Dashboard de Camuflagem & Tráfego',
    description: 'Métricas de requisições, bloqueios de bots e requisições legítimas',
    icon: Zap
  },
  'suporte-prioritario': {
    title: 'Fila de Suporte Prioritário',
    description: 'Atendimento prioritário para planos VIP e chamados urgentes',
    icon: MessageCircle
  },
  whatsapp: {
    title: 'Integração WhatsApp API',
    description: 'Conexão e automação de mensagens para avisos e suporte',
    icon: MessageCircle
  },
  maintenance: {
    title: 'Modo de Manutenção',
    description: 'Ative pausas temporárias com aviso visual para todos os clientes',
    icon: AlertTriangle
  },
  'access-expired-config': {
    title: 'Mensagem de Acesso Expirado',
    description: 'Personalize o texto, botão de renovação e contato quando expirar',
    icon: Shield
  },
  'seasonal-theme': {
    title: 'Tema Sazonal & Personalização',
    description: 'Ative efeitos especiais para datas comemorativas e eventos',
    icon: Palette
  },
  'import-config': {
    title: 'Configurações de Importação M3U',
    description: 'Ajuste tempos de sincronização, timeouts e cabeçalhos',
    icon: Settings
  },
  'series-correction': {
    title: 'Correção Inteligente de Séries',
    description: 'Ajuste correspondências de metadados, capas e temporadas TMDB',
    icon: RefreshCw
  },
  'series-update-config': {
    title: 'Origem de Atualização de Séries',
    description: 'Servidores e provedores de atualização automática de episódios',
    icon: RefreshCw
  },
  'miniseries-config': {
    title: 'Configuração de Minisséries',
    description: 'Origem e mapeamento de categorias de minisséries',
    icon: Settings
  },
  'jogos-dia-config': {
    title: 'Configuração dos Jogos do Dia',
    description: 'Fontes de partidas de futebol e esportes ao vivo',
    icon: Settings
  },
  chat: {
    title: 'Suporte ao Vivo & Mensagens',
    description: 'Converse em tempo real com usuários que abriram chamado',
    icon: MessageCircle
  }
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({ activeView, users, logs }) => {
  const currentView = viewTitles[activeView] || viewTitles.overview;
  const Icon = currentView.icon;

  const stats = useMemo(() => {
    const activeUsers = users.filter(u => u?.isActive).length;
    const devicesCount = users.filter(u => u?.deviceInfo?.imei).length;
    return {
      totalUsers: users.length,
      activeUsers,
      devicesCount,
      totalLogs: logs.length
    };
  }, [users, logs]);

  return (
    <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
      {/* Title Section */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-gradient-to-br from-purple-500/15 via-purple-500/10 to-fuchsia-500/15 rounded-xl border border-purple-500/30 shadow-md">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-purple-300 via-purple-100 to-fuchsia-300 bg-clip-text text-transparent break-words">
            {currentView.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{currentView.description}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Usuários */}
        <Card className="bg-card/40 border-purple-500/15 backdrop-blur-md hover:border-purple-500/30 shadow-sm transition-all duration-200 rounded-xl overflow-hidden">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">Total Usuários</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.totalUsers}</p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 bg-purple-500/15 rounded-lg border border-purple-500/25">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[10px] px-1.5 py-0">
                {stats.activeUsers} ativos
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Dispositivos */}
        <Card className="bg-card/40 border-purple-500/15 backdrop-blur-md hover:border-purple-500/30 shadow-sm transition-all duration-200 rounded-xl overflow-hidden">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">Dispositivos</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.devicesCount}</p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 bg-fuchsia-500/15 rounded-lg border border-fuchsia-500/25">
                <Shield className="w-4 h-4 text-fuchsia-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] border-fuchsia-500/30 text-fuchsia-300 bg-fuchsia-500/10 px-1.5 py-0">
                IMEI Vinculados
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Atividades */}
        <Card className="bg-card/40 border-purple-500/15 backdrop-blur-md hover:border-purple-500/30 shadow-sm transition-all duration-200 rounded-xl overflow-hidden">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">Atividades</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.totalLogs}</p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 bg-violet-500/15 rounded-lg border border-violet-500/25">
                <Activity className="w-4 h-4 text-violet-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Badge className="bg-violet-500/15 text-violet-300 border border-violet-500/25 text-[10px] px-1.5 py-0">
                Eventos
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Status do Sistema */}
        <Card className="bg-card/40 border-purple-500/15 backdrop-blur-md hover:border-purple-500/30 shadow-sm transition-all duration-200 rounded-xl overflow-hidden">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">Sistema</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">Online</p>
              </div>
              <div className="flex items-center justify-center w-9 h-9 bg-emerald-500/15 rounded-lg border border-emerald-500/25">
                <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] text-emerald-400 font-medium font-mono">Alta Performance</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};