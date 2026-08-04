import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, TrendingUp, Play, Clock, Users, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

// Dados mockados para demonstração
const topContentData = [
  { name: 'Vingadores: Ultimato', views: 15420, duration: '3h 1m', category: 'Ação', rating: 8.9 },
  { name: 'Stranger Things S4', views: 12350, duration: '9h 15m', category: 'Sci-Fi', rating: 9.1 },
  { name: 'The Office', views: 11200, duration: '22m', category: 'Comédia', rating: 8.8 },
  { name: 'Breaking Bad', views: 10800, duration: '47m', category: 'Drama', rating: 9.5 },
  { name: 'Game of Thrones', views: 9650, duration: '57m', category: 'Fantasia', rating: 8.7 },
  { name: 'Friends', views: 8900, duration: '22m', category: 'Comédia', rating: 8.9 },
  { name: 'Casa de Papel', views: 8200, duration: '50m', category: 'Crime', rating: 8.3 },
  { name: 'Narcos', views: 7500, duration: '49m', category: 'Crime', rating: 8.8 },
  { name: 'Black Mirror', views: 7100, duration: '60m', category: 'Sci-Fi', rating: 8.8 },
  { name: 'The Crown', views: 6800, duration: '58m', category: 'Drama', rating: 8.6 }
];

const viewsOverTimeData = [
  { month: 'Jan', views: 45000 },
  { month: 'Fev', views: 52000 },
  { month: 'Mar', views: 48000 },
  { month: 'Abr', views: 61000 },
  { month: 'Mai', views: 55000 },
  { month: 'Jun', views: 67000 },
  { month: 'Jul', views: 74000 },
  { month: 'Ago', views: 82000 },
  { month: 'Set', views: 79000 },
  { month: 'Out', views: 86000 },
  { month: 'Nov', views: 91000 },
  { month: 'Dez', views: 95000 }
];

const categoryData = [
  { name: 'Drama', value: 35, color: '#8884d8' },
  { name: 'Comédia', value: 25, color: '#82ca9d' },
  { name: 'Ação', value: 20, color: '#ffc658' },
  { name: 'Sci-Fi', value: 12, color: '#ff7300' },
  { name: 'Crime', value: 8, color: '#ff0000' }
];

const RelatoriosVisualizacao: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios de Visualização</h1>
          <p className="text-muted-foreground mt-2">Análise detalhada dos conteúdos mais assistidos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Filtrar Período
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Visualizações</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Total Assistido</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0h</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.2%</span> vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+15.1%</span> vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Crescimento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+18.7%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">Crescimento</span> mensal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Visualizações ao Longo do Tempo */}
        <Card>
          <CardHeader>
            <CardTitle>Visualizações ao Longo do Tempo</CardTitle>
            <CardDescription>Tendência de visualizações nos últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={viewsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Categorias */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
            <CardDescription>Popularidade das categorias de conteúdo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Top Conteúdos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Conteúdos Mais Assistidos</CardTitle>
          <CardDescription>Ranking dos conteúdos com mais visualizações no último mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Posição</th>
                  <th className="text-left p-2 font-medium">Título</th>
                  <th className="text-left p-2 font-medium">Categoria</th>
                  <th className="text-left p-2 font-medium">Visualizações</th>
                  <th className="text-left p-2 font-medium">Duração</th>
                  <th className="text-left p-2 font-medium">Avaliação</th>
                </tr>
              </thead>
              <tbody>
                {topContentData.map((content, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                    </td>
                    <td className="p-2 font-medium">{content.name}</td>
                    <td className="p-2">
                      <Badge variant="outline">{content.category}</Badge>
                    </td>
                    <td className="p-2">{content.views.toLocaleString()}</td>
                    <td className="p-2 text-muted-foreground">{content.duration}</td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                        {content.rating}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras dos Top Conteúdos */}
      <Card>
        <CardHeader>
          <CardTitle>Visualizações dos Top Conteúdos</CardTitle>
          <CardDescription>Comparativo visual das visualizações</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topContentData.slice(0, 8)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Bar dataKey="views" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatoriosVisualizacao;