import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  Crown, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Tv, 
  Zap, 
  Sparkles, 
  CheckCircle2, 
  Server, 
  Layers, 
  Lock, 
  UserPlus
} from 'lucide-react';
import { Plan, AVAILABLE_FEATURES } from '@/types/planTypes';
import { useActivePlan } from '@/hooks/useActivePlan';
import { usePlans } from '@/hooks/usePlans';

// Fallback plans if none are in Firestore yet
const DEFAULT_FALLBACK_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Básico',
    price: 'R$ 29,90/mês',
    description: 'Ideal para uso pessoal e testes',
    monthlyContentLimit: 5000,
    features: ['dashboard', 'conteudos', 'lista-m3u', 'categorias'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pro',
    name: 'Profissional',
    price: 'R$ 59,90/mês',
    description: 'Mais popular • Recursos avançados & API',
    monthlyContentLimit: 25000,
    features: ['dashboard', 'conteudos', 'episodios', 'lista-m3u', 'banners', 'categorias', 'categorias-tv', 'api-access', 'ferramentas-ia'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'enterprise',
    name: 'Empresa / Ilimitado',
    price: 'R$ 99,90/mês',
    description: 'Para revendedores e grandes operações',
    monthlyContentLimit: -1,
    features: ['dashboard', 'conteudos', 'episodios', 'lista-m3u', 'banners', 'categorias', 'categorias-tv', 'categorias-anime', 'duplicados', 'ferramentas-ia', 'automacao', 'api-access', 'priority-support'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const PrecosPublico = () => {
  const navigate = useNavigate();
  const { activePlans, loading } = usePlans();
  const { hasActivePlan, loading: planLoading } = useActivePlan();

  const displayPlans = activePlans && activePlans.length > 0 ? activePlans : DEFAULT_FALLBACK_PLANS;

  const handleSelectPlan = (planId: string) => {
    // Redireciona diretamente para o cadastro com ativação imediata
    navigate(`/cadastro?plan=${encodeURIComponent(planId)}`);
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('empresa') || name.includes('ilimitado') || name.includes('master')) {
      return Crown;
    }
    if (name.includes('pro') || name.includes('profissional') || name.includes('premium')) {
      return Sparkles;
    }
    if (name.includes('básico') || name.includes('start') || name.includes('inicial')) {
      return Zap;
    }
    return ShieldCheck;
  };

  const getFeatureLabel = (featureId: string) => {
    const found = AVAILABLE_FEATURES.find(f => f.id === featureId);
    if (found) return found.name;
    
    // Custom friendly fallbacks
    const labels: Record<string, string> = {
      'import': 'Importação de M3U',
      'logs': 'Logs detalhados de acesso',
      'advanced-search': 'Busca avançada com filtros',
      'export': 'Exportação de catálogos',
      'ai-tools': 'Ferramentas de IA (TMDB)',
      'api-access': 'Acesso à API REST Pública',
      'priority-support': 'Suporte prioritário e suporte técnico'
    };

    return labels[featureId] || featureId.charAt(0).toUpperCase() + featureId.slice(1).replace(/-/g, ' ');
  };

  if (loading || planLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando planos e benefícios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-orange-500 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-orange-500/15 via-amber-500/10 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[600px] -left-32 w-80 h-80 bg-blue-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-20 -right-32 w-80 h-80 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Top Navigation Bar */}
      <header className="border-b border-border/40 backdrop-blur-md bg-background/70 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Início</span>
            </Button>

            <div className="h-4 w-[1px] bg-border/60 hidden sm:block" />

            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Tv className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight">
                Tibim <span className="text-orange-400">Manager</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground"
            >
              Fazer Login
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate('/cadastro')}
              className="text-xs sm:text-sm font-semibold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20"
            >
              Criar Conta Grátis
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-12 flex-1 space-y-16">
        
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tabela Oficial de Planos & Assinaturas</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Escolha o Plano Perfeito para o Seu{' '}
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 bg-clip-text text-transparent">
              Fluxo de Mídia
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Acesso completo ao Painel Tibim, proteção de streams anti-bloqueio, sincronização automática de dados e API REST de alta performance.
          </p>

          {/* Quick Perks */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/40 px-3 py-1 rounded-full border border-border/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sem taxa de adesão
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/40 px-3 py-1 rounded-full border border-border/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Ativação imediata no cadastro
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/40 px-3 py-1 rounded-full border border-border/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cancele quando quiser
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className={`grid grid-cols-1 ${displayPlans.length === 1 ? 'max-w-md mx-auto' : displayPlans.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'md:grid-cols-3 max-w-6xl mx-auto'} gap-6 items-stretch`}>
          {displayPlans.map((plan, index) => {
            const Icon = getPlanIcon(plan.name);
            const isPopular = (index === 1 && displayPlans.length >= 3) || plan.name.toLowerCase().includes('pro');
            const isCurrentPlan = hasActivePlan(plan.id);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative rounded-3xl transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-xl ${
                  isPopular 
                    ? 'border-orange-500/50 bg-gradient-to-b from-orange-500/10 via-card/80 to-card shadow-2xl shadow-orange-500/10 lg:-translate-y-2' 
                    : isCurrentPlan
                    ? 'border-primary/50 bg-primary/5 shadow-xl'
                    : 'border-border/70 bg-card/60 hover:border-border hover:bg-card/80 shadow-lg'
                }`}
              >
                {/* Popular / Current Ribbon */}
                {isPopular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider py-1 px-4 rounded-bl-xl shadow-md">
                      Mais Recomendado
                    </div>
                  </div>
                )}

                {isCurrentPlan && !isPopular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-wider py-1 px-4 rounded-bl-xl shadow-md">
                      Plano Atual
                    </div>
                  </div>
                )}

                <CardContent className="p-6 sm:p-8 flex flex-col justify-between h-full space-y-6">
                  
                  {/* Card Header Info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isPopular ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-secondary text-muted-foreground'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {plan.monthlyContentLimit === -1 ? (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          Ilimitado
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-lg border border-border/50">
                          {(plan.monthlyContentLimit ?? 0).toLocaleString()} itens
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {plan.description || 'Acesso aos recursos selecionados da plataforma.'}
                      </p>
                    </div>

                    {/* Price Block */}
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                          {plan.price}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Cobrança mensal recorrente • Cancele quando quiser
                      </p>
                    </div>
                  </div>

                  {/* Feature list */}
                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Recursos inclusos no plano:
                    </p>
                    
                    <ul className="space-y-2.5 text-xs text-muted-foreground">
                      {/* Standard Limit Feature */}
                      <li className="flex items-start gap-2.5 text-foreground font-medium">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>
                          {plan.monthlyContentLimit === -1 
                            ? 'Catálogo & conteúdos ilimitados' 
                            : plan.monthlyContentLimit === 0 
                            ? 'Acesso básico sem catálogo' 
                            : `Até ${(plan.monthlyContentLimit ?? 0).toLocaleString()} conteúdos no acervo`}
                        </span>
                      </li>

                      {/* Custom Features */}
                      {plan.features.slice(0, 6).map((featureId) => (
                        <li key={featureId} className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span>{getFeatureLabel(featureId)}</span>
                        </li>
                      ))}

                      {plan.features.length > 6 && (
                        <li className="flex items-center gap-2 text-[11px] text-orange-400 font-medium pt-1">
                          <span>+ {plan.features.length - 6} outros módulos inclusos</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-4 space-y-2">
                    <Button 
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`w-full h-11 text-sm font-semibold rounded-xl transition-all ${
                        isPopular
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25 hover:scale-[1.01]'
                          : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border/80'
                      }`}
                    >
                      {isCurrentPlan ? 'Plano Ativo' : 'Escolher este Plano'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <button
                      type="button"
                      onClick={() => navigate('/cadastro')}
                      className="w-full text-center text-[11px] text-muted-foreground hover:text-orange-400 transition-colors py-1"
                    >
                      Ou experimente grátis por 24h &rarr;
                    </button>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* How it Works / 3-Step Flow */}
        <div className="max-w-5xl mx-auto rounded-3xl border border-border/70 bg-secondary/20 p-6 sm:p-10 space-y-8 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Como funciona a contratação e acesso?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Processo simplificado em 3 passos para você começar em menos de 5 minutos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-card/60 border border-border/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h4 className="text-sm font-bold text-foreground">Escolha o seu Plano</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Selecione a categoria que melhor se adapta à quantidade de conteúdos e funcionalidades necessárias.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card/60 border border-border/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h4 className="text-sm font-bold text-foreground">Crie sua Conta</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cadastre seu email e senha para receber liberação imediata do painel e das ferramentas.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card/60 border border-border/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h4 className="text-sm font-bold text-foreground">Gerencie com o Modo Tibim</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gere seus links M3U criptografados, use a API REST e gerencie todo o catálogo em tempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Comparison Highlights */}
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Vantagens Exclusivas da Plataforma
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tudo o que você precisa para gerenciar e distribuir canais e acervos
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card/40 border border-border/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-foreground">Modo Tibim Anti-Bloqueio</h4>
              <p className="text-xs text-muted-foreground">URLs dinâmicas com proteção de token e headers de autenticação.</p>
            </div>

            <div className="p-4 rounded-2xl bg-card/40 border border-border/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-foreground">API REST Pública</h4>
              <p className="text-xs text-muted-foreground">Integre catálogos e canais com seu próprio app ou site externo.</p>
            </div>

            <div className="p-4 rounded-2xl bg-card/40 border border-border/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-foreground">Sincronização com TMDB</h4>
              <p className="text-xs text-muted-foreground">Metadados, sinopses, posters e elenco sincronizados automaticamente.</p>
            </div>

            <div className="p-4 rounded-2xl bg-card/40 border border-border/60 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-foreground">Alta Disponibilidade</h4>
              <p className="text-xs text-muted-foreground">Infraestrutura em nuvem otimizada para requisições contínuas.</p>
            </div>
          </div>
        </div>

        {/* Call to Action Banner */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 border border-orange-500/30 p-8 sm:p-12 text-center space-y-6">
          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Pronto para turbinar o gerenciamento da sua mídia?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Crie sua conta agora mesmo e tenha acesso a todas as ferramentas do painel em menos de 1 minuto.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => navigate('/cadastro')}
              className="h-11 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Começar Gratuitamente
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="h-11 px-6 rounded-xl border-border/80 text-foreground hover:bg-secondary/60 font-semibold"
            >
              Acessar Minha Conta
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-4 sm:px-6 mt-12 bg-background/50">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-orange-500/20 flex items-center justify-center text-orange-400">
              <Tv className="w-3 h-3" />
            </div>
            <span className="font-semibold text-foreground">Tibim Manager</span>
            <span>• Painel de Gestão de Mídia</span>
          </div>

          <p>© {new Date().getFullYear()} Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrecosPublico;

