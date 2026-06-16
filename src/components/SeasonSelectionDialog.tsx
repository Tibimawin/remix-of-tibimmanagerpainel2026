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
import { Loader2, Search, CheckSquare, Square, Trash2 } from 'lucide-react';

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
  selectedEpisodes: string[];
  episodes: Episode[];
  loadingEpisodes: boolean;
  onSeasonsChange: (seasons: number[]) => void;
  onEpisodesChange: (episodes: string[]) => void;
  onConfirm: () => void;
}

export const SeasonSelectionDialog: React.FC<SeasonSelectionDialogProps> = ({
  open,
  onOpenChange,
  seriesTitle,
  totalSeasons,
  selectedSeasons,
  selectedEpisodes,
  episodes,
  loadingEpisodes,
  onSeasonsChange,
  onEpisodesChange,
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

  // Todas as temporadas disponíveis
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
      const seasonEps = episodesBySeason[season] || [];
      const episodeMatches = seasonEps.some(ep =>
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

  // Estado de seleção por temporada (derivado dos episódios selecionados)
  const getSeasonSelectionState = (season: number): 'checked' | 'unchecked' | 'indeterminate' => {
    const seasonEps = episodesBySeason[season] || [];
    if (seasonEps.length === 0) return selectedSeasons.includes(season) ? 'checked' : 'unchecked';
    const selectedCount = seasonEps.filter(ep => selectedEpisodes.includes(ep.id)).length;
    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === seasonEps.length) return 'checked';
    return 'indeterminate';
  };

  const handleSeasonToggle = (season: number) => {
    const seasonEps = episodesBySeason[season] || [];
    const state = getSeasonSelectionState(season);

    if (state === 'checked') {
      // Desmarcar todos os episódios da temporada
      const toRemove = new Set(seasonEps.map(ep => ep.id));
      onEpisodesChange(selectedEpisodes.filter(id => !toRemove.has(id)));
      onSeasonsChange(selectedSeasons.filter(s => s !== season));
    } else {
      // Marcar todos os episódios da temporada
      const toAdd = seasonEps.map(ep => ep.id);
      const newEpisodes = Array.from(new Set([...selectedEpisodes, ...toAdd]));
      onEpisodesChange(newEpisodes);
      if (!selectedSeasons.includes(season)) {
        onSeasonsChange([...selectedSeasons, season].sort((a, b) => a - b));
      }
    }
  };

  const handleEpisodeToggle = (episodeId: string, season: number) => {
    const newEpisodes = selectedEpisodes.includes(episodeId)
      ? selectedEpisodes.filter(id => id !== episodeId)
      : [...selectedEpisodes, episodeId];
    onEpisodesChange(newEpisodes);

    // Sincronizar temporadas baseadas nos episódios selecionados
    const seasonEps = episodesBySeason[season] || [];
    const anySelected = seasonEps.some(ep => newEpisodes.includes(ep.id));
    const allSelected = seasonEps.length > 0 && seasonEps.every(ep => newEpisodes.includes(ep.id));

    if (!anySelected) {
      onSeasonsChange(selectedSeasons.filter(s => s !== season));
    } else if (allSelected && !selectedSeasons.includes(season)) {
      onSeasonsChange([...selectedSeasons, season].sort((a, b) => a - b));
    } else if (anySelected && !allSelected && selectedSeasons.includes(season)) {
      // Mantém a temporada na lista mesmo que parcial (indeterminate)
      // não remove para manter a referência
    }
  };

  const handleSelectAllVisible = () => {
    const visibleSeasons = filteredSeasons;
    // Coletar todos os episódios visíveis (considerando busca)
    const visibleEpisodes: string[] = [];
    visibleSeasons.forEach(season => {
      const eps = getFilteredEpisodes(season);
      visibleEpisodes.push(...eps.map(ep => ep.id));
    });

    const allVisibleSelected = visibleEpisodes.length > 0 && visibleEpisodes.every(id => selectedEpisodes.includes(id));
    if (allVisibleSelected) {
      // Desmarcar apenas os visíveis
      const toRemove = new Set(visibleEpisodes);
      onEpisodesChange(selectedEpisodes.filter(id => !toRemove.has(id)));
      onSeasonsChange(selectedSeasons.filter(s => !visibleSeasons.includes(s)));
    } else {
      // Marcar todos os visíveis
      const newEpisodes = Array.from(new Set([...selectedEpisodes, ...visibleEpisodes]));
      onEpisodesChange(newEpisodes);
      const newSeasons = Array.from(new Set([...selectedSeasons, ...visibleSeasons]));
      onSeasonsChange(newSeasons.sort((a, b) => a - b));
    }
  };

  const handleClearAll = () => {
    onEpisodesChange([]);
    onSeasonsChange([]);
  };

  const allVisibleSelected = (() => {
    const visibleEpisodes: string[] = [];
    filteredSeasons.forEach(season => {
      const eps = getFilteredEpisodes(season);
      visibleEpisodes.push(...eps.map(ep => ep.id));
    });
    return visibleEpisodes.length > 0 && visibleEpisodes.every(id => selectedEpisodes.includes(id));
  })();

  const totalSelectedEpisodes = selectedEpisodes.length;
  const totalEpisodes = episodes.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSearchTerm(''); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Selecionar Temporadas e Episódios</DialogTitle>
          <DialogDescription>
            Escolha quais episódios de "{seriesTitle}" você deseja importar
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 space-y-3 py-3">
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
            <div className="flex items-center gap-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="gap-1.5 text-destructive hover:text-destructive"
                disabled={selectedEpisodes.length === 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar seleção
              </Button>
            </div>
            <Badge variant="secondary">
              {totalSelectedEpisodes} de {totalEpisodes} episódios
            </Badge>
          </div>

          <ScrollArea className="flex-1 min-h-0 rounded-md border p-3">
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
                  const seasonState = getSeasonSelectionState(season);
                  const isSelected = seasonState === 'checked';
                  const isIndeterminate = seasonState === 'indeterminate';
                  return (
                    <div
                      key={season}
                      className={`rounded-lg border p-3 transition-colors ${isSelected ? 'border-primary/30 bg-primary/5' : isIndeterminate ? 'border-primary/20 bg-primary/[0.02]' : 'border-border/50 hover:bg-muted/40'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`season-${season}`}
                            checked={isIndeterminate ? 'indeterminate' : isSelected}
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

                      {/* Lista de episódios com checkboxes */}
                      {seasonEpisodes.length > 0 && (
                        <div className="mt-2 ml-6 space-y-1 max-h-[200px] overflow-y-auto pr-1">
                          {seasonEpisodes.map((ep) => {
                            const epSelected = selectedEpisodes.includes(ep.id);
                            return (
                              <div
                                key={ep.id}
                                className={`flex items-center gap-2 rounded px-2 py-1 transition-colors ${epSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                              >
                                <Checkbox
                                  id={`ep-${ep.id}`}
                                  checked={epSelected}
                                  onCheckedChange={() => handleEpisodeToggle(ep.id, season)}
                                  className="h-3.5 w-3.5"
                                />
                                <Label
                                  htmlFor={`ep-${ep.id}`}
                                  className="flex items-center gap-2 text-xs cursor-pointer flex-1"
                                >
                                  <span className="font-mono bg-muted px-1 rounded text-[10px]">E{ep.Episodio}</span>
                                  <span className="truncate text-muted-foreground">{ep.Titulo || `Episódio ${ep.Episodio}`}</span>
                                </Label>
                              </div>
                            );
                          })}
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
            disabled={selectedEpisodes.length === 0}
          >
            Confirmar Seleção ({selectedEpisodes.length} episódios)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
