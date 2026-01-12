
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { Menu, User, Bell, Search } from 'lucide-react';
import UserNotifications from './UserNotifications';
import GlobalSearch from './GlobalSearch';

interface HeaderProps {
  onToggleSidebar: () => void;
  isCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isCollapsed }) => {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    
    // Verificar novas notificações a cada 5 segundos
    const interval = setInterval(loadUnreadCount, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Atalho de teclado para pesquisa (Ctrl+K ou Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
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
    // Recarregar contagem após fechar o modal
    setTimeout(loadUnreadCount, 100);
  };

  const handleSearchClick = () => {
    setShowSearch(true);
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
  };

  return (
    <>
      <header 
        className="modern-header h-16 px-4 md:px-6 flex justify-between items-center relative z-50"
        data-tour="header"
      >
        <div className="flex items-center space-x-3 md:space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="h-10 w-10 rounded-xl transition-all duration-200 hover:bg-accent hover:scale-105 modern-slide-in"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </Button>
          
          <div className="hidden sm:flex items-center space-x-3 modern-slide-in">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-minimal">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                StreamFlix
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Management Panel</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Controles de tema */}
          <div className="hidden sm:flex items-center space-x-3 modern-card px-4 py-2 bg-card border border-border shadow-minimal">
            <Label htmlFor="theme-switch" className="text-sm cursor-pointer font-medium text-muted-foreground">
              {isDark ? '🌙' : '☀️'}
            </Label>
            <Switch
              id="theme-switch"
              checked={isDark}
              onCheckedChange={toggleTheme}
              className="scale-90"
            />
          </div>

          {/* Botões de ação */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearchClick}
              className="h-10 w-10 rounded-xl transition-all duration-200 hover:bg-accent hover:scale-105 hover-lift"
              title="Buscar (Ctrl+K)"
            >
              <Search className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </Button>
            
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNotificationsClick}
                className="h-10 w-10 rounded-xl transition-all duration-200 hover:bg-accent hover:scale-105 hover-lift"
                title="Notificações"
              >
                <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold border-2 border-background modern-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl transition-all duration-200 hover:bg-accent hover:scale-105 hover-lift"
              title="Meu Perfil"
              onClick={() => navigate('/perfil')}
            >
              <User className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </Button>
          </div>
        </div>
      </header>

      {/* Modal de Notificações */}
      <UserNotifications 
        isOpen={showNotifications} 
        onClose={handleCloseNotifications} 
      />

      {/* Modal de Pesquisa */}
      <GlobalSearch 
        isOpen={showSearch} 
        onClose={handleCloseSearch} 
      />
    </>
  );
};
