
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
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Activity,
  Trash2,
  Lock,
  DatabaseZap,
  Film,
  Key,
  ChevronDown,
  ChevronRight,
  Shield,
  Layout as LayoutIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Status', href: '/status', icon: Activity },
  { name: 'Loja', href: '/produtos', icon: ShoppingCart },
  { name: 'Gerador de Posts', href: '/gerador-post', icon: Sparkles },
  { name: 'Gerador de Banners', href: '/gerador-banner', icon: LayoutIcon },
  { name: 'Conteúdos', href: '/conteudos', icon: LayoutGrid },
  { name: 'Episódios', href: '/episodios', icon: List },
  { name: 'MaxPlus', href: '/maxplus', icon: Sparkles },
  
  { name: 'Banners', href: '/banners', icon: Eye },
  { name: 'Categorias', href: '/categorias', icon: Edit },
  { name: 'Duplicados', href: '/duplicados', icon: Copy },
  { name: 'Duplicados Episódios', href: '/duplicados-episodios', icon: Copy },
  { name: 'Importação Automática', href: '/importacao-automatica', icon: Download },
  { name: 'Minisséries', href: '/miniseries', icon: Download },
  { name: 'Substituição de URLs', href: '/substituicao-urls', icon: Link2 },
  { name: 'Usuários', href: '/usuarios', icon: Users },
  { name: 'Sessões', href: '/sessoes', icon: Calendar },
  { name: 'Plataformas', href: '/plataformas', icon: LayoutGrid },
  { name: 'Estatísticas', href: '/estatisticas', icon: BarChart3 },
  { name: 'Relatórios de Visualização', href: '/relatorios-visualizacao', icon: TrendingUp },
  
  { name: 'Recursos', href: '/recursos', icon: Zap },
  { name: 'Limpeza de Dados', href: '/limpeza-dados', icon: DatabaseZap },
  { name: 'Preços', href: '/precos-interno', icon: CreditCard },
  { name: 'Sistema de Indicação', href: '/sistema-indicacao', icon: TrendingUp },
  { name: 'Planos', href: '/planos', icon: CreditCard },
  { 
    name: 'Configurações', 
    icon: Settings,
    children: [
      { name: 'Geral', href: '/configuracoes', icon: Settings },
      { name: 'APIs e Integrações', href: '/configuracoes-apis', icon: Key },
      { name: 'Segurança', href: '/configuracoes-seguranca', icon: Shield },
    ]
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { logout } = useSimpleAuth();
  const { hasFeature } = useUserPermissions();
  const [openMenus, setOpenMenus] = useState<string[]>(['Configurações']); // Configurações aberto por padrão

  const handleLinkClick = () => {
    if (isMobile) {
      onToggle();
    }
  };

  const toggleSubmenu = (menuName: string) => {
    setOpenMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    );
  };

  const isMenuActive = (item: NavItem): boolean => {
    if (item.href && location.pathname === item.href) return true;
    if (item.children) {
      return item.children.some(child => child.href === location.pathname);
    }
    return false;
  };

  return (
    <>
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
      <div 
        className={cn(
          "fixed left-0 top-0 h-full modern-sidebar transition-all duration-300 z-40",
          isMobile
            ? `transition-transform ${isCollapsed ? "-translate-x-full" : "translate-x-0"} w-80`
            : isCollapsed 
              ? "w-20" 
              : "w-80"
        )}
        data-tour="sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Header com logo Netflix style */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center space-x-3 modern-slide-in">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-red-700 rounded-2xl flex items-center justify-center shadow-minimal">
                <Play className="text-white font-bold text-lg fill-white" />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="font-bold text-xl text-sidebar-foreground">StreamFlix</h1>
                  <p className="text-sm text-muted-foreground font-medium">Admin Panel</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
               {navigation.map((item, index) => {
                const Icon = item.icon;
                const isActive = isMenuActive(item);
                const hasSubmenu = item.children && item.children.length > 0;
                const isOpen = openMenus.includes(item.name);
                
                let requiredFeature = '';
                if (item.href === '/limpeza-dados') requiredFeature = 'clean-data';
                else if (item.href === '/maxplus' || item.href === '/maxplus-import') requiredFeature = 'maxplus';
                else if (item.href === '/gerador-post') requiredFeature = 'gerador-post';
                else if (item.href === '/gerador-banner') requiredFeature = 'gerador-banner';
                
                const showLock = !!requiredFeature && !hasFeature(requiredFeature);
                
                return (
                  <li 
                    key={item.name} 
                    className="modern-animate-in" 
                    style={{ animationDelay: `${index * 0.03}s` }}
                    {...(item.href === '/conteudos' ? { 'data-tour': 'add-content' } : {})}
                    {...(item.name === 'Configurações' ? { 'data-tour': 'settings' } : {})}
                  >
                    {hasSubmenu ? (
                      <>
                        <button
                          onClick={() => toggleSubmenu(item.name)}
                          className={cn(
                            "modern-nav-item group justify-start w-full",
                            isActive && "active"
                          )}
                          title={isCollapsed ? item.name : undefined}
                        >
                          <Icon className={cn(
                            "h-5 w-5 flex-shrink-0 transition-all duration-200",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                          )} />
                          {!isCollapsed && (
                            <>
                              <span className="ml-3 transition-opacity duration-300 font-medium flex-1 text-left">
                                {item.name}
                              </span>
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                              )}
                            </>
                          )}
                        </button>
                        
                        {/* Submenu */}
                        {!isCollapsed && isOpen && (
                          <ul className="mt-1 ml-4 space-y-1 border-l-2 border-muted pl-4 animate-in slide-in-from-top-2 duration-200">
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon;
                              const isChildActive = location.pathname === child.href;
                              
                              return (
                                <li key={child.name}>
                                  <Link
                                    to={child.href!}
                                    onClick={handleLinkClick}
                                    className={cn(
                                      "flex items-center py-2 px-3 rounded-lg transition-all duration-200 group text-sm",
                                      isChildActive 
                                        ? "bg-primary/10 text-primary font-medium" 
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                  >
                                    <ChildIcon className={cn(
                                      "h-4 w-4 flex-shrink-0 transition-all duration-200",
                                      isChildActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )} />
                                    <span className="ml-2">{child.name}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        to={item.href!}
                        onClick={handleLinkClick}
                        className={cn(
                          "modern-nav-item group justify-start",
                          isActive && "active"
                        )}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <Icon className={cn(
                          "h-5 w-5 flex-shrink-0 transition-all duration-200",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                        )} />
                        {!isCollapsed && (
                          <span className="ml-3 transition-opacity duration-300 font-medium flex items-center gap-2 flex-1">
                            <span className="flex-1">{item.name}</span>
                            {item.href === '/planos' && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 animate-pulse leading-none">
                                NOVO
                              </span>
                            )}
                            {showLock && (
                              <Lock className="h-4 w-4 text-muted-foreground" aria-label="Acesso restrito" />
                            )}
                          </span>
                        )}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border space-y-3">
            {/* Botão Sair */}
            <button
              onClick={logout}
              className={cn(
                "modern-nav-item w-full text-red-500 hover:text-red-600 hover:bg-red-50/10 border border-transparent hover:border-red-200/20 justify-start",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? "Sair" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="ml-3 font-medium">Sair</span>
              )}
            </button>

            {/* Status do Sistema */}
            {!isCollapsed && (
              <div className="modern-card p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-800/30">
                <div>
                  <p className="text-sm font-semibold text-sidebar-foreground flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 modern-pulse"></div>
                    Sistema Online
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Todas as funções ativas</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
