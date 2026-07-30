import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Users, Activity, Calendar, BarChart, Package, Bell,
  UserPlus, CreditCard, Crown, UserCheck, MessageCircle,
  Settings, RefreshCw, LogOut, Tag, AlertTriangle, Megaphone, Sparkles, Palette, DollarSign, Key
} from 'lucide-react';

export type AdminView = 'overview' | 'users' | 'activity' | 'date-logs' | 'metrics' | 'products' | 'notifications' | 'user-management' | 'firebase-users' | 'registration-control' | 'chat' | 'import-config' | 'plans' | 'plan-requests' | 'user-permissions' | 'series-correction' | 'series-update-config' | 'miniseries-config' | 'suporte-prioritario' | 'security-center' | 'offers' | 'announcements' | 'whatsapp' | 'maintenance' | 'access-expired-config' | 'expiration-notifications' | 'user-action-history' | 'referrals' | 'system-updates' | 'seasonal-theme' | 'financial' | 'planos-config' | 'api-keys' | 'protected-channels';

interface AdminSidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  adminUser: any;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

const menuItems = [
  { id: 'overview', label: 'Visão Geral', icon: Shield, category: 'main' },
  { id: 'users', label: 'Usuários', icon: Users, category: 'main' },
  { id: 'activity', label: 'Logs de Atividade', icon: Activity, category: 'main' },
  { id: 'user-action-history', label: '📋 Ações dos Usuários', icon: Activity, category: 'main' },
  { id: 'date-logs', label: 'Logs por Data', icon: Calendar, category: 'main' },
  { id: 'security-center', label: '🔒 Central de Segurança', icon: Shield, category: 'security' },
  { id: 'protected-channels', label: '🛡️ Canais Protegidos', icon: Shield, category: 'security', isNew: true },
  { id: 'financial', label: '💰 Controle Financeiro', icon: DollarSign, category: 'analytics', isNew: true },
  { id: 'metrics', label: 'Métricas Visuais', icon: BarChart, category: 'analytics' },
  { id: 'products', label: 'Produtos', icon: Package, category: 'management' },
  { id: 'offers', label: 'Ofertas', icon: Tag, category: 'management' },
  { id: 'referrals', label: 'Indicações', icon: Users, category: 'management', isNew: true },
  { id: 'api-keys', label: '🔑 API Keys', icon: Key, category: 'management', isNew: true },
  { id: 'announcements', label: 'Anúncios', icon: Megaphone, category: 'management' },
  { id: 'system-updates', label: '🎉 Atualizações do Sistema', icon: Sparkles, category: 'management', isNew: true },

  { id: 'notifications', label: 'Notificações', icon: Bell, category: 'management' },
  { id: 'expiration-notifications', label: '⏰ Notificações de Expiração', icon: AlertTriangle, category: 'management' },
  { id: 'user-management', label: 'Cadastrar Usuários', icon: UserPlus, category: 'management' },
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
  onLogout
}) => {
  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  return (
    <div className="w-80 h-screen sticky top-0 overscroll-contain modern-sidebar border-r border-purple-500/10 flex flex-col bg-card/60 backdrop-blur-md">
      {/* Header */}
      <div className="p-6 border-b border-purple-500/10">
        <div className="flex items-center space-x-3 animate-slide-in-left">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 via-purple-500 to-fuchsia-500 rounded-xl shadow-lg shadow-purple-500/25">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground bg-gradient-to-r from-purple-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{adminUser?.nome || 'Admin'}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto overscroll-contain custom-scrollbar">
        <div className="space-y-6">
          {Object.entries(groupedMenuItems).map(([category, items], categoryIndex) => (
            <div key={category} className="space-y-2">
              <div className="px-3 py-1">
                <h3 className="text-[10px] font-bold text-purple-400/80 uppercase tracking-widest font-mono">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h3>
              </div>
              <ul className="space-y-1">
                {items.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return (
                    <li
                      key={item.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${(categoryIndex * items.length + index) * 0.03}s` }}
                    >
                      <button
                        onClick={() => onViewChange(item.id as AdminView)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative backdrop-blur-sm border ${isActive
                            ? 'bg-gradient-to-r from-purple-500/15 via-purple-500/10 to-fuchsia-500/15 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                            : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5 hover:border-white/5 hover:shadow-sm'
                          }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${isActive ? 'text-purple-400 scale-110' : 'group-hover:text-foreground'
                          }`} />
                        <span className="truncate">{item.label}</span>
                        {(item as any).isNew && (
                          <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[9px] px-1.5 py-0.5 animate-pulse border-none">NOVO</Badge>
                        )}
                        {isActive && (
                          <div className="absolute right-3 w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse shadow-[0_0_8px_#a855f7]" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-purple-500/10 space-y-3 bg-card/20 backdrop-blur-sm">
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="w-full border-purple-500/20 text-foreground bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all duration-300 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </Button>

        <Button
          onClick={onLogout}
          variant="destructive"
          className="w-full bg-red-950/20 hover:bg-red-900/30 border border-red-500/30 text-red-400 shadow-sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
};