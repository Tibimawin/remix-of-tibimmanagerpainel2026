import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import {
  Users,
  Film,
  Tv,
  TvMinimal,
  PlayCircle,
  Database,
  Image,
  FolderTree,
  Shield,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SystemMetricsCards = () => {
  const { metrics, loading, error } = useSystemMetrics();

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="relative overflow-hidden border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl" />
                </div>
                <div>
                  <div className="h-8 bg-muted/50 rounded w-16 mb-2" />
                  <div className="h-3 bg-muted/30 rounded w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200/40 bg-gradient-to-br from-red-50/80 to-red-100/40">
        <CardContent className="pt-6">
          <p className="text-red-600 text-center font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const metricsData = [
    {
      title: "Filmes",
      value: metrics.totalFilmes,
      icon: Film,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-500",
      description: "cadastrados"
    },
    {
      title: "Séries",
      value: metrics.totalSeries,
      icon: TvMinimal,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/10",
      iconColor: "text-purple-500",
      description: "cadastradas"
    },
    {
      title: "Canais TV",
      value: metrics.totalTV,
      icon: Tv,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 to-red-500/10",
      iconColor: "text-orange-500",
      description: "ativos"
    },
    {
      title: "Episódios",
      value: metrics.totalEpisodios,
      icon: PlayCircle,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-500/10 to-emerald-500/10",
      iconColor: "text-green-500",
      description: "disponíveis"
    },
    {
      title: "Conteúdos",
      value: metrics.totalConteudos,
      icon: Database,
      gradient: "from-indigo-500 to-blue-500",
      bgGradient: "from-indigo-500/10 to-blue-500/10",
      iconColor: "text-indigo-500",
      description: "total"
    },
    {
      title: "Banners",
      value: metrics.totalBanners,
      icon: Image,
      gradient: "from-pink-500 to-rose-500",
      bgGradient: "from-pink-500/10 to-rose-500/10",
      iconColor: "text-pink-500",
      description: "ativos"
    },
    {
      title: "Categorias",
      value: metrics.totalCategorias,
      icon: FolderTree,
      gradient: "from-yellow-500 to-orange-500",
      bgGradient: "from-yellow-500/10 to-orange-500/10",
      iconColor: "text-yellow-600",
      description: "criadas"
    },
    {
      title: "Sessões",
      value: metrics.totalSessoes,
      icon: Shield,
      gradient: "from-teal-500 to-cyan-500",
      bgGradient: "from-teal-500/10 to-cyan-500/10",
      iconColor: "text-teal-500",
      description: "configuradas"
    },
    {
      title: "Plataformas",
      value: metrics.totalPlataformas,
      icon: Monitor,
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-500/10 to-purple-500/10",
      iconColor: "text-violet-500",
      description: "integradas"
    },
    {
      title: "Usuários",
      value: metrics.totalUsuarios,
      icon: Users,
      gradient: "from-blue-600 to-indigo-600",
      bgGradient: "from-blue-600/10 to-indigo-600/10",
      iconColor: "text-blue-600",
      description: "registrados"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metricsData.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card
            key={index}
            className={cn(
              "group relative overflow-hidden border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm",
              "hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 cursor-pointer",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Animated Background Gradient */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
              metric.bgGradient
            )} />

            {/* Glow Effect */}
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700",
              metric.gradient
            )} />

            <CardContent className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500",
                  metric.gradient
                )}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    "text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                    metric.gradient
                  )}>
                    {metric.value.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground/90">
                    {metric.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              </div>

              {/* Bottom Accent Line */}
              <div className={cn(
                "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r",
                metric.gradient,
                "transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
              )} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SystemMetricsCards;
