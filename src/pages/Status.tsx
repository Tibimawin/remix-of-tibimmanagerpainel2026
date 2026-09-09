import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useUserPermissions } from '@/contexts/UserPermissionsContext';
import { useBaserowUserStatus } from '@/hooks/useBaserowUserStatus';
import { useExpirationNotifications } from '@/hooks/useExpirationNotifications';
import { AVAILABLE_FEATURES, FeatureAccess } from '@/types/planTypes';
import { isFreeFeatureWhenExpired } from '@/config/freeFeatures';
import { 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Sparkles, 
  RefreshCw, 
  CreditCard, 
  Zap, 
  Database, 
  LayoutDashboard, 
  TrendingUp, 
  Lock, 
  Unlock, 
  Search, 
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Server,
  Layers,
  ArrowUpRight,
  User,
  Film,
  List,
  Flame,
  Smartphone,
  Cpu,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export type SubscriptionStatusState = 'active' | 'warning' | 'expired';

export interface SubscriptionStatusInfo {
  state: SubscriptionStatusState;
  label: 'Ativo' | 'Expiração Próxima' | 'Expirado';
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  icon: React.ReactNode;
}

export const getSubscriptionStatusInfo = (daysRemaining: number, isExpiredFlag?: boolean): SubscriptionStatusInfo => {
  if (isExpiredFlag || daysRemaining <= 0) {
    return {
      state: 'expired',
      label: 'Expirado',
      badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/25',
      dotClass: 'bg-red-500',
      borderClass: 'border-red-500/40',
      icon: <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
    };
  }
  if (daysRemaining <= 5) {
    return {
      state: 'warning',
      label: 'Expiração Próxima',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
      dotClass: 'bg-amber-500 animate-pulse',
      borderClass: 'border-amber-500/40',
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
    };
  }
  return {
    state: 'active',
    label: 'Ativo',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
    dotClass: 'bg-emerald-500',
    borderClass: 'border-emerald-500/40',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
  };
};

/**
 * Componente visual de Badge Colorida para indicar Ativo, Expiração Próxima ou Expirado
 */
export const StatusIndicatorBadge: React.FC<{ 
  daysRemaining: number; 
  isExpired?: boolean; 
  size?: 'sm' | 'md' | 'lg'; 
  showIcon?: boolean;
  className?: string;
}> = ({
  daysRemaining,
  isExpired,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const info = getSubscriptionStatusInfo(daysRemaining, isExpired);
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2'
  };

  return (
    <Badge 
      variant="outline" 
      className={`inline-flex items-center font-semibold transition-all border shadow-xs select-none ${info.badgeClass} ${sizeClasses[size]} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${info.dotClass}`} />
      {showIcon && info.icon}
      <span>{info.label}</span>
    </Badge>
  );
};

export const Status: React.FC = () => {
  const navigate = useNavigate();
  const { userInfo } = useSimpleAuth();
  const { permissions, loading: permissionsLoading, isSubscriptionExpired, refreshPermissions } = useUserPermissions();
  const { baserowStatus, loading: baserowLoading, refetch: refetchBaserow } = useBaserowUserStatus();
  const { getDaysRemaining: getNotificationDaysRemaining } = useExpirationNotifications();

  const [panelUser, setPanelUser] = useState<any>(null);
  const [panelLoading, setPanelLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filtros para funcionalidades
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Carregar dados detalhados do usuário no Firebase (users/{uid})
  const fetchPanelUserData = async () => {
    if (!userInfo?.id) return;
    try {
      setPanelLoading(true);
      const { FirebaseUserService } = await import('@/services/FirebaseUserService');
      const user = await FirebaseUserService.getUserById(userInfo.id);
      setPanelUser(user);
    } catch (err) {
      console.warn('Erro ao carregar dados do usuário do Firebase:', err);
    } finally {
      setPanelLoading(false);
    }
  };

  useEffect(() => {
    fetchPanelUserData();
  }, [userInfo?.id]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      refreshPermissions();
      await Promise.all([
        fetchPanelUserData(),
        refetchBaserow()
      ]);
      toast.success('Informações de status atualizadas!');
    } catch (e) {
      toast.error('Erro ao atualizar informações');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Cálculo de dias e progresso do Painel
  const panelStats = useMemo(() => {
    const totalDays = panelUser?.accessDays || userInfo?.accessDays || 30;
    const startDateStr = panelUser?.startDate || panelUser?.createdAt || '';
    const expiryDateStr = panelUser?.expiryDate || permissions?.expiryDate || '';

    let daysRemaining = 0;
    if (expiryDateStr) {
      const expDate = new Date(expiryDateStr);
      if (!isNaN(expDate.getTime())) {
        const diff = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, diff);
      }
    } else if (userInfo?.diasRestantes !== undefined) {
      daysRemaining = Math.max(0, userInfo.diasRestantes);
    }

    const daysUsed = Math.max(0, totalDays - daysRemaining);
    const percentage = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((daysRemaining / totalDays) * 100))) : 0;
    const isExpired = isSubscriptionExpired || daysRemaining <= 0;
    const isWarning = !isExpired && daysRemaining <= 5;
    const statusLabel = isExpired ? 'Expirado' : isWarning ? 'Expiração Próxima' : 'Ativo';

    return {
      totalDays,
      daysRemaining,
      daysUsed,
      percentage,
      startDate: startDateStr ? new Date(startDateStr).toLocaleDateString('pt-BR') : 'N/A',
      expiryDate: expiryDateStr ? new Date(expiryDateStr).toLocaleDateString('pt-BR') : 'N/A',
      isExpired,
      isWarning,
      statusLabel,
      statusColor: isExpired 
        ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' 
        : isWarning 
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' 
          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    };
  }, [panelUser, permissions, userInfo, isSubscriptionExpired]);

  // Cálculo de dias e progresso do Baserow (estritamente sincronizado com o plano ativo)
  const baserowStats = useMemo(() => {
    // O Baserow faz parte integrante do plano ativo (mesmo ciclo e dias de validade)
    const totalDays = panelStats.totalDays;
    const daysRemaining = panelStats.daysRemaining;
    const daysUsed = panelStats.daysUsed;
    const percentage = panelStats.percentage;
    const isExpired = panelStats.isExpired;
    const isWarning = panelStats.isWarning;
    const statusLabel = panelStats.statusLabel;
    const statusColor = panelStats.statusColor;

    return {
      totalDays,
      daysRemaining,
      daysUsed,
      percentage,
      paymentDate: baserowStatus?.paymentDate ? new Date(baserowStatus.paymentDate).toLocaleDateString('pt-BR') : panelStats.startDate,
      expiryDate: panelStats.expiryDate,
      isExpired,
      isWarning,
      isFound: baserowStatus?.found ?? false,
      statusLabel,
      statusColor
    };
  }, [baserowStatus, panelStats]);

  // Categorização das funcionalidades
  const getFeatureCategory = (id: string): string => {
    if (['dashboard', 'status'].includes(id)) return 'Principal';
    if (['conteudos', 'episodios', 'lista-m3u', 'banners', 'gerador-post', 'gerador-banner', 'categorias', 'categorias-tv', 'categorias-anime', 'adicionar-conteudo', 'miniseries'].includes(id)) return 'Conteúdo';
    if (['duplicados', 'duplicados-episodios', 'duplicados-episodios-otimizado', 'ferramentas-ia', 'importacao-automatica', 'automacao', 'substituicao-urls', 'importar-m3u', 'importar-canais-tv', 'atualizacao-series', 'maxplus', 'maxplus-import', 'clean-data', 'jogos-dia'].includes(id)) return 'Ferramentas & Automação';
    if (['usuarios', 'sessoes', 'plataformas', 'produtos', 'gestao-dispositivos'].includes(id)) return 'Gerenciamento';
    if (['estatisticas', 'relatorios-visualizacao', 'metricas-engajamento'].includes(id)) return 'Análises';
    if (['recursos', 'precos-interno', 'configuracoes', 'perfil', 'historico-acoes', 'planos', 'minha-api'].includes(id)) return 'Configurações & API';
    if (['suporte-ao-vivo', 'priority-support'].includes(id)) return 'Suporte';
    if (['carrosseu', 'versao', 'pedido', 'avaliacao', 'plano2', 'categoriaFilmes', 'categoriaSeries', 'categoriaDorama', 'categoriaAnimes', 'categoriaNovelas', 'meus-aplicativos'].includes(id)) return 'Modo Tibim';
    return 'Outros';
  };

  // Avaliação de todas as funcionalidades ativas vs bloqueadas
  const featureList = useMemo(() => {
    const enabledSet = new Set(permissions?.enabledFeatures || []);
    const isExpired = panelStats.isExpired;

    return AVAILABLE_FEATURES.map(feat => {
      // Se expirado, apenas recursos essenciais permanecem livres
      const isFreeWhenExpired = isFreeFeatureWhenExpired(feat.id);
      const isActive = isExpired ? isFreeWhenExpired : enabledSet.has(feat.id);
      const category = getFeatureCategory(feat.id);

      return {
        ...feat,
        category,
        isActive,
      };
    });
  }, [permissions?.enabledFeatures, panelStats.isExpired]);

  // Contadores
  const totalFeatures = featureList.length;
  const activeFeaturesCount = featureList.filter(f => f.isActive).length;
  const blockedFeaturesCount = totalFeatures - activeFeaturesCount;
  const activePercentage = totalFeatures > 0 ? Math.round((activeFeaturesCount / totalFeatures) * 100) : 0;

  // Categorias únicas
  const categories = useMemo(() => {
    const set = new Set(featureList.map(f => f.category));
    return ['all', ...Array.from(set)];
  }, [featureList]);

  // Funcionalidades filtradas
  const filteredFeatures = useMemo(() => {
    return featureList.filter(feat => {
      // Filtro de busca
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = feat.name.toLowerCase().includes(query);
        const matchesDesc = feat.description.toLowerCase().includes(query);
        const matchesId = feat.id.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesId) return false;
      }

      // Filtro de status
      if (statusFilter === 'active' && !feat.isActive) return false;
      if (statusFilter === 'blocked' && feat.isActive) return false;

      // Filtro de categoria
      if (categoryFilter !== 'all' && feat.category !== categoryFilter) return false;

      return true;
    });
  }, [featureList, searchQuery, statusFilter, categoryFilter]);

  // Benefícios estruturados do plano
  const planBenefits = [
    {
      title: 'Acesso ao Painel de Controle',
      description: 'Gestão completa de conteúdos, categorias, banners e listas M3U em tempo real.',
      included: true,
      icon: LayoutDashboard,
    },
    {
      title: 'Banco de Dados Baserow Sincronizado',
      description: 'Estrutura relacional de alta performance com persistência e espelhamento contínuo.',
      included: true,
      icon: Database,
    },
    {
      title: 'Automação & Importação em Massa',
      description: 'Agendamentos automáticos, busca por títulos e importação direta de servidores.',
      included: permissions?.enabledFeatures?.includes('importacao-automatica') || permissions?.enabledFeatures?.includes('automacao') || false,
      icon: Zap,
    },
    {
      title: 'Ferramentas com Inteligência Artificial',
      description: 'Geração de sinopses, posters automáticos, banners e otimização inteligente.',
      included: permissions?.enabledFeatures?.includes('ferramentas-ia') || false,
      icon: Sparkles,
    },
    {
      title: 'Atualização Automática de Séries',
      description: 'Monitoramento contínuo e sincronização de novos episódios sem intervenção manual.',
      included: permissions?.enabledFeatures?.includes('atualizacao-series') || false,
      icon: Film,
    },
    {
      title: 'Integração API REST & Chaves de Acesso',
      description: 'Acesso programático para conectar aplicativos externos, sites e players.',
      included: permissions?.enabledFeatures?.includes('minha-api') || false,
      icon: Server,
    },
    {
      title: 'Gestão de Múltiplos Dispositivos',
      description: 'Controle de sessões simultâneas, verificação de IMEI e segurança avançada.',
      included: permissions?.enabledFeatures?.includes('gestao-dispositivos') || true,
      icon: Smartphone,
    },
    {
      title: 'Suporte Prioritário & Ao Vivo',
      description: 'Atendimento técnico dedicado com prioridade na resolução de dúvidas e incidentes.',
      included: permissions?.enabledFeatures?.includes('priority-support') || permissions?.enabledFeatures?.includes('suporte-ao-vivo') || false,
      icon: ShieldCheck,
    },
  ];

  const planName = permissions?.planName || panelUser?.planName || 'Plano Básico';
  const planMonthlyLimit = permissions?.monthlyContentLimit !== undefined 
    ? (permissions.monthlyContentLimit === -1 ? 'Ilimitado' : permissions.monthlyContentLimit.toLocaleString('pt-BR'))
    : '5.000';

  const isLoading = permissionsLoading || panelLoading || baserowLoading;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Header com Boas-Vindas e Ações */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" />
              Status do Plano & Assinatura
            </h1>
            <StatusIndicatorBadge daysRemaining={panelStats.daysRemaining} isExpired={panelStats.isExpired} size="md" />
          </div>
          <p className="text-sm text-muted-foreground">
            Acompanhe a validade dos seus dias restantes no Painel e no Baserow, recursos liberados e benefícios ativos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshAll} 
            disabled={isRefreshing}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/planos')}
            className="gap-1.5 h-9"
          >
            <Layers className="h-4 w-4" />
            <span>Ver Planos</span>
          </Button>

          <Button 
            size="sm" 
            onClick={() => navigate('/precos')}
            className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <CreditCard className="h-4 w-4" />
            <span>Renovar / Upgrade</span>
          </Button>
        </div>
      </div>

      {/* Card Principal: Resumo do Plano Ativo */}
      <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Zap className="w-48 h-48 text-primary" />
        </div>

        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Plano Atual Contratado</span>
                <StatusIndicatorBadge daysRemaining={panelStats.daysRemaining} isExpired={panelStats.isExpired} size="sm" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2.5">
                {planName}
                <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-primary/30 font-medium">
                  {panelStats.isExpired ? 'Necessita Renovação' : 'Assinatura Ativa'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Conta: <span className="font-medium text-foreground">{userInfo?.email || 'usuário autenticado'}</span>
              </CardDescription>
            </div>

            <div className="flex flex-col sm:items-end">
              <span className="text-xs text-muted-foreground">Limite de Conteúdo Mensal</span>
              <span className="text-xl font-bold text-foreground">{planMonthlyLimit} itens</span>
              <span className="text-xs text-muted-foreground mt-0.5">
                Uso no ciclo: <strong className="text-foreground">{permissions?.currentMonthUsage || 0}</strong> adicionados
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-6 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Data de Ativação</span>
            </div>
            <p className="text-base font-semibold text-foreground">{panelStats.startDate}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>Data de Vencimento</span>
            </div>
            <p className="text-base font-semibold text-foreground">{panelStats.expiryDate}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Funcionalidades Ativas</span>
            </div>
            <p className="text-base font-semibold text-foreground">
              {activeFeaturesCount} <span className="text-xs text-muted-foreground font-normal">/ {totalFeatures}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <User className="h-3.5 w-3.5 text-primary" />
              <span>Total de Acessos</span>
            </div>
            <p className="text-base font-semibold text-foreground">{panelUser?.totalLogins || userInfo?.totalLogins || 1} logins</p>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 1: BARRAS DE PROGRESSO DOS DIAS RESTANTES (PAINEL E BASEROW) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Dias Restantes da Assinatura</h2>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs w-fit">
            Plano Unificado • Painel + Baserow Inclusos no Mesmo Ciclo
          </Badge>
        </div>

        {/* Guia Visual das Badges Coloridas de Status */}
        <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>Indicadores de Status baseados nos Dias Restantes:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <StatusIndicatorBadge daysRemaining={15} size="sm" />
              <span className="text-[11px] text-muted-foreground">&gt; 5 dias</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusIndicatorBadge daysRemaining={3} size="sm" />
              <span className="text-[11px] text-muted-foreground">≤ 5 dias</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusIndicatorBadge daysRemaining={0} isExpired size="sm" />
              <span className="text-[11px] text-muted-foreground">0 dias</span>
            </div>
          </div>
        </div>

        {/* Banner Explicativo de Plano Unificado */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <strong className="text-foreground">Sincronização Total do Plano: </strong>
            O banco de dados <strong>Baserow</strong> faz parte integrante do seu plano ativo (ex: assinaturas de R$ 35,00 ou R$ 44,99 já incluem o Painel e o Baserow juntos). A contagem de dias restantes é 100% compartilhada.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CARD 1: DIAS RESTANTES DO PAINEL */}
          <Card className="border-border/60 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Painel de Gerenciamento</CardTitle>
                    <CardDescription className="text-xs">Acesso web e gestão de conteúdos</CardDescription>
                  </div>
                </div>
                <StatusIndicatorBadge daysRemaining={panelStats.daysRemaining} isExpired={panelStats.isExpired} size="md" />
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Destaque numérico dos dias */}
              <div className="flex items-baseline justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Tempo Restante no Painel</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-4xl font-extrabold ${panelStats.isExpired ? 'text-destructive' : panelStats.isWarning ? 'text-amber-500' : 'text-primary'}`}>
                      {panelStats.daysRemaining}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {panelStats.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground block mb-0.5">Ciclo Contratado</span>
                  <span className="text-lg font-semibold text-foreground">
                    {panelStats.totalDays} dias
                  </span>
                </div>
              </div>

              {/* Barra de Progresso do Painel */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Progresso do Período</span>
                  <span className={panelStats.isExpired ? 'text-destructive' : panelStats.isWarning ? 'text-amber-500' : 'text-emerald-500'}>
                    {panelStats.percentage}% restante ({panelStats.daysUsed} dias usados)
                  </span>
                </div>

                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border/40">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      panelStats.isExpired 
                        ? 'bg-destructive' 
                        : panelStats.isWarning 
                          ? 'bg-amber-500' 
                          : 'bg-gradient-to-r from-emerald-500 to-primary'
                    }`}
                    style={{ width: `${Math.max(5, panelStats.percentage)}%` }}
                  />
                </div>
              </div>

              {/* Detalhes de datas */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40 text-muted-foreground">
                <div>
                  <span>Início: </span>
                  <strong className="text-foreground">{panelStats.startDate}</strong>
                </div>
                <div className="text-right">
                  <span>Vencimento: </span>
                  <strong className="text-foreground">{panelStats.expiryDate}</strong>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-4 border-t border-border/30">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2 text-xs" 
                onClick={() => navigate('/precos')}
              >
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span>Renovar Plano (Painel + Baserow)</span>
              </Button>
            </CardFooter>
          </Card>

          {/* CARD 2: DIAS RESTANTES DO BASEROW */}
          <Card className="border-border/60 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-lg font-bold">Instância Baserow</CardTitle>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5">
                        Incluso no Plano
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">Sincronizado com o ciclo da assinatura</CardDescription>
                  </div>
                </div>
                <StatusIndicatorBadge daysRemaining={baserowStats.daysRemaining} isExpired={baserowStats.isExpired} size="md" />
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Destaque numérico dos dias */}
              <div className="flex items-baseline justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Tempo Restante Baserow</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-4xl font-extrabold ${baserowStats.isExpired ? 'text-destructive' : baserowStats.isWarning ? 'text-amber-500' : 'text-orange-500'}`}>
                      {baserowStats.daysRemaining}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {baserowStats.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground block mb-0.5">Ciclo Contratado</span>
                  <span className="text-lg font-semibold text-foreground">
                    {baserowStats.totalDays} dias
                  </span>
                </div>
              </div>

              {/* Barra de Progresso do Baserow */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Progresso do Período</span>
                  <span className={baserowStats.isExpired ? 'text-destructive' : baserowStats.isWarning ? 'text-amber-500' : 'text-emerald-500'}>
                    {baserowStats.percentage}% restante ({baserowStats.daysUsed} dias usados)
                  </span>
                </div>

                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border/40">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      baserowStats.isExpired 
                        ? 'bg-destructive' 
                        : baserowStats.isWarning 
                          ? 'bg-amber-500' 
                          : 'bg-gradient-to-r from-orange-500 to-amber-500'
                    }`}
                    style={{ width: `${Math.max(5, baserowStats.percentage)}%` }}
                  />
                </div>
              </div>

              {/* Detalhes de datas */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40 text-muted-foreground">
                <div>
                  <span>Início: </span>
                  <strong className="text-foreground">{baserowStats.paymentDate}</strong>
                </div>
                <div className="text-right">
                  <span>Vencimento: </span>
                  <strong className="text-foreground">{baserowStats.expiryDate !== 'N/A' ? baserowStats.expiryDate : panelStats.expiryDate}</strong>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-4 border-t border-border/30 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-1.5 text-xs" 
                onClick={() => navigate('/configuracoes')}
              >
                <Database className="h-3.5 w-3.5 text-orange-500" />
                <span>Configurar</span>
              </Button>
              <Button 
                size="sm" 
                className="flex-1 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" 
                onClick={() => navigate('/precos')}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Renovar Plano</span>
              </Button>
            </CardFooter>
          </Card>

        </div>
      </div>

      {/* SEÇÃO 2: BENEFÍCIOS DO PLANO ATIVO */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Benefícios Inclusos no seu Plano</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-primary gap-1"
            onClick={() => navigate('/precos')}
          >
            <span>Ver tabela comparativa</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {planBenefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <Card 
                key={idx} 
                className={`border transition-all ${
                  benefit.included 
                    ? 'border-border/60 bg-card hover:border-primary/40' 
                    : 'border-border/30 bg-muted/20 opacity-75'
                }`}
              >
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2 rounded-lg ${benefit.included ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge variant={benefit.included ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5">
                      {benefit.included ? 'Incluso' : 'Upgrade'}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{benefit.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{benefit.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 3: FUNCIONALIDADES DO SISTEMA (OCULTO POR PADRÃO COM BOTÃO PARA EXPANDIR) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Funcionalidades do Sistema</h2>
              <p className="text-xs text-muted-foreground">Consulte os módulos e recursos liberados ou restritos na sua conta</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* KPI Ativas */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{activeFeaturesCount} Ativas ({activePercentage}%)</span>
            </div>

            {/* KPI Bloqueadas */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold">
              <Lock className="h-3.5 w-3.5" />
              <span>{blockedFeaturesCount} Bloqueadas</span>
            </div>

            {/* Botão de Expandir / Ocultar */}
            <Button
              variant={isFeaturesExpanded ? "outline" : "default"}
              size="sm"
              onClick={() => setIsFeaturesExpanded(prev => !prev)}
              className={`gap-1.5 text-xs h-8 px-3 font-semibold transition-all ${
                !isFeaturesExpanded 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs' 
                  : 'bg-card border-border/80 hover:bg-muted/80'
              }`}
            >
              {isFeaturesExpanded ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Ocultar Funcionalidades</span>
                  <ChevronUp className="h-3.5 w-3.5 ml-0.5" />
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Expandir Funcionalidades ({totalFeatures})</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Resumo compacto quando OCULTO */}
        {!isFeaturesExpanded ? (
          <Card className="border border-border/60 bg-card/60 hover:bg-card transition-all p-4 rounded-xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between text-xs max-w-md">
                  <span className="text-muted-foreground font-medium">
                    Cobertura de Recursos: <strong className="text-foreground">{activeFeaturesCount} de {totalFeatures} liberados</strong>
                  </span>
                  <span className="font-bold text-emerald-500">{activePercentage}% Ativo</span>
                </div>
                <div className="h-2 w-full max-w-md bg-secondary rounded-full overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${activePercentage}%` }} 
                  />
                  <div 
                    className="bg-amber-500/40 h-full transition-all duration-500" 
                    style={{ width: `${100 - activePercentage}%` }} 
                  />
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFeaturesExpanded(true)}
                className="gap-1.5 text-xs self-start sm:self-auto border-primary/30 text-primary hover:bg-primary/10"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Ver todas as {totalFeatures} funcionalidades</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ) : (
          /* Visualização COMPLETA quando EXPANDIDO */
          <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
            {/* Barra de Distribuição de Funcionalidades */}
            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">
                  Cobertura de Recursos do Painel: <strong>{activeFeaturesCount} de {totalFeatures} ativas</strong>
                </span>
                <span className="font-bold text-foreground">{activePercentage}% Liberado</span>
              </div>

              <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${activePercentage}%` }} 
                  title={`${activeFeaturesCount} Ativas`}
                />
                <div 
                  className="bg-amber-500/40 h-full transition-all duration-500" 
                  style={{ width: `${100 - activePercentage}%` }} 
                  title={`${blockedFeaturesCount} Bloqueadas`}
                />
              </div>
            </div>

            {/* Filtros e Busca de Funcionalidades */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar funcionalidade por nome ou descrição..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              {/* Filtro de Status */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/40">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="h-8 text-xs px-3"
                >
                  Todas ({totalFeatures})
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  className="h-8 text-xs px-3 text-emerald-500 hover:text-emerald-600"
                >
                  Ativas ({activeFeaturesCount})
                </Button>
                <Button
                  variant={statusFilter === 'blocked' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('blocked')}
                  className="h-8 text-xs px-3 text-amber-500 hover:text-amber-600"
                >
                  Bloqueadas ({blockedFeaturesCount})
                </Button>
              </div>
            </div>

            {/* Chips de Categorias */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    categoryFilter === cat
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30'
                  }`}
                >
                  {cat === 'all' ? 'Todas as Categorias' : cat}
                </button>
              ))}
            </div>

            {/* Grade de Funcionalidades */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {filteredFeatures.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <SlidersHorizontal className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-base font-medium">Nenhuma funcionalidade encontrada</p>
                  <p className="text-xs">Tente ajustar seus termos de busca ou filtros selecionados.</p>
                </div>
              ) : (
                filteredFeatures.map((feat) => (
                  <Card 
                    key={feat.id}
                    className={`border transition-all duration-200 ${
                      feat.isActive 
                        ? 'border-emerald-500/20 bg-card hover:border-emerald-500/40 shadow-xs' 
                        : 'border-amber-500/20 bg-muted/15 hover:border-amber-500/40'
                    }`}
                  >
                    <CardContent className="p-4 flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                            {feat.category}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-foreground truncate">{feat.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {feat.isActive ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-medium gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-medium gap-1">
                            <Lock className="h-3 w-3" />
                            Bloqueada
                          </Badge>
                        )}

                        {!feat.isActive && (
                          <button 
                            onClick={() => navigate('/precos')}
                            className="text-[10px] text-primary hover:underline font-medium mt-1"
                          >
                            Desbloquear →
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Botão de Recolher no rodapé da lista */}
            <div className="pt-2 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFeaturesExpanded(false)}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span>Ocultar Lista de Funcionalidades</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Banner de Upgrade / Renovação no rodapé */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Precisa desbloquear mais funcionalidades ou renovar seus dias?
            </h3>
            <p className="text-sm text-muted-foreground">
              Aumente o limite de conteúdos, libere automações agendadas e tenha suporte técnico prioritário para a sua operação.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate('/precos')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-sm gap-2"
            >
              <CreditCard className="h-4 w-4" />
              <span>Ver Opções de Renovação</span>
            </Button>
          </div>
        </div>
      </Card>

    </div>
  );
};

export default Status;
