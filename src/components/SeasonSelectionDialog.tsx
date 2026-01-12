import React, { useMemo } from 'react';
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
import { Loader2 } from 'lucide-react';

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

  const handleSeasonToggle = (season: number) => {
    const newSeasons = selectedSeasons.includes(season)
      ? selectedSeasons.filter(s => s !== season)
      : [...selectedSeasons, season];
    onSeasonsChange(newSeasons);
  };

  const handleSelectAll = () => {
    if (selectedSeasons.length === totalSeasons) {
      onSeasonsChange([]);
    } else {
      onSeasonsChange(Array.from({ length: totalSeasons }, (_, i) => i + 1));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Selecionar Temporadas</DialogTitle>
          <DialogDescription>
            Escolha quais temporadas de "{seriesTitle}" você deseja importar
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedSeasons.length === totalSeasons ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </Button>
            <Badge variant="secondary">
              {selectedSeasons.length} de {totalSeasons} selecionadas
            </Badge>
          </div>

          <ScrollArea className="h-[300px] rounded-md border p-4">
            {loadingEpisodes ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando episódios...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((season) => {
                  const seasonEpisodes = episodesBySeason[season] || [];
                  return (
                    <div key={season} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`season-${season}`}
                          checked={selectedSeasons.includes(season)}
                          onCheckedChange={() => handleSeasonToggle(season)}
                        />
                        <Label
                          htmlFor={`season-${season}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
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
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={selectedSeasons.length === 0}
          >
            Confirmar Seleção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
