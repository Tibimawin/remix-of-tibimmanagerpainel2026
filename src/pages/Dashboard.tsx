
import React from 'react';
import SystemMetricsCards from '@/components/SystemMetricsCards';
import { UserOffers } from '@/components/UserOffers';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { PermissionGate } from '@/components/PermissionGate';
import ExpirationWarningBanner from '@/components/ExpirationWarningBanner';
import UserAnnouncementsBanner from '@/components/UserAnnouncementsBanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CreditCard, X, Sparkles, Download, Radio, LayoutGrid, Users, Copy, ShieldCheck, List, ArrowRight, Info, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const formatDaysLeft = (expiryDate?: string): number | null => {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
};

const Dashboard = () => {
  const { loading, permissions, hasFeature } = useUserPermissions();
  const { userInfo } = useSimpleAuth();
  const navigate = useNavigate();
  const [showPaymentBanner, setShowPaymentBanner] = React.useState(() => {
    return localStorage.getItem('dismiss-payment-banner') !== 'true';
  });

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 modern-loading rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 modern-loading rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const firstName = (userInfo?.name || permissions?.userName || userInfo?.email || '')
    .split('@')[0]
    .split(' ')[0];

  const daysLeft = formatDaysLeft(permissions?.expiryDate);
  const canImportM3U = hasFeature('importar-m3u');
  const canGeradorM3U = hasFeature('gerador-m3u');

  const quickActions = [
    { id: 'conteudos', label: 'Conteúdos', description: 'Gerenciar catálogo', icon: LayoutGrid, href: '/conteudos', feature: 'conteudos' },
    { id: 'episodios', label: 'Episódios', description: 'Gerenciar episódios', icon: List, href: '/episodios', feature: 'episodios' },
    { id: 'importar-m3u', label: 'Importar M3U', description: 'Listas de outros servidores', icon: Download, href: '/importar-m3u', feature: 'importar-m3u' },
    { id: 'gerador-m3u', label: 'Lista & DNS', description: 'Gerar M3U e Xtream', icon: Radio, href: '/gerar-m3u', feature: 'gerador-m3u' },
    { id: 'usuarios', label: 'Usuários', description: 'Gerenciar acessos', icon: Users, href: '/usuarios', feature: 'usuarios' },
    { id: 'duplicados', label: 'Duplicados', description: 'Limpar catálogo', icon: Copy, href: '/duplicados', feature: 'duplicados' },
    { id: 'verificar-links', label: 'Verificar Links', description: 'Links online ou mortos', icon: ShieldCheck, href: '/verificar-links', feature: 'duplicados' },
  ].filter((action) => hasFeature(action.feature));

  return (
    <PermissionGate feature="dashboard">
      <div className="w-full space-y-4 sm:space-y-6 animate-fade-in">
        <ExpirationWarningBanner
          onRenewClick={() => {
            window.location.href = '/precos';
          }}
        />

        <UserAnnouncementsBanner />

        {showPaymentBanner && (
          <Alert className="relative border-primary/30 bg-primary/5 p-3.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
                <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2 shrink-0 mt-0.5 sm:mt-0">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <AlertDescription className="text-foreground">
                  <p className="text-xs sm:text-sm font-semibold">🎉 Novidade! Pagamento de assinatura pelo painel</p>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">
                    Agora você pode renovar ou assinar seu plano diretamente pela aba de Pagamentos no seu perfil, via PIX.
                  </p>
                </AlertDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5 text-xs h-8 sm:h-9 flex-1 sm:flex-initial"
                  onClick={() => navigate('/perfil')}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Ver Pagamentos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => {
                    setShowPaymentBanner(false);
                    localStorage.setItem('dismiss-payment-banner', 'true');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Hero — saudação e plano */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-7">
          <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {getGreeting()}{firstName ? `, ${firstName}` : ''} 👋
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Bem-vindo ao seu painel de gerenciamento. Aqui está o resumo de tudo.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {permissions?.planName && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] sm:text-xs font-semibold text-primary">
                  <Sparkles className="h-3 w-3" />
                  {permissions.planName}
                </span>
              )}
              {daysLeft !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-[11px] sm:text-xs font-medium text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Aviso: importação de listas M3U / DNS de outros servidores */}
        {(canImportM3U || canGeradorM3U) && (
          <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-accent/5 p-4 sm:p-5">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-accent/15 p-2 shrink-0">
                  <Info className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Você não precisa de só um tipo de conteúdo
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground max-w-2xl">
                    Além dos conteúdos cadastrados aqui no painel, você também pode{' '}
                    <span className="font-medium text-foreground">importar listas M3U</span> ou{' '}
                    <span className="font-medium text-foreground">conectar uma DNS de outros servidores</span> para
                    misturar tudo na sua lista final.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {canImportM3U && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9" onClick={() => navigate('/importar-m3u')}>
                    <Download className="h-3.5 w-3.5" />
                    Importar M3U
                  </Button>
                )}
                {canGeradorM3U && (
                  <Button size="sm" variant="default" className="gap-1.5 text-xs h-9" onClick={() => navigate('/gerar-m3u')}>
                    <Radio className="h-3.5 w-3.5" />
                    Gerar Lista & DNS
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Atalhos rápidos */}
        {quickActions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Acesso rápido
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.href)}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs sm:text-sm font-semibold text-foreground">{action.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Métricas */}
        <div className="modern-card p-3.5 sm:p-5 md:p-6 backdrop-blur-sm">
          <div className="mb-4 sm:mb-6 flex items-center space-x-2.5 sm:space-x-3">
            <div className="h-5 sm:h-6 w-1 rounded-full bg-gradient-to-b from-primary to-orange-500 shrink-0"></div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground">Métricas do Sistema</h2>
          </div>
          <SystemMetricsCards />
        </div>

        {/* Promoções */}
        <div className="modern-card p-3.5 sm:p-5 md:p-6 backdrop-blur-sm">
          <UserOffers />
        </div>
      </div>
    </PermissionGate>
  );
};

export default Dashboard;
