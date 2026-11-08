import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SeriesUpdate, EpisodeUpdate } from '@/hooks/useSeriesUpdater';

interface SeriesUpdateDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  updateData: SeriesUpdate | null;
  onApplyUpdates: (selectedEpisodes: EpisodeUpdate[]) => void;
  loading: boolean;
}

export const SeriesUpdateDialog: React.FC<SeriesUpdateDialogProps> = ({
  open,
  setOpen,
  updateData,
  onApplyUpdates,
  loading
}) => {
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());

  if (!updateData) return null;

  const handleEpisodeToggle = (episode: EpisodeUpdate) => {
    const key = `${episode.temporada}-${episode.episodio}`;
    const newSelected = new Set(selectedEpisodes);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedEpisodes(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEpisodes.size === updateData.newEpisodes.length) {
      setSelectedEpisodes(new Set());
    } else {
      const allKeys = updateData.newEpisodes.map(ep => `${ep.temporada}-${ep.episodio}`);
      setSelectedEpisodes(new Set(allKeys));
    }
  };

  const handleApply = () => {
    const episodesToImport = updateData.newEpisodes.filter(ep => 
      selectedEpisodes.has(`${ep.temporada}-${ep.episodio}`)
    );
    onApplyUpdates(episodesToImport);
  };

  const groupedEpisodes = updateData.newEpisodes.reduce((acc, episode) => {
    if (!acc[episode.temporada]) {
      acc[episode.temporada] = [];
    }
    acc[episode.temporada].push(episode);
    return acc;
  }, {} as Record<number, EpisodeUpdate[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Atualizar Série</DialogTitle>
          <DialogDescription>
            Novos episódios encontrados para "{updateData.seriesName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Temporadas: {updateData.currentSeasons} → {updateData.availableSeasons}
              </p>
              <p className="text-sm text-muted-foreground">
                {updateData.newEpisodes.length} novos episódios disponíveis
              </p>
            </div>
            <Badge variant="secondary">
              {selectedEpisodes.size} selecionados
            </Badge>
          </div>

          <Separator />

          {updateData.newEpisodes.length > 0 ? (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedEpisodes.size === updateData.newEpisodes.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Selecionar todos
                </label>
              </div>

              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <div className="space-y-4">
                  {Object.entries(groupedEpisodes).map(([season, episodes]) => (
                    <div key={season} className="space-y-2">
                      <h4 className="font-medium text-sm">Temporada {season}</h4>
                      <div className="space-y-2 pl-4">
                        {episodes.map((episode) => {
                          const key = `${episode.temporada}-${episode.episodio}`;
                          const isSelected = selectedEpisodes.has(key);
                          
                          return (
                            <div
                              key={key}
                              className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                              onClick={() => handleEpisodeToggle(episode)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleEpisodeToggle(episode)}
                                onClick={(e) => e.stopPropagation()}
                              />
                               <div className="flex-1 min-w-0">
                                 <p className="text-sm font-medium truncate">
                                   T{episode.temporada}E{episode.episodio}: {episode.nome}
                                 </p>
                                 <p className="text-xs text-muted-foreground">
                                   Temporada {episode.temporada} • Episódio {episode.episodio}
                                 </p>
                               </div>
                              <Badge variant="outline" className="text-xs">
                                Novo
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum episódio novo encontrado para esta série.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleApply}
            disabled={selectedEpisodes.size === 0 || loading}
          >
            {loading ? 'Importando...' : `Importar ${selectedEpisodes.size} episódios`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};