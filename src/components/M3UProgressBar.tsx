import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useM3UImport } from '@/contexts/M3UImportContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Film, Tv, Radio, List, ExternalLink, PauseCircle, PlayCircle } from 'lucide-react';

const typeIcon = {
  'Filmes': Film,
  'Séries': Tv,
  'Canais': Radio,
  'Episódios': List,
};

export const M3UProgressBar: React.FC = () => {
  const { progress } = useM3UImport();
  const navigate = useNavigate();
  const location = useLocation();

  if (!progress.isImporting) return null;

  const Icon = typeIcon[progress.currentType as keyof typeof typeIcon] || Loader2;
  const isOnImportPage = location.pathname === '/importar-m3u';

  const totalDone = progress.stats.filmes + progress.stats.series + progress.stats.episodios + progress.stats.canais;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md shadow-lg">
      <div className="max-w-full px-4 py-2">
        {/* Barra de progresso */}
        <Progress value={progress.percentage} className="h-1 mb-2" />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Lado esquerdo: ícone + info */}
          <div className="flex items-center gap-2 min-w-0">
            {progress.isPaused ? (
              <PauseCircle className="h-4 w-4 text-yellow-500 shrink-0" />
            ) : (
              <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
            )}

            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                Importação M3U
              </span>

              {progress.isPaused ? (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/40 text-xs">
                  Pausado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-primary border-primary/40 text-xs animate-pulse">
                  Em andamento
                </Badge>
              )}

              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {progress.current}/{progress.total} itens
                {progress.percentage > 0 && ` · ${progress.percentage}%`}
              </span>

              {progress.currentType && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {progress.currentType}
                  {progress.currentItem && (
                    <span className="max-w-[200px] truncate opacity-70">
                      · {progress.currentItem}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Lado direito: stats + botão ir para página */}
          <div className="flex items-center gap-2 shrink-0">
            {totalDone > 0 && (
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                {progress.stats.filmes > 0 && (
                  <span className="flex items-center gap-1">
                    <Film className="h-3 w-3" /> {progress.stats.filmes}
                  </span>
                )}
                {progress.stats.series > 0 && (
                  <span className="flex items-center gap-1">
                    <Tv className="h-3 w-3" /> {progress.stats.series}
                  </span>
                )}
                {progress.stats.episodios > 0 && (
                  <span className="flex items-center gap-1">
                    <List className="h-3 w-3" /> {progress.stats.episodios}
                  </span>
                )}
                {progress.stats.canais > 0 && (
                  <span className="flex items-center gap-1">
                    <Radio className="h-3 w-3" /> {progress.stats.canais}
                  </span>
                )}
              </div>
            )}

            {!isOnImportPage && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => navigate('/importar-m3u')}
              >
                <ExternalLink className="h-3 w-3" />
                Ver importação
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
