import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Film, 
  Tv, 
  CreditCard, 
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserMobileNavProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const UserMobileNav: React.FC<UserMobileNavProps> = ({ 
  onToggleSidebar, 
  isSidebarOpen 
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Início',
      href: '/dashboard',
      icon: LayoutDashboard,
      isActive: location.pathname === '/dashboard',
    },
    {
      id: 'conteudos',
      label: 'Conteúdos',
      href: '/conteudos',
      icon: Film,
      isActive: location.pathname.startsWith('/conteudos') || location.pathname.startsWith('/episodios'),
    },
    {
      id: 'm3u',
      label: 'Canais/M3U',
      href: '/importar-canais-tv',
      icon: Tv,
      isActive: location.pathname === '/importar-canais-tv' || location.pathname === '/importacao-automatica',
    },
    {
      id: 'status',
      label: 'Planos',
      href: '/status',
      icon: CreditCard,
      isActive: location.pathname === '/status' || location.pathname === '/planos' || location.pathname === '/precos',
    },
  ];

  const handleNavClick = (href: string) => {
    if (isSidebarOpen) {
      onToggleSidebar();
    }
    navigate(href);
  };

  return (
    <nav 
      aria-label="Navegação móvel"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl safe-bottom"
    >
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive && !isSidebarOpen;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.href)}
              className={cn(
                "flex flex-col items-center justify-center h-full w-full py-1 px-0.5 relative transition-all duration-200 select-none touch-manipulation",
                active 
                  ? "text-primary font-semibold" 
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              {active && (
                <span className="absolute top-0 w-8 h-1 bg-gradient-to-r from-primary to-orange-500 rounded-full animate-fade-in" />
              )}
              <div className={cn(
                "p-1 rounded-xl transition-all duration-200",
                active ? "bg-primary/15 text-primary scale-105" : "text-muted-foreground"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[62px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Botão Menu / Gaveta lateral */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            "flex flex-col items-center justify-center h-full w-full py-1 px-0.5 relative transition-all duration-200 select-none touch-manipulation",
            isSidebarOpen 
              ? "text-primary font-semibold" 
              : "text-muted-foreground hover:text-foreground active:scale-95"
          )}
        >
          {isSidebarOpen && (
            <span className="absolute top-0 w-8 h-1 bg-gradient-to-r from-primary to-orange-500 rounded-full animate-fade-in" />
          )}
          <div className={cn(
            "p-1 rounded-xl transition-all duration-200",
            isSidebarOpen ? "bg-primary/15 text-primary scale-105" : "text-muted-foreground"
          )}>
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[62px]">
            {isSidebarOpen ? 'Fechar' : 'Menu'}
          </span>
        </button>
      </div>
    </nav>
  );
};
