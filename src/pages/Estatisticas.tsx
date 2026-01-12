
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useBaserowService } from '@/services/BaserowService';
import { useConfig } from '@/contexts/ConfigContext';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, PlayCircle, Tag, FileText, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Estatisticas = () => {
  const baserowService = useBaserowService();
  const { config } = useConfig();

  // Buscar dados das tabelas
  const { data: conteudos, isLoading: loadingConteudos } = useQuery({
    queryKey: ['estatisticas-conteudos', config.tableIds.conteudos],
    queryFn: () => baserowService.getAllTableData(config.tableIds.conteudos),
    enabled: !!config.tableIds.conteudos && !!config.apiToken && !!config.baseUrl,
  });

  const { data: usuarios, isLoading: loadingUsuarios } = useQuery({
    queryKey: ['estatisticas-usuarios', config.tableIds.usuarios],
    queryFn: () => baserowService.getAllTableData(config.tableIds.usuarios),
    enabled: !!config.tableIds.usuarios && !!config.apiToken && !!config.baseUrl,
  });

  const isLoading = loadingConteudos || loadingUsuarios;

  // Cores para os gráficos
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  // Processar dados para gráficos
  const dadosPorTipo = React.useMemo(() => {
    if (!conteudos?.results) return [];
    
    const tipos = conteudos.results.reduce((acc: any, item: any) => {
      const tipo = item.Tipo || 'Outros';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(tipos).map(([name, value]) => ({ name, value }));
  }, [conteudos]);

  const conteudosMaisVistos = React.useMemo(() => {
    if (!conteudos?.results) return [];
    
    return conteudos.results
      .filter((item: any) => item.Views && item.Nome)
      .sort((a: any, b: any) => (Number(b.Views) || 0) - (Number(a.Views) || 0))
      .slice(0, 5)
      .map((item: any) => ({
        nome: item.Nome,
        views: Number(item.Views) || 0
      }));
  }, [conteudos]);

  const categoriasMaisPopulares = React.useMemo(() => {
    if (!conteudos?.results) return [];
    
    const categorias = conteudos.results.reduce((acc: any, item: any) => {
      const categoria = item.Categoria || 'Sem categoria';
      acc[categoria] = (acc[categoria] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categorias)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [conteudos]);

  const totalUsuarios = usuarios?.results?.length || 0;
  const usuariosAtivos = usuarios?.results?.filter((user: any) => 
    Number(user.Restam) > 0
  ).length || 0;

  const totalConteudos = conteudos?.results?.length || 0;

  if (!config.apiToken || !config.baseUrl) {
    return (
      <div className="w-full py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Estatísticas Avançadas</h1>
          <p className="text-muted-foreground mt-2">
            Visualize informações detalhadas sobre o uso da plataforma
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Configuração necessária</h3>
              <p className="text-muted-foreground">
                Configure as credenciais da API nas Configurações para visualizar as estatísticas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Estatísticas Avançadas</h1>
        <p className="text-muted-foreground mt-2">
          Visualize informações detalhadas sobre o uso da plataforma
        </p>
      </div>

      {/* Contadores principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Conteúdos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalConteudos}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalUsuarios}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{usuariosAtivos}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Conteúdos por Tipo
            </CardTitle>
            <CardDescription>
              Distribuição dos conteúdos por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : dadosPorTipo.length > 0 ? (
              <ChartContainer
                config={{
                  value: {
                    label: "Quantidade",
                  },
                }}
                className="h-64"
              >
                <PieChart>
                  <Pie
                    data={dadosPorTipo}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {dadosPorTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conteúdos mais vistos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conteúdos Mais Visualizados
            </CardTitle>
            <CardDescription>
              Top 5 conteúdos com mais views
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : conteudosMaisVistos.length > 0 ? (
              <ChartContainer
                config={{
                  views: {
                    label: "Views",
                  },
                }}
                className="h-64"
              >
                <BarChart data={conteudosMaisVistos}>
                  <XAxis 
                    dataKey="nome" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Bar dataKey="views" fill="#8884d8" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhum dado de views disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categorias mais populares */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Categorias Mais Populares
            </CardTitle>
            <CardDescription>
              Top 5 categorias com mais conteúdos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : categoriasMaisPopulares.length > 0 ? (
              <ChartContainer
                config={{
                  value: {
                    label: "Quantidade",
                  },
                }}
                className="h-64"
              >
                <BarChart data={categoriasMaisPopulares}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Bar dataKey="value" fill="#82ca9d" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhum dado de categorias disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Estatisticas;
