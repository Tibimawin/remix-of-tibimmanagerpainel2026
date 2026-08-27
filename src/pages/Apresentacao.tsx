
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Users, 
  Shield, 
  BarChart3, 
  Zap, 
  Globe, 
  CheckCircle2,
  ArrowRight,
  Play,
  Settings,
  Database,
  CreditCard,
  Code2,
  Webhook,
  Lock,
  Tv,
  Film,
  Layers,
  Sparkles,
  Server,
  ChevronRight,
  Radio,
  Clock,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

const Apresentacao = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'catalog' | 'm3u' | 'api' | 'security'>('catalog');
  const [copiedCode, setCopiedCode] = useState(false);

  const features = [
    {
      icon: Monitor,
      title: "Dashboard Centralizado",
      tag: "Tempo Real",
      description: "Métricas completas de conteúdos, usuários ativos, consumo de API e integridade do sistema."
    },
    {
      icon: Film,
      title: "Catálogo Completo",
      tag: "Filmes & Séries",
      description: "Organização avançada com capas em HD, sinopses TMDB, temporadas, episódios e trailers."
    },
    {
      icon: Tv,
      title: "Canais de TV Dedicados",
      tag: "Modo Tibim",
      description: "Separação inteligente de transmissões ao vivo com suporte a links protegidos e categorias TV."
    },
    {
      icon: Zap,
      title: "Importador M3U Inteligente",
      tag: "Automação",
      description: "Upload de arquivos ou conexão direta Xtream Codes com deduplicação e enriquecimento de metadados."
    },
    {
      icon: Code2,
      title: "API REST & Integrações",
      tag: "Para Desenvolvedores",
      description: "Endpoints públicos e seguros para conectar seu catálogo a qualquer player, site ou app móvel.",
      isNew: true
    },
    {
      icon: Shield,
      title: "Cloak & Segurança",
      tag: "Anti-Bloqueio",
      description: "Proteção de URLs, camuflagem inteligente e controle rigoroso de sessões e dispositivos por IMEI."
    },
    {
      icon: Users,
      title: "Gestão de Clientes",
      tag: "Acessos & Planos",
      description: "Controle de assinaturas, vencimentos, limite de telas simultâneas e renovações automáticas."
    },
    {
      icon: BarChart3,
      title: "Relatórios & Logs",
      tag: "Auditoria",
      description: "Histórico detalhado de reproduções, requisições de API e ações administrativas com reversão."
    }
  ];

  const modules = [
    {
      icon: Database,
      title: "Catálogo de Conteúdo",
      accent: "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30",
      items: [
        "Filmes, Séries e Minisséries",
        "Canais de TV Ao Vivo",
        "Episódios organizados por temporada",
        "Banners, Destaques e Novelas",
        "Categorias Animes e Doramas"
      ]
    },
    {
      icon: Zap,
      title: "Importação & Sincronia",
      accent: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
      items: [
        "Parser M3U & M3U8 em lote",
        "Conexão Xtream Codes / DNS",
        "Auto-enriquecimento TMDB",
        "Verificação anti-duplicados",
        "Modos: Tibim, Plural e Thiago"
      ]
    },
    {
      icon: Code2,
      title: "API & Conectividade",
      accent: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
      isNew: true,
      items: [
        "API REST ultra-rápida",
        "Chaves seguras com rate limit",
        "Suporte a paginação e filtros",
        "Documentação interativa",
        "Compatível com qualquer player"
      ]
    },
    {
      icon: Shield,
      title: "Segurança & Finanças",
      accent: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
      items: [
        "Links protegidos com expiração",
        "Camuflagem Cloak anti-bloqueio",
        "Integração Asaas / PIX",
        "Controle de dispositivos por IMEI",
        "Notificações Push instantâneas"
      ]
    }
  ];

  const apiCodeExample = `curl -X GET "https://tibimmanagerpainel.shop/api/public-api?endpoint=conteudos&tipo=Filme&page=1" \\
  -H "X-API-Key: pk_live_seu_token_aqui" \\
  -H "Accept: application/json"`;

  const copyCode = () => {
    navigator.clipboard.writeText(apiCodeExample);
    setCopiedCode(true);
    toast.success("Comando copiado para a área de transferência!");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-primary/20 text-white font-bold text-lg">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight flex items-center gap-1.5">
                Tibim <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Manager</span>
              </span>
              <span className="text-[10px] block uppercase tracking-widest text-muted-foreground font-medium -mt-1">
                Gestão de Mídia & Streaming
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#modulos" className="hover:text-foreground transition-colors">Módulos</a>
            <a href="#api" className="hover:text-foreground transition-colors flex items-center gap-1">
              API REST <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-0">Novo</Badge>
            </a>
            <button onClick={() => navigate('/precos-publico')} className="hover:text-foreground transition-colors">
              Planos & Preços
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/login')}
              className="text-muted-foreground hover:text-foreground font-medium"
            >
              Entrar
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate('/precos-publico')}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 font-medium"
            >
              Começar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-orange-500/15 via-primary/10 to-amber-500/20 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/80 border border-border/80 shadow-sm backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-ping" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plataforma Profissional • v3.0
              </span>
              <span className="text-xs font-medium text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                Modo Tibim + API
              </span>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Painel de{" "}
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                Gestão
              </span>{" "}
              de Mídia
            </h1>
            
            {/* Description */}
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Plataforma completa para controle de streaming, catálogo de filmes, séries, 
              canais de TV ao vivo com separação automática, importação inteligente M3U 
              e <strong className="text-foreground font-semibold">API REST integrada</strong> para alimentar qualquer aplicativo.
            </p>
            
            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => navigate('/login')}
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                Acessar Painel
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto h-12 px-8 text-base font-semibold border-border hover:border-orange-500/50 hover:bg-secondary/60 transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => navigate('/precos-publico')}
              >
                <CreditCard className="w-4 h-4 mr-2 text-orange-400" />
                Ver Planos e Preços
              </Button>
            </div>

            {/* Micro Highlights */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card/40 border border-border/50 backdrop-blur-sm">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Importador M3U Inteligente</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card/40 border border-border/50 backdrop-blur-sm">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Canais TV no Modo Tibim</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card/40 border border-border/50 backdrop-blur-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">API REST Pública Ativa</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card/40 border border-border/50 backdrop-blur-sm">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Segurança Cloak Anti-Block</span>
              </div>
            </div>

          </div>

          {/* Interactive Live Preview Box */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
              
              {/* Window Bar */}
              <div className="px-4 py-3 border-b border-border/60 bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-xs font-mono text-muted-foreground ml-2 hidden sm:inline">
                    tibimmanager.shop/painel
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-lg border border-border/50 text-xs font-medium">
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      activeTab === 'catalog' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Catálogo
                  </button>
                  <button
                    onClick={() => setActiveTab('m3u')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      activeTab === 'm3u' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    M3U & TV
                  </button>
                  <button
                    onClick={() => setActiveTab('api')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      activeTab === 'api' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    API REST
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      activeTab === 'security' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Segurança
                  </button>
                </div>
              </div>

              {/* Dynamic Tab Content Preview */}
              <div className="p-6 md:p-8">
                {activeTab === 'catalog' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                        <span className="text-xs text-muted-foreground font-medium">Filmes no Catálogo</span>
                        <p className="text-2xl font-bold text-foreground mt-1">14.850</p>
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> TMDB HD integrado
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                        <span className="text-xs text-muted-foreground font-medium">Séries & Episódios</span>
                        <p className="text-2xl font-bold text-foreground mt-1">3.420</p>
                        <span className="text-[11px] text-blue-400 flex items-center gap-1 mt-0.5">
                          <Layers className="w-3 h-3" /> Temporadas indexadas
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                        <span className="text-xs text-muted-foreground font-medium">Canais de TV</span>
                        <p className="text-2xl font-bold text-orange-400 mt-1">1.890</p>
                        <span className="text-[11px] text-orange-400/90 flex items-center gap-1 mt-0.5">
                          <Radio className="w-3 h-3" /> Modo Tibim Ativo
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                        <span className="text-xs text-muted-foreground font-medium">Usuários Ativos</span>
                        <p className="text-2xl font-bold text-purple-400 mt-1">840</p>
                        <span className="text-[11px] text-purple-400/90 flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3" /> Monitoramento IMEI
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-orange-500/20 text-orange-400">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">Metadados e Enriquecimento Automático</h4>
                          <p className="text-xs text-muted-foreground">Posters 4K, notas IMDB, atores, elenco, sinopses e categorias geradas dinamicamente.</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => navigate('/login')} className="shrink-0 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30">
                        Acessar Catálogo
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'm3u' && (
                  <div className="space-y-4">
                    <div className="p-5 rounded-xl bg-secondary/40 border border-border/60 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="space-y-2 max-w-lg">
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          Novo no Modo Tibim
                        </Badge>
                        <h3 className="text-lg font-bold text-foreground">Separação Automática de Canais de TV</h3>
                        <p className="text-sm text-muted-foreground">
                          Ao importar listas M3U ou conectar servidores Xtream Codes, os Canais de TV são enviados para a tabela dedicada <strong>Canais TV</strong>, mantendo Filmes e Séries em <strong>Conteúdos</strong>.
                        </p>
                      </div>
                      <div className="w-full md:w-auto p-4 rounded-lg bg-background/80 border border-border/80 space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between gap-4 text-emerald-400">
                          <span>✓ Filmes & Séries</span>
                          <span className="text-muted-foreground">→ Tabela Conteúdos</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-orange-400">
                          <span>✓ Canais Ao Vivo</span>
                          <span className="text-muted-foreground">→ Tabela Canais TV</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-blue-400">
                          <span>✓ Anti-Duplicados</span>
                          <span className="text-muted-foreground">→ Verificação Ativa</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'api' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-card border border-border/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-primary" /> Exemplo de Requisição REST
                        </span>
                        <Button variant="ghost" size="sm" onClick={copyCode} className="h-7 text-xs gap-1.5">
                          {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedCode ? "Copiado" : "Copiar"}
                        </Button>
                      </div>
                      <pre className="p-3.5 rounded-lg bg-black/50 text-xs font-mono text-orange-200 overflow-x-auto">
                        {apiCodeExample}
                      </pre>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                      <Lock className="w-6 h-6 text-emerald-400 mb-2" />
                      <h4 className="font-semibold text-sm text-foreground">Cloak Anti-Bloqueio</h4>
                      <p className="text-xs text-muted-foreground mt-1">Protege links de streaming contra detecção e banimentos de IP.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                      <Shield className="w-6 h-6 text-blue-400 mb-2" />
                      <h4 className="font-semibold text-sm text-foreground">Trava por IMEI / Dispositivo</h4>
                      <p className="text-xs text-muted-foreground mt-1">Garante que cada cliente utilize estritamente as telas contratadas.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/40 border border-border/50">
                      <Webhook className="w-6 h-6 text-purple-400 mb-2" />
                      <h4 className="font-semibold text-sm text-foreground">Chaves com Rate Limit</h4>
                      <p className="text-xs text-muted-foreground mt-1">Geração de tokens com limites de requisição por minuto e expiração.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Features Grid Section */}
      <section id="funcionalidades" className="py-20 px-4 sm:px-6 border-t border-border/40 bg-secondary/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <Badge className="bg-primary/15 text-primary border-primary/20">
              Controle Total
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Funcionalidades Principais
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Construído com tecnologia de ponta para fornecer alta velocidade, automação e segurança no gerenciamento do seu negócio de mídia.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, index) => (
              <Card key={index} className="group relative bg-card/70 border-border/70 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/10 to-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-orange-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground/80 bg-secondary px-2 py-0.5 rounded-md border border-border/50">
                      {feature.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Deep Dive */}
      <section id="modulos" className="py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20">
              Arquitetura Modular
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Módulos do Sistema
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Tudo o que você precisa em uma única plataforma integrada e sincronizada.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((mod, index) => (
              <div 
                key={index}
                className="rounded-2xl bg-card border border-border/80 p-6 flex flex-col justify-between hover:border-primary/40 transition-all shadow-sm"
              >
                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.accent} flex items-center justify-center border`}>
                    <mod.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-foreground">{mod.title}</h3>
                      {mod.isNew && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] py-0 px-1.5">
                          Novo
                        </Badge>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-2">
                    {mod.items.map((item, i) => (
                      <li key={i} className="flex items-start text-xs text-muted-foreground leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-2 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Integration Section */}
      <section id="api" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-primary/5 via-background to-background border-y border-border/40">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Code2 className="w-3 h-3 mr-1" /> API REST Integrada
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Conecte seu catálogo em qualquer lugar
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Disponibilize seus filmes, séries e canais em sites WordPress, aplicativos Android, TV Box ou players personalizados através de endpoints ultra-rápidos com autenticação por chave.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground">Geração Instantânea</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Crie até 3 chaves de API personalizadas no painel, definindo nomes, limites de requisição e status ativo/bloqueado.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground">Endpoints Filtrados</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Acesse <code className="text-primary font-mono text-[11px]">/conteudos</code>, <code className="text-primary font-mono text-[11px]">/canais</code>, <code className="text-primary font-mono text-[11px]">/episodios</code> com paginação, busca e filtros de categoria.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-foreground">Rate Limiting & Logs</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Monitore em tempo real as chamadas realizadas, requisições por minuto e bloqueie chaves suspeitas automaticamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-4xl text-center space-y-6 relative">
          <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20">
            Pronto para começar?
          </Badge>
          
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
            Eleve o nível da gestão do seu catálogo de streaming
          </h2>
          
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Junte-se aos operadores que utilizam o Painel de Gestão de Mídia para automatizar importações, proteger links e expandir via API.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/20"
              onClick={() => navigate('/login')}
            >
              Entrar no Painel
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-12 px-8 text-base font-semibold border-border hover:bg-secondary/60"
              onClick={() => navigate('/precos-publico')}
            >
              Ver Planos e Ofertas
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 border-t border-border/40 bg-card/30 text-xs text-muted-foreground">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-orange-400" />
            <span className="font-bold text-foreground">Tibim Manager</span>
            <span>— Sistema de Gestão de Mídia Digital</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/precos-publico')} className="hover:text-foreground transition-colors">
              Planos & Preços
            </button>
            <button onClick={() => navigate('/login')} className="hover:text-foreground transition-colors">
              Login
            </button>
            <button onClick={() => navigate('/cadastro')} className="hover:text-foreground transition-colors">
              Criar Conta
            </button>
          </div>

          <p>© {new Date().getFullYear()} Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  );
};

export default Apresentacao;

