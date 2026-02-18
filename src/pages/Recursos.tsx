
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Copy, Activity, Search, Bot, FileText, Link2 } from 'lucide-react';

const Recursos = () => {
  const navigate = useNavigate();

  const recursos = [
    {
      id: 'importar-m3u',
      title: 'Importar Lista M3U',
      description: 'Importe arquivos .m3u e transforme listas de conteúdo em registros do painel com apenas um clique. Perfeito para adicionar muitos filmes, séries ou canais de TV de forma rápida e automática.',
      icon: FileText,
      route: '/importar-m3u',
      color: 'text-blue-600'
    },
    {
      id: 'duplicados',
      title: 'Verificação de Duplicados',
      description: 'Encontre e gerencie conteúdos duplicados no painel.',
      icon: Copy,
      route: '/duplicados',
      color: 'text-orange-600'
    },
    {
      id: 'estatisticas',
      title: 'Estatísticas Avançadas',
      description: 'Visualize informações detalhadas sobre o uso de sua plataforma.',
      icon: Activity,
      route: '/estatisticas',
      color: 'text-purple-600'
    },
    {
      id: 'substituicao-urls',
      title: 'Substituição de URLs',
      description: 'Substitua partes das URLs em massa nas tabelas de Conteúdos e Episódios. Perfeito para migração de servidores ou mudança de estrutura de URLs.',
      icon: Link2,
      route: '/substituicao-urls',
      color: 'text-green-600'
    }
  ];

  const handleAccessResource = (route: string) => {
    navigate(route);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Recursos</h1>
        <p className="text-muted-foreground mt-2">
          Explore e acesse rapidamente as principais funcionalidades do painel administrativo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {recursos.map((recurso) => {
          const Icon = recurso.icon;
          
          return (
            <Card key={recurso.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${recurso.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base lg:text-lg leading-tight">
                      {recurso.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <CardDescription className="text-sm leading-relaxed">
                  {recurso.description}
                </CardDescription>
                <Button 
                  onClick={() => handleAccessResource(recurso.route)}
                  className="w-full"
                  size="sm"
                >
                  Acessar Recurso
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 lg:mt-8 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Dica</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Use estes recursos para otimizar sua gestão de conteúdo. Cada ferramenta foi desenvolvida 
          para facilitar tarefas específicas do seu painel administrativo.
        </p>
      </div>
    </div>
  );
};

export default Recursos;
