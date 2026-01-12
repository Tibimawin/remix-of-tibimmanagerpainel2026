import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Film, Tv, Download, Loader2 } from 'lucide-react';
import { MaxPlusDetails, MaxPlusSeason } from '@/services/MaxPlusImportService';

interface MaxPlusDetailsModalProps {
  content: MaxPlusDetails | null;
  open: boolean;
  onClose: () => void;
  onImportMovie: (content: MaxPlusDetails) => Promise<void>;
  onImportSeriesWithEpisodes: (content: MaxPlusDetails, selectedSeasons?: number[]) => Promise<void>;
  importProgress: { current: number; total: number };
}

export const MaxPlusDetailsModal = ({
  content,
  open,
  onClose,
  onImportMovie,
  onImportSeriesWithEpisodes,
  importProgress,
}: MaxPlusDetailsModalProps) => {
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);

  if (!content) return null;

  const isImporting = importProgress.total > 0;
  const progressPercent = importProgress.total > 0 
    ? (importProgress.current / importProgress.total) * 100 
    : 0;

  const handleImport = async () => {
    setImporting(true);
    try {
      if (content.type === 'movie') {
        await onImportMovie(content);
      } else {
        await onImportSeriesWithEpisodes(
          content, 
          selectedSeasons.length > 0 ? selectedSeasons : undefined
        );
      }
    } finally {
      setImporting(false);
    }
  };

  const toggleSeason = (seasonNumber: number) => {
    setSelectedSeasons(prev => 
      prev.includes(seasonNumber)
        ? prev.filter(s => s !== seasonNumber)
        : [...prev, seasonNumber]
    );
  };

  const toggleAllSeasons = () => {
    if (selectedSeasons.length === content.seasons?.length) {
      setSelectedSeasons([]);
    } else {
      setSelectedSeasons(content.seasons?.map(s => s.season) || []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {content.type === 'movie' ? (
              <Film className="w-5 h-5" />
            ) : (
              <Tv className="w-5 h-5" />
            )}
            {content.title}
          </DialogTitle>
          <DialogDescription>
            {content.genre}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <div className="aspect-[2/3] relative bg-muted rounded-lg overflow-hidden">
                {content.poster ? (
                  <img 
                    src={content.poster} 
                    alt={content.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {content.type === 'movie' ? (
                      <Film className="w-16 h-16 text-muted-foreground" />
                    ) : (
                      <Tv className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={content.type === 'movie' ? 'default' : 'secondary'}>
                    {content.type === 'movie' ? 'Filme' : 'Série'}
                  </Badge>
                  {content.category && (
                    <Badge variant="outline">{content.category}</Badge>
                  )}
                </div>
                <h4 className="font-semibold mb-2">Sinopse</h4>
                <p className="text-sm text-muted-foreground">
                  {content.synopsis || 'Sem sinopse disponível'}
                </p>
              </div>

              {content.type === 'series' && content.seasons && content.seasons.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">
                        Temporadas ({content.seasons.length})
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAllSeasons}
                      >
                        {selectedSeasons.length === content.seasons.length 
                          ? 'Desmarcar todas' 
                          : 'Selecionar todas'}
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {content.seasons.map((season: MaxPlusSeason) => (
                        <div 
                          key={season.season}
                          className="border rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              checked={selectedSeasons.includes(season.season)}
                              onCheckedChange={() => toggleSeason(season.season)}
                            />
                            <span className="font-medium">
                              Temporada {season.season}
                            </span>
                            <Badge variant="secondary">
                              {season.episodes.length} episódios
                            </Badge>
                          </div>
                          
                          {selectedSeasons.includes(season.season) && (
                            <div className="mt-2 pl-6 text-xs text-muted-foreground max-h-32 overflow-y-auto">
                              {season.episodes.map((ep, idx) => (
                                <div key={idx} className="py-1">
                                  E{ep.episode} - {ep.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollArea>

        {isImporting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Importando episódios...</span>
              <span>{importProgress.current} de {importProgress.total}</span>
            </div>
            <Progress value={progressPercent} />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={importing || isImporting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport}
            disabled={importing || isImporting || (content.type === 'series' && selectedSeasons.length === 0)}
          >
            {importing || isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Importar para Baserow
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
