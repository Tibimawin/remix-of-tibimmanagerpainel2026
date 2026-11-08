import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppName } from '@/contexts/AppNameContext';
import {
  Users, Activity, Shield, Zap, AlertTriangle, Megaphone, DollarSign,
  Key, Bell, Sparkles, Palette, Tag, RefreshCw, Settings, MessageCircle, UserPlus, ChevronRight
} from 'lucide-react';

interface AdminHeaderProps {
  activeView: string;
  users: any[];
  logs: any[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onNavigate?: (view: any) => void;
}

const viewTitles: Record<string, { title: string; description: string; icon: any }> = {
  overview: {
    title: 'Visão Geral do Sistema',
    description: 'Acompanhe as principais métricas, telemetria e atividades operacionais em tempo real',
    icon: Shield
  },
  users: {
    title: 'Usuários & Dispositivos',
    description: 'Gerencie clientes cadastrados, controle de telas e identifique aparelhos vinculados',
    icon: Users
  },
  activity: {
    title: 'Logs de Atividade em Tempo Real',
    description: 'Monitore todas as ações realizadas no sistema instantaneamente via Firebase',
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
  'todos-apps': {
    title: 'Todos os Apps & Builds',
    description: 'Gerencie versões e links dos APKs e aplicativos distribuídos',
    icon: Sparkles
  },
  'firebase-users': {
    title: 'Gestão Avançada Firebase',
    description: 'Operações em massa, correções de plano e sincronização direta',
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
  'admin-revendas': {
    title: 'Painel de Revendas & Atacado',
    description: 'Controle de parceiros, revendedores e créditos de distribuição',
    icon: Users
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

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeView,
  users,
  logs,
  isRefreshing,
  onRefresh,
  onNavigate
}) => {
  const { appDisplayName } = useAppName();
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

  const isOverview = activeView === 'overview';

  return (
    <div className="mb-4 sm:mb-6 space-y-3">
      {/* Breadcrumb Trail & Action Cluster */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/40">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <span className="text-foreground/80 font-medium truncate max-w-[150px]">{appDisplayName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          <span className="text-muted-foreground">Admin</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          <span className="text-purple-300 font-semibold truncate max-w-[200px]">{currentView.title}</span>
        </nav>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Live indicator chip */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Realtime Ativo
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-7 text-xs px-2.5 border-border/40 bg-card/40 hover:bg-purple-500/10 hover:text-purple-300 transition-colors"
              title="Atualizar dados do sistema"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-purple-400' : 'text-muted-foreground'}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          )}

          {/* Quick User Create Action */}
          {onNavigate && activeView !== 'user-management' && (
            <Button
              type="button"
              size="sm"
              onClick={() => onNavigate('user-management')}
              className="h-7 text-xs px-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-medium shadow-sm shadow-purple-500/20 cursor-pointer active:scale-95 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              <span>Novo Usuário</span>
            </Button>
          )}
        </div>
      </div>

      {/* Title & Description Section */}
      <div className="flex items-start gap-3 sm:gap-4 pt-1">
        <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 shrink-0 bg-gradient-to-br from-purple-500/15 via-purple-500/10 to-fuchsia-500/15 rounded-xl border border-purple-500/30 shadow-md">
          <Icon className="w-5 h-5 sm:w-5 sm:h-5 text-purple-300" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground bg-gradient-to-r from-purple-200 via-white to-fuchsia-200 bg-clip-text text-transparent break-words">
            {currentView.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{currentView.description}</p>
        </div>
      </div>

      {/* For Non-Overview pages: High-Density Telemetry Strip (eliminates 160px vertical bloat) */}
      {!isOverview && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2 px-3 rounded-xl bg-card/30 border border-purple-500/15 text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Total Usuários: <strong className="text-foreground tabular-nums">{stats.totalUsers}</strong>
          </span>
          <span className="text-muted-foreground/30 hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Ativos: <strong className="text-emerald-400 tabular-nums">{stats.activeUsers}</strong>
          </span>
          <span className="text-muted-foreground/30 hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span>
            Dispositivos IMEI: <strong className="text-fuchsia-400 tabular-nums">{stats.devicesCount}</strong>
          </span>
          <span className="text-muted-foreground/30 hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
            Eventos Registrados: <strong className="text-foreground tabular-nums">{stats.totalLogs}</strong>
          </span>
        </div>
      )}
    </div>
  );
};