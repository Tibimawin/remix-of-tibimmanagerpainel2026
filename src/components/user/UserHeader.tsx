import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { useTypeMode } from '@/contexts/TypeModeContext';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { 
  Menu, 
  User, 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  Crown,
  Sun,
  Moon,
  Zap,
  UserCircle,
  Users
} from 'lucide-react';
import UserNotifications from '../UserNotifications';
import GlobalSearch from '../GlobalSearch';

// Mapeamento de títulos dinâmicos para cada rota
const routeTitles: Record<string, { title: string; subtitle: string; icon?: React.ComponentType<any> }> = {
  '/dashboard': { 
    title: 'Dashboard', 
    subtitle: 'Visão geral do sistema',
    icon: Menu
  },
  '/conteudos': { 
    title: 'Conteúdos', 
    subtitle: 'Gerenciar conteúdos do sistema',
    icon: Menu
  },
  '/episodios': { 
    title: 'Episódios', 
    subtitle: 'Gerenciar episódios',
    icon: Menu
  },
  '/lista-m3u': { 
    title: 'Lista M3U', 
    subtitle: 'Listas de reprodução',
    icon: Menu
  },
  '/banners': { 
    title: 'Banners', 
    subtitle: 'Gerenciar banners do sistema',
    icon: Menu
  },
  '/categorias': { 
    title: 'Categorias', 
    subtitle: 'Organizar categorias',
    icon: Menu
  },
  '/duplicados': { 
    title: 'Conteúdos Duplicados', 
    subtitle: 'Identificar e gerenciar duplicatas',
    icon: Menu
  },
  '/duplicados-episodios': { 
    title: 'Episódios Duplicados', 
    subtitle: 'Gerenciar episódios duplicados',
    icon: Menu
  },
  '/usuarios': { 
    title: 'Usuários', 
    subtitle: 'Gerenciar usuários do sistema',
    icon: Menu
  },
  '/sessoes': { 
    title: 'Sessões', 
    subtitle: 'Monitorar sessões ativas',
    icon: Menu
  },
  '/plataformas': { 
    title: 'Plataformas', 
    subtitle: 'Gerenciar plataformas de streaming',
    icon: Menu
  },
  '/produtos': { 
    title: 'Produtos', 
    subtitle: 'Catálogo de produtos',
    icon: Menu
  },
  '/estatisticas': { 
    title: 'Estatísticas', 
    subtitle: 'Estatísticas e métricas gerais',
    icon: Menu
  },
  '/relatorios-visualizacao': { 
    title: 'Relatórios de Visualização', 
    subtitle: 'Análise de audiência e engagement',
    icon: Menu
  },
  '/metricas-engajamento': { 
    title: 'Métricas de Engajamento', 
    subtitle: 'KPIs e métricas de performance',
    icon: Menu
  },
  '/recursos': { 
    title: 'Recursos', 
    subtitle: 'Funcionalidades disponíveis',
    icon: Menu
  },
  '/precos-interno': { 
    title: 'Preços', 
    subtitle: 'Gerenciar planos e preços',
    icon: Menu
  },
  '/configuracoes': { 
    title: 'Configurações', 
    subtitle: 'Configurações do sistema',
    icon: Menu
  },
  '/importacao-automatica': { 
    title: 'Importação Automática', 
    subtitle: 'Automatizar importação de conteúdo',
    icon: Menu
  },
  '/substituicao-urls': { 
    title: 'Substituição de URLs', 
    subtitle: 'Gerenciar substituição de links',
    icon: Menu
  },
  '/perfil': { 
    title: 'Meu Perfil', 
    subtitle: 'Configurações pessoais',
    icon: Menu
  },
};

interface UserHeaderProps {
  onToggleSidebar: () => void;
  isCollapsed: boolean;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ onToggleSidebar, isCollapsed }) => {
  const { isDark, toggleTheme } = useTheme();
  const { mode, setMode } = useTypeMode();
  const { userInfo } = useSimpleAuth();
  const { hasPrioritySupport } = useUserPermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Obter informações da rota atual
  const currentRoute = routeTitles[location.pathname] || { 
    title: 'StreamFlix', 
    subtitle: 'Management Panel' 
  };

  useEffect(() => {
    loadUnreadCount();
    
    // Verificar novas notificações a cada 30 segundos
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Atalho de teclado para pesquisa (Ctrl+K ou Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadUnreadCount = () => {
    try {
      const savedNotifications = localStorage.getItem('user-notifications');
      if (savedNotifications) {
        const notifications = JSON.parse(savedNotifications);
        const unread = notifications.filter((n: any) => !n.lida).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Erro ao carregar contagem de notificações:', error);
    }
  };

  const handleNotificationsClick = () => {
    setShowNotifications(true);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
    setTimeout(loadUnreadCount, 100);
  };

  const getUserInitials = () => {
    if (!userInfo?.email) return 'U';
    return userInfo.email.split('@')[0].slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" data-tour="header">
        <div className="container flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center space-x-4">
            {/* Toggle Sidebar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="h-10 w-10 rounded-xl transition-all duration-200 hover:bg-accent/50 hover:scale-105"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </Button>
            
            {/* Título da Página */}
            <div className="hidden sm:block">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-gradient-to-b from-primary to-orange-500 rounded-full"></div>
                <div>
                  <h1 className="text-lg font-bold text-foreground leading-tight">
                    {currentRoute.title}
                  </h1>
                  <p className="text-xs text-muted-foreground font-medium">
                    {currentRoute.subtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-1 items-center justify-end space-x-3">
            {/* Suporte Prioritário Badge */}
            {hasPrioritySupport() && (
              <Badge 
                className="hidden md:flex bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 hover:from-amber-600 hover:to-yellow-600 transition-all duration-200 cursor-pointer"
                onClick={() => navigate('/suporte-ao-vivo')}
              >
                <Crown className="w-3 h-3 mr-1" />
                PRO
              </Badge>
            )}

            {/* Modo de Tipo (Singular/Plural) */}
            <div className="hidden md:flex items-center space-x-2 bg-card/50 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/40" data-tour="type-mode">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center gap-1 cursor-help transition-all duration-300 ${mode === 'singular' ? 'text-primary scale-110' : 'text-muted-foreground scale-100 opacity-60'}`}>
                    <UserCircle className={`h-4 w-4 transition-transform duration-300 ${mode === 'singular' ? 'rotate-0' : 'rotate-12'}`} />
                    <span className={`text-xs transition-all duration-300 ${mode === 'singular' ? 'font-semibold' : 'font-normal'}`}>Thiago</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold mb-1">Modo Thiago</p>
                  <p className="text-xs text-muted-foreground">
                    Formato singular para tipos de conteúdo. Ideal para bases de dados com nomenclatura no singular (ex: Filme, Serie, Anime).
                  </p>
                </TooltipContent>
              </Tooltip>
              <Switch
                checked={mode === 'plural'}
                onCheckedChange={(checked) => setMode(checked ? 'plural' : 'singular')}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted transition-all duration-300"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center gap-1 cursor-help transition-all duration-300 ${mode === 'plural' ? 'text-primary scale-110' : 'text-muted-foreground scale-100 opacity-60'}`}>
                    <Users className={`h-4 w-4 transition-transform duration-300 ${mode === 'plural' ? 'rotate-0' : '-rotate-12'}`} />
                    <span className={`text-xs transition-all duration-300 ${mode === 'plural' ? 'font-semibold' : 'font-normal'}`}>Francisco</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold mb-1">Modo Francisco</p>
                  <p className="text-xs text-muted-foreground">
                    Formato plural para tipos de conteúdo. Ideal para bases de dados com nomenclatura no plural (ex: Filmes, Series, Animes). Habilita recursos extras como Categorias Anime e Canais de TV.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Controle de Tema */}
            <div className="hidden md:flex items-center space-x-2 bg-card/50 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/40">
              <Sun className="h-4 w-4 text-amber-500" />
              <Switch
                checked={isDark}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-slate-600 data-[state=unchecked]:bg-amber-200"
              />
              <Moon className="h-4 w-4 text-slate-500" />
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center space-x-2">
              {/* Pesquisar */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(true)}
                className="h-10 w-10 rounded-xl transition-all duration-200 hover:bg-accent/50 hover:scale-105 relative group"
                title="Buscar (Ctrl+K)"
              >
                <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  Ctrl+K
                </div>
              </Button>
              
              {/* Notificações */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNotificationsClick}
                className="h-10 w-10 rounded-xl transition-all duration-200 hover:bg-accent/50 hover:scale-105 relative"
                title="Notificações"
              >
                <Bell className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 bg-red-500 text-white text-xs border-2 border-background flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
              
              {/* Configurações */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/configuracoes')}
                className="h-10 w-10 rounded-xl transition-all duration-200 hover:bg-accent/50 hover:scale-105"
                title="Configurações"
              >
                <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
              
              {/* Avatar do Usuário */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/perfil')}
                className="h-10 w-10 rounded-xl transition-all duration-200 hover:bg-accent/50 hover:scale-105 p-0"
                title="Meu Perfil"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white text-sm font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Modais */}
      <UserNotifications 
        isOpen={showNotifications} 
        onClose={handleCloseNotifications} 
      />

      <GlobalSearch 
        isOpen={showSearch} 
        onClose={() => setShowSearch(false)} 
      />
    </>
  );
};