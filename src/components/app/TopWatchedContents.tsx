import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Flame,
  Eye,
  Play,
  Film,
  Tv,
  Sparkles,
  LayoutGrid,
  List,
  RefreshCw,
  Star,
  Settings,
  AlertCircle,
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import { TopContentItem, TopContentMetrics } from '@/services/TopContentService';
import { Link } from 'react-router-dom';

interface TopWatchedContentsProps {
  metrics: TopContentMetrics | null;
  loading: boolean;
  onRefresh: () => void;
  isTableConfigured: boolean;
  tableId?: string;
  appId?: string;
}

export const TopWatchedContents: React.FC<TopWatchedContentsProps> = ({
  metrics,
  loading,
  onRefresh,
  isTableConfigured,
  tableId,
  appId
}) => {
  // Limite de exibição: Top 10 ou Top 20
  const [limit, setLimit] = useState<10 | 20>(20);
  // Modo de visualização: Grade de Capas (grid) ou Tabela Ranqueada (list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Controle de erros ao carregar imagens individuais
  const [imageErrors, setImageErrors] = useState<Record<string | number, boolean>>({});

  const handleImageError = (id: string | number) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  const displayedItems = useMemo(() => {
    if (!metrics?.items) return [];
    return metrics.items.slice(0, limit);
  }, [metrics?.items, limit]);

  const maxViews = useMemo(() => {
    if (!displayedItems.length) return 1;
    return Math.max(1, displayedItems[0].views);
  }, [displayedItems]);

  const formatViews = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden" id="top-conteudos-app">
      <CardHeader className="pb-4 border-b border-border/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Trophy className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Conteúdos Mais Assistidos do App
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs">
                  <Flame className="h-3 w-3 mr-1 text-amber-500 fill-amber-500" />
                  Top {limit}
                </Badge>
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Ranking dos títulos com maior número de visualizações na tabela de conteúdos
              {appId && (
                <>
                  {' '}do app <span className="font-mono font-semibold text-foreground">{appId}</span>
                </>
              )}
            </CardDescription>
          </div>

          {/* Controles de Top 10/20, Grid/Lista e Atualização */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor Top 10 / Top 20 */}
            <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/40 text-xs">
              <Button
                size="sm"
                variant={limit === 10 ? 'default' : 'ghost'}
                className="h-7 text-xs px-2.5"
                onClick={() => setLimit(10)}
              >
                Top 10
              </Button>
              <Button
                size="sm"
                variant={limit === 20 ? 'default' : 'ghost'}
                className="h-7 text-xs px-2.5"
                onClick={() => setLimit(20)}
              >
                Top 20
              </Button>
            </div>

            {/* Alternador de Modo de Exibição */}
            <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/40 text-xs">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('grid')}
                title="Exibir em Grade com Capas"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('list')}
                title="Exibir em Tabela Ranqueada"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Botão Atualizar */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Recarregar</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* Caso 1: Tabela não configurada */}
        {!isTableConfigured && (
          <div className="p-6 border border-dashed border-border/70 rounded-xl text-center space-y-3 bg-muted/20">
            <div className="h-10 w-10 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Tabela de Conteúdos não configurada</h4>
              <p className="text-xs text-muted-foreground">
                Para exibir o ranking com as capas e visualizações dos conteúdos do seu aplicativo, informe o ID da sua tabela de conteúdos nas Configurações.
              </p>
            </div>
            <Button asChild size="sm" variant="default" className="gap-2">
              <Link to="/configuracoes">
                <Settings className="h-4 w-4" />
                Configurar Tabela de Conteúdos
              </Link>
            </Button>
          </div>
        )}

        {/* Caso 2: Em carregamento */}
        {loading && !metrics && (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <RefreshCw className="h-7 w-7 animate-spin text-amber-500" />
            <p className="text-sm">Carregando conteúdos e calculando os mais assistidos...</p>
          </div>
        )}

        {/* Caso 3: Tabela configurada mas sem dados */}
        {!loading && isTableConfigured && displayedItems.length === 0 && (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Film className="h-10 w-10 mx-auto opacity-30" />
            <h4 className="text-sm font-semibold text-foreground">Nenhum conteúdo encontrado</h4>
            <p className="text-xs max-w-sm mx-auto">
              A tabela de conteúdos informada (ID: <span className="font-mono font-medium">{tableId || 'N/A'}</span>) não possui registros ou visualizações computadas.
            </p>
          </div>
        )}

        {/* Caso 4: Exibição dos dados do Top */}
        {displayedItems.length > 0 && (
          <>
            {/* Banner de Destaques: Campeão de Audiência & Estatísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Campeão #1 */}
              {displayedItems[0] && (
                <div className="md:col-span-2 relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-card p-4 flex flex-col sm:flex-row items-center gap-4">
                  {/* Capa com badge dourado */}
                  <div className="relative w-20 h-28 sm:w-24 sm:h-36 rounded-lg overflow-hidden bg-muted/60 flex-shrink-0 shadow-md border border-amber-500/40">
                    {displayedItems[0].capa && !imageErrors[displayedItems[0].id] ? (
                      <img
                        src={displayedItems[0].capa}
                        alt={displayedItems[0].nome}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(displayedItems[0].id)}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2 text-center text-[10px]">
                        <Film className="h-6 w-6 mb-1 opacity-40" />
                        <span>Sem Capa</span>
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 bg-amber-500 text-black font-black text-xs px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                      <Trophy className="h-3 w-3 fill-black" />
                      #1
                    </div>
                  </div>

                  {/* Informações do Campeão */}
                  <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-500/40 text-[10px] uppercase tracking-wider font-semibold">
                        Campeão de Audiência
                      </Badge>
                      {displayedItems[0].categoria && (
                        <span className="text-xs text-muted-foreground">{displayedItems[0].categoria}</span>
                      )}
                      {displayedItems[0].ano && (
                        <span className="text-xs text-muted-foreground">({displayedItems[0].ano})</span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-foreground truncate" title={displayedItems[0].nome}>
                      {displayedItems[0].nome}
                    </h3>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                      <div className="flex items-center gap-1.5 text-amber-500 font-bold text-base">
                        <Eye className="h-4 w-4" />
                        <span>{formatViews(displayedItems[0].views)} visualizações</span>
                      </div>
                      {displayedItems[0].imdb && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          <span>IMDb {displayedItems[0].imdb}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      O conteúdo com maior preferência e engajamento dos seus usuários no aplicativo.
                    </p>
                  </div>
                </div>
              )}

              {/* Métricas Resumidas do Top */}
              <div className="rounded-xl border border-border/40 bg-card/70 p-4 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Audiência Acumulada
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h4 className="text-2xl font-black text-foreground">
                      {formatViews(metrics?.totalViews || 0)}
                    </h4>
                    <span className="text-xs text-muted-foreground">views no Top {limit}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Média por conteúdo:</span>
                  <span className="font-semibold text-foreground font-mono">
                    {formatViews(metrics?.averageViews || 0)} views
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Catálogo analisado:</span>
                  <span className="font-semibold text-foreground font-mono">
                    {metrics?.totalCatalogCount || displayedItems.length} títulos
                  </span>
                </div>
              </div>
            </div>

            {/* MODO GRADE: Capas de Cinema com Rank, Views e Categorias */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4">
                {displayedItems.map((item) => {
                  const percentOfTop = Math.max(4, Math.round((item.views / maxViews) * 100));

                  // Estilos especiais para o pódio (#1 Ouro, #2 Prata, #3 Bronze)
                  const isGold = item.rank === 1;
                  const isSilver = item.rank === 2;
                  const isBronze = item.rank === 3;

                  return (
                    <div
                      key={item.id}
                      className="group relative flex flex-col rounded-xl overflow-hidden border border-border/40 bg-card hover:border-amber-500/50 hover:shadow-lg transition-all duration-200"
                    >
                      {/* Capa do Conteúdo (Aspect Ratio 2:3) */}
                      <div className="relative w-full aspect-[2/3] bg-muted/40 overflow-hidden">
                        {item.capa && !imageErrors[item.id] ? (
                          <img
                            src={item.capa}
                            alt={item.nome}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={() => handleImageError(item.id)}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-3 text-center">
                            <Film className="h-8 w-8 mb-1.5 opacity-30" />
                            <span className="text-[11px] font-medium opacity-60">Sem Capa</span>
                          </div>
                        )}

                        {/* Gradiente escuro para legibilidade */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                        {/* Badge de Posição / Ranking no Canto Superior Esquerdo */}
                        <div className="absolute top-2 left-2 z-10">
                          {isGold && (
                            <span className="inline-flex items-center gap-1 bg-amber-500 text-black font-black text-xs px-2 py-0.5 rounded-md shadow-md">
                              <Trophy className="h-3 w-3 fill-black" />
                              #1
                            </span>
                          )}
                          {isSilver && (
                            <span className="inline-flex items-center gap-1 bg-slate-300 text-slate-900 font-black text-xs px-2 py-0.5 rounded-md shadow-md">
                              #2
                            </span>
                          )}
                          {isBronze && (
                            <span className="inline-flex items-center gap-1 bg-amber-700 text-white font-black text-xs px-2 py-0.5 rounded-md shadow-md">
                              #3
                            </span>
                          )}
                          {!isGold && !isSilver && !isBronze && (
                            <span className="inline-flex items-center bg-black/75 backdrop-blur-sm text-white font-bold text-xs px-1.5 py-0.5 rounded-md border border-white/10 shadow">
                              #{item.rank}
                            </span>
                          )}
                        </div>

                        {/* Badge de Tipo (Filme / Série) no Canto Superior Direito */}
                        {item.tipo && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className="inline-flex items-center text-[10px] font-medium bg-black/60 backdrop-blur-sm text-zinc-200 px-1.5 py-0.5 rounded border border-white/10">
                              {item.tipo.toLowerCase().includes('sér') || item.tipo.toLowerCase().includes('ser') ? (
                                <Tv className="h-2.5 w-2.5 mr-1 text-cyan-400" />
                              ) : (
                                <Film className="h-2.5 w-2.5 mr-1 text-amber-400" />
                              )}
                              {item.tipo}
                            </span>
                          </div>
                        )}

                        {/* Visualizações no rodapé da capa */}
                        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between text-white">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 drop-shadow">
                            <Eye className="h-3.5 w-3.5" />
                            {formatViews(item.views)}
                          </span>
                          {item.imdb && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-300 font-medium drop-shadow">
                              <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                              {item.imdb}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Informações detalhadas do card */}
                      <div className="p-3 flex flex-col justify-between flex-1 gap-2 bg-card">
                        <div>
                          <h4
                            className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors"
                            title={item.nome}
                          >
                            {item.nome}
                          </h4>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                            <span className="truncate max-w-[70%]">{item.categoria || 'Geral'}</span>
                            {item.ano && <span>{item.ano}</span>}
                          </div>
                        </div>

                        {/* Barra proporcional de visualizações em relação ao #1 */}
                        <div className="space-y-1">
                          <div className="w-full bg-muted/60 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isGold
                                  ? 'bg-amber-500'
                                  : isSilver
                                  ? 'bg-slate-300'
                                  : isBronze
                                  ? 'bg-amber-700'
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${percentOfTop}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Audiência</span>
                            <span className="font-mono font-medium">{percentOfTop}% do topo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODO LISTA / TABELA: Compacto com barras comparativas */}
            {viewMode === 'list' && (
              <div className="overflow-x-auto rounded-lg border border-border/40">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                      <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                      <th className="py-2.5 px-3">Conteúdo</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3 w-48">Audiência Relativa</th>
                      <th className="py-2.5 px-3 text-right">Visualizações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {displayedItems.map((item) => {
                      const percentOfTop = Math.max(4, Math.round((item.views / maxViews) * 100));
                      const isGold = item.rank === 1;
                      const isSilver = item.rank === 2;
                      const isBronze = item.rank === 3;

                      return (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          {/* Coluna Rank */}
                          <td className="py-2 px-3 text-center">
                            {isGold ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-black font-black text-xs">
                                1
                              </span>
                            ) : isSilver ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs">
                                2
                              </span>
                            ) : isBronze ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700 text-white font-black text-xs">
                                3
                              </span>
                            ) : (
                              <span className="font-mono text-xs font-semibold text-muted-foreground">
                                #{item.rank}
                              </span>
                            )}
                          </td>

                          {/* Coluna Conteúdo com Capa miniatura */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-3">
                              <div className="relative w-9 h-12 rounded overflow-hidden bg-muted/60 flex-shrink-0 border border-border/40">
                                {item.capa && !imageErrors[item.id] ? (
                                  <img
                                    src={item.capa}
                                    alt={item.nome}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                    onError={() => handleImageError(item.id)}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Film className="h-4 w-4 opacity-30" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground text-xs sm:text-sm truncate">
                                  {item.nome}
                                </div>
                                {item.ano && (
                                  <div className="text-[11px] text-muted-foreground">Ano: {item.ano}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Categoria */}
                          <td className="py-2 px-3 text-xs text-muted-foreground">
                            {item.categoria || 'Geral'}
                          </td>

                          {/* Tipo */}
                          <td className="py-2 px-3 text-xs">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {item.tipo || 'Filme'}
                            </Badge>
                          </td>

                          {/* Barra de Audiência Relativa */}
                          <td className="py-2 px-3">
                            <div className="space-y-1">
                              <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isGold
                                      ? 'bg-amber-500'
                                      : isSilver
                                      ? 'bg-slate-300'
                                      : isBronze
                                      ? 'bg-amber-700'
                                      : 'bg-primary'
                                  }`}
                                  style={{ width: `${percentOfTop}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {percentOfTop}% do campeão
                              </div>
                            </div>
                          </td>

                          {/* Visualizações */}
                          <td className="py-2 px-3 text-right">
                            <div className="font-bold text-foreground text-xs sm:text-sm flex items-center justify-end gap-1.5">
                              <Eye className="h-3.5 w-3.5 text-amber-500" />
                              <span className="font-mono">{formatViews(item.views)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
