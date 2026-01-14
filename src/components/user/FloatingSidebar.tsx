import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Bell,
  AlertCircle,
  Info,
  Smartphone,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useTypeMode } from '@/contexts/TypeModeContext';

type BadgeType = 'new' | 'alert' | 'info' | 'count';

interface MenuBadge {
  type: BadgeType;
  value?: number;
  text?: string;
}

interface MenuItem {
  id: string;
  label: string;
  href?: string;
  icon: any;
  category: string;
  description: string;
  feature: string;
  badge?: MenuBadge;
  children?: MenuItem[];
}

const MenuItemBadge: React.FC<{ badge: MenuBadge }> = ({ badge }) => {
  switch (badge.type) {
    case 'new':
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
          NOVO
        </span>
      );
    case 'alert':
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-0.5">
          <AlertCircle className="w-2.5 h-2.5" />
          {badge.text || 'ALERTA'}
        </span>
      );
    case 'info':
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-accent/20 text-accent-foreground border border-accent/30 flex items-center gap-0.5">
          <Info className="w-2.5 h-2.5" />
          {badge.text || 'INFO'}
        </span>
      );
    case 'count':
      return (
        <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          {badge.value || 0}
        </span>
      );
    default:
      return null;
  }
};

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'main', description: 'Visão geral', feature: 'dashboard' },
  { id: 'conteudos', label: 'Conteúdos', href: '/conteudos', icon: LayoutGrid, category: 'content', description: 'Gerenciar', feature: 'conteudos' },
  { id: 'episodios', label: 'Episódios', href: '/episodios', icon: List, category: 'content', description: 'Gerenciar', feature: 'episodios' },
  { id: 'lista-m3u', label: 'Lista M3U', href: '/lista-m3u', icon: FileText, category: 'content', description: 'Playlists', feature: 'lista-m3u' },
  { id: 'banners', label: 'Banners', href: '/banners', icon: Eye, category: 'content', description: 'Gerenciar', feature: 'banners' },
  { id: 'categorias', label: 'Categorias', href: '/categorias', icon: Edit, category: 'content', description: 'Organizar', feature: 'categorias' },
  { id: 'categorias-tv', label: 'Categorias TV', href: '/categorias-tv', icon: Tv, category: 'content', description: 'Canais TV', feature: 'categorias-tv', badge: { type: 'new' } },
  { id: 'categorias-anime', label: 'Categorias Anime', href: '/categorias-anime', icon: Film, category: 'content', description: 'Animes', feature: 'categorias-anime', badge: { type: 'new' } },
  { id: 'duplicados', label: 'Duplicados', href: '/duplicados', icon: Copy, category: 'tools', description: 'Conteúdos', feature: 'duplicados' },
  { id: 'duplicados-episodios', label: 'Dup. Episódios', href: '/duplicados-episodios', icon: Copy, category: 'tools', description: 'Episódios', feature: 'duplicados-episodios' },
  { id: 'atualizacao-series', label: 'Atualizar Séries', href: '/atualizacao-series', icon: Tv, category: 'tools', description: 'Novos eps', feature: 'atualizacao-series', badge: { type: 'new' } },
  { id: 'automacao', label: 'Automação', href: '/configuracoes-auto-import', icon: Zap, category: 'tools', description: 'Auto import', feature: 'importacao-automatica', badge: { type: 'new' } },
  { id: 'importacao-automatica', label: 'Importação Auto', href: '/importacao-automatica', icon: Download, category: 'tools', description: 'Automática', feature: 'importacao-automatica', badge: { type: 'info', text: 'BETA' } },
  { id: 'substituicao-urls', label: 'Substituir URLs', href: '/substituicao-urls', icon: Link2, category: 'tools', description: 'URLs', feature: 'substituicao-urls' },
  { id: 'limpeza-dados', label: 'Limpeza', href: '/limpeza-dados', icon: DatabaseZap, category: 'tools', description: 'Remover dados', feature: 'clean-data', badge: { type: 'alert', text: '!' } },
  { id: 'usuarios', label: 'Usuários', href: '/usuarios', icon: Users, category: 'management', description: 'Gerenciar', feature: 'usuarios' },
  { id: 'sessoes', label: 'Sessões', href: '/sessoes', icon: Calendar, category: 'management', description: 'Ativas', feature: 'sessoes' },
  { id: 'plataformas', label: 'Plataformas', href: '/plataformas', icon: LayoutGrid, category: 'management', description: 'Streaming', feature: 'plataformas' },
  { id: 'produtos', label: 'Produtos', href: '/produtos', icon: Package, category: 'management', description: 'Disponíveis', feature: 'produtos' },
  { id: 'estatisticas', label: 'Estatísticas', href: '/estatisticas', icon: BarChart3, category: 'analytics', description: 'Gerais', feature: 'estatisticas' },
  { id: 'relatorios-visualizacao', label: 'Relatórios', href: '/relatorios-visualizacao', icon: TrendingUp, category: 'analytics', description: 'Visualização', feature: 'relatorios-visualizacao' },
  { id: 'metricas-engajamento', label: 'Métricas', href: '/metricas-engajamento', icon: Activity, category: 'analytics', description: 'Engajamento', feature: 'metricas-engajamento' },
  { id: 'recursos', label: 'Recursos', href: '/recursos', icon: Zap, category: 'settings', description: 'Disponíveis', feature: 'recursos' },
  { id: 'precos-interno', label: 'Preços', href: '/precos-interno', icon: CreditCard, category: 'settings', description: 'Gerenciar', feature: 'precos-interno' },
  {
    id: 'configuracoes', label: 'Configurações', icon: Settings, category: 'settings', description: 'Sistema', feature: 'configuracoes',
    children: [
      { id: 'configuracoes-geral', label: 'Geral', href: '/configuracoes', icon: Settings, category: 'settings', description: 'Gerais', feature: 'configuracoes' },
      { id: 'configuracoes-apis', label: 'APIs', href: '/configuracoes-apis', icon: Key, category: 'settings', description: 'Integrações', feature: 'configuracoes', badge: { type: 'info', text: 'API' } },
      { id: 'configuracoes-seguranca', label: 'Segurança', href: '/configuracoes-seguranca', icon: Shield, category: 'settings', description: 'Configurações', feature: 'configuracoes' },
      { id: 'gestao-dispositivos', label: 'Dispositivos', href: '/gestao-dispositivos', icon: Smartphone, category: 'settings', description: 'Conectados', feature: 'gestao-dispositivos', badge: { type: 'new' } }
    ]
  },
  { id: 'importar-m3u', label: 'Importar M3U', href: '/importar-m3u', icon: Download, category: 'tools', description: 'Listas M3U', feature: 'importar-m3u', badge: { type: 'info', text: 'BETA' } },
  { id: 'importar-canais-tv', label: 'Importar TV', href: '/importar-canais-tv', icon: Tv, category: 'tools', description: 'Canais TV', feature: 'importar-canais-tv', badge: { type: 'info', text: 'BETA' } },
  { id: 'ferramentas-ia', label: 'Ferramentas IA', href: '/ferramentas-ia', icon: Zap, category: 'tools', description: 'IA', feature: 'ferramentas-ia' },
  { id: 'perfil', label: 'Perfil', href: '/perfil', icon: Users, category: 'settings', description: 'Meu perfil', feature: 'perfil' },
  { id: 'historico-acoes', label: 'Histórico', href: '/historico-acoes', icon: History, category: 'settings', description: 'Ações', feature: 'historico-acoes' },
  { id: 'suporte-ao-vivo', label: 'Suporte', href: '/suporte-ao-vivo', icon: MessageCircle, category: 'settings', description: 'Chat', feature: 'suporte-ao-vivo' },
  { id: 'ofertas', label: 'Ofertas', href: '/ofertas', icon: Tag, category: 'main', description: 'Especiais', feature: 'ofertas' },
  { id: 'sistema-indicacao', label: 'Indicação', href: '/sistema-indicacao', icon: TrendingUp, category: 'main', description: 'Ganhe', feature: 'sistema-indicacao', badge: { type: 'new' } },
];

const categoryLabels: Record<string, string> = {
  main: 'Principal',
  content: 'Conteúdo',
  tools: 'Ferramentas',
  management: 'Gerenciamento',
  analytics: 'Análises',
  settings: 'Configurações'
};

const categoryIcons: Record<string, any> = {
  main: LayoutDashboard,
  content: LayoutGrid,
  tools: Zap,
  management: Users,
  analytics: BarChart3,
  settings: Settings
};

interface FloatingSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export const FloatingSidebar: React.FC<FloatingSidebarProps> = ({
  isVisible,
  onClose,
  isMobile = false
}) => {
  const location = useLocation();
  const { logout } = useSimpleAuth();
  const { hasPrioritySupport, hasFeature } = useUserPermissions();
  const { mode } = useTypeMode();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const pluralOnlyItems = ['categorias-anime', 'categorias-tv'];

  const filteredMenuItems = menuItems.filter(item => {
    if (mode === 'singular' && pluralOnlyItems.includes(item.id)) {
      return false;
    }
    return true;
  });

  const groupedMenuItems = filteredMenuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  const handleLinkClick = () => {
    if (isMobile) {
      onClose();
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
      {/* Overlay */}
      {isVisible && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Floating Sidebar */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-500 ease-out",
          isMobile
            ? "inset-x-4 top-20 bottom-4"
            : "left-6 top-1/2 -translate-y-1/2 w-80 max-h-[85vh]",
          isVisible
            ? "opacity-100 translate-x-0 scale-100"
            : "opacity-0 -translate-x-8 scale-95 pointer-events-none"
        )}
      >
        <div className="glass-card h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 text-primary-foreground fill-current" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">StreamFlix</h1>
                <p className="text-xs text-muted-foreground">Management Panel</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-4">
              {Object.entries(groupedMenuItems).map(([category, items]) => {
                const CategoryIcon = categoryIcons[category];

                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <CategoryIcon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {categoryLabels[category]}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = isMenuActive(item);
                        const hasAccess = item.id === 'sistema-indicacao' ? true : hasFeature(item.feature);
                        const hasChildren = item.children && item.children.length > 0;
                        const isOpen = openMenus[item.id];

                        if (!hasAccess) {
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground/50 cursor-not-allowed"
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm flex-1">{item.label}</span>
                              <Lock className="w-3 h-3 text-muted-foreground/30" />
                            </div>
                          );
                        }

                        if (hasChildren) {
                          return (
                            <div key={item.id}>
                              <button
                                onClick={() => toggleMenu(item.id)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                                  isActive
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-foreground/80 hover:bg-primary/5 hover:text-primary"
                                )}
                              >
                                <Icon className="w-4 h-4" />
                                <span className="flex-1 text-left">{item.label}</span>
                                <ChevronDown className={cn(
                                  "w-4 h-4 transition-transform duration-200",
                                  isOpen && "rotate-180"
                                )} />
                              </button>

                              {isOpen && (
                                <div className="ml-4 mt-1 pl-3 border-l border-border/30 space-y-0.5 animate-fade-in">
                                  {item.children!.map((child) => {
                                    const ChildIcon = child.icon;
                                    const isChildActive = location.pathname === child.href;

                                    return (
                                      <Link
                                        key={child.id}
                                        to={child.href!}
                                        onClick={handleLinkClick}
                                        className={cn(
                                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                          isChildActive
                                            ? "bg-primary/15 text-primary font-medium"
                                            : "text-foreground/70 hover:bg-primary/5 hover:text-primary"
                                        )}
                                      >
                                        <ChildIcon className="w-3.5 h-3.5" />
                                        <span className="flex-1">{child.label}</span>
                                        {child.badge && <MenuItemBadge badge={child.badge} />}
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={item.id}
                            to={item.href!}
                            onClick={handleLinkClick}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative group",
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground/80 hover:bg-primary/5 hover:text-primary"
                            )}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-r-full" />
                            )}
                            <Icon className={cn(
                              "w-4 h-4 transition-transform duration-200",
                              isActive && "scale-110"
                            )} />
                            <span className="flex-1">{item.label}</span>
                            {item.badge && <MenuItemBadge badge={item.badge} />}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-border/30 space-y-3">
            {hasPrioritySupport() && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Suporte PRO</span>
              </div>
            )}

            <Button
              onClick={logout}
              variant="outline"
              className="w-full justify-start gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </Button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-foreground/80">Sistema Online</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingSidebar;
