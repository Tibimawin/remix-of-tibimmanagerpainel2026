import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Users, Activity, Calendar, BarChart, Package, Bell,
  UserPlus, CreditCard, Crown, UserCheck, MessageCircle,
  Settings, RefreshCw, LogOut, Tag, AlertTriangle, Megaphone, Sparkles, Palette, DollarSign
} from 'lucide-react';

export type AdminView = 'overview' | 'users' | 'activity' | 'date-logs' | 'metrics' | 'products' | 'notifications' | 'user-management' | 'firebase-users' | 'registration-control' | 'chat' | 'import-config' | 'plans' | 'plan-requests' | 'user-permissions' | 'series-correction' | 'suporte-prioritario' | 'security-center' | 'offers' | 'announcements' | 'whatsapp' | 'maintenance' | 'access-expired-config' | 'expiration-notifications' | 'user-action-history' | 'referrals' | 'system-updates' | 'seasonal-theme' | 'financial' | 'planos-config' | 'api-keys';

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
  { id: 'financial', label: '💰 Controle Financeiro', icon: DollarSign, category: 'analytics', isNew: true },
  { id: 'metrics', label: 'Métricas Visuais', icon: BarChart, category: 'analytics' },
  { id: 'products', label: 'Produtos', icon: Package, category: 'management' },
  { id: 'offers', label: 'Ofertas', icon: Tag, category: 'management' },
  { id: 'referrals', label: 'Indicações', icon: Users, category: 'management', isNew: true },
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
    <div className="w-80 modern-sidebar border-r border-border/40 flex flex-col bg-gradient-to-b from-card to-card/80">
      {/* Header */}
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center space-x-3 animate-slide-in-left">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary via-primary/80 to-accent rounded-xl shadow-lg">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground">{adminUser?.nome || 'Admin'}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {Object.entries(groupedMenuItems).map(([category, items], categoryIndex) => (
            <div key={category} className="space-y-2">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                      style={{ animationDelay: `${(categoryIndex * items.length + index) * 0.05}s` }}
                    >
                      <button
                        onClick={() => onViewChange(item.id as AdminView)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative backdrop-blur-sm ${isActive
                            ? 'bg-gradient-to-r from-primary/20 via-primary/15 to-accent/20 text-primary border border-primary/30 shadow-lg modern-card'
                            : 'text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-accent/10 hover:to-primary/10 hover:border hover:border-accent/20 hover:shadow-soft'
                          }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${isActive ? 'text-primary' : 'group-hover:text-foreground'
                          }`} />
                        <span className="truncate">{item.label}</span>
                        {(item as any).isNew && (
                          <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs px-1.5 py-0.5 animate-pulse">NOVO</Badge>
                        )}
                        {isActive && (
                          <div className="absolute right-3 w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm" />
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
      <div className="p-4 border-t border-border/40 space-y-3">
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="w-full border-border/60 text-foreground hover:bg-gradient-to-r hover:from-accent/10 hover:to-primary/10 transition-all duration-300 modern-button"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </Button>

        <Button
          onClick={onLogout}
          variant="destructive"
          className="w-full modern-button"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>

        {/* Status do Sistema */}
        <div className="modern-card bg-gradient-to-r from-accent/20 to-primary/20 rounded-xl p-3 border border-accent/20 backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium text-foreground flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse shadow-glow"></div>
              Sistema Online
            </p>
            <p className="text-xs text-muted-foreground mt-1">Todas as funções ativas</p>
          </div>
        </div>
      </div>
    </div>
  );
};