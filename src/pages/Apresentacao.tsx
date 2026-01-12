
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  CreditCard
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
    }
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
              TV ao vivo, sistema de usuários, métricas avançadas e ferramentas de administração.
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
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="modern-card hover-lift">
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
          
          <div className="grid lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="modern-card">
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
              Transforme a gestão do seu conteúdo digital com nossa plataforma profissional
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
            © 2024 Sistema de Gestão de Mídia Digital. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Apresentacao;
