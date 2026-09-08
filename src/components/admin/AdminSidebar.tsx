import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Shield, Users, Activity, Calendar, BarChart, Package, Bell,
  UserPlus, CreditCard, Crown, UserCheck, MessageCircle,
  Settings, RefreshCw, LogOut, Tag, AlertTriangle, Megaphone, Sparkles, Palette, DollarSign, Key, Search, X, Smartphone
} from 'lucide-react';

export type AdminView = 'overview' | 'todos-apps' | 'users' | 'activity' | 'date-logs' | 'metrics' | 'products' | 'notifications' | 'user-management' | 'firebase-users' | 'registration-control' | 'chat' | 'import-config' | 'plans' | 'plan-requests' | 'user-permissions' | 'series-correction' | 'series-update-config' | 'miniseries-config' | 'jogos-dia-config' | 'suporte-prioritario' | 'security-center' | 'offers' | 'announcements' | 'whatsapp' | 'maintenance' | 'access-expired-config' | 'expiration-notifications' | 'user-action-history' | 'referrals' | 'system-updates' | 'seasonal-theme' | 'financial' | 'planos-config' | 'api-keys' | 'protected-channels' | 'cloak-links' | 'cloak-dashboard' | 'push-center';

interface AdminSidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  adminUser: any;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const menuItems = [
  { id: 'overview', label: 'Visão Geral', icon: Shield, category: 'main' },
  { id: 'users', label: 'Usuários', icon: Users, category: 'main' },
  { id: 'activity', label: 'Logs de Atividade', icon: Activity, category: 'main' },
  { id: 'user-action-history', label: '📋 Ações dos Usuários', icon: Activity, category: 'main' },
  { id: 'date-logs', label: 'Logs por Data', icon: Calendar, category: 'main' },
  { id: 'security-center', label: '🔒 Central de Segurança', icon: Shield, category: 'security' },
  { id: 'protected-channels', label: '🛡️ Canais Protegidos', icon: Shield, category: 'security', isNew: true },
  { id: 'cloak-links', label: '🔗 Links Camuflados', icon: Shield, category: 'security', isNew: true },
  { id: 'cloak-dashboard', label: '📊 Camuflagem & Importações', icon: BarChart, category: 'analytics', isNew: true },
  { id: 'financial', label: '💰 Controle Financeiro', icon: DollarSign, category: 'analytics', isNew: true },
  { id: 'metrics', label: 'Métricas Visuais', icon: BarChart, category: 'analytics' },
  { id: 'products', label: 'Produtos', icon: Package, category: 'management' },
  { id: 'offers', label: 'Ofertas', icon: Tag, category: 'management' },
  { id: 'referrals', label: 'Indicações', icon: Users, category: 'management', isNew: true },
  { id: 'api-keys', label: '🔑 API Keys', icon: Key, category: 'management', isNew: true },
  { id: 'announcements', label: 'Anúncios', icon: Megaphone, category: 'management' },
  { id: 'system-updates', label: '🎉 Atualizações do Sistema', icon: Sparkles, category: 'management', isNew: true },

  { id: 'notifications', label: 'Notificações', icon: Bell, category: 'management' },
  { id: 'push-center', label: '🔔 Central de Push', icon: Bell, category: 'management', isNew: true },
  { id: 'expiration-notifications', label: '⏰ Notificações de Expiração', icon: AlertTriangle, category: 'management' },
  { id: 'user-management', label: 'Cadastrar Usuários', icon: UserPlus, category: 'management' },
  { id: 'todos-apps', label: '📱 Todos Apps', icon: Smartphone, category: 'management', isNew: true },
  { id: 'firebase-users', label: '🔥 Gerenciar Usuários Firebase', icon: Users, category: 'management' },
  { id: 'registration-control', label: 'Controle de Cadastro', icon: Settings, category: 'management' },
  { id: 'plans', label: 'Gerenciar Planos', icon: CreditCard, category: 'management' },
  { id: 'planos-config', label: '📋 Configurar Planos', icon: CreditCard, category: 'management' },
  { id: 'plan-requests', label: 'Planos Solicitados', icon: Crown, category: 'management' },
  { id: 'user-permissions', label: 'Permissões de Usuário', icon: UserCheck, category: 'management' },
  { id: 'suporte-prioritario', label: 'Suporte Prioritário', icon: MessageCircle, category: 'support' },
  { id: 'whatsapp', label: 'WhatsApp Config', icon: MessageCircle, category: 'settings' },
  { id: 'maintenance', label: 'Modo Manutenção', icon: AlertTriangle, category: 'settings' },
  { id: 'access-expired-config', label: 'Mensagem Acesso Expirado', icon: Shield, category: 'settings' },
  { id: 'seasonal-theme', label: '🎨 Tema Sazonal', icon: Palette, category: 'settings', isNew: true },
  { id: 'import-config', label: 'Config. Importação', icon: Settings, category: 'settings' },
  { id: 'series-correction', label: 'Corrigir Séries', icon: RefreshCw, category: 'settings' },
  { id: 'series-update-config', label: '🔄 Origem Atualização de Séries', icon: RefreshCw, category: 'settings', isNew: true },
  { id: 'miniseries-config', label: '🎬 Origem Minisséries', icon: Settings, category: 'settings', isNew: true },
  { id: 'jogos-dia-config', label: '⚽ Origem Jogos do Dia', icon: Settings, category: 'settings', isNew: true },
  { id: 'chat', label: 'Suporte ao Vivo', icon: MessageCircle, category: 'support' },
];

const categoryLabels = {
  main: 'Principal',
  security: 'Segurança',
  analytics: 'Análises',
  management: 'Gerenciamento',
  support: 'Suporte',
  settings: 'Configurações'
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeView,
  onViewChange,
  adminUser,
  isRefreshing,
  onRefresh,
  onLogout,
  mobileOpen,
  onMobileOpenChange
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const mainContent = document.getElementById('admin-main-content');
    if (!mainContent) return;

    const handleScroll = () => {
      setScrolled(mainContent.scrollTop > 10);
    };

    mainContent.addEventListener('scroll', handleScroll);
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredMenuItems = useMemo(() => {
    let items = menuItems;
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        categoryLabels[item.category as keyof typeof categoryLabels]?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [searchQuery, selectedCategory]);

  const groupedMenuItems = useMemo(() => {
    return filteredMenuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof menuItems>);
  }, [filteredMenuItems]);

  const handleItemClick = (viewId: AdminView) => {
    onViewChange(viewId);
    if (onMobileOpenChange) {
      onMobileOpenChange(false);
    }
  };

  const sidebarBody = (
    <div className="w-full h-full flex flex-col overscroll-contain">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 via-purple-500 to-fuchsia-500 rounded-xl shadow-lg shadow-purple-500/25">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground bg-gradient-to-r from-purple-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[140px]">{adminUser?.nome || 'Admin'}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-400 bg-purple-500/10">
            v3.0 Otimizado
          </Badge>
        </div>

        {/* Quick Search Input */}
        <div className="mt-3 relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar seção (ex: Usuários, Push, PIX)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 h-8 text-xs bg-background/50 border-purple-500/20 focus-visible:ring-purple-500/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'main', label: 'Principal' },
            { id: 'security', label: 'Segurança' },
            { id: 'analytics', label: 'Análises' },
            { id: 'management', label: 'Gestão' },
            { id: 'settings', label: 'Config' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer active:scale-95 ${
                selectedCategory === cat.id
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-3 overflow-y-auto overscroll-contain custom-scrollbar">
        {filteredMenuItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
            <p>Nenhuma opção encontrada para "{searchQuery}".</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="text-xs h-7 border-purple-500/30"
            >
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMenuItems).map(([category, items]) => (
              <div key={category} className="space-y-1">
                <div className="px-2.5 py-0.5 flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-purple-400/80 uppercase tracking-widest font-mono">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h3>
                  <span className="text-[9px] text-muted-foreground font-mono">{items.length}</span>
                </div>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleItemClick(item.id as AdminView)}
                          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group relative backdrop-blur-sm border text-left cursor-pointer active:scale-[0.98] select-none ${
                            isActive
                              ? 'bg-gradient-to-r from-purple-500/20 via-purple-500/15 to-fuchsia-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)] font-semibold'
                              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5 hover:border-white/5'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${
                            isActive ? 'text-purple-400 scale-110' : 'group-hover:text-foreground'
                          }`} />
                          <span className="truncate flex-1">{item.label}</span>
                          {(item as any).isNew && (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[8px] px-1 py-0 h-4 border-none font-bold">NOVO</Badge>
                          )}
                          {isActive && (
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse shadow-[0_0_6px_#a855f7]" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-purple-500/10 space-y-2 bg-card/20 backdrop-blur-sm">
        <Button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs border-purple-500/20 text-foreground bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all duration-150 shadow-sm cursor-pointer active:scale-[0.98]"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
        </Button>

        <Button
          type="button"
          onClick={onLogout}
          variant="destructive"
          size="sm"
          className="w-full h-8 text-xs bg-red-950/20 hover:bg-red-900/30 border border-red-500/30 text-red-400 shadow-sm cursor-pointer active:scale-[0.98]"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden lg:flex w-80 flex-shrink-0 h-screen sticky top-0 left-0 overscroll-contain modern-sidebar border-r border-purple-500/10 flex-col bg-card/60 backdrop-blur-md z-50 transition-shadow duration-300 ${scrolled ? 'shadow-[10px_0_30px_-15px_rgba(168,85,247,0.3)]' : ''}`}>
        {sidebarBody}
      </aside>

      {/* Mobile */}
      <Sheet open={!!mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="p-0 w-[85vw] max-w-[20rem] bg-card/95 backdrop-blur-md border-purple-500/10 lg:hidden">
          {sidebarBody}
        </SheetContent>
      </Sheet>
    </>
  );
};