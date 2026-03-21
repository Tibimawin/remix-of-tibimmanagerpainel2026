
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Users, 
  Shield, 
  BarChart3, 
  Zap, 
  Globe, 
  CheckCircle,
  ArrowRight,
  Play,
  Settings,
  Database,
  Activity,
  CreditCard,
  Code2,
  Webhook,
  Lock
} from 'lucide-react';

const Apresentacao = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Monitor,
      title: "Dashboard Completo",
      description: "Painel principal com métricas em tempo real de conteúdos, usuários e sistema"
    },
    {
      icon: Users,
      title: "Gestão de Usuários",
      description: "Controle total de usuários, permissões, planos e monitoramento de atividades"
    },
    {
      icon: Shield,
      title: "Central de Segurança",
      description: "Sistema de autenticação avançado, logs de atividade e controle de acesso"
    },
    {
      icon: BarChart3,
      title: "Relatórios Visuais",
      description: "Estatísticas detalhadas, métricas de engajamento e análise de visualizações"
    },
    {
      icon: Zap,
      title: "Automação Inteligente",
      description: "Importação automática M3U, IA para otimização e ferramentas automatizadas"
    },
    {
      icon: Globe,
      title: "Gestão de Conteúdo",
      description: "Catálogo completo de filmes, séries, TV, episódios e banners organizados"
    },
    {
      icon: Code2,
      title: "Integração API",
      description: "API REST completa para integrar seu catálogo em sites e apps externos",
      isNew: true
    },
    {
      icon: Webhook,
      title: "Chaves de API Seguras",
      description: "Gere até 3 chaves, controle endpoints permitidos e monitore uso em tempo real",
      isNew: true
    }
  ];

  const services = [
    {
      icon: Database,
      title: "Catálogo de Mídia",
      items: ["Filmes e Séries", "Canais de TV", "Episódios", "Banners e Categorias", "Plataformas de Streaming"]
    },
    {
      icon: Activity,
      title: "Monitoramento Avançado",
      items: ["Logs do Sistema", "Atividades de Usuários", "Sessões Ativas", "Métricas de Engajamento", "Análise de Visualizações"]
    },
    {
      icon: Settings,
      title: "Administração Total",
      items: ["Configurações do Sistema", "Importação M3U", "Ferramentas de IA", "Controle de Preços", "Ofertas e Planos"]
    },
    {
      icon: Code2,
      title: "API & Integrações",
      items: ["API REST pública", "Documentação interativa", "Dashboard de uso", "Chaves com rate limit", "Suporte a paginação"],
      isNew: true
    }
  ];

  const apiHighlights = [
    { icon: Code2, label: "API REST", desc: "Endpoints para conteúdos, episódios, categorias e busca" },
    { icon: Lock, label: "Autenticação por Chave", desc: "Chaves seguras com prefixo pk_live_ e rate limiting" },
    { icon: BarChart3, label: "Dashboard de Uso", desc: "Monitore requisições, limites e status em tempo real" },
    { icon: Webhook, label: "Integração Simples", desc: "Integre seu catálogo em qualquer site ou app em minutos" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5"></div>
        <div className="relative container mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 modern-badge">
              <Zap className="w-3 h-3 mr-1" />
              Sistema Profissional de Gestão
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Painel de
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {" "}Gestão{" "}
              </span>
              de Mídia
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Plataforma completa para gestão de conteúdo digital com catálogo de filmes, séries, 
              TV ao vivo, sistema de usuários, métricas avançadas, ferramentas de administração 
              e <strong className="text-foreground">API de integração</strong> para conectar seu catálogo a qualquer sistema.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="modern-button px-8 py-4 text-lg"
                onClick={() => navigate('/login')}
              >
                <Play className="w-5 h-5 mr-2" />
                Acessar Painel
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-4 text-lg"
                onClick={() => navigate('/precos-publico')}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Ver Planos e Preços
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Funcionalidades Principais
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Desenvolvido com tecnologias modernas para oferecer controle total do seu negócio digital
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="modern-card hover-lift relative">
                {feature.isNew && (
                  <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground animate-pulse text-xs px-2 py-0.5">
                    NOVO
                  </Badge>
                )}
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* API Highlight Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 via-background to-primary/10 border-y border-border">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 animate-pulse">
              <Code2 className="w-3 h-3 mr-1" />
              NOVO — Integração API
            </Badge>
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Conecte seu catálogo a qualquer sistema
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Com a API REST do painel, você integra filmes, séries, episódios e categorias 
              diretamente no seu site, app ou sistema externo com apenas uma chave de acesso.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {apiHighlights.map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 max-w-2xl mx-auto bg-card border border-border rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-3 font-medium">Exemplo de uso:</p>
            <pre className="bg-muted/50 rounded-lg p-4 text-sm text-foreground overflow-x-auto font-mono">
{`GET /api/public-api?endpoint=conteudos&page=1
Header: X-API-Key: pk_live_sua_chave_aqui

Resposta: { results: [...], count: 150, next: "?page=2" }`}
            </pre>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Módulos Disponíveis
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sistema completo com todas as ferramentas necessárias para sua operação
            </p>
          </div>
          
          <div className="grid lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="modern-card relative">
                {service.isNew && (
                  <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground animate-pulse text-xs px-2 py-0.5">
                    NOVO
                  </Badge>
                )}
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center mb-4">
                    <service.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-foreground text-xl">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-foreground mb-6">
              Comece sua jornada hoje mesmo
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Transforme a gestão do seu conteúdo digital com nossa plataforma profissional.
              Agora com <strong className="text-foreground">API de integração</strong> para expandir seu alcance.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="modern-button px-8 py-4 text-lg"
                onClick={() => navigate('/login')}
              >
                Entrar no Sistema
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} Sistema de Gestão de Mídia Digital. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Apresentacao;
