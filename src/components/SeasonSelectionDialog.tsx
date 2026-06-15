import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, CheckSquare, Square } from 'lucide-react';

interface Episode {
  id: string;
  Titulo: string;
  Temporada: string;
  Episodio: string;
}

interface SeasonSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesTitle: string;
  totalSeasons: number;
  selectedSeasons: number[];
  episodes: Episode[];
  loadingEpisodes: boolean;
  onSeasonsChange: (seasons: number[]) => void;
  onConfirm: () => void;
}

export const SeasonSelectionDialog: React.FC<SeasonSelectionDialogProps> = ({
  open,
  onOpenChange,
  seriesTitle,
  totalSeasons,
  selectedSeasons,
  episodes,
  loadingEpisodes,
  onSeasonsChange,
  onConfirm,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Agrupar episódios por temporada
  const episodesBySeason = useMemo(() => {
    const grouped: Record<number, Episode[]> = {};
    episodes.forEach(ep => {
      const season = parseInt(ep.Temporada);
      if (!grouped[season]) {
        grouped[season] = [];
      }
      grouped[season].push(ep);
    });
    return grouped;
  }, [episodes]);

  // Todas as temporadas disponíveis (do totalSeasons ou inferidas dos episódios)
  const allSeasons = useMemo(() => {
    const seasons = new Set<number>();
    for (let i = 1; i <= totalSeasons; i++) seasons.add(i);
    Object.keys(episodesBySeason).forEach(s => seasons.add(parseInt(s)));
    return Array.from(seasons).sort((a, b) => a - b);
  }, [totalSeasons, episodesBySeason]);

  // Filtrar temporadas e episódios pela busca
  const filteredSeasons = useMemo(() => {
    if (!searchTerm.trim()) return allSeasons;
    const term = searchTerm.toLowerCase().trim();
    return allSeasons.filter(season => {
      const seasonMatches = `temporada ${season}`.includes(term) || `season ${season}`.includes(term);
      const episodes = episodesBySeason[season] || [];
      const episodeMatches = episodes.some(ep =>
        ep.Titulo?.toLowerCase().includes(term) ||
        ep.Episodio?.toLowerCase().includes(term) ||
        `episódio ${ep.Episodio}`.includes(term) ||
        `episode ${ep.Episodio}`.includes(term)
      );
      return seasonMatches || episodeMatches;
    });
  }, [allSeasons, searchTerm, episodesBySeason]);

  // Episódios filtrados por busca para uma temporada
  const getFilteredEpisodes = (season: number) => {
    const seasonEps = episodesBySeason[season] || [];
    if (!searchTerm.trim()) return seasonEps;
    const term = searchTerm.toLowerCase().trim();
    return seasonEps.filter(ep =>
      ep.Titulo?.toLowerCase().includes(term) ||
      ep.Episodio?.toLowerCase().includes(term)
    );
  };

  const handleSeasonToggle = (season: number) => {
    const newSeasons = selectedSeasons.includes(season)
      ? selectedSeasons.filter(s => s !== season)
      : [...selectedSeasons, season];
    onSeasonsChange(newSeasons);
  };

  const handleSelectAllVisible = () => {
    const visibleSeasons = filteredSeasons;
    const allVisibleSelected = visibleSeasons.every(s => selectedSeasons.includes(s));
    if (allVisibleSelected) {
      // Desmarcar apenas as visíveis
      onSeasonsChange(selectedSeasons.filter(s => !visibleSeasons.includes(s)));
    } else {
      // Marcar todas as visíveis (evitando duplicatas)
      const newSet = new Set([...selectedSeasons, ...visibleSeasons]);
      onSeasonsChange(Array.from(newSet).sort((a, b) => a - b));
    }
  };

  const allVisibleSelected = filteredSeasons.length > 0 && filteredSeasons.every(s => selectedSeasons.includes(s));
  const someVisibleSelected = filteredSeasons.some(s => selectedSeasons.includes(s));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSearchTerm(''); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Temporadas</DialogTitle>
          <DialogDescription>
            Escolha quais temporadas de "{seriesTitle}" você deseja importar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {/* Barra de busca */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar temporadas ou episódios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">×</span>
              </button>
            )}
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllVisible}
              className="gap-1.5"
            >
              {allVisibleSelected ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  Desmarcar Visíveis
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  Selecionar Visíveis
                </>
              )}
            </Button>
            <Badge variant="secondary">
              {selectedSeasons.length} de {allSeasons.length} selecionadas
            </Badge>
          </div>

          <ScrollArea className="h-[320px] rounded-md border p-3">
            {loadingEpisodes ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando episódios...</p>
              </div>
            ) : filteredSeasons.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2">
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma temporada ou episódio encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSeasons.map((season) => {
                  const seasonEpisodes = getFilteredEpisodes(season);
                  const isSelected = selectedSeasons.includes(season);
                  return (
                    <div
                      key={season}
                      className={`rounded-lg border p-3 transition-colors ${isSelected ? 'border-primary/30 bg-primary/5' : 'border-border/50 hover:bg-muted/40'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`season-${season}`}
                            checked={isSelected}
                            onCheckedChange={() => handleSeasonToggle(season)}
                          />
                          <Label
                            htmlFor={`season-${season}`}
                            className="text-sm font-semibold leading-none cursor-pointer"
                          >
                            Temporada {season}
                          </Label>
                        </div>
                        {seasonEpisodes.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {seasonEpisodes.length} ep{seasonEpisodes.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      {/* Lista de episódios filtrados da temporada */}
                      {seasonEpisodes.length > 0 && (
                        <div className="mt-2 ml-6 space-y-1">
                          {seasonEpisodes.slice(0, 6).map((ep) => (
                            <div key={ep.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono bg-muted px-1 rounded">E{ep.Episodio}</span>
                              <span className="truncate">{ep.Titulo || `Episódio ${ep.Episodio}`}</span>
                            </div>
                          ))}
                          {seasonEpisodes.length > 6 && (
                            <p className="text-xs text-muted-foreground ml-7">
                              +{seasonEpisodes.length - 6} episódios...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setSearchTerm(''); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={selectedSeasons.length === 0}
          >
            Confirmar Seleção ({selectedSeasons.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
