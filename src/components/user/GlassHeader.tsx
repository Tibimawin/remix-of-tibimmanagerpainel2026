import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Settings,
  User,
  Menu,
  Moon,
  Sun,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/ThemeContext';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import UserNotifications from '@/components/UserNotifications';
import GlobalSearch from '@/components/GlobalSearch';

const routeTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Visão geral do sistema' },
  '/conteudos': { title: 'Conteúdos', subtitle: 'Gerenciamento de filmes e séries' },
  '/episodios': { title: 'Episódios', subtitle: 'Gerenciamento de episódios' },
  '/banners': { title: 'Banners', subtitle: 'Gerenciamento de banners' },
  '/categorias': { title: 'Categorias', subtitle: 'Organização de conteúdo' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Configurações do sistema' },
  '/perfil': { title: 'Meu Perfil', subtitle: 'Informações da conta' },
  '/usuarios': { title: 'Usuários', subtitle: 'Gerenciamento de usuários' },
  '/estatisticas': { title: 'Estatísticas', subtitle: 'Análise de dados' },
};

interface GlassHeaderProps {
  onToggleSidebar: () => void;
  sidebarVisible: boolean;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({
  onToggleSidebar,
  sidebarVisible
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { userInfo } = useSimpleAuth();
  const { hasPrioritySupport } = useUserPermissions();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const currentRoute = routeTitles[location.pathname] || { title: 'StreamFlix', subtitle: '' };

  useEffect(() => {
    const loadUnreadCount = () => {
      try {
        const saved = localStorage.getItem('notifications_data');
        if (saved) {
          const data = JSON.parse(saved);
          const unread = data.filter((n: any) => !n.read).length;
          setUnreadCount(unread);
        }
      } catch (e) {
        console.error('Error loading notifications:', e);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="glass-header fixed top-0 left-0 right-0 z-30 h-16">
        <div className="h-full px-4 md:px-6 flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleSidebar}
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-200"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {sidebarVisible ? 'Fechar menu' : 'Abrir menu'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="hidden sm:flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Play className="w-4 h-4 text-primary-foreground fill-current" />
              </div>
              <div>
                <h1 className="text-base font-semibold gradient-text leading-tight">
                  {currentRoute.title}
                </h1>
                {currentRoute.subtitle && (
                  <p className="text-xs text-muted-foreground">{currentRoute.subtitle}</p>
                )}
              </div>
            </div>

            {hasPrioritySupport() && (
              <Badge className="hidden md:flex bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
                <span className="text-xs">PRO</span>
              </Badge>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => setShowSearch(true)}
                    className="h-10 gap-2 px-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden md:inline text-sm text-muted-foreground">Buscar...</span>
                    <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 text-[10px] text-muted-foreground">
                      ⌘K
                    </kbd>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Buscar (⌘K)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Theme Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleTheme(!isDark)}
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    {isDark ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isDark ? 'Modo claro' : 'Modo escuro'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Notifications */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNotifications(true)}
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all relative"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-pulse-glow">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Notificações</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Settings */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/configuracoes')}
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Configurações</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Profile */}
            <TooltipProvider>
              <Tooltip>
            <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/perfil')}
                    className="h-10 gap-2 px-3 rounded-xl hover:bg-primary/10 transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {userInfo?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden md:inline text-sm font-medium">
                      {userInfo?.email?.split('@')[0] || 'Usuário'}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Meu Perfil</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Modals */}
      {showNotifications && (
        <UserNotifications
          isOpen={showNotifications}
          onClose={() => {
            setShowNotifications(false);
            setUnreadCount(0);
          }}
        />
      )}

      {showSearch && (
        <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
      )}
    </>
  );
};

export default GlassHeader;
