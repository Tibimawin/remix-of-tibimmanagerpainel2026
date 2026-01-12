import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CalendarIcon, Clock, TrendingDown, TrendingUp, Users, Target, Download, PlayCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar } from 'recharts';

// Dados mockados para demonstração
const engagementOverTimeData = [
  { date: '01/12', watchTime: 45, completionRate: 68, bounceRate: 23 },
  { date: '02/12', watchTime: 52, completionRate: 72, bounceRate: 20 },
  { date: '03/12', watchTime: 48, completionRate: 65, bounceRate: 25 },
  { date: '04/12', watchTime: 61, completionRate: 78, bounceRate: 18 },
  { date: '05/12', watchTime: 55, completionRate: 71, bounceRate: 22 },
  { date: '06/12', watchTime: 67, completionRate: 82, bounceRate: 15 },
  { date: '07/12', watchTime: 74, completionRate: 85, bounceRate: 12 }
];

const contentEngagementData = [
  { name: 'Vingadores: Ultimato', avgWatchTime: 156, completionRate: 89, bounceRate: 8, engagement: 95 },
  { name: 'Stranger Things S4', avgWatchTime: 342, completionRate: 76, bounceRate: 15, engagement: 88 },
  { name: 'The Office', avgWatchTime: 18, completionRate: 92, bounceRate: 5, engagement: 94 },
  { name: 'Breaking Bad', avgWatchTime: 41, completionRate: 87, bounceRate: 9, engagement: 91 },
  { name: 'Game of Thrones', avgWatchTime: 48, completionRate: 71, bounceRate: 18, engagement: 79 },
  { name: 'Friends', avgWatchTime: 19, completionRate: 88, bounceRate: 7, engagement: 89 },
  { name: 'Casa de Papel', avgWatchTime: 44, completionRate: 73, bounceRate: 16, engagement: 81 },
  { name: 'Narcos', avgWatchTime: 42, completionRate: 79, bounceRate: 13, engagement: 85 }
];

const timeSegmentData = [
  { segment: '0-25%', viewers: 100, retention: 100 },
  { segment: '25-50%', viewers: 82, retention: 82 },
  { segment: '50-75%', viewers: 68, retention: 68 },
  { segment: '75-100%', viewers: 54, retention: 54 }
];

const hourlyEngagementData = [
  { hour: '00h', engagement: 12 },
  { hour: '02h', engagement: 8 },
  { hour: '04h', engagement: 5 },
  { hour: '06h', engagement: 15 },
  { hour: '08h', engagement: 35 },
  { hour: '10h', engagement: 45 },
  { hour: '12h', engagement: 52 },
  { hour: '14h', engagement: 58 },
  { hour: '16h', engagement: 62 },
  { hour: '18h', engagement: 75 },
  { hour: '20h', engagement: 89 },
  { hour: '22h', engagement: 95 }
];

const MetricasEngajamento: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Métricas de Engajamento</h1>
          <p className="text-muted-foreground mt-2">Análise detalhada do comportamento dos usuários</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={selectedPeriod === '7d' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('7d')}
          >
            7 dias
          </Button>
          <Button 
            variant={selectedPeriod === '30d' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('30d')}
          >
            30 dias
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Visualização</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42min 18s</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+5.2%</span> vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">76.8%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+3.1%</span> vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Abandono</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18.5%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">-2.3%</span> vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engajamento Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.4%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+4.8%</span> vs período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Análises */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="content">Por Conteúdo</TabsTrigger>
          <TabsTrigger value="time">Por Horário</TabsTrigger>
          <TabsTrigger value="retention">Retenção</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Gráfico de Engajamento ao Longo do Tempo */}
          <Card>
            <CardHeader>
              <CardTitle>Tendências de Engajamento</CardTitle>
              <CardDescription>Evolução das métricas nos últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={engagementOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Area 
                    type="monotone" 
                    dataKey="watchTime" 
                    stackId="1"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completionRate" 
                    stackId="2"
                    stroke="#82ca9d" 
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cards de Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Melhor Horário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">20h - 22h</div>
                <p className="text-sm text-muted-foreground">Pico de engajamento diário</p>
                <Progress value={95} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categoria Líder</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">Drama</div>
                <p className="text-sm text-muted-foreground">Maior taxa de conclusão</p>
                <Progress value={89} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Duração Ideal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">45min</div>
                <p className="text-sm text-muted-foreground">Conteúdos mais engajados</p>
                <Progress value={76} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {/* Tabela de Engajamento por Conteúdo */}
          <Card>
            <CardHeader>
              <CardTitle>Engajamento por Conteúdo</CardTitle>
              <CardDescription>Análise detalhada do desempenho de cada conteúdo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Conteúdo</th>
                      <th className="text-left p-2 font-medium">Tempo Médio</th>
                      <th className="text-left p-2 font-medium">Taxa de Conclusão</th>
                      <th className="text-left p-2 font-medium">Taxa de Abandono</th>
                      <th className="text-left p-2 font-medium">Score de Engajamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentEngagementData.map((content, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{content.name}</td>
                        <td className="p-2">{content.avgWatchTime}min</td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <Progress value={content.completionRate} className="w-16 mr-2" />
                            {content.completionRate}%
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant={content.bounceRate < 10 ? "secondary" : content.bounceRate < 20 ? "outline" : "destructive"}>
                            {content.bounceRate}%
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            {content.engagement}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-6">
          {/* Gráfico de Engajamento por Horário */}
          <Card>
            <CardHeader>
              <CardTitle>Engajamento por Horário</CardTitle>
              <CardDescription>Padrão de visualização ao longo do dia</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={hourlyEngagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Bar dataKey="engagement" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-6">
          {/* Gráfico de Retenção */}
          <Card>
            <CardHeader>
              <CardTitle>Curva de Retenção</CardTitle>
              <CardDescription>Porcentagem de usuários que continuam assistindo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timeSegmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segment" />
                  <YAxis />
                  <Line 
                    type="monotone" 
                    dataKey="retention" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cards de Insights de Retenção */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ponto Crítico de Abandono</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">32%</div>
                <p className="text-sm text-muted-foreground">Dos usuários abandonam antes dos 25%</p>
                <div className="mt-4">
                  <p className="text-xs font-medium mb-2">Distribuição de Abandono:</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>0-25%</span>
                      <span>32%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>25-50%</span>
                      <span>18%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>50-75%</span>
                      <span>14%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>75-100%</span>
                      <span>46%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-sm">Melhorar intro dos conteúdos para reduzir abandono inicial</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-sm">46% dos usuários assistem até o final - excelente!</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <p className="text-sm">Foco em conteúdos de 20-45min para melhor engajamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MetricasEngajamento;