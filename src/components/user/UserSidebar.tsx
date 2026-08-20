import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  LayoutGrid,
  List,
  Settings,
  Eye,
  Edit,
  Copy,
  Zap,
  BarChart3,
  Package,
  Download,
  Link2,
  LogOut,
  Play,
  CreditCard,
  FileText,
  TrendingUp,
  Activity,
  Trash2,
  MessageCircle,
  Crown,
  Lock,
  ArrowUp,
  Film,
  Tag,
  Tv,
  History,
  DatabaseZap,
  Key,
  Shield,
  ChevronDown,
  Bell,
  AlertCircle,
  Info,
  Smartphone,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useWithdrawalNotifications } from '@/hooks/useWithdrawalNotifications';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { useCustomization } from '@/contexts/CustomizationContext';

type BadgeType = 'new' | 'alert' | 'info' | 'count';

interface MenuBadge {
  type: BadgeType;
  value?: number; // Para badges de contador
  text?: string; // Para badges customizados
}

interface MenuItem {
  id: string;
  label: string;
  href?: string;
  icon: any;
  category: string;
  description: string;
  feature?: string;
  badge?: MenuBadge;
  children?: MenuItem[];
}

// Componente para renderizar badges
const MenuBadge: React.FC<{ badge: MenuBadge }> = ({ badge }) => {
  switch (badge.type) {
    case 'new':
      return (
        <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs px-1.5 py-0.5 animate-pulse shadow-sm">
          NOVO
        </Badge>
      );
    case 'alert':
      return (
        <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-1.5 py-0.5 flex items-center gap-1 animate-pulse shadow-sm">
          <AlertCircle className="w-3 h-3" />
          {badge.text || 'ALERTA'}
        </Badge>
      );
    case 'info':
      return (
        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-1.5 py-0.5 flex items-center gap-1 shadow-sm">
          <Info className="w-3 h-3" />
          {badge.text || 'INFO'}
        </Badge>
      );
    case 'count':
      return (
        <Badge className="bg-gradient-to-r from-primary to-orange-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] flex items-center justify-center shadow-sm animate-pulse">
          {badge.value || 0}
        </Badge>
      );
    default:
      return null;
  }
};

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    category: 'main',
    description: 'Visão geral do sistema',
    feature: 'dashboard',
    badge: { type: 'count', value: 3 } // Exemplo: 3 notificações
  },
  {
    id: 'loja',
    label: 'Loja',
    href: '/produtos',
    icon: ShoppingCart,
    category: 'main',
    description: 'Loja oficial do sistema',
    feature: 'produtos'
  },
  {
    id: 'conteudos',
    label: 'Conteúdos',
    href: '/conteudos',
    icon: LayoutGrid,
    category: 'content',
    description: 'Gerenciar conteúdos',
    feature: 'conteudos'
  },
  {
    id: 'episodios',
    label: 'Episódios',
    href: '/episodios',
    icon: List,
    category: 'content',
    description: 'Gerenciar episódios',
    feature: 'episodios'
  },
  {
    id: 'banners',
    label: 'Banners',
    href: '/banners',
    icon: Eye,
    category: 'content',
    description: 'Gerenciar banners',
    feature: 'banners'
  },
  {
    id: 'categorias',
    label: 'Categorias',
    href: '/categorias',
    icon: Edit,
    category: 'content',
    description: 'Organizar categorias',
    feature: 'categorias'
  },
  {
    id: 'categorias-tv',
    label: 'Categorias TV',
    href: '/categorias-tv',
    icon: Tv,
    category: 'content',
    description: 'Categorias de canais de TV',
    feature: 'categorias-tv',
    badge: { type: 'new' }
  },
  {
    id: 'categorias-anime',
    label: 'Categorias Anime',
    href: '/categorias-anime',
    icon: Film,
    category: 'content',
    description: 'Categorias de animes',
    feature: 'categorias-anime',
    badge: { type: 'new' }
  },
  {
    id: 'duplicados',
    label: 'Duplicados',
    href: '/duplicados',
    icon: Copy,
    category: 'tools',
    description: 'Conteúdos duplicados',
    feature: 'duplicados'
  },
  {
    id: 'duplicados-episodios',
    label: 'Duplicados Episódios',
    href: '/duplicados-episodios',
    icon: Copy,
    category: 'tools',
    description: 'Episódios duplicados',
    feature: 'duplicados-episodios'
  },
  {
    id: 'duplicados-episodios-otimizado',
    label: 'Duplicados Ep. (Otimizado)',
    href: '/duplicados-episodios-otimizado',
    icon: DatabaseZap,
    category: 'tools',
    description: 'Busca otimizada de episódios duplicados',
    feature: 'duplicados-episodios-otimizado',
    badge: { type: 'new' }
  },
  {
    id: 'ferramentas-ia',
    label: 'Ferramentas IA',
    href: '/ferramentas-ia',
    icon: Zap,
    category: 'tools',
    description: 'Ferramentas com inteligência artificial',
    feature: 'ferramentas-ia',
    badge: { type: 'new' }
  },
  {
    id: 'atualizacao-series',
    label: 'Atualização Séries',
    href: '/atualizacao-series',
    icon: Tv,
    category: 'tools',
    description: 'Novos episódios de séries',
    feature: 'atualizacao-series',
    badge: { type: 'new' }
  },
  {
    id: 'automacao',
    label: 'Automação',
    href: '/configuracoes-auto-import',
    icon: Zap,
    category: 'tools',
    description: 'Importação automática de conteúdos',
    feature: 'importacao-automatica',
    badge: { type: 'new' }
  },
  {
    id: 'importacao-automatica',
    label: 'Importação Auto',
    href: '/importacao-automatica',
    icon: Download,
    category: 'tools',
    description: 'Importação automática',
    feature: 'importacao-automatica',
    badge: { type: 'info', text: 'BETA' }
  },
  {
    id: 'miniseries',
    label: 'Minisséries',
    href: '/miniseries',
    icon: Download,
    category: 'tools',
    description: 'Importar conteúdos de minisséries',
    feature: 'miniseries',
    badge: { type: 'new' }
  },
  {
    id: 'jogos-dia',
    label: 'Jogos do Dia',
    href: '/jogos-dia',
    icon: Calendar,
    category: 'tools',
    description: 'Importar jogos do dia da origem',
    feature: 'jogos-dia',
    badge: { type: 'new' }
  },

  {
    id: 'substituicao-urls',
    label: 'Substituição URLs',
    href: '/substituicao-urls',
    icon: Link2,
    category: 'tools',
    description: 'Substituir URLs',
    feature: 'substituicao-urls'
  },
  {
    id: 'limpeza-dados',
    label: 'Limpeza de Dados',
    href: '/limpeza-dados',
    icon: DatabaseZap,
    category: 'tools',
    description: 'Remover registros em massa',
    feature: 'clean-data',
    badge: { type: 'alert', text: 'CUIDADO' }
  },
  {
    id: 'usuarios',
    label: 'Usuários',
    href: '/usuarios',
    icon: Users,
    category: 'management',
    description: 'Gerenciar usuários',
    feature: 'usuarios'
  },
  {
    id: 'sessoes',
    label: 'Sessões',
    href: '/sessoes',
    icon: Calendar,
    category: 'management',
    description: 'Sessões ativas',
    feature: 'sessoes'
  },
  {
    id: 'plataformas',
    label: 'Plataformas',
    href: '/plataformas',
    icon: LayoutGrid,
    category: 'management',
    description: 'Plataformas de streaming',
    feature: 'plataformas'
  },
  {
    id: 'produtos',
    label: 'Produtos',
    href: '/produtos',
    icon: Package,
    category: 'management',
    description: 'Produtos disponíveis',
    feature: 'produtos'
  },
  {
    id: 'estatisticas',
    label: 'Estatísticas',
    href: '/estatisticas',
    icon: BarChart3,
    category: 'analytics',
    description: 'Estatísticas gerais',
    feature: 'estatisticas'
  },
  {
    id: 'relatorios-visualizacao',
    label: 'Relatórios',
    href: '/relatorios-visualizacao',
    icon: TrendingUp,
    category: 'analytics',
    description: 'Relatórios de visualização',
    feature: 'relatorios-visualizacao'
  },
  {
    id: 'recursos',
    label: 'Recursos',
    href: '/recursos',
    icon: Zap,
    category: 'settings',
    description: 'Recursos disponíveis',
    feature: 'recursos'
  },
  {
    id: 'precos-interno',
    label: 'Preços',
    href: '/precos-interno',
    icon: CreditCard,
    category: 'settings',
    description: 'Gerenciar preços',
    feature: 'precos-interno'
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    category: 'settings',
    description: 'Configurações do sistema',
    feature: 'configuracoes',
    children: [
      {
        id: 'configuracoes-geral',
        label: 'Geral',
        href: '/configuracoes',
        icon: Settings,
        category: 'settings',
        description: 'Configurações gerais',
        feature: 'configuracoes'
      },
      {
        id: 'configuracoes-apis',
        label: 'APIs e Integrações',
        href: '/configuracoes-apis',
        icon: Key,
        category: 'settings',
        description: 'Gerenciar APIs e integrações',
        feature: 'configuracoes',
        badge: { type: 'info', text: 'API' }
      },
      {
        id: 'configuracoes-seguranca',
        label: 'Segurança',
        href: '/configuracoes-seguranca',
        icon: Shield,
        category: 'settings',
        description: 'Configurações de segurança',
        feature: 'configuracoes'
      },
      {
        id: 'gestao-dispositivos',
        label: 'Gestão de Dispositivos',
        href: '/gestao-dispositivos',
        icon: Smartphone,
        category: 'settings',
        description: 'Gerenciar dispositivos conectados',
        feature: 'gestao-dispositivos',
        badge: { type: 'new' }
      }
    ]
  },
  {
    id: 'importar-m3u',
    label: 'Importar M3U',
    href: '/importar-m3u',
    icon: Download,
    category: 'tools',
    description: 'Importar listas M3U',
    feature: 'importar-m3u',
    badge: { type: 'info', text: 'BETA' }
  },
  {
    id: 'importar-canais-tv',
    label: 'Importar Canais TV',
    href: '/importar-canais-tv',
    icon: Tv,
    category: 'tools',
    description: 'Importar canais de TV da origem',
    feature: 'importar-canais-tv',
    badge: { type: 'info', text: 'BETA' }
  },

  {
    id: 'perfil',
    label: 'Perfil',
    href: '/perfil',
    icon: Users,
    category: 'settings',
    description: 'Meu perfil',
    feature: 'perfil'
  },
  {
    id: 'historico-acoes',
    label: 'Histórico de Ações',
    href: '/historico-acoes',
    icon: History,
    category: 'settings',
    description: 'Suas ações recentes',
    feature: 'historico-acoes',
    badge: { type: 'count', value: 12 }
  },
  {
    id: 'suporte-ao-vivo',
    label: 'Suporte ao Vivo',
    href: '/suporte-ao-vivo',
    icon: MessageCircle,
    category: 'settings',
    description: 'Chat de suporte',
    feature: 'suporte-ao-vivo'
  },
  {
    id: 'ofertas',
    label: 'Ofertas',
    href: '/ofertas',
    icon: Tag,
    category: 'main',
    description: 'Ofertas especiais disponíveis',
    feature: 'ofertas',
    badge: { type: 'count', value: 2 }
  },
  {
    id: 'sistema-indicacao',
    label: 'Sistema de Indicação',
    href: '/sistema-indicacao',
    icon: TrendingUp,
    category: 'main',
    description: 'Ganhe indicando pessoas',
    badge: { type: 'new' }
  },
  {
    id: 'planos',
    label: 'Planos',
    href: '/planos',
    icon: CreditCard,
    category: 'management',
    description: 'Visualizar tabela de planos',
    feature: 'planos',
    badge: { type: 'new' as const }
  },
  {
    id: 'minha-api',
    label: 'Integração API',
    href: '/minha-api',
    icon: Key,
    category: 'settings',
    description: 'Gerar API Keys para integrar conteúdos',
    feature: 'minha-api',
    badge: { type: 'new' as const }
  },
  {
    id: 'carrosseu',
    label: 'Carrossel',
    href: '/carrosseu',
    icon: Film,
    category: 'content',
    description: 'Gerenciar carrossel (Tibim)',
    feature: 'carrosseu'
  },
  {
    id: 'versao',
    label: 'Versão',
    href: '/versao',
    icon: Zap,
    category: 'tools',
    description: 'Gerenciar versões (Tibim)',
    feature: 'versao'
  },
  {
    id: 'pedido',
    label: 'Pedidos',
    href: '/pedido',
    icon: FileText,
    category: 'management',
    description: 'Gerenciar pedidos (Tibim)',
    feature: 'pedido'
  },
  {
    id: 'avaliacao',
    label: 'Avaliações',
    href: '/avaliacao',
    icon: Star,
    category: 'management',
    description: 'Gerenciar avaliações (Tibim)',
    feature: 'avaliacao'
  },
  {
    id: 'plano2',
    label: 'Planos 2',
    href: '/plano2',
    icon: CreditCard,
    category: 'management',
    description: 'Gerenciar plano 2 (Tibim)',
    feature: 'plano2'
  },
  {
    id: 'categoriaFilmes',
    label: 'Categorias Filmes',
    href: '/categoria-filmes',
    icon: Edit,
    category: 'content',
    description: 'Categorias de Filmes (Tibim)',
    feature: 'categoriaFilmes'
  },
  {
    id: 'categoriaSeries',
    label: 'Categorias Séries',
    href: '/categoria-series',
    icon: Edit,
    category: 'content',
    description: 'Categorias de Séries (Tibim)',
    feature: 'categoriaSeries'
  },
  {
    id: 'categoriaDorama',
    label: 'Categorias Dorama',
    href: '/categoria-dorama',
    icon: Edit,
    category: 'content',
    description: 'Categorias de Dorama (Tibim)',
    feature: 'categoriaDorama'
  },
  {
    id: 'categoriaAnimes',
    label: 'Categorias Animes',
    href: '/categoria-animes',
    icon: Edit,
    category: 'content',
    description: 'Categorias de Animes (Tibim)',
    feature: 'categoriaAnimes'
  },
  {
    id: 'categoriaNovelas',
    label: 'Categorias Novelas',
    href: '/categoria-novelas',
    icon: Edit,
    category: 'content',
    description: 'Categorias de Novelas (Tibim)',
    feature: 'categoriaNovelas'
  },
  {
    id: 'perfil-tibim',
    label: 'Perfis',
    href: '/perfis',
    icon: Users,
    category: 'management',
    description: 'Gerenciar perfis de visualização (Tibim)',
    feature: 'perfil'
  },
  {
    id: 'meus-aplicativos-tibim',
    label: 'Meus Aplicativos',
    href: '/meus-aplicativos',
    icon: Smartphone,
    category: 'management',
    description: 'Gerenciar aplicativos do cliente (Tibim)',
    feature: 'meus-aplicativos'
  },
];

const categoryLabels = {
  main: 'Principal',
  content: 'Conteúdo',
  tools: 'Ferramentas',
  management: 'Gerenciamento',
  analytics: 'Análises',
  settings: 'Configurações'
};

const categoryIcons = {
  main: LayoutDashboard,
  content: LayoutGrid,
  tools: Zap,
  management: Users,
  analytics: BarChart3,
  settings: Settings
};

interface UserSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

export const UserSidebar: React.FC<UserSidebarProps> = ({
  isCollapsed,
  onToggle,
  isMobile = false,
  onHoverChange
}) => {
  const location = useLocation();
  const { logout } = useSimpleAuth();
  const { hasPrioritySupport, hasFeature } = useUserPermissions();
  const { mode } = useTypeMode();
  const { currentTheme } = useCustomization();
  const withdrawalUnread = useWithdrawalNotifications();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    configuracoes: true // Configurações aberto por padrão
  });
  const [isHovered, setIsHovered] = useState(false);

  // Quando o sidebar está recolhido (desktop), expandir visualmente ao passar o mouse
  // sem alterar a margem do conteúdo principal — assim sobrepõe e libera espaço.
  const effectiveCollapsed = isMobile ? isCollapsed : (isCollapsed && !isHovered);

  // Itens que só aparecem no modo plural (Francisco)
  const pluralOnlyItems = ['categorias-anime', 'categorias-tv'];

  // Itens exclusivos do Modo Tibim
  const tibimOnlyItems = [
    'carrosseu', 'versao', 'pedido', 'avaliacao', 'plano2',
    'categoriaFilmes', 'categoriaSeries', 'categoriaDorama', 'categoriaAnimes', 'categoriaNovelas', 'perfil-tibim', 'meus-aplicativos-tibim'
  ];

  // Itens a serem ocultados no Modo Tibim (tabelas não citadas)
  const tibimExcludedItems = [
    'banners', 'categorias', 'categorias-anime',
    'plataformas', 'sessoes', 'produtos'
  ];

  // Filtrar itens baseado no modo
  const filteredMenuItems = menuItems.filter(item => {
    if (mode === 'tibim') {
      if (tibimExcludedItems.includes(item.id)) {
        return false;
      }
    } else {
      // Se não for modo tibim, ocultar as tabelas específicas dele
      if (tibimOnlyItems.includes(item.id)) {
        return false;
      }
    }

    if (mode === 'singular' && pluralOnlyItems.includes(item.id)) {
      return false;
    }
    return true;
  }).map(item => {
    // Dynamic badge for sistema-indicacao based on unread withdrawal notifications
    if (item.id === 'sistema-indicacao' && withdrawalUnread > 0) {
      return { ...item, badge: { type: 'count' as BadgeType, value: withdrawalUnread } };
    }
    return item;
  });

  const groupedMenuItems = filteredMenuItems
    .reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof menuItems>);

  const handleLinkClick = () => {
    if (isMobile) {
      onToggle();
    }
  };

  const toggleMenu = (menuId: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const isMenuActive = (item: MenuItem): boolean => {
    if (item.href && location.pathname === item.href) return true;
    if (item.children) {
      return item.children.some(child => child.href === location.pathname);
    }
    return false;
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        onMouseEnter={() => {
          if (!isMobile) {
            setIsHovered(true);
            onHoverChange?.(true);
          }
        }}
        onMouseLeave={() => {
          if (!isMobile) {
            setIsHovered(false);
            onHoverChange?.(false);
          }
        }}
        className={cn(
          "fixed left-0 top-0 h-full bg-gradient-to-b from-card via-card/95 to-card/90 backdrop-blur-xl border-r border-border/40 flex flex-col z-40 transition-all duration-300 shadow-xl overscroll-contain",
          isMobile
            ? `${isCollapsed ? "-translate-x-full" : "translate-x-0"} w-80`
            : effectiveCollapsed
              ? "w-20"
              : isCollapsed
                ? "w-80 shadow-2xl"
                : "w-80"
        )}
        data-tour="sidebar"
      >
        {/* Header */}
        <div className="p-6 border-b border-border/40 backdrop-blur-sm">
          <div className="flex items-center">
            <div className={cn(
              "flex items-center space-x-3 transition-all duration-300",
              effectiveCollapsed && !isMobile && "opacity-0 scale-90"
            )}>
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary via-red-600 to-orange-500 rounded-2xl shadow-lg overflow-hidden">
                {currentTheme.logo ? (
                  <img src={currentTheme.logo} alt="Logo" className="w-full h-full object-contain p-2 brightness-0 invert" />
                ) : (
                  <Play className="w-6 h-6 text-white fill-white" />
                )}
              </div>
              {(!effectiveCollapsed || isMobile) && (
                <div>
                  <h1 className="text-xl font-bold text-foreground bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                    StreamFlix
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">Management Panel</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar overscroll-contain">
          <div className="space-y-6">
            {Object.entries(groupedMenuItems).map(([category, items], categoryIndex) => {
              const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];

              return (
                <div key={category} className="space-y-2">
                  {(!effectiveCollapsed || isMobile) && (
                    <div className="flex items-center px-3 py-2 mb-3">
                      <CategoryIcon className="w-4 h-4 text-primary mr-2" />
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </h3>
                    </div>
                  )}

                  <ul className="space-y-1">
                    {items.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = isMenuActive(item);
                      const hasAccess = item.feature ? hasFeature(item.feature) : true;
                      const hasChildren = item.children && item.children.length > 0;
                      const isOpen = openMenus[item.id];

                      return (
                        <li
                          key={item.id}
                          className="animate-fade-in-up"
                          style={{ animationDelay: `${(categoryIndex * items.length + index) * 0.05}s` }}
                        >
                       {true ? (
                            <>
                              {hasChildren ? (
                                <div {...(item.id === 'configuracoes' ? { 'data-tour': 'settings' } : {})}>
                                  <button
                                    onClick={() => toggleMenu(item.id)}
                                    className={cn(
                                      "group relative flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm w-full",
                                      isActive
                                        ? "bg-gradient-to-r from-primary/20 via-primary/15 to-orange-500/20 text-primary border border-primary/30 shadow-lg"
                                        : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-accent/10 hover:to-primary/5 hover:border hover:border-accent/20 hover:shadow-soft"
                                    )}
                                    title={effectiveCollapsed && !isMobile ? item.label : undefined}
                                  >
                                    <Icon className={cn(
                                      "w-5 h-5 flex-shrink-0 transition-all duration-300",
                                      isActive ? "text-primary scale-110" : "group-hover:text-foreground group-hover:scale-105"
                                    )} />

                                    {(!effectiveCollapsed || isMobile) && (
                                      <>
                                        <div className="flex-1 min-w-0 text-left">
                                          <div className="flex items-center space-x-2">
                                            <span className="truncate block">{item.label}</span>
                                          </div>
                                          <span className="text-xs text-muted-foreground/80 truncate block mt-0.5">
                                            {item.description}
                                          </span>
                                        </div>

                                        <ChevronDown className={cn(
                                          "w-4 h-4 transition-transform duration-300",
                                          isOpen && "rotate-180"
                                        )} />
                                      </>
                                    )}
                                  </button>

                                  {(!effectiveCollapsed || isMobile) && isOpen && (
                                    <ul className="mt-1 ml-4 space-y-1 border-l-2 border-border/40 pl-3 animate-fade-in">
                                       {item.children.map((child) => {
                                        const ChildIcon = child.icon;
                                        const isChildActive = location.pathname === child.href;
                                        const childHasAccess = child.feature ? hasFeature(child.feature) : true;

                                        return (
                                          <li key={child.id}>
                                            <Link
                                                to={child.href!}
                                                onClick={handleLinkClick}
                                                className={cn(
                                                  "group relative flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300",
                                                  isChildActive
                                                    ? "bg-gradient-to-r from-primary/20 via-primary/15 to-orange-500/20 text-primary border border-primary/30 shadow-md"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:shadow-sm",
                                                  !childHasAccess && "opacity-70"
                                                )}
                                                title={!childHasAccess ? "Recurso bloqueado - clique para ver planos" : undefined}
                                              >
                                                <ChildIcon className={cn(
                                                  "w-4 h-4 flex-shrink-0 transition-all duration-300",
                                                  isChildActive ? "text-primary" : "group-hover:text-foreground"
                                                )} />
                                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                  <span className="truncate block">{child.label}</span>
                                                  {child.badge && <MenuBadge badge={child.badge} />}
                                                  {!childHasAccess && <Lock className="w-3 h-3 text-orange-500/70" />}
                                                </div>

                                                {isChildActive && (
                                                  <div className="absolute right-3 w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-sm" />
                                                )}
                                              </Link>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </div>
                              ) : (
                                <Link
                                  to={item.href!}
                                  onClick={handleLinkClick}
                                  className={cn(
                                    "group relative flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm",
                                    isActive
                                      ? "bg-gradient-to-r from-primary/20 via-primary/15 to-orange-500/20 text-primary border border-primary/30 shadow-lg"
                                      : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-accent/10 hover:to-primary/5 hover:border hover:border-accent/20 hover:shadow-soft",
                                    !hasAccess && "opacity-70"
                                  )}
                                  title={!hasAccess ? "Recurso bloqueado - clique para ver planos" : (effectiveCollapsed && !isMobile ? item.label : undefined)}
                                  {...(item.id === 'conteudos' ? { 'data-tour': 'add-content' } : {})}
                                  {...(item.id === 'configuracoes' ? { 'data-tour': 'settings' } : {})}
                                >
                                  <Icon className={cn(
                                    "w-5 h-5 flex-shrink-0 transition-all duration-300",
                                    isActive ? "text-primary scale-110" : "group-hover:text-foreground group-hover:scale-105"
                                  )} />

                                  {(!effectiveCollapsed || isMobile) && (
                                    <>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <span className="truncate block">{item.label}</span>
                                          {item.badge && <MenuBadge badge={item.badge} />}
                                          {!hasAccess && <Lock className="w-3 h-3 text-orange-500/70" />}
                                        </div>
                                        <span className="text-xs text-muted-foreground/80 truncate block mt-0.5">
                                          {item.description}
                                        </span>
                                      </div>

                                      {isActive && (
                                        <div className="absolute right-3 w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm" />
                                      )}
                                    </>
                                  )}
                                </Link>
                              )}
                            </>
                          ) : (
                            <div
                              className={cn(
                                "group relative flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm cursor-not-allowed",
                                "bg-gradient-to-r from-muted/20 to-muted/10 text-muted-foreground/60 border border-border/20"
                              )}
                              title={effectiveCollapsed && !isMobile ? `${item.label} - Bloqueado` : "Recurso bloqueado - Entre em contato para upgrade"}
                            >
                              <Icon className="w-5 h-5 flex-shrink-0 text-muted-foreground/40" />

                              {(!effectiveCollapsed || isMobile) && (
                                <>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="truncate block">{item.label}</span>
                                      <Lock className="w-3 h-3 text-orange-500/70" />
                                    </div>
                                    <span className="text-xs text-muted-foreground/60 truncate block mt-0.5">
                                      Recurso bloqueado
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-1">
                                    <ArrowUp className="w-3 h-3 text-orange-500/70" />
                                    <span className="text-xs text-orange-500/70 font-medium">UPGRADE</span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 space-y-3 backdrop-blur-sm">
          {/* Suporte Prioritário */}
          {hasPrioritySupport() && (!effectiveCollapsed || isMobile) && (
            <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-xl p-3 border border-amber-500/30 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Suporte Prioritário
                </span>
                <Badge className="bg-amber-500 text-white text-xs">PRO</Badge>
              </div>
            </div>
          )}

          {/* Botão Sair */}
          <Button
            onClick={logout}
            variant="outline"
            className={cn(
              "w-full border-red-200/60 text-red-600 hover:text-red-700 hover:bg-red-50/10 hover:border-red-300/40 transition-all duration-300",
              effectiveCollapsed && !isMobile ? "px-0" : "justify-start"
            )}
            title={effectiveCollapsed && !isMobile ? "Sair" : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {(!effectiveCollapsed || isMobile) && (
              <span className="ml-2 font-medium">Sair</span>
            )}
          </Button>
        </div>
      </div>
    </>
  );
};