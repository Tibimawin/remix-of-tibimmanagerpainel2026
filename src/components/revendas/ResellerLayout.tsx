import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, LogOut, Coins, Menu, X, Sparkles, ListPlus } from 'lucide-react';
import { useResellerAuth } from '@/contexts/ResellerAuthContext';
import { ResellerService, type ResellerState } from '@/services/ResellerService';

const NAV_ITEMS = [
  { to: '/revendas-creditos/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/revendas-creditos/linhas', label: 'Minhas Linhas', icon: Users },
  { to: '/revendas-creditos/gerar-linha', label: 'Gerar Linha', icon: ListPlus },
  { to: '/revendas-creditos/comprar-creditos', label: 'Comprar Créditos', icon: ShoppingCart },
];

/**
 * Layout dedicado do portal de revendas — roda própria, fora do painel principal.
 * Tema escuro com acento âmbar (créditos), independente do tema do painel.
 */
export const ResellerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading, logout } = useResellerAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [state, setState] = useState<ResellerState | null>(null);

  useEffect(() => {
    let alive = true;
    if (isAuthenticated) {
      ResellerService.state()
        .then(s => { if (alive) setState(s); })
        .catch(() => { /* página mostra erro própria */ });
    }
    return () => { alive = false; };
  }, [isAuthenticated, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
          <p className="text-sm">Carregando portal de revendas…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/revendas-creditos/login" replace />;

  const saldo = state?.reseller.creditBalance ?? 0;
  const masterName = state?.master.name || 'Portal de Revendas';

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
          <Sparkles className="h-5 w-5 text-slate-950" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{masterName}</p>
          <p className="text-xs text-slate-500">Portal de Revendas</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-400/10 text-amber-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`
            }
          >
            <item.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-slate-800 px-4 py-4">
        <div className="rounded-xl bg-slate-900 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            Saldo de créditos
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-300">{saldo}</p>
          <p className="text-[11px] text-slate-500">1 crédito = 30 dias de linha</p>
        </div>
        <div className="truncate text-xs text-slate-500">{user?.email}</div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800 bg-slate-900/40 backdrop-blur lg:block">
        {SidebarContent}
      </aside>

      {/* Sidebar mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-slate-800 bg-slate-900">
            <button className="absolute right-3 top-4 text-slate-400" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="text-slate-400 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm text-slate-500 lg:hidden">{masterName}</p>
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-300">
              <Coins className="h-4 w-4" />
              {saldo} {saldo === 1 ? 'crédito' : 'créditos'}
            </span>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};
